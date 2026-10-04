# Bohemian Hero

> A hero dressed like a weaving: seeded thread bands, a scalloped hairline arch, and copy offset against a selvedge joined by a woven crossband.

Category: sections. Tags: hero, bohemian, woven, textile, arch, border, section. Static. Size: 5.6 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/bohemian-hero.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `headline` | string | `"Woven at the edges, open in the middle."` | The headline inside the arch, set large in the page's own font. Empty hides it. |
| `subhead` | string | `"Counted thread bands frame the field, an arch shelters the copy, and the prose always sits in front of the work."` | Supporting copy under the headline. Empty hides it. |
| `actions` | readonly BohemianHeroAction[] | `[{"label":"Browse components","href":"#components"},{"label":"Read the docs","href":"#docs"}]` | Calls to action, drawn as links in source order. The first draws solid in the accent, the rest draw hairline. At most three are drawn. |
| `align` | "start" \| "end" | `"start"` | Which side of the field the enclosure leans toward: "start" hangs it on the left, "end" mirrors the whole composition. |
| `bands` | boolean | `true` | Draw the woven bands along the top and bottom edges, the fringe, the selvedge, and the crossband tied between it and the arch. |
| `arch` | boolean | `true` | Draw the arched boundary around the content. |
| `intensity` | number | `0.8` | How strongly the drawn work shows, from 0 to 1. |
| `minHeight` | number | `62` | The host's minimum height, in percent of the viewport height. |
| `seed` | number | `1` | Seed for the woven motif, so the same seed always draws the same tile. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with `--pica-fg`, `--pica-muted`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Bohemian Hero · bohemian-hero
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

// registry/sections/bohemian-hero/core.ts
/** One call to action: a link's visible text and destination. */
export interface BohemianHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface BohemianHeroProps {
  /** The headline inside the arch, set large in the page's own font. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as links in source order. The first draws solid in the accent, the rest draw hairline. At most three are drawn. */
  actions: readonly BohemianHeroAction[];
  /** Which side of the field the enclosure leans toward: "start" hangs it on the left, "end" mirrors the whole composition. */
  align: "start" | "end";
  /** Draw the woven bands along the top and bottom edges, the fringe, the selvedge, and the crossband tied between it and the arch. */
  bands: boolean;
  /** Draw the arched boundary around the content. */
  arch: boolean;
  /** How strongly the drawn work shows, from 0 to 1. */
  intensity: number;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** Seed for the woven motif, so the same seed always draws the same tile. */
  seed: number;
}

export const defaults: BohemianHeroProps = {
  headline: "Woven at the edges, open in the middle.",
  subhead: "Counted thread bands frame the field, an arch shelters the copy, and the prose always sits in front of the work.",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  bands: true,
  arch: true,
  intensity: 0.8,
  minHeight: 62,
  seed: 1,
};

/** Side of the square woven tile, in CSS pixels. A border band is exactly one tile thick. */
const TILE = 30;
/** Thickness of the top and bottom bands, in CSS pixels. */
const BAND = TILE;
/** Width of the narrow selvedge strip on the open edge, in CSS pixels. */
const RUNNER = 28;
/** Gap between a band's weave and the hairlines that bound it, in CSS pixels. */
const BAND_GAP = 4.5;
/** Radius of each scallop under the top band and along the inner arch, in CSS pixels. */
const SCALLOP = 4.2;
/** Distance between scallop centres along a curve, in CSS pixels. */
const SCALLOP_STEP = 10.5;
/** Below this host width the selvedge and the swatch hide and every column goes full width. */
const MIN_WIDE = 760;
/** Inset between the outer arch and the inner one, in CSS pixels. */
const ARCH_INSET = 9;

const TRACKS = "repeat(12, minmax(0, 1fr))";
const GUTTER = "clamp(0.75rem, 2vw, 1.5rem)";
const ROW_GAP = "clamp(1rem, 2.4vh, 1.7rem)";
const PAD_TOP = "clamp(5.5rem, 14vh, 9rem)";
const PAD_BOTTOM = "clamp(5rem, 11vh, 7rem)";
const PAD_SIDE = "clamp(1.25rem, 5vw, 4.5rem)";

/** A measured rectangle in host coordinates, the union the arch is drawn around. */
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

/** Reads a pixel length from a computed style, falling back to 0. */
function px(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** Creates one element the core owns, marked for identification and scoped styling. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** A crisp horizontal hairline at a whole pixel. */
function hline(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, Math.round(y) + 0.5);
  ctx.lineTo(x2, Math.round(y) + 0.5);
  ctx.stroke();
}

/** A crisp vertical hairline at a whole pixel. */
function vline(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(Math.round(x) + 0.5, y1);
  ctx.lineTo(Math.round(x) + 0.5, y2);
  ctx.stroke();
}

