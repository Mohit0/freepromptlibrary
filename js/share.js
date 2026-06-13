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

let toastTimer = null;

export function showToast(message) {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "app-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("app-toast--visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("app-toast--visible"), 2200);
}

export async function copyText(text, btn, originalLabel = "Copy", toastMessage = "Copied to clipboard") {
  await navigator.clipboard.writeText(text);
  showToast(toastMessage);

  if (!btn) return;

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

export function renderMedia(item, { autoplay = false, className = "", lazy = true } = {}) {
  const cls = className ? ` class="${className}"` : "";
  const src = escapeHtml(resolveSitePath(item.media));

  if (item.type === "video") {
    if (lazy && !autoplay) {
      return `<video data-lazy-src="${src}"${cls} muted preload="none" playsinline></video>`;
    }
    return `<video src="${src}"${cls} ${autoplay ? "controls autoplay muted loop" : "muted preload=\"metadata\""} playsinline></video>`;
  }

  const loadingAttrs = lazy ? ' loading="lazy" decoding="async"' : "";
  return `<img src="${src}" alt="${escapeHtml(item.title)}"${cls}${loadingAttrs}>`;
}

let lazyObserver = null;

export function observeLazyMedia(root = document) {
  const videos = root.querySelectorAll("video[data-lazy-src]");
  if (!videos.length) return;

  if (!("IntersectionObserver" in window)) {
    videos.forEach((video) => {
      video.src = video.dataset.lazySrc;
      video.preload = "metadata";
      delete video.dataset.lazySrc;
    });
    return;
  }

  if (!lazyObserver) {
    lazyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const video = entry.target;
          if (!video.dataset.lazySrc) return;
          video.src = video.dataset.lazySrc;
          video.preload = "metadata";
          delete video.dataset.lazySrc;
          lazyObserver.unobserve(video);
        });
      },
      { rootMargin: "200px" }
    );
  }

  videos.forEach((video) => lazyObserver.observe(video));
}

function upsertMeta(selector, create, content) {
  let el = document.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.content = content;
}

export function setOgTags(item) {
  const title = `${item.title} — Prompt Library`;
  const description = item.prompt.length > 200 ? `${item.prompt.slice(0, 197)}…` : item.prompt;
  const pageUrl = getShareUrl(item.id);
  const imageUrl = item.type === "image" ? resolveSitePath(item.media) : null;

  document.title = title;

  upsertMeta('meta[name="description"]', () => {
    const el = document.createElement("meta");
    el.name = "description";
    return el;
  }, description);

  const ogProps = [
    ["og:title", title],
    ["og:description", description],
    ["og:type", "article"],
    ["og:url", pageUrl],
    ["twitter:card", imageUrl ? "summary_large_image" : "summary"],
    ["twitter:title", title],
    ["twitter:description", description],
  ];

  if (imageUrl) {
    ogProps.push(["og:image", imageUrl], ["twitter:image", imageUrl]);
  }

  ogProps.forEach(([property, content]) => {
    upsertMeta(`meta[property="${property}"]`, () => {
      const el = document.createElement("meta");
      el.setAttribute("property", property);
      return el;
    }, content);
  });
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

  let lastError = null;
  for (const url of getPromptJsonUrls()) {
    try {
      const items = await fetchPromptItems(url);
      cachedPrompts = items;
      return cachedPrompts;
    } catch (error) {
      lastError = error;
      console.warn("Prompt fetch failed:", error);
    }
  }

  const inlineItems = readInlinePrompts();
  if (inlineItems) {
    cachedPrompts = inlineItems;
    return cachedPrompts;
  }

  throw lastError ?? new Error("No prompts available");
}

export function findPromptById(items, id) {
  return items.find((item) => item.id === id) ?? null;
}
