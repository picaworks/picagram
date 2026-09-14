"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Liquid Glass Hero · liquid-glass-hero
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
  accent: "#e8a020",
  muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)",
};

/** The CSS value of a token, with its fallback, for use in a style: var(--pica-accent, #e8a020). */
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

// lib/noise.ts
/** Seeded simplex noise in two and three dimensions, returning values in [-1, 1].
 *  Follows Stefan Gustavson's public-domain reference implementation. */
interface Noise {
  noise2(x: number, y: number): number;
  noise3(x: number, y: number, z: number): number;
}

const SIMPLEX_GRAD = [
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1,
  1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
];
const SIMPLEX_F2 = 0.5 * (Math.sqrt(3) - 1);
const SIMPLEX_G2 = (3 - Math.sqrt(3)) / 6;
const SIMPLEX_F3 = 1 / 3;
const SIMPLEX_G3 = 1 / 6;

function createNoise(seed = 1): Noise {
  const random = createRng(seed);
  const p: number[] = [];
  for (let i = 0; i < 256; i++) p.push(i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = p[i]!;
    p[i] = p[j]!;
    p[j] = swap;
  }
  // Doubled so lookups never need a modulo; `grad` stores an offset into SIMPLEX_GRAD.
  const perm: number[] = [];
  const grad: number[] = [];
  for (let i = 0; i < 512; i++) {
    const v = p[i & 255]!;
    perm.push(v);
    grad.push((v % 12) * 3);
  }

  function corner2(g: number, x: number, y: number): number {
    let t = 0.5 - x * x - y * y;
    if (t < 0) return 0;
    t *= t;
    return t * t * (SIMPLEX_GRAD[g]! * x + SIMPLEX_GRAD[g + 1]! * y);
  }

  function corner3(g: number, x: number, y: number, z: number): number {
    let t = 0.6 - x * x - y * y - z * z;
    if (t < 0) return 0;
    t *= t;
    return t * t * (SIMPLEX_GRAD[g]! * x + SIMPLEX_GRAD[g + 1]! * y + SIMPLEX_GRAD[g + 2]! * z);
  }

  function noise2(xin: number, yin: number): number {
    const s = (xin + yin) * SIMPLEX_F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * SIMPLEX_G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = 1 - i1;
    const ii = i & 255;
    const jj = j & 255;
    return 70 * (
      corner2(grad[ii + perm[jj]!]!, x0, y0) +
      corner2(grad[ii + i1 + perm[jj + j1]!]!, x0 - i1 + SIMPLEX_G2, y0 - j1 + SIMPLEX_G2) +
      corner2(grad[ii + 1 + perm[jj + 1]!]!, x0 - 1 + 2 * SIMPLEX_G2, y0 - 1 + 2 * SIMPLEX_G2)
    );
  }

  function noise3(xin: number, yin: number, zin: number): number {
    const s = (xin + yin + zin) * SIMPLEX_F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * SIMPLEX_G3;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const z0 = zin - (k - t);
    let i1 = 0, j1 = 0, k1 = 0, i2 = 0, j2 = 0, k2 = 0;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; i2 = 1; j2 = 1; }
      else if (x0 >= z0) { i1 = 1; i2 = 1; k2 = 1; }
      else { k1 = 1; i2 = 1; k2 = 1; }
    } else if (y0 < z0) { k1 = 1; j2 = 1; k2 = 1; }
    else if (x0 < z0) { j1 = 1; j2 = 1; k2 = 1; }
    else { j1 = 1; i2 = 1; j2 = 1; }
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const g = SIMPLEX_G3;
    return 32 * (
      corner3(grad[ii + perm[jj + perm[kk]!]!]!, x0, y0, z0) +
      corner3(grad[ii + i1 + perm[jj + j1 + perm[kk + k1]!]!]!, x0 - i1 + g, y0 - j1 + g, z0 - k1 + g) +
      corner3(grad[ii + i2 + perm[jj + j2 + perm[kk + k2]!]!]!, x0 - i2 + 2 * g, y0 - j2 + 2 * g, z0 - k2 + 2 * g) +
      corner3(grad[ii + 1 + perm[jj + 1 + perm[kk + 1]!]!]!, x0 - 1 + 3 * g, y0 - 1 + 3 * g, z0 - 1 + 3 * g)
    );
  }

  return { noise2, noise3 };
}

