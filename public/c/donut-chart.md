# Donut Chart

> Parts of a whole drawn as a ring, either as SVG segments or a monospace glyph grid, with a hidden data table.

Category: data. Tags: chart, donut, svg, glyph grid, data table. Static. Size: 5.1 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/donut-chart.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | { label: string; value: number }[] | `[{"label":"ASCII","value":42},{"label":"Dither","value":23},{"label":"Shaders","value":18},{"label":"Charts","value":11},{"label":"Controls","value":6}]` | Parts of the whole, each a label and a value. A value that is not a positive finite number counts as zero. |
| `label` | string | `"Components by family"` | Name for the chart, read by assistive technology and used as the hidden data table's caption. |
| `highlight` | number | `-1` | Index of the segment drawn in the accent. -1 highlights the segment with the largest value. |
| `thickness` | number | `0.28` | Ring width as a share of its outer radius, from a thin band to a thick one. |
| `gap` | number | `1.5` | Empty space between segments, in degrees. |
| `center` | "total" \| "highlight" \| "none" | `"highlight"` | What the ring's center shows: the sum of every value, the highlighted segment's share, or nothing. |
| `look` | "svg" \| "glyph" | `"svg"` | "svg" draws ring segments with direct or listed labels. "glyph" fills the ring in a monospace grid. |
| `fontFamily` | string | `"\"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Menlo, monospace"` | CSS font-family stack for every label and number the chart draws. Must be monospace. |

## Colors

Draws with `--pica-fg`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Donut Chart · donut-chart
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

// registry/data/donut-chart/core.ts
export interface DonutChartProps {
  /** Parts of the whole, each a label and a value. A value that is not a positive finite number counts as zero. */
  data: { label: string; value: number }[];
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** Index of the segment drawn in the accent. -1 highlights the segment with the largest value. */
  highlight: number;
  /** Ring width as a share of its outer radius, from a thin band to a thick one. */
  thickness: number;
  /** Empty space between segments, in degrees. */
  gap: number;
  /** What the ring's center shows: the sum of every value, the highlighted segment's share, or nothing. */
  center: "total" | "highlight" | "none";
  /** "svg" draws ring segments with direct or listed labels. "glyph" fills the ring in a monospace grid. */
  look: "svg" | "glyph";
  /** CSS font-family stack for every label and number the chart draws. Must be monospace. */
  fontFamily: string;
}

export const defaults: DonutChartProps = {
  data: [
    { label: "ASCII", value: 42 },
    { label: "Dither", value: 23 },
    { label: "Shaders", value: 18 },
    { label: "Charts", value: 11 },
    { label: "Controls", value: 6 },
  ],
  label: "Components by family",
  highlight: -1,
  thickness: 0.28,
  gap: 1.5,
  center: "highlight",
  look: "svg",
  fontFamily: GRID_FONT,
};

/** A full turn, in radians. Every angle here runs clockwise from twelve o'clock, as arcPath expects. */
const TAU = Math.PI * 2;
/** Opacity steps for segments drawn in fg, cycled by each segment's position in the data array, so
 *  neighbors read as separate slices without a second hue. */
const FG_STEPS: readonly number[] = [1, 0.72, 0.48, 0.3];
/** Pixel size of the labels the svg look draws, and the gap it keeps around a mark. */
const LABEL_SIZE = 11;
const GAP = 8;
/** Columns across the ring in the glyph look, fixed rather than derived from the host width, so each shade
 *  glyph stays large enough to read as a glyph instead of blurring into a smooth mask. */
const GLYPH_COLUMNS = 52;

interface DonutSlice {
  /** Position in props.data, which both looks use to cycle tone and to resolve `highlight`. */
  index: number;
  label: string;
  value: number;
  /** Share of the total, 0 to 1. 0 for every slice when every value is zero. */
  share: number;
  start: number;
  end: number;
  mid: number;
}

/** `value` as a chart weight: a positive finite number, or zero for anything else, so a negative or
 *  missing value never draws a backward slice. */
function positiveNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Slices proportional to each value, running clockwise from twelve o'clock, and the total of every value. */
function buildSlices(data: DonutChartProps["data"]): { slices: DonutSlice[]; total: number } {
  const values = data.map((d) => positiveNumber(d?.value));
  const total = values.reduce((sum, v) => sum + v, 0);
  let angle = 0;
  const slices = data.map((d, index) => {
    const value = values[index] ?? 0;
    const span = total > 0 ? (value / total) * TAU : 0;
    const start = angle;
    angle += span;
    return { index, label: typeof d?.label === "string" ? d.label : "", value, share: total > 0 ? value / total : 0, start, end: angle, mid: start + span / 2 };
  });
  return { slices, total };
}

