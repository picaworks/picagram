# The site

`src/app/` is one static page. It reads `public/catalog.json` and the generated files next to it, and keeps one piece of state in the URL: the selected slug, as the hash (`#ascii-image`). Nothing else on the page needs a server.

## Panes

| Pane | Files | Job |
|---|---|---|
| Layers | `src/components/Layers.tsx` | search (Cmd+K or Ctrl+K focuses it), tag chips, and the component list grouped by non-empty category |
| Canvas | `src/components/Canvas.tsx`, `src/components/Frame.tsx` | a board with one 1280 by 800 frame per component on a surface that pans (drag, wheel) and zooms (Cmd or Ctrl plus wheel, pinch, and the 50%, 100%, and fit buttons) |
| Inspector | `src/components/Inspector.tsx`, `Controls.tsx`, `CodeTabs.tsx`, `CopyButton.tsx` | title, description, size, tags, controls generated from `controls` and `defaults`, the React, HTML, Install, and LLM tabs, and credits |

`src/components/Catalog.tsx` holds the state and passes it down. Under 900px the panes stack with the canvas first; the DOM order, and so the tab order, stays layers, canvas, inspector.

## What a frame shows

Zoomed out, a frame is `public/thumbs/<slug>.jpg`, or `<slug>-light.jpg` while the ground is paper, or the title in muted text when the capture is missing. Frames that a search or a tag filters out are dimmed, never removed, so the board keeps its shape. The selected frame, and only that one, is a live iframe of `/v/<slug>.html`. An iframe keeps the pointer and wheel events it receives, so while Cmd, Ctrl, or Space is held the live frame stops taking them and a wheel or a drag over it reaches the board. The canvas bar sets its ground (ink, paper, or checker, through `data-ground` on the frame document's `html` element, which the generated page styles itself) and its width (390, 768, or 1280).

## How the inspector drives the frame

Controls start from the item's `defaults`. Every change posts `{ type: "pica:props", props }` to the iframe, where `props` holds the values that differ from the defaults, and the same message goes out once when the iframe loads. A prop that returns to its default is sent once more with the default value, because the frame keeps the last value it was given. The generated page listens for exactly this message from its parent window.

The copy buttons bake the same values in. The React tab's usage line carries them as attributes, and the HTML tab inserts `<script>window.PICA_PROPS = {...};</script>` before the file's first script, which is where the file reads it at mount.

## Files it reads

`public/catalog.json` is imported at build time. Its item type is `CatalogItem` in `src/lib/catalog.ts`: `Meta` from `lib/meta.ts` plus `exportName`, `defaults`, `docs`, and `gzipBytes`. `/react/<slug>.tsx` and `/v/<slug>.html` are fetched when their tabs open and remembered. The install line uses `REGISTRY_BASE` from `scripts/config.ts`, and the footer's license label is checked by `test/license.test.ts`.

## Rules the stylesheet keeps

Six tokens in `src/app/globals.css`, one monospace stack with no web font, zero radius, no shadows, no gradients, and hairlines in `--line`. Every text tone clears 4.5:1 on its ground; `--muted-2` measures 4.47:1 on ink, so it colors no text. `prefers-reduced-motion` comes first in the file and turns off the page's one transition, the canvas easing into a zoom.
