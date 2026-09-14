# Bento Hero

> A hero laid out as a bento tray: a lead cell for the headline and calls to action over a content cell, beside a column of smaller fact and field cells.

Category: sections. Tags: hero, bento, landing, section, grid, facts. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 8.4 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/bento-hero.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `headline` | string | `"Components drawn in text."` | Headline drawn in the lead cell. Empty draws nothing. |
| `subhead` | string | `"A library of text-mode components for React and plain HTML, each one generated as a single file."` | Supporting line under the headline. Empty draws nothing. |
| `actions` | readonly BentoHeroAction[] | `[{"label":"Browse components","href":"#components"},{"label":"Read the docs","href":"#docs"}]` | Calls to action, drawn as links at the foot of the lead cell. The first draws solid in the accent, the rest outline. At most three are drawn. |
| `facts` | readonly BentoHeroFact[] | `[{"label":"Components","value":"70+"},{"label":"Median size","value":"4.6 KB"},{"label":"Dependencies","value":"0"}]` | Facts for the smaller cells, in order. At most four are drawn; the cells left over hold drawn fields. |
| `trend` | readonly number[] | `[14,16,18,19,21,23,26,29,27,31,34,38]` | Series for the trend cell's sparkline, oldest first. Empty removes the trend cell. |
| `align` | "start" \| "center" | `"start"` | Horizontal alignment of the lead cell's copy. |
| `field` | "noise" \| "none" | `"noise"` | What the flexible cells draw: a drifting noise field, or nothing, which leaves every cell content sized. |
| `intensity` | number | `0.25` | How strongly the noise fields show, from 0 to 1, mapped onto their contrast and density. |
| `minHeight` | number | `60` | The host's minimum height, in percent of the viewport height. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with `--pica-fg`, `--pica-muted`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Bento Hero · bento-hero
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

/** Text whose visible glyphs animate, such as a scramble or a typewriter. The host keeps its place in the
 *  document with no role, so a heading around it stays a heading. A visually hidden copy carries the final
 *  text for assistive technology, and the animation draws into the returned layer, which is hidden from it. */
interface AnimatedText {
  /** Where the animation draws. Hidden from assistive technology. */
  readonly layer: HTMLElement;
  /** Changes the text assistive technology reads. */
  setText(text: string): void;
  /** Removes the hidden copy and the layer. */
  remove(): void;
}

