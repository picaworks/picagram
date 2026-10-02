"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Box Plot · box-plot
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

// registry/data/box-plot/core.ts
export interface BoxPlotProps {
  /** Groups to compare, each with a label and the raw values of its sample. Empty draws the axes and a muted "no data" note. */
  data: { label: string; values: number[] }[];
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** Index of the group whose median is drawn in the accent and printed. -1 picks the group with the highest median. */
  highlight: number;
  /** Whiskers reach the most extreme values within this multiple of the interquartile range of the box. */
  whisker: number;
  /** About this many rounded ticks on the value axis. */
  ticks: number;
  /** "svg" draws hairline axes, boxes, and circles. "glyph" draws the same plot in a monospace grid. */
  look: "svg" | "glyph";
  /** CSS font-family stack for every label. Must be monospace. */
  fontFamily: string;
}

export const defaults: BoxPlotProps = {
  data: [
    { label: "Build", values: [41, 44, 46, 47, 48, 49, 50, 51, 52, 52, 53, 54, 55, 56, 58, 59, 61, 63, 64, 96] },
    { label: "Test", values: [19, 21, 22, 22, 23, 24, 24, 25, 25, 26, 26, 27, 28, 28, 29, 31, 32, 33] },
    { label: "Lint", values: [8, 9, 9, 10, 11, 11, 12, 12, 13, 13, 14, 15, 16, 17, 19] },
    {
      label: "Deploy",
      values: [58, 63, 68, 72, 77, 81, 85, 89, 93, 97, 101, 104, 107, 111, 115, 119, 123, 127, 131, 135, 139, 143, 146, 148],
    },
    { label: "Rollback", values: [11, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 25, 27, 29, 31, 78] },
  ],
  label: "Task duration by stage, in seconds",
  highlight: -1,
  whisker: 1.5,
  ticks: 5,
  look: "svg",
  fontFamily: GRID_FONT,
};

interface Stat {
  label: string;
  n: number;
  /** Whisker ends, the quartiles, and the median. */
  lo: number;
  q1: number;
  med: number;
  q3: number;
  hi: number;
  /** The smallest and largest value of all, outliers included. */
  min: number;
  max: number;
  out: number[];
}

/** The value at probability p of an ascending sample, by linear interpolation at position (n - 1) * p. */
function quantile(sorted: readonly number[], p: number): number {
  const at = (sorted.length - 1) * p;
  const i = Math.floor(at);
  const a = sorted[i] ?? 0;
  return a + ((sorted[i + 1] ?? a) - a) * (at - i);
}

