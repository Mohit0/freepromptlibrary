#!/usr/bin/env node
/**
 * Optional legacy script — not required for the site to work.
 * The gallery loads directly from data/prompts.json at runtime.
 *
 * You only need to edit data/prompts.json and push to GitHub.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const JSON_FILE = path.join(ROOT, "data", "prompts.json");
const OUT_FILE = path.join(ROOT, "js", "prompts-data.js");

const data = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));

if (!Array.isArray(data.items)) {
  console.error('data/prompts.json must contain an "items" array');
  process.exit(1);
}

const serialized = JSON.stringify(data);

fs.writeFileSync(
  OUT_FILE,
  `// Legacy bundle — site reads data/prompts.json directly\nwindow.__PROMPTS_DATA__ = ${serialized};\n`
);

console.log(`Wrote legacy bundle to js/prompts-data.js (${data.items.length} prompt(s))`);
console.log("Note: bundle-prompts.js is optional. Edit data/prompts.json only.");
