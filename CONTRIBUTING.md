# Contributing to Prompt Library

## Submit a prompt (recommended)

Use the [submit page](https://mohit0.github.io/freepromptlibrary/submit.html):

1. Fill in the form and attach your image or video
2. Tap **Submit & create PR**
3. A pull request is opened automatically
4. Review and merge when ready

No fork, branch, or git required.

> **Maintainers:** The submit form needs the Cloudflare Worker deployed once. See [workers/README.md](workers/README.md).

## What to submit

- **One image or video** — the AI-generated output
- **The prompt** — the exact text used to generate it
- **Metadata** — title, tags, and your GitHub username

## Accepted formats

| Type  | Formats              | Max size |
|-------|----------------------|----------|
| Image | jpg, png, webp, gif, svg | 10 MB |
| Video | mp4, webm, mov       | 50 MB    |

## Manual PR (optional)

Developers can still submit via a traditional pull request:

1. Add media to `assets/images/` or `assets/videos/`
2. Append an entry to `data/prompts.json` using `submissions/template.json`
3. Run `node scripts/validate.js` and `node scripts/bundle-prompts.js`
4. Open a pull request

**Field rules:**

- `id` — unique, lowercase, hyphens only
- `type` — `"image"` or `"video"`
- `media` — path starting with `assets/`
- `tags` — at least one tag
- `contributor` — GitHub handle (e.g. `@username`)

## Tips

- Be specific in prompts — style, lighting, lens, mood
- Use relevant tags
- Compress large files before submitting
