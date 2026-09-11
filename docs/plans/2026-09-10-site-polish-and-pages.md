# Site polish and GitHub Pages

Date: 2026-09-10. Approved by Rish in chat: "yes site polish is great", "github pages please for the site", and "I'll get a domain". Midway he renamed the project Picagram, at picagram.dev, and chose a public repository; see `docs/decisions/0008-public-name.md`.

## Why

The catalog worked end to end, but it was not ready to publish.
- The tag chips filled the left pane, so no component name showed without scrolling.
- The canvas opened at about 5%, a field of tiny frames.
- There was no favicon, no link preview, and no wordmark.
- Every link on the page started at the root, which breaks under the `/picagram` path GitHub Pages serves a project from until the domain is set up.

## What changes

- **Wordmark.** "Picagram" in Jacquarda Bastarda 9, traced from the font into an SVG path drawn in the text color. The favicon is its P.
- **Layers.** Tags fold behind a toggle that shows how many are on.
- **Canvas.** Up to four frames to a row, and the opening view fits the board's width, from the top.
- **Phones.** Picking from the list scrolls the canvas into view.
- **Link preview.** `public/og.png`, rendered by `npm run social-card`, with Open Graph and Twitter metadata.
- **Paths.** The page links to its own files relatively. `llms.txt`, the registry, and the metadata use absolute URLs from `SITE_URL`. Production builds use `BASE_PATH` as Next's `basePath`. `test/site.test.ts` and `check:site` enforce it.
- **Deploy.** `.github/workflows/pages.yml` runs the gate on macOS, captures thumbnails with verify, and publishes `out/` to Pages. Thumbnails stay out of git. The repository is public, `rishabbalak/picagram`, and the site starts at `rishabbalak.github.io/picagram/`.

## Not in this plan

- The custom domain. picagram.dev was not registered yet when this was built. Once it is, `docs/architecture/site.md` lists the four steps.
- The revise wave for the components, which gets its own plan.
