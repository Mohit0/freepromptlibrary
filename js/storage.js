const FAVORITES_KEY = "pl-favorites";
const RECENT_KEY = "pl-recent";
const VIEW_KEY = "pl-view";
const MAX_RECENT = 20;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getFavoriteIds() {
  return readJson(FAVORITES_KEY, []);
}

export function getFavorites() {
  return new Set(getFavoriteIds());
}

export function isFavorite(id) {
  return getFavorites().has(id);
}

export function toggleFavorite(id) {
  const favorites = getFavorites();
  if (favorites.has(id)) {
    favorites.delete(id);
  } else {
    favorites.add(id);
  }
  writeJson(FAVORITES_KEY, [...favorites]);
  return favorites.has(id);
}

export function getRecentIds() {
  return readJson(RECENT_KEY, []);
}

export function addRecent(id) {
  const recent = getRecentIds().filter((entry) => entry !== id);
  recent.unshift(id);
  writeJson(RECENT_KEY, recent.slice(0, MAX_RECENT));
}

export function getSavedView() {
  const view = localStorage.getItem(VIEW_KEY);
  return view === "grid" || view === "list" ? view : null;
}

export function saveView(view) {
  if (view === "grid" || view === "list") {
    localStorage.setItem(VIEW_KEY, view);
  }
}
