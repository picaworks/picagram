# Fan Chart

> A central series and supplied uncertainty bounds form nested forecast envelopes in SVG or measured glyph density, with an accessible numeric table.

Category: data. Tags: forecast, uncertainty, intervals, time-series, glyph-grid, svg, data-table. Static. Size: 7.4 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/fan-chart.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `series` | (number \| null)[] | `[74,76,73,78,80,83,85,88,91,94,97,100]` | Central values in time order; null leaves a gap rather than implying zero. |
| `intervals` | FanChartInterval[] | `[{"label":"50%","lower":[null,null,null,null,80,81,82,84,86,88,90,92],"upper":[null,null,null,null,80,85,88,92,96,100,104,108]},{"label":"80%","lower":[null,null,null,null,80,79,79,79,80,81,82,83],"upper":[null,null,null,null,80,87,91,97,102,107,112,117]},{"label":"95%","lower":[null,null,null,null,80,77,75,74,73,72,71,70],"upper":[null,null,null,null,80,89,95,102,109,116,123,130]}]` | Supplied uncertainty envelopes; reversed or nonfinite bound pairs are omitted. |
| `labels` | string[] | `["Q1 '25","Q2 '25","Q3 '25","Q4 '25","Q1 '26","Q2 '26","Q3 '26","Q4 '26","Q1 '27","Q2 '27","Q3 '27","Q4 '27"]` | Time labels aligned with the central series and bounds. |
| `label` | string | `"Quarterly central forecast with supplied 50%, 80%, and 95% uncertainty bounds"` | Accessible chart name and numeric table caption; empty hides the chart. |
| `look` | "glyph" \| "svg" | `"glyph"` | Glyph uses measured ink density; SVG draws exact piecewise-linear envelopes. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Fan Chart · fan-chart
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

// lib/chart-marks.ts
/** The marks every chart repeats: grid lines with their tick labels, a label on its own, and a point on a
 *  circle. They live apart from lib/chart.ts so a chart that draws none of them carries none of them, and
 *  together they keep eight charts drawing one axis rather than eight. Colors come from lib/palette.ts. */




/** The side of the plot a set of grid lines is labelled on. A left or right side runs its lines across the
 *  plot, a top or bottom side runs them down it. */
type MarkSide = "left" | "right" | "top" | "bottom";

interface MarkLabelOptions {
  /** Which end of the text sits at x. */
  anchor?: "start" | "middle" | "end";
  /** Whether the text is centred on y, rather than sitting on it. */
  middle?: boolean;
  /** Glyph size in the SVG's own units. */
  size?: number;
  /** Palette token for the fill. A label is secondary, so muted by default. */
  token?: Token;
  /** CSS font-family stack. Must be monospace. */
  font?: string;
}

/** A label in mono with tabular figures, so digits keep their columns as a value changes. Muted unless a
 *  token says otherwise. */
function svgLabel(text: string, x: number, y: number, options: MarkLabelOptions = {}): SVGTextElement {
  const { anchor = "start", middle = false, size = 10, token = "muted", font = GRID_FONT } = options;
  const node = svg("text", { x, y, "text-anchor": anchor, fill: cssVar(token), "font-family": font, "font-size": size });
  if (middle) node.setAttribute("dominant-baseline", "middle");
  node.style.fontVariantNumeric = "tabular-nums";
  node.textContent = text;
  return node;
}

interface GridLineOptions {
  /** Which side carries the labels, and so which way the lines run. */
  side: MarkSide;
  /** The plot rectangle, in the SVG's own units. */
  plot: { x: number; y: number; width: number; height: number };
  /** Where a value sits along the axis, usually a scale from lib/chart.ts. */
  at: (value: number) => number;
  /** The label for a value. Leave it out, or return an empty string, for a line with no label. */
  label?: (value: number) => string;
  /** Label size in the SVG's own units. */
  size?: number;
  /** Distance from the plot's edge to its labels. */
  gap?: number;
  /** Draw the hairline across the plot. Off leaves the labels alone. */
  rule?: boolean;
}

/** Hairlines in muted at the given values, each labelled on one side of the plot. Returns a single group, so
 *  a redraw replaces the whole set with one call. */
function gridLines(values: readonly number[], options: GridLineOptions): SVGGElement {
  const { side, plot, at, label, size = 10, gap = size * 0.6, rule = true } = options;
  const across = side === "left" || side === "right";
  const group = svg("g");
  for (const value of values) {
    const p = at(value);
    if (rule) {
      const ends = across
        ? { x1: plot.x, y1: p, x2: plot.x + plot.width, y2: p }
        : { x1: p, y1: plot.y, x2: p, y2: plot.y + plot.height };
      group.appendChild(svg("line", { ...ends, stroke: cssVar("muted"), "stroke-width": 1 }));
    }
    const text = label?.(value) ?? "";
    if (!text) continue;
    // A left or right label is centred on its line. A top or bottom one sits on its own baseline, clear of
    // the plot: above the line for a top side, a full glyph below the edge for a bottom one.
    const x = side === "left" ? plot.x - gap : side === "right" ? plot.x + plot.width + gap : p;
    const y = across ? p : side === "top" ? plot.y - gap : plot.y + plot.height + gap + size;
    const anchor = side === "left" ? "end" : side === "right" ? "start" : "middle";
    group.appendChild(svgLabel(text, x, y, { anchor, middle: across, size }));
  }
  return group;
}

