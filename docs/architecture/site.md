# The site

`src/app/` is one static page. It reads `public/catalog.json` and the generated files next to it, and keeps one piece of state in the URL: the selected slug, as the hash (`#ascii-image`). Nothing else on the page needs a server.

## Panes

| Pane | Files | Job |
|---|---|---|
| Layers | `src/components/Layers.tsx`, `Logo.tsx` | the wordmark, search (Cmd+K or Ctrl+K focuses it), tag chips folded behind a Tags toggle that shows how many are on, and the component list grouped by non-empty category |
| Canvas | `src/components/Canvas.tsx`, `src/components/Frame.tsx` | a board with one 1280 by 800 frame per component, up to four to a row, on a surface that pans (drag, wheel) and zooms (Cmd or Ctrl plus wheel, pinch, and the 50%, 100%, and fit buttons). It opens fitted to the board's width and seen from the top, so frames start large enough to read; fit shows the whole board. |
| Inspector | `src/components/Inspector.tsx`, `Controls.tsx`, `CodeTabs.tsx`, `CopyButton.tsx` | title, description, size, tags, controls generated from `controls` and `defaults`, the palette, the React, HTML, Install, and LLM tabs, the events panel, and credits |

`src/components/Catalog.tsx` holds the state and passes it down. Under 900px the panes stack with the canvas first, and picking a component from the list scrolls the canvas back into view; the DOM order, and so the tab order, stays layers, canvas, inspector.

## What a frame shows

