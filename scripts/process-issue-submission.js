#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "prompts.json");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);
const IMAGE_MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};
const VIDEO_MIME_EXTENSIONS = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

const FIELD_ALIASES = {
  title: ["title"],
  prompt: ["prompt text", "prompt"],
  type: ["media type", "type"],
  tags: ["tags"],
  contributor: ["github username", "contributor"],
};

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseIssueBody(body) {
  const sections = {};
  const parts = body.split(/^### /m).slice(1);

  for (const part of parts) {
    const newline = part.indexOf("\n");
    if (newline === -1) continue;
    const heading = part.slice(0, newline).trim().toLowerCase();
    const value = part.slice(newline + 1).trim();
    sections[heading] = value;
  }

  const parsed = {};
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (sections[alias]) {
        parsed[key] = sections[alias];
        break;
      }
    }
  }

  return parsed;
}

function extractAttachmentUrls(body) {
  const urls = new Set();
  const patterns = [
    /https:\/\/github\.com\/user-attachments\/assets\/[a-f0-9-]+/gi,
    /https:\/\/private-user-images\.githubusercontent\.com\/[^\s)>"]+/gi,
  ];

  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      urls.add(match[0].replace(/[).,]+$/, ""));
    }
  }

  return [...urls];
}

function extensionFromUrl(url) {
  const clean = url.split("?")[0];
  const ext = path.extname(clean).toLowerCase();
  return ext || null;
}

function extensionFromType(type, contentType) {
  const normalized = (contentType || "").split(";")[0].trim().toLowerCase();
  if (type === "image") {
    return IMAGE_MIME_EXTENSIONS[normalized] || ".jpg";
  }
  return VIDEO_MIME_EXTENSIONS[normalized] || ".mp4";
}

function isExtensionAllowed(type, ext) {
  if (type === "image") return IMAGE_EXTENSIONS.has(ext);
  return VIDEO_EXTENSIONS.has(ext);
}

function uniqueId(baseId, existingIds) {
  if (!existingIds.has(baseId)) return baseId;
  let index = 2;
  while (existingIds.has(`${baseId}-${index}`)) index += 1;
  return `${baseId}-${index}`;
}

