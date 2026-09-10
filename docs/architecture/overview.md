# Overview

Four layers. Each depends only on the ones above it.

| Layer | Where | Depends on | Job |
|---|---|---|---|
| Runtime | `lib/` | nothing | the grid, ramps, loop, sampling, color, noise, seeded randomness |
| Components | `registry/<category>/<slug>/` | `lib/`, plus `react` for wrappers | one core, one wrapper, and one meta per component |
| Build | `scripts/` | the two layers above, esbuild, the shadcn CLI | generates both shapes, the registry, the markdown twins, llms.txt, the catalog |
| Site | `src/app/` | the generated catalog | the static catalog people browse |

## From source into someone's project

1. `scripts/catalog.ts` finds every component and reads its meta, its defaults, and the JSDoc on its props.
2. `scripts/single-file.ts` produces the two shapes.
   - The React file concatenates the lib modules the component reaches, then the core, then the wrapper, with relative imports removed. It imports only `react`.
   - The vanilla file is an esbuild IIFE that defines `Pica<Name>`, mounted by a small HTML page.
3. `scripts/build.ts` writes those shapes and everything derived from them (see `outputs.md`), then runs `shadcn build` to produce the registry.
4. `scripts/verify.ts` renders both shapes in Chromium and compares them.
5. People copy a file from the catalog or from a markdown twin, run `npx shadcn add <url>`, or point an agent at `/llms.txt`.

## Why one core

A component with two hand-written implementations ships two sets of bugs, and the two drift apart. With one core, both shapes are generated from it and compared in a browser, so drift becomes a failing check instead of a user report. See `docs/decisions/0002-one-core-two-shapes.md`.
