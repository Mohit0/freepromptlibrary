const REPO_URL = "https://github.com/Mohit0/freepromptlibrary";
const ISSUE_FORM_URL = `${REPO_URL}/issues/new?template=prompt-submission.yml`;

const form = document.getElementById("submit-form");
const preview = document.getElementById("json-preview");
const copyBtn = document.getElementById("copy-json");
const copyAndOpenBtn = document.getElementById("copy-and-open");
const titleInput = document.getElementById("title");
const idInput = document.getElementById("id");

let mediaType = "image";
let idTouched = false;

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFormData() {
  const tags = form.tags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    id: form.id.value.trim(),
    title: form.title.value.trim(),
    prompt: form.prompt.value.trim(),
    type: mediaType,
    tags,
    contributor: form.contributor.value.trim().startsWith("@")
      ? form.contributor.value.trim()
      : `@${form.contributor.value.trim()}`,
  };
}

function buildDraftText(data) {
  const username = data.contributor.replace(/^@/, "");
  return [
    "Draft for GitHub submission form:",
    "",
    `Title: ${data.title}`,
    `Prompt: ${data.prompt}`,
    `Media type: ${data.type}`,
    `Tags: ${data.tags.join(", ")}`,
    `GitHub username: ${username}`,
    "",
    "Remember to attach your image or video in the GitHub form before submitting.",
  ].join("\n");
}

function renderPreview() {
  if (!preview || !form) return;
  preview.textContent = JSON.stringify(getFormData(), null, 2);
}

function setMediaType(type) {
  mediaType = type;
  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });
  renderPreview();
}

async function copyText(text, btn, doneLabel = "Copied!") {
  await navigator.clipboard.writeText(text);
  const original = btn.textContent;
  btn.textContent = doneLabel;
  setTimeout(() => {
    btn.textContent = original;
  }, 1500);
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

  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.addEventListener("click", () => setMediaType(btn.dataset.type));
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", () => copyText(preview.textContent, copyBtn, "Copied!"));
  }

  if (copyAndOpenBtn) {
    copyAndOpenBtn.addEventListener("click", async () => {
      const draft = buildDraftText(getFormData());
      await copyText(draft, copyAndOpenBtn, "Copied — opening…");
      window.open(ISSUE_FORM_URL, "_blank", "noopener,noreferrer");
    });
  }

  renderPreview();
}

bindMobileNav();
