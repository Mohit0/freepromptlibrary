const form = document.getElementById("submit-form");
const preview = document.getElementById("json-preview");
const copyBtn = document.getElementById("copy-json");
const mediaInput = document.getElementById("media");
const mediaHint = document.getElementById("media-hint");
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

  const filename = form.media.value.trim();
  const folder = mediaType === "video" ? "assets/videos/" : "assets/images/";

  return {
    id: form.id.value.trim(),
    title: form.title.value.trim(),
    prompt: form.prompt.value.trim(),
    type: mediaType,
    media: filename.startsWith("assets/") ? filename : `${folder}${filename}`,
    tags,
    contributor: form.contributor.value.trim().startsWith("@")
      ? form.contributor.value.trim()
      : `@${form.contributor.value.trim()}`,
  };
}

function renderPreview() {
  const data = getFormData();
  preview.textContent = JSON.stringify(data, null, 2);
}

function setMediaType(type) {
  mediaType = type;
  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });
  mediaHint.textContent =
    type === "video" ? "Will be saved to assets/videos/" : "Will be saved to assets/images/";
  renderPreview();
}

async function copyJson() {
  await navigator.clipboard.writeText(preview.textContent);
  const original = copyBtn.textContent;
  copyBtn.textContent = "Copied!";
  setTimeout(() => {
    copyBtn.textContent = original;
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

copyBtn.addEventListener("click", copyJson);
bindMobileNav();
renderPreview();
