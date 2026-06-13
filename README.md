# Prompt Library

A static, community-driven gallery of AI prompts paired with their generated images and videos. Browse prompts, copy what works, and submit your own via pull request.

## Live site

Once deployed, the site is available at:

```
https://<your-username>.github.io/<repo-name>/
```

## Local preview

Because the site loads data via `fetch`, you need a local server (opening `index.html` directly won't work):

```bash
# Python
python3 -m http.server 8080

# or Node
npx serve .
```

Then open [http://localhost:8080](http://localhost:8080).

## Project structure

```
├── index.html              # Gallery homepage
├── prompt.html             # Shareable page for a single prompt
├── submit.html             # Submission guide & JSON builder
├── css/style.css           # Styles
├── js/app.js               # Gallery logic
├── js/submit.js            # Submission page logic
├── data/prompts.json       # All prompt entries (edited via PR)
├── assets/
│   ├── images/             # Image files
│   └── videos/             # Video files
├── submissions/template.json
├── scripts/validate.js     # PR validation script
└── .github/workflows/      # Deploy + validate CI
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide on submitting prompts through pull requests.

Quick steps:

1. Fork the repo and create a branch
2. Add your media to `assets/images/` or `assets/videos/`
3. Add an entry to `data/prompts.json` using `submissions/template.json`
4. Open a pull request — CI validates your submission automatically

## GitHub Pages setup

After pushing to GitHub, enable Pages **before** the deploy workflow can succeed:

1. Open your repo on GitHub
2. Go to **Settings → Pages**
3. Under **Build and deployment**, set **Source** to **GitHub Actions** (not "Deploy from a branch")
4. If you don't see "GitHub Actions" as an option, click **Configure** or visit the **Actions** tab and run the **Deploy to GitHub Pages** workflow once — GitHub may prompt you to enable Pages
5. Re-run the failed workflow: **Actions → Deploy to GitHub Pages → Re-run all jobs**

Each prompt gets a unique shareable URL:

```
https://<your-username>.github.io/<repo-name>/prompt.html?id=<prompt-id>
```

Example: `prompt.html?id=cinematic-portrait-001`

Users can copy the link from gallery cards, the detail modal, or the dedicated prompt page.

### Deploy workflow fails with "Get Pages site failed"

This means GitHub Pages is not enabled yet, or the source is still set to **Deploy from a branch** instead of **GitHub Actions**.

Fix:

1. **Settings → Pages → Build and deployment → Source → GitHub Actions**
2. **Actions → Deploy to GitHub Pages → Re-run all jobs**

For organization repos, an org admin may need to allow GitHub Pages under **Org Settings → Pages**.

## Validation

Run locally before opening a PR:

```bash
node scripts/validate.js
```

Checks include: required fields, unique IDs, media file exists, and correct file extensions.

## License

MIT — see [LICENSE](LICENSE).
