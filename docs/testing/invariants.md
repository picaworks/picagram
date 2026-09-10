# Invariants

Properties that must hold for every input, and where each is checked.
**Add a row when adding a rule; add a check when adding a row.**

| Invariant | Check |
|---|---|
| No file in `lib/` or `registry/` calls the network | `test/invariants.test.ts` (network); ESLint `no-restricted-globals` |
| No file except `lib/loop.ts` calls `requestAnimationFrame` or `setInterval` | `test/invariants.test.ts` (motion); ESLint `no-restricted-globals` |
| No file in `lib/` or `registry/` calls `Math.random` | `test/invariants.test.ts` (motion); ESLint `no-restricted-properties` |
| Cores and `lib/` import only relative paths into `lib/` | `test/invariants.test.ts` (dependencies); ESLint `no-restricted-imports` |
| Wrappers import only `react`, `./core`, and `lib/use-pica` | `test/invariants.test.ts` (dependencies); ESLint `no-restricted-imports` |
| Every import statement fits on one line | `test/invariants.test.ts` (dependencies) |
| Every component directory has `core.ts`, `index.tsx`, and `meta.ts`. Cores export `mount` and `defaults`. Wrappers export one component and start with `"use client"`. | `test/invariants.test.ts` (component shape) |
| `sources/inbox/` is gitignored, no image or video lives under `registry/` or `specs/`, and specs contain no code blocks | `test/invariants.test.ts` (clean room) |
| A component credited as inspired by a 21st.dev or Dribbble reference names a spec that exists | `test/invariants.test.ts` (clean room) |
| A meta's slug and category match its directories. Every control names a prop, and every prop has JSDoc. Credits are present or the component is marked original. Animated components accept `paused`, `time`, and `seed`. The description is one sentence. | `test/meta.test.ts` |
| The license label agrees in `LICENSE.md`, `package.json`, the README, and the site footer, and every generated copy opens with the license header. In the React file the header follows `"use client"`, so the shadcn CLI keeps it on install. | `test/license.test.ts` |
| Every component is at most `BUDGET_BYTES`, minified and gzipped | `test/budget.test.ts`; `scripts/build.ts` |
| Every committed generated file equals a fresh build | `test/generated.test.ts` |
| Every generated React file typechecks with only `react` installed | `test/generated.test.ts` |
| React and vanilla captures match within `PARITY_TOLERANCE`: at both viewports on the dark ground, and at 1280 on the light ground | `scripts/verify.ts` |
| An animated component shows no change for 700 ms under reduced motion. Otherwise it changes in at least one of six samples taken across 3 s, and runs no task over 50 ms. | `scripts/verify.ts` |
| A decorative host is `aria-hidden`; any other host is hidden or has both a role and a label | `scripts/verify.ts` |
