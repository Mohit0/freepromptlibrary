import { SUBMIT_API_URL } from "./config.js";

const form = document.getElementById("submit-form");
const preview = document.getElementById("json-preview");
const copyBtn = document.getElementById("copy-json");
const downloadBtn = document.getElementById("download-json");
const submitBtn = document.getElementById("submit-btn");
const submitStatus = document.getElementById("submit-status");
const mediaFileInput = document.getElementById("media-file");
const mediaPreview = document.getElementById("media-preview");
const mediaHint = document.getElementById("media-hint");
const titleInput = document.getElementById("title");
const idInput = document.getElementById("id");

let mediaType = "image";
let idTouched = false;
let previewObjectUrl = null;

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeFilename(name) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function getMediaPath(filename) {
  const folder = mediaType === "video" ? "assets/videos/" : "assets/images/";
  const clean = sanitizeFilename(filename);
  return clean.startsWith("assets/") ? clean : `${folder}${clean}`;
}

function getFormData() {
  const tags = form.tags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const file = mediaFileInput?.files?.[0];
  const media = file ? getMediaPath(file.name) : `${mediaType === "video" ? "assets/videos/" : "assets/images/"}your-file`;

  return {
    id: form.id.value.trim(),
    title: form.title.value.trim(),
    prompt: form.prompt.value.trim(),
    type: mediaType,
    media,
    tags,
    contributor: form.contributor.value.trim().startsWith("@")
      ? form.contributor.value.trim()
      : `@${form.contributor.value.trim()}`,
  };
}

function showStatus(type, message, link) {
  if (!submitStatus) return;
  submitStatus.hidden = false;
  submitStatus.className = `submit-status submit-status--${type}`;
  submitStatus.innerHTML = link
    ? `${message} <a href="${link}" target="_blank" rel="noopener noreferrer">View pull request</a>`
    : message;
}

function clearStatus() {
  if (!submitStatus) {
    return;
  }
  submitStatus.hidden = true;
  submitStatus.textContent = "";
}

function renderPreview() {
  if (!preview || !form) return;
  preview.textContent = JSON.stringify(getFormData(), null, 2);
}

function clearMediaPreview() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
  if (mediaPreview) {
    mediaPreview.innerHTML = "";
    mediaPreview.hidden = true;
  }
}

function renderMediaPreview(file) {
  if (!mediaPreview || !file) return;

  clearMediaPreview();
  previewObjectUrl = URL.createObjectURL(file);

  if (file.type.startsWith("video/")) {
    mediaPreview.innerHTML = `<video src="${previewObjectUrl}" controls playsinline muted></video>`;
  } else {
    mediaPreview.innerHTML = `<img src="${previewObjectUrl}" alt="Selected media preview">`;
  }

  mediaPreview.hidden = false;
  if (mediaHint) {
    mediaHint.textContent = `Will be saved as ${getMediaPath(file.name)}`;
  }
}

function setMediaType(type) {
  mediaType = type;
  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });

  if (mediaFileInput) {
    mediaFileInput.accept = type === "video" ? "video/*" : "image/*";
    mediaFileInput.value = "";
  }

  clearMediaPreview();
  if (mediaHint) {
    mediaHint.textContent = type === "video" ? "mp4, webm, mov" : "jpg, png, webp, gif, svg";
  }
  renderPreview();
}

function validateClientForm() {
  const data = getFormData();
  const file = mediaFileInput?.files?.[0];
  const errors = [];

  if (!data.title) errors.push("Title is required.");
  if (!data.prompt) errors.push("Prompt is required.");
  if (!data.tags.length) errors.push("Add at least one tag.");
  if (!form.contributor.value.trim()) errors.push("GitHub username is required.");
  if (!file) errors.push("Choose an image or video file.");
  if (!data.id || !/^[a-z0-9][a-z0-9-]*$/.test(data.id)) {
    errors.push("ID must be lowercase letters, numbers, and hyphens.");
  }

  return errors;
}

async function copyText(text, btn, doneLabel = "Copied!") {
  await navigator.clipboard.writeText(text);
  const original = btn.textContent;
  btn.textContent = doneLabel;
  setTimeout(() => {
    btn.textContent = original;
  }, 1500);
}

function downloadJson() {
  const data = getFormData();
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.id || "prompt-entry"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function submitForm(event) {
  event.preventDefault();
  clearStatus();

  const errors = validateClientForm();
  if (errors.length) {
    showStatus("error", errors.join(" "));
    return;
  }

  if (!SUBMIT_API_URL) {
    showStatus(
      "error",
      "Submission API is not configured yet. The site owner needs to deploy the Cloudflare Worker and set SUBMIT_API_URL in js/config.js."
    );
    return;
  }

  const payload = new FormData();
  const data = getFormData();
  payload.append("title", data.title);
  payload.append("id", data.id);
  payload.append("prompt", data.prompt);
  payload.append("type", data.type);
  payload.append("tags", data.tags.join(", "));
  payload.append("contributor", data.contributor);
  payload.append("media", mediaFileInput.files[0]);
  payload.append("website", "");

  const originalLabel = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  try {
    const response = await fetch(SUBMIT_API_URL, {
      method: "POST",
      body: payload,
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Submission failed.");
    }

    showStatus("success", "Pull request created! ", result.prUrl);
    form.reset();
    idTouched = false;
    clearMediaPreview();
    setMediaType("image");
    renderPreview();
  } catch (error) {
    showStatus("error", error.message || "Submission failed. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
}

function bindMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("mobile-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    menu.hidden = open;
  });
}

if (form) {
  if (!SUBMIT_API_URL && submitBtn) {
    showStatus(
      "info",
      "One-time setup needed: deploy the submission API (see workers/README.md), then add its URL to js/config.js."
    );
  }

  form.addEventListener("submit", submitForm);

  titleInput.addEventListener("input", () => {
    if (!idTouched) {
      idInput.value = slugify(titleInput.value);
    }
    renderPreview();
  });

  idInput.addEventListener("input", () => {
    idTouched = true;
    renderPreview();
  });

  form.addEventListener("input", renderPreview);

  if (mediaFileInput) {
    mediaFileInput.addEventListener("change", () => {
      const file = mediaFileInput.files?.[0];
      if (!file) {
        clearMediaPreview();
        renderPreview();
        return;
      }

      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (isVideo && mediaType !== "video") setMediaType("video");
      if (isImage && mediaType !== "image") setMediaType("image");

      renderMediaPreview(file);
      renderPreview();
    });
  }

  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.addEventListener("click", () => setMediaType(btn.dataset.type));
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", () => copyText(preview.textContent, copyBtn, "Copied!"));
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", downloadJson);
  }

  renderPreview();
}

bindMobileNav();
