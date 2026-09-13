# Picagram agent guide

This file is a router. It carries the rules that must never be broken and points to everything else. `CLAUDE.md` imports it; other agents read it directly. Read the two tables below before touching code, then follow the links for the area you are working in.

## What Picagram is

A library of components, ASCII first. It starts with text-mode, dither, and pattern effects, and adds shaders, charts, controls, and page sections drawn in the same grammar.
- **One source per component.** Each component is written once, as a framework-free core plus a thin React wrapper.
- **Two generated shapes.** A React file that imports only `react`, and an HTML file that needs nothing.
- **Two audiences.** A static catalog site, [picagram.dev](https://picagram.dev), serves the components to people. Generated files (`/llms.txt`, a markdown twin per component, a shadcn registry) serve them to coding agents.

It is not a design system, not a general shader library, and not a mirror of any other catalog. Pica was its codename, and the code keeps the short prefix `pica`: `--pica-*`, the `pica:` events, `data-pica`. See `docs/decisions/0008-public-name.md`.

Status: phase 2.
- The shared runtime now carries JSON data, events, children, a palette, WebGL2 shaders, and composition.
- Waves 1 to 4 have built 70 components. Waves 1 to 3 are in review; wave 4 is two thirds built, with 24 of its 36 shipped and the other 12 already briefed in `sources/wave-4.json`.
- The catalog is live at picagram.dev, deployed from `main`.
- The expansion approved on 2026-09-11 is under way: the catalog shell, then the runtime, then wave 4 with 36 primitives and wave 5 with 10 heroes. See `docs/plans/2026-09-11-catalog-expansion.md`.
- The expansion approved on 2026-09-13 carries it to 174: wave 4's remaining 12, then 30 UI primitives, 12 patterns, 10 motion, 12 ASCII and text mode, 8 particle effects, 10 heroes, and 10 body sections. Component work is farmed to Devin CLI sessions, with a coordinator and a reviewer here. See `docs/plans/2026-09-13-devin-fanout-expansion.md`.

Open work is listed in `docs/plans/`.

## Hard constraints

| Constraint | Enforced by |
|---|---|
| No component copies code from a reference. A component built from a captured design reference is re-implemented from a written spec, and the spec contains no code. Only Rish captures a reference; an agent may shortlist one by its metadata alone. | `test/invariants.test.ts` ("clean room"); `test/sources.test.ts` (shortlists); `.gitignore` keeps `sources/inbox/` out of the repo. Details: `docs/decisions/0003-clean-room-soft-clone.md` and `0009-metadata-shortlists.md`. |
| Components make no network requests. | ESLint `no-restricted-globals` and `no-restricted-properties` in `eslint.config.js`; `test/invariants.test.ts` ("network"). |
| `lib/` imports only `lib/`, and cores import only `lib/`, except that section cores compose other cores through a namespace import. Wrappers import `react`, `./core`, and `lib/use-pica` only. | ESLint `no-restricted-imports`; `test/invariants.test.ts` ("dependencies"); `test/compose.test.ts`. Details: `docs/decisions/0007-composition-and-budgets.md`. |
| Only `lib/loop.ts` schedules frames, and all randomness is seeded. | ESLint bans on `requestAnimationFrame`, `setInterval`, and `Math.random`; `test/invariants.test.ts` ("motion"); `npm run verify` checks reduced motion in a browser, and animation in both shapes. |
| Each job has one owner. Only `lib/events.ts` dispatches events, only `lib/gl.ts` opens WebGL2, and only `lib/palette.ts` reads the palette's custom properties. No component hard-codes a color. | ESLint `no-restricted-syntax`; `test/invariants.test.ts` ("single owners", "colors"); `npm run verify` checks that a shader's own canvas inks and advances on the real WebGL2 path, not its fallback. Details: `docs/decisions/0005-palette.md`, `0006-webgl2-runtime.md`. |
| A core never touches a node it did not create and never hides content it wraps. On destroy, it leaves its host exactly as it found it. | The lifecycle and accessibility checks in `npm run verify`. Details: `docs/decisions/0004-interactive-components.md`. |
| Both shapes are generated from one source and must render and behave the same. | `scripts/single-file.ts`; `test/generated.test.ts`; the parity, palette, and interaction checks in `npm run verify`. Details: `docs/decisions/0002-one-core-two-shapes.md`. |
| A section composes at most three other cores, each from a wave earlier than its own. | `test/compose.test.ts` (sections). Details: `docs/decisions/0007-composition-and-budgets.md`. |
| Every component fits its category's byte budget, shared runtime included: `BUDGETS` in `scripts/config.ts`. | `test/budget.test.ts`; `scripts/build.ts` refuses to build a component over it. |
| The license reads the same everywhere, and every generated copy carries it. | `test/license.test.ts`. Details: `docs/decisions/0001-license-mit-commons-clause.md`. |
| No change reaches `main` except through a pull request whose `build` check passed, and nobody pushes to `main` directly, admins included. | GitHub branch protection on `main`; the `build` job in `.github/workflows/pages.yml`, which runs the whole gate on every pull request. Details: `docs/architecture/site.md`. |

If a change needs an exception to any row, stop and say so.

## Where to read next

`docs/architecture/` is current; `docs/plans/` is history; `docs/decisions/` says why; `docs/testing/` says what done means.

| You are about to | Read |
|---|---|
| Change any code | `docs/architecture/overview.md`, then `docs/architecture/contract.md` |
| Add or change a component | `docs/adding-a-component.md` and `STYLE.md` |
| Build a component from a captured reference | `docs/decisions/0003-clean-room-soft-clone.md`, then the "Clean room" section of `docs/adding-a-component.md` |
| Look for references for a wave | `docs/decisions/0009-metadata-shortlists.md`, then `sources/shortlists/` |
| Build a shader, a control, a chart, or a section | the matching sections of `docs/architecture/contract.md`, then its reference in `docs/adding-a-component.md` |
| Brief a wave of builder agents | `sources/BUILDER.md` |
| Touch what the build emits | `docs/architecture/outputs.md` |
| Change the site, its hosting, or its brand | `docs/architecture/site.md` |
| Write or change a test | `docs/testing/README.md` and `docs/testing/invariants.md` |
| Understand why something is the way it is | `docs/decisions/` |
| Plan new work | `docs/plans/README.md`. Write a new dated plan; do not edit old ones. |

## Running checks

```
npm install
npx playwright install chromium   # once, for npm run verify
npm run check                     # lint (eslint and tsc), tests, build
npm run verify -- <slug>          # one component in a real browser
npm run check:site                # the catalog site, end to end in a real browser
npm run review -- <wave>          # the contact sheet at http://localhost:3200
```

Everything must be green before you open a pull request. Its `build` check runs the same gate on macOS, and a pull request that turns it red cannot merge.

## Conventions

- TypeScript in strict mode, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. ES modules. Node 22.13 or later.
- Props are JSON values. Callbacks never enter a core: a component reports input as events on its host, and React wrappers map those to `on` props. So a JSON key detects any change, and the catalog's inspector can set every prop.
- A core sets `data-pica-ready="true"` on its host after its first complete frame, and it owns the host's accessibility attributes.
- Colors come from the four palette tokens. See `STYLE.md`.
- Every component declares `facets` from the twelve in `lib/meta.ts`, which are the catalog's only filters. Tags stay free text: searchable, listed in the inspector, and never a filter of their own.
- The site runs Next.js 16, whose APIs differ from older versions. Read the matching guide in `node_modules/next/dist/docs/` before changing `src/app/` or `next.config.ts`.
- Commit messages: an imperative subject under 72 characters, a body that explains why, and one concern per commit.
- No model identifiers in prose: not in a commit subject or body, a code comment, or a document. A `Co-Authored-By` trailer is attribution, not prose, and falls outside this rule.
- Prose in docs and output: plain sentences, no dashes used as punctuation, no marketing language.

## Do not

- Open a reference component's page source, repository, or registry file while re-implementing it. A spec written from screenshots is the only input, because a clean room that has seen the code is not clean.
- Save, screenshot, download, or link a reference's image or video, or open its Figma file. A shortlist carries a title, an author, a URL, and one line of direction, and every capture is Rish's own.
- Port React Bits or Aceternity Pro components, even with credit. React Bits' Commons Clause forbids ported versions, and Aceternity Pro forbids competing templates.
- Copy an output from fffuel, MagicPattern, or SVGBackgrounds into a pattern. Their licenses forbid redistribution, so generate the pattern instead.
- Use Tailwind classes or `cn()` in a component. A component must paste into a project that has neither.
- Hand-edit `public/r`, `public/v`, `public/c`, `public/llms*.txt`, `public/catalog.json`, `registry.json`, or `CREDITS.md`. Run `npm run build:registry` instead.
- Hand-order a density ramp. Use `measureRamp` from `lib/ramp.ts`.
- Give a `lib/` module's private helper a generic name such as `mix` or `FALLBACK`. Every `lib/` name becomes a top-level name in each single React file, where it can collide with a component's own, and the build stops when it does.
- Import another component's core outside `registry/sections/`. Composition belongs to sections, one level deep.