/** The point at radius `r` and `angle` in radians from (cx, cy), measured clockwise from twelve o'clock,
 *  which is the convention arcPath in lib/chart.ts draws its rings on. */
function polarPoint(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];
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

// registry/data/fan-chart/core.ts
export interface FanChartInterval {
  /** Display name for this uncertainty interval, such as 80%. */
  label: string;
  /** Lower bounds aligned with series indices; null leaves a gap. */
  lower: (number | null)[];
  /** Upper bounds aligned with series indices; null leaves a gap. */
  upper: (number | null)[];
}

export interface FanChartProps {
  /** Central values in time order; null leaves a gap rather than implying zero. */
  series: (number | null)[];
  /** Supplied uncertainty envelopes; reversed or nonfinite bound pairs are omitted. */
  intervals: FanChartInterval[];
  /** Time labels aligned with the central series and bounds. */
  labels: string[];
  /** Accessible chart name and numeric table caption; empty hides the chart. */
  label: string;
  /** Glyph uses measured ink density; SVG draws exact piecewise-linear envelopes. */
  look: "glyph" | "svg";
}

export const defaults: FanChartProps = {
  series: [74, 76, 73, 78, 80, 83, 85, 88, 91, 94, 97, 100],
  intervals: [
    { label: "50%", lower: [null, null, null, null, 80, 81, 82, 84, 86, 88, 90, 92], upper: [null, null, null, null, 80, 85, 88, 92, 96, 100, 104, 108] },
    { label: "80%", lower: [null, null, null, null, 80, 79, 79, 79, 80, 81, 82, 83], upper: [null, null, null, null, 80, 87, 91, 97, 102, 107, 112, 117] },
    { label: "95%", lower: [null, null, null, null, 80, 77, 75, 74, 73, 72, 71, 70], upper: [null, null, null, null, 80, 89, 95, 102, 109, 116, 123, 130] },
  ],
  labels: ["Q1 '25", "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26", "Q2 '26", "Q3 '26", "Q4 '26", "Q1 '27", "Q2 '27", "Q3 '27", "Q4 '27"],
  label: "Quarterly central forecast with supplied 50%, 80%, and 95% uncertainty bounds",
  look: "glyph",
};

type FanChartBand = { label: string; lower: (number | null)[]; upper: (number | null)[]; width: number };
type FanChartData = { central: (number | null)[]; bands: FanChartBand[]; count: number; ticks: number[]; domain: [number, number]; valid: boolean };

function fanChartFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function fanChartPrepare(props: FanChartProps): FanChartData {
  const source = Array.isArray(props.series) ? props.series : [];
  const intervals = (Array.isArray(props.intervals) ? props.intervals : []).filter((band) => band && Array.isArray(band.lower) && Array.isArray(band.upper)).slice(0, 12);
  const count = Math.min(512, Math.max(source.length, ...intervals.map((band) => Math.max(band.lower.length, band.upper.length)), 0));
  const central = Array.from({ length: count }, (_, index) => fanChartFinite(source[index]));
  const bands = intervals.map((band, ordinal) => {
    const lower: (number | null)[] = [];
    const upper: (number | null)[] = [];
    let width = 0;
    let validCount = 0;
    for (let index = 0; index < count; index++) {
      const lo = fanChartFinite(band.lower[index]);
      const hi = fanChartFinite(band.upper[index]);
      const valid = lo !== null && hi !== null && lo <= hi;
      lower.push(valid ? lo : null);
      upper.push(valid ? hi : null);
      if (valid) { width += hi - lo; validCount++; }
    }
    return { label: typeof band.label === "string" && band.label ? band.label : `Interval ${ordinal + 1}`, lower, upper, width: width / Math.max(1, validCount) };
  });
  const values = [...central, ...bands.flatMap((band) => [...band.lower, ...band.upper])].filter((value): value is number => value !== null);
  const [min, max] = extent(values);
  const ticks = niceTicks(min, max, 5);
  return { central, bands, count, ticks, domain: [ticks[0] ?? 0, ticks[ticks.length - 1] ?? 1], valid: values.length > 0 };
}

function fanChartSample(values: readonly (number | null)[], index: number): number | null {
  const low = Math.floor(index);
  const high = Math.min(values.length - 1, Math.ceil(index));
  const a = values[low], b = values[high];
  if (a === null || b === null || a === undefined || b === undefined) return null;
  return a + (b - a) * (index - low);
}

