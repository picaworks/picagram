"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Neumorphic Hero · neumorphic-hero
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

// lib/font.ts
/** The monospace stack glyph components default to. It lives in its own module, so a text component that
 *  never draws a grid does not carry lib/glyph-grid.ts into its single React file just for the font. */
const GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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

// registry/sections/neumorphic-hero/core.ts
/** One call to action: a link's visible text and destination. */
export interface NeumorphicHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

/** One fact on a satellite tile: a caption and the figure it captions. */
export interface NeumorphicHeroFact {
  /** What the figure measures, drawn small in mono capitals. */
  label: string;
  /** The figure itself, drawn large in mono. */
  value: string;
}

export interface NeumorphicHeroProps {
  /** The headline, set large on the raised slab. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline, in the muted token. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as links in source order. The first presses into the slab, the rest rise from it. At most three show. */
  actions: readonly NeumorphicHeroAction[];
  /** Facts for the stat tiles standing beside the slab, each a mono label and a figure in source order. At most three show; empty draws no rail. */
  facts: readonly NeumorphicHeroFact[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** How much ink the screened tone steps lay down, from 0 (a bare hairline) to 1. */
  depth: number;
  /** Shifts the dither screen's placement, so two instances need not share a grain. */
  seed: number;
}

export const defaults: NeumorphicHeroProps = {
  headline: "Raised out of the same ground.",
  subhead:
    "A soft UI hero whose relief is screened, not blurred: each edge is two dithered tone steps, and every face keeps the ground color.",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  facts: [
    { label: "Tone steps", value: "2" },
    { label: "Screen", value: "32 × 32" },
    { label: "Blur", value: "0 px" },
  ],
  align: "start",
  minHeight: 60,
  depth: 0.8,
  seed: 1,
};

/** One ink as RGBA bytes, taken from the palette or from the extreme away from it. */
type BevelInk = readonly [number, number, number, number];

/** A rectangle in canvas pixels, edges included on the left and top and excluded on the right and bottom. */
interface SlabBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Cell count of the dispersed screen, from lib/dither-mask.ts. */
const SCREEN = 32;
/** Width of the stronger tone step next to the edge line, in pixels. */
const BEVEL_NEAR = 4;
/** Width of the fainter step beyond it, in pixels. */
const BEVEL_FAR = 6;
/** Reach of the whole bevel past an element's edge: the one pixel line plus both tone steps. */
const BEVEL_REACH = 1 + BEVEL_NEAR + BEVEL_FAR;
/** Ink coverage of the two steps before depth scales them. */
const NEAR_INK = 0.62;
const FAR_INK = 0.3;
/** The most calls to action the row will draw. */
const MAX_ACTIONS = 3;
/** The most stat tiles the rail will draw. */
const MAX_FACTS = 3;
/** The least interior padding the slab keeps between its edge and the copy, in pixels. */
const MIN_PAD = 8;
/** Clear ground between neighbouring reliefs, in pixels. Closer than this and two bevels merge into one edge. */
const CLEAR = 14;
/** Below this host width, in pixels, the rail stacks under the copy as a row of stat chips. */
const COLLAPSE = 720;

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** The least ground the frame keeps around the slab, in pixels. It never falls below the bevel's reach
 *  plus a clear strip, so no tone step crowds the canvas edge and the relief reads on every side. */
function frameMargin(w: number): number {
  return Math.round(Math.min(56, Math.max(BEVEL_REACH + 11, w * 0.045)));
}

/** Interior padding between the copy and the slab's edge, in pixels. It gives way before the frame
 *  margin does, so the bevel always has ground to read against. */
function slabPad(w: number): number {
  return Math.round(Math.min(40, Math.max(20, w * 0.03)));
}

/** Layout for the host and the links and stat tiles it draws around. The host is a grid: the page's
 *  children and the core's parts share the first column, and the rail of tiles takes a second column
 *  sized to them, so the slab can hug the copy while the rail stands on the bare ground beside it. On
 *  a narrow host the rail folds back into the first column as a row of chips. The canvas under it all
 *  draws the slab and every bevel around whatever the grid measures. The minimum height sits in a
 *  :where() rule, which carries no specificity, so a page that gives this host a height still wins.
 *  The links and tiles keep transparent faces and no border, because the bevel is the affordance and a
 *  painted face would stop being the ground. Mono belongs to the tiles' labels and figures; the prose
 *  keeps the page's own face. */
function rules(selector: string, p: NeumorphicHeroProps): string {
  const s = selector;
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const edge = p.align === "center" ? "center" : "start";
  const flexEdge = p.align === "center" ? "center" : "flex-start";
  const textAlign = p.align === "center" ? "center" : "start";
  return [
    `:where(${s}){min-height:${vh(p.minHeight)}vh}`,
    `${s}{position:relative;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:clamp(3rem,4vw,3.5rem);row-gap:clamp(0.8rem,2vh,1.3rem);align-content:safe center;justify-items:${edge};padding:clamp(2.5rem,8vh,5.5rem) clamp(2.25rem,7vw,6rem);color:${fg};text-align:${textAlign}}`,
    `${s}[data-pica-fit="min"]{grid-template-columns:minmax(0,1fr)}`,
    `${s} > :not([data-pica]){grid-column:1;min-width:0;max-width:min(44rem,100%);margin:0;text-align:${textAlign};overflow-wrap:break-word}`,
    `${s} > [data-pica-headline]{grid-column:1;min-width:0;max-width:min(44rem,100%);margin:0;font-size:clamp(2.3rem,6vw,4.75rem);line-height:1.04;font-weight:650;letter-spacing:-0.01em;text-align:${textAlign};overflow-wrap:break-word}`,
    `${s} > [data-pica-subhead]{grid-column:1;min-width:0;max-width:min(38rem,100%);margin:0;font-size:clamp(1rem,1.4vw,1.2rem);line-height:1.55;color:${muted};text-align:${textAlign};overflow-wrap:break-word}`,
    `${s} > [data-pica-actions]{grid-column:1;min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:2em;max-width:min(44rem,100%);margin-top:clamp(0.4rem,2vh,1.2rem);justify-content:${flexEdge}}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.7em 1.4em;display:inline-flex;align-items:center;border:0;border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    `${s} > [data-pica-actions] a:hover{text-decoration:underline;text-underline-offset:0.2em}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} > [data-pica-rail]{grid-column:2;align-self:stretch;display:flex;flex-direction:column;justify-content:center;gap:clamp(1.75rem,3.5vh,2.5rem);margin:0}`,
    `${s}[data-pica-fit="min"] > [data-pica-rail]{grid-column:1;flex-direction:row;flex-wrap:wrap;justify-content:${flexEdge};gap:2em;margin-top:1.4em;padding:0 0.5em}`,
    `${s} [data-pica-tile]{box-sizing:border-box;min-width:0;width:clamp(8.5rem,13vw,11rem);margin:0;padding:0.95em 1.05em;display:flex;flex-direction:column;gap:0.5em}`,
    `${s}[data-pica-fit="min"] [data-pica-tile]{width:auto}`,
    `${s} [data-pica-flabel]{font-family:${GRID_FONT};font-size:0.68em;letter-spacing:0.05em;text-transform:uppercase;color:${muted}}`,
    `${s} [data-pica-fvalue]{min-width:0;font-family:${GRID_FONT};font-size:clamp(1.15rem,1.8vw,1.5rem);font-variant-numeric:tabular-nums;color:${fg};overflow-wrap:break-word}`,
  ].join("\n");
}

export const mount: Mount<NeumorphicHeroProps> = (host, initial = {}) => {
  let props: NeumorphicHeroProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  // The canvas is the layer's own element, so it inherits the under layer's stacking: below the content,
  // above the page's ground, never answering the pointer. Its backing store stays at one device pixel per
  // CSS pixel so the dithered dots land exactly one screen pixel apart.
  const under = layer(host, "under", "canvas");
  const canvas = under.el as HTMLCanvasElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  const ctx = canvas.getContext("2d");
  let image: ImageData | null = null;

  /** Creates one element the core owns, marked for identification and restyling. */
  function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    node.setAttribute(`data-pica-${name}`, "");
    return node;
  }

  const headlineEl = part("h1", "headline");
  const subheadEl = part("p", "subhead");
  const actionsEl = part("div", "actions");
  const railEl = part("div", "rail");
  // The parts sit ahead of the page's children, so the composition reads first and wrapped content flows
  // below it inside the same slab. The rail comes last: beside the copy on a wide frame, under it on a
  // narrow one.
  under.el.after(headlineEl, subheadEl, actionsEl);
  host.append(railEl);
  const parts: readonly HTMLElement[] = [headlineEl, subheadEl, actionsEl];

  /** Writes a text part and hides it when it has nothing to say, so an empty prop leaves no empty heading. */
  function renderText(el: HTMLElement, text: string): void {
    el.textContent = text;
    el.hidden = text.trim() === "";
  }

  /** Rebuilds the action links from JSON, at most three, in source order. */
  function renderActions(): void {
    actionsEl.replaceChildren();
    const list = Array.isArray(props.actions) ? props.actions : [];
    for (const action of list.slice(0, MAX_ACTIONS)) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.href = typeof action?.href === "string" ? action.href : "#";
      a.textContent = typeof action?.label === "string" ? action.label : "";
      actionsEl.append(a);
    }
  }

  /** Rebuilds the rail's stat tiles from JSON, at most three, in source order. A fact with nothing to
   *  show draws no tile: an empty bevel is a hollow frame, not a stat. */
  function renderTiles(): void {
    railEl.replaceChildren();
    const list = Array.isArray(props.facts) ? props.facts : [];
    for (const fact of list.slice(0, MAX_FACTS)) {
      const label = typeof fact?.label === "string" ? fact.label.trim() : "";
      const value = typeof fact?.value === "string" ? fact.value.trim() : "";
      if (label === "" && value === "") continue;
      const tile = part("div", "tile");
      if (label !== "") {
        const flabel = part("div", "flabel");
        flabel.textContent = label;
        tile.append(flabel);
      }
      if (value !== "") {
        const fvalue = part("div", "fvalue");
        fvalue.textContent = value;
        tile.append(fvalue);
      }
      railEl.append(tile);
    }
    railEl.style.display = railEl.childElementCount > 0 ? "" : "none";
  }

  /** The rail's tiles, for measuring and observing. */
  function tileEls(): Element[] {
    return Array.from(railEl.children);
  }

  /** True when the rail folds back into the first column, where the slab wraps it as the panel's own
   *  stat strip. Set by applyLayout, read by contentRect. */
  let stacked = false;

  /** Recomputes which layout the frame takes and how many rows the rail spans. The rail stacks under the
   *  copy on a narrow host and stands beside it on a wide one, where it spans every row the first column
   *  holds so its tiles centre on the copy rather than on the frame. */
  function applyLayout(): void {
    stacked = host.clientWidth < COLLAPSE;
    const min = stacked;
    attrs.set("data-pica-fit", min ? "min" : null);
    let rows = 0;
    for (const el of Array.from(host.children)) {
      if (el.hasAttribute("data-pica")) {
        if (parts.includes(el as HTMLElement) && !(el as HTMLElement).hidden) rows++;
      } else rows++;
    }
    railEl.style.gridRow = min ? "" : `1 / span ${Math.max(1, rows)}`;
  }

  /** Sizes the backing store to the host at one pixel per CSS pixel. */
  function syncSize(): void {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  /** The slab's rect: the union of everything the first column holds — the page's children and the core's
   *  parts, and the rail too when it folds back under the copy — plus the slab's own padding, in canvas
   *  pixels relative to the host. The padding gives way before the frame's outer margin does, and the
   *  right edge gives way to a rail standing beside the copy, which needs clear ground between the two
   *  reliefs. Null when the column is empty. */
  function contentRect(): SlabBox | null {
    const box = host.getBoundingClientRect();
    let x0 = Number.POSITIVE_INFINITY;
    let y0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let y1 = Number.NEGATIVE_INFINITY;
    const take = (el: Element): void => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      x0 = Math.min(x0, r.left);
      y0 = Math.min(y0, r.top);
      x1 = Math.max(x1, r.right);
      y1 = Math.max(y1, r.bottom);
    };
    for (const el of Array.from(host.children)) if (!el.hasAttribute("data-pica")) take(el);
    for (const el of parts) take(el);
    if (stacked) take(railEl);
    if (x1 <= x0 || y1 <= y0) return null;
    const cx0 = x0 - box.left;
    const cy0 = y0 - box.top;
    const cx1 = x1 - box.left;
    const cy1 = y1 - box.top;
    const margin = frameMargin(box.width);
    const pad = slabPad(box.width);
    let right = box.width - margin;
    if (!stacked) {
      for (const tile of tileEls()) {
        const r = tile.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.top - box.top < cy1 && r.bottom - box.top > cy0) {
          right = Math.min(right, r.left - box.left - 2 * BEVEL_REACH - CLEAR);
        }
      }
    }
    return {
      x0: Math.max(0, Math.min(Math.max(margin, cx0 - pad), cx0 - MIN_PAD)),
      y0: Math.max(0, Math.min(Math.max(margin, cy0 - pad), cy0 - MIN_PAD)),
      x1: Math.min(box.width, Math.max(Math.min(right, cx1 + pad), cx1 + MIN_PAD)),
      y1: Math.min(box.height, Math.max(Math.min(box.height - margin, cy1 + pad), cy1 + MIN_PAD)),
    };
  }

  function draw(): void {
    syncSize();
    const w = canvas.width;
    const h = canvas.height;
    if (!ctx || w < 1 || h < 1) return;
    if (!image || image.width !== w || image.height !== h) image = ctx.createImageData(w, h);
    else image.data.fill(0);
    const data = image.data;
    const fg = parseColor(palette.colors.fg);
    const bg = parseColor(palette.colors.bg);
    // The lit edges take ink toward the page's foreground and the shaded edges take the extreme away from
    // it: black under a dark ground, white under a light one. A pressed element swaps the two. The tone is
    // read here rather than through hostTone, which walks the tree with a probe this MutationObserver would
    // hear.
    const fgLum = relativeLuminance(palette.colors.fg);
    let bgLum = 1;
    for (let el: HTMLElement | null = host; el; el = el.parentElement) {
      const background = getComputedStyle(el).backgroundColor;
      if (parseColor(background)[3] > 0) {
        bgLum = relativeLuminance(background);
        break;
      }
    }
    const dark = fgLum > bgLum;
    const lit: BevelInk = dark ? fg : [255, 255, 255, 255];
    const shade: BevelInk = dark ? [0, 0, 0, 255] : fg;
    const mask = blueNoiseMatrix(SCREEN);
    const ox = hashSeed(props.seed, 3) % SCREEN;
    const oy = hashSeed(props.seed, 5) % SCREEN;
    const depth = Math.min(1, Math.max(0, props.depth));
    const near = NEAR_INK * depth;
    const far = FAR_INK * depth;

    /** Fills one band of the ring around an element: the row next to the face solid, the next few pixels
     *  at the stronger coverage, the rest at the weaker. `dist` gives a pixel's distance out from the
     *  face's edge, so the tone steps fall away with it rather than sitting flat. */
    function ring(xa: number, ya: number, xb: number, yb: number, ink: BevelInk, dist: (x: number, y: number) => number): void {
      const xA = Math.max(0, Math.round(xa));
      const yA = Math.max(0, Math.round(ya));
      const xB = Math.min(w, Math.round(xb));
      const yB = Math.min(h, Math.round(yb));
      const [r, g, b, a] = ink;
      for (let y = yA; y < yB; y++) {
        for (let x = xA; x < xB; x++) {
          const d = dist(x, y);
          const cover = d <= 1 ? 1 : d <= 1 + BEVEL_NEAR ? near : far;
          if (cover < 1 && maskAt(mask, SCREEN, x + ox, y + oy) >= cover) continue;
          const i = (y * w + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = a;
        }
      }
    }

    /** Fills an element's face with the ground color. An unset bg token leaves the face transparent, which
     *  is the same thing: the page's own ground shows through either way. */
    function face(x0: number, y0: number, x1: number, y1: number): void {
      const [r, g, b, a] = bg;
      if (a === 0) return;
      const xA = Math.max(0, Math.round(x0));
      const yA = Math.max(0, Math.round(y0));
      const xB = Math.min(w, Math.round(x1));
      const yB = Math.min(h, Math.round(y1));
      for (let y = yA; y < yB; y++) {
        for (let x = xA; x < xB; x++) {
          const i = (y * w + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = a;
        }
      }
    }

    /** Draws the screened bevel around a rect: the solid edge line and two tone steps along the top and left
     *  in `tl`, mirrored along the bottom and right in `br`. The top and bottom bands take their corner
     *  squares, so light wraps the whole top of a raised element. Raised draws the ring on the ground just
     *  outside the face; pressed draws the same ring inverted on the face itself, which is what reads as
     *  pushed in rather than lifted. */
    function bevel(x0: number, y0: number, x1: number, y1: number, tl: BevelInk, br: BevelInk, inset: boolean): void {
      if (inset) {
        ring(x0, y0, x1, y0 + BEVEL_REACH, tl, (_x, y) => y - y0 + 1);
        ring(x0, y1 - BEVEL_REACH, x1, y1, br, (_x, y) => y1 - y);
        ring(x0, y0 + BEVEL_REACH, x0 + BEVEL_REACH, y1 - BEVEL_REACH, tl, (x) => x - x0 + 1);
        ring(x1 - BEVEL_REACH, y0 + BEVEL_REACH, x1, y1 - BEVEL_REACH, br, (x) => x1 - x);
        return;
      }
      ring(x0 - BEVEL_REACH, y0 - BEVEL_REACH, x1 + BEVEL_REACH, y0, tl, (_x, y) => y0 - y);
      ring(x0 - BEVEL_REACH, y1, x1 + BEVEL_REACH, y1 + BEVEL_REACH, br, (_x, y) => y - y1 + 1);
      ring(x0 - BEVEL_REACH, y0, x0, y1, tl, (x) => x0 - x);
      ring(x1, y0, x1 + BEVEL_REACH, y1, br, (x) => x - x1 + 1);
    }

    /** One extruded rect measured from a live element: the face fills with the ground, then the raised
     *  ring goes around it. */
    const raised = (el: Element): void => {
      const box = host.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const x0 = Math.round(r.left - box.left);
      const y0 = Math.round(r.top - box.top);
      const x1 = Math.round(r.right - box.left);
      const y1 = Math.round(r.bottom - box.top);
      face(x0, y0, x1, y1);
      bevel(x0, y0, x1, y1, lit, shade, false);
    };

    const slab = contentRect();
    if (slab) {
      face(slab.x0, slab.y0, slab.x1, slab.y1);
      bevel(slab.x0, slab.y0, slab.x1, slab.y1, lit, shade, false);
    }
    for (const tile of tileEls()) raised(tile);
    const box = host.getBoundingClientRect();
    for (const [index, a] of actionsEl.querySelectorAll("a").entries()) {
      const r = a.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const x0 = Math.round(r.left - box.left);
      const y0 = Math.round(r.top - box.top);
      const x1 = Math.round(r.right - box.left);
      const y1 = Math.round(r.bottom - box.top);
      face(x0, y0, x1, y1);
      if (index === 0) bevel(x0, y0, x1, y1, shade, lit, true);
      else bevel(x0, y0, x1, y1, lit, shade, false);
    }
    ctx.putImageData(image, 0, 0);
  }

  const palette = watchPalette(host, draw);

  // Reflow lands here from three directions: the host itself, any content element's own box, and children
  // the page swaps out entirely. Each one ends at a redraw; only a swapped child needs the watch set rebuilt.
  const resize = new ResizeObserver(() => {
    applyLayout();
    draw();
  });
  function observe(): void {
    resize.disconnect();
    resize.observe(host);
    for (const el of Array.from(host.children)) if (!el.hasAttribute("data-pica")) resize.observe(el);
    for (const el of parts) resize.observe(el);
    for (const tile of tileEls()) resize.observe(tile);
    for (const a of actionsEl.querySelectorAll("a")) resize.observe(a);
  }
  // Only a child the page added or removed counts. The core's own nodes are marked, and skipping them is
  // what keeps an observer that redraws on mutation from answering its own work forever.
  const mutations = new MutationObserver((list) => {
    for (const record of list) {
      const nodes = [...record.addedNodes, ...record.removedNodes];
      if (nodes.some((node) => !(node instanceof Element) || !node.hasAttribute("data-pica"))) {
        observe();
        applyLayout();
        draw();
        return;
      }
    }
  });

  sheet.setRules(rules(sheet.selector, props));
  renderText(headlineEl, props.headline);
  renderText(subheadEl, props.subhead);
  renderActions();
  renderTiles();
  applyLayout();
  draw();
  observe();
  mutations.observe(host, { childList: true });
  host.dataset.picaReady = "true";

  let dead = false;
  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      palette.refresh();
      if (before.align !== props.align || before.minHeight !== props.minHeight) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (before.headline !== props.headline) renderText(headlineEl, props.headline);
      if (before.subhead !== props.subhead) renderText(subheadEl, props.subhead);
      if (!sameJson(before.actions, props.actions)) renderActions();
      if (!sameJson(before.facts, props.facts)) renderTiles();
      observe();
      applyLayout();
      draw();
    },
    destroy() {
      if (dead) return;
      dead = true;
      mutations.disconnect();
      resize.disconnect();
      palette.destroy();
      headlineEl.remove();
      subheadEl.remove();
      actionsEl.remove();
      railEl.remove();
      under.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/neumorphic-hero/index.tsx
export type NeumorphicHeroComponentProps = Partial<NeumorphicHeroProps> & WrapperProps & { children?: ReactNode };

/** A soft UI hero: content on a slab raised from the ground by screened bevels, with a pressed call to action. */
export function NeumorphicHero({ className, style, palette, children, ...props }: NeumorphicHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