/** Layout for the host and the button grammar for its calls to action. The content leans to one side of a
 *  twelve column grid and the woven work drawn under it supplies the counterweight. The minimum height sits
 *  in a :where() rule, which carries no specificity, so a page that gives this host a height still wins. */
function rules(selector: string, p: BohemianHeroProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const col = p.align === "end" ? "6 / 13" : "1 / 8";
  const edge = p.align === "end" ? "flex-end" : "flex-start";
  const textAlign = p.align === "end" ? "end" : "start";
  return [
    `:where(${selector}){min-height:${vh(p.minHeight)}vh}`,
    `${selector}{position:relative;isolation:isolate;box-sizing:border-box;display:grid;grid-template-columns:${TRACKS};column-gap:${GUTTER};row-gap:${ROW_GAP};align-content:center;padding:${PAD_TOP} ${PAD_SIDE} ${PAD_BOTTOM};color:${fg};text-align:${textAlign}}`,
    `${selector} *{box-sizing:border-box}`,
    `${selector} > *{min-width:0}`,
    `${selector} > :not([data-pica]){grid-column:${col};margin:0;min-width:0;max-width:33em;overflow-wrap:break-word}`,
    `${selector} [data-pica-type]{grid-column:${col};grid-row:1;min-width:0;text-align:${textAlign}}`,
    `${selector} [data-pica-headline]{margin:0;font-size:clamp(2.5rem,6vw,4.9rem);line-height:1.03;font-weight:650;letter-spacing:-0.015em;overflow-wrap:break-word}`,
    `${selector} [data-pica-subhead]{margin:1em 0 0;max-width:33em;font-size:clamp(1.02rem,1.45vw,1.24rem);line-height:1.6;color:${muted}}`,
    `${selector} [data-pica-actions]{grid-column:${col};display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;justify-content:${edge}}`,
    `${selector} [data-pica-actions][hidden],${selector} [data-pica-actions]:empty{display:none}`,
    `${selector} [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.3em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    `${selector} [data-pica-actions] a[data-variant="solid"]{background:${accent};border-color:${accent};color:${cssOn("accent")}}`,
    `${selector} [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${selector} [data-pica-actions] a[data-variant="outline"]:hover{border-color:${fg};background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector}[data-pica-fit="min"] > :not([data-pica]),${selector}[data-pica-fit="min"] [data-pica-type],${selector}[data-pica-fit="min"] [data-pica-actions]{grid-column:1 / -1;max-width:none}`,
  ].join("\n");
}

/** Rebuilds the action links from JSON: the first solid in the accent, the rest hairline, in source order. */
function renderActions(container: HTMLElement, actions: readonly BohemianHeroAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.slice(0, 3).entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href;
    a.textContent = action.label;
    container.append(a);
  }
  container.hidden = actions.length === 0;
}

/** One woven tile, drawn fresh from the seed each time the canvas repaints. Two weft rows of staggered
 *  thread dashes carry a centred diamond whose bead is the one dyed accent, with short warp ticks showing
 *  in the gaps. The band repeats this tile; nothing about it is copied from any pattern source. */
function makeTile(colors: Colors, seed: number, dpr: number, k: number): HTMLCanvasElement {
  const tile = document.createElement("canvas");
  const size = Math.max(1, Math.ceil(TILE * dpr));
  tile.width = size;
  tile.height = size;
  const c = tile.getContext("2d");
  if (!c) return tile;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rng = createRng(hashSeed(seed, 11));
  c.fillStyle = colors.fg;
  for (const y of [3.5, 24.5]) {
    const dash = 4 + Math.floor(rng() * 3);
    const gap = 2 + Math.floor(rng() * 3);
    const off = Math.floor(rng() * (dash + gap));
    c.globalAlpha = 0.5 * k;
    for (let x = -off; x < TILE; x += dash + gap) c.fillRect(x, y, dash, 3);
  }
  const mid = TILE / 2;
  c.strokeStyle = colors.fg;
  c.globalAlpha = 0.55 * k;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(mid, 8.5);
  c.lineTo(mid + 6, 14.5);
  c.lineTo(mid, 20.5);
  c.lineTo(mid - 6, 14.5);
  c.closePath();
  c.stroke();
  for (const edgeX of [0, TILE]) {
    c.beginPath();
    c.moveTo(edgeX, 11);
    c.lineTo(edgeX + (edgeX === 0 ? 3 : -3), 14.5);
    c.lineTo(edgeX, 18);
    c.stroke();
  }
  c.fillStyle = colors.accent;
  c.globalAlpha = 0.85 * k;
  c.fillRect(mid - 1.4, 13.1, 2.8, 2.8);
  c.fillStyle = colors.muted;
  c.globalAlpha = 0.5 * k;
  for (let i = 0; i < 3; i++) {
    const x = 2 + Math.floor(rng() * (TILE - 5));
    c.fillRect(x, 7.2, 1.4, 2.4);
    c.fillRect(TILE - 3 - Math.floor(rng() * (TILE - 6)), 20.4, 1.4, 2.4);
  }
  return tile;
}

/** Fills a rectangle with the woven tile, repeating from the canvas origin so every band stays in phase. */
function weave(ctx: CanvasRenderingContext2D, tile: HTMLCanvasElement, x: number, y: number, w: number, h: number): void {
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;
  ctx.fillStyle = pattern;
  ctx.fillRect(x, y, w, h);
}

/** The measurements the arch is drawn from, kept as their own step so the crossband can find the
 *  arch's edge without crossing it. */
interface ArchGeom {
  /** Centre x of the dome. */
  cx: number;
  /** Half the arch's width: half the content plus the side margin. */
  half: number;
  /** How far the dome rises above the shoulders. */
  rise: number;
  /** Shoulder height, where the dome meets the straight sides. */
  sY: number;
  /** The base line. */
  b: number;
}

/** Measures the arch around the content box: the content plus a side margin, a dome whose rise is
 *  bounded by the clear field above so it never touches the band, and a base that stops short of the
 *  bottom band. Null when the field is too tight to draw it. */
function archGeometry(box: Box, width: number, topInner: number, bottomTop: number): ArchGeom | null {
  const mX = Math.min(46, Math.max(24, width * 0.04));
  const half = (box.r - box.l) / 2 + mX;
  const rise = Math.min(half * 0.52, box.t - topInner - 16, 210);
  if (rise < 16) return null;
  const sY = box.t - 8;
  const b = Math.min(box.b + 30, bottomTop - 8);
  if (b - sY < 40) return null;
  return { cx: (box.l + box.r) / 2, half, rise, sY, b };
}

/** The arch's horizontal edge at a height, on the side the crossband approaches from. On the dome the
 *  edge follows the ellipse; on the straight sides and beyond them it is the side's x. */
function archEdgeX(g: ArchGeom, y: number, side: 1 | -1): number {
  if (y < g.sY) {
    const t = (g.sY - y) / g.rise;
    if (t < 1) return g.cx + side * g.half * Math.sqrt(1 - t * t);
  }
  return g.cx + side * g.half;
}

export const mount: Mount<BohemianHeroProps> = (host, initial = {}) => {
  let props: BohemianHeroProps = { ...defaults, ...initial };
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

  /** The union of everything the arch encloses: the type block, the calls to action, and the page's children. */
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

  const under = layer(host, "under");
  const surface = createCanvas(under.el, { onResize: () => draw() });
  const ctx = surface.canvas.getContext("2d");
  const paletteWatch = watchPalette(host, () => draw());

  /** The arched boundary: an outer hairline, an inner hairline trimmed with scallops that point into the
   *  enclosure, a closed base with short feet, and one small bead at the apex. */
  function drawArch(g: ArchGeom, colors: Colors, k: number): void {
    if (!ctx) return;
    const { cx, half, rise, sY, b } = g;
    const l = cx - half;
    const r = cx + half;
    const arch = (hw: number, ry: number, ll: number, rr: number, bb: number): void => {
      ctx.beginPath();
      ctx.moveTo(ll, bb);
      ctx.lineTo(ll, sY);
      ctx.ellipse(cx, sY, hw, ry, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(rr, bb);
      ctx.closePath();
    };
    ctx.strokeStyle = colors.muted;
    ctx.globalAlpha = 0.6 * k;
    arch(half, rise, l, r, b);
    ctx.stroke();
    const hw2 = half - ARCH_INSET;
    const ry2 = Math.max(9, rise - ARCH_INSET);
    const l2 = l + ARCH_INSET;
    const r2 = r - ARCH_INSET;
    const b2 = b - ARCH_INSET;
    ctx.strokeStyle = colors.fg;
    ctx.globalAlpha = 0.4 * k;
    arch(hw2, ry2, l2, r2, b2);
    ctx.stroke();
    ctx.strokeStyle = colors.muted;
    ctx.globalAlpha = 0.5 * k;
    const inwardX = cx;
    const inwardY = sY + (b2 - sY) * 0.4;
    const steps = Math.max(12, Math.round((Math.PI * (hw2 + ry2) * 0.5) / SCALLOP_STEP));
    for (let i = 1; i < steps; i++) {
      const th = (Math.PI * i) / steps;
      const px2 = cx + hw2 * Math.cos(th);
      const py2 = sY - ry2 * Math.sin(th);
      const nx = inwardX - px2;
      const ny = inwardY - py2;
      const nl = Math.hypot(nx, ny) || 1;
      const ang = Math.atan2(ny / nl, nx / nl);
      ctx.beginPath();
      ctx.arc(px2, py2, SCALLOP * 0.8, ang - Math.PI / 2, ang + Math.PI / 2);
      ctx.stroke();
    }
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.85 * k;
    const ay = sY - rise;
    ctx.beginPath();
    ctx.moveTo(cx, ay - 4);
    ctx.lineTo(cx + 3, ay);
    ctx.lineTo(cx, ay + 4);
    ctx.lineTo(cx - 3, ay);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = colors.muted;
    ctx.globalAlpha = 0.6 * k;
    ctx.beginPath();
    ctx.moveTo(l - 9, Math.round(b) + 0.5);
    ctx.lineTo(l, Math.round(b) + 0.5);
    ctx.moveTo(r, Math.round(b) + 0.5);
    ctx.lineTo(r + 9, Math.round(b) + 0.5);
    ctx.stroke();
  }

  /** Repaints the whole drawing: the border bands, the fringe, the selvedge, the crossband tied between
   *  the selvedge and the arch, and the arch measured around the live layout. Every stroke stays inside
   *  the padding or the open field, so the motif never runs behind the prose. */
  function draw(): void {
    if (dead || !ctx) return;
    paletteWatch.refresh();
    const W = surface.cssWidth;
    const H = surface.cssHeight;
    if (W < 2 || H < 2) return;
    const narrow = W < MIN_WIDE;
    attrs.set("data-pica-fit", narrow ? "min" : null);
    const k = 0.35 + 0.65 * Math.min(1, Math.max(0, props.intensity));
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    const colors = paletteWatch.colors;
    const style = getComputedStyle(host);
    const padT = px(style.paddingTop);
    const padB = px(style.paddingBottom);
    const padL = px(style.paddingLeft);
    const padR = px(style.paddingRight);
    const topY = Math.max(5, (padT - BAND) / 2);
    const botY = H - padB + Math.max(5, (padB - BAND) / 2);
    const tile = makeTile(colors, props.seed, surface.dpr, k);
    const wide = !narrow;
    const right = props.align !== "end";

    if (props.bands) {
      weave(ctx, tile, 0, topY, W, BAND);
      ctx.strokeStyle = colors.muted;
      ctx.globalAlpha = 0.65 * k;
      hline(ctx, 0, topY - BAND_GAP, W);
      hline(ctx, 0, topY + BAND + BAND_GAP, W);
      ctx.globalAlpha = 0.5 * k;
      for (let x = 6; x + SCALLOP < W - 4; x += SCALLOP_STEP) {
        ctx.beginPath();
        ctx.arc(x, topY + BAND + BAND_GAP + 0.5, SCALLOP, 0, Math.PI);
        ctx.stroke();
      }
      weave(ctx, tile, 0, botY, W, BAND);
      ctx.globalAlpha = 0.65 * k;
      hline(ctx, 0, botY - BAND_GAP, W);
      hline(ctx, 0, botY + BAND + BAND_GAP, W);
      const fringe = createRng(hashSeed(props.seed, 33));
      ctx.globalAlpha = 0.5 * k;
      for (let x = 5; x < W - 3; x += 9) {
        if (fringe() < 0.22) continue;
        const len = 6 + fringe() * 6;
        const slant = (fringe() - 0.5) * 5;
        ctx.beginPath();
        ctx.moveTo(x, botY + BAND + BAND_GAP + 0.5);
        ctx.lineTo(x + slant, Math.min(botY + BAND + BAND_GAP + len, H - 3));
        ctx.stroke();
      }
      if (wide) {
        const xc = right ? W - padR / 2 : padL / 2;
        const y0 = topY + BAND + 7;
        const len = botY - 7 - y0;
        if (len > 60) {
          ctx.save();
          ctx.translate(xc, y0);
          ctx.rotate(Math.PI / 2);
          const pattern = ctx.createPattern(tile, "repeat");
          if (pattern) {
            ctx.fillStyle = pattern;
            ctx.fillRect(0, -RUNNER / 2, len, RUNNER);
          }
          ctx.restore();
          ctx.strokeStyle = colors.muted;
          ctx.globalAlpha = 0.6 * k;
          vline(ctx, xc - RUNNER / 2 - BAND_GAP, y0, y0 + len);
          vline(ctx, xc + RUNNER / 2 + BAND_GAP, y0, y0 + len);
        }
      }
    }

    const box = props.arch ? contentBox() : null;
    const topInner = props.bands ? topY + BAND + BAND_GAP + SCALLOP : 6;
    const bottomTop = props.bands ? botY - BAND_GAP : H;
    const geom = box ? archGeometry(box, W, topInner, bottomTop) : null;
    if (geom) drawArch(geom, colors, k);

    // The crossband: one tile of the same weave carried across the open field at its middle, built like
    // the top band with bounding hairlines and a scalloped lower edge. It joins the selvedge's inner
    // hairline on one end and stops a thread's width short of the arch on the other, where loose warp
    // ends reach toward the curve, so it reads as strung between the two rather than placed between them.
    if (props.bands && wide && geom) {
      const xc = right ? W - padR / 2 : padL / 2;
      const selIn = right ? xc - RUNNER / 2 - BAND_GAP : xc + RUNNER / 2 + BAND_GAP;
      const tapeT = Math.round((topY + BAND + botY - TILE) / 2);
      const edge = archEdgeX(geom, tapeT + TILE / 2, right ? 1 : -1);
      const lo = right ? edge + 11 : selIn;
      const hi = right ? selIn : edge - 11;
      if (hi - lo > 120) {
        weave(ctx, tile, lo, tapeT, hi - lo, TILE);
        ctx.strokeStyle = colors.muted;
        ctx.globalAlpha = 0.65 * k;
        hline(ctx, lo, tapeT - BAND_GAP, hi);
        hline(ctx, lo, tapeT + TILE + BAND_GAP, hi);
        ctx.globalAlpha = 0.5 * k;
        for (let x = lo + 6; x + SCALLOP < hi - 4; x += SCALLOP_STEP) {
          ctx.beginPath();
          ctx.arc(x, tapeT + TILE + BAND_GAP + 0.5, SCALLOP, 0, Math.PI);
          ctx.stroke();
        }
        const fray = createRng(hashSeed(props.seed, 55));
        ctx.strokeStyle = colors.fg;
        ctx.globalAlpha = 0.5 * k;
        const endX = right ? lo : hi;
        const dir = right ? -1 : 1;
        for (let y = tapeT + 4; y < tapeT + TILE - 3; y += 5.5) {
          if (fray() < 0.3) continue;
          const len = 3 + fray() * 7;
          ctx.beginPath();
          ctx.moveTo(endX, Math.round(y) + 0.5);
          ctx.lineTo(endX + dir * len, Math.round(y + (fray() - 0.5) * 3) + 0.5);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  draw();
  host.dataset.picaReady = "true";

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
      mutator?.disconnect();
      paletteWatch.destroy();
      surface.destroy();
      under.remove();
      typeEl.remove();
      actionsEl.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/bohemian-hero/index.tsx
export type BohemianHeroComponentProps = Partial<BohemianHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero dressed like a weaving, with thread bands, a scalloped hairline arch, and offset copy. */
export function BohemianHero({ className, style, palette, children, ...props }: BohemianHeroComponentProps) {
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
  Pica · Bohemian Hero · bohemian-hero
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Bohemian Hero · Pica</title>
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
<div id="pica"><p>Every band is generated from the seed: a counted thread border, a scalloped edge, and a fringe, with the prose kept in front of all of it.</p></div>
<script>
"use strict";
var PicaBohemianHero = (() => {
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

  // registry/sections/bohemian-hero/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

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
  function hostAttributes(host) {
    const original = /* @__PURE__ */ new Map();
    const apply = (name, value) => {
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
      }
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

  // registry/sections/bohemian-hero/core.ts
  var defaults = {
    headline: "Woven at the edges, open in the middle.",
    subhead: "Counted thread bands frame the field, an arch shelters the copy, and the prose always sits in front of the work.",
    actions: [
      { label: "Browse components", href: "#components" },
      { label: "Read the docs", href: "#docs" }
    ],
    align: "start",
    bands: true,
    arch: true,
    intensity: 0.8,
    minHeight: 62,
    seed: 1
  };
  var TILE = 30;
  var BAND = TILE;
  var RUNNER = 28;
  var BAND_GAP = 4.5;
  var SCALLOP = 4.2;
  var SCALLOP_STEP = 10.5;
  var MIN_WIDE = 760;
  var ARCH_INSET = 9;
  var TRACKS = "repeat(12, minmax(0, 1fr))";
  var GUTTER = "clamp(0.75rem, 2vw, 1.5rem)";
  var ROW_GAP = "clamp(1rem, 2.4vh, 1.7rem)";
  var PAD_TOP = "clamp(5.5rem, 14vh, 9rem)";
  var PAD_BOTTOM = "clamp(5rem, 11vh, 7rem)";
  var PAD_SIDE = "clamp(1.25rem, 5vw, 4.5rem)";
  function vh(minHeight) {
    return Math.min(100, Math.max(0, minHeight));
  }
  function px(value) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  function part(tag, name) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    node.setAttribute(`data-pica-${name}`, "");
    return node;
  }
  function hline(ctx, x1, y, x2) {
    ctx.beginPath();
    ctx.moveTo(x1, Math.round(y) + 0.5);
    ctx.lineTo(x2, Math.round(y) + 0.5);
    ctx.stroke();
  }
  function vline(ctx, x, y1, y2) {
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, y1);
    ctx.lineTo(Math.round(x) + 0.5, y2);
    ctx.stroke();
  }
  function rules(selector, p) {
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    const col = p.align === "end" ? "6 / 13" : "1 / 8";
    const edge = p.align === "end" ? "flex-end" : "flex-start";
    const textAlign = p.align === "end" ? "end" : "start";
    return [
      `:where(${selector}){min-height:${vh(p.minHeight)}vh}`,
      `${selector}{position:relative;isolation:isolate;box-sizing:border-box;display:grid;grid-template-columns:${TRACKS};column-gap:${GUTTER};row-gap:${ROW_GAP};align-content:center;padding:${PAD_TOP} ${PAD_SIDE} ${PAD_BOTTOM};color:${fg};text-align:${textAlign}}`,
      `${selector} *{box-sizing:border-box}`,
      `${selector} > *{min-width:0}`,
      `${selector} > :not([data-pica]){grid-column:${col};margin:0;min-width:0;max-width:33em;overflow-wrap:break-word}`,
      `${selector} [data-pica-type]{grid-column:${col};grid-row:1;min-width:0;text-align:${textAlign}}`,
      `${selector} [data-pica-headline]{margin:0;font-size:clamp(2.5rem,6vw,4.9rem);line-height:1.03;font-weight:650;letter-spacing:-0.015em;overflow-wrap:break-word}`,
      `${selector} [data-pica-subhead]{margin:1em 0 0;max-width:33em;font-size:clamp(1.02rem,1.45vw,1.24rem);line-height:1.6;color:${muted}}`,
      `${selector} [data-pica-actions]{grid-column:${col};display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;justify-content:${edge}}`,
      `${selector} [data-pica-actions][hidden],${selector} [data-pica-actions]:empty{display:none}`,
      `${selector} [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.3em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
      `${selector} [data-pica-actions] a[data-variant="solid"]{background:${accent};border-color:${accent};color:${cssOn("accent")}}`,
      `${selector} [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
      `${selector} [data-pica-actions] a[data-variant="outline"]:hover{border-color:${fg};background:color-mix(in srgb, ${fg} 10%, transparent)}`,
      `${selector} [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${selector}[data-pica-fit="min"] > :not([data-pica]),${selector}[data-pica-fit="min"] [data-pica-type],${selector}[data-pica-fit="min"] [data-pica-actions]{grid-column:1 / -1;max-width:none}`
    ].join("\n");
  }
  function renderActions(container, actions) {
    container.replaceChildren();
    for (const [i, action] of actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.dataset.variant = i === 0 ? "solid" : "outline";
      a.href = action.href;
      a.textContent = action.label;
      container.append(a);
    }
    container.hidden = actions.length === 0;
  }
  function makeTile(colors, seed, dpr, k) {
    const tile = document.createElement("canvas");
    const size = Math.max(1, Math.ceil(TILE * dpr));
    tile.width = size;
    tile.height = size;
    const c = tile.getContext("2d");
    if (!c) return tile;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rng = createRng(hashSeed(seed, 11));
    c.fillStyle = colors.fg;
    for (const y of [3.5, 24.5]) {
      const dash = 4 + Math.floor(rng() * 3);
      const gap = 2 + Math.floor(rng() * 3);
      const off = Math.floor(rng() * (dash + gap));
      c.globalAlpha = 0.5 * k;
      for (let x = -off; x < TILE; x += dash + gap) c.fillRect(x, y, dash, 3);
    }
    const mid = TILE / 2;
    c.strokeStyle = colors.fg;
    c.globalAlpha = 0.55 * k;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(mid, 8.5);
    c.lineTo(mid + 6, 14.5);
    c.lineTo(mid, 20.5);
    c.lineTo(mid - 6, 14.5);
    c.closePath();
    c.stroke();
    for (const edgeX of [0, TILE]) {
      c.beginPath();
      c.moveTo(edgeX, 11);
      c.lineTo(edgeX + (edgeX === 0 ? 3 : -3), 14.5);
      c.lineTo(edgeX, 18);
      c.stroke();
    }
    c.fillStyle = colors.accent;
    c.globalAlpha = 0.85 * k;
    c.fillRect(mid - 1.4, 13.1, 2.8, 2.8);
    c.fillStyle = colors.muted;
    c.globalAlpha = 0.5 * k;
    for (let i = 0; i < 3; i++) {
      const x = 2 + Math.floor(rng() * (TILE - 5));
      c.fillRect(x, 7.2, 1.4, 2.4);
      c.fillRect(TILE - 3 - Math.floor(rng() * (TILE - 6)), 20.4, 1.4, 2.4);
    }
    return tile;
  }
  function weave(ctx, tile, x, y, w, h) {
    const pattern = ctx.createPattern(tile, "repeat");
    if (!pattern) return;
    ctx.fillStyle = pattern;
    ctx.fillRect(x, y, w, h);
  }
  function archGeometry(box, width, topInner, bottomTop) {
    const mX = Math.min(46, Math.max(24, width * 0.04));
    const half = (box.r - box.l) / 2 + mX;
    const rise = Math.min(half * 0.52, box.t - topInner - 16, 210);
    if (rise < 16) return null;
    const sY = box.t - 8;
    const b = Math.min(box.b + 30, bottomTop - 8);
    if (b - sY < 40) return null;
    return { cx: (box.l + box.r) / 2, half, rise, sY, b };
  }
  function archEdgeX(g, y, side) {
    if (y < g.sY) {
      const t = (g.sY - y) / g.rise;
      if (t < 1) return g.cx + side * g.half * Math.sqrt(1 - t * t);
    }
    return g.cx + side * g.half;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let dead = false;
    const sheet = scope(host);
    const attrs = hostAttributes(host);
    const typeEl = part("div", "type");
    const headlineEl = part("h1", "headline");
    const subheadEl = part("p", "subhead");
    typeEl.append(headlineEl, subheadEl);
    const actionsEl = part("div", "actions");
    host.append(typeEl, actionsEl);
    function pageChildren() {
      const out = [];
      for (const el of Array.from(host.children)) {
        if (el instanceof HTMLElement && !el.hasAttribute("data-pica")) out.push(el);
      }
      return out;
    }
    function applyRows() {
      actionsEl.style.gridRow = `${pageChildren().length + 2}`;
    }
    function renderText() {
      headlineEl.textContent = props.headline;
      headlineEl.hidden = props.headline.trim() === "";
      subheadEl.textContent = props.subhead;
      subheadEl.hidden = props.subhead.trim() === "";
      typeEl.hidden = headlineEl.hidden && subheadEl.hidden;
    }
    function contentBox() {
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
    const under = layer(host, "under");
    const surface = createCanvas(under.el, { onResize: () => draw() });
    const ctx = surface.canvas.getContext("2d");
    const paletteWatch = watchPalette(host, () => draw());
    function drawArch(g, colors, k) {
      if (!ctx) return;
      const { cx, half, rise, sY, b } = g;
      const l = cx - half;
      const r = cx + half;
      const arch = (hw, ry, ll, rr, bb) => {
        ctx.beginPath();
        ctx.moveTo(ll, bb);
        ctx.lineTo(ll, sY);
        ctx.ellipse(cx, sY, hw, ry, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(rr, bb);
        ctx.closePath();
      };
      ctx.strokeStyle = colors.muted;
      ctx.globalAlpha = 0.6 * k;
      arch(half, rise, l, r, b);
      ctx.stroke();
      const hw2 = half - ARCH_INSET;
      const ry2 = Math.max(9, rise - ARCH_INSET);
      const l2 = l + ARCH_INSET;
      const r2 = r - ARCH_INSET;
      const b2 = b - ARCH_INSET;
      ctx.strokeStyle = colors.fg;
      ctx.globalAlpha = 0.4 * k;
      arch(hw2, ry2, l2, r2, b2);
      ctx.stroke();
      ctx.strokeStyle = colors.muted;
      ctx.globalAlpha = 0.5 * k;
      const inwardX = cx;
      const inwardY = sY + (b2 - sY) * 0.4;
      const steps = Math.max(12, Math.round(Math.PI * (hw2 + ry2) * 0.5 / SCALLOP_STEP));
      for (let i = 1; i < steps; i++) {
        const th = Math.PI * i / steps;
        const px2 = cx + hw2 * Math.cos(th);
        const py2 = sY - ry2 * Math.sin(th);
        const nx = inwardX - px2;
        const ny = inwardY - py2;
        const nl = Math.hypot(nx, ny) || 1;
        const ang = Math.atan2(ny / nl, nx / nl);
        ctx.beginPath();
        ctx.arc(px2, py2, SCALLOP * 0.8, ang - Math.PI / 2, ang + Math.PI / 2);
        ctx.stroke();
      }
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.85 * k;
      const ay = sY - rise;
      ctx.beginPath();
      ctx.moveTo(cx, ay - 4);
      ctx.lineTo(cx + 3, ay);
      ctx.lineTo(cx, ay + 4);
      ctx.lineTo(cx - 3, ay);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = colors.muted;
      ctx.globalAlpha = 0.6 * k;
      ctx.beginPath();
      ctx.moveTo(l - 9, Math.round(b) + 0.5);
      ctx.lineTo(l, Math.round(b) + 0.5);
      ctx.moveTo(r, Math.round(b) + 0.5);
      ctx.lineTo(r + 9, Math.round(b) + 0.5);
      ctx.stroke();
    }
    function draw() {
      if (dead || !ctx) return;
      paletteWatch.refresh();
      const W = surface.cssWidth;
      const H = surface.cssHeight;
      if (W < 2 || H < 2) return;
      const narrow = W < MIN_WIDE;
      attrs.set("data-pica-fit", narrow ? "min" : null);
      const k = 0.35 + 0.65 * Math.min(1, Math.max(0, props.intensity));
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      const colors = paletteWatch.colors;
      const style = getComputedStyle(host);
      const padT = px(style.paddingTop);
      const padB = px(style.paddingBottom);
      const padL = px(style.paddingLeft);
      const padR = px(style.paddingRight);
      const topY = Math.max(5, (padT - BAND) / 2);
      const botY = H - padB + Math.max(5, (padB - BAND) / 2);
      const tile = makeTile(colors, props.seed, surface.dpr, k);
      const wide = !narrow;
      const right = props.align !== "end";
      if (props.bands) {
        weave(ctx, tile, 0, topY, W, BAND);
        ctx.strokeStyle = colors.muted;
        ctx.globalAlpha = 0.65 * k;
        hline(ctx, 0, topY - BAND_GAP, W);
        hline(ctx, 0, topY + BAND + BAND_GAP, W);
        ctx.globalAlpha = 0.5 * k;
        for (let x = 6; x + SCALLOP < W - 4; x += SCALLOP_STEP) {
          ctx.beginPath();
          ctx.arc(x, topY + BAND + BAND_GAP + 0.5, SCALLOP, 0, Math.PI);
          ctx.stroke();
        }
        weave(ctx, tile, 0, botY, W, BAND);
        ctx.globalAlpha = 0.65 * k;
        hline(ctx, 0, botY - BAND_GAP, W);
        hline(ctx, 0, botY + BAND + BAND_GAP, W);
        const fringe = createRng(hashSeed(props.seed, 33));
        ctx.globalAlpha = 0.5 * k;
        for (let x = 5; x < W - 3; x += 9) {
          if (fringe() < 0.22) continue;
          const len = 6 + fringe() * 6;
          const slant = (fringe() - 0.5) * 5;
          ctx.beginPath();
          ctx.moveTo(x, botY + BAND + BAND_GAP + 0.5);
          ctx.lineTo(x + slant, Math.min(botY + BAND + BAND_GAP + len, H - 3));
          ctx.stroke();
        }
        if (wide) {
          const xc = right ? W - padR / 2 : padL / 2;
          const y0 = topY + BAND + 7;
          const len = botY - 7 - y0;
          if (len > 60) {
            ctx.save();
            ctx.translate(xc, y0);
            ctx.rotate(Math.PI / 2);
            const pattern = ctx.createPattern(tile, "repeat");
            if (pattern) {
              ctx.fillStyle = pattern;
              ctx.fillRect(0, -RUNNER / 2, len, RUNNER);
            }
            ctx.restore();
            ctx.strokeStyle = colors.muted;
            ctx.globalAlpha = 0.6 * k;
            vline(ctx, xc - RUNNER / 2 - BAND_GAP, y0, y0 + len);
            vline(ctx, xc + RUNNER / 2 + BAND_GAP, y0, y0 + len);
          }
        }
      }
      const box = props.arch ? contentBox() : null;
      const topInner = props.bands ? topY + BAND + BAND_GAP + SCALLOP : 6;
      const bottomTop = props.bands ? botY - BAND_GAP : H;
      const geom = box ? archGeometry(box, W, topInner, bottomTop) : null;
      if (geom) drawArch(geom, colors, k);
      if (props.bands && wide && geom) {
        const xc = right ? W - padR / 2 : padL / 2;
        const selIn = right ? xc - RUNNER / 2 - BAND_GAP : xc + RUNNER / 2 + BAND_GAP;
        const tapeT = Math.round((topY + BAND + botY - TILE) / 2);
        const edge = archEdgeX(geom, tapeT + TILE / 2, right ? 1 : -1);
        const lo = right ? edge + 11 : selIn;
        const hi = right ? selIn : edge - 11;
        if (hi - lo > 120) {
          weave(ctx, tile, lo, tapeT, hi - lo, TILE);
          ctx.strokeStyle = colors.muted;
          ctx.globalAlpha = 0.65 * k;
          hline(ctx, lo, tapeT - BAND_GAP, hi);
          hline(ctx, lo, tapeT + TILE + BAND_GAP, hi);
          ctx.globalAlpha = 0.5 * k;
          for (let x = lo + 6; x + SCALLOP < hi - 4; x += SCALLOP_STEP) {
            ctx.beginPath();
            ctx.arc(x, tapeT + TILE + BAND_GAP + 0.5, SCALLOP, 0, Math.PI);
            ctx.stroke();
          }
          const fray = createRng(hashSeed(props.seed, 55));
          ctx.strokeStyle = colors.fg;
          ctx.globalAlpha = 0.5 * k;
          const endX = right ? lo : hi;
          const dir = right ? -1 : 1;
          for (let y = tapeT + 4; y < tapeT + TILE - 3; y += 5.5) {
            if (fray() < 0.3) continue;
            const len = 3 + fray() * 7;
            ctx.beginPath();
            ctx.moveTo(endX, Math.round(y) + 0.5);
            ctx.lineTo(endX + dir * len, Math.round(y + (fray() - 0.5) * 3) + 0.5);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    draw();
    host.dataset.picaReady = "true";
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
        mutator?.disconnect();
        paletteWatch.destroy();
        surface.destroy();
        under.remove();
        typeEl.remove();
        actionsEl.remove();
        sheet.destroy();
        attrs.restore();
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
  var instance = PicaBohemianHero.mount(host, take(window.PICA_PROPS || {}));
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
