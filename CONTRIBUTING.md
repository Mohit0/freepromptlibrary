# Contributing to Prompt Library

Thank you for contributing! The easiest way to submit is **from your phone or laptop** — no fork, git, or PR workflow required.

## Quick submit (recommended)

1. Open the **[Prompt Submission form](https://github.com/Mohit0/freepromptlibrary/issues/new?template=prompt-submission.yml)** on GitHub
2. Fill in title, prompt, type, tags, and your GitHub username
3. **Attach your image or video** using the paperclip / attachment button (on mobile: pick from camera roll)
4. Submit — GitHub Actions automatically opens a pull request for you
5. Review and merge the PR when you're ready

You can also start from the [Submit page](https://mohit0.github.io/freepromptlibrary/submit.html) on the live site.

## What to submit

Each submission includes:

- **One image or video** — the AI-generated output
- **The prompt** — the exact text used to generate it
- **Metadata** — title, tags, and your GitHub username

## Accepted formats

| Type  | Formats              | Max size (recommended) |
|-------|----------------------|------------------------|
| Image | jpg, png, webp, gif, svg | 10 MB              |
| Video | mp4, webm, mov       | 50 MB                  |

## What happens after you submit

1. **Create PR from prompt submission** workflow runs
2. Your attachment is downloaded and added to `assets/`
3. An entry is appended to `data/prompts.json`
4. A pull request is opened automatically
5. **Validate submissions** runs on the PR
6. You review and merge — the prompt appears in the gallery

If something fails (e.g. missing attachment), the bot comments on your issue with instructions. Edit the issue to add the attachment and it will retry.

## Advanced: manual PR (optional)

Developers can still submit via a traditional pull request:

```bash
git clone https://github.com/Mohit0/freepromptlibrary.git
cd freepromptlibrary
git checkout -b add/my-prompt-name
```

1. Add media to `assets/images/` or `assets/videos/`
2. Append an entry to `data/prompts.json` using `submissions/template.json`
3. Run `node scripts/validate.js` and `node scripts/bundle-prompts.js`
4. Open a pull request

**Field rules:**

- `id` — unique, lowercase, hyphens only (e.g. `my-cool-prompt`)
- `type` — `"image"` or `"video"`
- `media` — path relative to repo root, must start with `assets/`
- `tags` — at least one tag
- `contributor` — your GitHub handle (e.g. `@username`)

## Tips for great submissions

- **Be specific in prompts** — include style, lighting, lens, mood, and technical details
- **Use relevant tags** — helps others find similar prompts
- **Keep files reasonably sized** — compress large images/videos before submitting

## Questions?

Open an issue on [GitHub](https://github.com/Mohit0/freepromptlibrary/issues) if you need help.
