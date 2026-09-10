# ASCII Solid

> A torus, sphere, or cube rotated in three dimensions and shaded with the measured ramp.

Category: ascii. Tags: 3d, rotation, measured ramp, depth buffer. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 4.1 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/pica/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://raw.githubusercontent.com/rishabbalak/pica/main/public/r/ascii-solid.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `shape` | "torus" \| "sphere" \| "cube" | `"torus"` | Solid to rasterize: a torus, a sphere, or a cube. |
| `speed` | number | `0.6` | Rotation speed. 0 holds the solid at its starting orientation, and 2 tumbles it quickly. |
| `size` | number | `0.8` | Diameter of the solid as a fraction of the host's smaller side. |
| `glyphs` | string | `" .:-=+*#%@"` | Glyphs to shade with, in any order: they are sorted by the ink each one puts down in the font. |
| `fontSize` | number | `12` | Glyph size in CSS pixels. |
| `fontFamily` | string | `"\"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Menlo, monospace"` | CSS font-family stack for the glyphs. Must be monospace. |
| `lineHeight` | number | `1.2` | Line height as a multiple of the glyph size. |
| `fps` | number | `30` | Frames per second ceiling. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · ASCII Solid · ascii-solid
// MIT + Commons Clause · https://github.com/rishabbalak/pica/blob/main/LICENSE.md
// Docs and credits: https://github.com/rishabbalak/pica

// lib/types.ts
/** The contract every Pica core implements. See docs/architecture/contract.md. */

/** A mounted component. */
interface PicaInstance<P> {
  /** Merge new prop values. The core decides what has to be rebuilt. */
  update(props: Partial<P>): void;
  /** Stop all work and remove everything the core added. Safe to call twice. */
  destroy(): void;
}

/** Mounts a core into a host element. Props are plain data: strings, numbers, booleans, null. */
type Mount<P> = (host: HTMLElement, props?: Partial<P>) => PicaInstance<P>;

/** Props every animated core accepts, so captures and reduced motion behave the same everywhere. */
interface MotionProps {
  /** Stop animating and hold the current frame. */
  paused: boolean;
  /** Render exactly this animation time, in milliseconds, and do not animate. Null animates. */
  time: number | null;
  /** Seed for every random choice, so the same seed always draws the same frame. */
  seed: number;
}

// lib/use-pica.ts
/** Mounts a Pica core into the returned ref and forwards prop changes to it.
 *  Props are plain data by contract, so a JSON key is enough to detect a change. */
function usePica<P>(mount: Mount<P>, props: Partial<P>) {
  const ref = useRef<HTMLDivElement>(null);
  const instance = useRef<PicaInstance<P> | null>(null);
  const defined = definedProps(props);
  const latest = useRef(defined);
  latest.current = defined;
  const key = JSON.stringify(defined);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const mounted = mount(host, latest.current);
    instance.current = mounted;
    return () => {
      mounted.destroy();
      instance.current = null;
    };
  }, [mount]);

  useEffect(() => {
    instance.current?.update(latest.current);
  }, [key]);

  return ref;
}

/** Drops undefined values, so an unset prop keeps the core's default. */
function definedProps<P>(props: Partial<P>): Partial<P> {
  const out: Partial<P> = {};
  for (const name in props) {
    const value = props[name];
    if (value !== undefined) out[name] = value;
  }
  return out;
}

// lib/a11y.ts
/** Accessibility attributes a core sets on its host. See docs/architecture/contract.md, mount step 2. */

/** Gives the host a role and a label, or hides it from assistive technology when the label is empty. */
function labelHost(host: HTMLElement, label: string, role = "img"): void {
  if (label) {
    host.setAttribute("role", role);
    host.setAttribute("aria-label", label);
    host.removeAttribute("aria-hidden");
  } else {
    host.removeAttribute("role");
    host.removeAttribute("aria-label");
    host.setAttribute("aria-hidden", "true");
  }
}

/** Removes what labelHost set. */
function unlabelHost(host: HTMLElement): void {
  host.removeAttribute("role");
  host.removeAttribute("aria-label");
  host.removeAttribute("aria-hidden");
}

/** A visually hidden element that carries text for assistive technology, for components whose visible text
 *  animates. Put the animated layer next to it with aria-hidden. */
function hiddenText(text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.textContent = text;
  span.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
  return span;
}

// lib/glyph-grid.ts
/** A monospace cell grid painted as text rows or onto a canvas. See docs/architecture/contract.md. */

interface GridOptions {
  /** CSS font-family stack. Must be monospace. */
  fontFamily: string;
  /** Glyph size in CSS pixels. Ignored when `columns` is above zero. */
  fontSize: number;
  /** Fit exactly this many columns across the host and derive the glyph size from it. 0 uses `fontSize`. */
  columns: number;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
  /** "dom" keeps glyphs as text and is cheapest up to DOM_CELL_LIMIT cells. "canvas" handles more
   *  cells and per-cell color. "auto" picks by cell count. */
  renderer: "dom" | "canvas" | "auto";
  /** Glyph color. Empty uses --pica-fg, and failing that the host's inherited color. */
  color: string;
}

/** Above this many cells, "auto" paints to a canvas instead of text rows. */
const DOM_CELL_LIMIT = 12000;

interface Grid {
  readonly cols: number;
  readonly rows: number;
  /** Cell width over cell height, for sampling images and fields without stretching them. */
  readonly aspect: number;
  /** The CSS font shorthand glyphs are drawn in. */
  readonly font: string;
  /** Writes one glyph into the back buffer. `color` is honored by the canvas renderer only. */
  set(x: number, y: number, glyph: string, color?: string): void;
  /** Writes a string starting at (x, y), clipped to the grid. */
  write(x: number, y: number, text: string, color?: string): void;
  /** Fills the back buffer. */
  clear(glyph?: string): void;
  /** Paints the rows that changed since the last flush. */
  flush(): void;
  update(options: Partial<GridOptions>): void;
  destroy(): void;
}

/** Creates a grid inside `host`. `onLayout` runs whenever the cell count changes (resize, font load),
 *  after which the back buffer is blank and the caller should draw again. */
