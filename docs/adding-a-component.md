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
| Chart | builds SVG with `lib/chart.ts` and carries a hidden data table, with a glyph look beside the SVG one | `registry/data/bar-chart/` |
| Shader | draws with `createShader` on WebGL2, for gradients and fields a canvas cannot keep up with | `registry/shaders/mesh-gradient/` |
| Immersive | draws a world on a canvas: a globe, a map, a horizon, or a field seen in perspective | `registry/immersive/globe/` |
| Section | composes other components' cores into a page section | `registry/sections/hero/` |

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
3. **Components built from a captured reference** follow four more steps:
   1. A research agent may shortlist candidates by their metadata alone, in `sources/shortlists/wave-<N>.md`: the title, the author, the shot URL, and one line of direction. It never saves, downloads, or links an image. See `docs/decisions/0009-metadata-shortlists.md`.
   2. Rish picks at most one candidate per component and captures a screenshot or screen recording into `sources/inbox/`. That folder is never committed. A line in `sources/inbox/inbox.md` says what he likes about it and what to change.
   3. A spec agent reads only that capture and that note, then writes `specs/<slug>.md` from this template, with these headings in this order:

      | Heading | What it holds |
      |---|---|
      | Status | `draft`, then `approved <date>` once Rish says so |
      | Look | the composition in prose. Colors are named by role: ground, ink, accent, muted |
      | Layout at 1280 | where everything sits on a wide screen |
      | Layout at 390 | the same on a phone, which the writer proposes, since a capture rarely shows it |
      | Motion | what moves, how slowly, and what holds still |
      | Parts | each piece described generically, such as "a slowly turning dotted globe" |
      | Content and actions | what the page supplies, and what the calls to action do |
      | Parameters | each prop, with a range and a default |
      | How Picagram's version differs | the departures, and why |
      | Credit | one line, reading `Inspired by "<title>" by <author>, <url>` |

      It contains no code, no code blocks, no color literals, and no images, and the Credit line holds its only link.
   4. A build agent reads only the spec, `STYLE.md`, and this contract, alongside Picagram's own `lib/` and any core it composes. Neither agent opens the original's page, repository, or registry entry, and the builder never opens the capture, the shortlist, or the credit URL. `meta.spec` names the spec file, and `meta.credits` holds an `inspired-by` credit naming the original author.

## Credits

| Relation | Meaning |
|---|---|
| `port-of` | Code or data was carried over, such as a public domain coastline. Its license must permit that, and its notice travels with it. |
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