function animatedText(host: HTMLElement, text: string, tag: "span" | "div" | "pre" = "span"): AnimatedText {
  const hidden = hiddenText(text);
  hidden.setAttribute("data-pica", "");
  const layer = document.createElement(tag);
  layer.setAttribute("data-pica", "");
  layer.setAttribute("aria-hidden", "true");
  host.append(hidden, layer);
  return {
    layer,
    setText(next) {
      hidden.textContent = next;
    },
    remove() {
      hidden.remove();
      layer.remove();
    },
  };
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
  /** Cell width in CSS pixels, for mapping a pointer or a layout onto cells. */
  readonly cellWidth: number;
  /** Cell height in CSS pixels. */
  readonly cellHeight: number;
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

let measurer: CanvasRenderingContext2D | null | undefined;

/** A glyph's advance as a share of the font size, or 0.6 where nothing can be measured. Measured on every
 *  call, because a web font can finish loading between calls. */
function advanceOf(fontFamily: string): number {
  if (measurer === undefined) measurer = document.createElement("canvas").getContext("2d");
  if (!measurer) return 0.6;
  measurer.font = `100px ${fontFamily}`;
  return measurer.measureText("M").width / 100 || 0.6;
}

/** The cell a glyph grid draws for this font, in CSS pixels. */
function measureCell(fontFamily: string, fontSize: number, lineHeight: number): { w: number; h: number } {
  return { w: fontSize * advanceOf(fontFamily), h: Math.max(1, Math.round(fontSize * lineHeight)) };
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

  const restoreHost = styleHost(
    host,
    getComputedStyle(host).position === "static" ? { position: "relative", overflow: "hidden" } : { overflow: "hidden" },
  );
  const font = (): string => `${fontPx}px ${opts.fontFamily}`;

  /** Recomputes the cell grid from the host's size. Returns true when the grid was rebuilt. */
  function layout(force: boolean): boolean {
    const w = host.clientWidth;
    const h = host.clientHeight;
    const advance = advanceOf(opts.fontFamily);
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
    const color = opts.color || cssVar("fg");
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
      // Text rows follow a palette change through CSS on their own; a canvas has to be painted again. A 1 ms
      // color transition turns any change to its ink into a transitionend, which repaints it, for far fewer
      // bytes than a palette watcher.
      canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;color:${color};transition:color 1ms`;
      canvas.addEventListener("transitionend", (event) => {
        event.stopPropagation();
        if (ctx && view === canvas) paintCanvas(ctx, canvas);
      });
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
    view.setAttribute("data-pica", "");
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
      const text = cells.slice(start, start + cols).join("");
      let tinted = false;
      for (let x = 0; x < cols; x++) {
        if (tints[start + x] !== undefined) {
          tinted = true;
          break;
        }
      }
      const key = tinted ? `${text}\u0000${tints.slice(start, start + cols).join(",")}` : text;
      if (key === shown[y]) continue;
      shown[y] = key;
      const top = y * cellH;
      context.clearRect(0, top, width, cellH);
      if (!tinted) {
        context.fillStyle = ink;
        context.fillText(text, 0, top + cellH / 2);
        continue;
      }
      // One fillText per run of same-colored cells: monospace advances keep every glyph on its cell.
      let x = 0;
      while (x < cols) {
        const tint = tints[start + x] ?? ink;
        let end = x + 1;
        while (end < cols && (tints[start + end] ?? ink) === tint) end++;
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
    get cellWidth() {
      return cellW;
    },
    get cellHeight() {
      return cellH;
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
      restoreHost();
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

// registry/ascii/ascii-noise-field/core.ts
const asciiNoiseField = (() => {
interface AsciiNoiseFieldProps extends MotionProps {
  /** Spatial frequency of the noise. Smaller values stretch it into broad drifting shapes, larger values pack in fine grain. */
  scale: number;
  /** How fast the field drifts, in noise units per second. */
  speed: number;
  /** Layers of noise summed at doubling frequency and halving weight, for finer detail. */
  octaves: number;
  /** How sharply ink rises around `density`. 1 is a soft gradient; 3 pushes the field toward a threshold. */
  contrast: number;
  /** The noise level mapped to the middle of the glyph ramp. Raise it for a sparser field, lower it for a denser one. */
  density: number;
  /** Glyphs to draw with, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** Glyph size in CSS pixels. */
  fontSize: number;
  /** CSS font-family stack for the glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
  /** Frames per second ceiling for the animation. */
  fps: number;
}

const defaults: AsciiNoiseFieldProps = {
  scale: 0.08,
  speed: 0.15,
  octaves: 2,
  contrast: 1.4,
  density: 0.45,
  glyphs: FALLBACK_RAMP,
  fontSize: 12,
  fontFamily: GRID_FONT,
  lineHeight: 1.2,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame shown under prefers-reduced-motion, and the one captures judge the component by. */
const STILL_TIME = 1200;

/** Amplitude kept from one octave to the next: each layer adds half the detail of the one before it. */
const OCTAVE_GAIN = 0.5;

/** Octaves beyond this add cost without a visible change at typical grid sizes. */
const MAX_OCTAVES = 3;

const mount: Mount<AsciiNoiseFieldProps> = (host, initial = {}) => {
  let props: AsciiNoiseFieldProps = { ...defaults, ...initial };
  let noise = createNoise(props.seed);
  let ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
  // Reused every frame so drawing allocates nothing: one entry per octave.
  const freq = [1, 1, 1];
  const rowCoord = [0, 0, 0];
  const timeCoord = [0, 0, 0];

  function gridOptions(p: AsciiNoiseFieldProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  function draw(t: number): void {
    const { cols, rows, aspect } = grid;
    const octaves = Math.min(MAX_OCTAVES, Math.max(1, Math.round(props.octaves)));
    const scale = props.scale;
    const contrast = props.contrast;
    const density = props.density;
    const seconds = (t / 1000) * props.speed;
    let f = 1;
    for (let o = 0; o < octaves; o++) {
      freq[o] = f;
      timeCoord[o] = seconds * f;
      f *= 2;
    }
    for (let y = 0; y < rows; y++) {
      for (let o = 0; o < octaves; o++) rowCoord[o] = ((y * scale) / aspect) * (freq[o] ?? 1);
      for (let x = 0; x < cols; x++) {
        let sum = 0;
        let amp = 1;
        let norm = 0;
        for (let o = 0; o < octaves; o++) {
          sum += noise.noise3(x * scale * (freq[o] ?? 1), rowCoord[o] ?? 0, timeCoord[o] ?? 0) * amp;
          norm += amp;
          amp *= OCTAVE_GAIN;
        }
        const level = sum / norm / 2 + 0.5;
        // A soft curve around `density`: contrast stretches how quickly ink rises on either side
        // of the pivot, and the clamp only bites at the rare extremes the noise itself reaches.
        const shaped = Math.min(1, Math.max(0, (level - density) * contrast + 0.5));
        grid.set(x, y, pick(ramp, shaped));
      }
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  const grid = createGrid(host, gridOptions(props), () => {
    ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
    loop.redraw();
  });

  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    still: STILL_TIME,
    frame: draw,
  });

  labelHost(host, "");

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.seed !== before.seed) noise = createNoise(props.seed);
      if (props.glyphs !== before.glyphs || props.fontFamily !== before.fontFamily || props.lineHeight !== before.lineHeight) {
        ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
      }
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
return { mount, defaults };
})();

// lib/blocks.ts
/** Unicode block and braille glyphs for text-mode drawing. Every glyph here is one UTF-16 code unit, so a
 *  table can be indexed like an array. */

/** The braille pattern with no dots raised. Add dot bits to it. */
const BRAILLE_BASE = 0x2800;

/** The bit for the braille dot at `row` 0 to 3 and `col` 0 or 1. Rows 0 to 2 are dots 1 to 3 on the left
 *  and 4 to 6 on the right. Row 3 holds dots 7 and 8, which Unicode added later, so their bits come last. */
function brailleDot(row: number, col: number): number {
  if (row === 3) return col === 0 ? 0x40 : 0x80;
  return 1 << (col === 0 ? row : row + 3);
}

/** The braille glyph for a set of dot bits. */
function braille(bits: number): string {
  return String.fromCharCode(BRAILLE_BASE + (bits & 0xff));
}

/** Quadrant glyphs, indexed by top left 1, top right 2, bottom left 4, and bottom right 8. */
const QUADRANTS = " ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";

/** The glyph that inks the given quadrants of a cell. */
function quadrant(tl: boolean, tr: boolean, bl: boolean, br: boolean): string {
  return QUADRANTS[(tl ? 1 : 0) | (tr ? 2 : 0) | (bl ? 4 : 0) | (br ? 8 : 0)] ?? " ";
}

/** A cell filled from the bottom by 0 to 8 eighths. */
const LOWER_EIGHTHS = " ▁▂▃▄▅▆▇█";

/** A cell filled from the left by 0 to 8 eighths. */
const LEFT_EIGHTHS = " ▏▎▍▌▋▊▉█";

/** Blank, light shade, medium shade, dark shade, and full block. */
const SHADES = " ░▒▓█";

const clampEighths = (n: number): number => Math.max(0, Math.min(8, Math.round(n)));

/** The glyph filling `n` eighths of a cell from the bottom, clamped to 0 to 8. */
function lowerEighth(n: number): string {
  return LOWER_EIGHTHS[clampEighths(n)] ?? " ";
}

/** The shade glyph for level `n`, clamped to 0 (blank) through 4 (full block). */
function shade(n: number): string {
  return SHADES[Math.max(0, Math.min(4, Math.round(n)))] ?? " ";
}

/** The glyph filling `n` eighths of a cell from the left, clamped to 0 to 8. */
function leftEighth(n: number): string {
  return LEFT_EIGHTHS[clampEighths(n)] ?? " ";
}

// registry/text-mode/ascii-sparkline/core.ts
const asciiSparkline = (() => {
interface AsciiSparklineProps {
  /** Series to plot, in order. Values that are not finite numbers are skipped. */
  values: number[];
  /** "blocks" draws one eighth-block bar per cell. "braille" draws a higher-resolution line, two values per cell. */
  mode: "blocks" | "braille";
  /** Cells to draw. 0 fits one cell per value in blocks mode, or one cell per two values in braille mode. A positive width resamples the series to that many cells. */
  width: number;
  /** Value mapped to the bottom of the range. Null reads the series' own minimum. */
  min: number | null;
  /** Value mapped to the top of the range. Null reads the series' own maximum. */
  max: number | null;
  /** Name for the series, read by assistive technology before its size, range, and latest value. */
  label: string;
  /** CSS font-family stack. Must be monospace. */
  fontFamily: string;
}

const defaults: AsciiSparklineProps = {
  values: [
    3.1, 3.5, 3.3, 3.9, 4.4, 4.1, 4.7, 5.2, 4.9, 5.5, 6.1, 5.8,
    6.4, 7.0, 6.7, 7.3, 7.9, 8.4, 9.1, 9.8, 9.3, 8.6, 7.9, 7.2,
  ],
  mode: "blocks",
  width: 0,
  min: null,
  max: null,
  label: "trend",
  fontFamily: GRID_FONT,
};

/** Resamples `source` to `count` points by linear interpolation along its index. */
function resample(source: readonly number[], count: number): number[] {
  const last = source.length - 1;
  const out = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? (i * last) / (count - 1) : 0;
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, last);
    const frac = t - lo;
    out[i] = (source[lo] ?? 0) * (1 - frac) + (source[hi] ?? 0) * frac;
  }
  return out;
}

/** The text for one clean series: eighth-block bars, or a braille line at 2 by 4 dots per cell. */
function render(props: AsciiSparklineProps, clean: readonly number[]): string {
  if (clean.length === 0) return "";
  const lo = props.min ?? Math.min(...clean);
  const hi = props.max ?? Math.max(...clean);
  const span = hi - lo;
  // A flat series, or explicit bounds with no span, reads as the middle of the ramp rather than full.
  const scale = (v: number): number => (span > 0 ? Math.min(1, Math.max(0, (v - lo) / span)) : 0.5);

  if (props.mode === "braille") {
    const cells = props.width > 0 ? props.width : Math.ceil(clean.length / 2);
    const dots = resample(clean, cells * 2);
    let text = "";
    for (let c = 0; c < cells; c++) {
      let bits = 0;
      for (let col = 0; col < 2; col++) {
        const t = scale(dots[c * 2 + col] ?? lo);
        const row = Math.min(3, Math.max(0, Math.round((1 - t) * 3)));
        bits |= brailleDot(row, col);
      }
      text += braille(bits);
    }
    return text;
  }

  const cells = props.width > 0 ? props.width : clean.length;
  let text = "";
  for (const v of resample(clean, cells)) {
    const level = Math.min(7, Math.max(0, Math.round(scale(v) * 7)));
    text += lowerEighth(level + 1);
  }
  return text;
}

/** One decimal place, without a trailing zero. */
function short(n: number): string {
  return String(Math.round(n * 10) / 10);
}

/** The label assistive technology reads: the series' name, size, range, and latest value. */
function describe(props: AsciiSparklineProps, clean: readonly number[]): string {
  if (clean.length === 0) return `${props.label}: no data`;
  const lo = props.min ?? Math.min(...clean);
  const hi = props.max ?? Math.max(...clean);
  const last = clean[clean.length - 1] ?? 0;
  const unit = clean.length === 1 ? "value" : "values";
  return `${props.label}: ${clean.length} ${unit} from ${short(lo)} to ${short(hi)}, last ${short(last)}`;
}

const mount: Mount<AsciiSparklineProps> = (host, initial = {}) => {
  let props: AsciiSparklineProps = { ...defaults, ...initial };
  const view = document.createElement("span");
  view.setAttribute("data-pica", "");
  view.setAttribute("aria-hidden", "true");
  view.style.whiteSpace = "nowrap";
  view.style.userSelect = "none";
  view.style.pointerEvents = "none";
  view.style.color = cssVar("fg");
  host.appendChild(view);

  function draw(): void {
    const clean = props.values.filter((v) => Number.isFinite(v));
    view.style.fontFamily = props.fontFamily;
    view.textContent = render(props, clean);
    labelHost(host, describe(props, clean));
    host.dataset.picaReady = "true";
  }

  draw();

  return {
    update(next) {
      props = { ...props, ...next };
      draw();
    },
    destroy() {
      view.remove();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
return { mount, defaults };
})();

// registry/sections/bento-hero/core.ts
export interface BentoHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface BentoHeroFact {
  /** What the figure measures, drawn small in mono caps. */
  label: string;
  /** The figure itself, drawn large in mono. */
  value: string;
}

export interface BentoHeroProps extends MotionProps {
  /** Headline drawn in the lead cell. Empty draws nothing. */
  headline: string;
  /** Supporting line under the headline. Empty draws nothing. */
  subhead: string;
  /** Calls to action, drawn as links at the foot of the lead cell. The first draws solid in the accent, the rest outline. At most three are drawn. */
  actions: readonly BentoHeroAction[];
  /** Facts for the smaller cells, in order. At most four are drawn; the cells left over hold drawn fields. */
  facts: readonly BentoHeroFact[];
  /** Series for the trend cell's sparkline, oldest first. Empty removes the trend cell. */
  trend: readonly number[];
  /** Horizontal alignment of the lead cell's copy. */
  align: "start" | "center";
  /** What the flexible cells draw: a drifting noise field, or nothing, which leaves every cell content sized. */
  field: "noise" | "none";
  /** How strongly the noise fields show, from 0 to 1, mapped onto their contrast and density. */
  intensity: number;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: BentoHeroProps = {
  headline: "Components drawn in text.",
  subhead: "A library of text-mode components for React and plain HTML, each one generated as a single file.",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  facts: [
    { label: "Components", value: "70+" },
    { label: "Median size", value: "4.6 KB" },
    { label: "Dependencies", value: "0" },
  ],
  trend: [14, 16, 18, 19, 21, 23, 26, 29, 27, 31, 34, 38],
  align: "start",
  field: "noise",
  intensity: 0.25,
  minHeight: 60,
  paused: false,
  time: null,
  seed: 1,
};

/** Below this host width the tray stacks into one column with the lead cell first. */
const TRAY_COLLAPSE = 620;

/** Auto rows the explicit grid keeps ready for the page's children, ahead of its one flexible row.
 *  Forty covers any reasonable count of wrapped nodes. */
const TRAY_ROWS = 40;

/** The last explicit line of the tray's grid: one row for the lead, TRAY_ROWS for children, one flexible. */
const TRAY_LAST = TRAY_ROWS + 3;

/** The members of the lower cell: the page's own children plus the core's field slot. Used both as an
 *  "of" list, which counts siblings, and expanded per selector, which scopes each arm to this host. */
const GROUP = ":not([data-pica]),[data-pica-lower]";

/** The ramp the field cells draw with, capped at `=` so the field can never reach the type's ink. */
const FIELD_GLYPHS = " .:-=";

/** Seed salts for the two noise mounts, so the lower cell's field and the side's field are independent
 *  streams off the same seed rather than the same picture twice. */
const LOWER_SEED = 5;
const SIDE_SEED = 11;

/** The tray's one gutter, shared by the scoped rules and the stacked layout's side margin. */
const GAP = "clamp(0.7rem,1.5vw,1.2rem)";
/** Cell padding, shared by the lead cell and the lower cell's text members. */
const PAD = "clamp(1.3rem,3vw,2.2rem)";

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function clampVh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** Maps the 0 to 1 intensity onto ascii-noise-field's contrast range, kept soft so the field stays a texture. */
function noiseContrast(intensity: number): number {
  return 0.7 + Math.min(1, Math.max(0, intensity)) * 0.8;
}

/** Maps the 0 to 1 intensity onto ascii-noise-field's density range, biased sparse so most cells fall to
 *  the ramp's light end and only noise peaks reach `-` or `=`. */
function noiseDensity(intensity: number): number {
  return 0.78 - Math.min(1, Math.max(0, intensity)) * 0.22;
}

/** Props for one composed noise field: motion passes through, the seed is salted so no two mounts draw the
 *  same field, intensity becomes contrast and density, and the ramp and glyph size are pinned small so the
 *  field sits as texture rather than competing with the type. */
function fieldProps(p: BentoHeroProps, salt: number): Partial<typeof asciiNoiseField.defaults> {
  return { paused: p.paused, time: p.time, seed: hashSeed(p.seed, salt, 7), contrast: noiseContrast(p.intensity), density: noiseDensity(p.intensity), glyphs: FIELD_GLYPHS, fontSize: 10 };
}

/** Creates one element the core owns, marked for identification and named for its part. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** A field's sub-host. Its position goes inline rather than through the scoped sheet, because the grid a
 *  field mounts reads the host's computed position at mount time and pins a static one: a mounted grid can
 *  never see a stylesheet that arrives later. */
function fieldHostEl(): HTMLElement {
  const el = part("div", "fieldhost");
  el.style.position = "absolute";
  el.style.inset = "0.55em";
  return el;
}

/** The scoped rules. The left column holds two cells: the lead, a single bordered box sized to its copy,
 *  and the lower cell, which is not one element: the page's children must stay direct host children, so
 *  the cell is every group member sharing left and right hairlines, with the first closing the top and the
 *  last closing the bottom. The group always ends with the field slot, a drawn field that absorbs whatever
 *  height the copy does not use, so the cell never holds a region of bare ground. Auto rows are gapless so
 *  the shared borders stay continuous; the gutter between the two left cells is the lead's bottom margin,
 *  which inflates its auto row. The minimum height goes in a :where() rule, which carries no specificity,
 *  so a page that gives the host a height wins. */
function trayRules(s: string, p: BentoHeroProps, hasSide: boolean): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const edge = p.align === "center" ? "center" : "flex-start";
  const textAlign = p.align === "center" ? "center" : "start";
  const pad = PAD;
  const gap = GAP;
  const hairline = `color-mix(in srgb, ${muted} 55%, transparent)`;
  const columns = hasSide ? "minmax(0,3fr) minmax(0,2fr)" : "minmax(0,1fr)";
  const slot = `${s} > :not([data-pica]), ${s} > [data-pica-lower]`;
  return [
    `:where(${s}){min-height:${clampVh(p.minHeight)}vh}`,
    `${s}{box-sizing:border-box;position:relative;display:grid;grid-template-columns:${columns};grid-template-rows:auto repeat(${TRAY_ROWS},minmax(0,auto)) minmax(auto,1fr);column-gap:${gap};row-gap:0;padding:${gap};color:${fg};text-align:${textAlign}}`,
    `${s}[data-pica-fit="min"]{grid-template-columns:minmax(0,1fr)}`,
    `${s} > [data-pica-lead]{grid-column:1;grid-row:1;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;gap:0.55em;margin:0 0 ${gap};padding:${pad};border:1px solid ${muted};text-align:${textAlign}}`,
    `${s} [data-pica-headline]{margin:0;font-size:clamp(2.1rem,5vw,3.6rem);line-height:1.05;font-weight:640;letter-spacing:-0.015em;overflow-wrap:break-word}`,
    `${s} [data-pica-subhead]{margin:0;font-size:clamp(0.95rem,1.4vw,1.12rem);line-height:1.55;color:${muted};max-width:36em${p.align === "center" ? ";margin-inline:auto" : ""}}`,
    `${s} [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.7em;justify-content:${edge};margin-top:0.45em}`,
    `${s} [data-pica-actions]:empty{display:none}`,
    `${s} [data-pica-actions] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.25em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
    `${s} [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
    `${s} [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
    `${s} [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${s} [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${slot}{grid-column:1;min-width:0;box-sizing:border-box;margin-block:0;padding:0.4em ${pad};border-left:1px solid ${muted};border-right:1px solid ${muted};overflow-wrap:break-word}`,
    `${s} > :nth-child(1 of ${GROUP}){border-top:1px solid ${muted}}`,
    `${s} > :nth-child(1 of ${GROUP}):not([data-pica-lower]){padding-top:${pad}}`,
    `${s} > :nth-last-child(1 of ${GROUP}){border-bottom:1px solid ${muted}}`,
    `${s} > :nth-last-child(1 of ${GROUP}):not([data-pica-lower]){padding-bottom:${pad}}`,
    `${s} > [data-pica-lower]{overflow:hidden;padding:0;min-height:7rem}`,
    `${s} > :nth-child(n+2 of ${GROUP})[data-pica-lower]{border-top:1px solid ${hairline}}`,
    `${s} > [data-pica-side]{min-width:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:${gap};align-content:start}`,
    `${s}[data-pica-fit="min"] > [data-pica-side]{grid-template-columns:minmax(0,1fr)}`,
    `${s} [data-pica-cell]{min-width:0;box-sizing:border-box;position:relative;display:flex;flex-direction:column;justify-content:center;gap:0.45em;padding:0.75em 0.9em;border:1px solid ${muted}}`,
    `${s} [data-pica-cell][data-pica-wide]{grid-column:1/-1}`,
    `${s}[data-pica-fit="min"] [data-pica-cell][data-pica-wide]{grid-column:auto}`,
    `${s} [data-pica-flabel]{font-family:${GRID_FONT};font-size:0.68em;letter-spacing:0.05em;text-transform:uppercase;color:${muted}}`,
    `${s} [data-pica-fvalue]{font-family:${GRID_FONT};font-size:clamp(1.1rem,1.9vw,1.6rem);font-variant-numeric:tabular-nums;color:${fg}}`,
    `${s} [data-pica-sparkhost]{font-size:0.85em;line-height:1.3;min-width:0}`,
    `${s} [data-pica-cell][data-pica-fieldcell]{padding:0;overflow:hidden;min-height:6rem}`,
    // The field inks in muted rather than fg: the grid inside sets its own color from --pica-fg, so the
    // token is rerouted on its host. The fallback repeats muted's own fallback without naming the token,
    // which would be a self-reference and leave the field at full fg.
    `${s} [data-pica-fieldhost]{--pica-fg:var(--pica-muted,color-mix(in srgb,currentColor 65%,transparent))}`,
  ].join("\n");
}

export const mount: Mount<BentoHeroProps> = (host, initial = {}) => {
  let props: BentoHeroProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  let destroyed = false;

  // The lead cell is the first grid item: one bordered box holding the copy, sized to it.
  const lead = part("div", "lead");
  const headlineEl = part("h1", "headline");
  const subheadEl = part("p", "subhead");
  const actionsEl = part("div", "actions");
  lead.append(headlineEl, subheadEl, actionsEl);

  // The lower cell's field slot comes after the page's children, so it is always the last group member:
  // the cell reads copy, then a hairline, then the field that fills whatever height is left. Its position
  // is inline for the same reason as the field host's: it is the field's containing block from mount on.
  const lower = part("div", "lower");
  lower.style.position = "relative";
  const lowerHost = fieldHostEl();
  lower.append(lowerHost);

  const side = part("div", "side");

  host.prepend(lead);
  host.append(lower, side);

  let spark: ReturnType<typeof asciiSparkline.mount> | null = null;
  let lowerField: ReturnType<typeof asciiNoiseField.mount> | null = null;
  let sideField: ReturnType<typeof asciiNoiseField.mount> | null = null;
  let leadOn = true;

  function renderLead(): void {
    headlineEl.textContent = props.headline;
    headlineEl.style.display = props.headline === "" ? "none" : "";
    subheadEl.textContent = props.subhead;
    subheadEl.style.display = props.subhead === "" ? "none" : "";
    renderActions();
    leadOn = props.headline !== "" || props.subhead !== "" || actionsEl.childElementCount > 0;
    lead.style.display = leadOn ? "" : "none";
  }

  function renderActions(): void {
    actionsEl.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.dataset.variant = i === 0 ? "solid" : "outline";
      a.href = action.href;
      a.textContent = action.label;
      actionsEl.append(a);
    }
  }

  function factTile(fact: BentoHeroFact): HTMLElement {
    const cell = part("div", "cell");
    const label = part("div", "flabel");
    label.textContent = fact.label;
    const value = part("div", "fvalue");
    value.textContent = fact.value;
    cell.append(label, value);
    return cell;
  }

  function trendTile(): HTMLElement {
    const cell = part("div", "cell");
    const label = part("div", "flabel");
    label.textContent = "Trend";
    const clean = props.trend.filter((v) => Number.isFinite(v));
    const value = part("div", "fvalue");
    value.textContent = String(clean[clean.length - 1] ?? 0);
    const sub = part("div", "sparkhost");
    cell.append(label, value, sub);
    spark = asciiSparkline.mount(sub, { values: [...props.trend], label: "trend" });
    return cell;
  }

  function fieldTile(): HTMLElement {
    const cell = part("div", "cell");
    cell.setAttribute("data-pica-fieldcell", "");
    const sub = fieldHostEl();
    cell.append(sub);
    sideField = asciiNoiseField.mount(sub, fieldProps(props, SIDE_SEED));
    return cell;
  }

  /** Mounts or unmounts the lower cell's field with the prop, keeping the slot before the side in the
   *  document so the stacked order reads lead, lower cell, minor cells. */
  function syncLower(): void {
    if (props.field === "noise") {
      if (!lower.isConnected) {
        if (side.isConnected) host.insertBefore(lower, side);
        else host.append(lower);
      }
      if (!lowerField) lowerField = asciiNoiseField.mount(lowerHost, fieldProps(props, LOWER_SEED));
    } else {
      lowerField?.destroy();
      lowerField = null;
      if (lower.isConnected) lower.remove();
    }
  }

  /** Rebuilds the minor cells from the props: the facts, then the trend cell, then the field. An odd count
   *  leaves the last cell alone on its row, so it spans both columns and reads wider than the rest. The
   *  field is always last, because the side's one flexible row is its last: only drawn content may grow
   *  into spare height. */
  function buildMinors(): void {
    spark?.destroy();
    spark = null;
    sideField?.destroy();
    sideField = null;
    const tiles = props.facts.slice(0, 4).map(factTile);
    if (props.trend.some((v) => Number.isFinite(v))) tiles.push(trendTile());
    if (props.field === "noise") tiles.push(fieldTile());
    side.replaceChildren();
    if (tiles.length === 0) {
      if (side.isConnected) side.remove();
      return;
    }
    if (tiles.length % 2 === 1) tiles[tiles.length - 1]?.setAttribute("data-pica-wide", "");
    side.append(...tiles);
    if (!side.isConnected) host.append(side);
  }

  /** Places the two moving items. On the wide layout the side spans every row of column two and the field
   *  slot takes the lower cell's rows from under the copy through the flexible last row, so both columns
   *  reach the tray's floor and the field, not a gap, fills whatever the copy does not. Stacked, everything
   *  flows in one column in document order and the side takes the flexible row instead. In either case the
   *  side's own last row flexes only while it holds the field cell, so a fact cell is never stretched into
   *  bare ground. */
  function applyLayout(): void {
    const min = host.clientWidth < TRAY_COLLAPSE;
    attrs.set("data-pica-fit", min ? "min" : null);
    const kids = host.querySelectorAll(":scope > :not([data-pica])").length;
    const after = 1 + (leadOn ? 1 : 0) + kids;
    const lowOn = lower.isConnected;
    if (min) {
      lower.style.gridRow = `${Math.min(after, TRAY_LAST - 1)} / span 1`;
      side.style.gridColumn = "1";
      side.style.gridRow = `${Math.min(after + (lowOn ? 1 : 0), TRAY_LAST - 1)} / -1`;
      // The stacked gutter under the lower cell. When the group is empty the lead's own bottom margin
      // already separates it from the side, so nothing more is added.
      side.style.marginTop = kids + (lowOn ? 1 : 0) > 0 ? GAP : "0";
    } else {
      lower.style.gridRow = `${Math.min(after, TRAY_LAST - 1)} / -1`;
      side.style.gridColumn = "2";
      side.style.gridRow = "1 / -1";
      side.style.marginTop = "0";
    }
    const tiles = side.children.length;
    const rows = Math.ceil(tiles / (min ? 1 : 2));
    const flexes = props.field === "noise" && tiles > 0;
    side.style.gridTemplateRows = flexes ? (rows > 1 ? `repeat(${rows - 1},auto) minmax(auto,1fr)` : "minmax(auto,1fr)") : `repeat(${Math.max(rows, 1)},auto)`;
  }

  const resizer = typeof ResizeObserver === "function" ? new ResizeObserver(applyLayout) : null;
  const mutator = typeof MutationObserver === "function" ? new MutationObserver(applyLayout) : null;

  renderLead();
  buildMinors();
  syncLower();
  sheet.setRules(trayRules(sheet.selector, props, side.isConnected));
  applyLayout();
  resizer?.observe(host);
  mutator?.observe(host, { childList: true });
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (changed(before, props, ["headline", "subhead"]) || !sameJson(before.actions, props.actions)) renderLead();
      if (changed(before, props, ["facts", "trend", "field"])) {
        buildMinors();
        syncLower();
        sheet.setRules(trayRules(sheet.selector, props, side.isConnected));
      }
      if (changed(before, props, ["paused", "time", "seed", "intensity"])) {
        lowerField?.update(fieldProps(props, LOWER_SEED));
        sideField?.update(fieldProps(props, SIDE_SEED));
      }
      if (changed(before, props, ["align", "minHeight"])) sheet.setRules(trayRules(sheet.selector, props, side.isConnected));
      applyLayout();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      resizer?.disconnect();
      mutator?.disconnect();
      spark?.destroy();
      lowerField?.destroy();
      sideField?.destroy();
      lead.remove();
      lower.remove();
      side.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/bento-hero/index.tsx
export type BentoHeroComponentProps = Partial<BentoHeroProps> & WrapperProps & { children?: ReactNode };

/** A hero laid out as a bento tray: a lead cell for the headline and calls to action over a content cell, beside smaller cells. */
export function BentoHero({ className, style, palette, children, ...props }: BentoHeroComponentProps) {
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
  Pica · Bento Hero · bento-hero
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Bento Hero · Pica</title>
<style>:root { --pica-accent: #e8a020; }
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
<div id="pica"><p>Every component ships as one file: a React wrapper, or a plain HTML page that needs nothing.</p><p class="note">Free for personal projects.</p></div>
<script>
"use strict";
var PicaBentoHero = (() => {
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

  // registry/sections/bento-hero/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults3,
    mount: () => mount3
  });

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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
  function changed(before, after, keys) {
    return keys.some((key) => !sameJson(before[key], after[key]));
  }

  // lib/palette.ts
  var TOKEN_FALLBACK = {
    fg: "currentColor",
    bg: "transparent",
    accent: "#e8a020",
    muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)"
  };
  function cssVar(token) {
    return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
  }
  function cssOn(token) {
    return `oklch(from ${cssVar(token)} clamp(0, (0.62 - l) * 1000, 1) 0 0)`;
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
  var measurer;
  function advanceOf(fontFamily) {
    if (measurer === void 0) measurer = document.createElement("canvas").getContext("2d");
    if (!measurer) return 0.6;
    measurer.font = `100px ${fontFamily}`;
    return measurer.measureText("M").width / 100 || 0.6;
  }
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
    const restoreHost = styleHost(
      host,
      getComputedStyle(host).position === "static" ? { position: "relative", overflow: "hidden" } : { overflow: "hidden" }
    );
    const font = () => `${fontPx}px ${opts.fontFamily}`;
    function layout(force) {
      const w = host.clientWidth;
      const h = host.clientHeight;
      const advance = advanceOf(opts.fontFamily);
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
      const color = opts.color || cssVar("fg");
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
        canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;color:${color};transition:color 1ms`;
        canvas.addEventListener("transitionend", (event) => {
          event.stopPropagation();
          if (ctx && view === canvas) paintCanvas(ctx, canvas);
        });
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
      view.setAttribute("data-pica", "");
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
        const text = cells.slice(start, start + cols).join("");
        let tinted = false;
        for (let x2 = 0; x2 < cols; x2++) {
          if (tints[start + x2] !== void 0) {
            tinted = true;
            break;
          }
        }
        const key = tinted ? `${text}\0${tints.slice(start, start + cols).join(",")}` : text;
        if (key === shown[y]) continue;
        shown[y] = key;
        const top = y * cellH;
        context.clearRect(0, top, width, cellH);
        if (!tinted) {
          context.fillStyle = ink;
          context.fillText(text, 0, top + cellH / 2);
          continue;
        }
        let x = 0;
        while (x < cols) {
          const tint = tints[start + x] ?? ink;
          let end = x + 1;
          while (end < cols && (tints[start + end] ?? ink) === tint) end++;
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
      get cellWidth() {
        return cellW;
      },
      get cellHeight() {
        return cellH;
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
        restoreHost();
      }
    };
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

  // lib/noise.ts
  var SIMPLEX_GRAD = [
    1,
    1,
    0,
    -1,
    1,
    0,
    1,
    -1,
    0,
    -1,
    -1,
    0,
    1,
    0,
    1,
    -1,
    0,
    1,
    1,
    0,
    -1,
    -1,
    0,
    -1,
    0,
    1,
    1,
    0,
    -1,
    1,
    0,
    1,
    -1,
    0,
    -1,
    -1
  ];
  var SIMPLEX_F2 = 0.5 * (Math.sqrt(3) - 1);
  var SIMPLEX_G2 = (3 - Math.sqrt(3)) / 6;
  var SIMPLEX_F3 = 1 / 3;
  var SIMPLEX_G3 = 1 / 6;
  function createNoise(seed = 1) {
    const random = createRng(seed);
    const p = [];
    for (let i = 0; i < 256; i++) p.push(i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const swap = p[i];
      p[i] = p[j];
      p[j] = swap;
    }
    const perm = [];
    const grad = [];
    for (let i = 0; i < 512; i++) {
      const v = p[i & 255];
      perm.push(v);
      grad.push(v % 12 * 3);
    }
    function corner2(g, x, y) {
      let t = 0.5 - x * x - y * y;
      if (t < 0) return 0;
      t *= t;
      return t * t * (SIMPLEX_GRAD[g] * x + SIMPLEX_GRAD[g + 1] * y);
    }
    function corner3(g, x, y, z) {
      let t = 0.6 - x * x - y * y - z * z;
      if (t < 0) return 0;
      t *= t;
      return t * t * (SIMPLEX_GRAD[g] * x + SIMPLEX_GRAD[g + 1] * y + SIMPLEX_GRAD[g + 2] * z);
    }
    function noise2(xin, yin) {
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
      return 70 * (corner2(grad[ii + perm[jj]], x0, y0) + corner2(grad[ii + i1 + perm[jj + j1]], x0 - i1 + SIMPLEX_G2, y0 - j1 + SIMPLEX_G2) + corner2(grad[ii + 1 + perm[jj + 1]], x0 - 1 + 2 * SIMPLEX_G2, y0 - 1 + 2 * SIMPLEX_G2));
    }
    function noise3(xin, yin, zin) {
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
        if (y0 >= z0) {
          i1 = 1;
          i2 = 1;
          j2 = 1;
        } else if (x0 >= z0) {
          i1 = 1;
          i2 = 1;
          k2 = 1;
        } else {
          k1 = 1;
          i2 = 1;
          k2 = 1;
        }
      } else if (y0 < z0) {
        k1 = 1;
        j2 = 1;
        k2 = 1;
      } else if (x0 < z0) {
        j1 = 1;
        j2 = 1;
        k2 = 1;
      } else {
        j1 = 1;
        i2 = 1;
        j2 = 1;
      }
      const ii = i & 255;
      const jj = j & 255;
      const kk = k & 255;
      const g = SIMPLEX_G3;
      return 32 * (corner3(grad[ii + perm[jj + perm[kk]]], x0, y0, z0) + corner3(grad[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x0 - i1 + g, y0 - j1 + g, z0 - k1 + g) + corner3(grad[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x0 - i2 + 2 * g, y0 - j2 + 2 * g, z0 - k2 + 2 * g) + corner3(grad[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x0 - 1 + 3 * g, y0 - 1 + 3 * g, z0 - 1 + 3 * g));
    }
    return { noise2, noise3 };
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

  // registry/ascii/ascii-noise-field/core.ts
  var defaults = {
    scale: 0.08,
    speed: 0.15,
    octaves: 2,
    contrast: 1.4,
    density: 0.45,
    glyphs: FALLBACK_RAMP,
    fontSize: 12,
    fontFamily: GRID_FONT,
    lineHeight: 1.2,
    fps: 24,
    paused: false,
    time: null,
    seed: 1
  };
  var STILL_TIME = 1200;
  var OCTAVE_GAIN = 0.5;
  var MAX_OCTAVES = 3;
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let noise = createNoise(props.seed);
    let ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
    const freq = [1, 1, 1];
    const rowCoord = [0, 0, 0];
    const timeCoord = [0, 0, 0];
    function gridOptions(p) {
      return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
    }
    function draw(t) {
      const { cols, rows, aspect } = grid;
      const octaves = Math.min(MAX_OCTAVES, Math.max(1, Math.round(props.octaves)));
      const scale = props.scale;
      const contrast = props.contrast;
      const density = props.density;
      const seconds = t / 1e3 * props.speed;
      let f = 1;
      for (let o = 0; o < octaves; o++) {
        freq[o] = f;
        timeCoord[o] = seconds * f;
        f *= 2;
      }
      for (let y = 0; y < rows; y++) {
        for (let o = 0; o < octaves; o++) rowCoord[o] = y * scale / aspect * (freq[o] ?? 1);
        for (let x = 0; x < cols; x++) {
          let sum = 0;
          let amp = 1;
          let norm = 0;
          for (let o = 0; o < octaves; o++) {
            sum += noise.noise3(x * scale * (freq[o] ?? 1), rowCoord[o] ?? 0, timeCoord[o] ?? 0) * amp;
            norm += amp;
            amp *= OCTAVE_GAIN;
          }
          const level = sum / norm / 2 + 0.5;
          const shaped = Math.min(1, Math.max(0, (level - density) * contrast + 0.5));
          grid.set(x, y, pick(ramp, shaped));
        }
      }
      grid.flush();
      host.dataset.picaReady = "true";
    }
    const grid = createGrid(host, gridOptions(props), () => {
      ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
      loop.redraw();
    });
    const loop = createLoop({
      el: host,
      fps: props.fps,
      paused: props.paused,
      time: props.time,
      still: STILL_TIME,
      frame: draw
    });
    labelHost(host, "");
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.seed !== before.seed) noise = createNoise(props.seed);
        if (props.glyphs !== before.glyphs || props.fontFamily !== before.fontFamily || props.lineHeight !== before.lineHeight) {
          ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
        }
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

  // lib/blocks.ts
  var BRAILLE_BASE = 10240;
  function brailleDot(row, col) {
    if (row === 3) return col === 0 ? 64 : 128;
    return 1 << (col === 0 ? row : row + 3);
  }
  function braille(bits) {
    return String.fromCharCode(BRAILLE_BASE + (bits & 255));
  }
  var LOWER_EIGHTHS = " ▁▂▃▄▅▆▇█";
  var clampEighths = (n) => Math.max(0, Math.min(8, Math.round(n)));
  function lowerEighth(n) {
    return LOWER_EIGHTHS[clampEighths(n)] ?? " ";
  }

  // registry/text-mode/ascii-sparkline/core.ts
  var defaults2 = {
    values: [
      3.1,
      3.5,
      3.3,
      3.9,
      4.4,
      4.1,
      4.7,
      5.2,
      4.9,
      5.5,
      6.1,
      5.8,
      6.4,
      7,
      6.7,
      7.3,
      7.9,
      8.4,
      9.1,
      9.8,
      9.3,
      8.6,
      7.9,
      7.2
    ],
    mode: "blocks",
    width: 0,
    min: null,
    max: null,
    label: "trend",
    fontFamily: GRID_FONT
  };
  function resample(source, count) {
    const last = source.length - 1;
    const out = new Array(count);
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i * last / (count - 1) : 0;
      const lo = Math.floor(t);
      const hi = Math.min(lo + 1, last);
      const frac = t - lo;
      out[i] = (source[lo] ?? 0) * (1 - frac) + (source[hi] ?? 0) * frac;
    }
    return out;
  }
  function render(props, clean) {
    if (clean.length === 0) return "";
    const lo = props.min ?? Math.min(...clean);
    const hi = props.max ?? Math.max(...clean);
    const span = hi - lo;
    const scale = (v) => span > 0 ? Math.min(1, Math.max(0, (v - lo) / span)) : 0.5;
    if (props.mode === "braille") {
      const cells2 = props.width > 0 ? props.width : Math.ceil(clean.length / 2);
      const dots = resample(clean, cells2 * 2);
      let text2 = "";
      for (let c = 0; c < cells2; c++) {
        let bits = 0;
        for (let col = 0; col < 2; col++) {
          const t = scale(dots[c * 2 + col] ?? lo);
          const row = Math.min(3, Math.max(0, Math.round((1 - t) * 3)));
          bits |= brailleDot(row, col);
        }
        text2 += braille(bits);
      }
      return text2;
    }
    const cells = props.width > 0 ? props.width : clean.length;
    let text = "";
    for (const v of resample(clean, cells)) {
      const level = Math.min(7, Math.max(0, Math.round(scale(v) * 7)));
      text += lowerEighth(level + 1);
    }
    return text;
  }
  function short(n) {
    return String(Math.round(n * 10) / 10);
  }
  function describe(props, clean) {
    if (clean.length === 0) return `${props.label}: no data`;
    const lo = props.min ?? Math.min(...clean);
    const hi = props.max ?? Math.max(...clean);
    const last = clean[clean.length - 1] ?? 0;
    const unit = clean.length === 1 ? "value" : "values";
    return `${props.label}: ${clean.length} ${unit} from ${short(lo)} to ${short(hi)}, last ${short(last)}`;
  }
  var mount2 = (host, initial = {}) => {
    let props = { ...defaults2, ...initial };
    const view = document.createElement("span");
    view.setAttribute("data-pica", "");
    view.setAttribute("aria-hidden", "true");
    view.style.whiteSpace = "nowrap";
    view.style.userSelect = "none";
    view.style.pointerEvents = "none";
    view.style.color = cssVar("fg");
    host.appendChild(view);
    function draw() {
      const clean = props.values.filter((v) => Number.isFinite(v));
      view.style.fontFamily = props.fontFamily;
      view.textContent = render(props, clean);
      labelHost(host, describe(props, clean));
      host.dataset.picaReady = "true";
    }
    draw();
    return {
      update(next) {
        props = { ...props, ...next };
        draw();
      },
      destroy() {
        view.remove();
        unlabelHost(host);
        delete host.dataset.picaReady;
      }
    };
  };

  // registry/sections/bento-hero/core.ts
  var defaults3 = {
    headline: "Components drawn in text.",
    subhead: "A library of text-mode components for React and plain HTML, each one generated as a single file.",
    actions: [
      { label: "Browse components", href: "#components" },
      { label: "Read the docs", href: "#docs" }
    ],
    facts: [
      { label: "Components", value: "70+" },
      { label: "Median size", value: "4.6 KB" },
      { label: "Dependencies", value: "0" }
    ],
    trend: [14, 16, 18, 19, 21, 23, 26, 29, 27, 31, 34, 38],
    align: "start",
    field: "noise",
    intensity: 0.25,
    minHeight: 60,
    paused: false,
    time: null,
    seed: 1
  };
  var TRAY_COLLAPSE = 620;
  var TRAY_ROWS = 40;
  var TRAY_LAST = TRAY_ROWS + 3;
  var GROUP = ":not([data-pica]),[data-pica-lower]";
  var FIELD_GLYPHS = " .:-=";
  var LOWER_SEED = 5;
  var SIDE_SEED = 11;
  var GAP = "clamp(0.7rem,1.5vw,1.2rem)";
  var PAD = "clamp(1.3rem,3vw,2.2rem)";
  function clampVh(minHeight) {
    return Math.min(100, Math.max(0, minHeight));
  }
  function noiseContrast(intensity) {
    return 0.7 + Math.min(1, Math.max(0, intensity)) * 0.8;
  }
  function noiseDensity(intensity) {
    return 0.78 - Math.min(1, Math.max(0, intensity)) * 0.22;
  }
  function fieldProps(p, salt) {
    return { paused: p.paused, time: p.time, seed: hashSeed(p.seed, salt, 7), contrast: noiseContrast(p.intensity), density: noiseDensity(p.intensity), glyphs: FIELD_GLYPHS, fontSize: 10 };
  }
  function part(tag, name) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    node.setAttribute(`data-pica-${name}`, "");
    return node;
  }
  function fieldHostEl() {
    const el = part("div", "fieldhost");
    el.style.position = "absolute";
    el.style.inset = "0.55em";
    return el;
  }
  function trayRules(s, p, hasSide) {
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    const edge = p.align === "center" ? "center" : "flex-start";
    const textAlign = p.align === "center" ? "center" : "start";
    const pad = PAD;
    const gap = GAP;
    const hairline = `color-mix(in srgb, ${muted} 55%, transparent)`;
    const columns = hasSide ? "minmax(0,3fr) minmax(0,2fr)" : "minmax(0,1fr)";
    const slot = `${s} > :not([data-pica]), ${s} > [data-pica-lower]`;
    return [
      `:where(${s}){min-height:${clampVh(p.minHeight)}vh}`,
      `${s}{box-sizing:border-box;position:relative;display:grid;grid-template-columns:${columns};grid-template-rows:auto repeat(${TRAY_ROWS},minmax(0,auto)) minmax(auto,1fr);column-gap:${gap};row-gap:0;padding:${gap};color:${fg};text-align:${textAlign}}`,
      `${s}[data-pica-fit="min"]{grid-template-columns:minmax(0,1fr)}`,
      `${s} > [data-pica-lead]{grid-column:1;grid-row:1;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;gap:0.55em;margin:0 0 ${gap};padding:${pad};border:1px solid ${muted};text-align:${textAlign}}`,
      `${s} [data-pica-headline]{margin:0;font-size:clamp(2.1rem,5vw,3.6rem);line-height:1.05;font-weight:640;letter-spacing:-0.015em;overflow-wrap:break-word}`,
      `${s} [data-pica-subhead]{margin:0;font-size:clamp(0.95rem,1.4vw,1.12rem);line-height:1.55;color:${muted};max-width:36em${p.align === "center" ? ";margin-inline:auto" : ""}}`,
      `${s} [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.7em;justify-content:${edge};margin-top:0.45em}`,
      `${s} [data-pica-actions]:empty{display:none}`,
      `${s} [data-pica-actions] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.25em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
      `${s} [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
      `${s} [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
      `${s} [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
      `${s} [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
      `${s} [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${slot}{grid-column:1;min-width:0;box-sizing:border-box;margin-block:0;padding:0.4em ${pad};border-left:1px solid ${muted};border-right:1px solid ${muted};overflow-wrap:break-word}`,
      `${s} > :nth-child(1 of ${GROUP}){border-top:1px solid ${muted}}`,
      `${s} > :nth-child(1 of ${GROUP}):not([data-pica-lower]){padding-top:${pad}}`,
      `${s} > :nth-last-child(1 of ${GROUP}){border-bottom:1px solid ${muted}}`,
      `${s} > :nth-last-child(1 of ${GROUP}):not([data-pica-lower]){padding-bottom:${pad}}`,
      `${s} > [data-pica-lower]{overflow:hidden;padding:0;min-height:7rem}`,
      `${s} > :nth-child(n+2 of ${GROUP})[data-pica-lower]{border-top:1px solid ${hairline}}`,
      `${s} > [data-pica-side]{min-width:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:${gap};align-content:start}`,
      `${s}[data-pica-fit="min"] > [data-pica-side]{grid-template-columns:minmax(0,1fr)}`,
      `${s} [data-pica-cell]{min-width:0;box-sizing:border-box;position:relative;display:flex;flex-direction:column;justify-content:center;gap:0.45em;padding:0.75em 0.9em;border:1px solid ${muted}}`,
      `${s} [data-pica-cell][data-pica-wide]{grid-column:1/-1}`,
      `${s}[data-pica-fit="min"] [data-pica-cell][data-pica-wide]{grid-column:auto}`,
      `${s} [data-pica-flabel]{font-family:${GRID_FONT};font-size:0.68em;letter-spacing:0.05em;text-transform:uppercase;color:${muted}}`,
      `${s} [data-pica-fvalue]{font-family:${GRID_FONT};font-size:clamp(1.1rem,1.9vw,1.6rem);font-variant-numeric:tabular-nums;color:${fg}}`,
      `${s} [data-pica-sparkhost]{font-size:0.85em;line-height:1.3;min-width:0}`,
      `${s} [data-pica-cell][data-pica-fieldcell]{padding:0;overflow:hidden;min-height:6rem}`,
      // The field inks in muted rather than fg: the grid inside sets its own color from --pica-fg, so the
      // token is rerouted on its host. The fallback repeats muted's own fallback without naming the token,
      // which would be a self-reference and leave the field at full fg.
      `${s} [data-pica-fieldhost]{--pica-fg:var(--pica-muted,color-mix(in srgb,currentColor 65%,transparent))}`
    ].join("\n");
  }
  var mount3 = (host, initial = {}) => {
    let props = { ...defaults3, ...initial };
    const attrs = hostAttributes(host);
    const sheet = scope(host);
    let destroyed = false;
    const lead = part("div", "lead");
    const headlineEl = part("h1", "headline");
    const subheadEl = part("p", "subhead");
    const actionsEl = part("div", "actions");
    lead.append(headlineEl, subheadEl, actionsEl);
    const lower = part("div", "lower");
    lower.style.position = "relative";
    const lowerHost = fieldHostEl();
    lower.append(lowerHost);
    const side = part("div", "side");
    host.prepend(lead);
    host.append(lower, side);
    let spark = null;
    let lowerField = null;
    let sideField = null;
    let leadOn = true;
    function renderLead() {
      headlineEl.textContent = props.headline;
      headlineEl.style.display = props.headline === "" ? "none" : "";
      subheadEl.textContent = props.subhead;
      subheadEl.style.display = props.subhead === "" ? "none" : "";
      renderActions();
      leadOn = props.headline !== "" || props.subhead !== "" || actionsEl.childElementCount > 0;
      lead.style.display = leadOn ? "" : "none";
    }
    function renderActions() {
      actionsEl.replaceChildren();
      for (const [i, action] of props.actions.slice(0, 3).entries()) {
        const a = document.createElement("a");
        a.setAttribute("data-pica", "");
        a.dataset.variant = i === 0 ? "solid" : "outline";
        a.href = action.href;
        a.textContent = action.label;
        actionsEl.append(a);
      }
    }
    function factTile(fact) {
      const cell = part("div", "cell");
      const label = part("div", "flabel");
      label.textContent = fact.label;
      const value = part("div", "fvalue");
      value.textContent = fact.value;
      cell.append(label, value);
      return cell;
    }
    function trendTile() {
      const cell = part("div", "cell");
      const label = part("div", "flabel");
      label.textContent = "Trend";
      const clean = props.trend.filter((v) => Number.isFinite(v));
      const value = part("div", "fvalue");
      value.textContent = String(clean[clean.length - 1] ?? 0);
      const sub = part("div", "sparkhost");
      cell.append(label, value, sub);
      spark = mount2(sub, { values: [...props.trend], label: "trend" });
      return cell;
    }
    function fieldTile() {
      const cell = part("div", "cell");
      cell.setAttribute("data-pica-fieldcell", "");
      const sub = fieldHostEl();
      cell.append(sub);
      sideField = mount(sub, fieldProps(props, SIDE_SEED));
      return cell;
    }
    function syncLower() {
      if (props.field === "noise") {
        if (!lower.isConnected) {
          if (side.isConnected) host.insertBefore(lower, side);
          else host.append(lower);
        }
        if (!lowerField) lowerField = mount(lowerHost, fieldProps(props, LOWER_SEED));
      } else {
        lowerField?.destroy();
        lowerField = null;
        if (lower.isConnected) lower.remove();
      }
    }
    function buildMinors() {
      spark?.destroy();
      spark = null;
      sideField?.destroy();
      sideField = null;
      const tiles = props.facts.slice(0, 4).map(factTile);
      if (props.trend.some((v) => Number.isFinite(v))) tiles.push(trendTile());
      if (props.field === "noise") tiles.push(fieldTile());
      side.replaceChildren();
      if (tiles.length === 0) {
        if (side.isConnected) side.remove();
        return;
      }
      if (tiles.length % 2 === 1) tiles[tiles.length - 1]?.setAttribute("data-pica-wide", "");
      side.append(...tiles);
      if (!side.isConnected) host.append(side);
    }
    function applyLayout() {
      const min = host.clientWidth < TRAY_COLLAPSE;
      attrs.set("data-pica-fit", min ? "min" : null);
      const kids = host.querySelectorAll(":scope > :not([data-pica])").length;
      const after = 1 + (leadOn ? 1 : 0) + kids;
      const lowOn = lower.isConnected;
      if (min) {
        lower.style.gridRow = `${Math.min(after, TRAY_LAST - 1)} / span 1`;
        side.style.gridColumn = "1";
        side.style.gridRow = `${Math.min(after + (lowOn ? 1 : 0), TRAY_LAST - 1)} / -1`;
        side.style.marginTop = kids + (lowOn ? 1 : 0) > 0 ? GAP : "0";
      } else {
        lower.style.gridRow = `${Math.min(after, TRAY_LAST - 1)} / -1`;
        side.style.gridColumn = "2";
        side.style.gridRow = "1 / -1";
        side.style.marginTop = "0";
      }
      const tiles = side.children.length;
      const rows = Math.ceil(tiles / (min ? 1 : 2));
      const flexes = props.field === "noise" && tiles > 0;
      side.style.gridTemplateRows = flexes ? rows > 1 ? `repeat(${rows - 1},auto) minmax(auto,1fr)` : "minmax(auto,1fr)" : `repeat(${Math.max(rows, 1)},auto)`;
    }
    const resizer = typeof ResizeObserver === "function" ? new ResizeObserver(applyLayout) : null;
    const mutator = typeof MutationObserver === "function" ? new MutationObserver(applyLayout) : null;
    renderLead();
    buildMinors();
    syncLower();
    sheet.setRules(trayRules(sheet.selector, props, side.isConnected));
    applyLayout();
    resizer?.observe(host);
    mutator?.observe(host, { childList: true });
    host.dataset.picaReady = "true";
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (changed(before, props, ["headline", "subhead"]) || !sameJson(before.actions, props.actions)) renderLead();
        if (changed(before, props, ["facts", "trend", "field"])) {
          buildMinors();
          syncLower();
          sheet.setRules(trayRules(sheet.selector, props, side.isConnected));
        }
        if (changed(before, props, ["paused", "time", "seed", "intensity"])) {
          lowerField?.update(fieldProps(props, LOWER_SEED));
          sideField?.update(fieldProps(props, SIDE_SEED));
        }
        if (changed(before, props, ["align", "minHeight"])) sheet.setRules(trayRules(sheet.selector, props, side.isConnected));
        applyLayout();
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        resizer?.disconnect();
        mutator?.disconnect();
        spark?.destroy();
        lowerField?.destroy();
        sideField?.destroy();
        lead.remove();
        lower.remove();
        side.remove();
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
  var instance = PicaBentoHero.mount(host, take(window.PICA_PROPS || {}));
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
