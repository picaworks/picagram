# Line Chart

> One or more series plotted as lines over a shared set of labels, in an svg or braille glyph look.

Category: data. Tags: chart, line, svg, braille, data. Static. Size: 5.7 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/line-chart.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | LineChartData | `{"labels":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],"series":[{"name":"Requests","values":[12,15,18,22,26,21,19,23,29,33,37,40]},{"name":"Errors","values":[2,1,2,3,2,4,5,6,4,3,2,1]}]}` | Labels and series to plot. |
| `label` | string | `"Requests and errors per month"` | Name assistive technology reads for the chart, before its data table. Empty hides the chart from it. |
| `area` | boolean | `true` | Fills the area under the first series with the accent color, at low opacity. Only the svg look draws it. |
| `dots` | boolean | `false` | Marks each point of every series. Only the svg look draws it. |
| `look` | "svg" \| "glyph" | `"svg"` | "svg" draws hairline axes and lines with lib/chart.ts. "glyph" draws the same lines as braille dots in a monospace grid. |
| `ticks` | number | `5` | Approximate number of horizontal tick lines on the y axis, from 2 to 10. |
| `fontFamily` | string | `"\"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Menlo, monospace"` | CSS font-family stack for every label and number. Must be monospace. |

## Colors

Draws with `--pica-fg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Line Chart · line-chart
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

// registry/data/line-chart/core.ts
export interface LineChartSeries {
  /** Name for this series, shown at its line's end in the svg look and as its column in the data table. */
  name: string;
  /** One value per label, in the same order as data.labels. A value that is not a finite number opens a gap. */
  values: number[];
}

export interface LineChartData {
  /** Category under each column, in the order plotted along the x axis. */
  labels: string[];
  /** One or more series over the same labels. The first series draws in the accent color. */
  series: LineChartSeries[];
}

export interface LineChartProps {
  /** Labels and series to plot. */
  data: LineChartData;
  /** Name assistive technology reads for the chart, before its data table. Empty hides the chart from it. */
  label: string;
  /** Fills the area under the first series with the accent color, at low opacity. Only the svg look draws it. */
  area: boolean;
  /** Marks each point of every series. Only the svg look draws it. */
  dots: boolean;
  /** "svg" draws hairline axes and lines with lib/chart.ts. "glyph" draws the same lines as braille dots in a monospace grid. */
  look: "svg" | "glyph";
  /** Approximate number of horizontal tick lines on the y axis, from 2 to 10. */
  ticks: number;
  /** CSS font-family stack for every label and number. Must be monospace. */
  fontFamily: string;
}

export const defaults: LineChartProps = {
  data: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    series: [
      { name: "Requests", values: [12, 15, 18, 22, 26, 21, 19, 23, 29, 33, 37, 40] },
      { name: "Errors", values: [2, 1, 2, 3, 2, 4, 5, 6, 4, 3, 2, 1] },
    ],
  },
  label: "Requests and errors per month",
  area: true,
  dots: false,
  look: "svg",
  ticks: 5,
  fontFamily: GRID_FONT,
};

/** Pixel size of the labels the svg look draws, and the gap it keeps around a mark. */
const LABEL_SIZE = 10;
const GAP = 6;

/** The chart's labels and series, defaulting missing pieces to empty since a caller may pass a partial object. */
function chartParts(props: LineChartProps): { labels: string[]; series: LineChartSeries[] } {
  return { labels: props.data.labels ?? [], series: props.data.series ?? [] };
}

/** `count` values resampled from `source` by linear interpolation along its index. A sample stays a gap when
 *  either value it interpolates between is not a finite number. */
function resample(source: readonly number[], count: number): number[] {
  const last = Math.max(0, source.length - 1);
  const out = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? (i * last) / (count - 1) : 0;
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, last);
    const a = source[lo];
    const b = source[hi];
    out[i] = Number.isFinite(a) && Number.isFinite(b) ? (a as number) + ((b as number) - (a as number)) * (t - lo) : Number.NaN;
  }
  return out;
}

/** One series' plotted points, split into runs wherever a value is not a finite number. */
function seriesRuns(xs: readonly number[], raw: readonly number[], yAt: (value: number) => number): (readonly [number, number])[][] {
  const out: (readonly [number, number])[][] = [];
  let run: (readonly [number, number])[] = [];
  for (let i = 0; i < xs.length; i++) {
    const v = raw[i];
    if (Number.isFinite(v)) run.push([xs[i] ?? 0, yAt(v as number)]);
    else if (run.length > 0) {
      out.push(run);
      run = [];
    }
  }
  if (run.length > 0) out.push(run);
  return out;
}

/** A value formatted for the hidden data table, or blank where there is none. */
function cellText(value: number | undefined): string {
  return Number.isFinite(value) ? formatNumber(value as number, { compact: false }) : "";
}

export const mount: Mount<LineChartProps> = (host, initial = {}) => {
  let props: LineChartProps = { ...defaults, ...initial };
  let view: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resize: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;
  const palette = watchPalette(host, () => draw());

  function gridOptions(): GridOptions {
    return { fontFamily: props.fontFamily, fontSize: 13, columns: 0, lineHeight: 1.3, renderer: "canvas", color: "" };
  }

  function buildTable(): void {
    table?.remove();
    const { labels, series } = chartParts(props);
    table = dataTable(
      props.label || "Line chart",
      ["", ...series.map((s) => s.name)],
      labels.map((text, i) => [text, ...series.map((s) => cellText((s.values ?? [])[i]))]),
    );
    host.appendChild(table);
  }

  function drawSvg(): void {
    if (!view) return;
    const v = view;
    while (v.firstChild) v.firstChild.remove();
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    v.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const { fg, accent, muted } = palette.colors;
    const { labels, series } = chartParts(props);
    const finite = series.flatMap((s) => (s.values ?? []).filter((value) => Number.isFinite(value)));
    const has = labels.length > 0 && series.length > 0 && finite.length > 0;
    const [lo, hi] = has ? extent(finite) : [0, 1];
    const tickValues = niceTicks(lo, hi, Math.max(2, Math.min(10, Math.round(props.ticks))));
    const yLo = tickValues[0] ?? 0;
    const yHi = tickValues[tickValues.length - 1] ?? 1;

    const charW = measureCell(props.fontFamily, LABEL_SIZE, 1).w;
    const tickText = tickValues.map((t) => formatNumber(t));
    const longestName = Math.max(0, ...series.map((s) => s.name.length));
    const marginLeft = Math.max(...tickText.map((t) => t.length), 1) * charW + GAP * 2;
    const marginRight = has && longestName > 0 ? longestName * charW + GAP * 2 : GAP;
    const marginTop = GAP * 2;
    const marginBottom = labels.length > 0 ? LABEL_SIZE + GAP * 2 : GAP;
    const x0 = marginLeft;
    const x1 = Math.max(x0 + 1, w - marginRight);
    const y0 = marginTop;
    const y1 = Math.max(y0 + 1, h - marginBottom);

    const xAt = linearScale([0, Math.max(1, labels.length - 1)], [x0, x1]);
    const yAt = linearScale([yLo, yHi], [y1, y0]);
    const font = { "font-family": props.fontFamily, "font-size": LABEL_SIZE };

    tickValues.forEach((t, i) => {
      const y = yAt(t);
      v.appendChild(svg("line", { x1: x0, y1: y, x2: x1, y2: y, stroke: muted, "stroke-width": 1 }));
      const el = svg("text", { x: x0 - GAP, y, "text-anchor": "end", "dominant-baseline": "middle", fill: muted, ...font });
      el.textContent = tickText[i] ?? "";
      v.appendChild(el);
    });

    if (labels.length > 0) {
      const maxLen = Math.max(...labels.map((l) => l.length), 1);
      const spacing = labels.length > 1 ? (x1 - x0) / (labels.length - 1) : x1 - x0;
      const step = Math.max(1, Math.ceil((maxLen * charW + GAP) / Math.max(1, spacing)));
      labels.forEach((text, i) => {
        if (i % step !== 0 && i !== labels.length - 1) return;
        const el = svg("text", { x: xAt(i), y: y1 + GAP + LABEL_SIZE, "text-anchor": "middle", fill: muted, ...font });
        el.textContent = text;
        v.appendChild(el);
      });
    }

    if (!has) {
      const note = svg("text", { x: (x0 + x1) / 2, y: (y0 + y1) / 2, "text-anchor": "middle", "dominant-baseline": "middle", fill: muted, ...font });
      note.textContent = "no data";
      v.appendChild(note);
      return;
    }

    const xs = labels.map((_, i) => xAt(i));
    series.forEach((s, si) => {
      const tone = si === 0 ? accent : si % 2 === 1 ? fg : muted;
      const raw = s.values ?? [];
      const runs = seriesRuns(xs, raw, yAt);
      for (const run of runs) {
        if (props.area && si === 0) v.appendChild(svg("path", { d: areaPath(run, y1), fill: accent, "fill-opacity": 0.15 }));
        if (run.length > 1) v.appendChild(svg("path", { d: linePath(run), fill: "none", stroke: tone, "stroke-width": 1.5 }));
        if (props.dots) for (const [px, py] of run) v.appendChild(svg("circle", { cx: px, cy: py, r: 2, fill: tone }));
      }
      const lastRun = runs[runs.length - 1];
      const end = lastRun?.[lastRun.length - 1];
      if (end) {
        const el = svg("text", { x: end[0] + GAP, y: end[1], "text-anchor": "start", "dominant-baseline": "middle", fill: tone, ...font });
        el.textContent = s.name;
        v.appendChild(el);
      }
    });
  }

  function drawGlyph(): void {
    if (!grid) return;
    const g = grid;
    const { fg, accent, muted } = palette.colors;
    const { labels, series } = chartParts(props);
    const finite = series.flatMap((s) => (s.values ?? []).filter((value) => Number.isFinite(value)));
    const has = labels.length > 0 && series.length > 0 && finite.length > 0;
    const [lo, hi] = has ? extent(finite) : [0, 1];
    const tickValues = niceTicks(lo, hi, Math.max(2, Math.min(10, Math.round(props.ticks))));
    const yLo = tickValues[0] ?? 0;
    const yHi = tickValues[tickValues.length - 1] ?? 1;
    const span = yHi - yLo || 1;

    g.clear();
    const tickText = tickValues.map((t) => formatNumber(t));
    const gutter = Math.min(Math.max(1, g.cols - 1), Math.max(...tickText.map((t) => t.length), 1) + 1);
    const bottom = labels.length > 0 && g.rows > 1 ? 1 : 0;
    const plotCols = Math.max(1, g.cols - gutter);
    const plotRows = Math.max(1, g.rows - bottom);

    tickValues.forEach((t, i) => {
      const row = Math.round(((yHi - t) / span) * (plotRows - 1));
      if (row < 0 || row >= plotRows) return;
      g.write(0, row, (tickText[i] ?? "").padStart(gutter - 1), muted);
    });

    if (bottom > 0) {
      const denom = Math.max(1, labels.length - 1);
      const maxLen = Math.max(...labels.map((l) => l.length), 1);
      const perLabel = plotCols / denom;
      const step = Math.max(1, Math.ceil((maxLen + 1) / Math.max(1, perLabel)));
      labels.forEach((text, i) => {
        if (i % step !== 0 && i !== labels.length - 1) return;
        const at = gutter + Math.round((i / denom) * (plotCols - 1)) - Math.floor(text.length / 2);
        g.write(Math.max(gutter, Math.min(g.cols - text.length, at)), g.rows - 1, text, muted);
      });
    }

    if (!has) {
      const note = "no data";
      g.write(gutter + Math.max(0, Math.floor((plotCols - note.length) / 2)), Math.floor(plotRows / 2), note, muted);
      g.flush();
      return;
    }

    const dotCols = Math.max(1, plotCols * 2);
    const dotRows = Math.max(1, plotRows * 4);
    const bits = new Array<number>(plotCols * plotRows).fill(0);
    const tint = new Array<string | undefined>(plotCols * plotRows);
    series.forEach((s, si) => {
      const tone = si === 0 ? accent : si % 2 === 1 ? fg : muted;
      const vals = resample(s.values ?? [], dotCols);
      for (let dc = 0; dc < dotCols; dc++) {
        const value = vals[dc];
        if (!Number.isFinite(value)) continue;
        const v = value as number;
        const t = (v - yLo) / span;
        const dr = Math.min(dotRows - 1, Math.max(0, Math.round((1 - t) * (dotRows - 1))));
        const cx = Math.min(plotCols - 1, Math.floor(dc / 2));
        const cy = Math.min(plotRows - 1, Math.floor(dr / 4));
        const idx = cy * plotCols + cx;
        bits[idx] = (bits[idx] ?? 0) | brailleDot(dr % 4, dc % 2);
        if (tint[idx] === undefined) tint[idx] = tone;
      }
    });
    for (let cy = 0; cy < plotRows; cy++) {
      for (let cx = 0; cx < plotCols; cx++) {
        const idx = cy * plotCols + cx;
        if (bits[idx]) g.set(gutter + cx, cy, braille(bits[idx] ?? 0), tint[idx]);
      }
    }
    g.flush();
  }

  function draw(): void {
    labelHost(host, props.label, "figure");
    buildTable();
    if (props.look === "glyph") {
      if (view) {
        resize?.disconnect();
        resize = null;
        view.remove();
        view = null;
      }
      if (!grid) grid = createGrid(host, gridOptions(), draw);
      drawGlyph();
    } else {
      if (grid) {
        grid.destroy();
        grid = null;
      }
      if (!view) {
        view = svg("svg", { "aria-hidden": "true", "data-pica": "" });
        view.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
        host.appendChild(view);
        resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
        resize?.observe(host);
      }
      drawSvg();
    }
    host.dataset.picaReady = "true";
  }

  draw();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      palette.refresh();
      if (grid && props.fontFamily !== before.fontFamily) {
        grid.update(gridOptions());
        return;
      }
      draw();
    },
    destroy() {
      resize?.disconnect();
      resize = null;
      view?.remove();
      view = null;
      grid?.destroy();
      grid = null;
      table?.remove();
      table = null;
      palette.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/data/line-chart/index.tsx
export type LineChartComponentProps = Partial<LineChartProps> & WrapperProps;

/** One or more series plotted as lines over a shared set of labels, in an svg or braille glyph look. */
export function LineChart({ className, style, palette, ...props }: LineChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Line Chart · line-chart
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Line Chart · Pica</title>
<style>:root { --pica-accent: #e8a020; }
html, body { margin: 0; height: 100%; background: #0a0a0a; color: #f1f1ef; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
@media (prefers-color-scheme: light) { html:not([data-ground]), html:not([data-ground]) body { background: #f1f1ef; color: #0a0a0a; } }
html[data-ground="paper"], html[data-ground="paper"] body { background: #f1f1ef; color: #0a0a0a; }
html[data-ground="checker"] body { background: repeating-conic-gradient(#161616 0% 25%, #0a0a0a 0% 50%) 50% / 24px 24px; }
#pica { width: 100%; height: 100%; }
.pica-stage { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: clamp(20px, 3.2vw, 40px); }
.pica-stage #pica { width: auto; height: auto; }
.pica-stage span#pica, .pica-stage div#pica { display: inline-block; }</style>
</head>
<body>
<div id="pica"></div>
<script>
"use strict";
var PicaLineChart = (() => {
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

  // registry/data/line-chart/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

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

  // lib/blocks.ts
  var BRAILLE_BASE = 10240;
  function brailleDot(row, col) {
    if (row === 3) return col === 0 ? 64 : 128;
    return 1 << (col === 0 ? row : row + 3);
  }
  function braille(bits) {
    return String.fromCharCode(BRAILLE_BASE + (bits & 255));
  }

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
  function areaPath(points, baseline) {
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return "";
    return `${linePath(points)}L${coord(last[0])} ${coord(baseline)}L${coord(first[0])} ${coord(baseline)}Z`;
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

  // lib/palette.ts
  var TOKENS = ["fg", "bg", "accent", "muted"];
  var TOKEN_FALLBACK = {
    fg: "currentColor",
    bg: "transparent",
    accent: "#e8a020",
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
  function measureCell(fontFamily, fontSize, lineHeight) {
    return { w: fontSize * advanceOf(fontFamily), h: Math.max(1, Math.round(fontSize * lineHeight)) };
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

  // registry/data/line-chart/core.ts
  var defaults = {
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      series: [
        { name: "Requests", values: [12, 15, 18, 22, 26, 21, 19, 23, 29, 33, 37, 40] },
        { name: "Errors", values: [2, 1, 2, 3, 2, 4, 5, 6, 4, 3, 2, 1] }
      ]
    },
    label: "Requests and errors per month",
    area: true,
    dots: false,
    look: "svg",
    ticks: 5,
    fontFamily: GRID_FONT
  };
  var LABEL_SIZE = 10;
  var GAP = 6;
  function chartParts(props) {
    return { labels: props.data.labels ?? [], series: props.data.series ?? [] };
  }
  function resample(source, count) {
    const last = Math.max(0, source.length - 1);
    const out = new Array(count);
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i * last / (count - 1) : 0;
      const lo = Math.floor(t);
      const hi = Math.min(lo + 1, last);
      const a = source[lo];
      const b = source[hi];
      out[i] = Number.isFinite(a) && Number.isFinite(b) ? a + (b - a) * (t - lo) : Number.NaN;
    }
    return out;
  }
  function seriesRuns(xs, raw, yAt) {
    const out = [];
    let run = [];
    for (let i = 0; i < xs.length; i++) {
      const v = raw[i];
      if (Number.isFinite(v)) run.push([xs[i] ?? 0, yAt(v)]);
      else if (run.length > 0) {
        out.push(run);
        run = [];
      }
    }
    if (run.length > 0) out.push(run);
    return out;
  }
  function cellText(value) {
    return Number.isFinite(value) ? formatNumber(value, { compact: false }) : "";
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let view = null;
    let grid = null;
    let resize = null;
    let table = null;
    const palette = watchPalette(host, () => draw());
    function gridOptions() {
      return { fontFamily: props.fontFamily, fontSize: 13, columns: 0, lineHeight: 1.3, renderer: "canvas", color: "" };
    }
    function buildTable() {
      table?.remove();
      const { labels, series } = chartParts(props);
      table = dataTable(
        props.label || "Line chart",
        ["", ...series.map((s) => s.name)],
        labels.map((text, i) => [text, ...series.map((s) => cellText((s.values ?? [])[i]))])
      );
      host.appendChild(table);
    }
    function drawSvg() {
      if (!view) return;
      const v = view;
      while (v.firstChild) v.firstChild.remove();
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      v.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const { fg, accent, muted } = palette.colors;
      const { labels, series } = chartParts(props);
      const finite = series.flatMap((s) => (s.values ?? []).filter((value) => Number.isFinite(value)));
      const has = labels.length > 0 && series.length > 0 && finite.length > 0;
      const [lo, hi] = has ? extent(finite) : [0, 1];
      const tickValues = niceTicks(lo, hi, Math.max(2, Math.min(10, Math.round(props.ticks))));
      const yLo = tickValues[0] ?? 0;
      const yHi = tickValues[tickValues.length - 1] ?? 1;
      const charW = measureCell(props.fontFamily, LABEL_SIZE, 1).w;
      const tickText = tickValues.map((t) => formatNumber(t));
      const longestName = Math.max(0, ...series.map((s) => s.name.length));
      const marginLeft = Math.max(...tickText.map((t) => t.length), 1) * charW + GAP * 2;
      const marginRight = has && longestName > 0 ? longestName * charW + GAP * 2 : GAP;
      const marginTop = GAP * 2;
      const marginBottom = labels.length > 0 ? LABEL_SIZE + GAP * 2 : GAP;
      const x0 = marginLeft;
      const x1 = Math.max(x0 + 1, w - marginRight);
      const y0 = marginTop;
      const y1 = Math.max(y0 + 1, h - marginBottom);
      const xAt = linearScale([0, Math.max(1, labels.length - 1)], [x0, x1]);
      const yAt = linearScale([yLo, yHi], [y1, y0]);
      const font = { "font-family": props.fontFamily, "font-size": LABEL_SIZE };
      tickValues.forEach((t, i) => {
        const y = yAt(t);
        v.appendChild(svg("line", { x1: x0, y1: y, x2: x1, y2: y, stroke: muted, "stroke-width": 1 }));
        const el = svg("text", { x: x0 - GAP, y, "text-anchor": "end", "dominant-baseline": "middle", fill: muted, ...font });
        el.textContent = tickText[i] ?? "";
        v.appendChild(el);
      });
      if (labels.length > 0) {
        const maxLen = Math.max(...labels.map((l) => l.length), 1);
        const spacing = labels.length > 1 ? (x1 - x0) / (labels.length - 1) : x1 - x0;
        const step = Math.max(1, Math.ceil((maxLen * charW + GAP) / Math.max(1, spacing)));
        labels.forEach((text, i) => {
          if (i % step !== 0 && i !== labels.length - 1) return;
          const el = svg("text", { x: xAt(i), y: y1 + GAP + LABEL_SIZE, "text-anchor": "middle", fill: muted, ...font });
          el.textContent = text;
          v.appendChild(el);
        });
      }
      if (!has) {
        const note = svg("text", { x: (x0 + x1) / 2, y: (y0 + y1) / 2, "text-anchor": "middle", "dominant-baseline": "middle", fill: muted, ...font });
        note.textContent = "no data";
        v.appendChild(note);
        return;
      }
      const xs = labels.map((_, i) => xAt(i));
      series.forEach((s, si) => {
        const tone = si === 0 ? accent : si % 2 === 1 ? fg : muted;
        const raw = s.values ?? [];
        const runs = seriesRuns(xs, raw, yAt);
        for (const run of runs) {
          if (props.area && si === 0) v.appendChild(svg("path", { d: areaPath(run, y1), fill: accent, "fill-opacity": 0.15 }));
          if (run.length > 1) v.appendChild(svg("path", { d: linePath(run), fill: "none", stroke: tone, "stroke-width": 1.5 }));
          if (props.dots) for (const [px, py] of run) v.appendChild(svg("circle", { cx: px, cy: py, r: 2, fill: tone }));
        }
        const lastRun = runs[runs.length - 1];
        const end = lastRun?.[lastRun.length - 1];
        if (end) {
          const el = svg("text", { x: end[0] + GAP, y: end[1], "text-anchor": "start", "dominant-baseline": "middle", fill: tone, ...font });
          el.textContent = s.name;
          v.appendChild(el);
        }
      });
    }
    function drawGlyph() {
      if (!grid) return;
      const g = grid;
      const { fg, accent, muted } = palette.colors;
      const { labels, series } = chartParts(props);
      const finite = series.flatMap((s) => (s.values ?? []).filter((value) => Number.isFinite(value)));
      const has = labels.length > 0 && series.length > 0 && finite.length > 0;
      const [lo, hi] = has ? extent(finite) : [0, 1];
      const tickValues = niceTicks(lo, hi, Math.max(2, Math.min(10, Math.round(props.ticks))));
      const yLo = tickValues[0] ?? 0;
      const yHi = tickValues[tickValues.length - 1] ?? 1;
      const span = yHi - yLo || 1;
      g.clear();
      const tickText = tickValues.map((t) => formatNumber(t));
      const gutter = Math.min(Math.max(1, g.cols - 1), Math.max(...tickText.map((t) => t.length), 1) + 1);
      const bottom = labels.length > 0 && g.rows > 1 ? 1 : 0;
      const plotCols = Math.max(1, g.cols - gutter);
      const plotRows = Math.max(1, g.rows - bottom);
      tickValues.forEach((t, i) => {
        const row = Math.round((yHi - t) / span * (plotRows - 1));
        if (row < 0 || row >= plotRows) return;
        g.write(0, row, (tickText[i] ?? "").padStart(gutter - 1), muted);
      });
      if (bottom > 0) {
        const denom = Math.max(1, labels.length - 1);
        const maxLen = Math.max(...labels.map((l) => l.length), 1);
        const perLabel = plotCols / denom;
        const step = Math.max(1, Math.ceil((maxLen + 1) / Math.max(1, perLabel)));
        labels.forEach((text, i) => {
          if (i % step !== 0 && i !== labels.length - 1) return;
          const at = gutter + Math.round(i / denom * (plotCols - 1)) - Math.floor(text.length / 2);
          g.write(Math.max(gutter, Math.min(g.cols - text.length, at)), g.rows - 1, text, muted);
        });
      }
      if (!has) {
        const note = "no data";
        g.write(gutter + Math.max(0, Math.floor((plotCols - note.length) / 2)), Math.floor(plotRows / 2), note, muted);
        g.flush();
        return;
      }
      const dotCols = Math.max(1, plotCols * 2);
      const dotRows = Math.max(1, plotRows * 4);
      const bits = new Array(plotCols * plotRows).fill(0);
      const tint = new Array(plotCols * plotRows);
      series.forEach((s, si) => {
        const tone = si === 0 ? accent : si % 2 === 1 ? fg : muted;
        const vals = resample(s.values ?? [], dotCols);
        for (let dc = 0; dc < dotCols; dc++) {
          const value = vals[dc];
          if (!Number.isFinite(value)) continue;
          const v = value;
          const t = (v - yLo) / span;
          const dr = Math.min(dotRows - 1, Math.max(0, Math.round((1 - t) * (dotRows - 1))));
          const cx = Math.min(plotCols - 1, Math.floor(dc / 2));
          const cy = Math.min(plotRows - 1, Math.floor(dr / 4));
          const idx = cy * plotCols + cx;
          bits[idx] = (bits[idx] ?? 0) | brailleDot(dr % 4, dc % 2);
          if (tint[idx] === void 0) tint[idx] = tone;
        }
      });
      for (let cy = 0; cy < plotRows; cy++) {
        for (let cx = 0; cx < plotCols; cx++) {
          const idx = cy * plotCols + cx;
          if (bits[idx]) g.set(gutter + cx, cy, braille(bits[idx] ?? 0), tint[idx]);
        }
      }
      g.flush();
    }
    function draw() {
      labelHost(host, props.label, "figure");
      buildTable();
      if (props.look === "glyph") {
        if (view) {
          resize?.disconnect();
          resize = null;
          view.remove();
          view = null;
        }
        if (!grid) grid = createGrid(host, gridOptions(), draw);
        drawGlyph();
      } else {
        if (grid) {
          grid.destroy();
          grid = null;
        }
        if (!view) {
          view = svg("svg", { "aria-hidden": "true", "data-pica": "" });
          view.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
          host.appendChild(view);
          resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
          resize?.observe(host);
        }
        drawSvg();
      }
      host.dataset.picaReady = "true";
    }
    draw();
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        palette.refresh();
        if (grid && props.fontFamily !== before.fontFamily) {
          grid.update(gridOptions());
          return;
        }
        draw();
      },
      destroy() {
        resize?.disconnect();
        resize = null;
        view?.remove();
        view = null;
        grid?.destroy();
        grid = null;
        table?.remove();
        table = null;
        palette.destroy();
        unlabelHost(host);
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
  var instance = PicaLineChart.mount(host, take(window.PICA_PROPS || {}));
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

- Technique from [Nice Numbers for Graph Labels](https://dl.acm.org/doi/10.5555/90767.90846) by Paul Heckbert, Graphics Gems (Algorithm, no code).
