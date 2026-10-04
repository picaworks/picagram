# Clay Hero

> Soft inflated forms settle behind the page's own content, shaded in screened tone bands.

Category: sections. Tags: hero, clay, landing, section, dither, background. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 6.6 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/clay-hero.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `headline` | string | `"Soft shapes, hard edges."` | The headline, set large in the page's own typeface. Empty hides it. |
| `subhead` | string | `"Inflated forms settle behind the type, each shaded in a handful of screened tone bands."` | Support under the headline, drawn in the muted color. Empty hides it. |
| `actions` | readonly ClayHeroAction[] | `[{"label":"Browse components","href":"#components"},{"label":"Read the docs","href":"#docs"}]` | Calls to action, drawn as links. At most three show, and the first fills with the accent. |
| `align` | "start" \| "center" | `"start"` | Horizontal alignment of the content column within the host. |
| `minHeight` | number | `72` | The host's minimum height, in percent of the viewport height. |
| `forms` | number | `4` | How many clay forms settle behind the content, from 2 to 6. |
| `scale` | number | `1` | Radius multiplier on every form. |
| `levels` | number | `4` | Tone bands each form is screened into, from 2 to 4. |
| `depth` | number | `0.75` | Contrast between the darkest and the lightest band, from 0 to 1. |
| `mask` | "blue" \| "cluster" \| "bayer" | `"blue"` | The screen the bands are dithered with: "blue" noise, a "cluster" dot screen, or a "bayer" matrix. |
| `pixel` | number | `4` | CSS pixels each screened cell covers before the canvas is scaled up. |
| `speed` | number | `1` | How fast the forms drift and deform. 0 holds them still. |
| `fps` | number | `15` | Frames per second ceiling. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with `--pica-fg`, `--pica-muted`, `--pica-accent`, `--pica-bg`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Clay Hero · clay-hero
// MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
// Docs and credits: https://github.com/rishabbalak/picagram

// lib/events.ts
/** Events a core reports from its host. Each is a CustomEvent named "pica:" plus the event's name in lower
 *  case, dispatched on the host without bubbling, so a composed child's events never reach its parent's
 *  listeners. React wrappers turn them into `on` props through lib/use-pica.ts. A core emits only in
 *  response to input, never from mount or update, so echoing a value back cannot loop.
 *  See docs/architecture/contract.md. */

/** The DOM event type for an event name: "valueChange" becomes "pica:valuechange". */
function eventType(name: string): string {
  return `pica:${name.toLowerCase()}`;
}

/** A function that dispatches a core's events on its host. `E` maps each event name to its detail. */
function emitter<E>(host: HTMLElement): <K extends keyof E & string>(name: K, detail: E[K]) => void {
  return (name, detail) => {
    host.dispatchEvent(new CustomEvent(eventType(name), { detail, bubbles: false }));
  };
}

// lib/types.ts
/** The contract every Pica core implements. See docs/architecture/contract.md. */

/** A mounted component. */
interface PicaInstance<P> {
  /** Merge new prop values. The core decides what has to be rebuilt. */
  update(props: Partial<P>): void;
  /** Stop all work and remove everything the core added. Safe to call twice. */
  destroy(): void;
}

/** Mounts a core into a host element. Props are JSON values, so they pass through window.PICA_PROPS,
 *  postMessage, and the catalog's inspector unchanged. */
type Mount<P> = (host: HTMLElement, props?: Partial<P>) => PicaInstance<P>;

/** Any value JSON can carry. A prop may hold one. A core never writes into it, because React passes the
 *  parent's own objects; compare with sameJson from lib/json.ts. */
type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };

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
/** React props for a core's events: an event named valueChange becomes onValueChange. */
type Handlers<Events> = {
  [K in keyof Events & string as `on${Capitalize<K>}`]?: (detail: Events[K]) => void;
};

/** Colors for one instance. Each sets a --pica-* custom property on the host, which beats a value inherited
 *  from the page. See lib/palette.ts. */
interface PaletteProp {
  fg?: string;
  bg?: string;
  accent?: string;
  muted?: string;
}

/** Props every wrapper accepts besides its core's own. */
interface WrapperProps {
  className?: string;
  style?: CSSProperties;
  /** Colors for this instance, as CSS colors. Unset tokens follow the page. */
  palette?: PaletteProp;
}

/** The host style for a palette: one custom property per token that is set. */
function paletteStyle(palette: PaletteProp | undefined): CSSProperties {
  const style: Record<string, string> = {};
  for (const [token, color] of Object.entries(palette ?? {})) {
    if (color) style[`--pica-${token}`] = color;
  }
  return style as CSSProperties;
}

/** Mounts a Pica core into the returned ref, forwards data prop changes to it, and calls `on` props when the
 *  core reports events. Data props are JSON, so a JSON key is enough to detect a change. Functions stay out
 *  of that key, so an inline handler never causes an update. `E` is the host element's type. */
function usePica<P, E extends HTMLElement = HTMLDivElement>(mount: Mount<P>, props: Partial<P>) {
  const ref = useRef<E>(null);
  const instance = useRef<PicaInstance<P> | null>(null);
  const { data, handlers } = splitProps(props);
  const latest = useRef(data);
  latest.current = data;
  const listeners = useRef(handlers);
  listeners.current = handlers;
  const key = JSON.stringify(data);
  const names = Object.keys(handlers).sort().join(" ");

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

  useEffect(() => {
    const host = ref.current;
    if (!host || !names) return;
    const removers = names.split(" ").map((name) => {
      const type = eventType(name.slice(2));
      const listener = (event: Event): void => listeners.current[name]?.((event as CustomEvent).detail);
      host.addEventListener(type, listener);
      return () => host.removeEventListener(type, listener);
    });
    return () => {
      for (const remove of removers) remove();
    };
  }, [names]);

  return ref;
}

/** Splits props into data, which goes to the core, and `on` handlers, which listen for its events. Undefined
 *  values are dropped, so an unset prop keeps the core's default. */
function splitProps<P>(props: Partial<P>): { data: Partial<P>; handlers: Record<string, (detail: unknown) => void> } {
  const data: Record<string, unknown> = {};
  const handlers: Record<string, (detail: unknown) => void> = {};
  for (const [name, raw] of Object.entries(props)) {
    const value: unknown = raw;
    if (value === undefined) continue;
    if (typeof value === "function" && /^on[A-Z]/.test(name)) handlers[name] = value as (detail: unknown) => void;
    else data[name] = value;
  }
  return { data: data as Partial<P>, handlers };
}

// lib/palette.ts
/** The four colors every component draws with. They live in CSS custom properties, so they cascade: set
 *  them once on a page or a section and every component follows, including on a theme switch. A wrapper's
 *  palette prop writes the same properties onto one host. This is the only module that reads them.
 *  See STYLE.md and docs/decisions/0005-palette.md. */

type Token = "fg" | "bg" | "accent" | "muted";

const TOKENS: readonly Token[] = ["fg", "bg", "accent", "muted"];

/** What each token falls back to when neither the page nor a palette prop sets it. Muted is the ink at 65%,
 *  which keeps 4.5:1 contrast on both the dark and the light ground. */
const TOKEN_FALLBACK: Readonly<Record<Token, string>> = {
  fg: "currentColor",
  bg: "transparent",
  accent: "#13C4A3",
  muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)",
};

/** The CSS value of a token, with its fallback, for use in a style: var(--pica-accent, #13C4A3). */
function cssVar(token: Token): string {
  return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
}

/** A readable ink for text set on a token's color: black on a light color, white on a dark one. Relative
 *  color syntax does it in CSS alone, so it follows any palette without script. */
function cssOn(token: Token): string {
  return `oklch(from ${cssVar(token)} clamp(0, (0.62 - l) * 1000, 1) 0 0)`;
}

/** Each token's color as the browser computes it, usable as a canvas fill. */
type Colors = Readonly<Record<Token, string>>;

/** Event types the probe stops, so its transitions never reach the page's own listeners. */
const PROBE_EVENTS = ["transitionrun", "transitionstart", "transitionend", "transitioncancel"] as const;

/** A zero-size probe inside the host whose color properties are the four tokens, so currentColor,
 *  light-dark(), and color-mix() resolve exactly as they do on the page. */
function createProbe(host: HTMLElement): HTMLElement {
  const probe = document.createElement("span");
  probe.setAttribute("data-pica", "");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = [
    "position:absolute",
    "width:0",
    "height:0",
    "overflow:hidden",
    "visibility:hidden",
    "pointer-events:none",
    `color:${cssVar("fg")}`,
    `background-color:${cssVar("bg")}`,
    `border-top:0 solid ${cssVar("accent")}`,
    `outline:0 solid ${cssVar("muted")}`,
    // A 1 ms transition turns any change to a token into a transitionend event, which watchPalette hears.
    "transition:color 1ms,background-color 1ms,border-top-color 1ms,outline-color 1ms",
  ].join(";");
  host.appendChild(probe);
  return probe;
}

function probeColors(probe: HTMLElement): Colors {
  const style = getComputedStyle(probe);
  return { fg: style.color, bg: style.backgroundColor, accent: style.borderTopColor, muted: style.outlineColor };
}

/** Reads the four colors once. A core that needs them every frame keeps a watchPalette handle instead. */
function readPalette(host: HTMLElement): Colors {
  const probe = createProbe(host);
  const colors = probeColors(probe);
  probe.remove();
  return colors;
}

interface PaletteWatch {
  /** The colors as of the last read. */
  readonly colors: Colors;
  /** Reads again now, for example in update() or after a resize. Returns true when any color changed. */
  refresh(): boolean;
  /** Removes the probe and its listeners. */
  destroy(): void;
}

/** Keeps a probe in the host and calls `onChange` whenever a token's color changes, however it changed: a
 *  theme class, a media query, a palette prop, or a React style. Canvas and WebGL components repaint there.
 *  A page that turns every transition off hides these changes, so cores also call refresh() in update(). */
