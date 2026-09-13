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
| An `inspired-by` credit and a `meta.spec` each require the other, the spec exists and is approved, and its credit line matches the credit | `test/invariants.test.ts` (clean room) |
| A spec carries the template headings in order, and no code, color literal, image, or link outside its credit line | `test/invariants.test.ts` (clean room) |
| No tracked file is an image or a video, apart from the brand files and the review photographs | `test/invariants.test.ts` (clean room) |
| A shortlist holds only its table, whose links are Dribbble shots, with no media, markup, code fence, or code host | `test/sources.test.ts` (shortlists) |
| Wave briefs are well formed, slugs are unique across waves, and a brief built from a spec adds nothing to it | `test/sources.test.ts` (briefs) |

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
| Facets say what the component is: exactly one of animated and static, and image, webgl, shader, canvas, interactive, chart, and dither follow what the core imports and declares | `test/meta.test.ts` |
| A `pointerMove` step names a fraction from 0 to 1 on each axis, and a component with a controlled prop opens its first interaction with a press or a click | `test/meta.test.ts` |
| From wave 4 on, no `technique` or `inspired-by` credit points at a code host or a component collection | `test/meta.test.ts` |

## Build

| Invariant | Check |
|---|---|
| The license label agrees in `LICENSE.md`, `package.json`, the README, and the site footer | `test/license.test.ts` |
| Every generated copy opens with the license header. In the React file the header follows `"use client"`, so the shadcn CLI keeps it on install. | `test/license.test.ts` |
| Every category has a budget, and every component fits its category's budget, minified and gzipped | `test/budget.test.ts`; `scripts/build.ts` |
| Every committed generated file equals a fresh build, apart from gzip sizes, which vary with the zlib inside each Node release | `test/generated.test.ts` |
| Every generated React file typechecks with only `react` installed and `erasableSyntaxOnly` on | `test/generated.test.ts` |
| No single React file declares a top-level name twice | `scripts/single-file.ts` (checkCollisions) |
| A composed core is scoped in its section's React file, which still typechecks alone | `test/compose.test.ts` |
| A section composes at most three cores, each from a wave earlier than its own, or a reference built before that wave's builders started | `test/compose.test.ts` (sections) |
| The original-work label reads the same in the build, the inspector, and the review sheet | `test/license.test.ts` |
| A committed review file decides every component in its wave, and leaves none to revise | `test/review.test.ts` |
| The coastline encoding round trips, the projections agree with Snyder and with Equal Earth, and the committed land data matches its source and stays under its size ceiling | `test/geo.test.ts` |

## Browser

| Invariant | Check |
|---|---|
| React and vanilla captures match within `PARITY_TOLERANCE`: at both viewports, on both grounds, and with a palette | `scripts/verify/render.ts`, `colors.ts` |
| A component's pages request nothing beyond their own origin, a `data:` URI, or a `blob:` URI | `scripts/verify/index.ts`, `page.ts` |
| A section at 390 has no sideways overflow, keeps its content on top, is never clipped when it flows, keeps the page's own font for prose, and gives focus only to links and buttons | `scripts/verify/section.ts` |
| An animated component shows no change for 700 ms under reduced motion | `scripts/verify/motion.ts` |
| Otherwise an animated component changes within 3 s in both shapes, sampled continuously so a short burst cannot fall between two samples, and runs no task over 50 ms in those 3 s | `scripts/verify/motion.ts` |
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
| A hover step moves the pointer onto the element it names and changes more than 1% of that element's own box, measured against a still picture and against a channel delta rather than a perceptual one, because a 10% tint is invisible to pixelmatch | `scripts/verify/interact.ts` |
| An interaction that drives the pointer runs with the clock unpinned, so a core that tracks the pointer only while it animates still answers, and its hovers go uncompared because the picture moves on its own | `scripts/verify/interact.ts` |
| A controlled prop echoed back ends where the uncontrolled component ends, and a controlled prop never updated stays put | `scripts/verify/interact.ts` |
| Shaders render on SwiftShader, survive a lost context, and fall back without WebGL2 | `scripts/verify/gpu.ts` |
| A shader's own canvas holds a live WebGL2 context showing no CSS fallback, and inks more than 1% of itself with everything painted over it hidden | `scripts/verify/gpu.ts` |
| An animated shader's own canvas advances within 3 s on the real WebGL2 path | `scripts/verify/gpu.ts` |
| Image components render a real PNG, and the video component renders a camera | `scripts/verify/fixtures.ts` |

## Site

| Invariant | Check |
|---|---|
| The site links to its own files with relative paths, so it works under any base path | `test/site.test.ts` |
| `llms.txt` links with absolute URLs on `SITE_URL` | `test/site.test.ts` |
| Every chrome text tone clears 4.5:1 on its own ground in both themes, and the focus ring and the slider track clear 3:1 | `test/site.test.ts` |
| The theme script prefers a saved choice, then the browser's preference, and survives storage that throws | `test/site.test.ts` |
| A production build works end to end under `BASE_PATH`, the way GitHub Pages serves it: every component listed, a live frame, every control type, the palette, the snippets, and events from a fixture and from select | `scripts/check-site.ts` |
| The theme is set before hydration, survives a reload, and sets the canvas ground, which may then diverge | `scripts/check-site.ts` |
| The filter offers exactly the twelve facets, every tag still searches, and an inspector tag fills the search box | `scripts/check-site.ts` |
| The wordmark is 39 px and aligned with the search field, and the footer ends with the build year | `scripts/check-site.ts` |
| The inspector collapses and restores, from the keyboard, with focus moving to the other control, and selection leaves it collapsed | `scripts/check-site.ts` |
| At 390 by 844 the page stacks, nothing overflows sideways, and collapse and restore still work | `scripts/check-site.ts` |
