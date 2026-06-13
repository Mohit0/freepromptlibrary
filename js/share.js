const SITE_ROOT = new URL("../", import.meta.url);

const RESERVED_HASHES = new Set(["gallery"]);

let cachedSiteRoot = null;
let cachedPrompts = null;

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

function normalizePromptItems(items) {
  return Array.isArray(items) ? items : null;
}

function readInlinePrompts() {
  const globalItems = normalizePromptItems(window.__PROMPTS_DATA__?.items);
  if (globalItems?.length) return globalItems;

  const inline = document.getElementById("prompts-inline");
  if (!inline?.textContent?.trim()) return null;

  try {
    const data = JSON.parse(inline.textContent);
    return normalizePromptItems(data.items);
  } catch (error) {
    console.warn("Inline prompt data is invalid.", error);
    return null;
  }
}

function getPromptJsonUrls() {
  const urls = new Set([
    new URL("../data/prompts.json", import.meta.url).href,
    resolveSitePath("data/prompts.json"),
  ]);

  const dataScript = document.querySelector('script[src*="prompts-data.js"]');
  if (dataScript?.src) {
    urls.add(new URL("../data/prompts.json", dataScript.src).href);
  }

  return [...urls];
}

async function fetchPromptItems(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load prompts (${response.status}) from ${url}`);
  }

  const data = await response.json();
  const items = normalizePromptItems(data.items);

  if (!items) {
    throw new Error('prompts.json must contain an "items" array');
  }

  return items;
}

export async function loadPrompts() {
  if (cachedPrompts) return cachedPrompts;

  const inlineItems = readInlinePrompts();
  if (inlineItems?.length) {
    cachedPrompts = inlineItems;
    return cachedPrompts;
  }

  let lastError = null;
  for (const url of getPromptJsonUrls()) {
    try {
      const items = await fetchPromptItems(url);
      if (items.length) {
        cachedPrompts = items;
        return cachedPrompts;
      }
    } catch (error) {
      lastError = error;
      console.warn("Prompt fetch failed:", error);
    }
  }

  throw lastError ?? new Error("No prompts available");
}

export function findPromptById(items, id) {
  return items.find((item) => item.id === id) ?? null;
}