function fanChartRuns(count: number, valid: (index: number) => boolean): number[][] {
  const runs: number[][] = [];
  let run: number[] = [];
  for (let index = 0; index < count; index++) {
    if (valid(index)) run.push(index);
    else if (run.length) { runs.push(run); run = []; }
  }
  if (run.length) runs.push(run);
  return runs;
}

function fanChartIndices(count: number, capacity: number): number[] {
  const ticks = Math.min(count, Math.max(1, Math.floor(capacity)));
  if (ticks <= 1) return count ? [0] : [];
  return Array.from({ length: ticks }, (_, index) => Math.round(index * (count - 1) / (ticks - 1)));
}

export const mount: Mount<FanChartProps> = (host, initial = {}) => {
  let props: FanChartProps = { ...defaults, ...initial };
  let data = fanChartPrepare(props);
  let alive = true;
  let grid: Grid | null = null;
  let graphic: SVGSVGElement | null = null;
  let table: HTMLTableElement | null = null;
  const attrs = hostAttributes(host);
  const restore = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
  const frame = document.createElement("div");
  frame.setAttribute("data-pica", "");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${cssVar("bg")}`;
  host.append(frame);
  const palette = watchPalette(host, () => draw());

  function accessibility(): void {
    const label = props.label.trim();
    attrs.set("role", label ? "group" : null);
    attrs.set("aria-label", label || null);
    attrs.set("aria-hidden", label ? null : "true");
  }

  function timeLabel(index: number): string {
    return typeof props.labels[index] === "string" ? props.labels[index] : String(index + 1);
  }

  function updateTable(): void {
    table?.remove();
    const head = ["Period", "Central", ...data.bands.flatMap((band) => [`${band.label} lower`, `${band.label} upper`])];
    const rows = Array.from({ length: data.count }, (_, index) => [timeLabel(index), data.central[index] ?? "Missing", ...data.bands.flatMap((band) => [band.lower[index] ?? "Missing", band.upper[index] ?? "Missing"])]);
    table = dataTable(props.label || "Fan chart", head, rows);
    for (const node of table.querySelectorAll("*")) node.setAttribute("data-pica", "");
    host.append(table);
  }

  function sortedBands(): FanChartBand[] {
    return [...data.bands].sort((a, b) => b.width - a.width);
  }

  function drawSvg(): void {
    graphic?.remove();
    const width = Math.max(1, frame.clientWidth);
    const height = Math.max(1, frame.clientHeight);
    const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}` });
    root.style.cssText = "display:block;width:100%;height:100%";
    graphic = root;
    frame.append(root);
    const longestTick = Math.max(...data.ticks.map((tick) => formatNumber(tick, { locale: "en-US" }).length), 1);
    const left = Math.min(width * 0.3, Math.max(36, longestTick * 7 + 10));
    const plot = { x: left, y: 42, width: Math.max(1, width - left - 18), height: Math.max(1, height - 82) };
    const x = linearScale([0, Math.max(1, data.count - 1)], [plot.x, plot.x + plot.width]);
    const y = linearScale(data.domain, [plot.y + plot.height, plot.y]);
    const atX = (index: number): number => data.count === 1 ? plot.x + plot.width / 2 : x(index);
    const guides = gridLines(data.ticks, { side: "left", plot, at: y, label: (value) => formatNumber(value, { locale: "en-US" }), size: 11 });
    for (const line of guides.querySelectorAll("line")) line.setAttribute("stroke-opacity", "0.22");
    root.append(guides);
    root.append(svg("line", { x1: plot.x, y1: plot.y + plot.height, x2: plot.x + plot.width, y2: plot.y + plot.height, stroke: cssVar("muted"), "stroke-width": 1 }));
    const bands = sortedBands();
    bands.forEach((band, level) => {
      const opacity = 0.12 + (level / Math.max(1, bands.length - 1)) * 0.16;
      for (const run of fanChartRuns(data.count, (index) => band.lower[index] !== null && band.upper[index] !== null)) {
        const upper = run.map((index): [number, number] => [atX(index), y(band.upper[index] as number)]);
        const lower = [...run].reverse().map((index): [number, number] => [atX(index), y(band.lower[index] as number)]);
        if (run.length === 1) {
          const index = run[0] as number;
          root.append(svg("line", { x1: atX(index), x2: atX(index), y1: y(band.lower[index] as number), y2: y(band.upper[index] as number), stroke: cssVar("fg"), "stroke-opacity": opacity + 0.2, "stroke-width": 3 }));
        } else {
          const path = linePath([...upper, ...lower]) + "Z";
          root.append(svg("path", { d: path, fill: cssVar("fg"), "fill-opacity": opacity, stroke: cssVar("fg"), "stroke-opacity": 0.24, "stroke-width": 0.7 }));
        }
      }
    });
    for (const run of fanChartRuns(data.count, (index) => data.central[index] !== null)) {
      const points = run.map((index): [number, number] => [atX(index), y(data.central[index] as number)]);
      root.append(svg("path", { d: linePath(points), fill: "none", stroke: cssVar("accent"), "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      for (const [cx, cy] of points) root.append(svg("circle", { cx, cy, r: 2.2, fill: cssVar("accent") }));
    }
    const capacity = Math.max(2, Math.floor(plot.width / 88));
    for (const index of fanChartIndices(data.count, capacity)) {
      const label = svgLabel(timeLabel(index).slice(0, 14), atX(index), plot.y + plot.height + 23, { size: 11, anchor: index === 0 ? "start" : index === data.count - 1 ? "end" : "middle" });
      const title = svg("title");
      title.textContent = timeLabel(index);
      label.append(title);
      root.append(label);
    }
    root.append(svg("line", { x1: plot.x, x2: plot.x + 14, y1: 19, y2: 19, stroke: cssVar("accent"), "stroke-width": 2 }));
    root.append(svgLabel("Central", plot.x + 20, 23, { token: "fg", size: 11 }));
    let legendX = plot.x + 88;
    for (const band of data.bands) {
      const name = band.label.slice(0, 18);
      if (legendX + name.length * 7 > width - 12) break;
      root.append(svg("rect", { x: legendX, y: 13, width: 8, height: 8, fill: cssVar("fg"), "fill-opacity": 0.3 }));
      root.append(svgLabel(name, legendX + 14, 23, { token: "fg", size: 11 }));
      legendX += name.length * 7 + 32;
    }
    if (!data.valid) root.append(svgLabel("NO VALID DATA", plot.x + plot.width / 2, plot.y + plot.height / 2, { anchor: "middle", size: 12 }));
    for (const node of root.querySelectorAll("*")) node.setAttribute("data-pica", "");
  }

  function drawGlyph(): void {
    if (!grid) return;
    const g = grid;
    const colors = palette.colors;
    const ramp = measureRamp(" .:-=+*#%@", GRID_FONT, 1.25);
    g.clear();
    const tickStrings = data.ticks.map((value) => formatNumber(value, { locale: "en-US" }));
    const left = Math.max(2, Math.min(Math.floor(g.cols / 3), Math.max(...tickStrings.map((text) => text.length), 1) + 2));
    const right = Math.max(left + 1, g.cols - 3);
    const top = 4;
    const bottom = Math.max(top + 1, g.rows - 4);
    const x = linearScale([0, Math.max(1, data.count - 1)], [left, right]);
    const y = linearScale(data.domain, [bottom, top]);
    const atX = (index: number): number => data.count === 1 ? (left + right) / 2 : x(index);
    for (let index = 0; index < data.ticks.length; index++) {
      const value = data.ticks[index] as number;
      const row = Math.round(y(value));
      const label = tickStrings[index] ?? "";
      g.write(Math.max(0, left - label.length - 1), row, label, colors.muted);
      for (let col = left; col <= right; col++) if ((col - left) % 3 === 0) g.set(col, row, "·", colors.muted);
    }
    const bands = sortedBands();
    for (let col = left; col <= right; col++) {
      if (data.count < 2) continue;
      const position = (col - left) / Math.max(1, right - left) * (data.count - 1);
      bands.forEach((band, level) => {
        const lo = fanChartSample(band.lower, position);
        const hi = fanChartSample(band.upper, position);
        if (lo === null || hi === null) return;
        const shade = pick(ramp, 0.28 + 0.42 * (level + 1) / Math.max(1, bands.length));
        const firstRow = Math.max(top, Math.ceil(y(hi)));
        const lastRow = Math.min(bottom, Math.floor(y(lo)));
        for (let row = firstRow; row <= lastRow; row++) g.set(col, row, shade, colors.fg);
      });
    }
    if (data.count === 1) {
      for (const band of bands) {
        const lo = band.lower[0], hi = band.upper[0];
        if (lo === null || hi === null || lo === undefined || hi === undefined) continue;
        for (let row = Math.ceil(y(hi)); row <= Math.floor(y(lo)); row++) g.set(Math.round(atX(0)), row, pick(ramp, 0.5), colors.fg);
      }
    }
    function segment(a: [number, number], b: [number, number]): void {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
      for (let step = 0; step <= steps; step++) g.set(Math.round(a[0] + (b[0] - a[0]) * step / steps), Math.round(a[1] + (b[1] - a[1]) * step / steps), "•", colors.accent);
    }
    for (const run of fanChartRuns(data.count, (index) => data.central[index] !== null)) {
      run.forEach((index, ordinal) => {
        const point: [number, number] = [atX(index), y(data.central[index] as number)];
        const prior = run[ordinal - 1];
        if (prior === undefined) segment(point, point);
        else segment([atX(prior), y(data.central[prior] as number)], point);
      });
    }
    g.set(left, 1, "━", colors.accent);
    g.write(left + 2, 1, "Central", colors.fg);
    g.write(left + 11, 1, data.bands.map((band) => band.label).join(" / ").slice(0, Math.max(0, g.cols - left - 12)), colors.fg);
    for (const index of fanChartIndices(data.count, Math.max(2, Math.floor((right - left) / 11)))) {
      const label = timeLabel(index).slice(0, 10);
      const col = Math.max(left, Math.min(right - label.length + 1, Math.round(atX(index) - label.length / 2)));
      g.write(col, bottom + 2, label, colors.muted);
    }
    if (!data.valid) g.write(Math.max(left, Math.floor((left + right - 13) / 2)), Math.round((top + bottom) / 2), "NO VALID DATA", colors.muted);
    g.flush();
  }

  function draw(): void {
    if (!alive) return;
    if (grid) drawGlyph(); else drawSvg();
    attrs.set("data-pica-ready", "true");
  }

  function mountView(): void {
    if (props.look === "glyph") grid = createGrid(frame, { fontFamily: GRID_FONT, fontSize: 12, columns: 0, lineHeight: 1.25, renderer: "canvas", color: "" }, draw);
    draw();
  }

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
      const dataChanged = changed(before, props, ["series", "intervals"]);
      if (dataChanged) data = fanChartPrepare(props);
      if (dataChanged || changed(before, props, ["labels", "label"])) updateTable();
      if (before.label !== props.label) accessibility();
      palette.refresh();
      if (before.look !== props.look) {
        grid?.destroy(); grid = null;
        graphic?.remove(); graphic = null;
        mountView();
      } else if (dataChanged || changed(before, props, ["labels", "label"]) || grid) draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      resize.disconnect();
      grid?.destroy();
      palette.destroy();
      frame.remove();
      table?.remove();
      attrs.restore();
      restore();
    },
  };
};

