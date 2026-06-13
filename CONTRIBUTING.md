# Contributing to Prompt Library

Thank you for contributing! Use the [submit page](https://mohit0.github.io/freepromptlibrary/submit.html) to build your entry, then open a pull request on GitHub.

## What to submit

Each submission includes:

- **One image or video** — the AI-generated output
- **The prompt** — the exact text used to generate it
- **Metadata** — title, tags, and your GitHub username

## Step-by-step

### 1. Build your entry

Open [submit.html](https://mohit0.github.io/freepromptlibrary/submit.html) on your phone or laptop:

1. Fill in the form and select your media file
2. Copy or download the generated JSON entry

### 2. Fork and branch

```bash
git clone https://github.com/<your-username>/freepromptlibrary.git
cd freepromptlibrary
git checkout -b add/my-prompt-name
```

Or fork on GitHub and edit files in the web UI.

### 3. Add your media file

Place your file in the correct folder:

| Type  | Folder            | Formats              | Max size (recommended) |
|-------|-------------------|----------------------|------------------------|
| Image | `assets/images/`  | jpg, png, webp, gif, svg | 10 MB              |
| Video | `assets/videos/`  | mp4, webm, mov       | 50 MB                  |

Use a descriptive filename: `neon-alley-rain.mp4`, not `IMG_0042.jpg`.

### 4. Add your entry to `data/prompts.json`

Copy the structure from `submissions/template.json` and append your entry to the `items` array:

```json
{
  "id": "neon-alley-rain",
  "title": "Neon Alley in Rain",
  "prompt": "A narrow Tokyo alley at night, heavy rain, neon signs reflecting on wet pavement, cinematic, 35mm film look",
  "type": "image",
  "media": "assets/images/neon-alley-rain.jpg",
  "tags": ["cyberpunk", "rain", "night"],
  "contributor": "@your-github-username"
}
```

**Field rules:**

- `id` — unique, lowercase, hyphens only (e.g. `my-cool-prompt`)
- `type` — `"image"` or `"video"`
- `media` — path relative to repo root, must start with `assets/`
- `tags` — at least one tag
- `contributor` — your GitHub handle (e.g. `@username`)

### 5. Validate locally

```bash
node scripts/validate.js
node scripts/bundle-prompts.js
```

Fix any errors before pushing.

### 6. Open a pull request

```bash
git add assets/ data/prompts.json js/prompts-data.js index.html prompt.html
git commit -m "Add prompt: Neon Alley in Rain"
git push origin add/my-prompt-name
```

Open a PR on GitHub. The **Validate submissions** workflow runs automatically. Once approved and merged to `main`, your prompt appears in the live site.

## PR checklist

- [ ] Media file added to `assets/images/` or `assets/videos/`
- [ ] Entry added to `data/prompts.json`
- [ ] `id` is unique across all entries
- [ ] `node scripts/validate.js` passes locally
- [ ] Prompt text is the actual prompt used (not a paraphrase)
- [ ] You have rights to share the media

## Tips for great submissions

- **Be specific in prompts** — include style, lighting, lens, mood, and technical details
- **Use relevant tags** — helps others find similar prompts
- **Keep files reasonably sized** — compress large images/videos before submitting

## Questions?

Open a discussion or issue on [GitHub](https://github.com/Mohit0/freepromptlibrary) if you need help.
