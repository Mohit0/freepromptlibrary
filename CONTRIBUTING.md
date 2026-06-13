# Contributing to Prompt Library

Thank you for contributing! Use the [submit page](https://mohit0.github.io/freepromptlibrary/submit.html) to build your JSON entry, then open a pull request on GitHub.

## What to submit

Each submission includes:

- **One image or video** — the AI-generated output
- **The prompt** — the exact text used to generate it
- **Metadata** — title and your GitHub username

## Step-by-step

### 1. Build your entry

Open [submit.html](https://mohit0.github.io/freepromptlibrary/submit.html):

1. Fill in the form and select your media file
2. Copy or download the generated JSON entry

### 2. Fork and branch

Fork the repo on GitHub, then create a branch:

```bash
git clone https://github.com/<your-username>/freepromptlibrary.git
cd freepromptlibrary
git checkout -b add/my-prompt-name
```

### 3. Add your media file

| Type  | Folder            | Formats              |
|-------|-------------------|----------------------|
| Image | `assets/images/`  | jpg, png, webp, gif, svg |
| Video | `assets/videos/`  | mp4, webm, mov       |

### 4. Add your entry to `data/prompts.json`

Append your entry to the `items` array using `submissions/template.json` as a guide.

**That's it for the site data** — the gallery reads `data/prompts.json` directly. No bundle or build commands needed.

### 5. Push and open a PR

```bash
git add assets/ data/prompts.json
git commit -m "Add prompt: Your Title"
git push origin add/my-prompt-name
```

Open a pull request. GitHub Actions validates your submission automatically.

## Field rules

- `id` — unique, lowercase, hyphens only
- `type` — `"image"` or `"video"`
- `media` — path starting with `assets/`
- `contributor` — GitHub handle (e.g. `@username`)

## Tips

- Be specific in prompts — style, lighting, lens, mood
- Compress large files before submitting

## Local preview

```bash
python3 -m http.server 8080
```

Edit `data/prompts.json`, refresh the browser — changes show up immediately.