async function githubRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status}: ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function commentOnIssue(repo, issueNumber, token, body) {
  await githubRequest(`https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

async function downloadAttachment(url, token, type) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/octet-stream",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to download attachment (${response.status}) from ${url}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const buffer = Buffer.from(await response.arrayBuffer());
  let ext = extensionFromUrl(url) || extensionFromType(type, contentType);

  if (!isExtensionAllowed(type, ext)) {
    ext = type === "image" ? ".jpg" : ".mp4";
  }

  return { buffer, ext, contentType };
}

function validateParsedSubmission(parsed) {
  const errors = [];
  if (!parsed.title?.trim()) errors.push("Missing **Title**.");
  if (!parsed.prompt?.trim()) errors.push("Missing **Prompt text**.");
  if (!["image", "video"].includes(parsed.type?.trim().toLowerCase())) {
    errors.push('**Media type** must be "image" or "video".');
  }
  if (!parsed.tags?.trim()) errors.push("Missing **Tags**.");
  if (!parsed.contributor?.trim()) errors.push("Missing **GitHub username**.");
  return errors;
}

async function prExistsForIssue(repo, token, issueNumber) {
  const [owner] = repo.split("/");
  const head = `${owner}:submission/issue-${issueNumber}`;
  const pulls = await githubRequest(
    `https://api.github.com/repos/${repo}/pulls?head=${encodeURIComponent(head)}&state=all`,
    token
  );
  return Array.isArray(pulls) && pulls.length > 0;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const issueNumber = process.env.ISSUE_NUMBER;

  if (!token || !repo || !issueNumber) {
    console.error("GITHUB_TOKEN, GITHUB_REPOSITORY, and ISSUE_NUMBER are required.");
    process.exit(1);
  }

  let issue;
  try {
    issue = await githubRequest(
      `https://api.github.com/repos/${repo}/issues/${issueNumber}`,
      token
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (await prExistsForIssue(repo, token, issueNumber)) {
    console.log(`PR already exists for issue #${issueNumber}, skipping.`);
    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) fs.appendFileSync(outputFile, "skipped=true\n");
    return;
  }

  const fail = async (message) => {
    console.error(message);
    try {
      await commentOnIssue(
        repo,
        issueNumber,
        token,
        `❌ **Could not create pull request**\n\n${message}\n\nPlease fix the issue and comment here, or open a new submission.`
      );
    } catch (commentError) {
      console.error("Failed to comment on issue:", commentError.message);
    }
    process.exit(1);
  };

  const parsed = parseIssueBody(issue.body || "");
  const validationErrors = validateParsedSubmission(parsed);
  if (validationErrors.length) {
    await fail(validationErrors.join("\n"));
  }

  const attachmentUrls = extractAttachmentUrls(issue.body || "");
  if (!attachmentUrls.length) {
    await fail(
      "No media attachment found. Please edit this issue and attach your image or video using the attachment/paperclip button, then comment **retry**."
    );
  }

  const type = parsed.type.trim().toLowerCase();
  const title = parsed.title.trim();
  const prompt = parsed.prompt.trim();
  const tags = parsed.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const contributor = parsed.contributor.trim().replace(/^@/, "");
  const baseId = slugify(title);

  if (!baseId) {
    await fail("Could not generate an ID from the title. Use letters and numbers in the title.");
  }

  if (!tags.length) {
    await fail("Add at least one tag.");
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (!Array.isArray(data.items)) {
    await fail('data/prompts.json is invalid — missing "items" array.');
  }

  const existingIds = new Set(data.items.map((item) => item.id));
  const id = uniqueId(baseId, existingIds);

  let mediaBuffer;
  let mediaExt;
  let lastDownloadError = null;

  for (const url of attachmentUrls) {
    try {
      const downloaded = await downloadAttachment(url, token, type);
      if (isExtensionAllowed(type, downloaded.ext)) {
        mediaBuffer = downloaded.buffer;
        mediaExt = downloaded.ext;
        break;
      }
      if (!mediaBuffer) {
        mediaBuffer = downloaded.buffer;
        mediaExt = downloaded.ext;
      }
    } catch (error) {
      lastDownloadError = error;
    }
  }

  if (!mediaBuffer) {
    await fail(
      `Could not download any attachment.${lastDownloadError ? ` ${lastDownloadError.message}` : ""}`
    );
  }

  if (!isExtensionAllowed(type, mediaExt)) {
    await fail(
      `Attachment format "${mediaExt}" is not allowed for type "${type}". Use ${[...(type === "image" ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS)].join(", ")}.`
    );
  }

  const folder = type === "video" ? "assets/videos" : "assets/images";
  const filename = `${id}${mediaExt}`;
  const mediaPath = path.join(ROOT, folder, filename);
  const mediaRelative = `${folder}/${filename}`.replace(/\\/g, "/");

  const entry = {
    id,
    title,
    prompt,
    type,
    media: mediaRelative,
    tags,
    contributor: `@${contributor}`,
  };

  fs.mkdirSync(path.dirname(mediaPath), { recursive: true });
  fs.writeFileSync(mediaPath, mediaBuffer);
  data.items.push(entry);
  fs.writeFileSync(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);

  try {
    execSync("node scripts/bundle-prompts.js", { cwd: ROOT, stdio: "inherit" });
    execSync("node scripts/validate.js", { cwd: ROOT, stdio: "inherit" });
  } catch (error) {
    data.items = data.items.filter((item) => item.id !== id);
    fs.writeFileSync(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);
    if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
    await fail("Validation failed after building the submission. Check tags, file size, and media format.");
  }

  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `entry_id=${id}\n`);
    fs.appendFileSync(outputFile, `entry_title<<ENTRY_TITLE\n${title}\nENTRY_TITLE\n`);
  }

  console.log(`Processed issue #${issueNumber} → ${id}`);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
