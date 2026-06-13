import {
  copyText,
  escapeHtml,
  findPromptById,
  getIdFromLocation,
  getShareUrl,
  loadPrompts,
  observeLazyMedia,
  renderMedia,
} from "./share.js";
import {
  addRecent,
  getFavoriteIds,
  getRecentIds,
  getSavedView,
  isFavorite,
  saveView,
  toggleFavorite,
} from "./storage.js";

const state = {
  items: [],
  filtered: [],
  filter: "all",
  search: "",
  collection: null,
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
  activeFilters: document.getElementById("active-filters"),
  filterChips: document.getElementById("filter-chips"),
  clearFilters: document.getElementById("clear-filters"),
  toolbarPanel: document.getElementById("toolbar-panel"),
  toolbarToggle: document.getElementById("toolbar-toggle"),
  toolbarToggleBadge: document.getElementById("toolbar-toggle-badge"),
  randomBtn: document.getElementById("random-prompt"),
  modal: document.getElementById("detail-modal"),
  modalPrev: document.getElementById("modal-prev"),
  modalNext: document.getElementById("modal-next"),
  modalMediaWrap: document.getElementById("modal-media-wrap"),
  modalMedia: document.getElementById("modal-media"),
  modalExpand: document.getElementById("modal-expand"),
  modalTitle: document.getElementById("modal-title"),
  modalPrompt: document.getElementById("modal-prompt"),
  modalType: document.getElementById("modal-type"),
  modalContributor: document.getElementById("modal-contributor"),
  modalShareUrl: document.getElementById("modal-share-url"),
  modalFavorite: document.getElementById("modal-favorite"),
  modalRemix: document.getElementById("modal-remix"),
  copyLink: document.getElementById("copy-link"),
  copyPrompt: document.getElementById("copy-prompt"),
  lightbox: document.getElementById("media-lightbox"),
  lightboxContent: document.getElementById("media-lightbox-content"),
};

let urlSyncTimer = null;
let touchStartX = 0;

function hasActiveFilters() {
  return state.filter !== "all" || state.search.trim() || state.collection;
}

function sortItems(items) {
  if (state.collection === "recent") {
    const order = new Map(getRecentIds().map((id, index) => [id, index]));
    return [...items].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  }

  if (state.sort === "title") {
    return [...items].sort((a, b) => a.title.localeCompare(b.title));
  }

  return items;
}

function getFilteredItems() {
  const query = state.search.trim().toLowerCase();
  const favorites = new Set(getFavoriteIds());
  const recent = new Set(getRecentIds());

  return state.items.filter((item) => {
    if (state.collection === "favorites" && !favorites.has(item.id)) return false;
    if (state.collection === "recent" && !recent.has(item.id)) return false;
    if (state.filter !== "all" && item.type !== state.filter) return false;
    if (!query) return true;

    const haystack = [item.title, item.prompt, item.contributor].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function applyStateFromUrl() {
  const params = new URLSearchParams(window.location.search);

  state.search = params.get("q") ?? "";
  state.filter = params.get("type") ?? "all";
  state.sort = params.get("sort") ?? "default";
  state.collection = params.get("collection");

  const urlView = params.get("view");
  if (urlView && ["grid", "list"].includes(urlView)) {
    state.view = urlView;
  } else {
    state.view = getSavedView() ?? "grid";
  }

  if (!["all", "image", "video"].includes(state.filter)) state.filter = "all";
  if (!["default", "title"].includes(state.sort)) state.sort = "default";
  if (!["favorites", "recent"].includes(state.collection)) state.collection = null;

  if (els.search) els.search.value = state.search;
  if (els.searchClear) els.searchClear.hidden = !state.search.trim();
  if (els.sort) els.sort.value = state.sort;

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === state.filter);
  });

  document.querySelectorAll(".collection-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.collection === state.collection);
  });

  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === state.view);
  });
}

