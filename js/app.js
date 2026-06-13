const state = {
  items: [],
  filter: "all",
  search: "",
  activeTag: null,
};

const els = {
  grid: document.getElementById("gallery-grid"),
  empty: document.getElementById("empty-state"),
  search: document.getElementById("search"),
  tagFilters: document.getElementById("tag-filters"),
  modal: document.getElementById("detail-modal"),
  modalMedia: document.getElementById("modal-media"),
  modalTitle: document.getElementById("modal-title"),
  modalPrompt: document.getElementById("modal-prompt"),
  modalType: document.getElementById("modal-type"),
  modalDate: document.getElementById("modal-date"),
  modalModel: document.getElementById("modal-model"),
  modalTags: document.getElementById("modal-tags"),
  modalContributor: document.getElementById("modal-contributor"),
  copyPrompt: document.getElementById("copy-prompt"),
  statTotal: document.getElementById("stat-total"),
  statImages: document.getElementById("stat-images"),
  statVideos: document.getElementById("stat-videos"),
};

async function loadPrompts() {
  const response = await fetch("data/prompts.json");
  if (!response.ok) {
    throw new Error("Failed to load prompts");
  }
  const data = await response.json();
  return data.items ?? [];
}

function updateStats(items) {
  els.statTotal.textContent = items.length;
  els.statImages.textContent = items.filter((item) => item.type === "image").length;
  els.statVideos.textContent = items.filter((item) => item.type === "video").length;
}

function getAllTags(items) {
  const tags = new Set();
  items.forEach((item) => {
    (item.tags ?? []).forEach((tag) => tags.add(tag));
  });
  return [...tags].sort();
}

function renderTagFilters(tags) {
  els.tagFilters.innerHTML = tags
    .map(
      (tag) =>
        `<button class="tag-btn${state.activeTag === tag ? " active" : ""}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
    )
    .join("");
}

function getFilteredItems() {
  const query = state.search.trim().toLowerCase();

  return state.items.filter((item) => {
    if (state.filter !== "all" && item.type !== state.filter) {
      return false;
    }

    if (state.activeTag && !(item.tags ?? []).includes(state.activeTag)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      item.title,
      item.prompt,
      item.model,
      item.contributor,
      ...(item.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderMedia(item, { autoplay = false } = {}) {
  if (item.type === "video") {
    return `<video src="${escapeHtml(item.media)}" ${autoplay ? "controls autoplay muted loop" : "muted preload=\"metadata\""} playsinline></video>`;
  }
  return `<img src="${escapeHtml(item.media)}" alt="${escapeHtml(item.title)}" loading="lazy">`;
}

function renderCard(item) {
  const card = document.createElement("article");
  card.className = "gallery-card";
  card.dataset.id = item.id;
  card.innerHTML = `
    <div class="card-media">
      ${renderMedia(item)}
      <span class="card-type">${escapeHtml(item.type)}</span>
    </div>
    <div class="card-body">
      <h3>${escapeHtml(item.title)}</h3>
      <p class="card-prompt">${escapeHtml(item.prompt)}</p>
      <div class="card-tags">
        ${(item.tags ?? []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
    </div>
  `;
  card.addEventListener("click", () => openModal(item));
  return card;
}

function renderGallery() {
  const filtered = getFilteredItems();
  els.grid.innerHTML = "";
  filtered.forEach((item) => els.grid.appendChild(renderCard(item)));
  els.empty.hidden = filtered.length > 0;
}

function openModal(item) {
  els.modalTitle.textContent = item.title;
  els.modalPrompt.textContent = item.prompt;
  els.modalType.textContent = item.type;
  els.modalDate.textContent = item.createdAt ?? "";
  els.modalModel.textContent = item.model ? `Model: ${item.model}` : "";
  els.modalContributor.textContent = item.contributor
    ? `Contributed by ${item.contributor}`
    : "";
  els.modalTags.innerHTML = (item.tags ?? [])
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");
  els.modalMedia.innerHTML = renderMedia(item, { autoplay: true });
  els.modal.showModal();
}

function closeModal() {
  els.modalMedia.innerHTML = "";
  els.modal.close();
}

async function copyPrompt() {
  const text = els.modalPrompt.textContent;
  await navigator.clipboard.writeText(text);
  const original = els.copyPrompt.textContent;
  els.copyPrompt.textContent = "Copied!";
  setTimeout(() => {
    els.copyPrompt.textContent = original;
  }, 1500);
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

  els.search.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderGallery();
  });

  els.tagFilters.addEventListener("click", (event) => {
    const btn = event.target.closest(".tag-btn");
    if (!btn) return;
    const tag = btn.dataset.tag;
    state.activeTag = state.activeTag === tag ? null : tag;
    renderTagFilters(getAllTags(state.items));
    renderGallery();
  });

  els.copyPrompt.addEventListener("click", copyPrompt);

  els.modal.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", closeModal);
  });

  els.modal.addEventListener("click", (event) => {
    if (event.target === els.modal) {
      closeModal();
    }
  });
}

async function init() {
  try {
    state.items = await loadPrompts();
    updateStats(state.items);
    renderTagFilters(getAllTags(state.items));
    renderGallery();
    bindEvents();
  } catch (error) {
    els.grid.innerHTML = `<p class="empty-state">Unable to load prompts. Check that data/prompts.json exists.</p>`;
    console.error(error);
  }
}

init();
