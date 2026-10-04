# Scroll Ruler

> A measured local scroll ruler shows position and extent, with pixel or percent ticks and pointer and keyboard seeking.

Category: motion. Tags: scroll, ruler, progress, ticks, local, keyboard. Static. Size: 3.1 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/scroll-ruler.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `orientation` | "vertical" \| "horizontal" | `"vertical"` | Axis measured and controlled within this host's own scrollable content. |
| `unit` | "px" \| "percent" | `"px"` | Tick and readout units: local CSS pixels or percentage of the available scroll range. |
| `label` | string | `"Local scroll position"` | Accessible name for the local scroll container and its ruler. |
| `tickStep` | number | `100` | Major tick interval in the chosen unit; crowded labels use integer multiples of this step. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `positionChange` | `onPositionChange` | `{ position: number; extent: number; progress: number }` | Actual local position and extent in CSS pixels, plus normalized progress; emitted after scrolling input. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Scroll Ruler · scroll-ruler
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

// registry/motion/scroll-ruler/core.ts
export interface ScrollRulerProps {
  /** Axis measured and controlled within this host's own scrollable content. */
  orientation: "vertical" | "horizontal";
  /** Tick and readout units: local CSS pixels or percentage of the available scroll range. */
  unit: "px" | "percent";
  /** Accessible name for the local scroll container and its ruler. */
  label: string;
  /** Major tick interval in the chosen unit; crowded labels use integer multiples of this step. */
  tickStep: number;
}

export interface ScrollRulerEvents {
  /** Actual local position and extent in CSS pixels, plus normalized progress; emitted after scrolling input. */
  positionChange: { position: number; extent: number; progress: number };
}

export const defaults: ScrollRulerProps = {
  orientation: "vertical",
  unit: "px",
  label: "Local scroll position",
  tickStep: 100,
};

type ScrollRulerMeasure = { position: number; extent: number; viewport: number; progress: number };