function watchPalette(host: HTMLElement, onChange: (colors: Colors) => void): PaletteWatch {
  const probe = createProbe(host);
  let colors = probeColors(probe);

  function refresh(): boolean {
    const next = probeColors(probe);
    const differs = TOKENS.some((token) => next[token] !== colors[token]);
    colors = next;
    return differs;
  }

  const onEvent = (event: Event): void => {
    event.stopPropagation();
    if (event.type === "transitionend" && refresh()) onChange(colors);
  };
  for (const type of PROBE_EVENTS) probe.addEventListener(type, onEvent);

  return {
    get colors() {
      return colors;
    },
    refresh,
    destroy() {
      for (const type of PROBE_EVENTS) probe.removeEventListener(type, onEvent);
      probe.remove();
    },
  };
}

// lib/color.ts
/** Reading colors from the page, so components inherit instead of impose. See STYLE.md, principle 4. */


let colorProbe: CanvasRenderingContext2D | null | undefined;

/** Any CSS color as [r, g, b, a], each 0 to 255. A color the browser cannot parse reads as transparent. */
function parseColor(color: string): [number, number, number, number] {
  if (colorProbe === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    colorProbe = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!colorProbe) return [0, 0, 0, 0];
  colorProbe.clearRect(0, 0, 1, 1);
  colorProbe.fillStyle = "rgba(0, 0, 0, 0)";
  colorProbe.fillStyle = color;
  colorProbe.fillRect(0, 0, 1, 1);
  const d = colorProbe.getImageData(0, 0, 1, 1).data;
  return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0, d[3] ?? 0];
}

/** WCAG relative luminance of a CSS color: 0 for black, 1 for white. */
function relativeLuminance(color: string): number {
  const [r, g, b] = parseColor(color);
  const linear = (v: number): number => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** The color glyphs are drawn in: --pica-fg when set, otherwise the host's inherited color. It reads once;
 *  a core that needs the color every frame keeps a watchPalette handle from lib/palette.ts instead. */
function inkColor(host: HTMLElement): string {
  return readPalette(host).fg;
}

/** Whether the host shows light glyphs on a dark ground or the reverse, read from computed colors. */
function hostTone(host: HTMLElement): "light-on-dark" | "dark-on-light" {
  const fg = relativeLuminance(inkColor(host));
  let bg = 1; // A page with no background set anywhere renders white.
  for (let el: HTMLElement | null = host; el; el = el.parentElement) {
    const background = getComputedStyle(el).backgroundColor;
    if (parseColor(background)[3] > 0) {
      bg = relativeLuminance(background);
      break;
    }
  }
  return fg > bg ? "light-on-dark" : "dark-on-light";
}

// lib/host.ts
/** What a core may change on its host, and the nodes it adds, each undone on destroy. A core never writes
 *  to, moves, or removes a node it did not create, and every node it adds carries data-pica.
 *  See docs/architecture/contract.md. */

/** A number unique across every Pica component on the page. Each pasted component carries its own copy of
 *  lib/, so the counter lives on globalThis rather than in this module. */
function nextSerial(): number {
  const g = globalThis as unknown as { __picaSerial?: number };
  g.__picaSerial = (g.__picaSerial ?? 0) + 1;
  return g.__picaSerial;
}

/** An id for ARIA relationships, such as the listbox a trigger controls. */
function nextId(prefix: string): string {
  return `${prefix}-${nextSerial()}`;
}

/** Hosts that had no style attribute before any core styled them, so the last restore can remove it. */
const unstyled = new WeakMap<HTMLElement, boolean>();

/** Sets inline styles on the host, named as in CSS, and returns a function that puts back what was there.
 *  Calling the function twice is harmless. */
function styleHost(host: HTMLElement, styles: Readonly<Record<string, string>>): () => void {
  if (!unstyled.has(host)) unstyled.set(host, !host.hasAttribute("style"));
  const before = Object.keys(styles).map(
    (name) => [name, host.style.getPropertyValue(name), host.style.getPropertyPriority(name)] as const,
  );
  for (const [name, value] of Object.entries(styles)) host.style.setProperty(name, value);
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    for (const [name, value, priority] of before) {
      if (value) host.style.setProperty(name, value, priority);
      else host.style.removeProperty(name);
    }
    if (host.style.length === 0 && unstyled.get(host)) host.removeAttribute("style");
  };
}

/** Attributes a core sets on its host over its lifetime, such as disabled or aria-busy. */
interface HostAttributes {
  /** Sets an attribute, or removes it when `value` is null. */
  set(name: string, value: string | null): void;
  /** Puts back every attribute set through this object as it was before the first change. */
  restore(): void;
}

/** Tracks attribute changes on the host, remembering each attribute's first value so destroy can restore it. */
function hostAttributes(host: HTMLElement): HostAttributes {
  const original = new Map<string, string | null>();
  const apply = (name: string, value: string | null): void => {
    if (value === null) host.removeAttribute(name);
    else host.setAttribute(name, value);
  };
  return {
    set(name, value) {
      if (!original.has(name)) original.set(name, host.getAttribute(name));
      apply(name, value);
    },
    restore() {
      for (const [name, value] of original) apply(name, value);
      original.clear();
    },
  };
}

/** A node drawn over or under the host's content. It is the core's own, hidden from assistive technology,
 *  and ignores the pointer, so content beneath it stays clickable. */
interface Layer {
  readonly el: HTMLElement;
  /** Removes the node and undoes the host styles it needed. */
  remove(): void;
}

/** Adds a layer that covers the host. "over" paints above the host's content; "under" paints below it and
 *  above the host's background, which needs the host to be its own stacking context. */
function layer(host: HTMLElement, where: "under" | "over", tag: keyof HTMLElementTagNameMap = "div"): Layer {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:${where === "under" ? -1 : 1}`;
  const styles: Record<string, string> = {};
  if (getComputedStyle(host).position === "static") styles.position = "relative";
  if (where === "under") styles.isolation = "isolate";
  const restore = styleHost(host, styles);
  if (where === "under") host.prepend(el);
  else host.append(el);
  return {
    el,
    remove() {
      el.remove();
      restore();
    },
  };
}

/** A stylesheet that applies to one host only, through a data-pica-id attribute. It scopes by attribute
 *  rather than class, because React resets `class` whenever `className` changes. One scope per host. */
interface Scope {
  /** The selector for this host, such as [data-pica-id="7"]. Write every rule against it. */
  readonly selector: string;
  /** Replaces the scoped rules. */
  setRules(css: string): void;
  /** Removes the stylesheet and the attribute. */
  destroy(): void;
}

function scope(host: HTMLElement): Scope {
  const id = String(nextSerial());
  host.setAttribute("data-pica-id", id);
  const style = document.createElement("style");
  style.setAttribute("data-pica", "");
  host.append(style);
  return {
    selector: `[data-pica-id="${id}"]`,
    setRules(css) {
      style.textContent = css;
    },
    destroy() {
      style.remove();
      host.removeAttribute("data-pica-id");
    },
  };
}

// lib/canvas.ts
/** A canvas that covers the host, marked as the core's own and hidden from assistive technology. By default
 *  its backing store follows the host's size in device pixels. Used by canvas components and lib/gl.ts. */

interface CanvasOptions {
  /** Device pixel ratio ceiling. */
  maxDpr: number;
  /** Backing-store pixel ceiling, so a very large host cannot allocate a very large canvas. */
  maxPixels: number;
  /** Size the backing store to the host in device pixels. Off leaves sizing to the caller, for drawing at a
   *  lower resolution that CSS scales up. */
  autoSize: boolean;
  /** Extra inline CSS for the canvas, such as image-rendering:pixelated. */
  css: string;
  /** Runs when the host's size changes, with its new size in CSS pixels. It is not called at creation, so
   *  draw once yourself after creating the canvas. With autoSize on, the backing store is already resized. */
  onResize: (cssWidth: number, cssHeight: number) => void;
}

interface Surface {
  readonly canvas: HTMLCanvasElement;
  /** Backing-store size in device pixels, kept up to date when autoSize is on. */
  readonly width: number;
  readonly height: number;
  /** Device pixels per CSS pixel, after the ceilings. */
  readonly dpr: number;
  /** The host's size in CSS pixels. */
  readonly cssWidth: number;
  readonly cssHeight: number;
  /** Stops following the host, removes the canvas, and restores the host's styles. */
  destroy(): void;
}

function createCanvas(host: HTMLElement, options: Partial<CanvasOptions> = {}): Surface {
  const { maxDpr = 2, maxPixels = Number.POSITIVE_INFINITY, autoSize = true, css = "", onResize } = options;
  const restore = styleHost(
    host,
    getComputedStyle(host).position === "static" ? { position: "relative", overflow: "hidden" } : { overflow: "hidden" },
  );
  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-pica", "");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;${css}`;
  host.appendChild(canvas);
  let cssWidth = -1;
  let cssHeight = -1;
  let width = 0;
  let height = 0;
  let dpr = 1;

  /** Reads the host's size. Returns true when it changed. */
  function measure(): boolean {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === cssWidth && h === cssHeight) return false;
    cssWidth = w;
    cssHeight = h;
    dpr = Math.min(globalThis.devicePixelRatio || 1, maxDpr, Math.sqrt(maxPixels / (Math.max(1, w) * Math.max(1, h))));
    if (autoSize) {
      width = Math.max(1, Math.round(w * dpr));
      height = Math.max(1, Math.round(h * dpr));
      canvas.width = width;
      canvas.height = height;
    }
    return true;
  }

  measure();
  const observer = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => {
        if (measure()) onResize?.(cssWidth, cssHeight);
      })
    : null;
  observer?.observe(host);

  return {
    canvas,
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    get dpr() {
      return dpr;
    },
    get cssWidth() {
      return cssWidth;
    },
    get cssHeight() {
      return cssHeight;
    },
    destroy() {
      observer?.disconnect();
      canvas.remove();
      restore();
    },
  };
}

// lib/dither.ts
/** Reducing tone to ink or no ink. Thresholds and kernels follow Surma's "Ditherpunk". */

/** Ordered-dither thresholds for a size by size Bayer matrix, row-major, each in (0, 1). */
function bayerMatrix(size: 2 | 4 | 8): Float32Array {
  // Built by doubling: each step places 4M, 4M + 2, 4M + 3, and 4M + 1 in the four quadrants.
  let m = [0];
  let n = 1;
  while (n < size) {
    const next = new Array<number>(4 * n * n).fill(0);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 4 * (m[y * n + x] ?? 0);
        next[y * 2 * n + x] = v;
        next[y * 2 * n + x + n] = v + 2;
        next[(y + n) * 2 * n + x] = v + 3;
        next[(y + n) * 2 * n + x + n] = v + 1;
      }
    }
    m = next;
    n *= 2;
  }
  const out = new Float32Array(size * size);
  for (let i = 0; i < out.length; i++) out[i] = ((m[i] ?? 0) + 0.5) / (size * size);
  return out;
}