function createGrid(host: HTMLElement, options: GridOptions, onLayout: () => void): Grid {
  let opts: GridOptions = { ...options };
  let cols = 1;
  let rows = 1;
  let cellW = 7.2;
  let cellH = 14;
  let fontPx = 12;
  let width = -1;
  let height = -1;
  let cells: string[] = [" "];
  let tints: (string | undefined)[] = [undefined];
  let shown: string[] = [];
  let view: HTMLElement | null = null;
  let lines: HTMLElement[] = [];
  let ctx: CanvasRenderingContext2D | null = null;
  let ink = "";
  let alive = true;
  const probe = document.createElement("canvas").getContext("2d");

  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.style.overflow = "hidden";

  const font = (): string => `${fontPx}px ${opts.fontFamily}`;

  /** Recomputes the cell grid from the host's size. Returns true when the grid was rebuilt. */
  function layout(force: boolean): boolean {
    const w = host.clientWidth;
    const h = host.clientHeight;
    let advance = 0.6;
    if (probe) {
      probe.font = `100px ${opts.fontFamily}`;
      advance = probe.measureText("M").width / 100 || 0.6;
    }
    const px = opts.columns > 0 ? Math.max(1, w) / (opts.columns * advance) : opts.fontSize;
    const nextCellH = Math.max(1, Math.round(px * opts.lineHeight));
    const nextCols = Math.max(1, opts.columns > 0 ? opts.columns : Math.floor(w / (px * advance)));
    const nextRows = Math.max(1, Math.floor(h / nextCellH));
    if (!force && w === width && h === height && nextCols === cols && nextRows === rows) return false;
    width = w;
    height = h;
    fontPx = px;
    cellW = px * advance;
    cellH = nextCellH;
    cols = nextCols;
    rows = nextRows;
    cells = new Array<string>(cols * rows).fill(" ");
    tints = new Array<string | undefined>(cols * rows).fill(undefined);
    mountView();
    return true;
  }

  function mountView(): void {
    view?.remove();
    lines = [];
    ctx = null;
    const color = opts.color || "var(--pica-fg)";
    const mode = opts.renderer === "auto" ? (cols * rows > DOM_CELL_LIMIT ? "canvas" : "dom") : opts.renderer;
    if (mode === "dom") {
      const pre = document.createElement("pre");
      pre.style.cssText = [
        "position:absolute", "inset:0", "margin:0", "padding:0", "overflow:hidden",
        "white-space:pre", "letter-spacing:0", "user-select:none", "pointer-events:none",
        "font-kerning:none", "font-variant-ligatures:none",
        `font-family:${opts.fontFamily}`, `font-size:${fontPx}px`, `line-height:${cellH}px`, `color:${color}`,
      ].join(";");
      for (let y = 0; y < rows; y++) {
        const line = document.createElement("span");
        line.style.display = "block";
        line.style.height = `${cellH}px`;
        pre.appendChild(line);
        lines.push(line);
      }
      view = pre;
    } else {
      const canvas = document.createElement("canvas");
      canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;color:${color}`;
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.textBaseline = "middle";
        ctx.font = font();
      }
      view = canvas;
    }
    view.setAttribute("aria-hidden", "true");
    shown = new Array<string>(rows).fill("\u0000");
    ink = "";
    host.appendChild(view);
  }

  function paintCanvas(context: CanvasRenderingContext2D, target: HTMLElement): void {
    const color = getComputedStyle(target).color;
    if (color !== ink) {
      ink = color;
      shown.fill("\u0000");
    }
    for (let y = 0; y < rows; y++) {
      const start = y * cols;
      const rowTints = tints.slice(start, start + cols);
      let key = cells.slice(start, start + cols).join("");
      if (rowTints.some((tint) => tint !== undefined)) key += "\u0000" + rowTints.join(",");
      if (key === shown[y]) continue;
      shown[y] = key;
      const top = y * cellH;
      context.clearRect(0, top, width, cellH);
      // One fillText per run of same-colored cells: monospace advances keep every glyph on its cell.
      let x = 0;
      while (x < cols) {
        const tint = rowTints[x] ?? ink;
        let end = x + 1;
        while (end < cols && (rowTints[end] ?? ink) === tint) end++;
        context.fillStyle = tint;
        context.fillText(cells.slice(start + x, start + end).join(""), x * cellW, top + cellH / 2);
        x = end;
      }
    }
  }

  function paintText(): void {
    for (let y = 0; y < rows; y++) {
      const row = cells.slice(y * cols, (y + 1) * cols).join("");
      if (row === shown[y]) continue;
      shown[y] = row;
      const line = lines[y];
      if (line) line.textContent = row;
    }
  }

  function set(x: number, y: number, glyph: string, color?: string): void {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;
    const i = y * cols + x;
    cells[i] = glyph;
    tints[i] = color;
  }

  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => {
        if (alive && layout(false)) onLayout();
      })
    : null;
  resizeObserver?.observe(host);

  const onFonts = (): void => {
    if (alive && layout(true)) onLayout();
  };
  document.fonts.addEventListener("loadingdone", onFonts);

  layout(true);

  return {
    get cols() {
      return cols;
    },
    get rows() {
      return rows;
    },
    get aspect() {
      return cellW / cellH;
    },
    get font() {
      return font();
    },
    set,
    write(x, y, text, color) {
      let i = 0;
      for (const glyph of text) {
        set(x + i, y, glyph, color);
        i++;
      }
    },
    clear(glyph = " ") {
      cells.fill(glyph);
      tints.fill(undefined);
    },
    flush() {
      if (!view) return;
      if (ctx) paintCanvas(ctx, view);
      else paintText();
    },
    update(next) {
      opts = { ...opts, ...next };
      layout(true);
      onLayout();
    },
    destroy() {
      alive = false;
      resizeObserver?.disconnect();
      document.fonts.removeEventListener("loadingdone", onFonts);
      view?.remove();
      view = null;
    },
  };
}

// lib/loop.ts
/** The only place Pica schedules frames. Cores never call requestAnimationFrame themselves.
 *  A loop animates only while its element is on screen, the tab is visible, motion is allowed,
 *  it is not paused, and no fixed time is set. Otherwise it shows a single held frame. */

interface LoopState {
  /** Hold the current frame. */
  paused: boolean;
  /** Show exactly this animation time, in milliseconds, and do not animate. Null animates. */
  time: number | null;
  /** Frames per second ceiling. */
  fps: number;
}

interface LoopOptions extends LoopState {
  /** Element whose visibility on screen gates the loop. */
  el: Element;
  /** Draws the frame for animation time `t`, in milliseconds. */
  frame: (t: number) => void;
  /** The frame shown under prefers-reduced-motion, in milliseconds of animation time. */
  still: number;
}

interface Loop {
  update(state: Partial<LoopState>): void;
  /** Draws the current frame again, for example after a resize. */
  redraw(): void;
  destroy(): void;
}

/** A gap longer than this, such as a tab switch, advances the animation by this much at most. */
const MAX_STEP_MS = 100;

function createLoop(options: LoopOptions): Loop {
  const { el, frame, still } = options;
  let state: LoopState = { paused: options.paused, time: options.time, fps: options.fps };
  let t = 0;
  let last = 0;
  let raf = 0;
  let onScreen = true;
  let tabVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
  const motionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  let reduced = motionQuery?.matches ?? false;

  const animating = (): boolean =>
    !state.paused && state.time === null && !reduced && onScreen && tabVisible;
  const heldTime = (): number => (state.time !== null ? state.time : reduced ? still : t);

  function tick(now: number): void {
    raf = 0;
    if (!animating()) return;
    if (last === 0) last = now;
    const elapsed = now - last;
    // One millisecond of tolerance so a 60 Hz display lands evenly on a 30 fps ceiling.
    if (elapsed >= 1000 / Math.max(1, state.fps) - 1) {
      t += Math.min(elapsed, MAX_STEP_MS);
      last = now;
      frame(t);
    }
    raf = requestAnimationFrame(tick);
  }

  function sync(drawHeld: boolean): void {
    const go = animating();
    if (go && raf === 0) {
      last = 0;
      raf = requestAnimationFrame(tick);
    } else if (!go && raf !== 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (!go && drawHeld) frame(heldTime());
  }

  const observer = typeof IntersectionObserver === "function"
    ? new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        onScreen = entry ? entry.isIntersecting : true;
        sync(false);
      })
    : null;
  observer?.observe(el);

  const onVisibility = (): void => {
    tabVisible = document.visibilityState !== "hidden";
    sync(false);
  };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);

  const onMotion = (): void => {
    reduced = motionQuery?.matches ?? false;
    sync(true);
  };
  motionQuery?.addEventListener("change", onMotion);

  frame(heldTime());
  sync(false);

  return {
    update(next) {
      const timeChanged = next.time !== undefined && next.time !== state.time;
      state = { ...state, ...next };
      if (state.time !== null) t = state.time;
      sync(timeChanged || next.paused !== undefined);
    },
    redraw() {
      frame(heldTime());
    },
    destroy() {
      if (raf !== 0) cancelAnimationFrame(raf);
      raf = 0;
      observer?.disconnect();
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
      motionQuery?.removeEventListener("change", onMotion);
    },
  };
}

// lib/ramp.ts
/** Glyph density measured in the font actually in use. See STYLE.md, principle 2. */

/** Used when no glyphs are given: ten steps from space to at-sign. */
const FALLBACK_RAMP = " .:-=+*#%@";

interface Ramp {
  /** Glyphs from least to most ink. */
  readonly glyphs: readonly string[];
  /** Ink per glyph, scaled so the lightest is 0 and the darkest is 1. */
  readonly levels: readonly number[];
}

interface Shapes {
  readonly glyphs: readonly string[];
  /** Sub-cells per side. */
  readonly n: number;
  /** Ink per glyph in an n by n grid of sub-cells, row-major, scaled so the inkiest sub-cell of any glyph is 1. */
  readonly cells: readonly (readonly number[])[];
}

const rampCache = new Map<string, Ramp>();
const shapeCache = new Map<string, Shapes>();

function uniqueGlyphs(chars: string): string[] {
  return Array.from(new Set(Array.from(chars.length > 0 ? chars : FALLBACK_RAMP)));
}

/** A measurement taken before a web font loads describes the fallback font, so it is not cached. */
function fontSettled(fontFamily: string): boolean {
  try {
    return document.fonts.check(`12px ${fontFamily}`);
  } catch {
    return true;
  }
}

/** Draws each glyph in one cell and reads its ink per sub-cell. Null where there is no canvas. */
function inkMaps(glyphs: readonly string[], fontFamily: string, lineHeight: number, n: number): number[][] | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const fontPx = 40;
  ctx.font = `${fontPx}px ${fontFamily}`;
  const w = Math.max(1, Math.ceil(ctx.measureText("M").width || fontPx * 0.6));
  const h = Math.max(1, Math.ceil(fontPx * lineHeight));
  canvas.width = w;
  canvas.height = h;
  ctx.font = `${fontPx}px ${fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  return glyphs.map((glyph) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillText(glyph, 0, h / 2);
    const alpha = ctx.getImageData(0, 0, w, h).data;
    const sums = new Array<number>(n * n).fill(0);
    for (let y = 0; y < h; y++) {
      const sy = Math.min(n - 1, Math.floor((y / h) * n));
      for (let x = 0; x < w; x++) {
        const k = sy * n + Math.min(n - 1, Math.floor((x / w) * n));
        sums[k] = (sums[k] ?? 0) + (alpha[(y * w + x) * 4 + 3] ?? 0);
      }
    }
    return sums;
  });
}

/** Orders `chars` by the ink each glyph puts down in `fontFamily`. Where there is no canvas
 *  (server rendering, tests) it keeps the given order, evenly spaced. */
function measureRamp(chars: string, fontFamily: string, lineHeight = 1.2): Ramp {
  const glyphs = uniqueGlyphs(chars);
  const key = `${fontFamily}|${lineHeight}|${glyphs.join("")}`;
  const cached = rampCache.get(key);
  if (cached) return cached;
  const maps = inkMaps(glyphs, fontFamily, lineHeight, 1);
  if (!maps) {
    const last = Math.max(1, glyphs.length - 1);
    return { glyphs, levels: glyphs.map((_, i) => i / last) };
  }
  const order = glyphs
    .map((glyph, i) => ({ glyph, ink: maps[i]?.[0] ?? 0 }))
    .sort((a, b) => a.ink - b.ink);
  const lightest = order[0]?.ink ?? 0;
  const span = (order[order.length - 1]?.ink ?? 1) - lightest || 1;
  const ramp: Ramp = {
    glyphs: order.map((o) => o.glyph),
    levels: order.map((o) => (o.ink - lightest) / span),
  };
  if (fontSettled(fontFamily)) rampCache.set(key, ramp);
  return ramp;
}

/** The glyph whose measured ink is nearest `v`, where 0 is no ink and 1 is the darkest glyph. */
function pick(ramp: Ramp, v: number): string {
  const { glyphs, levels } = ramp;
  const last = glyphs.length - 1;
  if (last < 0) return " ";
  if (v <= 0) return glyphs[0] ?? " ";
  if (v >= 1) return glyphs[last] ?? " ";
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((levels[mid] ?? 0) < v) lo = mid;
    else hi = mid;
  }
  const nearer = v - (levels[lo] ?? 0) <= (levels[hi] ?? 1) - v ? lo : hi;
  return glyphs[nearer] ?? " ";
}

/** Measures where inside its cell each glyph puts its ink. Null where there is no canvas. */
function measureShapes(chars: string, fontFamily: string, lineHeight = 1.2, n = 3): Shapes | null {
  const glyphs = uniqueGlyphs(chars);
  const key = `${fontFamily}|${lineHeight}|${n}|${glyphs.join("")}`;
  const cached = shapeCache.get(key);
  if (cached) return cached;
  const maps = inkMaps(glyphs, fontFamily, lineHeight, n);
  if (!maps) return null;
  let max = 1;
  for (const m of maps) for (const v of m) if (v > max) max = v;
  const shapes: Shapes = { glyphs, n, cells: maps.map((m) => m.map((v) => v / max)) };
  if (fontSettled(fontFamily)) shapeCache.set(key, shapes);
  return shapes;
}

/** The glyph whose sub-cell ink is closest to `sample`: n by n values in 0..1, row-major. */
function matchShape(shapes: Shapes, sample: ArrayLike<number>): string {
  let best = 0;
  let bestDistance = Infinity;
  for (let g = 0; g < shapes.cells.length; g++) {
    const cells = shapes.cells[g] ?? [];
    let d = 0;
    for (let i = 0; i < cells.length; i++) {
      const e = (cells[i] ?? 0) - (sample[i] ?? 0);
      d += e * e;
    }
    if (d < bestDistance) {
      bestDistance = d;
      best = g;
    }
  }
  return shapes.glyphs[best] ?? " ";
}

// registry/ascii/ascii-solid/core.ts
export interface AsciiSolidProps extends MotionProps {
  /** Solid to rasterize: a torus, a sphere, or a cube. */
  shape: "torus" | "sphere" | "cube";
  /** Rotation speed. 0 holds the solid at its starting orientation, and 2 tumbles it quickly. */
  speed: number;
  /** Diameter of the solid as a fraction of the host's smaller side. */
  size: number;
  /** Glyphs to shade with, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** Glyph size in CSS pixels. */
  fontSize: number;
  /** CSS font-family stack for the glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: AsciiSolidProps = {
  shape: "torus",
  speed: 0.6,
  size: 0.8,
  glyphs: FALLBACK_RAMP,
  fontSize: 12,
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  lineHeight: 1.2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

const TAU = Math.PI * 2;
/** Target cell-units between adjacent samples, so the surface leaves no holes at its widest. */
const SPACING = 0.7;
/** Camera distance in world units, where every solid has a bounding radius of 1. */
const CAM_DIST = 2.6;
/** Radians per second per unit of speed, tilting the solid forward or back. */
const RATE_A = 0.5;
/** Radians per second per unit of speed, turning the solid around its vertical axis. */
const RATE_B = 0.8;
/** Constant tilt added to every frame, so the solid never sits edge-on or face-on at rest. */
const BASE_TILT = 0.39;
/** Constant turn added to every frame, so the default view shows more than one face. */
const BASE_SPIN = 0;
/** Minimum lit fraction, so the shaded side of the solid is dim rather than invisible. */
const AMBIENT = 0.16;
const LIGHT_MAG = Math.sqrt(3);
/** A fixed light from the upper left, and slightly toward the viewer. */
const LIGHT: readonly [number, number, number] = [-1 / LIGHT_MAG, 1 / LIGHT_MAG, -1 / LIGHT_MAG];
/** Sweep radius and tube radius of the torus, in world units. Their sum is the bounding radius. */
const TORUS_R2 = 2 / 3;
const TORUS_R1 = 1 / 3;
/** Half the cube's side, chosen so its corners reach the bounding radius of 1. */
const CUBE_HALF = 1 / Math.sqrt(3);
const CUBE_FACES: readonly (readonly [number, number, number])[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/** Sample steps around a loop of this radius, in grid cells, close enough to leave no holes. */
function ringSteps(radiusCells: number, min: number, max: number): number {
  const raw = Math.ceil((TAU * Math.max(0, radiusCells)) / SPACING);
  return Math.min(max, Math.max(min, raw));
}

/** Sample steps across a span of this length, in grid cells, close enough to leave no holes. */
function spanSteps(lengthCells: number, min: number, max: number): number {
  const raw = Math.ceil(Math.max(0, lengthCells) / SPACING);
  return Math.min(max, Math.max(min, raw));
}

export const mount: Mount<AsciiSolidProps> = (host, initial = {}) => {
  let props: AsciiSolidProps = { ...defaults, ...initial };
  let lastTime = 0;
  let depth = new Float64Array(0);

  labelHost(host, "");
  const grid = createGrid(host, gridOptions(props), () => draw(lastTime));
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: 1200, frame: draw });

  function gridOptions(p: AsciiSolidProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  function draw(t: number): void {
    lastTime = t;
    grid.clear();
    const { cols, rows, aspect } = grid;
    const scale = (props.size / 2) * Math.min(cols, rows / aspect);
    if (scale > 0) {
      if (depth.length !== cols * rows) depth = new Float64Array(cols * rows);
      depth.fill(-Infinity);
      const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
      const seconds = t / 1000;
      const angleA = (BASE_TILT + seconds * props.speed * RATE_A) % TAU;
      const angleB = (BASE_SPIN + seconds * props.speed * RATE_B) % TAU;
      const cosA = Math.cos(angleA);
      const sinA = Math.sin(angleA);
      const cosB = Math.cos(angleB);
      const sinB = Math.sin(angleB);
      const centerCol = (cols - 1) / 2;
      const centerRow = (rows - 1) / 2;
      const [lightX, lightY, lightZ] = LIGHT;

      // Rotates one surface sample (position and normal) by tilting it around the horizontal
      // axis and then turning it around the vertical axis, and, if it is the nearest sample so
      // far for its cell, shades it by the dot product of the rotated normal with the fixed light.
      function plot(x0: number, y0: number, z0: number, nx0: number, ny0: number, nz0: number): void {
        const y1 = y0 * cosA - z0 * sinA;
        const z1 = y0 * sinA + z0 * cosA;
        const x2 = x0 * cosB + z1 * sinB;
        const z2 = z1 * cosB - x0 * sinB;
        const ny1 = ny0 * cosA - nz0 * sinA;
        const nz1 = ny0 * sinA + nz0 * cosA;
        const nx2 = nx0 * cosB + nz1 * sinB;
        const nz2 = nz1 * cosB - nx0 * sinB;
        const zCam = z2 + CAM_DIST;
        if (zCam <= 0.01) return;
        const ooz = CAM_DIST / zCam;
        const col = Math.round(centerCol + x2 * ooz * scale);
        const row = Math.round(centerRow - y1 * ooz * scale * aspect);
        if (col < 0 || col >= cols || row < 0 || row >= rows) return;
        const idx = row * cols + col;
        if (ooz <= (depth[idx] ?? -Infinity)) return;
        depth[idx] = ooz;
        const lambert = nx2 * lightX + ny1 * lightY + nz2 * lightZ;
        const v = AMBIENT + (1 - AMBIENT) * Math.max(0, lambert);
        grid.set(col, row, pick(ramp, v));
      }

      if (props.shape === "torus") {
        const thetaN = ringSteps(TORUS_R1 * scale, 20, 160);
        const phiN = ringSteps((TORUS_R1 + TORUS_R2) * scale, 32, 460);
        const cosPhi = new Array<number>(phiN);
        const sinPhi = new Array<number>(phiN);
        for (let j = 0; j < phiN; j++) {
          const phi = (j / phiN) * TAU;
          cosPhi[j] = Math.cos(phi);
          sinPhi[j] = Math.sin(phi);
        }
        for (let i = 0; i < thetaN; i++) {
          const theta = (i / thetaN) * TAU;
          const ct = Math.cos(theta);
          const st = Math.sin(theta);
          const circleX = TORUS_R2 + TORUS_R1 * ct;
          for (let j = 0; j < phiN; j++) {
            const cp = cosPhi[j] ?? 1;
            const sp = sinPhi[j] ?? 0;
            plot(circleX * cp, circleX * sp, TORUS_R1 * st, ct * cp, ct * sp, st);
          }
        }
      } else if (props.shape === "sphere") {
        const thetaN = spanSteps(Math.PI * scale, 18, 210);
        const phiN = ringSteps(scale, 24, 460);
        const cosPhi = new Array<number>(phiN);
        const sinPhi = new Array<number>(phiN);
        for (let j = 0; j < phiN; j++) {
          const phi = (j / phiN) * TAU;
          cosPhi[j] = Math.cos(phi);
          sinPhi[j] = Math.sin(phi);
        }
        for (let i = 0; i <= thetaN; i++) {
          const theta = (i / thetaN) * Math.PI;
          const ct = Math.cos(theta);
          const st = Math.sin(theta);
          for (let j = 0; j < phiN; j++) {
            const cp = cosPhi[j] ?? 1;
            const sp = sinPhi[j] ?? 0;
            const x0 = st * cp;
            const z0 = st * sp;
            plot(x0, ct, z0, x0, ct, z0);
          }
        }
      } else {
        const n = spanSteps(2 * CUBE_HALF * scale, 8, 90);
        for (const face of CUBE_FACES) {
          const [nx, ny, nz] = face;
          for (let i = 0; i <= n; i++) {
            const u = (i / n) * 2 - 1;
            for (let j = 0; j <= n; j++) {
              const v = (j / n) * 2 - 1;
              let x0: number;
              let y0: number;
              let z0: number;
              if (nx !== 0) {
                x0 = nx * CUBE_HALF;
                y0 = u * CUBE_HALF;
                z0 = v * CUBE_HALF;
              } else if (ny !== 0) {
                x0 = u * CUBE_HALF;
                y0 = ny * CUBE_HALF;
                z0 = v * CUBE_HALF;
              } else {
                x0 = u * CUBE_HALF;
                y0 = v * CUBE_HALF;
                z0 = nz * CUBE_HALF;
              }
              plot(x0, y0, z0, nx, ny, nz);
            }
          }
        }
      }
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.fontFamily !== before.fontFamily || props.fontSize !== before.fontSize || props.lineHeight !== before.lineHeight) {
        grid.update(gridOptions(props));
      }
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      loop.destroy();
      grid.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/ascii/ascii-solid/index.tsx
export interface AsciiSolidComponentProps extends Partial<AsciiSolidProps> {
  className?: string;
  style?: CSSProperties;
}

/** A torus, sphere, or cube rotated in three dimensions and shaded with the measured ramp. */
export function AsciiSolid({ className, style, ...props }: AsciiSolidComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · ASCII Solid · ascii-solid
  MIT + Commons Clause · https://github.com/rishabbalak/pica/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/pica
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>ASCII Solid · Pica</title>
<style>html, body { margin: 0; height: 100%; background: #0a0a0a; color: #f1f1ef; }
@media (prefers-color-scheme: light) { html:not([data-ground]), html:not([data-ground]) body { background: #f1f1ef; color: #0a0a0a; } }
html[data-ground="paper"], html[data-ground="paper"] body { background: #f1f1ef; color: #0a0a0a; }
html[data-ground="checker"] body { background: repeating-conic-gradient(#161616 0% 25%, #0a0a0a 0% 50%) 50% / 24px 24px; }
#pica { width: 100%; height: 100%; }</style>
</head>
<body>
<div id="pica"></div>
<script>
"use strict";
var PicaAsciiSolid = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // registry/ascii/ascii-solid/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/a11y.ts
  function labelHost(host, label, role = "img") {
    if (label) {
      host.setAttribute("role", role);
      host.setAttribute("aria-label", label);
      host.removeAttribute("aria-hidden");
    } else {
      host.removeAttribute("role");
      host.removeAttribute("aria-label");
      host.setAttribute("aria-hidden", "true");
    }
  }
  function unlabelHost(host) {
    host.removeAttribute("role");
    host.removeAttribute("aria-label");
    host.removeAttribute("aria-hidden");
  }

  // lib/glyph-grid.ts
  var DOM_CELL_LIMIT = 12e3;
  function createGrid(host, options, onLayout) {
    let opts = { ...options };
    let cols = 1;
    let rows = 1;
    let cellW = 7.2;
    let cellH = 14;
    let fontPx = 12;
    let width = -1;
    let height = -1;
    let cells = [" "];
    let tints = [void 0];
    let shown = [];
    let view = null;
    let lines = [];
    let ctx = null;
    let ink = "";
    let alive = true;
    const probe = document.createElement("canvas").getContext("2d");
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    host.style.overflow = "hidden";
    const font = () => `${fontPx}px ${opts.fontFamily}`;
    function layout(force) {
      const w = host.clientWidth;
      const h = host.clientHeight;
      let advance = 0.6;
      if (probe) {
        probe.font = `100px ${opts.fontFamily}`;
        advance = probe.measureText("M").width / 100 || 0.6;
      }
      const px = opts.columns > 0 ? Math.max(1, w) / (opts.columns * advance) : opts.fontSize;
      const nextCellH = Math.max(1, Math.round(px * opts.lineHeight));
      const nextCols = Math.max(1, opts.columns > 0 ? opts.columns : Math.floor(w / (px * advance)));
      const nextRows = Math.max(1, Math.floor(h / nextCellH));
      if (!force && w === width && h === height && nextCols === cols && nextRows === rows) return false;
      width = w;
      height = h;
      fontPx = px;
      cellW = px * advance;
      cellH = nextCellH;
      cols = nextCols;
      rows = nextRows;
      cells = new Array(cols * rows).fill(" ");
      tints = new Array(cols * rows).fill(void 0);
      mountView();
      return true;
    }
    function mountView() {
      view?.remove();
      lines = [];
      ctx = null;
      const color = opts.color || "var(--pica-fg)";
      const mode = opts.renderer === "auto" ? cols * rows > DOM_CELL_LIMIT ? "canvas" : "dom" : opts.renderer;
      if (mode === "dom") {
        const pre = document.createElement("pre");
        pre.style.cssText = [
          "position:absolute",
          "inset:0",
          "margin:0",
          "padding:0",
          "overflow:hidden",
          "white-space:pre",
          "letter-spacing:0",
          "user-select:none",
          "pointer-events:none",
          "font-kerning:none",
          "font-variant-ligatures:none",
          `font-family:${opts.fontFamily}`,
          `font-size:${fontPx}px`,
          `line-height:${cellH}px`,
          `color:${color}`
        ].join(";");
        for (let y = 0; y < rows; y++) {
          const line = document.createElement("span");
          line.style.display = "block";
          line.style.height = `${cellH}px`;
          pre.appendChild(line);
          lines.push(line);
        }
        view = pre;
      } else {
        const canvas = document.createElement("canvas");
        canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;color:${color}`;
        const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.textBaseline = "middle";
          ctx.font = font();
        }
        view = canvas;
      }
      view.setAttribute("aria-hidden", "true");
      shown = new Array(rows).fill("\0");
      ink = "";
      host.appendChild(view);
    }
    function paintCanvas(context, target) {
      const color = getComputedStyle(target).color;
      if (color !== ink) {
        ink = color;
        shown.fill("\0");
      }
      for (let y = 0; y < rows; y++) {
        const start = y * cols;
        const rowTints = tints.slice(start, start + cols);
        let key = cells.slice(start, start + cols).join("");
        if (rowTints.some((tint) => tint !== void 0)) key += "\0" + rowTints.join(",");
        if (key === shown[y]) continue;
        shown[y] = key;
        const top = y * cellH;
        context.clearRect(0, top, width, cellH);
        let x = 0;
        while (x < cols) {
          const tint = rowTints[x] ?? ink;
          let end = x + 1;
          while (end < cols && (rowTints[end] ?? ink) === tint) end++;
          context.fillStyle = tint;
          context.fillText(cells.slice(start + x, start + end).join(""), x * cellW, top + cellH / 2);
          x = end;
        }
      }
    }
    function paintText() {
      for (let y = 0; y < rows; y++) {
        const row = cells.slice(y * cols, (y + 1) * cols).join("");
        if (row === shown[y]) continue;
        shown[y] = row;
        const line = lines[y];
        if (line) line.textContent = row;
      }
    }
    function set(x, y, glyph, color) {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      const i = y * cols + x;
      cells[i] = glyph;
      tints[i] = color;
    }
    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
      if (alive && layout(false)) onLayout();
    }) : null;
    resizeObserver?.observe(host);
    const onFonts = () => {
      if (alive && layout(true)) onLayout();
    };
    document.fonts.addEventListener("loadingdone", onFonts);
    layout(true);
    return {
      get cols() {
        return cols;
      },
      get rows() {
        return rows;
      },
      get aspect() {
        return cellW / cellH;
      },
      get font() {
        return font();
      },
      set,
      write(x, y, text, color) {
        let i = 0;
        for (const glyph of text) {
          set(x + i, y, glyph, color);
          i++;
        }
      },
      clear(glyph = " ") {
        cells.fill(glyph);
        tints.fill(void 0);
      },
      flush() {
        if (!view) return;
        if (ctx) paintCanvas(ctx, view);
        else paintText();
      },
      update(next) {
        opts = { ...opts, ...next };
        layout(true);
        onLayout();
      },
      destroy() {
        alive = false;
        resizeObserver?.disconnect();
        document.fonts.removeEventListener("loadingdone", onFonts);
        view?.remove();
        view = null;
      }
    };
  }

  // lib/loop.ts
  var MAX_STEP_MS = 100;
  function createLoop(options) {
    const { el, frame, still } = options;
    let state = { paused: options.paused, time: options.time, fps: options.fps };
    let t = 0;
    let last = 0;
    let raf = 0;
    let onScreen = true;
    let tabVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
    const motionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    let reduced = motionQuery?.matches ?? false;
    const animating = () => !state.paused && state.time === null && !reduced && onScreen && tabVisible;
    const heldTime = () => state.time !== null ? state.time : reduced ? still : t;
    function tick(now) {
      raf = 0;
      if (!animating()) return;
      if (last === 0) last = now;
      const elapsed = now - last;
      if (elapsed >= 1e3 / Math.max(1, state.fps) - 1) {
        t += Math.min(elapsed, MAX_STEP_MS);
        last = now;
        frame(t);
      }
      raf = requestAnimationFrame(tick);
    }
    function sync(drawHeld) {
      const go = animating();
      if (go && raf === 0) {
        last = 0;
        raf = requestAnimationFrame(tick);
      } else if (!go && raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (!go && drawHeld) frame(heldTime());
    }
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      onScreen = entry ? entry.isIntersecting : true;
      sync(false);
    }) : null;
    observer?.observe(el);
    const onVisibility = () => {
      tabVisible = document.visibilityState !== "hidden";
      sync(false);
    };
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
    const onMotion = () => {
      reduced = motionQuery?.matches ?? false;
      sync(true);
    };
    motionQuery?.addEventListener("change", onMotion);
    frame(heldTime());
    sync(false);
    return {
      update(next) {
        const timeChanged = next.time !== void 0 && next.time !== state.time;
        state = { ...state, ...next };
        if (state.time !== null) t = state.time;
        sync(timeChanged || next.paused !== void 0);
      },
      redraw() {
        frame(heldTime());
      },
      destroy() {
        if (raf !== 0) cancelAnimationFrame(raf);
        raf = 0;
        observer?.disconnect();
        if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
        motionQuery?.removeEventListener("change", onMotion);
      }
    };
  }

  // lib/ramp.ts
  var FALLBACK_RAMP = " .:-=+*#%@";
  var rampCache = /* @__PURE__ */ new Map();
  function uniqueGlyphs(chars) {
    return Array.from(new Set(Array.from(chars.length > 0 ? chars : FALLBACK_RAMP)));
  }
  function fontSettled(fontFamily) {
    try {
      return document.fonts.check(`12px ${fontFamily}`);
    } catch {
      return true;
    }
  }
  function inkMaps(glyphs, fontFamily, lineHeight, n) {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const fontPx = 40;
    ctx.font = `${fontPx}px ${fontFamily}`;
    const w = Math.max(1, Math.ceil(ctx.measureText("M").width || fontPx * 0.6));
    const h = Math.max(1, Math.ceil(fontPx * lineHeight));
    canvas.width = w;
    canvas.height = h;
    ctx.font = `${fontPx}px ${fontFamily}`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    return glyphs.map((glyph) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillText(glyph, 0, h / 2);
      const alpha = ctx.getImageData(0, 0, w, h).data;
      const sums = new Array(n * n).fill(0);
      for (let y = 0; y < h; y++) {
        const sy = Math.min(n - 1, Math.floor(y / h * n));
        for (let x = 0; x < w; x++) {
          const k = sy * n + Math.min(n - 1, Math.floor(x / w * n));
          sums[k] = (sums[k] ?? 0) + (alpha[(y * w + x) * 4 + 3] ?? 0);
        }
      }
      return sums;
    });
  }
  function measureRamp(chars, fontFamily, lineHeight = 1.2) {
    const glyphs = uniqueGlyphs(chars);
    const key = `${fontFamily}|${lineHeight}|${glyphs.join("")}`;
    const cached = rampCache.get(key);
    if (cached) return cached;
    const maps = inkMaps(glyphs, fontFamily, lineHeight, 1);
    if (!maps) {
      const last = Math.max(1, glyphs.length - 1);
      return { glyphs, levels: glyphs.map((_, i) => i / last) };
    }
    const order = glyphs.map((glyph, i) => ({ glyph, ink: maps[i]?.[0] ?? 0 })).sort((a, b) => a.ink - b.ink);
    const lightest = order[0]?.ink ?? 0;
    const span = (order[order.length - 1]?.ink ?? 1) - lightest || 1;
    const ramp = {
      glyphs: order.map((o) => o.glyph),
      levels: order.map((o) => (o.ink - lightest) / span)
    };
    if (fontSettled(fontFamily)) rampCache.set(key, ramp);
    return ramp;
  }
  function pick(ramp, v) {
    const { glyphs, levels } = ramp;
    const last = glyphs.length - 1;
    if (last < 0) return " ";
    if (v <= 0) return glyphs[0] ?? " ";
    if (v >= 1) return glyphs[last] ?? " ";
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = lo + hi >> 1;
      if ((levels[mid] ?? 0) < v) lo = mid;
      else hi = mid;
    }
    const nearer = v - (levels[lo] ?? 0) <= (levels[hi] ?? 1) - v ? lo : hi;
    return glyphs[nearer] ?? " ";
  }

  // registry/ascii/ascii-solid/core.ts
  var defaults = {
    shape: "torus",
    speed: 0.6,
    size: 0.8,
    glyphs: FALLBACK_RAMP,
    fontSize: 12,
    fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
    lineHeight: 1.2,
    fps: 30,
    paused: false,
    time: null,
    seed: 1
  };
  var TAU = Math.PI * 2;
  var SPACING = 0.7;
  var CAM_DIST = 2.6;
  var RATE_A = 0.5;
  var RATE_B = 0.8;
  var BASE_TILT = 0.39;
  var BASE_SPIN = 0;
  var AMBIENT = 0.16;
  var LIGHT_MAG = Math.sqrt(3);
  var LIGHT = [-1 / LIGHT_MAG, 1 / LIGHT_MAG, -1 / LIGHT_MAG];
  var TORUS_R2 = 2 / 3;
  var TORUS_R1 = 1 / 3;
  var CUBE_HALF = 1 / Math.sqrt(3);
  var CUBE_FACES = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1]
  ];
  function ringSteps(radiusCells, min, max) {
    const raw = Math.ceil(TAU * Math.max(0, radiusCells) / SPACING);
    return Math.min(max, Math.max(min, raw));
  }
  function spanSteps(lengthCells, min, max) {
    const raw = Math.ceil(Math.max(0, lengthCells) / SPACING);
    return Math.min(max, Math.max(min, raw));
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let lastTime = 0;
    let depth = new Float64Array(0);
    labelHost(host, "");
    const grid = createGrid(host, gridOptions(props), () => draw(lastTime));
    const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: 1200, frame: draw });
    function gridOptions(p) {
      return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
    }
    function draw(t) {
      lastTime = t;
      grid.clear();
      const { cols, rows, aspect } = grid;
      const scale = props.size / 2 * Math.min(cols, rows / aspect);
      if (scale > 0) {
        let plot2 = function(x0, y0, z0, nx0, ny0, nz0) {
          const y1 = y0 * cosA - z0 * sinA;
          const z1 = y0 * sinA + z0 * cosA;
          const x2 = x0 * cosB + z1 * sinB;
          const z2 = z1 * cosB - x0 * sinB;
          const ny1 = ny0 * cosA - nz0 * sinA;
          const nz1 = ny0 * sinA + nz0 * cosA;
          const nx2 = nx0 * cosB + nz1 * sinB;
          const nz2 = nz1 * cosB - nx0 * sinB;
          const zCam = z2 + CAM_DIST;
          if (zCam <= 0.01) return;
          const ooz = CAM_DIST / zCam;
          const col = Math.round(centerCol + x2 * ooz * scale);
          const row = Math.round(centerRow - y1 * ooz * scale * aspect);
          if (col < 0 || col >= cols || row < 0 || row >= rows) return;
          const idx = row * cols + col;
          if (ooz <= (depth[idx] ?? -Infinity)) return;
          depth[idx] = ooz;
          const lambert = nx2 * lightX + ny1 * lightY + nz2 * lightZ;
          const v = AMBIENT + (1 - AMBIENT) * Math.max(0, lambert);
          grid.set(col, row, pick(ramp, v));
        };
        var plot = plot2;
        if (depth.length !== cols * rows) depth = new Float64Array(cols * rows);
        depth.fill(-Infinity);
        const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
        const seconds = t / 1e3;
        const angleA = (BASE_TILT + seconds * props.speed * RATE_A) % TAU;
        const angleB = (BASE_SPIN + seconds * props.speed * RATE_B) % TAU;
        const cosA = Math.cos(angleA);
        const sinA = Math.sin(angleA);
        const cosB = Math.cos(angleB);
        const sinB = Math.sin(angleB);
        const centerCol = (cols - 1) / 2;
        const centerRow = (rows - 1) / 2;
        const [lightX, lightY, lightZ] = LIGHT;
        if (props.shape === "torus") {
          const thetaN = ringSteps(TORUS_R1 * scale, 20, 160);
          const phiN = ringSteps((TORUS_R1 + TORUS_R2) * scale, 32, 460);
          const cosPhi = new Array(phiN);
          const sinPhi = new Array(phiN);
          for (let j = 0; j < phiN; j++) {
            const phi = j / phiN * TAU;
            cosPhi[j] = Math.cos(phi);
            sinPhi[j] = Math.sin(phi);
          }
          for (let i = 0; i < thetaN; i++) {
            const theta = i / thetaN * TAU;
            const ct = Math.cos(theta);
            const st = Math.sin(theta);
            const circleX = TORUS_R2 + TORUS_R1 * ct;
            for (let j = 0; j < phiN; j++) {
              const cp = cosPhi[j] ?? 1;
              const sp = sinPhi[j] ?? 0;
              plot2(circleX * cp, circleX * sp, TORUS_R1 * st, ct * cp, ct * sp, st);
            }
          }
        } else if (props.shape === "sphere") {
          const thetaN = spanSteps(Math.PI * scale, 18, 210);
          const phiN = ringSteps(scale, 24, 460);
          const cosPhi = new Array(phiN);
          const sinPhi = new Array(phiN);
          for (let j = 0; j < phiN; j++) {
            const phi = j / phiN * TAU;
            cosPhi[j] = Math.cos(phi);
            sinPhi[j] = Math.sin(phi);
          }
          for (let i = 0; i <= thetaN; i++) {
            const theta = i / thetaN * Math.PI;
            const ct = Math.cos(theta);
            const st = Math.sin(theta);
            for (let j = 0; j < phiN; j++) {
              const cp = cosPhi[j] ?? 1;
              const sp = sinPhi[j] ?? 0;
              const x0 = st * cp;
              const z0 = st * sp;
              plot2(x0, ct, z0, x0, ct, z0);
            }
          }
        } else {
          const n = spanSteps(2 * CUBE_HALF * scale, 8, 90);
          for (const face of CUBE_FACES) {
            const [nx, ny, nz] = face;
            for (let i = 0; i <= n; i++) {
              const u = i / n * 2 - 1;
              for (let j = 0; j <= n; j++) {
                const v = j / n * 2 - 1;
                let x0;
                let y0;
                let z0;
                if (nx !== 0) {
                  x0 = nx * CUBE_HALF;
                  y0 = u * CUBE_HALF;
                  z0 = v * CUBE_HALF;
                } else if (ny !== 0) {
                  x0 = u * CUBE_HALF;
                  y0 = ny * CUBE_HALF;
                  z0 = v * CUBE_HALF;
                } else {
                  x0 = u * CUBE_HALF;
                  y0 = v * CUBE_HALF;
                  z0 = nz * CUBE_HALF;
                }
                plot2(x0, y0, z0, nx, ny, nz);
              }
            }
          }
        }
      }
      grid.flush();
      host.dataset.picaReady = "true";
    }
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.fontFamily !== before.fontFamily || props.fontSize !== before.fontSize || props.lineHeight !== before.lineHeight) {
          grid.update(gridOptions(props));
        }
        loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      },
      destroy() {
        loop.destroy();
        grid.destroy();
        unlabelHost(host);
        delete host.dataset.picaReady;
      }
    };
  };
  return __toCommonJS(core_exports);
})();

(function () {
  var instance = PicaAsciiSolid.mount(document.getElementById("pica"), window.PICA_PROPS || {});
  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || !event.data) return;
    if (event.data.type === "pica:props") instance.update(event.data.props);
    if (event.data.type === "pica:ground") {
      document.documentElement.setAttribute("data-ground", event.data.ground);
      instance.update({});
    }
  });
})();
</script>
</body>
</html>
```

## Credits

- Technique from [Donut math: how donut.c works](https://www.a1k0n.net/2011/07/20/donut-math.html) by Andy Sloane (Article).