// registry/data/fan-chart/index.tsx
export type FanChartComponentProps = Partial<FanChartProps> & WrapperProps;

/** A central series and supplied uncertainty envelopes rendered as an accessible forecast fan. */
export function FanChart({ className, style, palette, ...props }: FanChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Fan Chart · fan-chart
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Fan Chart · Pica</title>
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
var PicaFanChart = (() => {
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

  // registry/data/fan-chart/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/chart.ts
  function linearScale(domain, range) {
    const [d0, d1] = domain;
    const [r0, r1] = range;
    const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
    return Object.assign((value) => r0 + (value - d0) * k, { domain, range });
  }
  function extent(values) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const value of values) {
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return min <= max ? [min, max] : [0, 0];
  }
  function niceNumber(x, round) {
    const exponent = Math.floor(Math.log10(x));
    const fraction = x / 10 ** exponent;
    const nice = round ? fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10 : fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return nice * 10 ** exponent;
  }
  function niceTicks(min, max, count = 5) {
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
    const ticks = [];
    for (let i = 0; start + i * step <= end + step / 2; i++) {
      ticks.push(Number((start + i * step).toFixed(decimals)) || 0);
    }
    return ticks;
  }
  var numberFormats = /* @__PURE__ */ new Map();
  function formatNumber(value, options = {}) {
    const { compact = true, decimals = 1, locale } = options;
    const short = compact && Math.abs(value) >= 1e4;
    const key = `${locale ?? ""}|${short ? "c" : "n"}|${decimals}`;
    let format = numberFormats.get(key);
    if (!format) {
      format = new Intl.NumberFormat(locale, short ? { notation: "compact", maximumFractionDigits: decimals } : { maximumFractionDigits: decimals });
      numberFormats.set(key, format);
    }
    return format.format(value);
  }
  var coord = (value) => String(Math.round(value * 100) / 100);
  function linePath(points) {
    return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${coord(x)} ${coord(y)}`).join("");
  }
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

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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

  // lib/chart-marks.ts
  function svgLabel(text, x, y, options = {}) {
    const { anchor = "start", middle = false, size = 10, token = "muted", font = GRID_FONT } = options;
    const node = svg("text", { x, y, "text-anchor": anchor, fill: cssVar(token), "font-family": font, "font-size": size });
    if (middle) node.setAttribute("dominant-baseline", "middle");
    node.style.fontVariantNumeric = "tabular-nums";
    node.textContent = text;
    return node;
  }
  function gridLines(values, options) {
    const { side, plot, at, label, size = 10, gap = size * 0.6, rule = true } = options;
    const across = side === "left" || side === "right";
    const group = svg("g");
    for (const value of values) {
      const p = at(value);
      if (rule) {
        const ends = across ? { x1: plot.x, y1: p, x2: plot.x + plot.width, y2: p } : { x1: p, y1: plot.y, x2: p, y2: plot.y + plot.height };
        group.appendChild(svg("line", { ...ends, stroke: cssVar("muted"), "stroke-width": 1 }));
      }
      const text = label?.(value) ?? "";
      if (!text) continue;
      const x = side === "left" ? plot.x - gap : side === "right" ? plot.x + plot.width + gap : p;
      const y = across ? p : side === "top" ? plot.y - gap : plot.y + plot.height + gap + size;
      const anchor = side === "left" ? "end" : side === "right" ? "start" : "middle";
      group.appendChild(svgLabel(text, x, y, { anchor, middle: across, size }));
    }
    return group;
  }

  // lib/host.ts
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
  function changed(before, after, keys) {
    return keys.some((key) => !sameJson(before[key], after[key]));
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

  // registry/data/fan-chart/core.ts
  var defaults = {
    series: [74, 76, 73, 78, 80, 83, 85, 88, 91, 94, 97, 100],
    intervals: [
      { label: "50%", lower: [null, null, null, null, 80, 81, 82, 84, 86, 88, 90, 92], upper: [null, null, null, null, 80, 85, 88, 92, 96, 100, 104, 108] },
      { label: "80%", lower: [null, null, null, null, 80, 79, 79, 79, 80, 81, 82, 83], upper: [null, null, null, null, 80, 87, 91, 97, 102, 107, 112, 117] },
      { label: "95%", lower: [null, null, null, null, 80, 77, 75, 74, 73, 72, 71, 70], upper: [null, null, null, null, 80, 89, 95, 102, 109, 116, 123, 130] }
    ],
    labels: ["Q1 '25", "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26", "Q2 '26", "Q3 '26", "Q4 '26", "Q1 '27", "Q2 '27", "Q3 '27", "Q4 '27"],
    label: "Quarterly central forecast with supplied 50%, 80%, and 95% uncertainty bounds",
    look: "glyph"
  };
  function fanChartFinite(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  function fanChartPrepare(props) {
    const source = Array.isArray(props.series) ? props.series : [];
    const intervals = (Array.isArray(props.intervals) ? props.intervals : []).filter((band) => band && Array.isArray(band.lower) && Array.isArray(band.upper)).slice(0, 12);
    const count = Math.min(512, Math.max(source.length, ...intervals.map((band) => Math.max(band.lower.length, band.upper.length)), 0));
    const central = Array.from({ length: count }, (_, index) => fanChartFinite(source[index]));
    const bands = intervals.map((band, ordinal) => {
      const lower = [];
      const upper = [];
      let width = 0;
      let validCount = 0;
      for (let index = 0; index < count; index++) {
        const lo = fanChartFinite(band.lower[index]);
        const hi = fanChartFinite(band.upper[index]);
        const valid = lo !== null && hi !== null && lo <= hi;
        lower.push(valid ? lo : null);
        upper.push(valid ? hi : null);
        if (valid) {
          width += hi - lo;
          validCount++;
        }
      }
      return { label: typeof band.label === "string" && band.label ? band.label : `Interval ${ordinal + 1}`, lower, upper, width: width / Math.max(1, validCount) };
    });
    const values = [...central, ...bands.flatMap((band) => [...band.lower, ...band.upper])].filter((value) => value !== null);
    const [min, max] = extent(values);
    const ticks = niceTicks(min, max, 5);
    return { central, bands, count, ticks, domain: [ticks[0] ?? 0, ticks[ticks.length - 1] ?? 1], valid: values.length > 0 };
  }
  function fanChartSample(values, index) {
    const low = Math.floor(index);
    const high = Math.min(values.length - 1, Math.ceil(index));
    const a = values[low], b = values[high];
    if (a === null || b === null || a === void 0 || b === void 0) return null;
    return a + (b - a) * (index - low);
  }
  function fanChartRuns(count, valid) {
    const runs = [];
    let run = [];
    for (let index = 0; index < count; index++) {
      if (valid(index)) run.push(index);
      else if (run.length) {
        runs.push(run);
        run = [];
      }
    }
    if (run.length) runs.push(run);
    return runs;
  }
  function fanChartIndices(count, capacity) {
    const ticks = Math.min(count, Math.max(1, Math.floor(capacity)));
    if (ticks <= 1) return count ? [0] : [];
    return Array.from({ length: ticks }, (_, index) => Math.round(index * (count - 1) / (ticks - 1)));
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let data = fanChartPrepare(props);
    let alive = true;
    let grid = null;
    let graphic = null;
    let table = null;
    const attrs = hostAttributes(host);
    const restore = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
    const frame = document.createElement("div");
    frame.setAttribute("data-pica", "");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${cssVar("bg")}`;
    host.append(frame);
    const palette = watchPalette(host, () => draw());
    function accessibility() {
      const label = props.label.trim();
      attrs.set("role", label ? "group" : null);
      attrs.set("aria-label", label || null);
      attrs.set("aria-hidden", label ? null : "true");
    }
    function timeLabel(index) {
      return typeof props.labels[index] === "string" ? props.labels[index] : String(index + 1);
    }
    function updateTable() {
      table?.remove();
      const head = ["Period", "Central", ...data.bands.flatMap((band) => [`${band.label} lower`, `${band.label} upper`])];
      const rows = Array.from({ length: data.count }, (_, index) => [timeLabel(index), data.central[index] ?? "Missing", ...data.bands.flatMap((band) => [band.lower[index] ?? "Missing", band.upper[index] ?? "Missing"])]);
      table = dataTable(props.label || "Fan chart", head, rows);
      for (const node of table.querySelectorAll("*")) node.setAttribute("data-pica", "");
      host.append(table);
    }
    function sortedBands() {
      return [...data.bands].sort((a, b) => b.width - a.width);
    }
    function drawSvg() {
      graphic?.remove();
      const width = Math.max(1, frame.clientWidth);
      const height = Math.max(1, frame.clientHeight);
      const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}` });
      root.style.cssText = "display:block;width:100%;height:100%";
      graphic = root;
      frame.append(root);
      const longestTick = Math.max(...data.ticks.map((tick) => formatNumber(tick, { locale: "en-US" }).length), 1);
      const left = Math.min(width * 0.3, Math.max(36, longestTick * 7 + 10));
      const plot = { x: left, y: 42, width: Math.max(1, width - left - 18), height: Math.max(1, height - 82) };
      const x = linearScale([0, Math.max(1, data.count - 1)], [plot.x, plot.x + plot.width]);
      const y = linearScale(data.domain, [plot.y + plot.height, plot.y]);
      const atX = (index) => data.count === 1 ? plot.x + plot.width / 2 : x(index);
      const guides = gridLines(data.ticks, { side: "left", plot, at: y, label: (value) => formatNumber(value, { locale: "en-US" }), size: 11 });
      for (const line of guides.querySelectorAll("line")) line.setAttribute("stroke-opacity", "0.22");
      root.append(guides);
      root.append(svg("line", { x1: plot.x, y1: plot.y + plot.height, x2: plot.x + plot.width, y2: plot.y + plot.height, stroke: cssVar("muted"), "stroke-width": 1 }));
      const bands = sortedBands();
      bands.forEach((band, level) => {
        const opacity = 0.12 + level / Math.max(1, bands.length - 1) * 0.16;
        for (const run of fanChartRuns(data.count, (index) => band.lower[index] !== null && band.upper[index] !== null)) {
          const upper = run.map((index) => [atX(index), y(band.upper[index])]);
          const lower = [...run].reverse().map((index) => [atX(index), y(band.lower[index])]);
          if (run.length === 1) {
            const index = run[0];
            root.append(svg("line", { x1: atX(index), x2: atX(index), y1: y(band.lower[index]), y2: y(band.upper[index]), stroke: cssVar("fg"), "stroke-opacity": opacity + 0.2, "stroke-width": 3 }));
          } else {
            const path = linePath([...upper, ...lower]) + "Z";
            root.append(svg("path", { d: path, fill: cssVar("fg"), "fill-opacity": opacity, stroke: cssVar("fg"), "stroke-opacity": 0.24, "stroke-width": 0.7 }));
          }
        }
      });
      for (const run of fanChartRuns(data.count, (index) => data.central[index] !== null)) {
        const points = run.map((index) => [atX(index), y(data.central[index])]);
        root.append(svg("path", { d: linePath(points), fill: "none", stroke: cssVar("accent"), "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
        for (const [cx, cy] of points) root.append(svg("circle", { cx, cy, r: 2.2, fill: cssVar("accent") }));
      }
      const capacity = Math.max(2, Math.floor(plot.width / 88));
      for (const index of fanChartIndices(data.count, capacity)) {
        const label = svgLabel(timeLabel(index).slice(0, 14), atX(index), plot.y + plot.height + 23, { size: 11, anchor: index === 0 ? "start" : index === data.count - 1 ? "end" : "middle" });
        const title = svg("title");
        title.textContent = timeLabel(index);
        label.append(title);
        root.append(label);
      }
      root.append(svg("line", { x1: plot.x, x2: plot.x + 14, y1: 19, y2: 19, stroke: cssVar("accent"), "stroke-width": 2 }));
      root.append(svgLabel("Central", plot.x + 20, 23, { token: "fg", size: 11 }));
      let legendX = plot.x + 88;
      for (const band of data.bands) {
        const name = band.label.slice(0, 18);
        if (legendX + name.length * 7 > width - 12) break;
        root.append(svg("rect", { x: legendX, y: 13, width: 8, height: 8, fill: cssVar("fg"), "fill-opacity": 0.3 }));
        root.append(svgLabel(name, legendX + 14, 23, { token: "fg", size: 11 }));
        legendX += name.length * 7 + 32;
      }
      if (!data.valid) root.append(svgLabel("NO VALID DATA", plot.x + plot.width / 2, plot.y + plot.height / 2, { anchor: "middle", size: 12 }));
      for (const node of root.querySelectorAll("*")) node.setAttribute("data-pica", "");
    }
    function drawGlyph() {
      if (!grid) return;
      const g = grid;
      const colors = palette.colors;
      const ramp = measureRamp(" .:-=+*#%@", GRID_FONT, 1.25);
      g.clear();
      const tickStrings = data.ticks.map((value) => formatNumber(value, { locale: "en-US" }));
      const left = Math.max(2, Math.min(Math.floor(g.cols / 3), Math.max(...tickStrings.map((text) => text.length), 1) + 2));
      const right = Math.max(left + 1, g.cols - 3);
      const top = 4;
      const bottom = Math.max(top + 1, g.rows - 4);
      const x = linearScale([0, Math.max(1, data.count - 1)], [left, right]);
      const y = linearScale(data.domain, [bottom, top]);
      const atX = (index) => data.count === 1 ? (left + right) / 2 : x(index);
      for (let index = 0; index < data.ticks.length; index++) {
        const value = data.ticks[index];
        const row = Math.round(y(value));
        const label = tickStrings[index] ?? "";
        g.write(Math.max(0, left - label.length - 1), row, label, colors.muted);
        for (let col = left; col <= right; col++) if ((col - left) % 3 === 0) g.set(col, row, "·", colors.muted);
      }
      const bands = sortedBands();
      for (let col = left; col <= right; col++) {
        if (data.count < 2) continue;
        const position = (col - left) / Math.max(1, right - left) * (data.count - 1);
        bands.forEach((band, level) => {
          const lo = fanChartSample(band.lower, position);
          const hi = fanChartSample(band.upper, position);
          if (lo === null || hi === null) return;
          const shade = pick(ramp, 0.28 + 0.42 * (level + 1) / Math.max(1, bands.length));
          const firstRow = Math.max(top, Math.ceil(y(hi)));
          const lastRow = Math.min(bottom, Math.floor(y(lo)));
          for (let row = firstRow; row <= lastRow; row++) g.set(col, row, shade, colors.fg);
        });
      }
      if (data.count === 1) {
        for (const band of bands) {
          const lo = band.lower[0], hi = band.upper[0];
          if (lo === null || hi === null || lo === void 0 || hi === void 0) continue;
          for (let row = Math.ceil(y(hi)); row <= Math.floor(y(lo)); row++) g.set(Math.round(atX(0)), row, pick(ramp, 0.5), colors.fg);
        }
      }
      function segment(a, b) {
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
        for (let step = 0; step <= steps; step++) g.set(Math.round(a[0] + (b[0] - a[0]) * step / steps), Math.round(a[1] + (b[1] - a[1]) * step / steps), "•", colors.accent);
      }
      for (const run of fanChartRuns(data.count, (index) => data.central[index] !== null)) {
        run.forEach((index, ordinal) => {
          const point = [atX(index), y(data.central[index])];
          const prior = run[ordinal - 1];
          if (prior === void 0) segment(point, point);
          else segment([atX(prior), y(data.central[prior])], point);
        });
      }
      g.set(left, 1, "━", colors.accent);
      g.write(left + 2, 1, "Central", colors.fg);
      g.write(left + 11, 1, data.bands.map((band) => band.label).join(" / ").slice(0, Math.max(0, g.cols - left - 12)), colors.fg);
      for (const index of fanChartIndices(data.count, Math.max(2, Math.floor((right - left) / 11)))) {
        const label = timeLabel(index).slice(0, 10);
        const col = Math.max(left, Math.min(right - label.length + 1, Math.round(atX(index) - label.length / 2)));
        g.write(col, bottom + 2, label, colors.muted);
      }
      if (!data.valid) g.write(Math.max(left, Math.floor((left + right - 13) / 2)), Math.round((top + bottom) / 2), "NO VALID DATA", colors.muted);
      g.flush();
    }
    function draw() {
      if (!alive) return;
      if (grid) drawGlyph();
      else drawSvg();
      attrs.set("data-pica-ready", "true");
    }
    function mountView() {
      if (props.look === "glyph") grid = createGrid(frame, { fontFamily: GRID_FONT, fontSize: 12, columns: 0, lineHeight: 1.25, renderer: "canvas", color: "" }, draw);
      draw();
    }
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
        const dataChanged = changed(before, props, ["series", "intervals"]);
        if (dataChanged) data = fanChartPrepare(props);
        if (dataChanged || changed(before, props, ["labels", "label"])) updateTable();
        if (before.label !== props.label) accessibility();
        palette.refresh();
        if (before.look !== props.look) {
          grid?.destroy();
          grid = null;
          graphic?.remove();
          graphic = null;
          mountView();
        } else if (dataChanged || changed(before, props, ["labels", "label"]) || grid) draw();
      },
      destroy() {
        if (!alive) return;
        alive = false;
        resize.disconnect();
        grid?.destroy();
        palette.destroy();
        frame.remove();
        table?.remove();
        attrs.restore();
        restore();
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
  var instance = PicaFanChart.mount(host, take(initial));
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
