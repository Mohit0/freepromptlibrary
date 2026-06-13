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

const output = `// Auto-generated from data/prompts.json — do not edit directly\nexport default ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(OUT_FILE, output);
console.log(`Bundled ${data.items.length} prompt(s) to js/prompts-data.js`);