function syncStateToUrl({ keepHash = true } = {}) {
  const params = new URLSearchParams();

  if (state.search.trim()) params.set("q", state.search.trim());
  if (state.filter !== "all") params.set("type", state.filter);
  if (state.sort !== "default") params.set("sort", state.sort);
  if (state.view !== "grid") params.set("view", state.view);
  if (state.collection) params.set("collection", state.collection);

  const query = params.toString();
  const hash = keepHash ? window.location.hash : "";
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${hash}`;

  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextUrl) {
    history.replaceState(history.state, "", nextUrl);
  }
}

function scheduleUrlSync() {
  clearTimeout(urlSyncTimer);
  urlSyncTimer = setTimeout(() => syncStateToUrl(), 250);
}

function renderFilterChips() {
  const chips = [];

  if (state.collection === "favorites") {
    chips.push({ type: "collection", label: "Saved", value: "favorites" });
  } else if (state.collection === "recent") {
    chips.push({ type: "collection", label: "Recent", value: "recent" });
  }
  if (state.filter !== "all") {
    chips.push({ type: "filter", label: state.filter, value: state.filter });
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
  updateToolbarBadge(chips.length);
}

function updateToolbarBadge(activeCount) {
  if (!els.toolbarToggleBadge) return;
  const badgeCount =
    activeCount + (state.sort !== "default" ? 1 : 0) + (state.view !== "grid" ? 1 : 0);
  if (badgeCount > 0 && window.matchMedia("(max-width: 768px)").matches) {
    els.toolbarToggleBadge.hidden = false;
    els.toolbarToggleBadge.textContent = String(badgeCount);
  } else {
    els.toolbarToggleBadge.hidden = true;
  }
}

function updateResultCount(count) {
  const total = state.items.length;
  els.resultCount.textContent =
    count === total ? `${total} prompt${total === 1 ? "" : "s"}` : `Showing ${count} of ${total}`;
}

function updateShareUrl(id, replace = true) {
  const shareUrl = getShareUrl(id);
  const params = window.location.search;
  const hashUrl = `${window.location.pathname}${params}#${id}`;

  if (replace) {
    history.replaceState({ promptId: id }, "", hashUrl);
  }

  return shareUrl;
}

function clearShareUrl() {
  syncStateToUrl({ keepHash: false });
}

function favoriteButtonHtml(item) {
  const saved = isFavorite(item.id);
  return `<button class="card-favorite${saved ? " is-saved" : ""}" type="button" aria-label="${saved ? "Remove from saved" : "Save prompt"}" title="${saved ? "Saved" : "Save"}" data-favorite-id="${escapeHtml(item.id)}">★</button>`;
}

function updateModalFavorite(item) {
  if (!els.modalFavorite) return;
  const saved = isFavorite(item.id);
  els.modalFavorite.classList.toggle("is-saved", saved);
  els.modalFavorite.textContent = saved ? "★ Saved" : "☆ Save";
  els.modalFavorite.setAttribute("aria-label", saved ? "Remove from saved" : "Save prompt");
}

function bindFavoriteButtons(root) {
  root.querySelectorAll("[data-favorite-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.favoriteId;
      const saved = toggleFavorite(id);
      btn.classList.toggle("is-saved", saved);
      btn.setAttribute("aria-label", saved ? "Remove from saved" : "Save prompt");
      btn.title = saved ? "Saved" : "Save";

      if (state.activeItem?.id === id) {
        updateModalFavorite(state.activeItem);
      }

      if (state.collection === "favorites") {
        renderGallery();
      }
    });
  });
}

function bindVideoPreview(card, item) {
  if (item.type !== "video") return;
  const video = card.querySelector("video");
  if (!video) return;

  card.addEventListener("mouseenter", () => {
    if (!video.src && video.dataset.lazySrc) {
      video.src = video.dataset.lazySrc;
      video.preload = "metadata";
      delete video.dataset.lazySrc;
    }
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
    copyText(item.prompt, e.currentTarget, "Prompt", "Prompt copied");
  });

  card.querySelector(".card-copy-link").addEventListener("click", (e) => {
    e.stopPropagation();
    copyText(getShareUrl(item.id), e.currentTarget, "Link", "Link copied");
  });
}

