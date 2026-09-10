# Outputs

Everything the build and the verifier write. All of it is generated. `test/generated.test.ts` fails when a committed copy differs from a fresh build.

| File | Written by | Rule | Shape |
|---|---|---|---|
| `public/react/<slug>.tsx` | `scripts/build.ts` | one per component; imports only `react`; the registry item and the site's React tab read it | TSX. A section's file holds each composed core in a scope of its own. |
| `public/v/<slug>.html` | `scripts/build.ts` | one per component; opens from disk with no build step | An HTML page with the IIFE bundle inline. The host is a div, a span for an inline text run, or the element `meta.host` names, holding any demo children. See the vanilla page protocol below. |
| `public/v/<slug>.json` | `scripts/build.ts` | the same content as the HTML file, split | `{ html, css, js }` |
| `public/c/<slug>.md` | `scripts/build.ts` | one per component | Markdown: description, install line, a props table with declared types, events, children, colors, both files inline, credits |
| `public/llms.txt` | `scripts/build.ts` | follows llmstxt.org | H1, a summary, and one link per component, grouped by category |
| `public/llms-full.txt` | `scripts/build.ts` | every markdown twin, concatenated | markdown |
| `public/catalog.json` | `scripts/build.ts` | read by the site | an array of meta, plus defaults, prop docs and types, events, and size |
| `registry.json` | `scripts/build.ts` | shadcn registry schema, pointing at `public/react/` | one `registry:component` item per component |
| `public/r/<slug>.json` and `public/r/registry.json` | `shadcn build` | derived from `registry.json`; not compared by the equality test | shadcn registry items |
| `CREDITS.md` | `scripts/build.ts` | built from each meta's credits | markdown |
| `public/thumbs/<slug>.jpg` and `public/thumbs/<slug>-light.jpg` | `scripts/verify/render.ts` | the 1280 capture on the dark and the light ground; varies by machine, so not compared, and gitignored | JPEG |
| `.pica/` | verify and tests | scratch, gitignored | staged shapes, harness and probe pages, captures, verify results, the standalone typechecks |

## The vanilla page protocol

- **Props in.** Initial props come from `window.PICA_PROPS`. A `palette` inside them becomes `--pica-*` custom properties on the host.
- **Props later.** Changes arrive as `pica:props` messages from the parent frame, and the ground to show as `pica:ground`.
- **Events out.** When the page sits in a frame, each declared event goes to the parent as a `pica:event` message, carrying the event's name and detail.
