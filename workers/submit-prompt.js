const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeFilename(name) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToUtf8(base64) {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function parseAllowedOrigins(value) {
  return (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };

  if (!origin || allowed.length === 0 || allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin || "*";
  }

  return headers;
}

function jsonResponse(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request, env),
    },
  });
}

async function githubRequest(path, token, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "freepromptlibrary-submit-worker",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const message = data?.message || text || `GitHub API error ${response.status}`;
    throw new Error(message);
  }

  return data;
}

async function getMainSha(repo, token) {
  const ref = await githubRequest(`/repos/${repo}/git/ref/heads/main`, token);
  return ref.object.sha;
}

async function createBranch(repo, token, branch, sha) {
  await githubRequest(`/repos/${repo}/git/refs`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha,
    }),
  });
}

async function getRepoFile(repo, token, filePath, ref) {
  const data = await githubRequest(
    `/repos/${repo}/contents/${filePath}?ref=${encodeURIComponent(ref)}`,
    token
  );
  return {
    sha: data.sha,
    text: base64ToUtf8(data.content),
  };
}

async function putRepoFile(repo, token, filePath, branch, contentBase64, message, sha) {
  const body = {
    message,
    content: contentBase64,
    branch,
  };
  if (sha) body.sha = sha;

  await githubRequest(`/repos/${repo}/contents/${filePath}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validateSubmission({ id, title, prompt, type, tags, contributor, file }) {
  const errors = [];

  if (!title) errors.push("Title is required.");
  if (!prompt) errors.push("Prompt is required.");
  if (!["image", "video"].includes(type)) errors.push('Media type must be "image" or "video".');
  if (!tags.length) errors.push("Add at least one tag.");
  if (!contributor) errors.push("GitHub username is required.");
  if (!file) errors.push("Media file is required.");

  const normalizedId = slugify(id || title);
  if (!normalizedId || !/^[a-z0-9][a-z0-9-]*$/.test(normalizedId)) {
    errors.push("ID must be lowercase letters, numbers, and hyphens.");
  }

  if (file) {
    const ext = `.${(file.name.split(".").pop() || "").toLowerCase()}`;
    const allowed = type === "video" ? VIDEO_EXTENSIONS : IMAGE_EXTENSIONS;
    if (!allowed.has(ext)) {
      errors.push(`Invalid file type "${ext}" for ${type}.`);
    }
    const maxBytes = type === "video" ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
    if (file.size > maxBytes) {
      errors.push(`File is too large. Max ${type === "video" ? "50" : "10"} MB.`);
    }
  }

  return { errors, id: normalizedId };
}

async function createSubmissionPr(env, submission, fileBuffer) {
  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;
  if (!repo || !token) {
    throw new Error("Submission API is not configured on the server.");
  }

  const { id, title, prompt, type, tags, contributor } = submission;
  const ext = `.${(submission.filename.split(".").pop() || "").toLowerCase()}`;
  const mediaFilename = `${id}${ext}`;
  const mediaPath = `${type === "video" ? "assets/videos" : "assets/images"}/${mediaFilename}`;
  const branch = `submission/${id}-${Date.now()}`;

  const promptsFile = await getRepoFile(repo, token, "data/prompts.json", "main");
  const promptsData = JSON.parse(promptsFile.text);
  if (!Array.isArray(promptsData.items)) {
    throw new Error('data/prompts.json is missing an "items" array.');
  }

  if (promptsData.items.some((item) => item.id === id)) {
    throw new Error(`Prompt ID "${id}" already exists. Choose a different ID.`);
  }

  const entry = {
    id,
    title,
    prompt,
    type,
    media: mediaPath,
    tags,
    contributor: contributor.startsWith("@") ? contributor : `@${contributor}`,
  };

  promptsData.items.push(entry);

  const mainSha = await getMainSha(repo, token);
  await createBranch(repo, token, branch, mainSha);

  await putRepoFile(
    repo,
    token,
    mediaPath,
    branch,
    bufferToBase64(fileBuffer),
    `Add media for ${title}`,
    null
  );

  await putRepoFile(
    repo,
    token,
    "data/prompts.json",
    branch,
    utf8ToBase64(`${JSON.stringify(promptsData, null, 2)}\n`),
    `Add prompt: ${title}`,
    null
  );

  const pr = await githubRequest(`/repos/${repo}/pulls`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `Add prompt: ${title}`,
      head: branch,
      base: "main",
      body: [
        "Submitted via the Prompt Library form.",
        "",
        `**Contributor:** ${entry.contributor}`,
        `**Prompt ID:** \`${id}\``,
        "",
        "Please review the media and prompt text before merging.",
      ].join("\n"),
    }),
  });

  return {
    id,
    title,
    branch,
    prUrl: pr.html_url,
    prNumber: pr.number,
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    if (request.method !== "POST") {
      return jsonResponse(request, env, { error: "Method not allowed" }, 405);
    }

    try {
      const formData = await request.formData();

      if (formData.get("website")) {
        return jsonResponse(request, env, { error: "Submission rejected." }, 400);
      }

      const tags = String(formData.get("tags") || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const file = formData.get("media");
      const submission = {
        id: String(formData.get("id") || ""),
        title: String(formData.get("title") || "").trim(),
        prompt: String(formData.get("prompt") || "").trim(),
        type: String(formData.get("type") || "").trim().toLowerCase(),
        tags,
        contributor: String(formData.get("contributor") || "").trim().replace(/^@/, ""),
        filename: file && typeof file === "object" && "name" in file ? sanitizeFilename(file.name) : "",
      };

      const { errors, id } = validateSubmission({
        ...submission,
        file: file instanceof File ? file : null,
      });

      if (errors.length) {
        return jsonResponse(request, env, { error: errors.join(" ") }, 400);
      }

      const fileBuffer = await file.arrayBuffer();
      const result = await createSubmissionPr(env, { ...submission, id }, fileBuffer);

      return jsonResponse(request, env, {
        ok: true,
        message: "Pull request created successfully.",
        ...result,
      });
    } catch (error) {
      return jsonResponse(
        request,
        env,
        { error: error.message || "Submission failed." },
        500
      );
    }
  },
};
