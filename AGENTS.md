# Pica agent guide

This file is a router. It carries the rules that must never be broken and points to everything else. `CLAUDE.md` imports it; other agents read it directly. Read the two tables below before touching code, then follow the links for the area you are working in.

## What Pica is

A library of ASCII, text-mode, dither, and pattern components. Each component is written once, as a framework-free core plus a thin React wrapper. It ships in two generated shapes: a React file that imports only `react`, and an HTML file that needs nothing. A static catalog site serves them to people. Generated files (`/llms.txt`, a markdown twin per component, a shadcn registry) serve them to coding agents.

It is not a design system, not a shader library, and not a mirror of any other catalog.

Status: v0. Wave 1, the ASCII technique components, is in progress. Open work is listed in `docs/plans/`.

## Hard constraints

| Constraint | Enforced by |
|---|---|
| No component copies code from a reference. A component built from a captured design reference is re-implemented from a written spec, and the spec contains no code. | `test/invariants.test.ts` ("clean room"); `.gitignore` keeps `sources/inbox/` out of the repo. Details: `docs/decisions/0003-clean-room-soft-clone.md`. |
| Components make no network requests. | ESLint `no-restricted-globals` and `no-restricted-properties` in `eslint.config.js`; `test/invariants.test.ts` ("network"). |
| Cores and `lib/` import nothing outside `lib/`. Wrappers import `react`, `./core`, and `lib/use-pica` only. | ESLint `no-restricted-imports`; `test/invariants.test.ts` ("dependencies"). |
| Only `lib/loop.ts` schedules frames, and all randomness is seeded. | ESLint bans on `requestAnimationFrame`, `setInterval`, and `Math.random`; `test/invariants.test.ts` ("motion"); `npm run verify` checks reduced motion and animation in a browser. |
| Both shapes are generated from one source and must render the same. | `scripts/single-file.ts`; `test/generated.test.ts`; the parity check in `npm run verify`. Details: `docs/decisions/0002-one-core-two-shapes.md`. |
| Every component fits the byte budget, shared runtime included: `BUDGET_BYTES` in `scripts/config.ts`. | `test/budget.test.ts`; `scripts/build.ts` refuses to build a component over it. |
| The license reads the same everywhere, and every generated copy carries it. | `test/license.test.ts`. Details: `docs/decisions/0001-license-mit-commons-clause.md`. |

If a change needs an exception to any row, stop and say so.

## Where to read next

`docs/architecture/` is current; `docs/plans/` is history; `docs/decisions/` says why; `docs/testing/` says what done means.

| You are about to | Read |
|---|---|
| Change any code | `docs/architecture/overview.md`, then `docs/architecture/contract.md` |
| Add or change a component | `docs/adding-a-component.md` and `STYLE.md` |
| Build a component from a captured reference | `docs/decisions/0003-clean-room-soft-clone.md`, then the "Clean room" section of `docs/adding-a-component.md` |
| Touch what the build emits | `docs/architecture/outputs.md` |
| Write or change a test | `docs/testing/README.md` and `docs/testing/invariants.md` |
| Understand why something is the way it is | `docs/decisions/` |
| Plan new work | `docs/plans/README.md`. Write a new dated plan; do not edit old ones. |

## Running checks

```
npm install
npx playwright install chromium   # once, for npm run verify
npm run check                     # lint (eslint and tsc), tests, build
npm run verify -- <slug>          # one component in a real browser
npm run review -- <wave>          # the contact sheet at http://localhost:3200
```

Everything must be green before pushing. A push that turns CI red costs a review cycle.

## Conventions

- TypeScript in strict mode, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. ES modules. Node 22.13 or later.
- Props are plain data: strings, numbers, booleans, null, and arrays of numbers. There are no callbacks, so a JSON key detects any change and the catalog's inspector can set every prop.
- A core sets `data-pica-ready="true"` on its host after its first complete frame, and it owns the host's accessibility attributes.
- Commit messages: an imperative subject under 72 characters, a body that explains why, and one concern per commit.
- No model identifiers in prose: not in a commit subject or body, a code comment, or a document. A `Co-Authored-By` trailer is attribution, not prose, and falls outside this rule.
- Prose in docs and output: plain sentences, no dashes used as punctuation, no marketing language.

## Do not

- Open a reference component's page source, repository, or registry file while re-implementing it. A spec written from screenshots is the only input, because a clean room that has seen the code is not clean.
- Port React Bits or Aceternity Pro components, even with credit. React Bits' Commons Clause forbids ported versions, and Aceternity Pro forbids competing templates.
- Copy an output from fffuel, MagicPattern, or SVGBackgrounds into a pattern. Their licenses forbid redistribution, so generate the pattern instead.
- Use Tailwind classes or `cn()` in a component. A component must paste into a project that has neither.
- Hand-edit `public/r`, `public/v`, `public/c`, `public/llms*.txt`, `public/catalog.json`, `registry.json`, or `CREDITS.md`. Run `npm run build:registry` instead.
- Hand-order a density ramp. Use `measureRamp` from `lib/ramp.ts`.