/** The index drawn in the accent: the largest value when `highlight` is -1, otherwise `highlight` itself, so
 *  a value past the end of the data highlights nothing rather than clamping to a slice the viewer did not ask for. */
function resolveHighlight(slices: readonly DonutSlice[], highlight: number): number {
  if (highlight !== -1) return highlight;
  let best = -1;
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const slice of slices) {
    if (slice.value > bestValue) {
      bestValue = slice.value;
      best = slice.index;
    }
  }
  return best;
}

/** Degrees between each slice's center and the next slice's, the smallest of which decides whether a
 *  direct label still has room. */
function minCenterGap(slices: readonly DonutSlice[]): number {
  let min = 360;
  for (let i = 0; i < slices.length; i++) {
    const a = slices[i]?.mid ?? 0;
    const b = slices[(i + 1) % slices.length]?.mid ?? 0;
    const diff = ((b - a + TAU) % TAU || TAU) * (180 / Math.PI);
    min = Math.min(min, diff);
  }
  return min;
}

/** Direct labels crowd once there are many segments or two centers fall close together, and more readily
 *  on a narrow host, where a label has less room to run before it meets its neighbor or the edge. */
function needsList(slices: readonly DonutSlice[], hostWidth: number): boolean {
  if (slices.length < 2) return false;
  if (slices.length > 12) return true;
  return minCenterGap(slices) < (hostWidth < 480 ? 30 : 15);
}

/** The slice angle falls within, or -1 between floating point rounding at the seam back to twelve o'clock. */
function sliceAt(slices: readonly DonutSlice[], angle: number): number {
  for (const slice of slices) {
    if (angle >= slice.start && angle < slice.end) return slice.index;
  }
  const last = slices[slices.length - 1];
  return last && angle >= last.start ? last.index : -1;
}

