#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "prompts.json");

const REQUIRED_FIELDS = [
  "id",
  "title",
  "prompt",
  "type",
  "media",
  "contributor",
];

const VALID_TYPES = new Set(["image", "video"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`⚠️  ${message}`);
}

function validateItem(item, index, seenIds) {
  const label = `items[${index}]`;

  if (!item || typeof item !== "object") {
    fail(`${label}: must be an object`);
    return;
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in item) || item[field] === "" || item[field] == null) {
      fail(`${label}: missing required field "${field}"`);
    }
  }

  if (typeof item.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(item.id)) {
    fail(`${label}: id must be lowercase alphanumeric with hyphens`);
  }

  if (seenIds.has(item.id)) {
    fail(`${label}: duplicate id "${item.id}"`);
  }
  seenIds.add(item.id);

  if (!VALID_TYPES.has(item.type)) {
    fail(`${label}: type must be "image" or "video"`);
  }

  if (typeof item.media !== "string" || !item.media.startsWith("assets/")) {
    fail(`${label}: media must be a path starting with assets/`);
    return;
  }

  const mediaPath = path.join(ROOT, item.media);
  if (!fs.existsSync(mediaPath)) {
    fail(`${label}: media file not found at ${item.media}`);
    return;
  }

  const ext = path.extname(item.media).toLowerCase();
  if (item.type === "image" && !IMAGE_EXTENSIONS.has(ext)) {
    fail(`${label}: image media must use ${[...IMAGE_EXTENSIONS].join(", ")}`);
  }
  if (item.type === "video" && !VIDEO_EXTENSIONS.has(ext)) {
    fail(`${label}: video media must use ${[...VIDEO_EXTENSIONS].join(", ")}`);
  }

  const stats = fs.statSync(mediaPath);
  const maxBytes = item.type === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (stats.size > maxBytes) {
    warn(`${label}: media file is large (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
  }
}

function main() {
  if (!fs.existsSync(DATA_FILE)) {
    fail("data/prompts.json not found");
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    fail(`Invalid JSON in data/prompts.json: ${error.message}`);
    process.exit(1);
  }

  if (!Array.isArray(data.items)) {
    fail('data/prompts.json must have an "items" array');
    process.exit(1);
  }

  const seenIds = new Set();
  data.items.forEach((item, index) => validateItem(item, index, seenIds));

  if (process.exitCode) {
    console.error("\nValidation failed.");
    process.exit(1);
  }

  console.log(`✅ Validated ${data.items.length} prompt(s) successfully.`);
}

main();
