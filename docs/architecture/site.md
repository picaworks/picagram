# The site

`src/app/` is one static page. It reads `public/catalog.json` and the generated files next to it, and keeps one piece of state in the URL: the selected slug, as the hash (`#ascii-image`). Nothing else on the page needs a server.

## Panes

| Pane | Files | Job |
|---|---|---|
| Layers | `src/components/Layers.tsx`, `Logo.tsx` | the wordmark at 39 px, then the count and the theme control on a second row, search (Cmd+K or Ctrl+K focuses it), the twelve facet chips with their counts, and the component list grouped by non-empty category |
| Canvas | `src/components/Canvas.tsx`, `src/components/Frame.tsx` | a board with one 1280 by 800 frame per component, up to four to a row, on a surface that pans (drag, wheel) and zooms (Cmd or Ctrl plus wheel, pinch, and the 50%, 100%, and fit buttons). It opens fitted to the board's width and seen from the top, so frames start large enough to read; fit shows the whole board. The bar carries the ground and width controls, and, while the inspector is closed, the button that brings it back. A `ResizeObserver` refits an untouched board and keeps a touched one centered, so closing the inspector widens the board rather than cropping it. |
| Inspector | `src/components/Inspector.tsx`, `Controls.tsx`, `CodeTabs.tsx`, `CopyButton.tsx` | a sticky bar with the collapse button, then title, description, size, facet chips that filter, tag buttons that fill the search box, controls generated from `controls` and `defaults`, the palette, the React, HTML, Install, and LLM tabs, the events panel, and credits |

`src/components/Catalog.tsx` holds the state and passes it down. Under 900px the panes stack with the canvas first, and picking a component from the list scrolls the canvas back into view; the DOM order, and so the tab order, stays layers, canvas, inspector. The inspector starts open. Closing it hands its column to the canvas on a wide screen and hides the block on a narrow one, it stays closed until someone opens it again, selection included, and focus moves to whichever of the two buttons is now on screen.

## What a frame shows

