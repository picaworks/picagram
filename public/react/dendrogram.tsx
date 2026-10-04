"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Dendrogram · dendrogram
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

// lib/chart.ts
/** Scales, ticks, number labels, and SVG paths for chart components, plus the table that carries a chart's
 *  numbers for assistive technology. Written once, so every chart reads the same way. See STYLE.md, charts. */

interface LinearScale {
  (value: number): number;
  readonly domain: readonly [number, number];
  readonly range: readonly [number, number];
}

/** Maps `domain` onto `range` in a straight line. A zero-width domain maps everything to the range's start. */
function linearScale(domain: readonly [number, number], range: readonly [number, number]): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return Object.assign((value: number) => r0 + (value - d0) * k, { domain, range });
}

/** The smallest and largest finite values, or [0, 0] when there are none. */
function extent(values: readonly number[]): [number, number] {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return min <= max ? [min, max] : [0, 0];
}

/** A round number near `x`: 1, 2, or 5 times a power of ten. */
function niceNumber(x: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(x));
  const fraction = x / 10 ** exponent;
  const nice = round
    ? fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10
    : fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}

/** About `count` round tick values that enclose [min, max], stepping by 1, 2, or 5 times a power of ten,
 *  after Heckbert's "Nice Numbers for Graph Labels" (Graphics Gems, 1990). */
function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  let lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  const step = niceNumber(niceNumber(hi - lo, false) / Math.max(1, count - 1), true);
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const ticks: number[] = [];
  for (let i = 0; start + i * step <= end + step / 2; i++) {
    // toFixed removes float drift such as 0.30000000000000004, and || 0 turns -0 into 0.
    ticks.push(Number((start + i * step).toFixed(decimals)) || 0);
  }
  return ticks;
}

interface BandScale {
  /** Distance from one band's start to the next. */
  readonly step: number;
  /** Width of each band. */
  readonly bandwidth: number;
  /** Where band `index` starts. */
  at(index: number): number;
}

/** `count` evenly spaced bands across `range`. `padding` is the share of each step left empty, split
 *  between both sides of the band. */
function bandScale(count: number, range: readonly [number, number], padding = 0.2): BandScale {
  const [r0, r1] = range;
  const step = (r1 - r0) / Math.max(1, count);
  const bandwidth = step * (1 - padding);
  return { step, bandwidth, at: (index) => r0 + index * step + (step - bandwidth) / 2 };
}

const numberFormats = new Map<string, Intl.NumberFormat>();

/** A number as a chart label, in the viewer's locale unless one is given. With `compact` on, values from ten
 *  thousand up read as 12K or 3.4M. */
function formatNumber(value: number, options: { compact?: boolean; decimals?: number; locale?: string } = {}): string {
  const { compact = true, decimals = 1, locale } = options;
  const short = compact && Math.abs(value) >= 10_000;
  const key = `${locale ?? ""}|${short ? "c" : "n"}|${decimals}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, short ? { notation: "compact", maximumFractionDigits: decimals } : { maximumFractionDigits: decimals });
    numberFormats.set(key, format);
  }
  return format.format(value);
}

/** A coordinate with at most two decimals, which keeps paths short without visible change. */
const coord = (value: number): string => String(Math.round(value * 100) / 100);

/** An SVG path through the points, as straight segments. */
function linePath(points: readonly (readonly [number, number])[]): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${coord(x)} ${coord(y)}`).join("");
}

/** A closed SVG path between the line through the points and a horizontal baseline, for area charts. */
function areaPath(points: readonly (readonly [number, number])[], baseline: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return "";
  return `${linePath(points)}L${coord(last[0])} ${coord(baseline)}L${coord(first[0])} ${coord(baseline)}Z`;
}

/** An SVG path for a ring segment between radii `inner` and `outer`, from angle `start` to `end` in radians,
 *  measured clockwise from twelve o'clock. An inner radius of 0 gives a pie slice. */
