# Overview

Four layers. Each depends only on the ones above it.

| Layer | Where | Depends on | Job |
|---|---|---|---|
| Runtime | `lib/` | nothing | the grid, ramps, loop, sampling, palette, events, host ownership, canvases, WebGL2 shaders, chart scales, and seeded randomness |
| Components | `registry/<category>/<slug>/` | `lib/`, plus `react` for wrappers; sections also compose other cores | one core, one wrapper, and one meta per component |
| Build | `scripts/` | the two layers above, esbuild, the shadcn CLI | generates both shapes, the registry, the markdown twins, llms.txt, and the catalog, and verifies them in a browser |
| Site | `src/` | the generated catalog | the static catalog people browse, with a live frame per component |

## From source into someone's project

1. **Read.** `scripts/catalog.ts` finds every component. It reads the meta, the defaults, and the JSDoc and declared type of each prop and event.
2. **Generate.** `scripts/single-file.ts` produces the two shapes.
   - **The React file** concatenates the lib modules the component reaches, then any cores a section composes (each wrapped in its own scope), then the core, then the wrapper, with relative imports removed. It imports only `react`, and the generator stops if two modules would declare the same top-level name.
   - **The vanilla file** is an esbuild IIFE that defines `Pica<Name>`, mounted by a small HTML page. The page applies a palette from the props, and posts the component's events to a parent frame.
3. **Write.** `scripts/build.ts` writes those shapes and everything derived from them (see `outputs.md`), then runs `shadcn build` to produce the registry.
4. **Verify.** `scripts/verify/` renders both shapes in Chromium and checks them against the contract (see `docs/testing/README.md`).
5. **Install.** People copy a file from the catalog or from a markdown twin, run `npx shadcn add <url>`, or point an agent at `/llms.txt`.

## Why one core

A component with two hand-written implementations ships two sets of bugs, and the two drift apart. With one core, both shapes are generated from it and compared in a browser, so drift becomes a failing check instead of a user report. See `docs/decisions/0002-one-core-two-shapes.md`.
