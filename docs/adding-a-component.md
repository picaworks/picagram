# Adding a component

This is the contract every component meets. `AGENTS.md` carries the rules an agent must not break; this file carries the shape of the work. Read `STYLE.md` and `docs/architecture/contract.md` first.

## Steps

1. Pick the category and the slug. Slugs are lowercase and hyphenated, and they start with what the component renders: `ascii-`, `braille-`, `dither-`, `halftone-`.
2. Write `core.ts`, `index.tsx`, and `meta.ts` in `registry/<category>/<slug>/`, following the shape of `registry/ascii/ascii-image/`.
3. Run `npm run verify -- <slug>` until every check passes.
4. Run `npm run build:registry`, then `npm test`.
5. The component waits for review (Keep, Revise, or Cut) before it ships.

## Kinds, in preference order

1. **Glyph grid.** The core draws into `createGrid`. One grid gets both renderers, resizing, and font-load handling for free. Use it for anything cell-based.
2. **Text run.** The core writes into one element's text: a scramble, a sparkline, a loader. Use it when the component is inline text rather than a field.
3. **Canvas.** The core owns a canvas directly, for effects that work per pixel rather than per cell, such as dither and halftone. It still uses `createLoop` for any motion.
4. **CSS.** The core injects one scoped style element and its markup, for grids, hatches, and scanlines. This is the cheapest kind and needs no loop.

Not accepted:
- WebGL, until a component proves in `npm run verify` that canvas is too slow.
- Any dependency not declared in meta with a reason.
- Filters that blur or glow (see STYLE.md).

## Budget

`BUDGET_BYTES` in `scripts/config.ts`, minified and gzipped, shared runtime included. The build refuses a component over it.

## Clean room

This applies to components built from a captured reference.

1. The reference is a screenshot or screen recording Rish captured into `sources/inbox/`. That folder is never committed. A line in `sources/inbox/inbox.md` says what he likes about it and what to change.
2. A spec agent reads only that capture and that note, then writes `specs/<slug>.md`. The spec covers:
   - what the component looks like;
   - how it moves;
   - its parameters and their ranges;
   - how Pica's version differs from the original;
   - the credit line.

   It contains no code and no code blocks.
3. A build agent reads only the spec, `STYLE.md`, and this contract. Neither agent opens the original's page, repository, or registry entry.
4. `meta.spec` names the spec file, and `meta.credits` holds an `inspired-by` credit naming the original author, with a link back.

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

The reference component, ported from rishab.fyi's `AsciiImage`. It adds font-measured ramps, optional shape matching, cover and contain fitting, and tone read from the host. Its default subject is a locally drawn sphere, so it renders with no network.