// registry/sections/liquid-glass-hero/core.ts
/** One call to action: a link's visible text and destination. */
export interface LiquidGlassHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface LiquidGlassHeroProps extends MotionProps {
  /** The headline, set large in the page's own font after anything the page wraps. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline, in the muted color. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as links in source order. At most three: the first draws solid, the rest outline. */
  actions: readonly LiquidGlassHeroAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** The slab's diameter as a share of the host's shorter side, 0.2 to 0.8. */
  size: number;
  /** How far the slab's curved edge bends what lies behind it, from 0 (a flat sheet) to 1 (a strong lens). */
  bend: number;
  /** Spacing of the printed lattice the slab drifts over, in CSS pixels. */
  spacing: number;
  /** How strongly the whole drawing inks, from 0 (the ground alone) to 1. */
  intensity: number;
  /** How fast the slab drifts across the field. 0 holds it still. */
  drift: number;
  /** Tone steps the field is screened into: 2 is one-bit, 6 reads as nearly smooth. */
  levels: number;
  /** The screen the field is dithered through: "blue" scatters the ink, "bayer" orders it. */
  mask: "blue" | "bayer";
  /** CSS pixels each screened cell covers before the canvas is scaled up. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: LiquidGlassHeroProps = {
  headline: "Glass that bends, never blurs.",
  subhead: "A thick lens drifts over a printed field and displaces what lies beneath its curved edge, drawn in screened ink.",
  actions: [
    { label: "Get started", href: "#start" },
    { label: "How it bends", href: "#how" },
  ],
  align: "start",
  minHeight: 72,
  size: 0.34,
  bend: 0.6,
  spacing: 30,
  intensity: 0.6,
  drift: 0.5,
  levels: 4,
  mask: "blue",
  pixel: 3,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** Animation time held under reduced motion, in milliseconds. */
const STILL_TIME = 1200;
/** Cell count of the blue noise mask, from lib/dither-mask.ts. */
const BLUE_SIZE = 32;
/** Cell count of the ordered mask, from lib/dither.ts. */
const BAYER_SIZE = 8;
/** Cells per side of the broad tone tile the field reads back through bilinear sampling. */
const TILE = 32;
/** CSS pixels one tile cell covers: the broad tone varies over roughly four of them. */
const NOISE_PX = 96;
/** Noise cycles across the tile, so the broadest cloud spans about a third of its span. */
const NOISE_CYCLES = 3;
/** Vertical squash of the slab: ry is rx times this, so the lens reads pressed rather than round. */
const SQUASH = 0.86;
/** Direction the lit edge faces, normalized once: the rim is brightest at the upper left. */
const LIGHT_LEN = Math.hypot(0.68, 0.73);
const LIGHT_X = -0.68 / LIGHT_LEN;
const LIGHT_Y = -0.73 / LIGHT_LEN;
/** How far around the rim the specular arc reaches: the cosine of its half angle. */
const ARC = 0.74;
/** Tone a lattice line carries, added to the field where it runs. */
const LINE_TONE = 0.85;
/** Where the broad noise starts to lift the field at all: below it the field sits on the ground, so the
 *  clouds gather into quiet patches instead of speckling the whole frame. */
const KNEE = 0.58;
/** Tone the broad noise reaches at its peaks, once past the knee. */
const NOISE_GAIN = 0.5;
/** Slab body tone at the centre, where a lens is nearly clear. */
const LIFT = 0.04;
/** Extra body tone at the rim, where the slab is thick. */
const LIFT_EDGE = 0.64;
/** Tone of the hairline that outlines the whole slab. */
const EDGE = 0.92;
/** Inner edge of the outline ring, as a share of the slab radius. */
const EDGE_IN = 0.965;
/** Inner edge of the bright specular ring, as a share of the slab radius. */
const SPEC1_IN = 0.968;
/** The dimmer specular ring runs from SPEC2_IN to SPEC2_OUT. */
const SPEC2_IN = 0.928;
const SPEC2_OUT = 0.958;
/** Alpha of the two specular steps, before intensity scales them: a bright hairline and a dimmer one inside it. */
const SPEC_HI = 1;
const SPEC_LO = 0.45;
/** Alpha ceiling of the bg veil inside the slab, reached at the rim. Unset bg leaves the glass clear. */
const VEIL_MAX = 0.65;
/** Displacement in CSS pixels at the rim when bend is 1. */
const BEND_PX = 20;
/** Room the wandering slab keeps from the frame's own edge, in CSS pixels. */
const MARGIN = 40;
/** Clear air the slab's edge keeps from the box the content occupies, in CSS pixels. */
const CLEAR = 36;
/** Elliptical distance where the field starts settling toward the ground, squared: just past the rim. */
const FIELD_IN2 = 1.15 * 1.15;
/** Elliptical distance where the field reaches its floor, squared. */
const FIELD_OUT2 = 2.6 * 2.6;
/** Print left in the far field: a whisper so the ground is never sterile, never busy. */
const FIELD_FLOOR = 0.06;
/** Wander periods in milliseconds at drift 1: incommensurate, so the path never repeats on a page. */
const PERIOD_X = 34000;
const PERIOD_Y = 43000;

const TAU = Math.PI * 2;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** The Hermite step: 0 below e0, 1 above e1, smoothed between. */
function smoothstep(e0: number, e1: number, v: number): number {
  const t = clamp((v - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return clamp(minHeight, 0, 100);
}

/** Fractal noise at one point, its octaves summed with each half the amplitude and twice the frequency of
 *  the last, then brought back to roughly -1 to 1 by the total amplitude they carried. */
function noiseSum(noise: Noise, x: number, y: number, octaves: number): number {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amplitude * noise.noise2(x * frequency, y * frequency);
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total > 0 ? sum / total : 0;
}

/** noiseSum at (nx, ny) in 0 to 1, blended with three copies shifted by one full cycle of `scale`, so the
 *  tile it fills repeats with no seam when its opposite edges are read as neighbors. */
function tileAt(noise: Noise, nx: number, ny: number, scale: number, octaves: number): number {
  const sx = nx * scale;
  const sy = ny * scale;
  const a = noiseSum(noise, sx, sy, octaves);
  const b = noiseSum(noise, sx - scale, sy, octaves);
  const c = noiseSum(noise, sx, sy - scale, octaves);
  const d = noiseSum(noise, sx - scale, sy - scale, octaves);
  return a * (1 - nx) * (1 - ny) + b * nx * (1 - ny) + c * (1 - nx) * ny + d * nx * ny;
}

/** Bilinear read of the tone tile that wraps at its own size, at a fractional cell position. */
function readTile(tile: Float32Array, x: number, y: number): number {
  const wx = ((x % TILE) + TILE) % TILE;
  const wy = ((y % TILE) + TILE) % TILE;
  const x0 = Math.floor(wx);
  const y0 = Math.floor(wy);
  const x1 = (x0 + 1) % TILE;
  const y1 = (y0 + 1) % TILE;
  const tx = wx - x0;
  const ty = wy - y0;
  const v00 = tile[y0 * TILE + x0] ?? 0;
  const v10 = tile[y0 * TILE + x1] ?? 0;
  const v01 = tile[y1 * TILE + x0] ?? 0;
  const v11 = tile[y1 * TILE + x1] ?? 0;
  return v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
}

/** Layout for the host and the grammar for its calls to action. Prose keeps the page's font; only size,
 *  weight, and tracking set a heading apart, and the muted color carries secondary text. The solid link
 *  paints its background from currentColor, so the fg fallback resolves to the link's own color, and its
 *  label span inverts it back to a readable ink. The minimum height goes in a :where() rule, which carries
 *  no specificity at all, so a page that gives this host a height of its own wins. */
function rules(s: string, p: LiquidGlassHeroProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const onFg = cssOn("fg");
  const center = p.align === "center";
  const edge = center ? "center" : "flex-start";
  const textAlign = center ? "center" : "start";
  const tint = `color-mix(in srgb, ${fg} 10%, transparent)`;
  return [
    `:where(${s}){min-height:${vh(p.minHeight)}vh}`,
    `${s}{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${edge};gap:0.9em;padding:clamp(1.5rem,6vw,5rem);color:${fg};text-align:${textAlign}}`,
    `${s} > :not([data-pica]){margin-block:0;text-align:${textAlign}}`,
    `${s} > :not([data-pica]):not(:is(h1,h2,h3)){max-width:44rem}`,
    `${s} > p:not([data-pica]){color:${muted}}`,
    `${s} > :is(h1,h2,h3){margin-block:0;max-width:14em;font-size:clamp(2.4rem,6vw,4.6rem);line-height:1.05;font-weight:600;letter-spacing:-0.02em;color:${fg};text-wrap:balance;overflow-wrap:break-word}`,
    `${s} > :is(h1,h2,h3):empty{display:none}`,
    `${s} > [data-pica-subhead]{margin-block:0;max-width:52ch;font-size:clamp(1rem,1.4vw,1.15rem);line-height:1.55;color:${muted};overflow-wrap:break-word}`,
    `${s} > [data-pica-subhead]:empty{display:none}`,
    `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;margin-top:0.8em;justify-content:${edge}}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.3em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]{background:currentColor;color:${fg};border-color:transparent}`,
    `${s} > [data-pica-actions] a[data-variant="solid"] > [data-pica-label]{color:${onFg}}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${fg} 86%, transparent)}`,
    `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:${tint};border-color:${fg}}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

export const mount: Mount<LiquidGlassHeroProps> = (host, initial = {}) => {
  let props: LiquidGlassHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const under = layer(host, "under");

  const headlineEl = document.createElement("h1");
  headlineEl.setAttribute("data-pica", "");
  const subheadEl = document.createElement("p");
  subheadEl.setAttribute("data-pica", "");
  subheadEl.setAttribute("data-pica-subhead", "");
  const actionsEl = document.createElement("div");
  actionsEl.setAttribute("data-pica", "");
  actionsEl.setAttribute("data-pica-actions", "");
  host.append(headlineEl, subheadEl, actionsEl);

  let cols = 1;
  let rows = 1;
  let values = new Float32Array(1);
  let spec = new Uint8Array(1);
  let veils = new Float32Array(1);
  let imageData: ImageData | null = null;
  let tile = new Float32Array(1);
  let builtSeed = Number.NaN;
  let phaseX = 0;
  let phaseY = 0;
  let fgC: readonly [number, number, number, number] = [0, 0, 0, 0];
  let specC: readonly [number, number, number, number] = [0, 0, 0, 0];
  let bgC: readonly [number, number, number, number] = [0, 0, 0, 0];

  const surface = createCanvas(under.el, {
    autoSize: false,
    css: "image-rendering:pixelated",
    onResize: () => {
      if (layout()) loop.redraw();
    },
  });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const palette = watchPalette(host, () => {
    readColors();
    loop.redraw();
  });

  /** The palette's tokens as pixel colors, read again whenever a token moves. */
  function readColors(): void {
    fgC = parseColor(palette.colors.fg);
    specC = parseColor(palette.colors.accent);
    bgC = parseColor(palette.colors.bg);
  }

  /** Recomputes the low-resolution cell grid from the host and `pixel`. Returns true when it changed, so a
   *  caller not already animating knows to redraw. */
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
    spec = new Uint8Array(cols * rows);
    veils = new Float32Array(cols * rows);
    return true;
  }

  /** The box the content occupies, in host pixels: the union of every child's rect but the canvas layer's,
   *  which covers the host. Empty children have no box and add nothing. Measured per frame, so a reflowed
   *  headline or a late font moves the keep-out the wander respects. Null when there is no content. */
  function contentBox(): { l: number; t: number; r: number; b: number } | null {
    const hr = host.getBoundingClientRect();
    let l = Number.POSITIVE_INFINITY;
    let t = Number.POSITIVE_INFINITY;
    let r = Number.NEGATIVE_INFINITY;
    let b = Number.NEGATIVE_INFINITY;
    const kids = host.children;
    for (let k = 0; k < kids.length; k++) {
      const el = kids.item(k);
      if (!el || el === under.el) continue;
      const q = el.getBoundingClientRect();
      if (q.width === 0 || q.height === 0) continue;
      if (q.left < l) l = q.left;
      if (q.top < t) t = q.top;
      if (q.right > r) r = q.right;
      if (q.bottom > b) b = q.bottom;
    }
    if (r < l) return null;
    return { l: l - hr.left, t: t - hr.top, r: r - hr.left, b: b - hr.top };
  }

  /** Builds the broad tone tile once per seed: a seamless field of soft clouds, normalized to its own min
   *  and max so it spends the whole 0 to 1 range it is given. Never called per frame. */
  function rebuildField(): void {
    const noise = createNoise(hashSeed(props.seed, 3));
    const octaves = 3;
    tile = new Float32Array(TILE * TILE);
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const v = tileAt(noise, (x + 0.5) / TILE, (y + 0.5) / TILE, NOISE_CYCLES, octaves);
        tile[y * TILE + x] = v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    const span = max > min ? max - min : 1;
    for (let i = 0; i < tile.length; i++) tile[i] = ((tile[i] ?? 0) - min) / span;
    const rng = createRng(hashSeed(props.seed, 17));
    phaseX = rng() * TAU;
    phaseY = rng() * TAU;
    builtSeed = props.seed;
  }

  /** Rebuilds the action links from JSON: the first solid, the rest outline, in source order. */
  function renderActions(): void {
    actionsEl.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.href = action.href;
      if (i === 0) {
        a.dataset.variant = "solid";
        const label = document.createElement("span");
        label.setAttribute("data-pica", "");
        label.setAttribute("data-pica-label", "");
        label.textContent = action.label;
        a.append(label);
      } else {
        a.dataset.variant = "outline";
        a.textContent = action.label;
      }
      actionsEl.append(a);
    }
  }

  function draw(t: number): void {
    if (!ctx || !imageData) {
      host.dataset.picaReady = "true";
      return;
    }
    const cell = Math.max(1, props.pixel);
    const w = surface.cssWidth;
    const h = surface.cssHeight;
    const inkMax = clamp(props.intensity, 0, 1);
    const r = Math.min(w, h) * clamp(props.size, 0.2, 0.8) * 0.5;
    const rx = Math.max(8, r);
    const ry = rx * SQUASH;
    // The slab wanders inside a box that keeps it whole inside the frame with a clear inset, on two
    // incommensurate periods. The text's box, inflated by the slab's radii plus a clear gap, is a
    // keep-out: a wander point inside it slides to its nearest face, so the slab rides beside or above
    // the type instead of through it. The slab is the subject, the type is the message; they never
    // share pixels.
    const xl = MARGIN + rx;
    const xr = Math.max(xl, w - MARGIN - rx);
    const yt = MARGIN + ry;
    const yb = Math.max(yt, h - MARGIN - ry);
    const drift = clamp(props.drift, 0, 1);
    let cx = (xl + xr) * 0.5 + (xr - xl) * 0.5 * Math.cos((TAU * drift * t) / PERIOD_X + phaseX);
    let cy = (yt + yb) * 0.5 + (yb - yt) * 0.5 * Math.sin((TAU * drift * t) / PERIOD_Y + phaseY);
    const box = contentBox();
    if (box) {
      const kl = box.l - CLEAR - rx;
      const kr = box.r + CLEAR + rx;
      const kt = box.t - CLEAR - ry;
      const kb = box.b + CLEAR + ry;
      if (cx > kl && cx < kr && cy > kt && cy < kb) {
        let bestD = Number.POSITIVE_INFINITY;
        let bx = cx;
        let by = cy;
        let slid = false;
        for (const [fx, fy, fd] of [
          [kl, cy, cx - kl],
          [kr, cy, kr - cx],
          [cx, kt, cy - kt],
          [cx, kb, kb - cy],
        ] as const) {
          if (fx < xl || fx > xr || fy < yt || fy > yb) continue;
          if (fd < bestD) {
            bestD = fd;
            bx = fx;
            by = fy;
            slid = true;
          }
        }
        if (slid) {
          cx = bx;
          cy = by;
        } else {
          // No face of the keep-out lands inside the frame's inset box: park on the frame corner
          // farthest from the content.
          const midX = (box.l + box.r) * 0.5;
          const midY = (box.t + box.b) * 0.5;
          cx = midX < (xl + xr) * 0.5 ? xr : xl;
          cy = midY < (yt + yb) * 0.5 ? yb : yt;
        }
      }
    }
    const bendPx = clamp(props.bend, 0, 1) * BEND_PX;
    const pitch = Math.max(8, props.spacing);
    // A lattice line inks the cells it crosses: a half width just over half a cell keeps it a continuous
    // hairline at any cell size instead of breaking into dashes.
    const lineW = cell * 0.55;
    const invRx = 1 / rx;
    const invRy = 1 / ry;
    const nRx = 1 / (rx * rx);
    const nRy = 1 / (ry * ry);
    const invNoise = 1 / NOISE_PX;

    let i = 0;
    for (let y = 0; y < rows; y++) {
      const py = (y + 0.5) * cell;
      const qy = (py - cy) * invRy;
      for (let x = 0; x < cols; x++, i++) {
        const px = (x + 0.5) * cell;
        const qx = (px - cx) * invRx;
        const d2 = qx * qx + qy * qy;
        let sx = px;
        let sy = py;
        let lift = 0;
        let edge = 0;
        let sp = 0;
        let vl = 0;
        if (d2 < 1) {
          const d = Math.sqrt(d2);
          const len = Math.hypot(px - cx, py - cy);
          if (len > 0.001) {
            // The lens bends radially, from nothing through its centre to the full offset at its rim, so
            // the field inside is sampled closer to the centre than where it shows: a magnifier's push.
            const off = bendPx * d * d * d;
            sx = px - ((px - cx) / len) * off;
            sy = py - ((py - cy) / len) * off;
          }
          // A thick slab is nearly clear through the centre and densest at its curved edge, where the
          // tone gathers into one screened band rather than a gradient that would read as a blur.
          lift = LIFT + LIFT_EDGE * smoothstep(0.8, 0.94, d);
          if (d >= EDGE_IN) edge = EDGE;
          // The specular rim faces the light: a bright hairline at the very edge and a dimmer one inside
          // it, two tone steps and never a glow.
          const nx = (px - cx) * nRx;
          const ny = (py - cy) * nRy;
          const nl = Math.hypot(nx, ny) || 1;
          const facing = (nx * LIGHT_X + ny * LIGHT_Y) / nl;
          if (facing > ARC && d >= SPEC2_IN && d <= 1) {
            sp = d >= SPEC1_IN ? 2 : d <= SPEC2_OUT ? 1 : 0;
          }
          // The slab's own tint, for a page that gives bg a color: deepest at the rim.
          vl = 0.8 + 0.2 * d * d;
        }
        // The printed field: a fine lattice at `pitch` over broad noise, sampled where the lens sent it.
        // It is at full strength through the rim and a short skirt beyond it, then settles toward the
        // ground with distance, so the displacement at the slab's edge is what the eye finds.
        const gain = FIELD_FLOOR + (1 - FIELD_FLOOR) * (1 - smoothstep(FIELD_IN2, FIELD_OUT2, d2));
        const mx = ((sx % pitch) + pitch) % pitch;
        const my = ((sy % pitch) + pitch) % pitch;
        const dx = Math.min(mx, pitch - mx);
        const dy = Math.min(my, pitch - my);
        const ld = Math.min(dx, dy);
        const line = ld >= lineW ? 0 : (lineW - ld) / lineW;
        const broad = readTile(tile, sx * invNoise, sy * invNoise);
        let v = (line * LINE_TONE + Math.max(0, broad - KNEE) * NOISE_GAIN) * gain;
        if (lift > v) v = lift;
        if (edge > v) v = edge;
        values[i] = v > 1 ? 1 : v;
        spec[i] = sp;
        veils[i] = vl;
      }
    }

    const lv = Math.max(2, Math.min(6, Math.round(props.levels)));
    const maskSize = props.mask === "bayer" ? BAYER_SIZE : BLUE_SIZE;
    const screen = props.mask === "bayer" ? bayerMatrix(BAYER_SIZE) : blueNoiseMatrix(BLUE_SIZE);
    const bands = ditherLevels(values, cols, rows, lv, screen, maskSize);
    const top = lv - 1;
    const [fr, fgv, fb, fa] = fgC;
    const [ar, ag, ab, aa] = specC;
    const [br, bgv, bb, ba] = bgC;
    const fgA = fa / 255;
    const acA = aa / 255;
    const bgA = ba / 255;
    const data = imageData.data;
    for (let k = 0; k < i; k++) {
      const j = k * 4;
      let ir = fr;
      let ig = fgv;
      let ib = fb;
      let a1 = ((bands[k] ?? 0) / top) * inkMax * fgA;
      const sp = spec[k];
      if (sp !== 0) {
        ir = ar;
        ig = ag;
        ib = ab;
        a1 = (sp === 2 ? SPEC_HI : SPEC_LO) * inkMax * acA;
      }
      // Straight-alpha compositing: the ink sits over the slab's bg veil, which sits over the ground.
      // The veil is a tint, not ink, so intensity does not scale it.
      const a2 = (veils[k] ?? 0) * VEIL_MAX * bgA;
      const a = a1 + a2 * (1 - a1);
      if (a <= 0) {
        data[j + 3] = 0;
        continue;
      }
      data[j] = Math.round((ir * a1 + br * a2 * (1 - a1)) / a);
      data[j + 1] = Math.round((ig * a1 + bgv * a2 * (1 - a1)) / a);
      data[j + 2] = Math.round((ib * a1 + bb * a2 * (1 - a1)) / a);
      data[j + 3] = Math.round(a * 255);
    }
    ctx.putImageData(imageData, 0, 0);
    host.dataset.picaReady = "true";
  }

  sheet.setRules(rules(sheet.selector, props));
  headlineEl.textContent = props.headline;
  subheadEl.textContent = props.subhead;
  renderActions();
  readColors();
  rebuildField();
  layout();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.headline !== before.headline) headlineEl.textContent = props.headline;
      if (props.subhead !== before.subhead) subheadEl.textContent = props.subhead;
      if (!sameJson(before.actions, props.actions)) renderActions();
      if (props.align !== before.align || props.minHeight !== before.minHeight) sheet.setRules(rules(sheet.selector, props));
      if (palette.refresh()) readColors();
      if (props.seed !== before.seed || Number.isNaN(builtSeed)) rebuildField();
      layout();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      surface.destroy();
      palette.destroy();
      under.remove();
      headlineEl.remove();
      subheadEl.remove();
      actionsEl.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/liquid-glass-hero/index.tsx
export type LiquidGlassHeroComponentProps = Partial<LiquidGlassHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero behind a drifting lens slab that bends the printed field beneath its curved edge. */
export function LiquidGlassHero({ className, style, palette, children, ...props }: LiquidGlassHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
