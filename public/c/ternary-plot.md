# Ternary Plot

> Three-part compositions normalized to a triangular chart, with directly labeled samples, keyboard selection, and an accessible table of weights and proportions.

Category: data. Tags: ternary, composition, proportions, triangle, glyph grid, svg, data table, keyboard. Static. Size: 5.8 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/ternary-plot.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `points` | { id: string; label: string; a: number; b: number; c: number }[] | `[{"id":"clay","label":"Clay","a":72,"b":18,"c":10},{"id":"silt","label":"Silt","a":14,"b":76,"c":10},{"id":"sand","label":"Sand","a":10,"b":12,"c":78},{"id":"loam","label":"Loam","a":32,"b":36,"c":32},{"id":"sandy-loam","label":"Sandy loam","a":22,"b":22,"c":56}]` | Samples with unique IDs and three nonnegative weights; positive totals are normalized to 100%. Invalid samples are omitted. |
| `labels` | [string, string, string] | `["CLAY","SILT","SAND"]` | Names of the top, bottom-left, and bottom-right components, in that order. |
| `label` | string | `"Soil composition: clay, silt, and sand"` | Accessible name for the chart and its data table. |
| `value` | string \| null | `null` | Selected sample ID. Null uses internal selection; an empty string selects nothing. |
| `defaultValue` | string | `"loam"` | Initial selected sample ID, read once when mounted in uncontrolled mode. |
| `look` | "glyph" \| "svg" | `"glyph"` | Glyph draws cell-aligned marks and guides; SVG draws exact barycentric positions. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `valueChange` | `onValueChange` | `string` | Selected sample ID, emitted only after pointer or keyboard input. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Ternary Plot · ternary-plot
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

// registry/data/ternary-plot/core.ts
export interface TernaryPlotProps {
  /** Samples with unique IDs and three nonnegative weights; positive totals are normalized to 100%. Invalid samples are omitted. */
  points: { id: string; label: string; a: number; b: number; c: number }[];
  /** Names of the top, bottom-left, and bottom-right components, in that order. */
  labels: [string, string, string];
  /** Accessible name for the chart and its data table. */
  label: string;
  /** Selected sample ID. Null uses internal selection; an empty string selects nothing. */
  value: string | null;
  /** Initial selected sample ID, read once when mounted in uncontrolled mode. */
  defaultValue: string;
  /** Glyph draws cell-aligned marks and guides; SVG draws exact barycentric positions. */
  look: "glyph" | "svg";
}

export interface TernaryPlotEvents {
  /** Selected sample ID, emitted only after pointer or keyboard input. */
  valueChange: string;
}

export const defaults: TernaryPlotProps = {
  points: [
    { id: "clay", label: "Clay", a: 72, b: 18, c: 10 },
    { id: "silt", label: "Silt", a: 14, b: 76, c: 10 },
    { id: "sand", label: "Sand", a: 10, b: 12, c: 78 },
    { id: "loam", label: "Loam", a: 32, b: 36, c: 32 },
    { id: "sandy-loam", label: "Sandy loam", a: 22, b: 22, c: 56 },
  ],
  labels: ["CLAY", "SILT", "SAND"],
  label: "Soil composition: clay, silt, and sand",
  value: null,
  defaultValue: "loam",
  look: "glyph",
};

type TernarySample = { id: string; label: string; a: number; b: number; c: number; fractions: [number, number, number] };
type TernaryPosition = { x: number; y: number };

function ternarySamples(points: TernaryPlotProps["points"]): TernarySample[] {
  const seen = new Set<string>();
  const result: TernarySample[] = [];
  for (const p of points) {
    if (!p.id || seen.has(p.id) || ![p.a, p.b, p.c].every((v) => Number.isFinite(v) && v >= 0)) continue;
    const largest = Math.max(p.a, p.b, p.c);
    if (largest === 0) continue;
    const scaled: [number, number, number] = [p.a / largest, p.b / largest, p.c / largest];
    const total = scaled[0] + scaled[1] + scaled[2];
    seen.add(p.id);
    result.push({ ...p, fractions: [scaled[0] / total, scaled[1] / total, scaled[2] / total] });
  }
  return result;
}

function ternaryPosition(f: readonly [number, number, number], top: TernaryPosition, left: TernaryPosition, right: TernaryPosition): TernaryPosition {
  return { x: f[0] * top.x + f[1] * left.x + f[2] * right.x, y: f[0] * top.y + f[1] * left.y + f[2] * right.y };
}

