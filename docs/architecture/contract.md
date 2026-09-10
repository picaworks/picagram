# The component contract

What every component is made of, what its core must do, and what it may use. `docs/adding-a-component.md` covers the steps. This file covers the shape.

## Files

```
registry/<category>/<slug>/
  core.ts     framework-free logic: <Name>Props, optionally <Name>Events, defaults, mount
  index.tsx   the React wrapper, about ten lines
  meta.ts     catalog metadata: title, description, controls, credits, and how verify treats it
```

The categories are the directories under `registry/`, listed in `CATEGORIES` in `lib/meta.ts`:
- the ASCII-first categories: `ascii`, `text-mode`, `dither`, `effects`, and `patterns`;
- the newer ones: `shaders`, `motion`, `data`, `ui`, `sections`, and `immersive`.

The slug matches the directory name, and the category matches the parent directory.

## core.ts

- **Props interface.** Export `interface <Name>Props`, with a JSDoc line on every field and each field's type on one line. The build prints these as the props table.
- **Props are JSON values:** strings, numbers, booleans, null, arrays, and objects.
  - A core never writes into a prop, because React passes the parent's own objects.
  - Compare arrays and objects with `sameJson` or `changed` from `lib/json.ts`, because React sends fresh ones on every render.
- **Defaults.** Export `const defaults: <Name>Props`. Every default must already look finished (STYLE.md, principle 8).
- **Mount.** Export `const mount: Mount<<Name>Props> = (host, initial = {}) => { ... return { update, destroy }; }`.
- **Motion.** An animated component's props extend `MotionProps` (`paused`, `time`, `seed`), and every frame goes through `createLoop`.
- **Events.** A component that reports input exports `interface <Name>Events`, which maps each event name to its detail's type. It emits through `emitter` from `lib/events.ts`.
- **Imports** come from `lib/` only, by relative path, one import statement per line. Section cores may also import other cores (see Composition).
- **No DOM at import time.** The build imports every core in Node to read its defaults.

### mount(host, initial)

1. **Merge props:** `let props = { ...defaults, ...initial }`.
2. **Set the host's accessibility state:**
   - A decorative component that wraps nothing hides its host: `labelHost(host, "")`.
   - A component that names itself sets a role and a label from a prop such as `alt` or `label`, and hides itself when that prop is empty.
   - Text whose glyphs animate uses `animatedText` from `lib/a11y.ts`. The host keeps no role, a hidden copy carries the final text, and the animation draws into a layer hidden from assistive technology.
   - A component that wraps content never hides its host, and never gives it a role that hides its children (`img`, `presentation`, `none`). Its drawn layers are hidden instead.
3. **Create what it draws into.** That is a grid (`createGrid`), a canvas (`createCanvas`), a layer (`layer`), a scoped stylesheet (`scope`), a shader (`createShader`), or elements it builds itself. Every node a core adds carries `data-pica`.
4. **Draw the first frame,** then set `host.dataset.picaReady = "true"`. Verify waits for this attribute, so set it only once a complete frame is on screen.

### The host and its children

- A core may change the host's attributes and inline styles, through `styleHost` and `hostAttributes` from `lib/host.ts`, and it restores each one on destroy.
- A core never writes to, moves, or removes a node it did not create. The host's children belong to the page, or to React.
- **The one exception** is `meta.wraps: "panels"`.
  - Such a component may set `role`, `id`, `aria-labelledby`, and `hidden` on the host's direct children.
  - It restores those attributes on destroy, and reapplies them when React replaces a child.
- A scoped stylesheet selects by the `data-pica-id` attribute that `scope` sets. It never selects by class, because React resets `class` whenever `className` changes.

### update(partial)

Merge the new props, then do the least work that shows the change.
- Rebuild what depends on layout, such as a grid or a shader's resolution, only when it changed; otherwise redraw.
- Pass `paused`, `time`, and `fps` changes to the loop.
- Call `refresh()` on a palette handle.

### destroy()

- Leave the host exactly as mount found it:
  - stop the loop;
  - remove every listener and node the core added;
  - restore every attribute and style it set;
  - delete `data-pica-ready`.
