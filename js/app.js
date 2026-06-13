import {
  copyText,
  escapeHtml,
  findPromptById,
  getIdFromLocation,
  getShareUrl,
  loadPrompts,
  renderMedia,
} from "./share.js";

const state = {
  items: [],
  filtered: [],
  filter: "all",
  search: "",
  activeTag: null,
  sort: "default",
  view: "grid",
  modalIndex: -1,
  activeItem: null,
};

const els = {
  grid: document.getElementById("gallery-grid"),
  loading: document.getElementById("gallery-loading"),
  empty: document.getElementById("empty-state"),
  emptyClear: document.getElementById("empty-clear"),
  search: document.getElementById("search"),
  searchClear: document.getElementById("search-clear"),
  sort: document.getElementById("sort"),
  resultCount: document.getElementById("result-count"),
  tagFilters: document.getElementById("tag-filters"),
  activeFilters: document.getElementById("active-filters"),
  filterChips: document.getElementById("filter-chips"),
  clearFilters: document.getElementById("clear-filters"),
  modal: document.getElementById("detail-modal"),
  modalPrev: document.getElementById("modal-prev"),
  modalNext: document.getElementById("modal-next"),
  modalMedia: document.getElementById("modal-media"),
  modalTitle: document.getElementById("modal-title"),
  modalPrompt: document.getElementById("modal-prompt"),
  modalType: document.getElementById("modal-type"),
  modalTags: document.getElementById("modal-tags"),
  modalContributor: document.getElementById("modal-contributor"),
  modalShareUrl: document.getElementById("modal-share-url"),
  copyLink: document.getElementById("copy-link"),
  copyPrompt: document.getElementById("copy-prompt"),
};

function getAllTags(items) {
  const tags = new Set();
  items.forEach((item) => (item.tags ?? []).forEach((tag) => tags.add(tag)));
  return [...tags].sort();
}

function hasActiveFilters() {
  return state.filter !== "all" || state.search.trim() || state.activeTag;
}

function sortItems(items) {
  if (state.sort === "title") {
    return [...items].sort((a, b) => a.title.localeCompare(b.title));
  }
  return items;
}