function arcPath(cx: number, cy: number, inner: number, outer: number, start: number, end: number): string {
  if (end - start >= Math.PI * 2 - 1e-9) {
    // A full ring has the same start and end point, which an SVG arc cannot draw, so draw two halves.
    const middle = start + Math.PI;
    return arcPath(cx, cy, inner, outer, start, middle) + arcPath(cx, cy, inner, outer, middle, start + Math.PI * 2);
  }
  const large = end - start > Math.PI ? 1 : 0;
  const at = (r: number, a: number): string => `${coord(cx + r * Math.sin(a))} ${coord(cy - r * Math.cos(a))}`;
  const outerArc = `A${coord(outer)} ${coord(outer)} 0 ${large} 1 ${at(outer, end)}`;
  if (inner <= 0) return `M${coord(cx)} ${coord(cy)}L${at(outer, start)}${outerArc}Z`;
  return `M${at(outer, start)}${outerArc}L${at(inner, end)}A${coord(inner)} ${coord(inner)} 0 ${large} 0 ${at(inner, start)}Z`;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** An SVG element with the given attributes. */
function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Readonly<Record<string, string | number>> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  return el;
}

/** A visually hidden table of the chart's numbers, which assistive technology reads instead of the drawing.
 *  The first cell of each row is its header. Append it to the host, and hide the drawing itself. */
function dataTable(caption: string, head: readonly string[], rows: readonly (readonly (string | number)[])[]): HTMLTableElement {
  const table = document.createElement("table");
  table.setAttribute("data-pica", "");
  table.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
  table.createCaption().textContent = caption;
  const headRow = table.createTHead().insertRow();
  for (const label of head) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headRow.appendChild(th);
  }
  const body = table.createTBody();
  for (const row of rows) {
    const tr = body.insertRow();
    row.forEach((cell, i) => {
      if (i === 0) {
        const th = document.createElement("th");
        th.scope = "row";
        th.textContent = String(cell);
        tr.appendChild(th);
      } else {
        tr.insertCell().textContent = String(cell);
      }
    });
  }
  return table;
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

// registry/data/dendrogram/core.ts
export interface DendrogramNode {
  /** Unique, nonempty identifier used by selection. */
  id: string;
  /** Human-readable node label. */
  label: string;
  /** Absolute nonnegative merge distance; leaves must be zero and parents cannot be below children. */
  distance: number;
  /** Ordered child nodes; missing or empty means a leaf. */
  children?: DendrogramNode[];
}

export interface DendrogramProps {
  /** Hierarchical merge distances, with unique IDs; null or invalid data shows an empty state. */
  tree: DendrogramNode | null;
  /** Horizontal places leaves on the right; vertical places leaves below the root. */
  orientation: "horizontal" | "vertical";
  /** Selected node ID; null uses internal selection, and an empty string selects nothing. */
  value: string | null;
  /** Initial selected node ID, read once at mount. */
  defaultValue: string;
  /** SVG uses exact distances; glyph quantizes the same geometry onto monospace cells. */
  look: "glyph" | "svg";
  /** Accessible chart name; an empty name hides the chart from assistive technology. */
  label: string;
}

export interface DendrogramEvents {
  /** Selected node ID, emitted only in response to pointer or keyboard input. */
  valueChange: string;
}

export const defaults: DendrogramProps = {
  tree: {
    id: "all", label: "All samples", distance: 12, children: [
      { id: "warm", label: "Warm tones", distance: 5, children: [
        { id: "amber", label: "Amber", distance: 0 },
        { id: "ochre", label: "Ochre", distance: 0 },
        { id: "ivory", label: "Ivory", distance: 0 },
      ] },
      { id: "cool", label: "Cool tones", distance: 8, children: [
        { id: "indigo", label: "Indigo", distance: 0 },
        { id: "teal", label: "Green pair", distance: 2, children: [
          { id: "cyan", label: "Cyan", distance: 0 },
          { id: "jade", label: "Jade", distance: 0 },
        ] },
      ] },
    ],
  },
  orientation: "horizontal",
  value: null,
  defaultValue: "warm",
  look: "glyph",
  label: "Hierarchical sample distances",
};