export const mount: Mount<DonutChartProps> = (host, initial = {}) => {
  let props: DonutChartProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resize: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;

  function gridOptions(): GridOptions {
    return { fontFamily: props.fontFamily, fontSize: 12, columns: GLYPH_COLUMNS, lineHeight: 1, renderer: "canvas", color: "" };
  }

  function renderTable(): void {
    table?.remove();
    const { slices } = buildSlices(props.data);
    table = dataTable(
      props.label || "Donut chart",
      ["Label", "Value", "Share"],
      slices.map((s) => [s.label || `Segment ${s.index + 1}`, s.value, `${Math.round(s.share * 100)}%`]),
    );
    host.appendChild(table);
  }

  function drawSvg(): void {
    const view = root;
    if (!view) return;
    while (view.firstChild) view.firstChild.remove();
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    view.setAttribute("viewBox", `0 0 ${w} ${h}`);
    view.setAttribute("font-family", props.fontFamily);
    view.setAttribute("font-size", String(LABEL_SIZE));

    const { slices, total } = buildSlices(props.data);
    const n = slices.length;
    const empty = n === 0 || total <= 0;
    const thickness = Math.max(0.05, Math.min(0.95, props.thickness));

    if (empty) {
      const outerR = Math.max(3, Math.min(w, h) / 2 - GAP);
      const innerR = outerR * (1 - thickness);
      view.appendChild(svg("path", { d: arcPath(w / 2, h / 2, innerR, outerR, 0, TAU), fill: cssVar("muted") }));
      const note = svg("text", { x: w / 2, y: h / 2, "text-anchor": "middle", "dominant-baseline": "central", fill: cssVar("muted") });
      note.textContent = "no data";
      view.appendChild(note);
    } else {
      const highlightIndex = resolveHighlight(slices, props.highlight);
      const useList = needsList(slices, w);
      const charW = measureCell(props.fontFamily, LABEL_SIZE, 1).w;
      const longestLabel = Math.max(1, ...slices.map((s) => s.label.length));
      const listWidth = useList ? Math.max(...slices.map((s) => (s.label.length + 5) * charW)) + GAP * 2 : 0;
      const plotW = useList ? Math.max(20, w - listWidth - GAP) : w;
      const cx = plotW / 2;
      const cy = h / 2;
      // A direct label can run outward from any edge of the ring, so the whole rim keeps enough clearance
      // for the longest one, however that particular segment happens to be angled when the host is narrow.
      const margin = useList ? GAP : Math.max(LABEL_SIZE * 1.6, longestLabel * charW) + GAP;
      const outerR = Math.max(3, Math.min(plotW, h) / 2 - margin);
      const innerR = outerR * (1 - thickness);
      const gapRad = (Math.max(0, Math.min(10, props.gap)) * Math.PI) / 180;

      for (const slice of slices) {
        const inset = n > 1 ? Math.min(gapRad / 2, (slice.end - slice.start) / 2) : 0;
        const start = slice.start + inset;
        const end = Math.max(start, slice.end - inset);
        const isHighlight = slice.index === highlightIndex;
        const opacity = isHighlight ? 1 : (FG_STEPS[slice.index % FG_STEPS.length] ?? 1);
        const path = svg("path", { d: arcPath(cx, cy, innerR, outerR, start, end), fill: isHighlight ? cssVar("accent") : cssVar("fg") });
        if (opacity < 1) path.setAttribute("fill-opacity", String(opacity));
        view.appendChild(path);
      }

      if (useList) {
        const rowH = LABEL_SIZE * 1.7;
        const top = cy - (n * rowH) / 2 + rowH / 2;
        const listX = plotW + GAP;
        const sw = LABEL_SIZE * 0.7;
        slices.forEach((slice, i) => {
          const y = top + i * rowH;
          const isHighlight = slice.index === highlightIndex;
          const opacity = isHighlight ? 1 : (FG_STEPS[slice.index % FG_STEPS.length] ?? 1);
          const swatch = svg("rect", { x: listX, y: y - sw / 2, width: sw, height: sw, fill: isHighlight ? cssVar("accent") : cssVar("fg") });
          if (opacity < 1) swatch.setAttribute("fill-opacity", String(opacity));
          view.appendChild(swatch);
          const name = svg("text", { x: listX + sw + GAP * 0.6, y, "dominant-baseline": "central", fill: cssVar("fg") });
          name.textContent = slice.label || `Segment ${slice.index + 1}`;
          view.appendChild(name);
          const pct = svg("text", { x: w, y, "text-anchor": "end", "dominant-baseline": "central", fill: cssVar("muted") });
          pct.textContent = `${Math.round(slice.share * 100)}%`;
          view.appendChild(pct);
        });
      } else {
        for (const slice of slices) {
          if (!slice.label) continue;
          const sx = Math.sin(slice.mid);
          const r = outerR + GAP;
          const x = cx + r * sx;
          const y = cy - r * Math.cos(slice.mid);
          const anchor = sx > 0.2 ? "start" : sx < -0.2 ? "end" : "middle";
          const el = svg("text", { x, y, "text-anchor": anchor, "dominant-baseline": "central", fill: cssVar("muted") });
          el.textContent = slice.label;
          view.appendChild(el);
        }
      }

      if (props.center !== "none") {
        const text = props.center === "total" ? formatNumber(total) : `${Math.round((slices[highlightIndex]?.share ?? 0) * 100)}%`;
        const el = svg("text", {
          x: cx,
          y: cy,
          "text-anchor": "middle",
          "dominant-baseline": "central",
          "font-size": Math.max(12, innerR * 0.6),
          fill: cssVar("fg"),
        });
        el.style.fontVariantNumeric = "tabular-nums";
        el.textContent = text;
        view.appendChild(el);
      }
    }
  }

  function drawGlyph(): void {
    const g = grid;
    if (!g) return;
    g.clear();
    const { cols, rows, cellWidth, cellHeight } = g;
    const colors = readPalette(host);
    const w = cols * cellWidth;
    const h = rows * cellHeight;
    const cx = w / 2;
    const cy = h / 2;
    const outerR = Math.min(w, h) / 2 - Math.max(cellWidth, cellHeight) * 0.5;
    const innerR = outerR * (1 - Math.max(0.05, Math.min(0.95, props.thickness)));
    const { slices, total } = buildSlices(props.data);
    const empty = slices.length === 0 || total <= 0;
    const highlightIndex = empty ? -1 : resolveHighlight(slices, props.highlight);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const dx = (col + 0.5) * cellWidth - cx;
        const dy = (row + 0.5) * cellHeight - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < innerR || dist > outerR) continue;
        if (empty) {
          g.set(col, row, shade(1), colors.muted);
          continue;
        }
        const index = sliceAt(slices, (Math.atan2(dx, -dy) + TAU) % TAU);
        if (index < 0) continue;
        const isHighlight = index === highlightIndex;
        g.set(col, row, isHighlight ? shade(4) : shade(1 + (index % 3)), isHighlight ? colors.accent : colors.fg);
      }
    }
    g.flush();
  }

  function draw(): void {
    labelHost(host, props.label, "figure");
    renderTable();
    if (props.look === "glyph") {
      if (root) {
        resize?.disconnect();
        resize = null;
        root.remove();
        root = null;
      }
      if (!grid) grid = createGrid(host, gridOptions(), draw);
      drawGlyph();
    } else {
      if (grid) {
        grid.destroy();
        grid = null;
      }
      if (!root) {
        root = svg("svg", { "aria-hidden": "true", "data-pica": "" });
        root.style.cssText = "display:block;width:100%;height:100%";
        host.appendChild(root);
        resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => drawSvg()) : null;
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
      if (grid && props.fontFamily !== before.fontFamily) {
        grid.update(gridOptions());
        return;
      }
      draw();
    },
    destroy() {
      resize?.disconnect();
      resize = null;
      root?.remove();
      root = null;
      grid?.destroy();
      grid = null;
      table?.remove();
      table = null;
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/data/donut-chart/index.tsx
export type DonutChartComponentProps = Partial<DonutChartProps> & WrapperProps;

/** Parts of a whole drawn as a ring, in an svg or monospace glyph look, with a hidden data table. */
export function DonutChart({ className, style, palette, ...props }: DonutChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Donut Chart · donut-chart
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Donut Chart · Pica</title>
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
var PicaDonutChart = (() => {
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

  // registry/data/donut-chart/core.ts
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
  var SHADES = " ░▒▓█";
  function shade(n) {
    return SHADES[Math.max(0, Math.min(4, Math.round(n)))] ?? " ";
  }

  // lib/chart.ts
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
  function arcPath(cx, cy, inner, outer, start, end) {
    if (end - start >= Math.PI * 2 - 1e-9) {
      const middle = start + Math.PI;
      return arcPath(cx, cy, inner, outer, start, middle) + arcPath(cx, cy, inner, outer, middle, start + Math.PI * 2);
    }
    const large = end - start > Math.PI ? 1 : 0;
    const at = (r, a) => `${coord(cx + r * Math.sin(a))} ${coord(cy - r * Math.cos(a))}`;
    const outerArc = `A${coord(outer)} ${coord(outer)} 0 ${large} 1 ${at(outer, end)}`;
    if (inner <= 0) return `M${coord(cx)} ${coord(cy)}L${at(outer, start)}${outerArc}Z`;
    return `M${at(outer, start)}${outerArc}L${at(inner, end)}A${coord(inner)} ${coord(inner)} 0 ${large} 0 ${at(inner, start)}Z`;
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
  var TOKEN_FALLBACK = {
    fg: "currentColor",
    bg: "transparent",
    accent: "#e8a020",
    muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)"
  };
  function cssVar(token) {
    return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
  }
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
  function readPalette(host) {
    const probe = createProbe(host);
    const colors = probeColors(probe);
    probe.remove();
    return colors;
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

  // registry/data/donut-chart/core.ts
  var defaults = {
    data: [
      { label: "ASCII", value: 42 },
      { label: "Dither", value: 23 },
      { label: "Shaders", value: 18 },
      { label: "Charts", value: 11 },
      { label: "Controls", value: 6 }
    ],
    label: "Components by family",
    highlight: -1,
    thickness: 0.28,
    gap: 1.5,
    center: "highlight",
    look: "svg",
    fontFamily: GRID_FONT
  };
  var TAU = Math.PI * 2;
  var FG_STEPS = [1, 0.72, 0.48, 0.3];
  var LABEL_SIZE = 11;
  var GAP = 8;
  var GLYPH_COLUMNS = 52;
  function positiveNumber(value) {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  function buildSlices(data) {
    const values = data.map((d) => positiveNumber(d?.value));
    const total = values.reduce((sum, v) => sum + v, 0);
    let angle = 0;
    const slices = data.map((d, index) => {
      const value = values[index] ?? 0;
      const span = total > 0 ? value / total * TAU : 0;
      const start = angle;
      angle += span;
      return { index, label: typeof d?.label === "string" ? d.label : "", value, share: total > 0 ? value / total : 0, start, end: angle, mid: start + span / 2 };
    });
    return { slices, total };
  }
  function resolveHighlight(slices, highlight) {
    if (highlight !== -1) return highlight;
    let best = -1;
    let bestValue = Number.NEGATIVE_INFINITY;
    for (const slice of slices) {
      if (slice.value > bestValue) {
        bestValue = slice.value;
        best = slice.index;
      }
    }
    return best;
  }
  function minCenterGap(slices) {
    let min = 360;
    for (let i = 0; i < slices.length; i++) {
      const a = slices[i]?.mid ?? 0;
      const b = slices[(i + 1) % slices.length]?.mid ?? 0;
      const diff = ((b - a + TAU) % TAU || TAU) * (180 / Math.PI);
      min = Math.min(min, diff);
    }
    return min;
  }
  function needsList(slices, hostWidth) {
    if (slices.length < 2) return false;
    if (slices.length > 12) return true;
    return minCenterGap(slices) < (hostWidth < 480 ? 30 : 15);
  }
  function sliceAt(slices, angle) {
    for (const slice of slices) {
      if (angle >= slice.start && angle < slice.end) return slice.index;
    }
    const last = slices[slices.length - 1];
    return last && angle >= last.start ? last.index : -1;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let root = null;
    let grid = null;
    let resize = null;
    let table = null;
    function gridOptions() {
      return { fontFamily: props.fontFamily, fontSize: 12, columns: GLYPH_COLUMNS, lineHeight: 1, renderer: "canvas", color: "" };
    }
    function renderTable() {
      table?.remove();
      const { slices } = buildSlices(props.data);
      table = dataTable(
        props.label || "Donut chart",
        ["Label", "Value", "Share"],
        slices.map((s) => [s.label || `Segment ${s.index + 1}`, s.value, `${Math.round(s.share * 100)}%`])
      );
      host.appendChild(table);
    }
    function drawSvg() {
      const view = root;
      if (!view) return;
      while (view.firstChild) view.firstChild.remove();
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      view.setAttribute("viewBox", `0 0 ${w} ${h}`);
      view.setAttribute("font-family", props.fontFamily);
      view.setAttribute("font-size", String(LABEL_SIZE));
      const { slices, total } = buildSlices(props.data);
      const n = slices.length;
      const empty = n === 0 || total <= 0;
      const thickness = Math.max(0.05, Math.min(0.95, props.thickness));
      if (empty) {
        const outerR = Math.max(3, Math.min(w, h) / 2 - GAP);
        const innerR = outerR * (1 - thickness);
        view.appendChild(svg("path", { d: arcPath(w / 2, h / 2, innerR, outerR, 0, TAU), fill: cssVar("muted") }));
        const note = svg("text", { x: w / 2, y: h / 2, "text-anchor": "middle", "dominant-baseline": "central", fill: cssVar("muted") });
        note.textContent = "no data";
        view.appendChild(note);
      } else {
        const highlightIndex = resolveHighlight(slices, props.highlight);
        const useList = needsList(slices, w);
        const charW = measureCell(props.fontFamily, LABEL_SIZE, 1).w;
        const longestLabel = Math.max(1, ...slices.map((s) => s.label.length));
        const listWidth = useList ? Math.max(...slices.map((s) => (s.label.length + 5) * charW)) + GAP * 2 : 0;
        const plotW = useList ? Math.max(20, w - listWidth - GAP) : w;
        const cx = plotW / 2;
        const cy = h / 2;
        const margin = useList ? GAP : Math.max(LABEL_SIZE * 1.6, longestLabel * charW) + GAP;
        const outerR = Math.max(3, Math.min(plotW, h) / 2 - margin);
        const innerR = outerR * (1 - thickness);
        const gapRad = Math.max(0, Math.min(10, props.gap)) * Math.PI / 180;
        for (const slice of slices) {
          const inset = n > 1 ? Math.min(gapRad / 2, (slice.end - slice.start) / 2) : 0;
          const start = slice.start + inset;
          const end = Math.max(start, slice.end - inset);
          const isHighlight = slice.index === highlightIndex;
          const opacity = isHighlight ? 1 : FG_STEPS[slice.index % FG_STEPS.length] ?? 1;
          const path = svg("path", { d: arcPath(cx, cy, innerR, outerR, start, end), fill: isHighlight ? cssVar("accent") : cssVar("fg") });
          if (opacity < 1) path.setAttribute("fill-opacity", String(opacity));
          view.appendChild(path);
        }
        if (useList) {
          const rowH = LABEL_SIZE * 1.7;
          const top = cy - n * rowH / 2 + rowH / 2;
          const listX = plotW + GAP;
          const sw = LABEL_SIZE * 0.7;
          slices.forEach((slice, i) => {
            const y = top + i * rowH;
            const isHighlight = slice.index === highlightIndex;
            const opacity = isHighlight ? 1 : FG_STEPS[slice.index % FG_STEPS.length] ?? 1;
            const swatch = svg("rect", { x: listX, y: y - sw / 2, width: sw, height: sw, fill: isHighlight ? cssVar("accent") : cssVar("fg") });
            if (opacity < 1) swatch.setAttribute("fill-opacity", String(opacity));
            view.appendChild(swatch);
            const name = svg("text", { x: listX + sw + GAP * 0.6, y, "dominant-baseline": "central", fill: cssVar("fg") });
            name.textContent = slice.label || `Segment ${slice.index + 1}`;
            view.appendChild(name);
            const pct = svg("text", { x: w, y, "text-anchor": "end", "dominant-baseline": "central", fill: cssVar("muted") });
            pct.textContent = `${Math.round(slice.share * 100)}%`;
            view.appendChild(pct);
          });
        } else {
          for (const slice of slices) {
            if (!slice.label) continue;
            const sx = Math.sin(slice.mid);
            const r = outerR + GAP;
            const x = cx + r * sx;
            const y = cy - r * Math.cos(slice.mid);
            const anchor = sx > 0.2 ? "start" : sx < -0.2 ? "end" : "middle";
            const el = svg("text", { x, y, "text-anchor": anchor, "dominant-baseline": "central", fill: cssVar("muted") });
            el.textContent = slice.label;
            view.appendChild(el);
          }
        }
        if (props.center !== "none") {
          const text = props.center === "total" ? formatNumber(total) : `${Math.round((slices[highlightIndex]?.share ?? 0) * 100)}%`;
          const el = svg("text", {
            x: cx,
            y: cy,
            "text-anchor": "middle",
            "dominant-baseline": "central",
            "font-size": Math.max(12, innerR * 0.6),
            fill: cssVar("fg")
          });
          el.style.fontVariantNumeric = "tabular-nums";
          el.textContent = text;
          view.appendChild(el);
        }
      }
    }
    function drawGlyph() {
      const g = grid;
      if (!g) return;
      g.clear();
      const { cols, rows, cellWidth, cellHeight } = g;
      const colors = readPalette(host);
      const w = cols * cellWidth;
      const h = rows * cellHeight;
      const cx = w / 2;
      const cy = h / 2;
      const outerR = Math.min(w, h) / 2 - Math.max(cellWidth, cellHeight) * 0.5;
      const innerR = outerR * (1 - Math.max(0.05, Math.min(0.95, props.thickness)));
      const { slices, total } = buildSlices(props.data);
      const empty = slices.length === 0 || total <= 0;
      const highlightIndex = empty ? -1 : resolveHighlight(slices, props.highlight);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const dx = (col + 0.5) * cellWidth - cx;
          const dy = (row + 0.5) * cellHeight - cy;
          const dist = Math.hypot(dx, dy);
          if (dist < innerR || dist > outerR) continue;
          if (empty) {
            g.set(col, row, shade(1), colors.muted);
            continue;
          }
          const index = sliceAt(slices, (Math.atan2(dx, -dy) + TAU) % TAU);
          if (index < 0) continue;
          const isHighlight = index === highlightIndex;
          g.set(col, row, isHighlight ? shade(4) : shade(1 + index % 3), isHighlight ? colors.accent : colors.fg);
        }
      }
      g.flush();
    }
    function draw() {
      labelHost(host, props.label, "figure");
      renderTable();
      if (props.look === "glyph") {
        if (root) {
          resize?.disconnect();
          resize = null;
          root.remove();
          root = null;
        }
        if (!grid) grid = createGrid(host, gridOptions(), draw);
        drawGlyph();
      } else {
        if (grid) {
          grid.destroy();
          grid = null;
        }
        if (!root) {
          root = svg("svg", { "aria-hidden": "true", "data-pica": "" });
          root.style.cssText = "display:block;width:100%;height:100%";
          host.appendChild(root);
          resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => drawSvg()) : null;
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
        if (grid && props.fontFamily !== before.fontFamily) {
          grid.update(gridOptions());
          return;
        }
        draw();
      },
      destroy() {
        resize?.disconnect();
        resize = null;
        root?.remove();
        root = null;
        grid?.destroy();
        grid = null;
        table?.remove();
        table = null;
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
  var instance = PicaDonutChart.mount(host, take(window.PICA_PROPS || {}));
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
