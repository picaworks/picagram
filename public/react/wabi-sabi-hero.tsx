"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Wabi Sabi Hero · wabi-sabi-hero
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

// registry/sections/wabi-sabi-hero/core.ts
/** One call to action: a link's visible text and destination. */
export interface WabiSabiHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface WabiSabiHeroProps {
  /** The headline, set large in the page's own font. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline, drawn in the muted color. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as links in source order. The first draws solid in the foreground color, the rest draw hairline. At most three are drawn. */
  actions: readonly WabiSabiHeroAction[];
  /** Which side the content leans toward: "start" opens the void on the right, "end" mirrors the whole composition. */
  align: "start" | "end";
  /** Draw the enclosing frame, one side of it missing and every drawn side stopping short of its corner. */
  frame: boolean;
  /** How much speckle and staining the ground carries, from none at 0 to full wear at 1. */
  wear: number;
  /** How strongly the drawn work shows, from 0 to 1. */
  intensity: number;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** Seed for every irregularity, so the same seed always finds the same imperfections. */
  seed: number;
}

export const defaults: WabiSabiHeroProps = {
  headline: "Left unfinished on purpose.",
  subhead:
    "An off centre hero whose boundary never closes, whose rules stop short, and whose wear gathers where hands would go.",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  frame: true,
  wear: 0.8,
  intensity: 0.8,
  minHeight: 72,
  seed: 1,
};

/** Below this host width every column goes full width and the lone fragment hides. */
const MIN_WIDE = 760;
const TRACKS = "repeat(12, minmax(0, 1fr))";
const GUTTER = "clamp(0.75rem, 2vw, 1.5rem)";
const ROW_GAP = "clamp(1rem, 2.6vh, 1.8rem)";
const PAD_TOP = "clamp(4.5rem, 13vh, 8.5rem)";
const PAD_BOTTOM = "clamp(3rem, 9vh, 6rem)";
const PAD_SIDE = "clamp(1.25rem, 5vw, 4.5rem)";
/** Grain buffer resolution as a fraction of CSS size, so each speckle lands as a two pixel fleck. */
const GRAIN_SCALE = 0.5;
/** The most pixels the grain buffer may hold before its scale drops below GRAIN_SCALE. */
const GRAIN_MAX = 240000;
/** Coarse lattice the large scale drift is sampled from, in grain buffer cells. Speckle is per pixel but
 *  drift only needs to be lumpy, so a five pixel grid keeps a full repaint cheap. */
const DRIFT_CELL = 5;
/** How far wear reaches inward from a drawn line, in CSS pixels. Narrow, so a rule keeps its shoulders
 *  dusty instead of smearing into a band. */
const LINE_REACH = 14;
/** The largest canvas backing store, in pixels. */
const MAX_BACKING = 4200000;

interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** A drawn piece of line with its own strength, so worn spots can fade instead of vanishing. */
interface Stroke {
  seg: Seg;
  alpha: number;
}

/** A measured rectangle in host coordinates. */
interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** A seeded value in [0, 1) for one buffer cell, independent of traversal order. */
function hash01(seed: number, a: number, b: number): number {
  return hashSeed(seed, a, b) / 4294967296;
}

/** Creates one element the core owns, marked for identification and scoped styling. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** Distance from a point to a segment, used to weight wear so it hugs the drawn lines. */
function segDist(px: number, py: number, s: Seg): number {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - s.x1) * dx + (py - s.y1) * dy) / l2 : 0;
  t = clamp01(t);
  return Math.hypot(s.x1 + dx * t - px, s.y1 + dy * t - py);
}

/** 1 at the edge, falling to 0 at `reach` pixels inward. */
function edge(d: number, reach: number): number {
  return clamp01(1 - d / reach);
}

/** Layout for the host and the button grammar for its calls to action. The copy leans to one side of a
 *  twelve column grid and sits low, so the empty field stays the largest element. The minimum height
 *  sits in a :where() rule, which carries no specificity, so a page that gives this host a height of its
 *  own wins without fighting an inline style. */