- Calling it twice must be harmless, because React's strict mode mounts twice.
- Verify compares the host's `outerHTML` before mount and after destroy.

## Events and controlled state

- **Naming.** An event is a CustomEvent on the host, named `pica:` plus its name in lower case. It does not bubble, so a composed child's events never reach its parent's listeners.
  - `valueChange` is `pica:valuechange` in the DOM.
  - In React it is the `onValueChange` prop.
- **When to emit.** A core emits only in response to input, never from mount or update, so echoing a value back cannot loop.
- **Controlled props.** A controllable prop is `value: T | null`.
  - Null, the default, means uncontrolled.
  - A `default<Prop>` sibling is read once, at mount.
  - When uncontrolled, the core applies input itself. When controlled, it shows only what `update` sends.
  - `meta.controlled` maps each controlled prop to its event.

## Palette

Components draw with four tokens, which only `lib/palette.ts` reads.

| Token | Default | In a style | On a canvas |
|---|---|---|---|
| fg | the inherited text color | `cssVar("fg")` | `watchPalette(host, redraw).colors.fg` |
| bg | transparent | `cssVar("bg")` | `.colors.bg` |
| accent | amber `#e8a020` | `cssVar("accent")` | `.colors.accent` |
| muted | fg at 65% | `cssVar("muted")` | `.colors.muted` |

- `cssOn(token)` gives black or white text that stays readable on a token's color.
- `meta.palette` lists the tokens the default look draws with. Verify checks that each one changes the picture.
- The `palette` prop on a wrapper, or in `window.PICA_PROPS`, sets these properties on one host.
- No color literal belongs in `registry/`.

## Shaders

- **API.** `createShader(host, { fragment, fallback, uniforms, maxDpr, css, onInvalidate })` from `lib/gl.ts`.
- **Fragment.** GLSL ES 3.00 that follows the prelude, declared in `lib/gl.ts`. It writes `pica_color` with straight alpha.
- **Snippets.** `lib/glsl.ts` adds `NOISE` (gradient noise and `pica_fbm`) and `DITHER` (`pica_bayer8`).
- **Frames.** The core owns the loop: its frame calls `shader.draw(t)`, and `onInvalidate` calls `loop.redraw()`.
- **Fallback.** Provide a CSS background built from `cssVar`. It shows when WebGL2 is missing, and `shader.ok` is false then.
- **Resolution.** For a crisp low-resolution look, pass `maxDpr` below 1 with `css: "image-rendering:pixelated"`.

## Composition

- **Who.** Only cores in `registry/sections/` may import other components' cores, one level deep.
- **Import form.** `import * as asciiImage from "../../ascii/ascii-image/core";`, the slug in camelCase.
- **Using a child.**
  - A section mounts each child into a `data-pica` sub-host that it creates.
  - It forwards changes when `sameJson` says they differ.
  - It destroys each child in its own destroy.
- **Palette.** It reaches children through the cascade, with no plumbing.
- **Timing.** A section composes only components that existed before its wave started.

## The shared runtime

