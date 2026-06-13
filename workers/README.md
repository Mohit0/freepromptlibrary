# Submission API (Cloudflare Worker)

The submit form posts to a small Cloudflare Worker that uploads the media file, updates `data/prompts.json`, and opens a pull request — no fork required.

## One-time setup

### 1. Create a GitHub token

1. Go to [GitHub → Settings → Developer settings → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Create a token with access to `Mohit0/freepromptlibrary`
3. Permissions:
   - **Contents:** Read and write
   - **Pull requests:** Read and write
4. Copy the token

### 2. Deploy the worker

```bash
cd workers
npm install
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npm run deploy
```

Copy the worker URL from the deploy output (e.g. `https://freepromptlibrary-submit.yourname.workers.dev`).

### 3. Connect the site

Edit `js/config.js` in the repo root:

```javascript
export const SUBMIT_API_URL = "https://freepromptlibrary-submit.yourname.workers.dev";
```

Commit and push. After GitHub Pages deploys, the submit form will work.

## Local testing

Terminal 1 — run the worker locally:

```bash
cd workers
npx wrangler secret put GITHUB_TOKEN
npm run dev
```

Terminal 2 — serve the site:

```bash
python3 -m http.server 8080
```

Set `js/config.js` to the local worker URL (usually `http://localhost:8787`), then open `http://localhost:8080/submit.html`.

## What the worker does

1. Validates the form and file type/size
2. Checks the prompt ID is unique
3. Creates a branch `submission/{id}-{timestamp}`
4. Commits the media file and updated `data/prompts.json`
5. Opens a pull request to `main`

The existing **Validate submissions** workflow runs on the PR automatically.

## Security notes

- Keep `GITHUB_TOKEN` only in Cloudflare secrets — never in the frontend
- `ALLOWED_ORIGINS` in `wrangler.toml` restricts which sites can call the API
- A honeypot field blocks basic bots