function rules(selector: string, p: WabiSabiHeroProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const col = p.align === "end" ? "7 / 13" : "1 / 7";
  const edge2 = p.align === "end" ? "flex-end" : "flex-start";
  const textAlign = p.align === "end" ? "end" : "start";
  return [
    `:where(${selector}){min-height:${vh(p.minHeight)}vh}`,
    `${selector}{position:relative;isolation:isolate;box-sizing:border-box;display:grid;grid-template-columns:${TRACKS};column-gap:${GUTTER};row-gap:${ROW_GAP};align-content:end;padding:${PAD_TOP} ${PAD_SIDE} ${PAD_BOTTOM};color:${fg};text-align:${textAlign}}`,
    `${selector} *{box-sizing:border-box}`,
    `${selector} > *{min-width:0}`,
    `${selector} > :not([data-pica]){grid-column:${col};margin:0;min-width:0;max-width:30em;overflow-wrap:break-word}`,
    `${selector} [data-pica-type]{grid-column:${col};grid-row:1;min-width:0;text-align:${textAlign}}`,
    `${selector} [data-pica-headline]{margin:0;max-width:9.5em;font-size:clamp(2.3rem,5.6vw,4.4rem);line-height:1.05;font-weight:640;letter-spacing:-0.015em;overflow-wrap:break-word}`,
    `${selector} [data-pica-subhead]{margin:1.1em 0 0;max-width:28em;font-size:clamp(1rem,1.4vw,1.18rem);line-height:1.62;color:${muted}}`,
    `${selector} [data-pica-actions]{grid-column:${col};display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;justify-content:${edge2}}`,
    `${selector} [data-pica-actions][hidden],${selector} [data-pica-actions]:empty{display:none}`,
    `${selector} [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.3em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    // The solid variant fills with the foreground color and lets a span carry the contrasting ink. The
    // color cannot sit on the link itself: an unset fg token resolves to currentColor, which is the link's
    // own color, so the fill would turn into whatever the text became.
    `${selector} [data-pica-actions] a[data-variant="solid"]{background:${fg};border-color:${fg}}`,
    `${selector} [data-pica-actions] a[data-variant="solid"] > span{color:${cssOn("fg")}}`,
    `${selector} [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${fg} 80%, transparent)}`,
    `${selector} [data-pica-actions] a[data-variant="outline"]:hover{border-color:${fg};background:color-mix(in srgb, ${fg} 9%, transparent)}`,
    `${selector} [data-pica-actions] a:focus-visible{outline:2px solid ${fg};outline-offset:2px}`,
    `${selector}[data-pica-fit="min"] > :not([data-pica]),${selector}[data-pica-fit="min"] [data-pica-type],${selector}[data-pica-fit="min"] [data-pica-actions]{grid-column:1 / -1;max-width:none}`,
  ].join("\n");
}

/** Rebuilds the action links from JSON: the first solid in the foreground, the rest hairline, in source order. */
function renderActions(container: HTMLElement, actions: readonly WabiSabiHeroAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.slice(0, 3).entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href;
    const label = document.createElement("span");
    label.setAttribute("data-pica", "");
    label.textContent = action.label;
    a.append(label);
    container.append(a);
  }
  container.hidden = actions.length === 0;
}

/** One side of the frame as drawn pieces. It begins and ends short of its corners, skips a few places
 *  where the line wore through, and thins where the surface was rubbed. Every measurement comes from the
 *  seed, so the wear is found, not applied: nothing is spaced evenly and no two sides wear alike. */
function sideStrokes(a: readonly [number, number], b: readonly [number, number], rng: () => number): Stroke[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 12) return [];
  const ux = dx / len;
  const uy = dy / len;
  const s0 = len * (0.012 + rng() * 0.05);
  const s1 = len * (0.012 + rng() * 0.05);
  const cuts: [number, number][] = [];
  const nCuts = rng() < 0.72 ? 1 + Math.floor(rng() * 2.2) : 0;
  for (let i = 0; i < nCuts; i++) {
    const p = len * (0.14 + rng() * 0.72);
    const w = 1.4 + rng() * 3.4;
    cuts.push([p - w / 2, p + w / 2]);
  }
  const thins: [number, number][] = [];
  const nThins = rng() < 0.6 ? 1 + Math.floor(rng() * 1.6) : 0;
  for (let i = 0; i < nThins; i++) {
    const p = len * (0.08 + rng() * 0.84);
    const w = 10 + rng() * 34;
    thins.push([p - w / 2, p + w / 2]);
  }
  const marks = [...cuts.flat(), ...thins.flat()].filter((t) => t > s0 + 0.5 && t < len - s1 - 0.5).sort((m, n) => m - n);
  const inside = (ranges: [number, number][], t: number): boolean => ranges.some(([x, y]) => t >= x && t <= y);
  const out: Stroke[] = [];
  const base = 0.58 + rng() * 0.22;
  let prev = s0;
  for (const t of [...marks, len - s1]) {
    const mid = (prev + t) / 2;
    if (!inside(cuts, mid) && t - prev > 0.5) {
      const thin = inside(thins, mid);
      out.push({
        seg: { x1: a[0] + ux * prev, y1: a[1] + uy * prev, x2: a[0] + ux * t, y2: a[1] + uy * t },
        alpha: thin ? base * 0.4 : base * (0.85 + rng() * 0.3),
      });
    }
    prev = t;
  }
  return out;
}

/** The remnant a missing side leaves behind: one short piece anchored where a corner would have been. */
function stubStrokes(a: readonly [number, number], b: readonly [number, number], rng: () => number): Stroke[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 12) return [];
  const ux = dx / len;
  const uy = dy / len;
  const sl = len * (0.07 + rng() * 0.11);
  const t0 = rng() < 0.5 ? 0 : len - sl;
  return [{ seg: { x1: a[0] + ux * t0, y1: a[1] + uy * t0, x2: a[0] + ux * (t0 + sl), y2: a[1] + uy * (t0 + sl) }, alpha: 0.55 + rng() * 0.2 }];
}

export const mount: Mount<WabiSabiHeroProps> = (host, initial = {}) => {
  let props: WabiSabiHeroProps = { ...defaults, ...initial };
  let dead = false;

  const sheet = scope(host);
  const attrs = hostAttributes(host);

  const typeEl = part("div", "type");
  const headlineEl = part("h1", "headline");
  const subheadEl = part("p", "subhead");
  typeEl.append(headlineEl, subheadEl);
  const actionsEl = part("div", "actions");
  host.append(typeEl, actionsEl);

  /** The page's own children, which the core never marks and never touches. */
  function pageChildren(): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (const el of Array.from(host.children)) {
      if (el instanceof HTMLElement && !el.hasAttribute("data-pica")) out.push(el);
    }
    return out;
  }

  /** The calls to action sit in the first row after the page's children, whatever their count. */
  function applyRows(): void {
    actionsEl.style.gridRow = `${pageChildren().length + 2}`;
  }

  /** Writes a text part and hides it when it has nothing to say, so an empty prop leaves no empty element. */
  function renderText(): void {
    headlineEl.textContent = props.headline;
    headlineEl.hidden = props.headline.trim() === "";
    subheadEl.textContent = props.subhead;
    subheadEl.hidden = props.subhead.trim() === "";
    typeEl.hidden = headlineEl.hidden && subheadEl.hidden;
  }

  /** The union of everything the column rule floats above: the type block, the calls to action, and the
   *  page's children. */
  function contentBox(): Box | null {
    let l = Infinity;
    let t = Infinity;
    let r = -Infinity;
    let b = -Infinity;
    for (const el of [typeEl, actionsEl, ...pageChildren()]) {
      if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;
      l = Math.min(l, el.offsetLeft);
      t = Math.min(t, el.offsetTop);
      r = Math.max(r, el.offsetLeft + el.offsetWidth);
      b = Math.max(b, el.offsetTop + el.offsetHeight);
    }
    return r > l && b > t ? { l, t, r, b } : null;
  }

  sheet.setRules(rules(sheet.selector, props));
  renderText();
  renderActions(actionsEl, props.actions);
  applyRows();

  // The drawn work sits in a layer under the content, hidden from assistive technology, so the page's
  // copy stays readable and hit testable above it.
  const under = layer(host, "under");
  const canvas = part("canvas", "surface");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
  under.el.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const paletteWatch = watchPalette(host, () => draw());

  /** Repaints the whole drawing: the incomplete frame, the lone fragments, and the seeded wear field.
   *  Speckle gathers where a surface would be handled, along the bottom and the drawn lines, and thins
   *  toward the open field, so the empty space stays empty. */
  function draw(): void {
    if (dead || !ctx) return;
    paletteWatch.refresh();
    const W = host.clientWidth;
    const H = host.clientHeight;
    if (W < 2 || H < 2) return;
    attrs.set("data-pica-fit", W < MIN_WIDE ? "min" : null);
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2, Math.sqrt(MAX_BACKING / Math.max(1, W * H)));
    const bw = Math.max(1, Math.round(W * dpr));
    const bh = Math.max(1, Math.round(H * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    const colors = paletteWatch.colors;
    const k = 0.3 + 0.7 * clamp01(props.intensity);
    const rng = createRng(hashSeed(props.seed, 7));
    const noise = createNoise(hashSeed(props.seed, 13));
    const m = Math.min(W, H);
    const strokes: Stroke[] = [];

    if (props.frame) {
      // Each side gets its own inset, so the frame leans a little rather than sitting square.
      const ins = [m * (0.036 + rng() * 0.02), m * (0.036 + rng() * 0.02), m * (0.036 + rng() * 0.02), m * (0.036 + rng() * 0.02)];
      const f: Box = { l: ins[3] ?? 0, t: ins[0] ?? 0, r: W - (ins[1] ?? 0), b: H - (ins[2] ?? 0) };
      const corners: [readonly [number, number], readonly [number, number]][] = [
        [[f.l, f.t], [f.r, f.t]],
        [[f.r, f.t], [f.r, f.b]],
        [[f.l, f.b], [f.r, f.b]],
        [[f.l, f.t], [f.l, f.b]],
      ];
      const missing = Math.floor(rng() * 4);
      for (const [i, pair] of corners.entries()) {
        const [a, b] = pair;
        strokes.push(...(i === missing ? stubStrokes(a, b, rng) : sideStrokes(a, b, rng)));
      }
    }

    // A rule above the copy that ends well before the column does.
    const box = contentBox();
    if (box) {
      const y = box.t - Math.min(30, Math.max(14, H * 0.028));
      if (y > 8) strokes.push({ seg: { x1: box.l, y1: y, x2: box.l + (box.r - box.l) * (0.4 + rng() * 0.26), y2: y }, alpha: 0.5 + rng() * 0.18 });
    }

    // One lone fragment in the void, a rule that never met anything.
    if (W >= MIN_WIDE) {
      const vx = props.align === "end" ? W * (0.3 - rng() * 0.16) : W * (0.7 + rng() * 0.16);
      const vy = H * (0.15 + rng() * 0.3);
      strokes.push({ seg: { x1: vx, y1: vy, x2: vx + 26 + rng() * 72, y2: vy }, alpha: 0.42 + rng() * 0.2 });
    }

    // Stains are seeded blotches that raise the local wear, so age arrives in patches.
    const stains: { x: number; y: number; rx: number; ry: number }[] = [];
    const nStains = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < nStains; i++) {
      stains.push({ x: W * (0.12 + rng() * 0.76), y: H * (0.42 + rng() * 0.5), rx: m * (0.1 + rng() * 0.2), ry: m * (0.07 + rng() * 0.14) });
    }

    const amount = clamp01(props.wear);
    if (amount > 0) {
      const scale = Math.min(GRAIN_SCALE, Math.sqrt(GRAIN_MAX / (W * H)));
      const gw = Math.max(1, Math.round(W * scale));
      const gh = Math.max(1, Math.round(H * scale));
      const buf = document.createElement("canvas");
      buf.width = gw;
      buf.height = gh;
      const bctx = buf.getContext("2d");
      if (bctx) {
        const [fr, fg2, fb] = parseColor(colors.fg);
        // The drift lattice: large scale patchiness, so speckle clumps and drifts instead of falling evenly.
        const cw = Math.floor(gw / DRIFT_CELL) + 1;
        const ch = Math.floor(gh / DRIFT_CELL) + 1;
        const drift = new Float32Array(cw * ch);
        for (let gy = 0; gy < ch; gy++) {
          for (let gx = 0; gx < cw; gx++) {
            const n = noise.noise2((gx * DRIFT_CELL * 2.6) / gw, (gy * DRIFT_CELL * 2.6) / gw);
            drift[gy * cw + gx] = clamp01(((n + 1) * 0.5 - 0.42) / 0.5);
          }
        }
        // The actions are the one place a hand would actually go, so the ground wears a little there.
        const ab: Box | null = actionsEl.offsetWidth > 0
          ? { l: actionsEl.offsetLeft - 24, t: actionsEl.offsetTop - 24, r: actionsEl.offsetLeft + actionsEl.offsetWidth + 24, b: actionsEl.offsetTop + actionsEl.offsetHeight + 24 }
          : null;
        const img = bctx.createImageData(gw, gh);
        const data = img.data;
        for (let y = 0; y < gh; y++) {
          const cy = (y + 0.5) / scale;
          const dRow = Math.min(ch - 1, Math.floor(y / DRIFT_CELL)) * cw;
          for (let x = 0; x < gw; x++) {
            const cx = (x + 0.5) / scale;
            // Handled edges: the bottom rim wears deepest, the sides less, the top barely.
            const rim = Math.max(
              edge(cx, m * 0.045) * 0.45,
              edge(W - cx, m * 0.045) * 0.45,
              edge(cy, m * 0.035) * 0.28,
              edge(H - cy, m * 0.085) * 0.75,
            );
            let near = 0;
            for (const { seg } of strokes) {
              const v = edge(segDist(cx, cy, seg), LINE_REACH);
              if (v > near) near = v;
            }
            let held = 0;
            if (ab) {
              const ddx = Math.max(ab.l - cx, 0, cx - ab.r);
              const ddy = Math.max(ab.t - cy, 0, cy - ab.b);
              held = edge(Math.hypot(ddx, ddy), 40) * 0.45;
            }
            const dr = drift[dRow + Math.min(cw - 1, Math.floor(x / DRIFT_CELL))] ?? 0;
            let stain = 0;
            for (const s of stains) {
              const sx = (cx - s.x) / s.rx;
              const sy = (cy - s.y) / s.ry;
              const r = sx * sx + sy * sy;
              if (r < 1) {
                const v = (1 - r) * (0.35 + dr * 0.65);
                if (v > stain) stain = v;
              }
            }
            // Wear gathers where a hand would reach and where the drift lumps it, and the drift also
            // damps what it does not claim, so the open field keeps only rare stray flecks.
            const density = clamp01(rim * 0.8 + near * 0.6 + held + stain * 0.7 + dr * 0.16) * (0.3 + 0.7 * dr) * amount;
            if (hash01(props.seed, x, y) < density * density * 0.5) {
              const a = Math.round(255 * (0.1 + 0.4 * hash01(props.seed, y, x)) * k);
              const idx = (y * gw + x) * 4;
              data[idx] = fr;
              data[idx + 1] = fg2;
              data[idx + 2] = fb;
              data[idx + 3] = a;
            }
          }
        }
        bctx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(buf, 0, 0, gw, gh, 0, 0, W, H);
      }
    }

    ctx.strokeStyle = colors.muted;
    for (const { seg, alpha } of strokes) {
      ctx.globalAlpha = clamp01(alpha * k);
      ctx.beginPath();
      if (Math.abs(seg.y2 - seg.y1) < 1) {
        const y = Math.round(seg.y1) + 0.5;
        ctx.moveTo(seg.x1, y);
        ctx.lineTo(seg.x2, y);
      } else {
        const x = Math.round(seg.x1) + 0.5;
        ctx.moveTo(x, seg.y1);
        ctx.lineTo(x, seg.y2);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  draw();
  host.dataset.picaReady = "true";

  const resizer = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
  resizer?.observe(host);
  const mutator = typeof MutationObserver === "function" ? new MutationObserver(() => {
    applyRows();
    draw();
  }) : null;
  mutator?.observe(host, { childList: true, subtree: true, characterData: true });
  if (document.fonts?.ready) void document.fonts.ready.then(() => draw());

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (before.headline !== props.headline || before.subhead !== props.subhead) renderText();
      if (!sameJson(before.actions, props.actions)) renderActions(actionsEl, props.actions);
      if (before.align !== props.align || before.minHeight !== props.minHeight) sheet.setRules(rules(sheet.selector, props));
      applyRows();
      draw();
    },
    destroy() {
      dead = true;
      resizer?.disconnect();
      mutator?.disconnect();
      paletteWatch.destroy();
      canvas.remove();
      under.remove();
      typeEl.remove();
      actionsEl.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/wabi-sabi-hero/index.tsx
export type WabiSabiHeroComponentProps = Partial<WabiSabiHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero laid out like a worn page: an incomplete frame, rules that stop short, and seeded wear. */
export function WabiSabiHero({ className, style, palette, children, ...props }: WabiSabiHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