function summarize(group: { label?: unknown; values?: unknown }, k: number): Stat {
  const raw: unknown[] = Array.isArray(group?.values) ? group.values : [];
  const sorted = raw.filter((v): v is number => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const reach = (q3 - q1) * k;
  const inside = sorted.filter((v) => v >= q1 - reach && v <= q3 + reach);
  return {
    label: String(group?.label ?? ""),
    n,
    lo: inside[0] ?? q1,
    q1,
    med: quantile(sorted, 0.5),
    q3,
    hi: inside[inside.length - 1] ?? q3,
    min: sorted[0] ?? 0,
    max: sorted[n - 1] ?? 0,
    out: sorted.filter((v) => v < q1 - reach || v > q3 + reach),
  };
}

const round2 = (v: number): number => Number(v.toFixed(2));
const crisp = (v: number): number => Math.round(v) + 0.5;

export const mount: Mount<BoxPlotProps> = (host, initial = {}) => {
  let props: BoxPlotProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;
  const palette = watchPalette(host, () => draw());

  function stats(): Stat[] {
    const groups: unknown[] = Array.isArray(props.data) ? props.data : [];
    return groups.map((g) => summarize((g ?? {}) as { values?: unknown }, props.whisker));
  }

  /** The group drawn in the accent: the one named, or the highest median when `highlight` is -1. */
  function featured(all: readonly Stat[]): number {
    if (props.highlight >= 0) return props.highlight;
    let best = -1;
    all.forEach((s, i) => {
      if (s.n > 0 && (best < 0 || s.med > (all[best]?.med ?? 0))) best = i;
    });
    return best;
  }

  function gridOptions(): GridOptions {
    return { fontFamily: props.fontFamily, fontSize: 12, columns: 0, lineHeight: 1, renderer: "canvas", color: "" };
  }

  function renderTable(): void {
    table?.remove();
    const rows = stats().map((s) =>
      s.n === 0
        ? [s.label, 0, "", "", "", "", "", ""]
        : [s.label, s.n, round2(s.lo), round2(s.q1), round2(s.med), round2(s.q3), round2(s.hi), s.out.map(round2).join(", ")],
    );
    table = dataTable(props.label || "Box plot", ["Group", "n", "Min", "Q1", "Median", "Q3", "Max", "Outliers"], rows);
    host.appendChild(table);
  }

  /** Axis ticks spanning every value, or none when no group has one. */
  function axisOf(all: readonly Stat[]): number[] {
    const live = all.filter((s) => s.n > 0);
    if (live.length === 0) return [];
    return niceTicks(Math.min(...live.map((s) => s.min)), Math.max(...live.map((s) => s.max)), props.ticks);
  }

  /** A group name cut to `room` characters, with an ellipsis where it was cut. */
  function fit(text: string, room: number): string {
    return text.length <= room ? text : room > 1 ? `${text.slice(0, room - 1)}…` : text.slice(0, room);
  }

  function drawSvg(): void {
    const view = root;
    if (!view) return;
    while (view.firstChild) view.firstChild.remove();
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const size = 11;
    view.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const all = stats();
    const ticks = axisOf(all);
    const first = ticks[0] ?? 0;
    const last = ticks[ticks.length - 1] ?? 1;
    const cell = measureCell(props.fontFamily, size, 1);
    const tickChars = Math.max(1, ...ticks.map((t) => formatNumber(t).length));
    const em = 12;
    const x0 = em + tickChars * cell.w + 8;
    const x1 = Math.max(x0 + 1, w - em);
    const top = em;
    const bottom = Math.max(top + 1, h - em - size - 8);
    const y = linearScale([first, last], [bottom, top]);
    const plot = { x: x0, y: top, width: x1 - x0, height: bottom - top };

    view.appendChild(gridLines(ticks, { side: "left", plot, at: y, label: (t) => formatNumber(t), size }));
    view.appendChild(svg("line", { x1: crisp(x0), y1: top, x2: crisp(x0), y2: bottom, stroke: cssVar("muted"), "stroke-width": 1 }));
    if (ticks.length === 0) {
      view.appendChild(svg("line", { x1: x0, y1: crisp(bottom), x2: x1, y2: crisp(bottom), stroke: cssVar("muted"), "stroke-width": 1 }));
      view.appendChild(svgLabel("no data", (x0 + x1) / 2, (top + bottom) / 2, { anchor: "middle", middle: true, size, font: props.fontFamily }));
    }

    const bands = bandScale(all.length, [x0, x1], 2 / 3);
    const boxWidth = Math.max(6, bands.bandwidth);
    const lit = featured(all);
    // Thin the names to every other group when a band cannot hold three characters.
    const room = Math.floor((bands.step - 8) / cell.w);
    const skip = room < 3 ? 2 : 1;
    const stroke = { stroke: cssVar("fg"), "stroke-width": 1, fill: "none" };

    all.forEach((s, i) => {
      const left = crisp(bands.at(i) + (bands.bandwidth - boxWidth) / 2);
      const right = crisp(bands.at(i) + (bands.bandwidth + boxWidth) / 2);
      const mid = crisp((left + right) / 2);
      if (i % skip === 0) {
        const name = fit(s.label, Math.max(1, Math.floor((bands.step * skip - 8) / cell.w)));
        view.appendChild(svgLabel(name, mid, bottom + size + 8, { anchor: "middle", size, font: props.fontFamily }));
      }
      if (s.n === 0) return;
      const py = (v: number): number => crisp(y(v));
      const tint = i === lit ? cssVar("accent") : cssVar("fg");
      if (s.n > 1) {
        const cap = Math.max(2, Math.floor(boxWidth / 4));
        view.appendChild(svg("path", { ...stroke, d: `M${mid} ${py(s.q3)}V${py(s.hi)}M${mid - cap} ${py(s.hi)}H${mid + cap}M${mid} ${py(s.q1)}V${py(s.lo)}M${mid - cap} ${py(s.lo)}H${mid + cap}` }));
        view.appendChild(svg("rect", { ...stroke, x: left, y: py(s.q3), width: right - left, height: py(s.q1) - py(s.q3) }));
      }
      view.appendChild(svg("line", { x1: left, y1: py(s.med), x2: right, y2: py(s.med), stroke: tint, "stroke-width": 3 }));
      for (const v of s.out) view.appendChild(svg("circle", { ...stroke, cx: mid, cy: py(v), r: 3 }));
      if (i === lit) {
        view.appendChild(svgLabel(formatNumber(s.med), right + 8, py(s.med), { middle: true, size, token: "fg", font: props.fontFamily }));
      }
    });

    host.dataset.picaReady = "true";
  }

  function drawGlyph(): void {
    const g = grid;
    if (!g) return;
    g.clear();
    const { cols, rows } = g;
    const { fg, accent, muted } = palette.colors;
    const all = stats();
    const ticks = axisOf(all);
    const first = ticks[0] ?? 0;
    const last = ticks[ticks.length - 1] ?? 1;
    const tickChars = Math.max(1, ...ticks.map((t) => formatNumber(t).length));
    const labelRow = Math.max(2, rows - 2);
    const top = 1;
    const plotRows = Math.max(1, labelRow - top);
    const axis = 1 + tickChars + 1;
    const x0 = axis + 1;
    const plotCols = Math.max(1, cols - x0 - 1);

    for (let r = top; r < labelRow; r++) g.set(axis, r, "│", muted);
    if (ticks.length === 0) {
      const note = "no data";
      g.write(x0 + Math.max(0, Math.floor((plotCols - note.length) / 2)), top + Math.floor(plotRows / 2), note, muted);
    }
    /** Where a value falls down the plot, in cell rows from the top, fractional. */
    const along = (v: number): number => (last === first ? 0 : ((last - v) / (last - first)) * (plotRows - 1));
    /** The one row mapping: every tick, wall, cap, median and outlier lands on the row whose centre is nearest. */
    const rowOf = (v: number): number => top + Math.min(plotRows - 1, Math.max(0, Math.round(along(v))));

    for (const t of ticks) {
      const r = rowOf(t);
      const text = formatNumber(t);
      g.write(1 + tickChars - text.length, r, text, muted);
      g.set(axis, r, "┤", muted);
      g.write(x0, r, "┈".repeat(plotCols), muted);
    }

    const band = Math.max(1, Math.floor(plotCols / Math.max(1, all.length)));
    const wide = Math.max(3, Math.round(band / 3) | 1);
    const boxWidth = Math.max(3, Math.min(wide, (band - 2) | 1));
    const half = (boxWidth - 1) >> 1;
    const lit = featured(all);
    const skip = band < 4 ? 2 : 1;

    all.forEach((s, i) => {
      const cx = x0 + i * band + (band >> 1);
      if (i % skip === 0) {
        const name = fit(s.label, Math.max(1, band * skip - 1));
        g.write(Math.max(0, cx - (name.length >> 1)), labelRow, name, muted);
      }
      if (s.n === 0) return;
      const tint = i === lit ? accent : fg;
      const rM = rowOf(s.med);
      if (s.n === 1) {
        g.write(cx - half, rM, "━".repeat(boxWidth), tint);
        return;
      }
      const rT = rowOf(s.q3);
      const rB = rowOf(s.q1);
      const rH = rowOf(s.hi);
      const rL = rowOf(s.lo);
      for (let r = rH; r <= rL; r++) {
        if (r >= rT && r <= rB) continue;
        const end = r === rH || r === rL;
        g.set(cx, r, end ? (r === rH ? "┬" : "┴") : "│", fg);
        if (end) {
          g.set(cx - 1, r, "╶", fg);
          g.set(cx + 1, r, "╴", fg);
        }
      }
      for (let r = rT; r <= rB; r++) {
        const med = r === rM;
        const edgeT = r === rT;
        const edgeB = r === rB;
        const up = edgeT && rH < rT;
        const down = edgeB && rL > rB;
        // Both walls and the fill come from this one row, so the walls cannot part.
        const l = med ? "┣" : edgeT && edgeB ? "├" : edgeT ? "┌" : edgeB ? "└" : "│";
        const rr = med ? "┫" : edgeT && edgeB ? "┤" : edgeT ? "┐" : edgeB ? "┘" : "│";
        const fill = med ? "━" : edgeT || edgeB ? "─" : " ";
        const joint = med ? (up && down ? "╋" : up ? "┻" : down ? "┳" : "━") : up && down ? "┼" : up ? "┴" : down ? "┬" : fill;
        const color = med ? tint : fg;
        g.set(cx - half, r, l, color);
        g.set(cx + half, r, rr, color);
        for (let c = 1; c < boxWidth - 1; c++) g.set(cx - half + c, r, c === half ? joint : fill, color);
      }
      for (const v of s.out) g.set(cx, rowOf(v), "○", fg);
      if (i === lit) {
        const text = formatNumber(s.med);
        g.write(cx + half + 2, rM, fit(text, Math.max(1, band * 2 - boxWidth - 3)), fg);
      }
    });

    g.flush();
    host.dataset.picaReady = "true";
  }

  function draw(): void {
    if (grid) drawGlyph();
    else drawSvg();
  }

  function mountView(): void {
    if (props.look === "glyph") {
      grid = createGrid(host, gridOptions(), drawGlyph);
    } else {
      root = svg("svg", { "data-pica": "", "aria-hidden": "true", "font-family": props.fontFamily });
      root.style.cssText = "display:block;width:100%;height:100%";
      host.appendChild(root);
      resizeObserver = new ResizeObserver(drawSvg);
      resizeObserver.observe(host);
    }
  }

  function unmountView(): void {
    resizeObserver?.disconnect();
    resizeObserver = null;
    root?.remove();
    root = null;
    grid?.destroy();
    grid = null;
  }

  labelHost(host, props.label, "figure");
  renderTable();
  mountView();
  draw();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      palette.refresh();
      if (props.label !== before.label) labelHost(host, props.label, "figure");
      if (props.label !== before.label || props.whisker !== before.whisker || !sameJson(props.data, before.data)) renderTable();
      if (props.look !== before.look) {
        unmountView();
        mountView();
      } else if (grid && props.fontFamily !== before.fontFamily) {
        grid.update(gridOptions());
      }
      draw();
    },
    destroy() {
      unmountView();
      palette.destroy();
      table?.remove();
      table = null;
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/data/box-plot/index.tsx
export type BoxPlotComponentProps = Partial<BoxPlotProps> & WrapperProps;

/** The spread of several groups on one value axis: quartile boxes, a median tick, whiskers, and outliers. */
export function BoxPlot({ className, style, palette, ...props }: BoxPlotComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