function getFilteredItems() {
  const query = state.search.trim().toLowerCase();

  return state.items.filter((item) => {
    if (state.filter !== "all" && item.type !== state.filter) return false;
    if (state.activeTag && !(item.tags ?? []).includes(state.activeTag)) return false;
    if (!query) return true;

    const haystack = [item.title, item.prompt, item.contributor, ...(item.tags ?? [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

function renderTagFilters(tags) {
  if (!tags.length) {
    els.tagFilters.innerHTML = "";
    return;
  }

  els.tagFilters.innerHTML = `
    <span class="tag-filters-label">Tags</span>
    ${tags
      .map(
        (tag) =>
          `<button class="tag-btn${state.activeTag === tag ? " active" : ""}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
      )
      .join("")}
  `;
}

function renderFilterChips() {
  const chips = [];

  if (state.filter !== "all") {
    chips.push({ type: "filter", label: state.filter, value: state.filter });
  }
  if (state.activeTag) {
    chips.push({ type: "tag", label: state.activeTag, value: state.activeTag });
  }
  if (state.search.trim()) {
    chips.push({ type: "search", label: `"${state.search.trim()}"`, value: state.search });
  }

  els.activeFilters.hidden = chips.length === 0;
  els.filterChips.innerHTML = chips
    .map(
      (chip) =>
        `<button class="filter-chip" data-chip-type="${chip.type}" data-chip-value="${escapeHtml(chip.value)}">${escapeHtml(chip.label)} <span aria-hidden="true">×</span></button>`
    )
    .join("");
}

function updateResultCount(count) {
  const total = state.items.length;
  els.resultCount.textContent =
    count === total ? `${total} prompt${total === 1 ? "" : "s"}` : `Showing ${count} of ${total}`;
}

function updateShareUrl(id, replace = true) {
  const shareUrl = getShareUrl(id);
  const hashUrl = `${window.location.pathname}${window.location.search}#${id}`;

  if (replace) {
    history.replaceState({ promptId: id }, "", hashUrl);
  }

  return shareUrl;
}

function clearShareUrl() {
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

function bindVideoPreview(card, item) {
  if (item.type !== "video") return;
  const video = card.querySelector("video");
  if (!video) return;

  card.addEventListener("mouseenter", () => {
    video.play().catch(() => {});
  });
  card.addEventListener("mouseleave", () => {
    video.pause();
    video.currentTime = 0;
  });
}

function bindCardActions(card, item) {
  card.querySelector(".card-copy-prompt").addEventListener("click", (e) => {
    e.stopPropagation();
    copyText(item.prompt, e.currentTarget, "Copy prompt");
  });

  card.querySelector(".card-copy-link").addEventListener("click", (e) => {
    e.stopPropagation();
    copyText(getShareUrl(item.id), e.currentTarget, "Copy link");
  });
}

function renderGridCard(item, index) {
  const card = document.createElement("article");
  const featured = index === 0 && state.view === "grid" && !hasActiveFilters();
  card.className = `gallery-card${featured ? " gallery-card--featured" : ""}`;
  card.dataset.id = item.id;
  card.style.animationDelay = `${Math.min(index * 0.05, 0.3)}s`;

  const tagPreview = (item.tags ?? []).slice(0, 3);
  card.innerHTML = `
    <div class="card-media">
      ${renderMedia(item, { className: "card-visual" })}
      <div class="card-overlay">
        <div class="card-overlay-top">
          <span class="card-type card-type--${item.type}">${item.type === "video" ? "▶ Video" : "Image"}</span>
          <div class="card-actions">
            <button class="card-copy-link" type="button" aria-label="Copy share link" title="Copy link">Link</button>
            <button class="card-copy-prompt" type="button" aria-label="Copy prompt" title="Copy prompt">Prompt</button>
          </div>
        </div>
        <div class="card-overlay-bottom">
          <h3>${escapeHtml(item.title)}</h3>
          <p class="card-prompt">${escapeHtml(item.prompt)}</p>
          <div class="card-footer">
            <div class="card-tags">
              ${tagPreview.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  card.addEventListener("click", (e) => {
    if (e.target.closest(".card-actions")) return;
    openModal(item);
  });

  bindCardActions(card, item);
  bindVideoPreview(card, item);
  return card;
}

function renderListCard(item, index) {
  const card = document.createElement("article");
  card.className = "gallery-card gallery-card--list";
  card.dataset.id = item.id;
  card.style.animationDelay = `${Math.min(index * 0.04, 0.25)}s`;

  card.innerHTML = `
    <div class="list-thumb">
      ${renderMedia(item, { className: "card-visual" })}
      <span class="card-type card-type--${item.type}">${item.type}</span>
    </div>
    <div class="list-body">
      <div class="list-header">
        <h3>${escapeHtml(item.title)}</h3>
      </div>
      <p class="card-prompt">${escapeHtml(item.prompt)}</p>
      <div class="list-meta">
        <div class="card-tags">
          ${(item.tags ?? []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
    </div>
    <div class="list-actions">
      <button class="btn btn-small card-copy-link" type="button">Copy link</button>
      <button class="btn btn-small card-copy-prompt" type="button">Copy prompt</button>
      <button class="btn btn-small btn-view" type="button">View</button>
    </div>
  `;

  card.querySelector(".btn-view").addEventListener("click", () => openModal(item));
  bindCardActions(card, item);
  card.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    openModal(item);
  });

  bindVideoPreview(card, item);
  return card;
}

function renderGallery() {
  state.filtered = sortItems(getFilteredItems());
  els.grid.innerHTML = "";
  els.grid.className = state.view === "list" ? "gallery-grid gallery-grid--list" : "gallery-grid";

  state.filtered.forEach((item, index) => {
    const card = state.view === "list" ? renderListCard(item, index) : renderGridCard(item, index);
    els.grid.appendChild(card);
  });

  const hasResults = state.filtered.length > 0;
  els.empty.hidden = hasResults;
  els.grid.hidden = !hasResults;
  updateResultCount(state.filtered.length);
  renderFilterChips();
}

function openModal(item, { updateUrl = true } = {}) {
  state.activeItem = item;
  state.modalIndex = state.filtered.findIndex((i) => i.id === item.id);

  const shareUrl = updateShareUrl(item.id);

  els.modalTitle.textContent = item.title;
  els.modalPrompt.textContent = item.prompt;
  els.modalType.textContent = item.type;
  els.modalContributor.textContent = item.contributor ? `Contributed by ${item.contributor}` : "";
  els.modalTags.innerHTML = (item.tags ?? [])
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");
  els.modalMedia.innerHTML = renderMedia(item, { autoplay: true });
  els.modalShareUrl.value = shareUrl;

  const hasPrev = state.modalIndex > 0;
  const hasNext = state.modalIndex < state.filtered.length - 1;
  els.modalPrev.hidden = !hasPrev;
  els.modalNext.hidden = !hasNext;

  els.modal.showModal();
}

function openFromUrl() {
  const id = getIdFromLocation();
  if (!id) return;

  const item = findPromptById(state.items, id);
  if (!item) return;

  const inFiltered = state.filtered.some((i) => i.id === id);
  if (!inFiltered) {
    clearAllFilters();
    state.filtered = sortItems(getFilteredItems());
  }

  openModal(item);
  document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function navigateModal(direction) {
  const nextIndex = state.modalIndex + direction;
  if (nextIndex < 0 || nextIndex >= state.filtered.length) return;
  openModal(state.filtered[nextIndex]);
}

function closeModal() {
  els.modalMedia.innerHTML = "";
  els.modal.close();
  state.modalIndex = -1;
  state.activeItem = null;
  clearShareUrl();
}

function clearAllFilters() {
  state.filter = "all";
  state.search = "";
  state.activeTag = null;
  els.search.value = "";
  els.searchClear.hidden = true;
  document.querySelectorAll(".filter-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === "all");
  });
  renderTagFilters(getAllTags(state.items));
  renderGallery();
}

function removeFilterChip(type) {
  if (type === "filter") {
    state.filter = "all";
    document.querySelectorAll(".filter-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.filter === "all");
    });
  } else if (type === "tag") {
    state.activeTag = null;
    renderTagFilters(getAllTags(state.items));
  } else if (type === "search") {
    state.search = "";
    els.search.value = "";
    els.searchClear.hidden = true;
  }
  renderGallery();
}

function setLoading(loading) {
  if (els.loading) els.loading.setAttribute("aria-hidden", String(!loading));
  if (els.grid) els.grid.hidden = loading;
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

function bindEvents() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.filter = btn.dataset.filter;
      renderGallery();
    });
  });

  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.view = btn.dataset.view;
      renderGallery();
    });
  });

  if (els.search) {
    els.search.addEventListener("input", (e) => {
      state.search = e.target.value;
      if (els.searchClear) els.searchClear.hidden = !state.search;
      renderGallery();
    });
  }

  if (els.searchClear) {
    els.searchClear.addEventListener("click", () => {
      state.search = "";
      if (els.search) els.search.value = "";
      els.searchClear.hidden = true;
      els.search?.focus();
      renderGallery();
    });
  }

  if (els.sort) {
    els.sort.addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderGallery();
    });
  }

  if (els.tagFilters) {
    els.tagFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".tag-btn");
      if (!btn) return;
      const tag = btn.dataset.tag;
      state.activeTag = state.activeTag === tag ? null : tag;
      renderTagFilters(getAllTags(state.items));
      renderGallery();
    });
  }

  if (els.filterChips) {
    els.filterChips.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      removeFilterChip(chip.dataset.chipType);
    });
  }

  if (els.clearFilters) els.clearFilters.addEventListener("click", clearAllFilters);
  if (els.emptyClear) els.emptyClear.addEventListener("click", clearAllFilters);

  if (els.copyPrompt) {
    els.copyPrompt.addEventListener("click", () =>
      copyText(els.modalPrompt.textContent, els.copyPrompt, "Copy prompt")
    );
  }

  if (els.copyLink && els.modalShareUrl) {
    els.copyLink.addEventListener("click", () =>
      copyText(els.modalShareUrl.value, els.copyLink, "Copy link")
    );
  }

  if (els.modalPrev) els.modalPrev.addEventListener("click", () => navigateModal(-1));
  if (els.modalNext) els.modalNext.addEventListener("click", () => navigateModal(1));

  if (els.modal) {
    els.modal.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", closeModal);
    });

    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) closeModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (!els.modal?.open) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") navigateModal(-1);
    if (e.key === "ArrowRight") navigateModal(1);
  });

  window.addEventListener("hashchange", () => {
    if (els.modal?.open) return;
    if (window.location.hash === "#gallery") {
      document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    openFromUrl();
  });

  window.addEventListener("popstate", () => {
    const id = getIdFromLocation();
    if (id && !els.modal?.open) {
      openFromUrl();
    } else if (!id && els.modal?.open) {
      closeModal();
    }
  });

  bindMobileNav();
}

async function init() {
  try {
    setLoading(true);
    state.items = await loadPrompts();
    renderTagFilters(getAllTags(state.items));
    renderGallery();
    bindEvents();
    openFromUrl();

    if (window.location.hash === "#gallery") {
      document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (error) {
    console.error("Gallery init failed:", error);
    els.grid.innerHTML = `<p class="empty-state">Unable to load prompts. Please refresh the page or check back later.</p>`;
  } finally {
    setLoading(false);
  }
}

init();