const bayerCache = new Map<number, Float32Array>();

/** The ordered-dither threshold at pixel (x, y) of a tiled Bayer matrix, in (0, 1). Each size is built once. */
function bayerAt(size: 2 | 4 | 8, x: number, y: number): number {
  let m = bayerCache.get(size);
  if (!m) {
    m = bayerMatrix(size);
    bayerCache.set(size, m);
  }
  const mx = ((x % size) + size) % size;
  const my = ((y % size) + size) % size;
  return m[my * size + mx] ?? 0.5;
}

/** Ink or no ink for each value in 0..1, row-major. `bayer` 0 cuts flat at `level`; 2, 4, or 8 dithers
 *  around `level` with that Bayer matrix. Ink goes where a value reaches its threshold. Returns 1 where
 *  ink goes. */
function threshold(values: ArrayLike<number>, width: number, height: number, level = 0.5, bayer: 0 | 2 | 4 | 8 = 0): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const cut = bayer === 0 ? level : level + bayerAt(bayer, x, y) - 0.5;
      out[i] = (values[i] ?? 0) >= cut ? 1 : 0;
    }
  }
  return out;
}

type Diffusion = "floyd-steinberg" | "atkinson";

const KERNELS: Record<Diffusion, readonly (readonly [number, number, number])[]> = {
  "floyd-steinberg": [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
  // Atkinson spreads three quarters of the error, which keeps highlights and shadows cleaner.
  atkinson: [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]],
};

/** Error diffusion over ink values in 0..1, row-major. Returns 1 where ink goes. The input is not changed. */
function diffuse(values: ArrayLike<number>, width: number, height: number, kernel: Diffusion): Uint8Array {
  const v = Float32Array.from(values);
  const out = new Uint8Array(width * height);
  const taps = KERNELS[kernel];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const old = v[i] ?? 0;
      const bit = old >= 0.5 ? 1 : 0;
      out[i] = bit;
      const error = old - bit;
      for (const [dx, dy, weight] of taps) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny < height) {
          const j = ny * width + nx;
          v[j] = (v[j] ?? 0) + error * weight;
        }
      }
    }
  }
  return out;
}

// lib/rng.ts
/** Seeded pseudo-random numbers in [0, 1), mulberry32. The same seed gives the same sequence,
 *  which is what makes every capture reproducible. */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The final mixing step of the lowbias32 integer hash: every input bit affects every output bit. */
function hashMix(h: number): number {
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** A new seed from a seed and one or two integers, for an independent stream per column, cell, or burst:
 *  createRng(hashSeed(seed, column, epoch)). Neighboring inputs give unrelated seeds. */
function hashSeed(seed: number, a: number, b = 0): number {
  return hashMix(hashMix(hashMix(seed >>> 0) ^ (a >>> 0)) ^ (b >>> 0));
}

// lib/dither-mask.ts
/** Threshold masks beyond the Bayer matrix in lib/dither.ts, and the ordered dithers that read them. Blue
 *  noise scatters ink so evenly that no structure shows; a clustered dot screen gathers it into growing dots,
 *  the way a printed halftone does. Every mask here holds the same evenly spaced thresholds, one per cell,
 *  so swapping one for another changes the grain and not the tone. */


/** Width of the filter that finds voids and clusters, in pixels, from Ulichney's paper. */
const VOID_SIGMA = 1.5;

const blueNoiseCache = new Map<number, Float32Array>();

/** A size by size blue noise mask, row-major, each value in (0, 1). Blue noise carries no low frequency
 *  energy, so ink lands evenly at every level with none of the crosshatch a Bayer matrix leaves. Built by
 *  void and cluster (Ulichney 1993): scatter a sparse pattern, then move ink from the tightest cluster to the
 *  largest void until it settles, then rank every pixel by the order it joins or leaves that pattern. Each
 *  size is built once and shared, because 64 takes real time, so read the array and never write into it. */
function blueNoiseMatrix(size: 16 | 32 | 64): Float32Array {
  const kept = blueNoiseCache.get(size);
  if (kept) return kept;
  const n = size * size;
  const pattern = new Uint8Array(n);
  const energy = new Float32Array(n);
  // The filter wraps, and stays narrower than the mask, so every pixel receives the same total energy from a
  // full pattern. That is why the second half of the ranking needs no rule of its own: with the total fixed,
  // the largest void among the zeros is also the tightest cluster of them.
  const radius = Math.min(Math.ceil(VOID_SIGMA * 3), (size >> 1) - 1);
  const span = radius * 2 + 1;
  const kernel = new Float32Array(span * span);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      kernel[(dy + radius) * span + dx + radius] = Math.exp(-(dx * dx + dy * dy) / (2 * VOID_SIGMA * VOID_SIGMA));
    }
  }

  /** Adds the filter, or subtracts it with a sign of -1, around the pixel at `index`. */
  const spread = (index: number, sign: number): void => {
    const cx = index % size;
    const cy = (index - cx) / size;
    for (let dy = -radius; dy <= radius; dy++) {
      const row = ((((cy + dy) % size) + size) % size) * size;
      const krow = (dy + radius) * span;
      for (let dx = -radius; dx <= radius; dx++) {
        const x = (((cx + dx) % size) + size) % size;
        energy[row + x] = (energy[row + x] ?? 0) + sign * (kernel[krow + dx + radius] ?? 0);
      }
    }
  };

  /** The 1 with the most ink around it, or with `most` off the 0 with the least. Ties go to the lower index,
   *  so the mask is the same everywhere. */
  const peak = (want: number, most: boolean): number => {
    let best = 0;
    let bestEnergy = Number.NaN;
    for (let i = 0; i < n; i++) {
      if (pattern[i] !== want) continue;
      const e = energy[i] ?? 0;
      if (Number.isNaN(bestEnergy) || (most ? e > bestEnergy : e < bestEnergy)) {
        best = i;
        bestEnergy = e;
      }
    }
    return best;
  };

  const ones = Math.max(1, Math.round(n / 10));
  const scatter = createRng(size);
  for (let placed = 0; placed < ones; ) {
    const i = Math.floor(scatter() * n);
    if (pattern[i] === 0) {
      pattern[i] = 1;
      spread(i, 1);
      placed++;
    }
  }

  // Even the sparse pattern out: take the tightest cluster's ink and put it in the largest void, until the
  // void the move opens is the one it just left. The bound only guards against a cycle; it settles long before.
  for (let pass = 0; pass < n; pass++) {
    const cluster = peak(1, true);
    pattern[cluster] = 0;
    spread(cluster, -1);
    const hole = peak(0, false);
    if (hole === cluster) {
      pattern[cluster] = 1;
      spread(cluster, 1);
      break;
    }
    pattern[hole] = 1;
    spread(hole, 1);
  }

  // Rank downward by emptying that pattern one tightest cluster at a time, then upward from a copy of it by
  // filling one largest void at a time. Every pixel gets exactly one rank.
  const rank = new Int32Array(n);
  const settled = pattern.slice();
  for (let r = ones - 1; r >= 0; r--) {
    const cluster = peak(1, true);
    pattern[cluster] = 0;
    spread(cluster, -1);
    rank[cluster] = r;
  }
  pattern.set(settled);
  energy.fill(0);
  for (let i = 0; i < n; i++) if (pattern[i] === 1) spread(i, 1);
  for (let r = ones; r < n; r++) {
    const hole = peak(0, false);
    pattern[hole] = 1;
    spread(hole, 1);
    rank[hole] = r;
  }

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = ((rank[i] ?? 0) + 0.5) / n;
  blueNoiseCache.set(size, out);
  return out;
}

const clusterCache = new Map<number, Float32Array>();

/** A size by size clustered dot screen, row-major, each value in (0, 1). Ink grows as round dots on a
 *  lattice turned 45 degrees, with a dot centre at the tile's corner and another at its middle, so a
 *  gradient reads as a printed halftone rather than as scattered pixels. Shared like the mask above. */
function clusterMatrix(size: 4 | 8): Float32Array {
  const kept = clusterCache.get(size);
  if (kept) return kept;
  const n = size * size;
  // Two cosines along the turned axes: their peaks are the dot centres, and the fall from a peak is the
  // order ink fills in around it.
  const turn = (Math.PI * 2) / size;
  const spot = new Float32Array(n);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) spot[y * size + x] = Math.cos(turn * (x + y)) + Math.cos(turn * (y - x));
  }
  const order = Array.from({ length: n }, (_, i) => i);
  // Ties go to the lower index, so the screen is the same everywhere.
  order.sort((a, b) => (spot[b] ?? 0) - (spot[a] ?? 0) || a - b);
  const out = new Float32Array(n);
  order.forEach((index, r) => {
    out[index] = (r + 0.5) / n;
  });
  clusterCache.set(size, out);
  return out;
}

/** The threshold a tiled mask puts at pixel (x, y). Negative coordinates wrap like any other. */
function maskAt(mask: ArrayLike<number>, size: number, x: number, y: number): number {
  const mx = ((x % size) + size) % size;
  const my = ((y % size) + size) % size;
  return mask[my * size + mx] ?? 0.5;
}

/** Ink or no ink for each value in 0..1, row-major, dithered against any tiled mask. Ink goes where a value
 *  reaches `level + threshold - 0.5`, the same cut lib/dither.ts makes, so a mask can replace a Bayer matrix
 *  in place. `shift` moves every threshold along and wraps it, which moves which pixels carry the ink while
 *  the count holds: step it by 0.618 each frame for a grain that crawls under a tone that does not. */
function thresholdMask(
  values: ArrayLike<number>,
  width: number,
  height: number,
  mask: ArrayLike<number>,
  size: number,
  level = 0.5,
  shift = 0,
): Uint8Array {
  const out = new Uint8Array(width * height);
  const turn = ((shift % 1) + 1) % 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const t = maskAt(mask, size, x, y) + turn;
      out[i] = (values[i] ?? 0) >= level + (t >= 1 ? t - 1 : t) - 0.5 ? 1 : 0;
    }
  }
  return out;
}