Zoomed out, a frame is `public/thumbs/<slug>.jpg`, or `<slug>-light.jpg` while the ground is paper, or the title in muted text when the capture is missing. Frames that a search or a tag filters out are dimmed, never removed, so the board keeps its shape. The selected frame, and only that one, is a live iframe of `/v/<slug>.html`. An iframe keeps the pointer and wheel events it receives, so while Cmd, Ctrl, or Space is held the live frame stops taking them and a wheel or a drag over it reaches the board. The canvas bar sets its ground (ink, paper, or checker, through `data-ground` on the frame document's `html` element, which the generated page styles itself) and its width (390, 768, or 1280).

## How the inspector drives the frame

Controls start from the item's `defaults`, with `meta.demo.props` layered on top when the component declares a demo, so a freshly selected component starts looking finished rather than plain. A control's type decides its input: `number` (a slider and a number field), `string`, `textarea` (the same, with `rows` lines), `boolean`, `select`, `color`, `numbers` (a comma-separated list), and `json`. The `json` control is a textarea that sends a value only once it parses and its kind, array, object, or a plain value, matches the prop's own default; otherwise the field is marked `aria-invalid` and shows a short error, and the frame keeps its last value.

Every change posts `{ type: "pica:props", props }` to the iframe, where `props` holds the values that differ from the plain defaults, demo state included, and the same message goes out once when the iframe loads. A prop that returns to that state is sent once more with its value there, because the frame keeps the last value it was given. The generated page listens for exactly this message from its parent window. The changed count and the reset button in the Controls section track only the user's own edits, so an untouched, demo-dressed component reads as nothing changed.

The copy buttons bake the same values in. The React tab's usage line carries them as attributes, followed by the demo's children, when the component has them, converted to JSX (`class` to `className`, `for` to `htmlFor`, void elements self-closed). The HTML tab inserts `<script>window.PICA_PROPS = {...};</script>` before the file's first script, which is where the file reads it at mount.

## Palette

Every component's inspector gets a Palette section, one color input per token in `meta.palette`, which defaults to `["fg"]`. Each token has a reset button that clears it back to following the page. Palette state is sent inside the same `pica:props` message as the props, under a `palette` key that always carries all four tokens (`fg`, `bg`, `accent`, `muted`), an empty string for a token the user has not set. The generated page turns a set token into a `--pica-*` custom property on the host and removes it for an empty one, so clearing a token in the inspector takes effect immediately. A token the user sets also appears in the copy snippets, as `palette={{ fg: "#…" }}` in the React tab and inside the same baked `window.PICA_PROPS` object in the HTML tab.

## Events

A component that declares `events` in its catalog entry reports them as `pica:<name>` DOM events on its host, and the generated page forwards each as `{ type: "pica:event", name, detail }` to its parent window. The Inspector listens for this message and keeps the latest 20, newest first, in an Events section: the event's name, its detail as JSON, and the time it arrived, with a button to clear the log. The section appears as soon as the selected component declares an event, or the moment one actually arrives, whichever comes first, since an undeclared event is still worth seeing. The log starts empty each time the selection changes, since it belongs to whichever frame is live.

## Files it reads

`public/catalog.json` is imported at build time. Its item type is `CatalogItem` in `src/lib/catalog.ts`: `Meta` from `lib/meta.ts` plus `exportName`, `defaults`, `docs`, `types`, `events`, and `gzipBytes`. `/react/<slug>.tsx` and `/v/<slug>.html` are fetched when their tabs open and remembered. The install line uses `REGISTRY_BASE` from `scripts/config.ts`, and the footer's license label is checked by `test/license.test.ts`.

`scripts/check-site.ts` (`npm run check:site`) builds the static site, serves `out/` on a local port under `BASE_PATH`, the way GitHub Pages serves it, and drives headless Chromium through it: every catalog item listed, a frame that loads, every control type, the palette, an invalid json control, the copy snippets, and the events panel, once from a fixture and once from select. No single real component has every control type, so the script sets `PICA_FIXTURE=1`, which adds one synthetic item with every control type and a declared event. A normal build never carries it.

## Hosting and paths

GitHub Pages serves the site. `.github/workflows/pages.yml` runs on every push to `main`, on macOS so the captures use a Mac's fonts: the whole gate, then `npm run verify -- --quick`, which also writes the thumbnails, since `public/thumbs/` is not committed, then `check:site`, then a clean `next build` into `out/`, which it publishes.

`SITE_URL` in `scripts/config.ts` says where the site lives, and `BASE_PATH` follows from it: `/picagram` while Pages serves the site from the repository's path, until picagram.dev is set up. A production build uses `BASE_PATH` as Next's `basePath`, so `check:site` tests what Pages serves, and `next dev` stays at the root. The page links to its own files with relative paths (`thumbs/`, `v/`, `react/`, `c/`, `llms.txt`), so they resolve under any base path. Link previews and `llms.txt` need full URLs, so those come from `SITE_URL`. `test/site.test.ts` checks both.

Moving to a custom domain:
1. Set `SITE_URL` to the domain. `BASE_PATH` becomes empty.
2. Add `public/CNAME` with the domain's name, and set the domain in the repository's Pages settings.
3. Point the domain's DNS at GitHub Pages.
4. Run `npm run build:registry`, since `llms.txt` links change, and commit.

## Brand

The name is Picagram (see `docs/decisions/0008-public-name.md`), and the wordmark is "Picagram" set in Jacquarda Bastarda 9, a pixel blackletter on Google Fonts. The site never loads the font. `src/lib/logo.ts` holds the wordmark as one SVG path, traced from the font on its own pixel grid; the same trace of "Pica" matched Rish's original logo cell for cell. `src/components/Logo.tsx` draws it in the text color at 26 px, two screen pixels per pixel of the mark. The favicon, `public/icon.svg`, is the wordmark's P on an ink tile. The link preview, `public/og.png`, comes from `npm run social-card`; run it again when the wordmark or the tagline changes.

## Rules the stylesheet keeps

Six tokens in `src/app/globals.css`, one monospace stack with no web font, zero radius, no shadows, no gradients, and hairlines in `--line`. Every text tone clears 4.5:1 on its ground; `--muted-2` measures 4.47:1 on ink, so it colors no text. `prefers-reduced-motion` comes first in the file and turns off the page's one transition, the canvas easing into a zoom.
