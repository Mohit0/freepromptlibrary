const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const JSON_FILE = path.join(ROOT, "data", "prompts.json");
const OUT_FILE = path.join(ROOT, "js", "prompts-data.js");
const HTML_FILES = [
  path.join(ROOT, "index.html"),
  path.join(ROOT, "prompt.html"),
  path.join(ROOT, "submit.html"),
];

const data = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));

if (!Array.isArray(data.items)) {
  console.error('data/prompts.json must contain an "items" array');
  process.exit(1);
}

const serialized = JSON.stringify(data);

fs.writeFileSync(
  OUT_FILE,
  `// Auto-generated from data/prompts.json — do not edit directly\nwindow.__PROMPTS_DATA__ = ${serialized};\n`
);

const inlineTag = `<script id="prompts-inline" type="application/json">${serialized}</script>`;

for (const htmlFile of HTML_FILES) {
  const html = fs.readFileSync(htmlFile, "utf8");
  if (html.includes('id="prompts-inline"')) {
    const updated = html.replace(
      /<script id="prompts-inline" type="application\/json">[\s\S]*?<\/script>/,
      inlineTag
    );
    fs.writeFileSync(htmlFile, updated);
  } else if (html.includes('<script src="js/prompts-data.js"></script>')) {
    const updated = html.replace(
      '<script src="js/prompts-data.js"></script>',
      `${inlineTag}\n  <script src="js/prompts-data.js"></script>`
    );
    fs.writeFileSync(htmlFile, updated);
  }
}

console.log(`Bundled ${data.items.length} prompt(s) to js/prompts-data.js`);