type DendrogramEntry = { id: string; label: string; distance: number; parent: DendrogramEntry | null; children: DendrogramEntry[]; first: number; last: number };
type DendrogramModel = { nodes: DendrogramEntry[]; leaves: DendrogramEntry[]; root: DendrogramEntry | null; error: string };
type DendrogramPoint = { node: DendrogramEntry; x: number; y: number };

function dendrogramModel(tree: DendrogramNode | null): DendrogramModel {
  const nodes: DendrogramEntry[] = [], leaves: DendrogramEntry[] = [];
  const seen = new Set<string>();
  function visit(node: DendrogramNode, parent: DendrogramEntry | null, depth: number): DendrogramEntry {
    if (!node || typeof node.id !== "string" || !node.id || seen.has(node.id) || !Number.isFinite(node.distance) || node.distance < 0 || depth > 48 || nodes.length >= 512) throw new Error("Invalid tree");
    if (parent && node.distance > parent.distance) throw new Error("Distances must increase toward the root");
    seen.add(node.id);
    const result: DendrogramEntry = { id: node.id, label: node.label || node.id, distance: node.distance, parent, children: [], first: leaves.length, last: leaves.length };
    nodes.push(result);
    if (node.children?.length) result.children = node.children.map((child) => visit(child, result, depth + 1));
    else {
      if (node.distance !== 0) throw new Error("Leaf distance must be zero");
      leaves.push(result);
    }
    result.last = leaves.length - 1;
    return result;
  }
  if (!tree) return { nodes, leaves, root: null, error: "No hierarchy supplied" };
  try { return { nodes, leaves, root: visit(tree, null, 0), error: "" }; }
  catch { return { nodes: [], leaves: [], root: null, error: "Invalid hierarchy: use unique IDs, zero-distance leaves, and increasing parent distances" }; }
}

function dendrogramNumber(value: number): string {
  return String(Number(value.toPrecision(4)));
}

function dendrogramLabelLines(label: string): string[] {
  const lines: string[] = [];
  let rest = label;
  while (rest.length && lines.length < 4) {
    if (rest.length <= 13) { lines.push(rest); break; }
    const space = rest.lastIndexOf(" ", 13);
    const end = space > 0 ? space : 13;
    lines.push(rest.slice(0, end));
    rest = rest.slice(end).trimStart();
    if (lines.length === 4 && rest) lines[3] = `${(lines[3] ?? "").slice(0, 10)}...`;
  }
  return lines;
}

function dendrogramElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  return node;
}

