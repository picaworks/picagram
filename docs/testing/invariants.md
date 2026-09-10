# Invariants

Properties that must hold for every input, and where each is checked.
**Add a row when adding a rule; add a check when adding a row.**

## Source

| Invariant | Check |
|---|---|
| No file in `lib/` or `registry/` calls the network | `test/invariants.test.ts` (network); ESLint `no-restricted-globals` |
| No file except `lib/loop.ts` calls `requestAnimationFrame` or `setInterval` | `test/invariants.test.ts` (motion); ESLint `no-restricted-globals` |
| No file in `lib/` or `registry/` calls `Math.random` | `test/invariants.test.ts` (motion); ESLint `no-restricted-properties` |
| `lib/` imports only `lib/`, cores and metas import only `../../../lib/`, and only section cores import other cores, as a namespace named after the slug | `test/invariants.test.ts` (dependencies); ESLint `no-restricted-imports` |
| Wrappers import only `react`, `./core`, and `lib/use-pica` | `test/invariants.test.ts` (dependencies); ESLint `no-restricted-imports` |
| Every import statement fits on one line | `test/invariants.test.ts` (dependencies) |
| Only `lib/events.ts` dispatches an event, only `lib/gl.ts` opens a WebGL2 context, and only `lib/palette.ts` reads a palette custom property | `test/invariants.test.ts` (single owners); ESLint `no-restricted-syntax` |
| No file in `registry/` contains a color literal | `test/invariants.test.ts` (colors); ESLint `no-restricted-syntax` |
| Every component directory has `core.ts`, `index.tsx`, and `meta.ts`. Cores export `mount` and `defaults`. Wrappers export one component and start with `"use client"`. | `test/invariants.test.ts` (component shape) |
| `sources/inbox/` is gitignored, no image or video lives under `registry/` or `specs/`, and specs contain no code blocks | `test/invariants.test.ts` (clean room) |
| A component credited as inspired by a 21st.dev or Dribbble reference names a spec that exists | `test/invariants.test.ts` (clean room) |

## Meta

| Invariant | Check |
|---|---|
| A meta's slug and category match its directories | `test/meta.test.ts` |
| Every control names a prop, and fits the kind of that prop's default | `test/meta.test.ts` |
| Every prop has JSDoc | `test/meta.test.ts` |
| Credits are present, or the component is marked original | `test/meta.test.ts` |
| Animated components accept `paused`, `time`, and `seed` | `test/meta.test.ts` |
| The description is one sentence | `test/meta.test.ts` |
| Defaults survive a JSON round trip | `test/meta.test.ts` |
| Palette tokens are real tokens | `test/meta.test.ts` |
| Each controlled prop starts as null, has a `default<Prop>` sibling, and names an event the core declares | `test/meta.test.ts` |
| A wrapper renders `{children}` exactly when `meta.wraps` is set | `test/meta.test.ts` |
| A wrapper extends `Handlers` exactly when its core declares events | `test/meta.test.ts` |
| A wrapper renders the host element that the demo page mounts on | `test/meta.test.ts` |

## Build

| Invariant | Check |
|---|---|
| The license label agrees in `LICENSE.md`, `package.json`, the README, and the site footer | `test/license.test.ts` |
| Every generated copy opens with the license header. In the React file the header follows `"use client"`, so the shadcn CLI keeps it on install. | `test/license.test.ts` |
| Every category has a budget, and every component fits its category's budget, minified and gzipped | `test/budget.test.ts`; `scripts/build.ts` |
| Every committed generated file equals a fresh build | `test/generated.test.ts` |
| Every generated React file typechecks with only `react` installed and `erasableSyntaxOnly` on | `test/generated.test.ts` |
| No single React file declares a top-level name twice | `scripts/single-file.ts` (checkCollisions) |
| A composed core is scoped in its section's React file, which still typechecks alone | `test/compose.test.ts` |

## Browser

| Invariant | Check |
|---|---|
| React and vanilla captures match within `PARITY_TOLERANCE`: at both viewports on the dark ground, at 1280 on the light ground, and with a palette | `scripts/verify/render.ts`, `colors.ts` |
| An animated component shows no change for 700 ms under reduced motion | `scripts/verify/motion.ts` |
| Otherwise an animated component changes in at least one of six samples taken across 3 s, and runs no task over 50 ms | `scripts/verify/motion.ts` |
| A decorative host that wraps nothing is `aria-hidden` | `scripts/verify/access.ts` |
| A wrapping host is never hidden, and never has a role that hides its children | `scripts/verify/access.ts` |
| Any other host is hidden, or has a role and a label, or carries readable text | `scripts/verify/access.ts` |
| axe-core finds no WCAG 2.1 AA violation, after mount and after each scripted interaction | `scripts/verify/access.ts`, `interact.ts` |
| Probe children inside a wrapping component stay in the accessibility tree, reachable by Tab, on top at their center, and unmutated until destroy | `scripts/verify/access.ts`, `lifecycle.ts` |
| Destroy leaves the host exactly as mount found it, even when called twice | `scripts/verify/lifecycle.ts` |
| Props and defaults come back unchanged, and each data prop mounted empty still renders | `scripts/verify/lifecycle.ts` |
| Each listed palette token changes the picture | `scripts/verify/colors.ts` |
| A palette set before mount, after mount, through the prop, and through page variables gives the same picture | `scripts/verify/colors.ts` |
| Each declared interaction reports the same events in both shapes, and React's `on` props hear every one | `scripts/verify/interact.ts` |
| A controlled prop echoed back ends where the uncontrolled component ends, and a controlled prop never updated stays put | `scripts/verify/interact.ts` |
| Shaders render on SwiftShader, survive a lost context, and fall back without WebGL2 | `scripts/verify/gpu.ts` |
| Image components render a real PNG, and the video component renders a camera | `scripts/verify/fixtures.ts` |