export const mount: Mount<ScrollRulerProps> = (host, initial = {}) => {
  let props: ScrollRulerProps = { ...defaults, ...initial };
  let alive = true;
  let graphic: SVGSVGElement | null = null;
  let trackStart = 0;
  let trackLength = 1;
  let lastPosition = 0;
  let lastExtent = 0;
  const initialTop = host.scrollTop, initialLeft = host.scrollLeft;
  const attrs = hostAttributes(host);
  const restore = styleHost(host, {
    ...(getComputedStyle(host).position === "static" ? { position: "relative" } : {}),
    overflow: "auto",
  });
  const emit = emitter<ScrollRulerEvents>(host);
  const hostId = host.id || nextId("scroll-ruler-host");
  if (!host.id) attrs.set("id", hostId);
  const ruler = document.createElement("div");
  ruler.setAttribute("data-pica", "");
  ruler.setAttribute("data-scroll-ruler", "");
  ruler.setAttribute("role", "scrollbar");
  ruler.setAttribute("tabindex", "0");
  ruler.setAttribute("aria-controls", hostId);
  ruler.style.cssText = `position:absolute;top:0;left:0;z-index:1;box-sizing:border-box;overflow:hidden;cursor:pointer;font-family:${GRID_FONT};color:${cssVar("fg")};background:${cssVar("bg")};touch-action:auto`;
  host.appendChild(ruler);

  function vertical(): boolean { return props.orientation !== "horizontal"; }

  function measure(): ScrollRulerMeasure {
    const viewport = vertical() ? host.clientHeight : host.clientWidth;
    const extent = Math.max(0, (vertical() ? host.scrollHeight : host.scrollWidth) - viewport);
    const raw = vertical() ? host.scrollTop : host.scrollLeft;
    const position = Math.max(0, Math.min(extent, Number.isFinite(raw) ? raw : 0));
    return { position, extent, viewport, progress: extent ? position / extent : 0 };
  }

  function tickStep(): number {
    const raw = Number.isFinite(props.tickStep) ? props.tickStep : defaults.tickStep;
    return Math.max(props.unit === "percent" ? 0.1 : 1, Math.min(100000, raw));
  }

  function text(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded}${props.unit === "percent" ? "%" : "px"}`;
  }

  function accessible(): void {
    attrs.set("role", "group");
    attrs.set("aria-label", props.label || null);
    attrs.set("tabindex", "0");
    ruler.setAttribute("aria-label", props.label || "Local scroll position");
    ruler.setAttribute("aria-orientation", vertical() ? "vertical" : "horizontal");
  }

  function draw(): ScrollRulerMeasure {
    const state = measure();
    if (!alive) return state;
    const isVertical = vertical();
    const width = Math.max(1, isVertical ? Math.min(100, host.clientWidth) : host.clientWidth);
    const height = Math.max(1, isVertical ? host.clientHeight : Math.min(70, host.clientHeight));
    ruler.style.width = `${width}px`;
    ruler.style.height = `${height}px`;
    // Compensate for this local container's offset. The overlay occupies at most its viewport,
    // so it cannot add an artificial main-axis scroll range while following that viewport.
    ruler.style.transform = `translate(${host.scrollLeft + (isVertical ? Math.max(0, host.clientWidth - width) : 0)}px,${host.scrollTop}px)`;
    ruler.setAttribute("aria-valuemin", "0");
    ruler.setAttribute("aria-valuemax", String(Math.round(state.extent)));
    ruler.setAttribute("aria-valuenow", String(Math.round(state.position)));
    ruler.setAttribute("aria-valuetext", `${Math.round(state.position)} pixels of ${Math.round(state.extent)} pixels, ${Math.round(state.progress * 100)} percent`);
    const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}`, "font-family": GRID_FONT, "font-size": 10 });
    root.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
    trackStart = isVertical ? 40 : 16;
    trackLength = Math.max(1, (isVertical ? height - 62 : width - 32));
    function line(x1: number, y1: number, x2: number, y2: number, token: "fg" | "muted" | "accent", strokeWidth = 1): void {
      root.appendChild(svg("line", { "data-pica": "", x1, y1, x2, y2, stroke: cssVar(token), "stroke-width": strokeWidth }));
    }
    function label(x: number, y: number, content: string, anchor = "start", token: "fg" | "muted" = "fg"): void {
      const node = svg("text", { "data-pica": "", x, y, fill: cssVar(token), "text-anchor": anchor });
      node.textContent = content;
      root.appendChild(node);
    }
    const end = trackStart + trackLength;
    if (isVertical) line(14, trackStart, 14, end, "muted");
    else line(trackStart, 36, end, 36, "muted");
    const range = props.unit === "percent" ? state.extent ? 100 : 0 : state.extent;
    const current = props.unit === "percent" ? state.progress * 100 : state.position;
    const step = tickStep();
    const maximumLabels = Math.max(1, Math.floor(trackLength / (isVertical ? 42 : 76)));
    const major = step * Math.max(1, Math.ceil(range / step / maximumLabels));
    const minor = major / 5;
    const ticks = range ? Math.min(200, Math.floor(range / minor)) : 0;
    for (let i = 0; i <= ticks; i++) {
      const value = i * minor;
      const at = trackStart + (range ? value / range * trackLength : 0);
      const isMajor = i % 5 === 0;
      if (isVertical) {
        line(14, at, isMajor ? 27 : 20, at, isMajor ? "fg" : "muted");
        if (isMajor && (value === 0 || range - value > major * 0.32)) label(32, at + 3, text(value), "start", "muted");
      } else {
        line(at, 36, at, isMajor ? 46 : 41, isMajor ? "fg" : "muted");
        if (isMajor && (value === 0 || range - value > major * 0.32)) label(at, 59, text(value), value === 0 ? "start" : "middle", "muted");
      }
    }
    if (range) {
      if (isVertical) { line(14, end, 27, end, "fg"); label(32, end + 3, text(range), "start", "muted"); }
      else { line(end, 36, end, 46, "fg"); label(end, 59, text(range), "end", "muted"); }
    }
    const indicator = trackStart + state.progress * trackLength;
    if (isVertical) {
      line(5, indicator, 27, indicator, "accent", 3);
      label(8, 15, text(current));
      label(8, 28, `/ ${text(range)}`, "start", "muted");
    } else {
      line(indicator, 28, indicator, 46, "accent", 3);
      label(16, 17, `${text(current)} / ${text(range)}`);
      label(width - 16, 17, `${Math.round(state.progress * 100)}%`, "end", "muted");
    }
    graphic?.remove();
    graphic = root;
    ruler.appendChild(root);
    attrs.set("data-pica-ready", "true");
    return state;
  }

  function report(state: ScrollRulerMeasure): void {
    if (Math.abs(state.position - lastPosition) < 0.01 && state.extent === lastExtent) return;
    lastPosition = state.position;
    lastExtent = state.extent;
    emit("positionChange", { position: state.position, extent: state.extent, progress: state.progress });
  }

  function seek(position: number): void {
    const state = measure();
    const next = Math.max(0, Math.min(state.extent, position));
    if (vertical()) host.scrollTop = next;
    else host.scrollLeft = next;
    report(draw());
  }

  const onScroll = (): void => { if (alive) report(draw()); };
  const onKey = (event: KeyboardEvent): void => {
    if (event.target !== ruler && event.target !== host) return;
    const state = measure();
    const step = props.unit === "percent" ? state.extent * tickStep() / 100 : tickStep();
    let position: number;
    switch (event.key) {
      case "Home": position = 0; break;
      case "End": position = state.extent; break;
      case "PageDown": position = state.position + state.viewport * 0.9; break;
      case "PageUp": position = state.position - state.viewport * 0.9; break;
      case "ArrowDown": if (!vertical()) return; position = state.position + step; break;
      case "ArrowUp": if (!vertical()) return; position = state.position - step; break;
      case "ArrowRight": if (vertical()) return; position = state.position + step; break;
      case "ArrowLeft": if (vertical()) return; position = state.position - step; break;
      default: return;
    }
    event.preventDefault();
    seek(position);
  };
  const onClick = (event: MouseEvent): void => {
    ruler.focus({ preventScroll: true });
    const rect = ruler.getBoundingClientRect();
    const coordinate = vertical() ? event.clientY - rect.top : event.clientX - rect.left;
    if (coordinate < trackStart - 8 || coordinate > trackStart + trackLength + 8) return;
    const progress = Math.max(0, Math.min(1, (coordinate - trackStart) / trackLength));
    seek(measure().extent * progress);
  };
  const refresh = (): void => {
    if (!alive) return;
    const state = draw();
    // Layout and prop changes are observations, never input events.
    lastPosition = state.position;
    lastExtent = state.extent;
  };
  host.addEventListener("scroll", onScroll, { passive: true });
  host.addEventListener("keydown", onKey);
  ruler.addEventListener("click", onClick);
  host.addEventListener("load", refresh, true);
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(refresh) : null;
  function observeContent(): void {
    resize?.disconnect();
    resize?.observe(host);
    for (const child of Array.from(host.children)) if (child !== ruler) resize?.observe(child);
  }
  const mutations = typeof MutationObserver === "function" ? new MutationObserver((records) => {
    if (!alive || !records.some((record) => record.target !== ruler && !ruler.contains(record.target))) return;
    observeContent();
    refresh();
  }) : null;
  accessible();
  refresh();
  observeContent();
  mutations?.observe(host, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["style", "class", "hidden", "src", "width", "height"] });
  document.fonts.addEventListener("loadingdone", refresh);

  return {
    update(next) {
      if (!alive) return;
      props = { ...props, ...next };
      accessible();
      refresh();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      mutations?.disconnect();
      resize?.disconnect();
      host.removeEventListener("scroll", onScroll);
      host.removeEventListener("keydown", onKey);
      ruler.removeEventListener("click", onClick);
      host.removeEventListener("load", refresh, true);
      document.fonts.removeEventListener("loadingdone", refresh);
      ruler.remove();
      graphic = null;
      attrs.restore();
      restore();
      host.scrollTop = initialTop;
      host.scrollLeft = initialLeft;
    },
  };
};

