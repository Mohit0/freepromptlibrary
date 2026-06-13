import {
  copyText,
  findPromptById,
  getIdFromLocation,
  getShareUrl,
  loadPrompts,
  renderMedia,
  setOgTags,
} from "./share.js";
import { addRecent, isFavorite, toggleFavorite } from "./storage.js";

const els = {
  loading: document.getElementById("prompt-loading"),
  error: document.getElementById("prompt-error"),
  content: document.getElementById("prompt-content"),
  mediaWrap: document.getElementById("prompt-media-wrap"),
  media: document.getElementById("prompt-media"),
  mediaExpand: document.getElementById("prompt-media-expand"),
  title: document.getElementById("prompt-title"),
  type: document.getElementById("prompt-type"),
  text: document.getElementById("prompt-text"),
  contributor: document.getElementById("prompt-contributor"),
  shareUrl: document.getElementById("share-url"),
  copyLink: document.getElementById("copy-link"),
  copyPrompt: document.getElementById("copy-prompt"),
  favorite: document.getElementById("prompt-favorite"),
  remix: document.getElementById("prompt-remix"),
  lightbox: document.getElementById("media-lightbox"),
  lightboxContent: document.getElementById("media-lightbox-content"),
};

let activeItem = null;

function showError() {
  els.loading.hidden = true;
  els.content.hidden = true;
  els.error.hidden = false;
  document.title = "Prompt not found — Prompt Library";
}

function updateFavoriteButton(item) {
  if (!els.favorite) return;
  const saved = isFavorite(item.id);
  els.favorite.classList.toggle("is-saved", saved);
  els.favorite.textContent = saved ? "★ Saved" : "☆ Save";
  els.favorite.setAttribute("aria-label", saved ? "Remove from saved" : "Save prompt");
}

function openLightbox(item) {
  if (!els.lightbox || !els.lightboxContent) return;
  els.lightboxContent.innerHTML = renderMedia(item, { autoplay: true, lazy: false, className: "lightbox-media" });
  els.lightbox.showModal();
}

function closeLightbox() {
  if (!els.lightbox) return;
  els.lightboxContent.innerHTML = "";
  els.lightbox.close();
}

function renderPrompt(item) {
  activeItem = item;
  const shareUrl = getShareUrl(item.id);

  setOgTags(item);
  addRecent(item.id);

  els.title.textContent = item.title;
  els.type.textContent = item.type;
  els.text.textContent = item.prompt;
  els.contributor.textContent = item.contributor ? `Contributed by ${item.contributor}` : "";
  els.media.innerHTML = renderMedia(item, { autoplay: item.type === "video", lazy: false });
  els.shareUrl.value = shareUrl;

  if (els.remix) {
    els.remix.href = `submit.html?from=${encodeURIComponent(item.id)}`;
  }

  updateFavoriteButton(item);

  els.copyLink.addEventListener("click", () => copyText(shareUrl, els.copyLink, "Copy link", "Link copied"));
  els.copyPrompt.addEventListener("click", () => copyText(item.prompt, els.copyPrompt, "Copy prompt", "Prompt copied"));

  if (els.favorite) {
    els.favorite.addEventListener("click", () => {
      toggleFavorite(item.id);
      updateFavoriteButton(item);
    });
  }

  if (els.mediaExpand) {
    els.mediaExpand.addEventListener("click", () => openLightbox(item));
  }

  if (els.media) {
    els.media.addEventListener("click", (e) => {
      if (e.target.closest("video")) return;
      if (e.target.tagName === "IMG") openLightbox(item);
    });
  }

  if (els.lightbox) {
    els.lightbox.querySelectorAll("[data-lightbox-close]").forEach((btn) => {
      btn.addEventListener("click", closeLightbox);
    });
    els.lightbox.addEventListener("click", (e) => {
      if (e.target === els.lightbox) closeLightbox();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (els.lightbox?.open && e.key === "Escape") closeLightbox();
    if (e.key === "c" && !["INPUT", "TEXTAREA"].includes(e.target.tagName) && activeItem) {
      copyText(activeItem.prompt, null, "", "Prompt copied");
    }
  });

  els.loading.hidden = true;
  els.error.hidden = true;
  els.content.hidden = false;
}

async function init() {
  const id = getIdFromLocation();
  if (!id) {
    showError();
    return;
  }

  try {
    const items = await loadPrompts();
    const item = findPromptById(items, id);
    if (!item) {
      showError();
      return;
    }
    renderPrompt(item);
  } catch (error) {
    console.error(error);
    showError();
  }
}

init();