export const mount: Mount<DendrogramProps> = (host, initial = {}) => {
  let props: DendrogramProps = { ...defaults, ...initial };
  let internal = props.defaultValue;
  let model = dendrogramModel(props.tree);
  let alive = true;
  let table: HTMLTableElement | null = null;
  let positions: DendrogramPoint[] = [];
  const attrs = hostAttributes(host);
  const emit = emitter<DendrogramEvents>(host);
  const restore = styleHost(host, {
    position: getComputedStyle(host).position === "static" ? "relative" : getComputedStyle(host).position,
    display: "flex", "flex-direction": "column", "box-sizing": "border-box",
    padding: "12px", gap: "8px", "background-color": cssVar("bg"),
  });
  const viewport = dendrogramElement("div");
  viewport.setAttribute("aria-hidden", "true");
  viewport.style.cssText = "flex:1;min-height:0;min-width:0;overflow:auto;cursor:pointer";
  const drawing = dendrogramElement("div");
  viewport.append(drawing);
  const status = dendrogramElement("div");
  status.id = nextId("dendrogram-status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  status.style.cssText = `font-family:${GRID_FONT};font-size:12px;line-height:1.5;color:${cssVar("fg")};overflow-wrap:anywhere`;
  const help = dendrogramElement("span");
  help.id = nextId("dendrogram-help");
  help.textContent = "Click a merge or leaf. Arrow keys move through nodes; Home selects the root, End the last leaf, Escape clears selection. Branch lengths show parent minus child merge distance.";
  help.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
  host.append(viewport, status, help);

  function selected(): string { return props.value === null ? internal : props.value; }

  function detail(): string {
    const node = model.nodes.find((entry) => entry.id === selected());
    return model.error || (node ? `${node.label} / distance ${dendrogramNumber(node.distance)} / ${node.last - node.first + 1} leaves` : "Select a merge or leaf / arrow keys or click");
  }

  function accessibility(): void {
    attrs.set("role", "group");
    attrs.set("aria-label", props.label.trim() || null);
    attrs.set("aria-hidden", props.label.trim() ? null : "true");
    attrs.set("tabindex", "0");
    attrs.set("aria-describedby", `${help.id} ${status.id}`);
  }

  function updateTable(): void {
    table?.remove();
    table = dataTable(props.label || "Dendrogram", ["Node", "ID", "Parent", "Merge distance", "Branch length", "Leaf count"], model.nodes.map((node) => [node.label, node.id, node.parent?.label ?? "Root", node.distance, node.parent ? node.parent.distance - node.distance : 0, node.last - node.first + 1]));
    host.append(table);
  }

  function draw(): void {
    if (!alive) return;
    drawing.replaceChildren();
    status.textContent = detail();
    positions = [];
    if (!model.root) {
      const empty = dendrogramElement("p");
      empty.textContent = model.error;
      empty.style.cssText = `font-family:${GRID_FONT};font-size:12px;color:${cssVar("muted")};padding:1em`;
      drawing.append(empty);
      attrs.set("data-pica-ready", "true");
      return;
    }
    const horizontal = props.orientation !== "vertical";
    const cell = measureCell(GRID_FONT, 12, 1.4);
    const labelWidth = Math.min(64, Math.max(8, ...model.leaves.map((node) => node.label.length))) * cell.w;
    const width = Math.ceil(Math.max(viewport.clientWidth, horizontal ? 180 + labelWidth : 80 + model.leaves.length * 108) / cell.w) * cell.w;
    const height = Math.ceil(Math.max(viewport.clientHeight, horizontal ? 72 + model.leaves.length * cell.h * 2 : 320) / cell.h) * cell.h;
    drawing.style.width = `${width}px`;
    drawing.style.height = `${height}px`;
    const start = horizontal ? cell.w * 3 : cell.h * 3;
    const end = horizontal ? width - labelWidth - cell.w * 3 : height - cell.h * 6;
    const span = Math.max(horizontal ? cell.w * 12 : cell.h * 5, end - start);
    const max = model.root.distance;
    const crossStart = horizontal ? cell.h * 4 : cell.w * 7;
    const crossEnd = horizontal ? height - cell.h * 2 : width - cell.w * 7;
    const leafStep = model.leaves.length > 1 ? (crossEnd - crossStart) / (model.leaves.length - 1) : 0;
    const chosen = model.nodes.find((node) => node.id === selected());
    const active = (node: DendrogramEntry): boolean => Boolean(chosen && node.first >= chosen.first && node.last <= chosen.last && node.distance <= chosen.distance);
    const points = new Map<string, DendrogramPoint>();
    for (const node of model.nodes) {
      const along = start + (1 - node.distance / (max || 1)) * span;
      const across = model.leaves.length === 1 ? (crossStart + crossEnd) / 2 : crossStart + (node.first + node.last) / 2 * leafStep;
      points.set(node.id, { node, x: horizontal ? along : across, y: horizontal ? across : along });
    }
    const labels: { x: number; y: number; text: string; muted: boolean }[] = [];
    const segments: { x1: number; y1: number; x2: number; y2: number; active: boolean; guide: boolean }[] = [];
    for (let tick = 0; tick <= 4; tick++) {
      const along = start + span * tick / 4;
      const value = dendrogramNumber(max * (1 - tick / 4));
      if (horizontal) {
        labels.push({ x: along, y: cell.h, text: value, muted: true });
        segments.push({ x1: along, y1: cell.h * 2, x2: along, y2: height - cell.h, active: false, guide: true });
      } else {
        labels.push({ x: 0, y: along, text: value, muted: true });
        segments.push({ x1: cell.w * 5, y1: along, x2: width - cell.w, y2: along, active: false, guide: true });
      }
    }
    for (const node of model.nodes) {
      const point = points.get(node.id)!;
      for (const child of node.children) {
        const next = points.get(child.id)!;
        const highlighted = active(child);
        const elbow = horizontal ? { x: point.x, y: next.y } : { x: next.x, y: point.y };
        segments.push({ x1: point.x, y1: point.y, x2: elbow.x, y2: elbow.y, active: highlighted, guide: false });
        segments.push({ x1: elbow.x, y1: elbow.y, x2: next.x, y2: next.y, active: highlighted, guide: false });
      }
      if (!node.children.length) {
        const lines = horizontal ? [node.label.length > 64 ? `${node.label.slice(0, 61)}...` : node.label] : dendrogramLabelLines(node.label);
        lines.forEach((text, index) => labels.push({ x: horizontal ? point.x + cell.w * 2 : point.x - cell.w * 6, y: horizontal ? point.y : point.y + cell.h * (index + 2), text, muted: false }));
      }
    }

    if (props.look === "svg") {
      const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}`, width, height, "font-family": GRID_FONT, "font-size": 12 });
      root.style.display = "block";
      for (const line of segments) root.append(svg("line", { "data-pica": "", x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, stroke: cssVar(line.guide ? "muted" : line.active ? "accent" : "fg"), "stroke-width": line.guide ? 0.6 : 1.5, "stroke-dasharray": line.guide ? "1 7" : "none" }));
      for (const point of points.values()) {
        const marker = svg("circle", { "data-pica": "", cx: point.x, cy: point.y, r: point.node.id === selected() ? 5 : 3, fill: cssVar(active(point.node) ? "accent" : "fg") });
        const title = svg("title", { "data-pica": "" });
        title.textContent = `${point.node.label}: distance ${dendrogramNumber(point.node.distance)}`;
        marker.append(title);
        root.append(marker);
      }
      for (const label of labels) {
        const text = svg("text", { "data-pica": "", x: label.x, y: label.y + 4, fill: cssVar(label.muted ? "muted" : "fg") });
        text.textContent = label.text;
        root.append(text);
      }
      drawing.append(root);
      positions = [...points.values()];
    } else {
      const cols = Math.ceil(width / cell.w), rows = Math.ceil(height / cell.h);
      const glyphs = new Array<string>(cols * rows).fill(" ");
      const tokens = new Array<"fg" | "muted" | "accent">(cols * rows).fill("fg");
      const bits = new Uint8Array(cols * rows);
      const index = (x: number, y: number): number => Math.max(0, Math.min(rows - 1, y)) * cols + Math.max(0, Math.min(cols - 1, x));
      for (const line of segments) {
        const x1 = Math.round(line.x1 / cell.w), y1 = Math.round(line.y1 / cell.h);
        const x2 = Math.round(line.x2 / cell.w), y2 = Math.round(line.y2 / cell.h);
        const length = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        for (let step = 0; step <= length; step++) {
          const x = Math.round(x1 + (x2 - x1) * step / Math.max(1, length));
          const y = Math.round(y1 + (y2 - y1) * step / Math.max(1, length));
          const i = index(x, y);
          if (line.guide) { if (glyphs[i] === " " && step % 2 === 0) { glyphs[i] = "·"; tokens[i] = "muted"; } continue; }
          const before = step > 0, after = step < length;
          if (x1 === x2) bits[i] = (bits[i] ?? 0) | (before ? y2 >= y1 ? 1 : 4 : 0) | (after ? y2 >= y1 ? 4 : 1 : 0);
          else bits[i] = (bits[i] ?? 0) | (before ? x2 >= x1 ? 8 : 2 : 0) | (after ? x2 >= x1 ? 2 : 8 : 0);
          glyphs[i] = ["·", "│", "─", "└", "│", "│", "┌", "├", "─", "┘", "─", "┴", "┐", "┤", "┬", "┼"][bits[i] ?? 0] ?? "┼";
          tokens[i] = line.active || tokens[i] === "accent" ? "accent" : "fg";
        }
      }
      for (const point of points.values()) {
        const x = Math.round(point.x / cell.w), y = Math.round(point.y / cell.h);
        glyphs[index(x, y)] = point.node.id === selected() ? "◆" : point.node.children.length ? "┼" : "○";
        tokens[index(x, y)] = active(point.node) ? "accent" : "fg";
      }
      for (const label of labels) {
        const x = Math.max(0, Math.round(label.x / cell.w)), y = Math.round(label.y / cell.h);
        [...label.text].forEach((glyph, offset) => { if (x + offset < cols) { const i = index(x + offset, y); glyphs[i] = glyph; tokens[i] = label.muted ? "muted" : "fg"; } });
      }
      const pre = dendrogramElement("pre");
      pre.style.cssText = `margin:0;font-family:${GRID_FONT};font-size:12px;line-height:${cell.h}px;letter-spacing:0;font-kerning:none;font-variant-ligatures:none`;
      for (let row = 0; row < rows; row++) {
        let col = 0;
        while (col < cols) {
          const token = tokens[row * cols + col] ?? "fg";
          let end = col + 1;
          while (end < cols && tokens[row * cols + end] === token) end++;
          const span = dendrogramElement("span");
          span.style.color = cssVar(token);
          span.textContent = glyphs.slice(row * cols + col, row * cols + end).join("");
          pre.append(span);
          col = end;
        }
        pre.append(document.createTextNode("\n"));
      }
      drawing.append(pre);
      positions = [...points.values()].map((point) => ({ ...point, x: (Math.round(point.x / cell.w) + 0.5) * cell.w, y: (Math.round(point.y / cell.h) + 0.5) * cell.h }));
    }
    attrs.set("data-pica-ready", "true");
  }

  function select(id: string): void {
    if (id === selected()) return;
    if (props.value === null) { internal = id; draw(); }
    emit("valueChange", id);
  }

  const onKey = (event: KeyboardEvent): void => {
    if (event.target !== host || !model.nodes.length) return;
    const current = model.nodes.findIndex((node) => node.id === selected());
    let next: number;
    switch (event.key) {
      case "Home": next = 0; break;
      case "End": next = model.nodes.length - 1; break;
      case "ArrowRight": case "ArrowDown": next = (current + 1) % model.nodes.length; break;
      case "ArrowLeft": case "ArrowUp": next = (current - 1 + model.nodes.length) % model.nodes.length; break;
      case "Escape": event.preventDefault(); select(""); return;
      default: return;
    }
    event.preventDefault();
    const node = model.nodes[next];
    if (node) select(node.id);
  };
  const onClick = (event: MouseEvent): void => {
    host.focus({ preventScroll: true });
    if (!(event.target instanceof Node) || !drawing.contains(event.target)) return;
    const rect = drawing.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    let closest: DendrogramPoint | null = null;
    let distance = 26;
    for (const point of positions) {
      const d = Math.hypot(point.x - x, point.y - y);
      if (d < distance) { closest = point; distance = d; }
    }
    if (closest) select(closest.node.id);
  };
  host.addEventListener("keydown", onKey);
  host.addEventListener("click", onClick);
  const resize = new ResizeObserver(draw);
  resize.observe(viewport);
  accessibility();
  updateTable();
  draw();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const changed = !sameJson(before.tree, props.tree);
      if (changed) model = dendrogramModel(props.tree);
      if (changed || before.label !== props.label) updateTable();
      accessibility();
      draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      resize.disconnect();
      host.removeEventListener("keydown", onKey);
      host.removeEventListener("click", onClick);
      viewport.remove();
      status.remove();
      help.remove();
      table?.remove();
      attrs.restore();
      restore();
    },
  };
};

// registry/data/dendrogram/index.tsx
export type DendrogramComponentProps = Partial<DendrogramProps> & WrapperProps & Handlers<DendrogramEvents>;

/** A distance-scaled hierarchy with selectable clusters and aligned leaf labels. */
export function Dendrogram({ className, style, palette, ...props }: DendrogramComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
