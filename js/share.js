const SITE_ROOT = new URL("../", import.meta.url);

const RESERVED_HASHES = new Set(["gallery"]);

let cachedSiteRoot = null;

export function getSiteRoot() {
  if (cachedSiteRoot) return cachedSiteRoot;

  const base = document.querySelector("base[href]");
  if (base?.href) {
    cachedSiteRoot = base.href;
    return cachedSiteRoot;
  }

  const stylesheet = document.querySelector('link[rel="stylesheet"][href*="style.css"]');
  if (stylesheet?.href) {
    cachedSiteRoot = new URL("../", stylesheet.href).href;
    return cachedSiteRoot;
  }

  cachedSiteRoot = SITE_ROOT.href;
  return cachedSiteRoot;
}

export function resolveSitePath(path) {
  return new URL(String(path).replace(/^\//, ""), getSiteRoot()).href;
}

export function getShareUrl(id) {
  const url = new URL("prompt.html", getSiteRoot());
  url.searchParams.set("id", id);
  return url.href;
}

export function getIdFromLocation(location = window.location) {
  const fromQuery = location.searchParams.get("id");
  if (fromQuery) return fromQuery;

  const hash = location.hash.replace(/^#\/?/, "").trim();
  if (!hash || RESERVED_HASHES.has(hash.toLowerCase())) return null;
  if (!hash.includes("/")) return hash;
  if (hash.startsWith("p/")) return hash.slice(2);
  return null;
}

export async function copyText(text, btn, originalLabel = "Copy") {
  await navigator.clipboard.writeText(text);
  const original = btn.textContent;
  btn.textContent = "Copied!";
  setTimeout(() => {
    btn.textContent = originalLabel || original;
  }, 1500);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderMedia(item, { autoplay = false, className = "" } = {}) {
  const cls = className ? ` class="${className}"` : "";
  const src = escapeHtml(resolveSitePath(item.media));

  if (item.type === "video") {
    return `<video src="${src}"${cls} ${autoplay ? "controls autoplay muted loop" : "muted preload=\"metadata\""} playsinline></video>`;
  }
  return `<img src="${src}" alt="${escapeHtml(item.title)}"${cls} loading="lazy">`;
}

export async function loadPrompts() {
  const bundleUrl = new URL("./prompts-data.js", import.meta.url).href;
  const jsonUrl = new URL("../data/prompts.json", import.meta.url).href;

  try {
    const module = await import(bundleUrl);
    if (Array.isArray(module.default?.items)) {
      return module.default.items;
    }
  } catch (error) {
    console.warn("Bundled prompts unavailable, using JSON fallback.", error);
  }

  const response = await fetch(jsonUrl);

  if (!response.ok) {
    throw new Error(`Failed to load prompts (${response.status}) from ${jsonUrl}`);
  }

  const data = await response.json();

  if (!Array.isArray(data.items)) {
    throw new Error('prompts.json must contain an "items" array');
  }

  return data.items;
}

export function findPromptById(items, id) {
  return items.find((item) => item.id === id) ?? null;
}