/** The same ordered dither quantized to `levels` bands rather than to ink or no ink, row-major. Returns the
 *  band each pixel falls in, from 0 to levels - 1, which a caller reads as a ramp index or a shade. */
function ditherLevels(
  values: ArrayLike<number>,
  width: number,
  height: number,
  levels: number,
  mask: ArrayLike<number>,
  size: number,
): Uint8Array {
  const top = Math.max(1, Math.min(255, Math.floor(levels) - 1));
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const scaled = Math.min(1, Math.max(0, values[i] ?? 0)) * top;
      const band = Math.floor(scaled);
      out[i] = Math.min(top, band + (scaled - band >= maskAt(mask, size, x, y) ? 1 : 0));
    }
  }
  return out;
}

// lib/json.ts
/** Comparing props that hold JSON. React passes fresh arrays and objects on every render, so a core compares
 *  them by content before deciding what to rebuild. */

/** Deep equality for JSON values. */
function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!sameJson(a[i], b[i])) return false;
    }
    return true;
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(right, key) || !sameJson(left[key], right[key])) return false;
  }
  return true;
}

/** Whether any of `keys` holds a different value in `after` than in `before`, compared as JSON. */
function changed<P>(before: P, after: P, keys: readonly (keyof P)[]): boolean {
  return keys.some((key) => !sameJson(before[key], after[key]));
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
  /** The frame shown under prefers-reduced-motion, in milliseconds of animation time. */
  still: number;
}

interface LoopOptions extends LoopState {
  /** Element whose visibility on screen gates the loop. */
  el: Element;
  /** Draws the frame for animation time `t`, in milliseconds. `reduced` is true while the viewer asks for
   *  reduced motion, so a core can drop pointer effects then too. */
  frame: (t: number, reduced: boolean) => void;
}

interface Loop {
  update(state: Partial<LoopState>): void;
  /** Draws the current frame again, for example after a resize. */
  redraw(): void;
  /** Whether the viewer asks for reduced motion right now. */
  readonly reduced: boolean;
  destroy(): void;
}

/** A gap longer than this, such as a tab switch, advances the animation by this much at most. */
const MAX_STEP_MS = 100;