Zoomed out, a frame is `public/thumbs/<slug>.jpg`, or `<slug>-light.jpg` while the ground is paper, or the title in muted text when the capture is missing. Frames that a search or a tag filters out are dimmed, never removed, so the board keeps its shape. The selected frame, and only that one, is a live iframe of `/v/<slug>.html`. An iframe keeps the pointer and wheel events it receives, so while Cmd, Ctrl, or Space is held the live frame stops taking them and a wheel or a drag over it reaches the board. The canvas bar sets its ground (ink, paper, or checker, through `data-ground` on the frame document's `html` element, which the generated page styles itself) and its width (390, 768, or 1280). The ground starts from the theme, ink for dark and paper for light, and every press on the theme control sets it again. The ground control may then move it anywhere, and the next theme press pulls it back.

## How the inspector drives the frame

Controls start from the item's `defaults`, with `meta.demo.props` layered on top when the component declares a demo, so a freshly selected component starts looking finished rather than plain. A control's type decides its input: `number` (a slider and a number field), `string`, `textarea` (the same, with `rows` lines), `boolean`, `select`, `color`, `numbers` (a comma-separated list), and `json`. The `json` control is a textarea that sends a value only once it parses and its kind, array, object, or a plain value, matches the prop's own default; otherwise the field is marked `aria-invalid` and shows a short error, and the frame keeps its last value.

Every change posts `{ type: "pica:props", props }` to the iframe, where `props` holds the values that differ from the plain defaults, demo state included, and the same message goes out once when the iframe loads. A prop that returns to that state is sent once more with its value there, because the frame keeps the last value it was given. The generated page listens for exactly this message from its parent window. The changed count and the reset button in the Controls section track only the user's own edits, so an untouched, demo-dressed component reads as nothing changed.

The copy buttons bake the same values in. The React tab's usage line carries them as attributes, followed by the demo's children, when the component has them, converted to JSX (`class` to `className`, `for` to `htmlFor`, void elements self-closed). The HTML tab inserts `<script>window.PICA_PROPS = {...};</script>` before the file's first script, which is where the file reads it at mount.

## Palette

Every component's inspector gets a Palette section, one color input per token in `meta.palette`, which defaults to `["fg"]`. Each token has a reset button that clears it back to following the page. Palette state is sent inside the same `pica:props` message as the props, under a `palette` key that always carries all four tokens (`fg`, `bg`, `accent`, `muted`), an empty string for a token the user has not set. The generated page turns a set token into a `--pica-*` custom property on the host and removes it for an empty one, so clearing a token in the inspector takes effect immediately. A token the user sets also appears in the copy snippets, as `palette={{ fg: "#…" }}` in the React tab and inside the same baked `window.PICA_PROPS` object in the HTML tab.

## Events

A component that declares `events` in its catalog entry reports them as `pica:<name>` DOM events on its host, and the generated page forwards each as `{ type: "pica:event", name, detail }` to its parent window. The Inspector listens for this message and keeps the latest 20, newest first, in an Events section: the event's name, its detail as JSON, and the time it arrived, with a button to clear the log. The section appears as soon as the selected component declares an event, or the moment one actually arrives, whichever comes first, since an undeclared event is still worth seeing. The log starts empty each time the selection changes, since it belongs to whichever frame is live.

## Theme

The chrome follows a two state control under the wordmark. `src/lib/theme.ts` holds the whole rule, and `markTheme` is serialized into an inline script that runs first in the `<head>`, so the first paint is already themed and nothing flashes. It reads `picagram-theme` from local storage, falls back to `prefers-color-scheme`, and sets `data-theme` on the document element, which is the only thing the stylesheet keys on.

React never renders that attribute. The page carries `suppressHydrationWarning`, the theme state starts null so no first client render can disagree with the served HTML, and a layout effect settles it after hydration, which also restores the attribute after a development remount. The canvas surface stays hidden until its first fit, so a light page never requests a dark thumbnail. Choosing a theme writes the choice, sets the attribute, and sets the canvas ground to match.

## Facets

The filter offers twelve fixed facets from `FACETS` in `lib/meta.ts`, never a growing list of tags. Every component declares which apply, `test/meta.test.ts` decides the ones a machine can decide, and `scripts/catalog.ts` carries them into `catalog.json`. Active facets narrow the list together, and the counts are taken over the whole catalog so the chips never reflow while someone types. Tags did not go away: `matches` in `src/lib/catalog.ts` searches titles, slugs, descriptions, categories, tags, and facets alike, and the inspector lists every tag as a button that fills the search box.

## Files it reads

`public/catalog.json` is imported at build time. Its item type is `CatalogItem` in `src/lib/catalog.ts`: `Meta` from `lib/meta.ts` plus `exportName`, `defaults`, `docs`, `types`, `events`, and `gzipBytes`. `/react/<slug>.tsx` and `/v/<slug>.html` are fetched when their tabs open and remembered. The install line uses `REGISTRY_BASE` from `scripts/config.ts`, and the footer's license label is checked by `test/license.test.ts`.

`scripts/check-site.ts` (`npm run check:site`) builds the static site, serves `out/` on a local port under `BASE_PATH`, the way GitHub Pages serves it, and drives headless Chromium through it: every catalog item listed, a frame that loads, every control type, the palette, an invalid json control, the copy snippets, and the events panel, once from a fixture and once from select. No single real component has every control type, so the script sets `PICA_FIXTURE=1`, which adds one synthetic item with every control type and a declared event. A normal build never carries it. It drives the shell too: the theme before hydration and across a reload, the ground following a theme press and then diverging from it, the twelve facets, a tag search, the wordmark's size and alignment, the inspector closing and reopening with focus, the keyboard path, 390 by 844, the footer's copyright, and that every request the page makes stays on the site.

## Hosting and paths

GitHub Pages serves the site at https://picagram.dev. `.github/workflows/pages.yml` runs on every pull request and every push to `main`, on macOS so the captures use a Mac's fonts. The browser gate runs first, split across eight runners: each `verify` shard checks its own slice with `npm run verify -- --quick --shard <n>/8` and uploads the thumbnails it captured, since `public/thumbs/` is not committed. The `build` job then runs the rest of the gate, collects every shard's thumbnails, and does `check:site` and a clean `next build` into `out/`. It runs even when a shard fails, so the required check goes red rather than sitting unresolved. On a pull request that `build` job is the check branch protection requires; on `main` the workflow also publishes `out/`.

The gate is sharded because it is the whole cost of the workflow: eighty components in one process took 12.3 of the build's 14 minutes, and a component is about nine seconds of browser time, almost all of it opening pages rather than computing. Sharding is what keeps that flat as the catalog grows.

`main` is protected. Every change is a pull request, merged squashed only after `build` passes and only from a branch that is up to date with `main`. Nobody pushes to `main` directly, admins included, and force pushes and deletions are off.

`SITE_URL` in `scripts/config.ts` says where the site lives, and `BASE_PATH` follows from it: empty at the domain's root, or a path such as `/picagram` when Pages serves the site from the repository's path. A production build uses `BASE_PATH` as Next's `basePath`, so `check:site` tests what Pages serves, and `next dev` stays at the root. The page links to its own files with relative paths (`thumbs/`, `v/`, `react/`, `c/`, `llms.txt`), so they resolve under any base path. Link previews, `llms.txt`, and the shadcn install lines need full URLs, so those come from `SITE_URL`. `test/site.test.ts` checks both.

The domain's DNS, at the registrar, holds GitHub Pages' four A and four AAAA records, and `www` is a CNAME to `rishabbalak.github.io`. The domain is set in the repository's Pages settings, which is all a workflow deploy needs; it ignores a `CNAME` file. A .dev domain only loads over HTTPS, and GitHub issues its certificate. Moving the site to another address means changing `SITE_URL`, the Pages setting, and the DNS, then running `npm run build:registry`, since `llms.txt` and the install lines change.

## Brand

The name is Picagram (see `docs/decisions/0008-public-name.md`), and the wordmark is "Picagram" set in Jacquarda Bastarda 9, a pixel blackletter on Google Fonts. The site never loads the font. `src/lib/logo.ts` holds the wordmark as one SVG path, traced from the font on its own pixel grid; the same trace of "Pica" matched Rish's original logo cell for cell. `src/components/Logo.tsx` draws it in the text color at 26 px, two screen pixels per pixel of the mark. The favicon, `public/icon.svg`, is Rish's shield with the wordmark's P: black on light browser chrome, and white with a black edge on dark, switched by `prefers-color-scheme` inside the file. `npm run brand` renders the rest from these: the link preview, `public/og.png`; the README's wordmark, `public/wordmark.svg`; and PNG copies of the favicon, `public/favicon-32.png` and `public/apple-touch-icon.png`, for browsers that skip SVG icons. Run it again when the wordmark, the tagline, or the favicon changes.

## Rules the stylesheet keeps

Two grounds and six chrome tokens in `src/app/globals.css`. `--ink` and `--paper` stay what a component is captured on, and `--bg`, `--fg`, `--muted`, `--muted-2`, `--line`, and `--accent` dress the page, with a value per theme. One monospace stack with no web font, zero radius, no shadows, no gradients, and hairlines in `--line`. Every text tone clears 4.5:1 on its own ground in both themes and the focus ring clears 3:1, which `test/site.test.ts` checks by parsing this file: on paper the accent darkens to `#975c00`, because amber measures 1.96:1 there, and `--muted-2` colors no text in either theme. `prefers-reduced-motion` comes first in the file and turns off the page's one transition, the canvas easing into a zoom.
