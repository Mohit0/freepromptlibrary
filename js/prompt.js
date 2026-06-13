import {
  copyText,
  escapeHtml,
  findPromptById,
  getIdFromLocation,
  getShareUrl,
  loadPrompts,
  renderMedia,
} from "./share.js";

const els = {
  loading: document.getElementById("prompt-loading"),
  error: document.getElementById("prompt-error"),
  content: document.getElementById("prompt-content"),
  media: document.getElementById("prompt-media"),
  title: document.getElementById("prompt-title"),
  type: document.getElementById("prompt-type"),
  text: document.getElementById("prompt-text"),
  tags: document.getElementById("prompt-tags"),
  contributor: document.getElementById("prompt-contributor"),
  shareUrl: document.getElementById("share-url"),
  copyLink: document.getElementById("copy-link"),
  copyPrompt: document.getElementById("copy-prompt"),
};

function showError() {
  els.loading.hidden = true;
  els.content.hidden = true;
  els.error.hidden = false;
  document.title = "Prompt not found — Prompt Library";
}

function renderPrompt(item) {
  const shareUrl = getShareUrl(item.id);

  document.title = `${item.title} — Prompt Library`;
  els.title.textContent = item.title;
  els.type.textContent = item.type;
  els.text.textContent = item.prompt;
  els.contributor.textContent = item.contributor ? `Contributed by ${item.contributor}` : "";
  els.tags.innerHTML = (item.tags ?? [])
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");
  els.media.innerHTML = renderMedia(item, { autoplay: item.type === "video" });
  els.shareUrl.value = shareUrl;

  els.copyLink.addEventListener("click", () => copyText(shareUrl, els.copyLink, "Copy link"));
  els.copyPrompt.addEventListener("click", () => copyText(item.prompt, els.copyPrompt, "Copy prompt"));

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