function createLoop(options: LoopOptions): Loop {
  const { el, frame } = options;
  let state: LoopState = { paused: options.paused, time: options.time, fps: options.fps, still: options.still };
  let t = 0;
  let last = 0;
  let raf = 0;
  let onScreen = true;
  let tabVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
  const motionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  let reduced = motionQuery?.matches ?? false;

  const animating = (): boolean =>
    !state.paused && state.time === null && !reduced && onScreen && tabVisible;
  const heldTime = (): number => (state.time !== null ? state.time : reduced ? state.still : t);

  function tick(now: number): void {
    raf = 0;
    if (!animating()) return;
    if (last === 0) last = now;
    const elapsed = now - last;
    // One millisecond of tolerance so a 60 Hz display lands evenly on a 30 fps ceiling.
    if (elapsed >= 1000 / Math.max(1, state.fps) - 1) {
      t += Math.min(elapsed, MAX_STEP_MS);
      last = now;
      frame(t, reduced);
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
    if (!go && drawHeld) frame(heldTime(), reduced);
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

  frame(heldTime(), reduced);
  sync(false);

  return {
    update(next) {
      const timeChanged = next.time !== undefined && next.time !== state.time;
      state = { ...state, ...next };
      if (state.time !== null) t = state.time;
      sync(timeChanged || next.paused !== undefined || next.still !== undefined);
    },
    redraw() {
      frame(heldTime(), reduced);
    },
    get reduced() {
      return reduced;
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

// registry/sections/clay-hero/core.ts
/** One call to action: a link's visible text and destination. */
export interface ClayHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface ClayHeroProps extends MotionProps {
  /** The headline, set large in the page's own typeface. Empty hides it. */
  headline: string;
  /** Support under the headline, drawn in the muted color. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as links. At most three show, and the first fills with the accent. */
  actions: readonly ClayHeroAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** How many clay forms settle behind the content, from 2 to 6. */
  forms: number;
  /** Radius multiplier on every form. */
  scale: number;
  /** Tone bands each form is screened into, from 2 to 4. */
  levels: number;
  /** Contrast between the darkest and the lightest band, from 0 to 1. */
  depth: number;
  /** The screen the bands are dithered with: "blue" noise, a "cluster" dot screen, or a "bayer" matrix. */
  mask: "blue" | "cluster" | "bayer";
  /** CSS pixels each screened cell covers before the canvas is scaled up. */
  pixel: number;
  /** How fast the forms drift and deform. 0 holds them still. */
  speed: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: ClayHeroProps = {
  headline: "Soft shapes, hard edges.",
  subhead: "Inflated forms settle behind the type, each shaded in a handful of screened tone bands.",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  minHeight: 72,
  forms: 4,
  scale: 1,
  levels: 4,
  depth: 0.75,
  mask: "blue",
  pixel: 4,
  speed: 1,
  fps: 15,
  paused: false,
  time: null,
  seed: 1,
};

/** Animation time reduced motion holds, in milliseconds. */
const STILL_TIME = 1200;
/** Cell count of each screen: the dispersed mask and the dot screen from lib/dither-mask.ts, the ordered
 *  matrix from lib/dither.ts. */
const BLUE_SIZE = 32;
const CLUSTER_SIZE = 8;
const BAYER_SIZE = 8;
/** The one direction light comes from, from the upper left and only a little toward the viewer, so a
 *  form's flat facing interior holds its mid band and the lightest band lands on the rim as a crescent. */
const LIGHT = [-0.5, -0.55, 0.45] as const;
const LIGHT_LEN = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
const LIGHT_X = LIGHT[0] / LIGHT_LEN;
const LIGHT_Y = LIGHT[1] / LIGHT_LEN;
const LIGHT_Z = LIGHT[2] / LIGHT_LEN;
/** The dome shading each form carries: a mid the flat facing interior holds, a bias that keeps the
 *  lightest band to the rim that faces the light, and a gain the depth prop scales. */
const SHADE_MID = 0.55;
const SHADE_BIAS = 0.35;
const SHADE_GAIN = 0.5;
/** Alpha of a muted form's mid band, and of the accent form's, on each ground. The forms stay a backdrop,
 *  so both sit well under full ink, and the light ground carries a little more so the body still shows. */
const MUTED_ALPHA_DARK = 0.4;
const MUTED_ALPHA_LIGHT = 0.6;
const ACCENT_ALPHA_DARK = 0.55;
const ACCENT_ALPHA_LIGHT = 0.65;

/** A color as parseColor returns it: red, green, blue, alpha, each 0 to 255. */
type Rgba = readonly [number, number, number, number];

/** Where one form sits and how large it is. `x` and `y` are fractions of the host, `r` a fraction of its
 *  shorter side. The list is the z order too: later forms draw over earlier ones. The accent pebble rides
 *  second, so it is always present at the default count. */
interface FormSpec {
  x: number;
  y: number;
  r: number;
  accent: boolean;
}

const FORM_SPECS: readonly FormSpec[] = [
  { x: 0.72, y: 0.46, r: 0.34, accent: false },
  { x: 0.24, y: 0.8, r: 0.14, accent: true },
  { x: 0.91, y: 0.18, r: 0.16, accent: false },
  { x: 0.08, y: 0.2, r: 0.1, accent: false },
  { x: 0.46, y: 0.09, r: 0.08, accent: false },
  { x: 0.94, y: 0.74, r: 0.12, accent: false },
];

/** A form's seeded motion: a slow drift, a slower breath, and three harmonics that wobble its silhouette.
 *  Every number comes from the seed, so the same seed and time always draw the same frame. */
interface LiveForm {
  spec: FormSpec;
  /** Drift amplitude, as a fraction of the host's shorter side. */
  driftX: number;
  driftY: number;
  /** Drift rates, in radians per millisecond at speed 1. */
  rateX: number;
  rateY: number;
  phaseX: number;
  phaseY: number;
  /** Breathing amplitude, rate, and phase of the radius. */
  breathe: number;
  breatheRate: number;
  breathePhase: number;
  /** Deformation harmonics of the edge angle: amplitude, order, phase, and rate each. */
  amp: [number, number, number];
  order: [number, number, number];
  phase: [number, number, number];
  rate: [number, number, number];
}

/** Keeps a number inside 0 to 1. */
function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** Scales a color's alpha and leaves its channels alone. */
function dimRgba(color: Rgba, k: number): Rgba {
  return [color[0], color[1], color[2], color[3] * k];
}

/** Blends two colors channel by channel, alpha included. */
function mixRgba(a: Rgba, b: Rgba, t: number): Rgba {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}

/** The band colors of one form, darkest to lightest, resampled to the level count. On a dark ground the
 *  form sits low against it and its lit edge climbs toward the ink; on a light one the body lifts toward
 *  the paper and the unlit rim sinks toward the ink. Either way the bands are steps of one color, so a
 *  form never carries a shadow, only tone. */
function rampOf(base: Rgba, fg: Rgba, lightOnDark: boolean, levels: number): Rgba[] {
  const stops: Rgba[] = lightOnDark
    ? [dimRgba(base, 0.35), dimRgba(base, 0.65), base, mixRgba(base, fg, 0.45)]
    : [mixRgba(base, fg, 0.45), dimRgba(base, 0.9), dimRgba(base, 0.7), dimRgba(base, 0.4)];
  const top = stops.length - 1;
  const out: Rgba[] = [];
  for (let k = 0; k < levels; k++) {
    const pos = (levels === 1 ? 0 : k / (levels - 1)) * top;
    const i0 = Math.min(top - 1, Math.floor(pos));
    out.push(mixRgba(stops[i0] ?? base, stops[i0 + 1] ?? base, pos - i0));
  }
  return out;
}

/** The forms for the current seed and count, each with its own stream so a reorder never reshuffles the rest. */
function buildLiveForms(seed: number, count: number): LiveForm[] {
  const turn = Math.PI * 2;
  return FORM_SPECS.slice(0, Math.max(2, Math.min(FORM_SPECS.length, Math.round(count)))).map((spec, i) => {
    const rng = createRng(hashSeed(seed, i));
    const slow = (lo: number, hi: number): number => (lo + rng() * (hi - lo)) * (rng() < 0.5 ? -1 : 1);
    return {
      spec,
      driftX: 0.012 + rng() * 0.02,
      driftY: 0.012 + rng() * 0.02,
      rateX: slow(0.00025, 0.0006),
      rateY: slow(0.00025, 0.0006),
      phaseX: rng() * turn,
      phaseY: rng() * turn,
      breathe: 0.02 + rng() * 0.035,
      breatheRate: slow(0.0004, 0.0009),
      breathePhase: rng() * turn,
      amp: [0.05 + rng() * 0.09, 0.03 + rng() * 0.07, 0.02 + rng() * 0.05],
      order: [2 + Math.floor(rng() * 3), 3 + Math.floor(rng() * 3), 4 + Math.floor(rng() * 3)],
      phase: [rng() * turn, rng() * turn, rng() * turn],
      rate: [slow(0.0005, 0.0013), slow(0.0005, 0.0013), slow(0.0005, 0.0013)],
    };
  });
}

/** Creates one element the core owns, marked so the scoped rules can find it. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

export const mount: Mount<ClayHeroProps> = (host, initial = {}) => {
  let props: ClayHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);

  // The canvas sits in an under layer below the wrapped content, so the forms read as objects behind the
  // type and the type keeps its place, its font, and its hit testing.
  const under = layer(host, "under");
  const surface = createCanvas(under.el, {
    autoSize: false,
    css: "image-rendering:pixelated",
    onResize: () => {
      if (layout()) loop.redraw();
    },
  });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const pal = watchPalette(host, () => {
    buildRamps();
    loop.redraw();
  });

  // Everything the core adds lands after the children the page wrapped, so a page can put its own heading
  // first, or let the headline prop do it, or both.
  const headline = part("h1", "headline");
  const subhead = part("p", "subhead");
  const actions = part("div", "actions");
  host.append(headline, subhead, actions);

  let cols = 1;
  let rows = 1;
  let values = new Float32Array(1);
  let owner = new Int8Array(1);
  let imageData: ImageData | null = null;
  let liveForms: LiveForm[] = [];
  let ramps: Rgba[][] = [];
  let ground: Rgba = [0, 0, 0, 0];

  /** The scoped rules: the host's layout, the type, and the calls to action. Prose keeps the page's font;
   *  only size, weight, and tracking set the headline apart. The minimum height goes in a :where() rule,
   *  which carries no specificity at all, so a page that gives this host a height of its own wins. */
  function rulesText(): string {
    const s = sheet.selector;
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    const center = props.align === "center";
    const edge = center ? "center" : "flex-start";
    const textAlign = center ? "center" : "start";
    return [
      `:where(${s}){min-height:${vh(props.minHeight)}vh}`,
      `${s}{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${edge};gap:0.9em;padding:clamp(1.5rem,6vw,5rem);color:${fg};text-align:${textAlign}}`,
      `${s} > :not([data-pica]){margin-block:0;max-width:44rem;text-align:${textAlign}}`,
      `${s} > :is(h1,h2,h3){margin-block:0;max-width:14em;font-size:clamp(2.5rem,6.5vw,4.75rem);line-height:1.04;font-weight:600;letter-spacing:-0.02em;color:${fg};text-wrap:balance;overflow-wrap:break-word}`,
      `${s} > p:not([data-pica]){color:${muted}}`,
      `${s} > [data-pica-subhead]{margin-block:0;max-width:52ch;font-size:clamp(1.02rem,1.35vw,1.18rem);line-height:1.5;color:${muted};overflow-wrap:break-word}`,
      `${s} > :is(h1,h2,h3):empty,${s} > [data-pica-subhead]:empty{display:none}`,
      `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;margin-top:0.7em;max-width:44rem;justify-content:${edge}}`,
      `${s} > [data-pica-actions]:empty{display:none}`,
      `${s} > [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.3em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
      `${s} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
      `${s} > [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
      `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
      `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
      `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    ].join("\n");
  }

  /** Writes the text parts. An empty prop leaves an empty element, which the :empty rule hides. */
  function renderText(): void {
    headline.textContent = props.headline;
    subhead.textContent = props.subhead;
  }

  /** Rebuilds the action links from JSON: at most three, the first solid in the accent, the rest outline. */
  function renderActions(): void {
    actions.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.dataset.variant = i === 0 ? "solid" : "outline";
      a.href = action.href || "#";
      a.textContent = action.label;
      actions.append(a);
    }
  }

  /** Recomputes the low resolution grid from the host and the pixel prop. Returns true when it changed. */
  function layout(): boolean {
    const cell = Math.max(1, props.pixel);
    const w = Math.max(1, Math.round(surface.cssWidth / cell));
    const h = Math.max(1, Math.round(surface.cssHeight / cell));
    if (w === cols && h === rows && imageData) return false;
    cols = w;
    rows = h;
    canvas.width = cols;
    canvas.height = rows;
    imageData = ctx ? ctx.createImageData(cols, rows) : null;
    values = new Float32Array(cols * rows);
    owner = new Int8Array(cols * rows);
    return true;
  }

  /** Rebuilds the seeded motion of every form. Called again only when the seed or the count changes. */
  function buildForms(): void {
    liveForms = buildLiveForms(props.seed, props.forms);
  }

  /** Rebuilds each form's band colors and the ground fill from the current palette. On a dark ground the
   *  bands climb toward the ink; on a light one they sink toward it, so the lightest band always sits on
   *  the same side of the form as the light. */
  function buildRamps(): void {
    const colors = pal.colors;
    ground = parseColor(colors.bg);
    const fg = parseColor(colors.fg);
    const muted = parseColor(colors.muted);
    const accent = parseColor(colors.accent);
    const lightOnDark = ground[3] > 0
      ? relativeLuminance(colors.fg) > relativeLuminance(colors.bg)
      : hostTone(host) === "light-on-dark";
    const bandCount = Math.max(2, Math.min(4, Math.round(props.levels)));
    const mutedBase: Rgba = [muted[0], muted[1], muted[2], 255 * (lightOnDark ? MUTED_ALPHA_DARK : MUTED_ALPHA_LIGHT)];
    const accentBase: Rgba = [accent[0], accent[1], accent[2], 255 * (lightOnDark ? ACCENT_ALPHA_DARK : ACCENT_ALPHA_LIGHT)];
    ramps = liveForms.map((f) => rampOf(f.spec.accent ? accentBase : mutedBase, fg, lightOnDark, bandCount));
  }

  /** Paints one frame: the ground, then each form's silhouette filled with its shaded value, screened into
   *  bands by the chosen mask. A pixel inside several forms takes the last form's shading, which is what
   *  the z order means. */
  function draw(t: number): void {
    if (!ctx || !imageData) {
      host.dataset.picaReady = "true";
      return;
    }
    const n = cols * rows;
    owner.fill(-1);
    values.fill(0);
    const span = Math.min(cols, rows);
    const speed = Math.max(0, props.speed);
    const gain = 0.25 + 0.95 * clamp01(props.depth);
    for (let fi = 0; fi < liveForms.length; fi++) {
      const f = liveForms[fi];
      if (!f) continue;
      const r0 =
        f.spec.r * span * Math.max(0.05, props.scale) * (1 + f.breathe * Math.sin(f.breathePhase + f.breatheRate * speed * t));
      if (r0 < 1) continue;
      const cx = f.spec.x * cols + f.driftX * span * Math.sin(f.phaseX + f.rateX * speed * t);
      const cy = f.spec.y * rows + f.driftY * span * Math.cos(f.phaseY + f.rateY * speed * t);
      const w0 = f.phase[0] + f.rate[0] * speed * t;
      const w1 = f.phase[1] + f.rate[1] * speed * t;
      const w2 = f.phase[2] + f.rate[2] * speed * t;
      const rmax = r0 * (1 + f.amp[0] + f.amp[1] + f.amp[2]) + 1;
      const x0 = Math.max(0, Math.floor(cx - rmax));
      const x1 = Math.min(cols, Math.ceil(cx + rmax));
      const y0 = Math.max(0, Math.floor(cy - rmax));
      const y1 = Math.min(rows, Math.ceil(cy + rmax));
      for (let y = y0; y < y1; y++) {
        const dy = y + 0.5 - cy;
        for (let x = x0; x < x1; x++) {
          const dx = x + 0.5 - cx;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= rmax) continue;
          const th = Math.atan2(dy, dx);
          const rth =
            r0 *
            (1 +
              f.amp[0] * Math.sin(f.order[0] * th + w0) +
              f.amp[1] * Math.sin(f.order[1] * th + w1) +
              f.amp[2] * Math.sin(f.order[2] * th + w2));
          if (d >= rth) continue;
          const ux = dx / rth;
          const uy = dy / rth;
          const z = Math.sqrt(Math.max(0, 1 - ux * ux - uy * uy));
          const raw = SHADE_MID + SHADE_GAIN * (ux * LIGHT_X + uy * LIGHT_Y + z * LIGHT_Z - SHADE_BIAS);
          const i = y * cols + x;
          values[i] = clamp01(0.5 + (raw - 0.5) * gain);
          owner[i] = fi;
        }
      }
    }
    const bandCount = Math.max(2, Math.min(4, Math.round(props.levels)));
    const mask = props.mask === "cluster" ? clusterMatrix(CLUSTER_SIZE) : props.mask === "bayer" ? bayerMatrix(BAYER_SIZE) : blueNoiseMatrix(BLUE_SIZE);
    const maskSize = props.mask === "cluster" ? CLUSTER_SIZE : props.mask === "bayer" ? BAYER_SIZE : BLUE_SIZE;
    const bands = ditherLevels(values, cols, rows, bandCount, mask, maskSize);
    const data = imageData.data;
    for (let i = 0; i < n; i++) {
      const o = owner[i] ?? -1;
      const c = o < 0 ? ground : (ramps[o]?.[bands[i] ?? 0] ?? ground);
      const j = i * 4;
      data[j] = c[0];
      data[j + 1] = c[1];
      data[j + 2] = c[2];
      data[j + 3] = c[3];
    }
    ctx.putImageData(imageData, 0, 0);
    host.dataset.picaReady = "true";
  }

  sheet.setRules(rulesText());
  renderText();
  renderActions();
  layout();
  buildForms();
  buildRamps();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (pal.refresh()) buildRamps();
      if (props.headline !== before.headline || props.subhead !== before.subhead) renderText();
      if (!sameJson(before.actions, props.actions)) renderActions();
      if (props.align !== before.align || props.minHeight !== before.minHeight) sheet.setRules(rulesText());
      if (props.seed !== before.seed || props.forms !== before.forms) {
        buildForms();
        buildRamps();
      } else if (props.levels !== before.levels) {
        buildRamps();
      }
      if (props.pixel !== before.pixel) layout();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      surface.destroy();
      pal.destroy();
      under.remove();
      headline.remove();
      subhead.remove();
      actions.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/clay-hero/index.tsx
export type ClayHeroComponentProps = Partial<ClayHeroProps> & WrapperProps & { children?: ReactNode };

/** A page hero that settles soft, banded clay forms behind the content the page wraps. */
export function ClayHero({ className, style, palette, children, ...props }: ClayHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Clay Hero · clay-hero
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Clay Hero · Pica</title>
<style>:root { --pica-accent: #13C4A3; }
html, body { margin: 0; height: 100%; background: #0a0a0a; color: #f1f1ef; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
@media (prefers-color-scheme: light) { html:not([data-ground]), html:not([data-ground]) body { background: #f1f1ef; color: #0a0a0a; } }
html[data-ground="paper"], html[data-ground="paper"] body { background: #f1f1ef; color: #0a0a0a; }
html[data-ground="checker"] body { background: repeating-conic-gradient(#161616 0% 25%, #0a0a0a 0% 50%) 50% / 24px 24px; }
#pica { width: 100%; height: 100%; }
html[data-stage="flow"] #pica, html[data-stage="flow"] #root > * { height: auto; min-height: 100vh; }
.pica-stage { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: clamp(20px, 3.2vw, 40px); }
.pica-stage #pica { width: auto; height: auto; }
.pica-stage span#pica, .pica-stage div#pica { display: inline-block; }</style>
</head>
<body>
<div id="pica"><h1>Clay, drawn in flat ink.</h1></div>
<script>
"use strict";
var PicaClayHero = (() => {
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

  // registry/sections/clay-hero/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/palette.ts
  var TOKENS = ["fg", "bg", "accent", "muted"];
  var TOKEN_FALLBACK = {
    fg: "currentColor",
    bg: "transparent",
    accent: "#13C4A3",
    muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)"
  };
  function cssVar(token) {
    return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
  }
  function cssOn(token) {
    return `oklch(from ${cssVar(token)} clamp(0, (0.62 - l) * 1000, 1) 0 0)`;
  }
  var PROBE_EVENTS = ["transitionrun", "transitionstart", "transitionend", "transitioncancel"];
  function createProbe(host) {
    const probe = document.createElement("span");
    probe.setAttribute("data-pica", "");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = [
      "position:absolute",
      "width:0",
      "height:0",
      "overflow:hidden",
      "visibility:hidden",
      "pointer-events:none",
      `color:${cssVar("fg")}`,
      `background-color:${cssVar("bg")}`,
      `border-top:0 solid ${cssVar("accent")}`,
      `outline:0 solid ${cssVar("muted")}`,
      // A 1 ms transition turns any change to a token into a transitionend event, which watchPalette hears.
      "transition:color 1ms,background-color 1ms,border-top-color 1ms,outline-color 1ms"
    ].join(";");
    host.appendChild(probe);
    return probe;
  }
  function probeColors(probe) {
    const style = getComputedStyle(probe);
    return { fg: style.color, bg: style.backgroundColor, accent: style.borderTopColor, muted: style.outlineColor };
  }
  function readPalette(host) {
    const probe = createProbe(host);
    const colors = probeColors(probe);
    probe.remove();
    return colors;
  }
  function watchPalette(host, onChange) {
    const probe = createProbe(host);
    let colors = probeColors(probe);
    function refresh() {
      const next = probeColors(probe);
      const differs = TOKENS.some((token) => next[token] !== colors[token]);
      colors = next;
      return differs;
    }
    const onEvent = (event) => {
      event.stopPropagation();
      if (event.type === "transitionend" && refresh()) onChange(colors);
    };
    for (const type of PROBE_EVENTS) probe.addEventListener(type, onEvent);
    return {
      get colors() {
        return colors;
      },
      refresh,
      destroy() {
        for (const type of PROBE_EVENTS) probe.removeEventListener(type, onEvent);
        probe.remove();
      }
    };
  }

  // lib/color.ts
  var colorProbe;
  function parseColor(color) {
    if (colorProbe === void 0) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      colorProbe = canvas.getContext("2d", { willReadFrequently: true });
    }
    if (!colorProbe) return [0, 0, 0, 0];
    colorProbe.clearRect(0, 0, 1, 1);
    colorProbe.fillStyle = "rgba(0, 0, 0, 0)";
    colorProbe.fillStyle = color;
    colorProbe.fillRect(0, 0, 1, 1);
    const d = colorProbe.getImageData(0, 0, 1, 1).data;
    return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0, d[3] ?? 0];
  }
  function relativeLuminance(color) {
    const [r, g, b] = parseColor(color);
    const linear = (v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  }
  function inkColor(host) {
    return readPalette(host).fg;
  }
  function hostTone(host) {
    const fg = relativeLuminance(inkColor(host));
    let bg = 1;
    for (let el = host; el; el = el.parentElement) {
      const background = getComputedStyle(el).backgroundColor;
      if (parseColor(background)[3] > 0) {
        bg = relativeLuminance(background);
        break;
      }
    }
    return fg > bg ? "light-on-dark" : "dark-on-light";
  }

  // lib/host.ts
  function nextSerial() {
    const g = globalThis;
    g.__picaSerial = (g.__picaSerial ?? 0) + 1;
    return g.__picaSerial;
  }
  var unstyled = /* @__PURE__ */ new WeakMap();
  function styleHost(host, styles) {
    if (!unstyled.has(host)) unstyled.set(host, !host.hasAttribute("style"));
    const before = Object.keys(styles).map(
      (name) => [name, host.style.getPropertyValue(name), host.style.getPropertyPriority(name)]
    );
    for (const [name, value] of Object.entries(styles)) host.style.setProperty(name, value);
    let restored = false;
    return () => {
      if (restored) return;
      restored = true;
      for (const [name, value, priority] of before) {
        if (value) host.style.setProperty(name, value, priority);
        else host.style.removeProperty(name);
      }
      if (host.style.length === 0 && unstyled.get(host)) host.removeAttribute("style");
    };
  }
  function layer(host, where, tag = "div") {
    const el = document.createElement(tag);
    el.setAttribute("data-pica", "");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:${where === "under" ? -1 : 1}`;
    const styles = {};
    if (getComputedStyle(host).position === "static") styles.position = "relative";
    if (where === "under") styles.isolation = "isolate";
    const restore = styleHost(host, styles);
    if (where === "under") host.prepend(el);
    else host.append(el);
    return {
      el,
      remove() {
        el.remove();
        restore();
      }
    };
  }
  function scope(host) {
    const id = String(nextSerial());
    host.setAttribute("data-pica-id", id);
    const style = document.createElement("style");
    style.setAttribute("data-pica", "");
    host.append(style);
    return {
      selector: `[data-pica-id="${id}"]`,
      setRules(css) {
        style.textContent = css;
      },
      destroy() {
        style.remove();
        host.removeAttribute("data-pica-id");
      }
    };
  }

  // lib/canvas.ts
  function createCanvas(host, options = {}) {
    const { maxDpr = 2, maxPixels = Number.POSITIVE_INFINITY, autoSize = true, css = "", onResize } = options;
    const restore = styleHost(
      host,
      getComputedStyle(host).position === "static" ? { position: "relative", overflow: "hidden" } : { overflow: "hidden" }
    );
    const canvas = document.createElement("canvas");
    canvas.setAttribute("data-pica", "");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;${css}`;
    host.appendChild(canvas);
    let cssWidth = -1;
    let cssHeight = -1;
    let width = 0;
    let height = 0;
    let dpr = 1;
    function measure() {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === cssWidth && h === cssHeight) return false;
      cssWidth = w;
      cssHeight = h;
      dpr = Math.min(globalThis.devicePixelRatio || 1, maxDpr, Math.sqrt(maxPixels / (Math.max(1, w) * Math.max(1, h))));
      if (autoSize) {
        width = Math.max(1, Math.round(w * dpr));
        height = Math.max(1, Math.round(h * dpr));
        canvas.width = width;
        canvas.height = height;
      }
      return true;
    }
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
      if (measure()) onResize?.(cssWidth, cssHeight);
    }) : null;
    observer?.observe(host);
    return {
      canvas,
      get width() {
        return width;
      },
      get height() {
        return height;
      },
      get dpr() {
        return dpr;
      },
      get cssWidth() {
        return cssWidth;
      },
      get cssHeight() {
        return cssHeight;
      },
      destroy() {
        observer?.disconnect();
        canvas.remove();
        restore();
      }
    };
  }

  // lib/dither.ts
  function bayerMatrix(size) {
    let m = [0];
    let n = 1;
    while (n < size) {
      const next = new Array(4 * n * n).fill(0);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const v = 4 * (m[y * n + x] ?? 0);
          next[y * 2 * n + x] = v;
          next[y * 2 * n + x + n] = v + 2;
          next[(y + n) * 2 * n + x] = v + 3;
          next[(y + n) * 2 * n + x + n] = v + 1;
        }
      }
      m = next;
      n *= 2;
    }
    const out = new Float32Array(size * size);
    for (let i = 0; i < out.length; i++) out[i] = ((m[i] ?? 0) + 0.5) / (size * size);
    return out;
  }
  var KERNELS = {
    "floyd-steinberg": [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
    // Atkinson spreads three quarters of the error, which keeps highlights and shadows cleaner.
    atkinson: [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]]
  };

  // lib/rng.ts
  function createRng(seed) {
    let state = seed >>> 0;
    return () => {
      state = state + 1831565813 >>> 0;
      let t = state;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashMix(h) {
    h = Math.imul(h ^ h >>> 16, 2146121005);
    h = Math.imul(h ^ h >>> 15, 2221713035);
    return (h ^ h >>> 16) >>> 0;
  }
  function hashSeed(seed, a, b = 0) {
    return hashMix(hashMix(hashMix(seed >>> 0) ^ a >>> 0) ^ b >>> 0);
  }

  // lib/dither-mask.ts
  var VOID_SIGMA = 1.5;
  var blueNoiseCache = /* @__PURE__ */ new Map();
  function blueNoiseMatrix(size) {
    const kept = blueNoiseCache.get(size);
    if (kept) return kept;
    const n = size * size;
    const pattern = new Uint8Array(n);
    const energy = new Float32Array(n);
    const radius = Math.min(Math.ceil(VOID_SIGMA * 3), (size >> 1) - 1);
    const span = radius * 2 + 1;
    const kernel = new Float32Array(span * span);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        kernel[(dy + radius) * span + dx + radius] = Math.exp(-(dx * dx + dy * dy) / (2 * VOID_SIGMA * VOID_SIGMA));
      }
    }
    const spread = (index, sign) => {
      const cx = index % size;
      const cy = (index - cx) / size;
      for (let dy = -radius; dy <= radius; dy++) {
        const row = ((cy + dy) % size + size) % size * size;
        const krow = (dy + radius) * span;
        for (let dx = -radius; dx <= radius; dx++) {
          const x = ((cx + dx) % size + size) % size;
          energy[row + x] = (energy[row + x] ?? 0) + sign * (kernel[krow + dx + radius] ?? 0);
        }
      }
    };
    const peak = (want, most) => {
      let best = 0;
      let bestEnergy = Number.NaN;
      for (let i = 0; i < n; i++) {
        if (pattern[i] !== want) continue;
        const e = energy[i] ?? 0;
        if (Number.isNaN(bestEnergy) || (most ? e > bestEnergy : e < bestEnergy)) {
          best = i;
          bestEnergy = e;
        }
      }
      return best;
    };
    const ones = Math.max(1, Math.round(n / 10));
    const scatter = createRng(size);
    for (let placed = 0; placed < ones; ) {
      const i = Math.floor(scatter() * n);
      if (pattern[i] === 0) {
        pattern[i] = 1;
        spread(i, 1);
        placed++;
      }
    }
    for (let pass = 0; pass < n; pass++) {
      const cluster = peak(1, true);
      pattern[cluster] = 0;
      spread(cluster, -1);
      const hole = peak(0, false);
      if (hole === cluster) {
        pattern[cluster] = 1;
        spread(cluster, 1);
        break;
      }
      pattern[hole] = 1;
      spread(hole, 1);
    }
    const rank = new Int32Array(n);
    const settled = pattern.slice();
    for (let r = ones - 1; r >= 0; r--) {
      const cluster = peak(1, true);
      pattern[cluster] = 0;
      spread(cluster, -1);
      rank[cluster] = r;
    }
    pattern.set(settled);
    energy.fill(0);
    for (let i = 0; i < n; i++) if (pattern[i] === 1) spread(i, 1);
    for (let r = ones; r < n; r++) {
      const hole = peak(0, false);
      pattern[hole] = 1;
      spread(hole, 1);
      rank[hole] = r;
    }
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = ((rank[i] ?? 0) + 0.5) / n;
    blueNoiseCache.set(size, out);
    return out;
  }
  var clusterCache = /* @__PURE__ */ new Map();
  function clusterMatrix(size) {
    const kept = clusterCache.get(size);
    if (kept) return kept;
    const n = size * size;
    const turn = Math.PI * 2 / size;
    const spot = new Float32Array(n);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) spot[y * size + x] = Math.cos(turn * (x + y)) + Math.cos(turn * (y - x));
    }
    const order = Array.from({ length: n }, (_, i) => i);
    order.sort((a, b) => (spot[b] ?? 0) - (spot[a] ?? 0) || a - b);
    const out = new Float32Array(n);
    order.forEach((index, r) => {
      out[index] = (r + 0.5) / n;
    });
    clusterCache.set(size, out);
    return out;
  }
  function maskAt(mask, size, x, y) {
    const mx = (x % size + size) % size;
    const my = (y % size + size) % size;
    return mask[my * size + mx] ?? 0.5;
  }
  function ditherLevels(values, width, height, levels, mask, size) {
    const top = Math.max(1, Math.min(255, Math.floor(levels) - 1));
    const out = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const scaled = Math.min(1, Math.max(0, values[i] ?? 0)) * top;
        const band = Math.floor(scaled);
        out[i] = Math.min(top, band + (scaled - band >= maskAt(mask, size, x, y) ? 1 : 0));
      }
    }
    return out;
  }

  // lib/json.ts
  function sameJson(a, b) {
    if (a === b) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!sameJson(a[i], b[i])) return false;
      }
      return true;
    }
    const left = a;
    const right = b;
    const keys = Object.keys(left);
    if (keys.length !== Object.keys(right).length) return false;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(right, key) || !sameJson(left[key], right[key])) return false;
    }
    return true;
  }

  // lib/loop.ts
  var MAX_STEP_MS = 100;
  function createLoop(options) {
    const { el, frame } = options;
    let state = { paused: options.paused, time: options.time, fps: options.fps, still: options.still };
    let t = 0;
    let last = 0;
    let raf = 0;
    let onScreen = true;
    let tabVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
    const motionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    let reduced = motionQuery?.matches ?? false;
    const animating = () => !state.paused && state.time === null && !reduced && onScreen && tabVisible;
    const heldTime = () => state.time !== null ? state.time : reduced ? state.still : t;
    function tick(now) {
      raf = 0;
      if (!animating()) return;
      if (last === 0) last = now;
      const elapsed = now - last;
      if (elapsed >= 1e3 / Math.max(1, state.fps) - 1) {
        t += Math.min(elapsed, MAX_STEP_MS);
        last = now;
        frame(t, reduced);
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
      if (!go && drawHeld) frame(heldTime(), reduced);
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
    frame(heldTime(), reduced);
    sync(false);
    return {
      update(next) {
        const timeChanged = next.time !== void 0 && next.time !== state.time;
        state = { ...state, ...next };
        if (state.time !== null) t = state.time;
        sync(timeChanged || next.paused !== void 0 || next.still !== void 0);
      },
      redraw() {
        frame(heldTime(), reduced);
      },
      get reduced() {
        return reduced;
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

  // registry/sections/clay-hero/core.ts
  var defaults = {
    headline: "Soft shapes, hard edges.",
    subhead: "Inflated forms settle behind the type, each shaded in a handful of screened tone bands.",
    actions: [
      { label: "Browse components", href: "#components" },
      { label: "Read the docs", href: "#docs" }
    ],
    align: "start",
    minHeight: 72,
    forms: 4,
    scale: 1,
    levels: 4,
    depth: 0.75,
    mask: "blue",
    pixel: 4,
    speed: 1,
    fps: 15,
    paused: false,
    time: null,
    seed: 1
  };
  var STILL_TIME = 1200;
  var BLUE_SIZE = 32;
  var CLUSTER_SIZE = 8;
  var BAYER_SIZE = 8;
  var LIGHT = [-0.5, -0.55, 0.45];
  var LIGHT_LEN = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
  var LIGHT_X = LIGHT[0] / LIGHT_LEN;
  var LIGHT_Y = LIGHT[1] / LIGHT_LEN;
  var LIGHT_Z = LIGHT[2] / LIGHT_LEN;
  var SHADE_MID = 0.55;
  var SHADE_BIAS = 0.35;
  var SHADE_GAIN = 0.5;
  var MUTED_ALPHA_DARK = 0.4;
  var MUTED_ALPHA_LIGHT = 0.6;
  var ACCENT_ALPHA_DARK = 0.55;
  var ACCENT_ALPHA_LIGHT = 0.65;
  var FORM_SPECS = [
    { x: 0.72, y: 0.46, r: 0.34, accent: false },
    { x: 0.24, y: 0.8, r: 0.14, accent: true },
    { x: 0.91, y: 0.18, r: 0.16, accent: false },
    { x: 0.08, y: 0.2, r: 0.1, accent: false },
    { x: 0.46, y: 0.09, r: 0.08, accent: false },
    { x: 0.94, y: 0.74, r: 0.12, accent: false }
  ];
  function clamp01(value) {
    return value < 0 ? 0 : value > 1 ? 1 : value;
  }
  function vh(minHeight) {
    return Math.min(100, Math.max(0, minHeight));
  }
  function dimRgba(color, k) {
    return [color[0], color[1], color[2], color[3] * k];
  }
  function mixRgba(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
  }
  function rampOf(base, fg, lightOnDark, levels) {
    const stops = lightOnDark ? [dimRgba(base, 0.35), dimRgba(base, 0.65), base, mixRgba(base, fg, 0.45)] : [mixRgba(base, fg, 0.45), dimRgba(base, 0.9), dimRgba(base, 0.7), dimRgba(base, 0.4)];
    const top = stops.length - 1;
    const out = [];
    for (let k = 0; k < levels; k++) {
      const pos = (levels === 1 ? 0 : k / (levels - 1)) * top;
      const i0 = Math.min(top - 1, Math.floor(pos));
      out.push(mixRgba(stops[i0] ?? base, stops[i0 + 1] ?? base, pos - i0));
    }
    return out;
  }
  function buildLiveForms(seed, count) {
    const turn = Math.PI * 2;
    return FORM_SPECS.slice(0, Math.max(2, Math.min(FORM_SPECS.length, Math.round(count)))).map((spec, i) => {
      const rng = createRng(hashSeed(seed, i));
      const slow = (lo, hi) => (lo + rng() * (hi - lo)) * (rng() < 0.5 ? -1 : 1);
      return {
        spec,
        driftX: 0.012 + rng() * 0.02,
        driftY: 0.012 + rng() * 0.02,
        rateX: slow(25e-5, 6e-4),
        rateY: slow(25e-5, 6e-4),
        phaseX: rng() * turn,
        phaseY: rng() * turn,
        breathe: 0.02 + rng() * 0.035,
        breatheRate: slow(4e-4, 9e-4),
        breathePhase: rng() * turn,
        amp: [0.05 + rng() * 0.09, 0.03 + rng() * 0.07, 0.02 + rng() * 0.05],
        order: [2 + Math.floor(rng() * 3), 3 + Math.floor(rng() * 3), 4 + Math.floor(rng() * 3)],
        phase: [rng() * turn, rng() * turn, rng() * turn],
        rate: [slow(5e-4, 13e-4), slow(5e-4, 13e-4), slow(5e-4, 13e-4)]
      };
    });
  }
  function part(tag, name) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    node.setAttribute(`data-pica-${name}`, "");
    return node;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const sheet = scope(host);
    const under = layer(host, "under");
    const surface = createCanvas(under.el, {
      autoSize: false,
      css: "image-rendering:pixelated",
      onResize: () => {
        if (layout()) loop.redraw();
      }
    });
    const canvas = surface.canvas;
    const ctx = canvas.getContext("2d");
    const pal = watchPalette(host, () => {
      buildRamps();
      loop.redraw();
    });
    const headline = part("h1", "headline");
    const subhead = part("p", "subhead");
    const actions = part("div", "actions");
    host.append(headline, subhead, actions);
    let cols = 1;
    let rows = 1;
    let values = new Float32Array(1);
    let owner = new Int8Array(1);
    let imageData = null;
    let liveForms = [];
    let ramps = [];
    let ground = [0, 0, 0, 0];
    function rulesText() {
      const s = sheet.selector;
      const fg = cssVar("fg");
      const muted = cssVar("muted");
      const accent = cssVar("accent");
      const center = props.align === "center";
      const edge = center ? "center" : "flex-start";
      const textAlign = center ? "center" : "start";
      return [
        `:where(${s}){min-height:${vh(props.minHeight)}vh}`,
        `${s}{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${edge};gap:0.9em;padding:clamp(1.5rem,6vw,5rem);color:${fg};text-align:${textAlign}}`,
        `${s} > :not([data-pica]){margin-block:0;max-width:44rem;text-align:${textAlign}}`,
        `${s} > :is(h1,h2,h3){margin-block:0;max-width:14em;font-size:clamp(2.5rem,6.5vw,4.75rem);line-height:1.04;font-weight:600;letter-spacing:-0.02em;color:${fg};text-wrap:balance;overflow-wrap:break-word}`,
        `${s} > p:not([data-pica]){color:${muted}}`,
        `${s} > [data-pica-subhead]{margin-block:0;max-width:52ch;font-size:clamp(1.02rem,1.35vw,1.18rem);line-height:1.5;color:${muted};overflow-wrap:break-word}`,
        `${s} > :is(h1,h2,h3):empty,${s} > [data-pica-subhead]:empty{display:none}`,
        `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;margin-top:0.7em;max-width:44rem;justify-content:${edge}}`,
        `${s} > [data-pica-actions]:empty{display:none}`,
        `${s} > [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.3em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
        `${s} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
        `${s} > [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
        `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
        `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
        `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`
      ].join("\n");
    }
    function renderText() {
      headline.textContent = props.headline;
      subhead.textContent = props.subhead;
    }
    function renderActions() {
      actions.replaceChildren();
      for (const [i, action] of props.actions.slice(0, 3).entries()) {
        const a = document.createElement("a");
        a.setAttribute("data-pica", "");
        a.dataset.variant = i === 0 ? "solid" : "outline";
        a.href = action.href || "#";
        a.textContent = action.label;
        actions.append(a);
      }
    }
    function layout() {
      const cell = Math.max(1, props.pixel);
      const w = Math.max(1, Math.round(surface.cssWidth / cell));
      const h = Math.max(1, Math.round(surface.cssHeight / cell));
      if (w === cols && h === rows && imageData) return false;
      cols = w;
      rows = h;
      canvas.width = cols;
      canvas.height = rows;
      imageData = ctx ? ctx.createImageData(cols, rows) : null;
      values = new Float32Array(cols * rows);
      owner = new Int8Array(cols * rows);
      return true;
    }
    function buildForms() {
      liveForms = buildLiveForms(props.seed, props.forms);
    }
    function buildRamps() {
      const colors = pal.colors;
      ground = parseColor(colors.bg);
      const fg = parseColor(colors.fg);
      const muted = parseColor(colors.muted);
      const accent = parseColor(colors.accent);
      const lightOnDark = ground[3] > 0 ? relativeLuminance(colors.fg) > relativeLuminance(colors.bg) : hostTone(host) === "light-on-dark";
      const bandCount = Math.max(2, Math.min(4, Math.round(props.levels)));
      const mutedBase = [muted[0], muted[1], muted[2], 255 * (lightOnDark ? MUTED_ALPHA_DARK : MUTED_ALPHA_LIGHT)];
      const accentBase = [accent[0], accent[1], accent[2], 255 * (lightOnDark ? ACCENT_ALPHA_DARK : ACCENT_ALPHA_LIGHT)];
      ramps = liveForms.map((f) => rampOf(f.spec.accent ? accentBase : mutedBase, fg, lightOnDark, bandCount));
    }
    function draw(t) {
      if (!ctx || !imageData) {
        host.dataset.picaReady = "true";
        return;
      }
      const n = cols * rows;
      owner.fill(-1);
      values.fill(0);
      const span = Math.min(cols, rows);
      const speed = Math.max(0, props.speed);
      const gain = 0.25 + 0.95 * clamp01(props.depth);
      for (let fi = 0; fi < liveForms.length; fi++) {
        const f = liveForms[fi];
        if (!f) continue;
        const r0 = f.spec.r * span * Math.max(0.05, props.scale) * (1 + f.breathe * Math.sin(f.breathePhase + f.breatheRate * speed * t));
        if (r0 < 1) continue;
        const cx = f.spec.x * cols + f.driftX * span * Math.sin(f.phaseX + f.rateX * speed * t);
        const cy = f.spec.y * rows + f.driftY * span * Math.cos(f.phaseY + f.rateY * speed * t);
        const w0 = f.phase[0] + f.rate[0] * speed * t;
        const w1 = f.phase[1] + f.rate[1] * speed * t;
        const w2 = f.phase[2] + f.rate[2] * speed * t;
        const rmax = r0 * (1 + f.amp[0] + f.amp[1] + f.amp[2]) + 1;
        const x0 = Math.max(0, Math.floor(cx - rmax));
        const x1 = Math.min(cols, Math.ceil(cx + rmax));
        const y0 = Math.max(0, Math.floor(cy - rmax));
        const y1 = Math.min(rows, Math.ceil(cy + rmax));
        for (let y = y0; y < y1; y++) {
          const dy = y + 0.5 - cy;
          for (let x = x0; x < x1; x++) {
            const dx = x + 0.5 - cx;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d >= rmax) continue;
            const th = Math.atan2(dy, dx);
            const rth = r0 * (1 + f.amp[0] * Math.sin(f.order[0] * th + w0) + f.amp[1] * Math.sin(f.order[1] * th + w1) + f.amp[2] * Math.sin(f.order[2] * th + w2));
            if (d >= rth) continue;
            const ux = dx / rth;
            const uy = dy / rth;
            const z = Math.sqrt(Math.max(0, 1 - ux * ux - uy * uy));
            const raw = SHADE_MID + SHADE_GAIN * (ux * LIGHT_X + uy * LIGHT_Y + z * LIGHT_Z - SHADE_BIAS);
            const i = y * cols + x;
            values[i] = clamp01(0.5 + (raw - 0.5) * gain);
            owner[i] = fi;
          }
        }
      }
      const bandCount = Math.max(2, Math.min(4, Math.round(props.levels)));
      const mask = props.mask === "cluster" ? clusterMatrix(CLUSTER_SIZE) : props.mask === "bayer" ? bayerMatrix(BAYER_SIZE) : blueNoiseMatrix(BLUE_SIZE);
      const maskSize = props.mask === "cluster" ? CLUSTER_SIZE : props.mask === "bayer" ? BAYER_SIZE : BLUE_SIZE;
      const bands = ditherLevels(values, cols, rows, bandCount, mask, maskSize);
      const data = imageData.data;
      for (let i = 0; i < n; i++) {
        const o = owner[i] ?? -1;
        const c = o < 0 ? ground : ramps[o]?.[bands[i] ?? 0] ?? ground;
        const j = i * 4;
        data[j] = c[0];
        data[j + 1] = c[1];
        data[j + 2] = c[2];
        data[j + 3] = c[3];
      }
      ctx.putImageData(imageData, 0, 0);
      host.dataset.picaReady = "true";
    }
    sheet.setRules(rulesText());
    renderText();
    renderActions();
    layout();
    buildForms();
    buildRamps();
    const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (pal.refresh()) buildRamps();
        if (props.headline !== before.headline || props.subhead !== before.subhead) renderText();
        if (!sameJson(before.actions, props.actions)) renderActions();
        if (props.align !== before.align || props.minHeight !== before.minHeight) sheet.setRules(rulesText());
        if (props.seed !== before.seed || props.forms !== before.forms) {
          buildForms();
          buildRamps();
        } else if (props.levels !== before.levels) {
          buildRamps();
        }
        if (props.pixel !== before.pixel) layout();
        loop.update({ paused: props.paused, time: props.time, fps: props.fps });
        loop.redraw();
      },
      destroy() {
        loop.destroy();
        surface.destroy();
        pal.destroy();
        under.remove();
        headline.remove();
        subhead.remove();
        actions.remove();
        sheet.destroy();
        delete host.dataset.picaReady;
      }
    };
  };
  return __toCommonJS(core_exports);
})();

(function () {
  var host = document.getElementById("pica");
  function take(props) {
    var data = {};
    for (var key in props) {
      if (key !== "palette") data[key] = props[key];
    }
    var palette = props.palette || {};
    for (var token in palette) {
      if (palette[token]) host.style.setProperty("--pica-" + token, palette[token]);
      else host.style.removeProperty("--pica-" + token);
    }
    return data;
  }
  var instance = PicaClayHero.mount(host, take(window.PICA_PROPS || {}));
  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || !event.data) return;
    if (event.data.type === "pica:props") instance.update(take(event.data.props));
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

Original to Picagram.
