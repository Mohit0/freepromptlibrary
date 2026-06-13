import { copyText, findPromptById, loadPrompts } from "./share.js";

const form = document.getElementById("submit-form");
const preview = document.getElementById("json-preview");
const copyBtn = document.getElementById("copy-json");
const downloadBtn = document.getElementById("download-json");
const mediaFileInput = document.getElementById("media-file");
const mediaPreview = document.getElementById("media-preview");
const mediaHint = document.getElementById("media-hint");
const titleInput = document.getElementById("title");
const idInput = document.getElementById("id");
const idStatus = document.getElementById("id-status");
const remixBanner = document.getElementById("remix-banner");

let mediaType = "image";
let idTouched = false;
let previewObjectUrl = null;
let existingIds = new Set();

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
  const file = mediaFileInput?.files?.[0];
  const media = file
    ? getMediaPath(file.name)
    : `${mediaType === "video" ? "assets/videos/" : "assets/images/"}your-file`;

  return {
    id: form.id.value.trim(),
    title: form.title.value.trim(),
    prompt: form.prompt.value.trim(),
    type: mediaType,
    media,
    contributor: form.contributor.value.trim().startsWith("@")
      ? form.contributor.value.trim()
      : `@${form.contributor.value.trim()}`,
  };
}

function updateIdStatus() {
  if (!idStatus || !idInput) return;

  const id = idInput.value.trim();
  if (!id) {
    idStatus.hidden = true;
    idStatus.textContent = "";
    idInput.classList.remove("input-warning");
    return;
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    idStatus.hidden = false;
    idStatus.className = "field-status field-status--error";
    idStatus.textContent = "Use lowercase letters, numbers, and hyphens only.";
    idInput.classList.add("input-warning");
    return;
  }

  if (existingIds.has(id)) {
    idStatus.hidden = false;
    idStatus.className = "field-status field-status--error";
    idStatus.textContent = "This ID already exists — pick a unique one.";
    idInput.classList.add("input-warning");
    return;
  }

  idStatus.hidden = false;
  idStatus.className = "field-status field-status--ok";
  idStatus.textContent = "ID is available.";
  idInput.classList.remove("input-warning");
}

function suggestRemixId(baseId) {
  let candidate = `${baseId}-remix`;
  let counter = 2;
  while (existingIds.has(candidate)) {
    candidate = `${baseId}-remix-${counter}`;
    counter += 1;
  }
  return candidate;
}

async function applyRemixFromUrl() {
  const sourceId = new URLSearchParams(window.location.search).get("from");
  if (!sourceId) return;

  const items = await loadPrompts();
  const source = findPromptById(items, sourceId);
  if (!source) return;

  if (remixBanner) {
    remixBanner.hidden = false;
    remixBanner.innerHTML = `Remixing <strong>${source.title}</strong> — update the details and pick a new ID.`;
  }

  titleInput.value = `${source.title} (Remix)`;
  idInput.value = suggestRemixId(source.id);
  idTouched = true;
  form.prompt.value = source.prompt;
  setMediaType(source.type);
  updateIdStatus();
  renderPreview();
}

function renderPreview() {
  if (!preview || !form) return;
  preview.textContent = JSON.stringify(getFormData(), null, 2);
  updateIdStatus();
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
    mediaHint.textContent = `Save as ${getMediaPath(file.name)}`;
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

async function init() {
  try {
    const items = await loadPrompts();
    existingIds = new Set(items.map((item) => item.id));
  } catch (error) {
    console.warn("Could not load prompts for duplicate check.", error);
  }

  if (!form) {
    bindMobileNav();
    return;
  }

  await applyRemixFromUrl();

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
    copyBtn.addEventListener("click", () => copyText(preview.textContent, copyBtn, "Copy JSON", "JSON copied"));
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", downloadJson);
  }

  renderPreview();
  bindMobileNav();
}

init();
