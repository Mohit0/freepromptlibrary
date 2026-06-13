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
├── index.html              # Main gallery page
├── css/style.css           # Styles
├── js/app.js               # Gallery logic
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

After pushing to GitHub:

1. Go to **Settings → Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. Push to `main` — the deploy workflow publishes the site automatically

## Validation

Run locally before opening a PR:

```bash
node scripts/validate.js
```

Checks include: required fields, unique IDs, valid dates, media file exists, and correct file extensions.

## License

MIT — see [LICENSE](LICENSE).
