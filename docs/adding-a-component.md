# Adding a component

This is the contract every component meets. `AGENTS.md` carries the rules an agent must not break; this file carries the shape of the work. Read `STYLE.md` and `docs/architecture/contract.md` first.

## Steps

1. **Pick the category and the slug.** Slugs are lowercase and hyphenated.
   - ASCII-first components start with what they render: `ascii-`, `braille-`, `dither-`, `halftone-`.
   - Others are named for what they are: `button`, `bar-chart`, `pricing`.
2. **Write the three files.** Write `core.ts`, `index.tsx`, and `meta.ts` in `registry/<category>/<slug>/`, following the reference for your kind below.
3. **Verify.** Run `npm run verify -- <slug>` until every check passes.
4. **Build and test.** Run `npm run build:registry`, then `npm test`.
5. **Review.** The component waits for review (Keep, Revise, or Cut) before it ships.

## Kinds, in preference order

Pick the first kind that can do the job.

| Kind | What the core does | Reference |
|---|---|---|
| Glyph grid | draws into `createGrid`, for anything cell-based | `registry/ascii/ascii-image/` |
| Text run | writes into one element's text, such as a scramble, a sparkline, or a loader | `registry/ascii/ascii-reveal/` |
| Canvas | owns a canvas from `createCanvas`, for per-pixel effects such as dither and halftone | `registry/dither/dither-image/` |
| CSS | injects a scoped stylesheet and a layer, for grids, hatches, and overlays; needs no loop | `registry/effects/scanlines/` |
| Control | decorates a real element, reports events, and holds children, for buttons, selects, and dialogs | `registry/ui/button/` |
| Chart | builds SVG with `lib/chart.ts` and carries a hidden data table, with a glyph look beside the SVG one | the first wave 3 chart |
| Shader | draws with `createShader` on WebGL2, for gradients and fields a canvas cannot keep up with | `registry/shaders/mesh-gradient/` |
| Section | composes other components' cores into a page section | the first wave 3 section |

Not accepted:
- any dependency;
- filters that blur or glow (see STYLE.md).

## Budget

`BUDGETS` in `scripts/config.ts` sets a budget per category, minified and gzipped, shared runtime included:

| Categories | Budget |
|---|---|
| ASCII-first and motion | 6 KB |
| ui, data, shaders, and immersive | 8 KB |
| sections, which inline what they compose | 16 KB |

The build refuses a component over its budget.

## Clean room

This applies to every component.

1. **Nothing is copied.** No component copies code or markup from any library, repository, or page. That includes:
   - 21st.dev, React Bits, Magic UI, Aceternity, uiverse, and CodePen;
   - shadcn/ui, Radix, and Headless UI;
   - Paper Shaders and Shadertoy;
   - any other component or shader collection.
2. **What each kind works from:**
   - **UI controls** follow the WAI-ARIA Authoring Practices patterns.
   - **Shaders** follow published technique articles and papers.
   - **Charts** follow published methods, such as Heckbert's nice numbers.
   - **Credits** name these as `technique`.
3. **Components built from a captured reference** follow three more steps:
   1. Rish captures a screenshot or screen recording into `sources/inbox/`. That folder is never committed. A line in `sources/inbox/inbox.md` says what he likes about it and what to change.
   2. A spec agent reads only that capture and that note, then writes `specs/<slug>.md`. The spec covers:
      - what the component looks like;
      - how it moves;
      - its parameters and their ranges;
      - how Pica's version differs from the original;
      - the credit line.

      It contains no code and no code blocks.
   3. A build agent reads only the spec, `STYLE.md`, and this contract. Neither agent opens the original's page, repository, or registry entry. `meta.spec` names the spec file, and `meta.credits` holds an `inspired-by` credit naming the original author.

## Credits

| Relation | Meaning |
|---|---|
| `port-of` | Code was carried over. Its license must permit that, and its notice travels with it. |
| `inspired-by` | A look was re-implemented from a reference. No code was seen. |
| `technique` | A published method was followed. |

Original work with nothing to credit sets `original: true` and leaves `credits` empty.

## Shipped components

One entry per component, recording what was verified and when.

### ascii-image

The reference glyph component, ported from rishab.fyi's `AsciiImage`. It adds:
- font-measured ramps and optional shape matching;
- cover and contain fitting;
- tone read from the host.

Its default subject is a locally drawn sphere, always shown whole, so it renders with no network.

### mesh-gradient

The reference shader. Noise fields fold a third field, whose tone is dithered on the GPU between a few steps in the palette's accent and ink. It passes every verify check on SwiftShader, including a lost and restored context and the fallback without WebGL2.

### button

The reference control. It mounts on a real `<button>`, reports `press`, holds its label as children, and draws four looks with a braille spinner while loading. It passes axe-core and its scripted keyboard interaction in both shapes.
