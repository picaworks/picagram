# The component contract

What every component is made of, what its core must do, and what it may use. `docs/adding-a-component.md` covers the steps. This file covers the shape.

## Files

```
registry/<category>/<slug>/
  core.ts     framework-free logic: `interface <Name>Props`, `defaults`, `mount`
  index.tsx   the React wrapper, about ten lines
  meta.ts     catalog metadata: title, description, inspector controls, credits
```

Categories are `ascii`, `text-mode`, `dither`, `effects`, and `patterns`. The slug matches the directory name, and the category matches the parent directory.

## core.ts

- Export `interface <Name>Props` with a JSDoc line on every field. The build turns those lines into the props table on the component's page, so write them for a reader.
- Export `const defaults: <Name>Props`. Every default must already look finished (STYLE.md, principle 8).
- Export `const mount: Mount<<Name>Props> = (host, initial = {}) => { ... return { update, destroy }; }`.
- An animated component's props extend `MotionProps` from `lib/types.ts` (`paused`, `time`, `seed`), and every frame goes through `createLoop` from `lib/loop.ts`.
- Imports come from `lib/` only, by relative path, one import statement per line.
- Nothing touches the DOM at import time. The build imports every core in Node to read its defaults.
- Props are plain data. A prop that holds a list is an array of numbers.

### mount(host, initial)

1. Merge props: `let props = { ...defaults, ...initial }`.
2. Set the host's accessibility attributes. A decorative component sets `aria-hidden="true"`. Any other component sets `role` and `aria-label` from a prop such as `alt` or `label`, and falls back to `aria-hidden` when that prop is empty.
3. Create what it draws into inside the host, usually with `createGrid`. Do not restyle the host beyond what the grid does (`position: relative` when static, `overflow: hidden`), and never set the host's color.
4. Draw the first frame, then set `host.dataset.picaReady = "true"`. Verify waits for this attribute, so set it only once a complete frame is on screen, for example after an image loads.

### update(partial)

Merge, then do the least work that shows the change. Rebuild the grid only when the font, size, line height, or column count changed; otherwise redraw. Pass `paused`, `time`, and `fps` changes to the loop.

### destroy()

Stop the loop, destroy the grid, remove every listener and element the core added, undo any host style it set, and delete `data-pica-ready`. It must be safe to call twice, because React strict mode mounts twice.

## The shared runtime

| Module | Use it for |
|---|---|
| `lib/glyph-grid.ts` | A monospace cell grid inside the host, with `set`, `write`, `clear`, and `flush`. `renderer: "auto"` paints text rows up to 12,000 cells and a canvas above that. `columns` fits a column count; otherwise `fontSize` sets the cell size. `onLayout` runs after resizes and font loads, and the caller draws again there. |
| `lib/ramp.ts` | `measureRamp(glyphs, fontFamily, lineHeight)` orders glyphs by measured ink, and `pick(ramp, v)` returns the glyph nearest to ink `v` in 0 to 1. `measureShapes` and `matchShape` match sub-cell shape as well. |
| `lib/loop.ts` | `createLoop({ el, fps, paused, time, still, frame })`. It animates only while on screen, in a visible tab, with motion allowed, not paused, and with no fixed `time`. Otherwise it shows one held frame: `time` when set, `still` under reduced motion. |
| `lib/sample.ts` | `createSampler().sample(source, width, height, host, options)` turns an image, a video frame, or a canvas into ink per cell, with cover or contain fitting, contrast, tone, and mirroring. |
| `lib/color.ts` | `hostTone(host)` tells whether the host shows light glyphs on dark or the reverse. Also `inkColor`, `parseColor`, and `relativeLuminance`. |
| `lib/subject.ts` | `litSphere(size, lightX, lightY)`: the built-in subject for image components with no source. Moving the light animates it. |
| `lib/dither.ts` | `bayerMatrix(2 \| 4 \| 8)` for ordered dithering, and `diffuse(values, width, height, "floyd-steinberg" \| "atkinson")` for error diffusion. |
| `lib/a11y.ts` | `labelHost(host, label, role)` and `unlabelHost(host)` for the host's attributes. `hiddenText(text)` gives assistive technology the final text when the visible text animates. |
| `lib/noise.ts` | `createNoise(seed)`: seeded 2D and 3D simplex noise in [-1, 1]. |
| `lib/rng.ts` | `createRng(seed)`: seeded random numbers in [0, 1). Never `Math.random`. |
| `lib/use-pica.ts` | The React hook every wrapper uses. |

## index.tsx

```tsx
"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type <Name>Props } from "./core";

export interface <Name>ComponentProps extends Partial<<Name>Props> {
  className?: string;
  style?: CSSProperties;
}

/** One sentence: what it is. */
export function <Name>({ className, style, ...props }: <Name>ComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
```

An inline component (a text run such as a sparkline) renders a `span` with `display: inline-block` instead of a full-size `div`.

## meta.ts

The fields are typed in `lib/meta.ts`. Controls are keyed by prop name and describe how the catalog's inspector edits a prop: `number` with `min`, `max`, and `step`; `string`; `boolean`; `select` with `options`; `color`; or `numbers` for arrays. Leave out a prop that makes no sense to edit, such as `time`.

## Motion

- The default fps is 30 or less.
- `still` is the frame shown under reduced motion. Choose one that reads well, not time zero if time zero is empty.
- The same `seed` and `time` must always give the same pixels. The parity check depends on it.
- Captures use `{ time: 1200, seed: 1 }` (`CAPTURE_MOTION` in `scripts/config.ts`), so the frame at 1200 ms is the one reviewers see first.
