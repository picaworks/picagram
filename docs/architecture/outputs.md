# Outputs

Everything the build and the verifier write. All of it is generated. `test/generated.test.ts` fails when a committed copy differs from a fresh build.

| File | Written by | Rule | Shape |
|---|---|---|---|
| `public/react/<slug>.tsx` | `scripts/build.ts` | one per component; imports only `react`; the registry item and the site's React tab read it | TSX |
| `public/v/<slug>.html` | `scripts/build.ts` | one per component; opens from disk with no build step | HTML page with the IIFE bundle inline. Initial props come from `window.PICA_PROPS`; later changes arrive as `pica:props` messages from the parent frame. |
| `public/v/<slug>.json` | `scripts/build.ts` | the same content as the HTML file, split | `{ html, css, js }` |
| `public/c/<slug>.md` | `scripts/build.ts` | one per component | markdown: description, install line, props table, both files inline, credits |
| `public/llms.txt` | `scripts/build.ts` | follows llmstxt.org | H1, a summary, and one link per component, grouped by category |
| `public/llms-full.txt` | `scripts/build.ts` | every markdown twin, concatenated | markdown |
| `public/catalog.json` | `scripts/build.ts` | read by the site | an array of meta plus defaults, prop docs, and size |
| `registry.json` | `scripts/build.ts` | shadcn registry schema, pointing at `public/react/` | one `registry:component` item per component |
| `public/r/<slug>.json` and `public/r/registry.json` | `shadcn build` | derived from `registry.json`; not compared by the equality test | shadcn registry items |
| `CREDITS.md` | `scripts/build.ts` | built from each meta's credits | markdown |
| `public/thumbs/<slug>.jpg` and `public/thumbs/<slug>-light.jpg` | `scripts/verify.ts` | the 1280 capture on the dark and the light ground; varies by machine, so not compared | JPEG |
| `.pica/` | verify and tests | scratch, gitignored | staged shapes, harness pages, captures, verify results, the standalone typecheck |