| Module | Use it for |
|---|---|
| `lib/glyph-grid.ts` | A monospace cell grid with `set`, `write`, `clear`, and `flush`. `cellWidth` and `cellHeight` map pointers and layout onto cells, and `measureCell` measures without a grid. |
| `lib/font.ts` | `GRID_FONT`, the default monospace stack. |
| `lib/ramp.ts` | `measureRamp` and `pick` for tone from measured ink; `measureShapes` and `matchShape` for sub-cell shape. |
| `lib/blocks.ts` | Braille (`brailleDot`, `braille`) and block glyphs (`quadrant`, `lowerEighth`, `leftEighth`, `shade`). |
| `lib/loop.ts` | `createLoop`, the only frame scheduler. `frame(t, reduced)`; `update({ paused, time, fps, still })`; `loop.reduced`. |
| `lib/sample.ts` | `createSampler` turns an image, video, or canvas into ink per cell. `fitRect` fits one box into another. The sampler reuses its buffer. |
| `lib/source.ts` | `loadSource`, `fitFor`, and `fitHostAspect` for images, and `showNote` for the one failure note. |
| `lib/subject.ts` | `litSphere`, the built-in subject; `textSubject` and `sizedFont` rasterize text for sampling. |
| `lib/dither.ts` | `threshold`, `bayerAt`, `bayerMatrix`, and `diffuse`. Ink goes where the value reaches `level + bayer - 0.5`. |
| `lib/canvas.ts` | `createCanvas`: a covering canvas that follows the host's size and restores the host on destroy. |
| `lib/gl.ts` and `lib/glsl.ts` | WebGL2 shaders, as above. |
| `lib/chart.ts` | `linearScale`, `bandScale`, `niceTicks`, `extent`, and `formatNumber`; the SVG paths `linePath`, `areaPath`, and `arcPath`; `svg` to make elements; `dataTable` for the hidden table a chart reads from. |
| `lib/host.ts` | `styleHost`, `hostAttributes`, `layer`, `scope`, and `nextId`. |
| `lib/palette.ts` | `cssVar`, `cssOn`, `readPalette`, and `watchPalette`. |
| `lib/events.ts` | `emitter`, and `eventType` for the DOM name. |
| `lib/json.ts` | `sameJson` and `changed`. |
| `lib/a11y.ts` | `labelHost`, `unlabelHost`, `hiddenText`, and `animatedText`. |
| `lib/color.ts` | `parseColor`, `relativeLuminance`, `hostTone`, and `inkColor`. |
| `lib/noise.ts` and `lib/rng.ts` | `createNoise(seed)`, `createRng(seed)`, and `hashSeed(seed, a, b)` for independent streams. Never `Math.random`. |
| `lib/use-pica.ts` | The React hook, `Handlers`, `WrapperProps`, and `paletteStyle`. |

Every name a `lib/` module declares at top level becomes a top-level name in each single React file. A module's private helpers therefore get distinctive names, and the generator stops when two modules would declare the same one.

## index.tsx

```tsx
"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type <Name>Props } from "./core";

export type <Name>ComponentProps = Partial<<Name>Props> & WrapperProps;

/** One sentence: what it is. */
export function <Name>({ className, style, palette, ...props }: <Name>ComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

Variations:
- **Events.** A component with events adds `& Handlers<<Name>Events>` to its props type.
- **Children.** A component that wraps children adds `& { children?: ReactNode }` and renders `{children}` inside the host.
- **Inline.** An inline text run (`meta.stage: "inline"`) renders a `span` with `display: inline-block`.
- **Another element.** A component with `meta.host` renders that element and passes its type to `usePica`. `registry/ui/button/index.tsx` shows the pattern.

## meta.ts

The fields are typed in `lib/meta.ts`.

| Field | Meaning |
|---|---|
| `controls` | How the inspector edits each prop: `number`, `string`, `textarea`, `boolean`, `select`, `color`, `numbers`, or `json`. Leave out props that make no sense to edit. |
| `palette` | Tokens the default look draws with. Defaults to fg. Use `[]` for a component no palette color changes. |
| `wraps` | `"content"` when the component decorates children, and `"panels"` when each direct child is a panel. |
| `host` | The host element, when it is not a div: `span`, `button`, or `dialog`. |
| `controlled` | Each controlled prop, mapped to its event. |
| `interactions` | Lists of steps (`press`, `click`, `expectFocus`, `expectEvent`, `expectAttr`) that verify runs in both shapes. |
| `stage` | `"inline"` centers and enlarges a text run on the demo page. |
| `capture` | The animation time for captures, when 1200 ms is not representative. |
| `demo` | Props and child markup for captures and the catalog. It is never the defaults. Child markup uses tags, `class`, and plain attributes only, with no inline styles. |

## Motion

- The default fps is 30 or less.
- `still` is the frame shown under reduced motion. Choose one that reads well.
- The same `seed` and `time` always give the same pixels. The parity check depends on it.
- Captures use `{ time: 1200, seed: 1 }` (`CAPTURE_MOTION`), or `meta.capture` in place of the time.