// registry/motion/scroll-ruler/index.tsx
export type ScrollRulerComponentProps = Partial<ScrollRulerProps> & WrapperProps & Handlers<ScrollRulerEvents> & { children?: ReactNode };

/** A measured ruler for this container's own scroll range, with pointer and keyboard seeking. */
export function ScrollRuler({ className, style, palette, children, ...props }: ScrollRulerComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Scroll Ruler · scroll-ruler
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Scroll Ruler · Pica</title>
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
<div id="pica"><pre>000  ┼────┼────┼────┼────┼────┼────┼────┼────
001  │    │    │    │    │    │    │    │    
002  │    │    │    │    │    │    │    │    
003  │    │    │    │    │    │    │    │    
004  │    │    │    │    │    │    │    │    
005  ┼────┼────┼────┼────┼────┼────┼────┼────
006  │    │    │    │    │    │    │    │    
007  │    │    │    │    │    │    │    │    
008  │    │    │    │    │    │    │    │    
009  │    │    │    │    │    │    │    │    
010  ┼────┼────┼────┼────┼────┼────┼────┼────
011  │    │    │    │    │    │    │    │    
012  │    │    │    │    │    │    │    │    
013  │    │    │    │    │    │    │    │    
014  │    │    │    │    │    │    │    │    
015  ┼────┼────┼────┼────┼────┼────┼────┼────
016  │    │    │    │    │    │    │    │    
017  │    │    │    │    │    │    │    │    
018  │    │    │    │    │    │    │    │    
019  │    │    │    │    │    │    │    │    
020  ┼────┼────┼────┼────┼────┼────┼────┼────
021  │    │    │    │    │    │    │    │    
022  │    │    │    │    │    │    │    │    
023  │    │    │    │    │    │    │    │    
024  │    │    │    │    │    │    │    │    
025  ┼────┼────┼────┼────┼────┼────┼────┼────
026  │    │    │    │    │    │    │    │    
027  │    │    │    │    │    │    │    │    
028  │    │    │    │    │    │    │    │    
029  │    │    │    │    │    │    │    │    
030  ┼────┼────┼────┼────┼────┼────┼────┼────
031  │    │    │    │    │    │    │    │    
032  │    │    │    │    │    │    │    │    
033  │    │    │    │    │    │    │    │    
034  │    │    │    │    │    │    │    │    
035  ┼────┼────┼────┼────┼────┼────┼────┼────
036  │    │    │    │    │    │    │    │    
037  │    │    │    │    │    │    │    │    
038  │    │    │    │    │    │    │    │    
039  │    │    │    │    │    │    │    │    
040  ┼────┼────┼────┼────┼────┼────┼────┼────
041  │    │    │    │    │    │    │    │    
042  │    │    │    │    │    │    │    │    
043  │    │    │    │    │    │    │    │    
044  │    │    │    │    │    │    │    │    
045  ┼────┼────┼────┼────┼────┼────┼────┼────
046  │    │    │    │    │    │    │    │    
047  │    │    │    │    │    │    │    │    
048  │    │    │    │    │    │    │    │    
049  │    │    │    │    │    │    │    │    
050  ┼────┼────┼────┼────┼────┼────┼────┼────
051  │    │    │    │    │    │    │    │    
052  │    │    │    │    │    │    │    │    
053  │    │    │    │    │    │    │    │    
054  │    │    │    │    │    │    │    │    
055  ┼────┼────┼────┼────┼────┼────┼────┼────
056  │    │    │    │    │    │    │    │    
057  │    │    │    │    │    │    │    │    
058  │    │    │    │    │    │    │    │    
059  │    │    │    │    │    │    │    │    
060  ┼────┼────┼────┼────┼────┼────┼────┼────
061  │    │    │    │    │    │    │    │    
062  │    │    │    │    │    │    │    │    
063  │    │    │    │    │    │    │    │    
064  │    │    │    │    │    │    │    │    
065  ┼────┼────┼────┼────┼────┼────┼────┼────
066  │    │    │    │    │    │    │    │    
067  │    │    │    │    │    │    │    │    
068  │    │    │    │    │    │    │    │    
069  │    │    │    │    │    │    │    │    
070  ┼────┼────┼────┼────┼────┼────┼────┼────
071  │    │    │    │    │    │    │    │    
072  │    │    │    │    │    │    │    │    
073  │    │    │    │    │    │    │    │    
074  │    │    │    │    │    │    │    │    
075  ┼────┼────┼────┼────┼────┼────┼────┼────
076  │    │    │    │    │    │    │    │    
077  │    │    │    │    │    │    │    │    
078  │    │    │    │    │    │    │    │    
079  │    │    │    │    │    │    │    │    
080  ┼────┼────┼────┼────┼────┼────┼────┼────
081  │    │    │    │    │    │    │    │    
082  │    │    │    │    │    │    │    │    
083  │    │    │    │    │    │    │    │    
084  │    │    │    │    │    │    │    │    
085  ┼────┼────┼────┼────┼────┼────┼────┼────
086  │    │    │    │    │    │    │    │    
087  │    │    │    │    │    │    │    │    
088  │    │    │    │    │    │    │    │    
089  │    │    │    │    │    │    │    │    
090  ┼────┼────┼────┼────┼────┼────┼────┼────
091  │    │    │    │    │    │    │    │    
092  │    │    │    │    │    │    │    │    
093  │    │    │    │    │    │    │    │    
094  │    │    │    │    │    │    │    │    
095  ┼────┼────┼────┼────┼────┼────┼────┼────
096  │    │    │    │    │    │    │    │    
097  │    │    │    │    │    │    │    │    
098  │    │    │    │    │    │    │    │    
099  │    │    │    │    │    │    │    │    </pre></div>
<script>
"use strict";
var PicaScrollRuler = (() => {
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

  // registry/motion/scroll-ruler/core.ts
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
  var TOKEN_FALLBACK = {
    fg: "currentColor",
    bg: "transparent",
    accent: "#13C4A3",
    muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)"
  };
  function cssVar(token) {
    return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
  }

  // registry/motion/scroll-ruler/core.ts
  var defaults = {
    orientation: "vertical",
    unit: "px",
    label: "Local scroll position",
    tickStep: 100
  };
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let alive = true;
    let graphic = null;
    let trackStart = 0;
    let trackLength = 1;
    let lastPosition = 0;
    let lastExtent = 0;
    const initialTop = host.scrollTop, initialLeft = host.scrollLeft;
    const attrs = hostAttributes(host);
    const restore = styleHost(host, {
      ...getComputedStyle(host).position === "static" ? { position: "relative" } : {},
      overflow: "auto"
    });
    const emit = emitter(host);
    const hostId = host.id || nextId("scroll-ruler-host");
    if (!host.id) attrs.set("id", hostId);
    const ruler = document.createElement("div");
    ruler.setAttribute("data-pica", "");
    ruler.setAttribute("data-scroll-ruler", "");
    ruler.setAttribute("role", "scrollbar");
    ruler.setAttribute("tabindex", "0");
    ruler.setAttribute("aria-controls", hostId);
    ruler.style.cssText = `position:absolute;top:0;left:0;z-index:1;box-sizing:border-box;overflow:hidden;cursor:pointer;font-family:${GRID_FONT};color:${cssVar("fg")};background:${cssVar("bg")};touch-action:auto`;
    host.appendChild(ruler);
    function vertical() {
      return props.orientation !== "horizontal";
    }
    function measure() {
      const viewport = vertical() ? host.clientHeight : host.clientWidth;
      const extent = Math.max(0, (vertical() ? host.scrollHeight : host.scrollWidth) - viewport);
      const raw = vertical() ? host.scrollTop : host.scrollLeft;
      const position = Math.max(0, Math.min(extent, Number.isFinite(raw) ? raw : 0));
      return { position, extent, viewport, progress: extent ? position / extent : 0 };
    }
    function tickStep() {
      const raw = Number.isFinite(props.tickStep) ? props.tickStep : defaults.tickStep;
      return Math.max(props.unit === "percent" ? 0.1 : 1, Math.min(1e5, raw));
    }
    function text(value) {
      const rounded = Math.round(value * 10) / 10;
      return `${rounded}${props.unit === "percent" ? "%" : "px"}`;
    }
    function accessible() {
      attrs.set("role", "group");
      attrs.set("aria-label", props.label || null);
      attrs.set("tabindex", "0");
      ruler.setAttribute("aria-label", props.label || "Local scroll position");
      ruler.setAttribute("aria-orientation", vertical() ? "vertical" : "horizontal");
    }
    function draw() {
      const state = measure();
      if (!alive) return state;
      const isVertical = vertical();
      const width = Math.max(1, isVertical ? Math.min(100, host.clientWidth) : host.clientWidth);
      const height = Math.max(1, isVertical ? host.clientHeight : Math.min(70, host.clientHeight));
      ruler.style.width = `${width}px`;
      ruler.style.height = `${height}px`;
      ruler.style.transform = `translate(${host.scrollLeft + (isVertical ? Math.max(0, host.clientWidth - width) : 0)}px,${host.scrollTop}px)`;
      ruler.setAttribute("aria-valuemin", "0");
      ruler.setAttribute("aria-valuemax", String(Math.round(state.extent)));
      ruler.setAttribute("aria-valuenow", String(Math.round(state.position)));
      ruler.setAttribute("aria-valuetext", `${Math.round(state.position)} pixels of ${Math.round(state.extent)} pixels, ${Math.round(state.progress * 100)} percent`);
      const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}`, "font-family": GRID_FONT, "font-size": 10 });
      root.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
      trackStart = isVertical ? 40 : 16;
      trackLength = Math.max(1, isVertical ? height - 62 : width - 32);
      function line(x1, y1, x2, y2, token, strokeWidth = 1) {
        root.appendChild(svg("line", { "data-pica": "", x1, y1, x2, y2, stroke: cssVar(token), "stroke-width": strokeWidth }));
      }
      function label(x, y, content, anchor = "start", token = "fg") {
        const node = svg("text", { "data-pica": "", x, y, fill: cssVar(token), "text-anchor": anchor });
        node.textContent = content;
        root.appendChild(node);
      }
      const end = trackStart + trackLength;
      if (isVertical) line(14, trackStart, 14, end, "muted");
      else line(trackStart, 36, end, 36, "muted");
      const range = props.unit === "percent" ? state.extent ? 100 : 0 : state.extent;
      const current = props.unit === "percent" ? state.progress * 100 : state.position;
      const step = tickStep();
      const maximumLabels = Math.max(1, Math.floor(trackLength / (isVertical ? 42 : 76)));
      const major = step * Math.max(1, Math.ceil(range / step / maximumLabels));
      const minor = major / 5;
      const ticks = range ? Math.min(200, Math.floor(range / minor)) : 0;
      for (let i = 0; i <= ticks; i++) {
        const value = i * minor;
        const at = trackStart + (range ? value / range * trackLength : 0);
        const isMajor = i % 5 === 0;
        if (isVertical) {
          line(14, at, isMajor ? 27 : 20, at, isMajor ? "fg" : "muted");
          if (isMajor && (value === 0 || range - value > major * 0.32)) label(32, at + 3, text(value), "start", "muted");
        } else {
          line(at, 36, at, isMajor ? 46 : 41, isMajor ? "fg" : "muted");
          if (isMajor && (value === 0 || range - value > major * 0.32)) label(at, 59, text(value), value === 0 ? "start" : "middle", "muted");
        }
      }
      if (range) {
        if (isVertical) {
          line(14, end, 27, end, "fg");
          label(32, end + 3, text(range), "start", "muted");
        } else {
          line(end, 36, end, 46, "fg");
          label(end, 59, text(range), "end", "muted");
        }
      }
      const indicator = trackStart + state.progress * trackLength;
      if (isVertical) {
        line(5, indicator, 27, indicator, "accent", 3);
        label(8, 15, text(current));
        label(8, 28, `/ ${text(range)}`, "start", "muted");
      } else {
        line(indicator, 28, indicator, 46, "accent", 3);
        label(16, 17, `${text(current)} / ${text(range)}`);
        label(width - 16, 17, `${Math.round(state.progress * 100)}%`, "end", "muted");
      }
      graphic?.remove();
      graphic = root;
      ruler.appendChild(root);
      attrs.set("data-pica-ready", "true");
      return state;
    }
    function report(state) {
      if (Math.abs(state.position - lastPosition) < 0.01 && state.extent === lastExtent) return;
      lastPosition = state.position;
      lastExtent = state.extent;
      emit("positionChange", { position: state.position, extent: state.extent, progress: state.progress });
    }
    function seek(position) {
      const state = measure();
      const next = Math.max(0, Math.min(state.extent, position));
      if (vertical()) host.scrollTop = next;
      else host.scrollLeft = next;
      report(draw());
    }
    const onScroll = () => {
      if (alive) report(draw());
    };
    const onKey = (event) => {
      if (event.target !== ruler && event.target !== host) return;
      const state = measure();
      const step = props.unit === "percent" ? state.extent * tickStep() / 100 : tickStep();
      let position;
      switch (event.key) {
        case "Home":
          position = 0;
          break;
        case "End":
          position = state.extent;
          break;
        case "PageDown":
          position = state.position + state.viewport * 0.9;
          break;
        case "PageUp":
          position = state.position - state.viewport * 0.9;
          break;
        case "ArrowDown":
          if (!vertical()) return;
          position = state.position + step;
          break;
        case "ArrowUp":
          if (!vertical()) return;
          position = state.position - step;
          break;
        case "ArrowRight":
          if (vertical()) return;
          position = state.position + step;
          break;
        case "ArrowLeft":
          if (vertical()) return;
          position = state.position - step;
          break;
        default:
          return;
      }
      event.preventDefault();
      seek(position);
    };
    const onClick = (event) => {
      ruler.focus({ preventScroll: true });
      const rect = ruler.getBoundingClientRect();
      const coordinate = vertical() ? event.clientY - rect.top : event.clientX - rect.left;
      if (coordinate < trackStart - 8 || coordinate > trackStart + trackLength + 8) return;
      const progress = Math.max(0, Math.min(1, (coordinate - trackStart) / trackLength));
      seek(measure().extent * progress);
    };
    const refresh = () => {
      if (!alive) return;
      const state = draw();
      lastPosition = state.position;
      lastExtent = state.extent;
    };
    host.addEventListener("scroll", onScroll, { passive: true });
    host.addEventListener("keydown", onKey);
    ruler.addEventListener("click", onClick);
    host.addEventListener("load", refresh, true);
    const resize = typeof ResizeObserver === "function" ? new ResizeObserver(refresh) : null;
    function observeContent() {
      resize?.disconnect();
      resize?.observe(host);
      for (const child of Array.from(host.children)) if (child !== ruler) resize?.observe(child);
    }
    const mutations = typeof MutationObserver === "function" ? new MutationObserver((records) => {
      if (!alive || !records.some((record) => record.target !== ruler && !ruler.contains(record.target))) return;
      observeContent();
      refresh();
    }) : null;
    accessible();
    refresh();
    observeContent();
    mutations?.observe(host, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["style", "class", "hidden", "src", "width", "height"] });
    document.fonts.addEventListener("loadingdone", refresh);
    return {
      update(next) {
        if (!alive) return;
        props = { ...props, ...next };
        accessible();
        refresh();
      },
      destroy() {
        if (!alive) return;
        alive = false;
        mutations?.disconnect();
        resize?.disconnect();
        host.removeEventListener("scroll", onScroll);
        host.removeEventListener("keydown", onKey);
        ruler.removeEventListener("click", onClick);
        host.removeEventListener("load", refresh, true);
        document.fonts.removeEventListener("loadingdone", refresh);
        ruler.remove();
        graphic = null;
        attrs.restore();
        restore();
        host.scrollTop = initialTop;
        host.scrollLeft = initialLeft;
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
  var instance = PicaScrollRuler.mount(host, take(initial));
  ["positionChange"].forEach(function (name) {
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