function ternaryPercent(n: number): string {
  return `${(n * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

export const mount: Mount<TernaryPlotProps> = (host, initial = {}) => {
  let props: TernaryPlotProps = { ...defaults, ...initial };
  let internalValue = props.defaultValue;
  let samples = ternarySamples(props.points);
  let alive = true;
  let grid: Grid | null = null;
  let graphic: SVGSVGElement | null = null;
  let table: HTMLTableElement | null = null;
  let positions: { id: string; x: number; y: number }[] = [];
  const attrs = hostAttributes(host);
  const restoreStyle = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
  const emit = emitter<TernaryPlotEvents>(host);
  const frame = document.createElement("div");
  frame.setAttribute("data-pica", "");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${cssVar("bg")};cursor:crosshair`;
  host.appendChild(frame);
  const help = document.createElement("span");
  help.setAttribute("data-pica", "");
  help.id = nextId("ternary-help");
  help.textContent = "Use arrow keys to select samples, Home for the first, End for the last, or click a mark. Values are normalized to 100 percent.";
  const status = document.createElement("span");
  status.setAttribute("data-pica", "");
  status.id = nextId("ternary-status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  for (const node of [help, status]) {
    node.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0";
    host.appendChild(node);
  }
  const palette = watchPalette(host, () => { if (alive) draw(); });

  function selected(): string { return props.value === null ? internalValue : props.value; }

  function detail(): string {
    const point = samples.find((p) => p.id === selected());
    return point ? `${point.label || point.id} · ${props.labels.map((label, i) => `${label} ${ternaryPercent(point.fractions[i] ?? 0)}`).join(" / ")}` : samples.length ? "Select a sample · arrow keys or click" : "No valid composition data";
  }

  function accessibility(): void {
    attrs.set("role", "group");
    attrs.set("aria-label", props.label || "Ternary composition plot");
    attrs.set("tabindex", "0");
    attrs.set("aria-describedby", `${help.id} ${status.id}`);
    status.textContent = detail();
  }

  function updateTable(): void {
    table?.remove();
    table = dataTable(props.label || "Ternary composition plot", ["Sample", ...props.labels.map((label) => `${label} weight`), ...props.labels.map((label) => `${label} proportion`)], samples.map((p) => [p.label || p.id, p.a, p.b, p.c, ...p.fractions.map(ternaryPercent)]));
    host.appendChild(table);
  }

  function drawSvg(): void {
    graphic?.remove();
    const width = Math.max(1, frame.clientWidth);
    const height = Math.max(1, frame.clientHeight);
    const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}`, "font-family": GRID_FONT, "font-size": 11 });
    root.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
    frame.appendChild(root);
    graphic = root;
    const triangleHeight = Math.max(1, Math.min(height - 112, (width - 84) * Math.sqrt(3) / 2));
    const half = triangleHeight / Math.sqrt(3);
    const cy = Math.max(50, (height - triangleHeight) / 2 - 5);
    const top = { x: width / 2, y: cy };
    const left = { x: width / 2 - half, y: cy + triangleHeight };
    const right = { x: width / 2 + half, y: cy + triangleHeight };
    function line(a: TernaryPosition, b: TernaryPosition, edge = false): void {
      root.appendChild(svg("line", { "data-pica": "", x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: cssVar(edge ? "fg" : "muted"), "stroke-width": edge ? 1.2 : 0.6, "stroke-dasharray": edge ? "none" : "2 5" }));
    }
    function text(x: number, y: number, value: string, anchor = "middle", muted = false): void {
      const node = svg("text", { "data-pica": "", x, y, "text-anchor": anchor, fill: cssVar(muted ? "muted" : "fg") });
      node.textContent = value;
      root.appendChild(node);
    }
    text(16, 22, "COMPOSITION / 100%", "start", true);
    for (let step = 1; step < 5; step++) {
      const t = step / 5;
      for (const pair of [
        [[t, 1 - t, 0], [t, 0, 1 - t]],
        [[1 - t, t, 0], [0, t, 1 - t]],
        [[1 - t, 0, t], [0, 1 - t, t]],
      ] as const) line(ternaryPosition(pair[0], top, left, right), ternaryPosition(pair[1], top, left, right));
      const tick = ternaryPosition([t, 1 - t, 0], top, left, right);
      text(tick.x - 8, tick.y + 4, String(step * 20), "end", true);
    }
    line(top, left, true); line(left, right, true); line(right, top, true);
    text(top.x, top.y - 16, `${props.labels[0]} 100%`);
    text(left.x, left.y + 21, `${props.labels[1]} 100%`, "start");
    text(right.x, right.y + 21, `${props.labels[2]} 100%`, "end");
    positions = samples.map((point) => {
      const position = ternaryPosition(point.fractions, top, left, right);
      const active = point.id === selected();
      if (active) root.appendChild(svg("circle", { "data-pica": "", cx: position.x, cy: position.y, r: 9, fill: "none", stroke: cssVar("accent"), "stroke-width": 2 }));
      root.appendChild(svg("circle", { "data-pica": "", cx: position.x, cy: position.y, r: 3, fill: cssVar("fg") }));
      const label = point.label || point.id;
      const onRight = position.x + 12 + label.length * 6.8 > width - 8;
      text(position.x + (onRight ? -12 : 12), position.y + 4, label, onRight ? "end" : "start");
      return { id: point.id, ...position };
    });
    if (!samples.length) text(width / 2, top.y + triangleHeight * 0.65, "NO VALID DATA", "middle", true);
    text(16, height - 19, detail(), "start");
    const omitted = props.points.length - samples.length;
    if (omitted > 0) text(width - 14, 22, `${omitted} INVALID OMITTED`, "end", true);
  }

  function drawGlyph(): void {
    if (!grid) return;
    const g = grid;
    const colors = palette.colors;
    g.clear();
    const center = Math.floor(g.cols / 2);
    const span = Math.max(2, Math.min(g.cols - 12, Math.floor(Math.max(2, g.rows - 10) * 2 / (Math.sqrt(3) * g.aspect))));
    const triangleRows = Math.max(1, Math.floor(span * g.aspect * Math.sqrt(3) / 2));
    const start = Math.max(4, Math.floor((g.rows - triangleRows) / 2) - 1);
    const top = { x: center, y: start };
    const left = { x: center - Math.floor(span / 2), y: start + triangleRows };
    const right = { x: center + Math.floor(span / 2), y: start + triangleRows };
    function segment(a: TernaryPosition, b: TernaryPosition, glyph: string, color: string): void {
      const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
      for (let i = 0; i <= steps; i++) g.set(Math.round(a.x + (b.x - a.x) * i / steps), Math.round(a.y + (b.y - a.y) * i / steps), glyph, color);
    }
    function writeCentered(x: number, y: number, label: string, color: string): void {
      const text = label.slice(0, g.cols);
      g.write(Math.max(0, Math.min(g.cols - text.length, Math.round(x - text.length / 2))), Math.round(y), text, color);
    }
    g.write(2, 1, "COMPOSITION / 100%", colors.muted);
    for (let step = 1; step < 5; step++) {
      const t = step / 5;
      for (const pair of [
        [[t, 1 - t, 0], [t, 0, 1 - t]],
        [[1 - t, t, 0], [0, t, 1 - t]],
        [[1 - t, 0, t], [0, 1 - t, t]],
      ] as const) segment(ternaryPosition(pair[0], top, left, right), ternaryPosition(pair[1], top, left, right), "·", colors.muted);
      const tick = ternaryPosition([t, 1 - t, 0], top, left, right);
      g.write(Math.max(0, Math.round(tick.x) - 3), Math.round(tick.y), String(step * 20), colors.muted);
    }
    segment(top, left, "╱", colors.fg); segment(left, right, "─", colors.fg); segment(right, top, "╲", colors.fg);
    writeCentered(top.x, top.y - 2, `${props.labels[0]} 100%`, colors.fg);
    g.write(Math.max(0, left.x), left.y + 2, `${props.labels[1]} 100%`, colors.fg);
    const rightLabel = `${props.labels[2]} 100%`;
    g.write(Math.max(0, right.x - rightLabel.length + 1), right.y + 2, rightLabel, colors.fg);
    positions = samples.map((point) => {
      const p = ternaryPosition(point.fractions, top, left, right);
      const col = Math.round(p.x), row = Math.round(p.y);
      const active = point.id === selected();
      g.set(col, row, active ? "◆" : "○", active ? colors.accent : colors.fg);
      const label = (point.label || point.id).slice(0, Math.max(1, g.cols - 4));
      const labelCol = col + label.length + 2 < g.cols ? col + 2 : Math.max(0, col - label.length - 1);
      g.write(labelCol, row, label, colors.fg);
      return { id: point.id, x: (col + 0.5) * g.cellWidth, y: (row + 0.5) * g.cellHeight };
    });
    if (!samples.length) writeCentered(center, start + Math.round(triangleRows * 0.65), "NO VALID DATA", colors.muted);
    g.write(2, g.rows - 2, detail().slice(0, Math.max(0, g.cols - 4)), colors.fg);
    g.flush();
  }

  function draw(): void {
    if (!alive) return;
    if (grid) drawGlyph(); else drawSvg();
    status.textContent = detail();
    attrs.set("data-pica-ready", "true");
  }

  function mountView(): void {
    if (props.look === "glyph") grid = createGrid(frame, { fontFamily: GRID_FONT, fontSize: 12, columns: 0, lineHeight: 1.2, renderer: "canvas", color: "" }, draw);
    draw();
  }

  function select(id: string): void {
    if (id === selected()) return;
    if (props.value === null) { internalValue = id; draw(); }
    emit("valueChange", id);
  }

  const onKey = (event: KeyboardEvent): void => {
    if (event.target !== host || !samples.length) return;
    const index = samples.findIndex((p) => p.id === selected());
    let next: number;
    switch (event.key) {
      case "ArrowRight": case "ArrowDown": next = (index + 1) % samples.length; break;
      case "ArrowLeft": case "ArrowUp": next = (index < 0 ? samples.length : index + samples.length - 1) % samples.length; break;
      case "Home": next = 0; break;
      case "End": next = samples.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const sample = samples[next];
    if (sample) select(sample.id);
  };
  const onClick = (event: MouseEvent): void => {
    if (event.target !== frame && !(event.target instanceof Node && frame.contains(event.target))) return;
    host.focus({ preventScroll: true });
    const rect = frame.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    let nearest: typeof positions[number] | undefined;
    let distance = 28;
    for (const p of positions) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < distance) { nearest = p; distance = d; }
    }
    if (nearest) select(nearest.id);
  };
  host.addEventListener("keydown", onKey);
  frame.addEventListener("click", onClick);
  const resize = new ResizeObserver(() => { if (alive && !grid) draw(); });
  resize.observe(frame);
  accessibility();
  updateTable();
  mountView();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const dataChanged = !sameJson(before.points, props.points);
      if (dataChanged) samples = ternarySamples(props.points);
      if (dataChanged || before.label !== props.label || !sameJson(before.labels, props.labels)) updateTable();
      accessibility();
      palette.refresh();
      if (before.look !== props.look) {
        grid?.destroy(); grid = null;
        graphic?.remove(); graphic = null;
        mountView();
      } else draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      resize.disconnect();
      host.removeEventListener("keydown", onKey);
      frame.removeEventListener("click", onClick);
      grid?.destroy();
      palette.destroy();
      frame.remove();
      table?.remove();
      help.remove();
      status.remove();
      attrs.restore();
      restoreStyle();
    },
  };
};

// registry/data/ternary-plot/index.tsx
export type TernaryPlotComponentProps = Partial<TernaryPlotProps> & WrapperProps & Handlers<TernaryPlotEvents>;

/** Three normalized proportions on a triangular chart, with direct sample labels and keyboard selection. */
export function TernaryPlot({ className, style, palette, ...props }: TernaryPlotComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Ternary Plot · ternary-plot
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Ternary Plot · Pica</title>
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
<div id="pica"></div>
<script>
"use strict";
var PicaTernaryPlot = (() => {
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

  // registry/data/ternary-plot/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/chart.ts
  var SVG_NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
    return el;
  }
  function dataTable(caption, head, rows) {
    const table = document.createElement("table");
    table.setAttribute("data-pica", "");
    table.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
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

  // lib/events.ts
  function eventType(name) {
    return `pica:${name.toLowerCase()}`;
  }
  function emitter(host) {
    return (name, detail) => {
      host.dispatchEvent(new CustomEvent(eventType(name), { detail, bubbles: false }));
    };
  }

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

  // lib/host.ts
  function nextSerial() {
    const g = globalThis;
    g.__picaSerial = (g.__picaSerial ?? 0) + 1;
    return g.__picaSerial;
  }
  function nextId(prefix) {
    return `${prefix}-${nextSerial()}`;
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

  // registry/data/ternary-plot/core.ts
  var defaults = {
    points: [
      { id: "clay", label: "Clay", a: 72, b: 18, c: 10 },
      { id: "silt", label: "Silt", a: 14, b: 76, c: 10 },
      { id: "sand", label: "Sand", a: 10, b: 12, c: 78 },
      { id: "loam", label: "Loam", a: 32, b: 36, c: 32 },
      { id: "sandy-loam", label: "Sandy loam", a: 22, b: 22, c: 56 }
    ],
    labels: ["CLAY", "SILT", "SAND"],
    label: "Soil composition: clay, silt, and sand",
    value: null,
    defaultValue: "loam",
    look: "glyph"
  };
  function ternarySamples(points) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const p of points) {
      if (!p.id || seen.has(p.id) || ![p.a, p.b, p.c].every((v) => Number.isFinite(v) && v >= 0)) continue;
      const largest = Math.max(p.a, p.b, p.c);
      if (largest === 0) continue;
      const scaled = [p.a / largest, p.b / largest, p.c / largest];
      const total = scaled[0] + scaled[1] + scaled[2];
      seen.add(p.id);
      result.push({ ...p, fractions: [scaled[0] / total, scaled[1] / total, scaled[2] / total] });
    }
    return result;
  }
  function ternaryPosition(f, top, left, right) {
    return { x: f[0] * top.x + f[1] * left.x + f[2] * right.x, y: f[0] * top.y + f[1] * left.y + f[2] * right.y };
  }
  function ternaryPercent(n) {
    return `${(n * 100).toFixed(1).replace(/\.0$/, "")}%`;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let internalValue = props.defaultValue;
    let samples = ternarySamples(props.points);
    let alive = true;
    let grid = null;
    let graphic = null;
    let table = null;
    let positions = [];
    const attrs = hostAttributes(host);
    const restoreStyle = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
    const emit = emitter(host);
    const frame = document.createElement("div");
    frame.setAttribute("data-pica", "");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${cssVar("bg")};cursor:crosshair`;
    host.appendChild(frame);
    const help = document.createElement("span");
    help.setAttribute("data-pica", "");
    help.id = nextId("ternary-help");
    help.textContent = "Use arrow keys to select samples, Home for the first, End for the last, or click a mark. Values are normalized to 100 percent.";
    const status = document.createElement("span");
    status.setAttribute("data-pica", "");
    status.id = nextId("ternary-status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    for (const node of [help, status]) {
      node.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0";
      host.appendChild(node);
    }
    const palette = watchPalette(host, () => {
      if (alive) draw();
    });
    function selected() {
      return props.value === null ? internalValue : props.value;
    }
    function detail() {
      const point = samples.find((p) => p.id === selected());
      return point ? `${point.label || point.id} · ${props.labels.map((label, i) => `${label} ${ternaryPercent(point.fractions[i] ?? 0)}`).join(" / ")}` : samples.length ? "Select a sample · arrow keys or click" : "No valid composition data";
    }
    function accessibility() {
      attrs.set("role", "group");
      attrs.set("aria-label", props.label || "Ternary composition plot");
      attrs.set("tabindex", "0");
      attrs.set("aria-describedby", `${help.id} ${status.id}`);
      status.textContent = detail();
    }
    function updateTable() {
      table?.remove();
      table = dataTable(props.label || "Ternary composition plot", ["Sample", ...props.labels.map((label) => `${label} weight`), ...props.labels.map((label) => `${label} proportion`)], samples.map((p) => [p.label || p.id, p.a, p.b, p.c, ...p.fractions.map(ternaryPercent)]));
      host.appendChild(table);
    }
    function drawSvg() {
      graphic?.remove();
      const width = Math.max(1, frame.clientWidth);
      const height = Math.max(1, frame.clientHeight);
      const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}`, "font-family": GRID_FONT, "font-size": 11 });
      root.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
      frame.appendChild(root);
      graphic = root;
      const triangleHeight = Math.max(1, Math.min(height - 112, (width - 84) * Math.sqrt(3) / 2));
      const half = triangleHeight / Math.sqrt(3);
      const cy = Math.max(50, (height - triangleHeight) / 2 - 5);
      const top = { x: width / 2, y: cy };
      const left = { x: width / 2 - half, y: cy + triangleHeight };
      const right = { x: width / 2 + half, y: cy + triangleHeight };
      function line(a, b, edge = false) {
        root.appendChild(svg("line", { "data-pica": "", x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: cssVar(edge ? "fg" : "muted"), "stroke-width": edge ? 1.2 : 0.6, "stroke-dasharray": edge ? "none" : "2 5" }));
      }
      function text(x, y, value, anchor = "middle", muted = false) {
        const node = svg("text", { "data-pica": "", x, y, "text-anchor": anchor, fill: cssVar(muted ? "muted" : "fg") });
        node.textContent = value;
        root.appendChild(node);
      }
      text(16, 22, "COMPOSITION / 100%", "start", true);
      for (let step = 1; step < 5; step++) {
        const t = step / 5;
        for (const pair of [
          [[t, 1 - t, 0], [t, 0, 1 - t]],
          [[1 - t, t, 0], [0, t, 1 - t]],
          [[1 - t, 0, t], [0, 1 - t, t]]
        ]) line(ternaryPosition(pair[0], top, left, right), ternaryPosition(pair[1], top, left, right));
        const tick = ternaryPosition([t, 1 - t, 0], top, left, right);
        text(tick.x - 8, tick.y + 4, String(step * 20), "end", true);
      }
      line(top, left, true);
      line(left, right, true);
      line(right, top, true);
      text(top.x, top.y - 16, `${props.labels[0]} 100%`);
      text(left.x, left.y + 21, `${props.labels[1]} 100%`, "start");
      text(right.x, right.y + 21, `${props.labels[2]} 100%`, "end");
      positions = samples.map((point) => {
        const position = ternaryPosition(point.fractions, top, left, right);
        const active = point.id === selected();
        if (active) root.appendChild(svg("circle", { "data-pica": "", cx: position.x, cy: position.y, r: 9, fill: "none", stroke: cssVar("accent"), "stroke-width": 2 }));
        root.appendChild(svg("circle", { "data-pica": "", cx: position.x, cy: position.y, r: 3, fill: cssVar("fg") }));
        const label = point.label || point.id;
        const onRight = position.x + 12 + label.length * 6.8 > width - 8;
        text(position.x + (onRight ? -12 : 12), position.y + 4, label, onRight ? "end" : "start");
        return { id: point.id, ...position };
      });
      if (!samples.length) text(width / 2, top.y + triangleHeight * 0.65, "NO VALID DATA", "middle", true);
      text(16, height - 19, detail(), "start");
      const omitted = props.points.length - samples.length;
      if (omitted > 0) text(width - 14, 22, `${omitted} INVALID OMITTED`, "end", true);
    }
    function drawGlyph() {
      if (!grid) return;
      const g = grid;
      const colors = palette.colors;
      g.clear();
      const center = Math.floor(g.cols / 2);
      const span = Math.max(2, Math.min(g.cols - 12, Math.floor(Math.max(2, g.rows - 10) * 2 / (Math.sqrt(3) * g.aspect))));
      const triangleRows = Math.max(1, Math.floor(span * g.aspect * Math.sqrt(3) / 2));
      const start = Math.max(4, Math.floor((g.rows - triangleRows) / 2) - 1);
      const top = { x: center, y: start };
      const left = { x: center - Math.floor(span / 2), y: start + triangleRows };
      const right = { x: center + Math.floor(span / 2), y: start + triangleRows };
      function segment(a, b, glyph, color) {
        const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
        for (let i = 0; i <= steps; i++) g.set(Math.round(a.x + (b.x - a.x) * i / steps), Math.round(a.y + (b.y - a.y) * i / steps), glyph, color);
      }
      function writeCentered(x, y, label, color) {
        const text = label.slice(0, g.cols);
        g.write(Math.max(0, Math.min(g.cols - text.length, Math.round(x - text.length / 2))), Math.round(y), text, color);
      }
      g.write(2, 1, "COMPOSITION / 100%", colors.muted);
      for (let step = 1; step < 5; step++) {
        const t = step / 5;
        for (const pair of [
          [[t, 1 - t, 0], [t, 0, 1 - t]],
          [[1 - t, t, 0], [0, t, 1 - t]],
          [[1 - t, 0, t], [0, 1 - t, t]]
        ]) segment(ternaryPosition(pair[0], top, left, right), ternaryPosition(pair[1], top, left, right), "·", colors.muted);
        const tick = ternaryPosition([t, 1 - t, 0], top, left, right);
        g.write(Math.max(0, Math.round(tick.x) - 3), Math.round(tick.y), String(step * 20), colors.muted);
      }
      segment(top, left, "╱", colors.fg);
      segment(left, right, "─", colors.fg);
      segment(right, top, "╲", colors.fg);
      writeCentered(top.x, top.y - 2, `${props.labels[0]} 100%`, colors.fg);
      g.write(Math.max(0, left.x), left.y + 2, `${props.labels[1]} 100%`, colors.fg);
      const rightLabel = `${props.labels[2]} 100%`;
      g.write(Math.max(0, right.x - rightLabel.length + 1), right.y + 2, rightLabel, colors.fg);
      positions = samples.map((point) => {
        const p = ternaryPosition(point.fractions, top, left, right);
        const col = Math.round(p.x), row = Math.round(p.y);
        const active = point.id === selected();
        g.set(col, row, active ? "◆" : "○", active ? colors.accent : colors.fg);
        const label = (point.label || point.id).slice(0, Math.max(1, g.cols - 4));
        const labelCol = col + label.length + 2 < g.cols ? col + 2 : Math.max(0, col - label.length - 1);
        g.write(labelCol, row, label, colors.fg);
        return { id: point.id, x: (col + 0.5) * g.cellWidth, y: (row + 0.5) * g.cellHeight };
      });
      if (!samples.length) writeCentered(center, start + Math.round(triangleRows * 0.65), "NO VALID DATA", colors.muted);
      g.write(2, g.rows - 2, detail().slice(0, Math.max(0, g.cols - 4)), colors.fg);
      g.flush();
    }
    function draw() {
      if (!alive) return;
      if (grid) drawGlyph();
      else drawSvg();
      status.textContent = detail();
      attrs.set("data-pica-ready", "true");
    }
    function mountView() {
      if (props.look === "glyph") grid = createGrid(frame, { fontFamily: GRID_FONT, fontSize: 12, columns: 0, lineHeight: 1.2, renderer: "canvas", color: "" }, draw);
      draw();
    }
    function select(id) {
      if (id === selected()) return;
      if (props.value === null) {
        internalValue = id;
        draw();
      }
      emit("valueChange", id);
    }
    const onKey = (event) => {
      if (event.target !== host || !samples.length) return;
      const index = samples.findIndex((p) => p.id === selected());
      let next;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = (index + 1) % samples.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = (index < 0 ? samples.length : index + samples.length - 1) % samples.length;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = samples.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      const sample = samples[next];
      if (sample) select(sample.id);
    };
    const onClick = (event) => {
      if (event.target !== frame && !(event.target instanceof Node && frame.contains(event.target))) return;
      host.focus({ preventScroll: true });
      const rect = frame.getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      let nearest;
      let distance = 28;
      for (const p of positions) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < distance) {
          nearest = p;
          distance = d;
        }
      }
      if (nearest) select(nearest.id);
    };
    host.addEventListener("keydown", onKey);
    frame.addEventListener("click", onClick);
    const resize = new ResizeObserver(() => {
      if (alive && !grid) draw();
    });
    resize.observe(frame);
    accessibility();
    updateTable();
    mountView();
    return {
      update(next) {
        if (!alive) return;
        const before = props;
        props = { ...props, ...next };
        const dataChanged = !sameJson(before.points, props.points);
        if (dataChanged) samples = ternarySamples(props.points);
        if (dataChanged || before.label !== props.label || !sameJson(before.labels, props.labels)) updateTable();
        accessibility();
        palette.refresh();
        if (before.look !== props.look) {
          grid?.destroy();
          grid = null;
          graphic?.remove();
          graphic = null;
          mountView();
        } else draw();
      },
      destroy() {
        if (!alive) return;
        alive = false;
        resize.disconnect();
        host.removeEventListener("keydown", onKey);
        frame.removeEventListener("click", onClick);
        grid?.destroy();
        palette.destroy();
        frame.remove();
        table?.remove();
        help.remove();
        status.remove();
        attrs.restore();
        restoreStyle();
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
  var initial = Object.assign({}, {}, window.PICA_PROPS || {});
  var instance = PicaTernaryPlot.mount(host, take(initial));
  ["valueChange"].forEach(function (name) {
    host.addEventListener("pica:" + name.toLowerCase(), function (event) {
      if (window.parent !== window) window.parent.postMessage({ type: "pica:event", name: name, detail: event.detail }, "*");
    });
  });
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