function renderGridCard(item, index) {
  const card = document.createElement("article");
  const featured = index === 0 && state.view === "grid" && !hasActiveFilters();
  card.className = `gallery-card${featured ? " gallery-card--featured" : ""}`;
  card.dataset.id = item.id;
  card.style.animationDelay = `${Math.min(index * 0.05, 0.3)}s`;

  card.innerHTML = `
    <div class="card-media">
      ${renderMedia(item, { className: "card-visual", lazy: true })}
      <div class="card-overlay">
        <div class="card-overlay-top">
          <span class="card-type card-type--${item.type}">${item.type === "video" ? "▶ Video" : "Image"}</span>
          <div class="card-actions">
            ${favoriteButtonHtml(item)}
            <button class="card-copy-prompt card-action-primary" type="button" aria-label="Copy prompt" title="Copy prompt">Prompt</button>
            <button class="card-copy-link" type="button" aria-label="Copy share link" title="Copy link">Link</button>
          </div>
        </div>
        <div class="card-overlay-bottom">
          <h3>${escapeHtml(item.title)}</h3>
          <p class="card-prompt">${escapeHtml(item.prompt)}</p>
        </div>
      </div>
    </div>
  `;

  card.addEventListener("click", (e) => {
    if (e.target.closest(".card-actions")) return;
    openModal(item);
  });

  bindCardActions(card, item);
  bindFavoriteButtons(card);
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
      ${renderMedia(item, { className: "card-visual", lazy: true })}
      <span class="card-type card-type--${item.type}">${item.type}</span>
    </div>
    <div class="list-body">
      <div class="list-header">
        <h3>${escapeHtml(item.title)}</h3>
      </div>
      <p class="card-prompt">${escapeHtml(item.prompt)}</p>
    </div>
    <div class="list-actions">
      ${favoriteButtonHtml(item)}
      <button class="btn btn-small card-copy-prompt" type="button">Copy prompt</button>
      <button class="btn btn-small card-copy-link" type="button">Copy link</button>
      <button class="btn btn-small btn-view" type="button">View</button>
    </div>
  `;

  card.querySelector(".btn-view").addEventListener("click", () => openModal(item));
  bindCardActions(card, item);
  bindFavoriteButtons(card);
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

  observeLazyMedia(els.grid);

  const hasResults = state.filtered.length > 0;
  els.empty.hidden = hasResults;
  els.grid.hidden = !hasResults;

  if (!hasResults && state.collection) {
    const title = els.empty.querySelector("h3");
    const message = els.empty.querySelector("p");
    if (title) {
      title.textContent =
        state.collection === "favorites" ? "No saved prompts yet" : "No recently viewed prompts";
    }
    if (message) {
      message.textContent =
        state.collection === "favorites"
          ? "Star prompts you like and they will show up here."
          : "Open prompts from the gallery and they will appear here.";
    }
  } else if (!hasResults) {
    const title = els.empty.querySelector("h3");
    const message = els.empty.querySelector("p");
    if (title) title.textContent = "No prompts found";
    if (message) message.textContent = "Try adjusting your search or filters, or be the first to contribute.";
  }

  updateResultCount(state.filtered.length);
  renderFilterChips();
  scheduleUrlSync();
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

function openModal(item, { updateUrl = true } = {}) {
  state.activeItem = item;
  state.modalIndex = state.filtered.findIndex((i) => i.id === item.id);
  addRecent(item.id);

  const shareUrl = updateShareUrl(item.id);

  els.modalTitle.textContent = item.title;
  els.modalPrompt.textContent = item.prompt;
  els.modalType.textContent = item.type;
  els.modalContributor.textContent = item.contributor ? `Contributed by ${item.contributor}` : "";
  els.modalMedia.innerHTML = renderMedia(item, { autoplay: true, lazy: false });
  els.modalShareUrl.value = shareUrl;

  if (els.modalRemix) {
    els.modalRemix.href = `submit.html?from=${encodeURIComponent(item.id)}`;
  }

  updateModalFavorite(item);

  const hasPrev = state.modalIndex > 0;
  const hasNext = state.modalIndex < state.filtered.length - 1;
  els.modalPrev.hidden = !hasPrev;
  els.modalNext.hidden = !hasNext;

  els.modal.showModal();
}

function openRandomPrompt() {
  const pool = state.filtered.length ? state.filtered : state.items;
  if (!pool.length) return;
  openModal(pool[Math.floor(Math.random() * pool.length)]);
}

function openFromUrl() {
  const id = getIdFromLocation();
  if (!id) return;

  const item = findPromptById(state.items, id);
  if (!item) return;

  const inFiltered = state.filtered.some((i) => i.id === id);
  if (!inFiltered) {
    clearAllFilters({ syncUrl: false });
    if (!state.filtered.some((i) => i.id === id)) return;
  }

  try {
    openModal(item);
    document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("Failed to open prompt from URL:", error);
  }
}

function navigateModal(direction) {
  const nextIndex = state.modalIndex + direction;
  if (nextIndex < 0 || nextIndex >= state.filtered.length) return;
  openModal(state.filtered[nextIndex]);
}

function closeModal() {
  closeLightbox();
  els.modalMedia.innerHTML = "";
  els.modal.close();
  state.modalIndex = -1;
  state.activeItem = null;
  clearShareUrl();
}

function clearAllFilters({ syncUrl = true } = {}) {
  state.filter = "all";
  state.search = "";
  state.collection = null;
  els.search.value = "";
  if (els.searchClear) els.searchClear.hidden = true;
  document.querySelectorAll(".filter-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === "all");
  });
  document.querySelectorAll(".collection-btn").forEach((b) => {
    b.classList.remove("active");
  });
  renderGallery();
  if (syncUrl) syncStateToUrl({ keepHash: false });
}

function removeFilterChip(type) {
  if (type === "collection") {
    state.collection = null;
    document.querySelectorAll(".collection-btn").forEach((b) => b.classList.remove("active"));
  } else if (type === "filter") {
    state.filter = "all";
    document.querySelectorAll(".filter-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.filter === "all");
    });
  } else if (type === "search") {
    state.search = "";
    if (els.search) els.search.value = "";
    if (els.searchClear) els.searchClear.hidden = true;
  }
  renderGallery();
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function setLoading(loading) {
  if (els.loading) els.loading.setAttribute("aria-hidden", String(!loading));
  if (loading && els.grid) els.grid.hidden = true;
}

function showLoadError(error) {
  console.error("Gallery init failed:", error);
  if (els.grid) {
    els.grid.innerHTML = "";
    els.grid.hidden = true;
  }
  if (els.empty) {
    const title = els.empty.querySelector("h3");
    const message = els.empty.querySelector("p");
    if (title) title.textContent = "Unable to load prompts";
    if (message) message.textContent = "Please refresh the page or check back later.";
    els.empty.hidden = false;
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

function bindToolbarPanel() {
  const panel = els.toolbarPanel;
  const toggle = els.toolbarToggle;
  if (!panel || !toggle) return;

  const mobileQuery = window.matchMedia("(max-width: 768px)");

  const syncLayout = () => {
    if (mobileQuery.matches) {
      panel.classList.add("toolbar-panel--collapsed");
      toggle.setAttribute("aria-expanded", "false");
    } else {
      panel.classList.remove("toolbar-panel--collapsed");
      toggle.setAttribute("aria-expanded", "true");
    }
  };

  syncLayout();
  mobileQuery.addEventListener("change", syncLayout);

  toggle.addEventListener("click", () => {
    if (!mobileQuery.matches) return;
    const collapsed = panel.classList.toggle("toolbar-panel--collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));
  });
}

function bindModalSwipe() {
  if (!els.modalMediaWrap) return;

  els.modalMediaWrap.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );

  els.modalMediaWrap.addEventListener(
    "touchend",
    (e) => {
      if (!els.modal?.open) return;
      const delta = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(delta) < 60) return;
      navigateModal(delta > 0 ? -1 : 1);
    },
    { passive: true }
  );
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

  document.querySelectorAll(".collection-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = state.collection === btn.dataset.collection ? null : btn.dataset.collection;
      state.collection = next;
      document.querySelectorAll(".collection-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.collection === next);
      });
      renderGallery();
    });
  });

  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.view = btn.dataset.view;
      saveView(state.view);
      renderGallery();
    });
  });

  if (els.randomBtn) {
    els.randomBtn.addEventListener("click", openRandomPrompt);
  }

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

  if (els.filterChips) {
    els.filterChips.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      removeFilterChip(chip.dataset.chipType);
    });
  }

  if (els.clearFilters) els.clearFilters.addEventListener("click", clearAllFilters);
  if (els.emptyClear) els.emptyClear.addEventListener("click", clearAllFilters);

  if (els.modalFavorite) {
    els.modalFavorite.addEventListener("click", () => {
      if (!state.activeItem) return;
      toggleFavorite(state.activeItem.id);
      updateModalFavorite(state.activeItem);
      els.grid.querySelectorAll(`[data-favorite-id="${state.activeItem.id}"]`).forEach((btn) => {
        const saved = isFavorite(state.activeItem.id);
        btn.classList.toggle("is-saved", saved);
      });
      if (state.collection === "favorites") {
        renderGallery();
      }
    });
  }

  if (els.copyPrompt) {
    els.copyPrompt.addEventListener("click", () =>
      copyText(els.modalPrompt.textContent, els.copyPrompt, "Copy prompt", "Prompt copied")
    );
  }

  if (els.copyLink && els.modalShareUrl) {
    els.copyLink.addEventListener("click", () =>
      copyText(els.modalShareUrl.value, els.copyLink, "Copy link", "Link copied")
    );
  }

  if (els.modalExpand) {
    els.modalExpand.addEventListener("click", () => {
      if (state.activeItem) openLightbox(state.activeItem);
    });
  }

  if (els.modalMedia) {
    els.modalMedia.addEventListener("click", (e) => {
      if (!state.activeItem || e.target.closest("video")) return;
      if (e.target.tagName === "IMG") openLightbox(state.activeItem);
    });
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

  if (els.lightbox) {
    els.lightbox.querySelectorAll("[data-lightbox-close]").forEach((btn) => {
      btn.addEventListener("click", closeLightbox);
    });
    els.lightbox.addEventListener("click", (e) => {
      if (e.target === els.lightbox) closeLightbox();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (els.lightbox?.open) {
      if (e.key === "Escape") closeLightbox();
      return;
    }

    if (e.key === "/" && !isTypingTarget(e.target) && !els.modal?.open) {
      e.preventDefault();
      els.search?.focus();
      return;
    }

    if (!els.modal?.open) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") navigateModal(-1);
    if (e.key === "ArrowRight") navigateModal(1);
    if (e.key === "c" && !isTypingTarget(e.target) && state.activeItem) {
      copyText(state.activeItem.prompt, null, "", "Prompt copied");
    }
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
    applyStateFromUrl();
    renderGallery();

    const id = getIdFromLocation();
    if (id && !els.modal?.open) {
      openFromUrl();
    } else if (!id && els.modal?.open) {
      closeModal();
    }
  });

  bindMobileNav();
  bindToolbarPanel();
  bindModalSwipe();
}

async function init() {
  setLoading(true);

  try {
    state.items = await loadPrompts();
  } catch (error) {
    showLoadError(error);
    return;
  } finally {
    setLoading(false);
  }

  applyStateFromUrl();
  renderGallery();
  bindEvents();
  openFromUrl();

  if (window.location.hash === "#gallery") {
    document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

init();
