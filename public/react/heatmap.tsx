"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Heatmap · heatmap
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

// lib/braille-plot.ts
/** A braille dot canvas. Each cell of a glyph grid holds two dots across and four down, so a plot draws at
 *  eight times a grid's resolution and still reads as text: it is how a scatter, a radar, or a gauge keeps
 *  the glyph look. The dot bits come from lib/blocks.ts, so the library keeps one braille table. */



interface BraillePlot {
  /** Dots across, which is two per cell. */
  readonly width: number;
  /** Dots down, which is four per cell. */
  readonly height: number;
  /** Raises the dot nearest (x, y) in dot space. A point outside the plot is dropped. */
  dot(x: number, y: number): void;
  /** Raises the dots along the straight line between two points in dot space, by Bresenham, so the line is
   *  the same one whichever end it is drawn from. */
  line(x0: number, y0: number, x1: number, y1: number): void;
  /** Lowers every dot. */
  clear(): void;
  /** Writes every cell as a braille glyph into `grid`, the plot's first cell at (col, row). A cell with no
   *  dots writes the blank braille glyph, which holds a cell's width, so the plot owns its rectangle. */
  paint(grid: Pick<Grid, "set">, col: number, row: number): void;
}

/** A plot `cols` cells wide and `rows` cells tall, which is twice that in dots across and four times it
 *  down. Dot space starts at the plot's top left. */
function createBraillePlot(cols: number, rows: number): BraillePlot {
  const w = Math.max(1, Math.floor(cols));
  const h = Math.max(1, Math.floor(rows));
  const bits = new Uint8Array(w * h);
  const plot: BraillePlot = {
    width: w * 2,
    height: h * 4,
    dot(x, y) {
      const dx = Math.round(x);
      const dy = Math.round(y);
      if (dx < 0 || dy < 0 || dx >= w * 2 || dy >= h * 4) return;
      const cell = (dy >> 2) * w + (dx >> 1);
      bits[cell] = (bits[cell] ?? 0) | brailleDot(dy & 3, dx & 1);
    },
    line(x0, y0, x1, y1) {
      let x = Math.round(x0);
      let y = Math.round(y0);
      const endX = Math.round(x1);
      const endY = Math.round(y1);
      const stepX = x < endX ? 1 : -1;
      const stepY = y < endY ? 1 : -1;
      const runX = Math.abs(endX - x);
      const runY = -Math.abs(endY - y);
      let error = runX + runY;
      for (;;) {
        plot.dot(x, y);
        if (x === endX && y === endY) return;
        const twice = error * 2;
        if (twice >= runY) {
          error += runY;
          x += stepX;
        }
        if (twice <= runX) {
          error += runX;
          y += stepY;
        }
      }
    },
    clear() {
      bits.fill(0);
    },
    paint(grid, col, row) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) grid.set(col + x, row + y, braille(bits[y * w + x] ?? 0));
      }
    },
  };
  return plot;
}

// lib/chart-plot.ts
/** Layout for a chart's glyph look. A glyph look lays out in cells, and a chart that reuses its SVG look's
 *  pixel math produces cell indices many times too large, so the picture overflows its frame or collapses
 *  into a corner. `chartCells` reserves the cells a chart's labels and axes need and hands back the
 *  rectangle that is left, addressed by fraction rather than by pixel. `chartDots` lays a braille plot over
 *  that rectangle for a chart that needs finer than one cell, such as a scatter, a radar, or a gauge. */




/** Cells to hold back for labels and axes, on each side of the drawing area. */
interface ChartInset {
  readonly left?: number;
  readonly right?: number;
  readonly top?: number;
  readonly bottom?: number;
}

/** The cell rectangle a chart draws into. */
interface ChartCells {
  /** Leftmost column of the area. */
  readonly col: number;
  /** Topmost row of the area. */
  readonly row: number;
  /** Width in cells, at least 1. */
  readonly cols: number;
  /** Height in cells, at least 1. */
  readonly rows: number;
  /** The column for `fx`, which is 0 at the area's left edge and 1 at its right. */
  colAt(fx: number): number;
  /** The row for `fy`, which is 0 at the area's bottom edge and 1 at its top, so a chart reads y up. */
  rowAt(fy: number): number;
}

/** The drawing area left inside `grid` once `inset` is held back. */
function chartCells(grid: Pick<Grid, "cols" | "rows">, inset: ChartInset = {}): ChartCells {
  const left = Math.max(0, Math.floor(inset.left ?? 0));
  const right = Math.max(0, Math.floor(inset.right ?? 0));
  const top = Math.max(0, Math.floor(inset.top ?? 0));
  const bottom = Math.max(0, Math.floor(inset.bottom ?? 0));
  const col = Math.min(left, Math.max(0, grid.cols - 1));
  const row = Math.min(top, Math.max(0, grid.rows - 1));
  const cols = Math.max(1, grid.cols - col - right);
  const rows = Math.max(1, grid.rows - row - bottom);
  const clamp = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
  return {
    col,
    row,
    cols,
    rows,
    colAt: (fx) => col + Math.round(clamp(fx) * (cols - 1)),
    rowAt: (fy) => row + rows - 1 - Math.round(clamp(fy) * (rows - 1)),
  };
}

/** A braille plot covering a `ChartCells` area, addressed by the same fractions. */
interface ChartDots {
  /** Dots across the area, which is two per cell. */
  readonly wide: number;
  /** Dots down the area, which is four per cell. */
  readonly tall: number;
  /** One dot's width over its height, so a chart can keep a circle round. */
  readonly aspect: number;
  /** The dot at `fx` across and `fy` up, both 0 to 1 over the area. */
  dotAt(fx: number, fy: number): readonly [number, number];
  /** Raises the dot at `fx`, `fy`. */
  mark(fx: number, fy: number): void;
  /** Raises the dots along the line between two fractional points. */
  stroke(fx0: number, fy0: number, fx1: number, fy1: number): void;
  /** Lowers every dot, so one plot can be reused for a second pass. */
  clear(): void;
  /** Writes the inked cells into `grid` in `color`. A blank cell is left as it is, so a track and a fill
   *  drawn as two plots layer instead of rubbing each other out. */
  paint(grid: Pick<Grid, "set">, color: string): void;
}

/** A braille plot over `area`. `cellAspect` is the grid's own `aspect`, a cell's width over its height. */
function chartDots(area: ChartCells, cellAspect: number): ChartDots {
  const plot = createBraillePlot(area.cols, area.rows);
  const blank = braille(0);
  const clamp = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
  const at = (fx: number, fy: number): readonly [number, number] => [
    Math.round(clamp(fx) * (plot.width - 1)),
    plot.height - 1 - Math.round(clamp(fy) * (plot.height - 1)),
  ];
  return {
    wide: plot.width,
    tall: plot.height,
    // A cell holds two dots across and four down, so a dot is half a cell wide and a quarter of one tall.
    aspect: (cellAspect / 2) / (1 / 4),
    dotAt: at,
    mark(fx, fy) {
      const [x, y] = at(fx, fy);
      plot.dot(x, y);
    },
    stroke(fx0, fy0, fx1, fy1) {
      const [x0, y0] = at(fx0, fy0);
      const [x1, y1] = at(fx1, fy1);
      plot.line(x0, y0, x1, y1);
    },
    clear() {
      plot.clear();
    },
    paint(grid, color) {
      plot.paint(
        {
          set: (x, y, glyph) => {
            if (glyph !== blank) grid.set(x, y, glyph, color);
          },
        },
        area.col,
        area.row,
      );
    },
  };
}

// lib/font.ts
/** The monospace stack glyph components default to. It lives in its own module, so a text component that
 *  never draws a grid does not carry lib/glyph-grid.ts into its single React file just for the font. */
const GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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

// registry/data/heatmap/core.ts
export interface HeatmapProps {
  /** Matrix data with rows, columns, and 2D values array. */
  data: { rows: string[]; columns: string[]; values: number[][] };
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** Number of distinct tone levels to display, from 2 to 8. */
  steps: number;
  /** Whether to highlight and label the highest value cell in accent. */
  highlight: boolean;
  /** Whether to show the stepped legend below the chart. */
  legend: boolean;
  /** "svg" draws hairline axes and filled rectangles. "glyph" draws cells in a monospace grid. */
  look: "svg" | "glyph";
  /** CSS font-family stack for every label. Must be monospace. */
  fontFamily: string;
}

export const defaults: HeatmapProps = {
  data: {
    rows: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    columns: ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"],
    values: [
      [2, 4, 6, 8, 9, 8, 6, 4, 2, 1, 1, 0],
      [1, 3, 5, 7, 9, 10, 8, 6, 4, 2, 1, 0],
      [1, 2, 4, 6, 8, 9, 7, 5, 3, 2, 1, 0],
      [2, 5, 8, 11, 13, 14, 12, 9, 6, 3, 2, 1],
      [3, 6, 10, 14, 16, 17, 15, 11, 7, 4, 2, 1],
      [1, 2, 3, 4, 5, 4, 3, 2, 1, 0, 0, 0],
      [0, 1, 2, 3, 4, 3, 2, 1, 0, 0, 0, 0],
    ],
  },
  label: "Commits by hour",
  steps: 5,
  highlight: true,
  legend: true,
  look: "svg",
  fontFamily: GRID_FONT,
};

export const mount: Mount<HeatmapProps> = (host, initial = {}) => {
  let props: HeatmapProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;

  /** Find the index and value of the maximum in the flattened data. */
  function maxIndex(data: { values?: number[][] }): [number, number, number] {
    let best = -1;
    let bestValue = Number.NEGATIVE_INFINITY;
    let bestR = 0;
    let bestC = 0;
    if (!data.values) return [best, bestR, bestC];
    data.values.forEach((row, r) => {
      if (!row) return;
      row.forEach((v, c) => {
        if (v > bestValue) {
          bestValue = v;
          best = r * row.length + c;
          bestR = r;
          bestC = c;
        }
      });
    });
    return [best, bestR, bestC];
  }

  /** Get the domain of all values. */
  function domainOf(data: { values?: number[][] }): [number, number] {
    const allValues: number[] = [];
    if (!data.values) return [0, 1];
    data.values.forEach((row) => {
      if (row) allValues.push(...row);
    });
    if (allValues.length === 0) return [0, 1];
    return extent(allValues);
  }

  function gridOptions(p: HeatmapProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: 0, lineHeight: 1, renderer: "canvas", color: "" };
  }

  function renderTable(): void {
    table?.remove();
    const data = props.data;
    const rows = (data.rows && data.rows.length > 0) ? data.rows : [""];
    const cols = (data.columns && data.columns.length > 0) ? data.columns : [""];
    const tableData: (string | number)[][] = [];

    // Header row
    tableData.push(["", ...cols]);

    // Data rows
    rows.forEach((r, i) => {
      const row = (data.values && data.values[i]) ? data.values[i] : [];
      tableData.push([r, ...row]);
    });

    table = dataTable(props.label || "Heatmap", [], tableData);
    host.appendChild(table);
  }

  function drawSvg(): void {
    const view = root;
    if (!view) return;
    while (view.firstChild) view.firstChild.remove();

    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const fontSize = 11;
    const data = props.data;
    const empty = !data.rows || !data.columns || !data.values || data.rows.length === 0 || data.columns.length === 0 || data.values.length === 0;

    view.setAttribute("viewBox", `0 0 ${w} ${h}`);
    view.setAttribute("font-family", props.fontFamily);
    view.setAttribute("font-size", String(fontSize));

    const rows = data.rows || [];
    const cols = data.columns || [];
    const [lo, hi] = domainOf(empty ? { values: [[0], [1]] } : data);
    const span = hi - lo || 1;
    const maxRowLabelChars = rows.length > 0 ? Math.max(1, ...rows.map((r) => r?.length ?? 0)) : 1;
    const maxColLabelChars = cols.length > 0 ? Math.max(1, ...cols.map((c) => c?.length ?? 0)) : 1;
    const cell = measureCell(props.fontFamily, fontSize, 1);

    const left = 12 + maxRowLabelChars * cell.w;
    const right = 8;
    const top = maxColLabelChars * cell.h + 20;
    const bottom = props.legend && !empty ? fontSize + 40 : 8;
    const chartLeft = left;
    const chartRight = Math.max(chartLeft + 1, w - right);
    const chartTop = top;
    const chartBottom = Math.max(chartTop + 1, h - bottom);

    if (empty) {
      const note = svg("text", {
        x: (chartLeft + chartRight) / 2,
        y: (chartTop + chartBottom) / 2,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        fill: cssVar("muted"),
      });
      note.textContent = "no data";
      view.appendChild(note);
    } else {
      const [, bestR, bestC] = props.highlight ? maxIndex(data) : [-1, -1, -1];
      const rowBands = bandScale(rows.length, [chartTop, chartBottom], 0);
      const colBands = bandScale(cols.length, [chartLeft, chartRight], 0);

      // Draw cells
      data.values.forEach((row, r) => {
        const y = rowBands.at(r);
        const rowHeight = rowBands.bandwidth;
        row.forEach((v, c) => {
          const x = colBands.at(c);
          const colWidth = colBands.bandwidth;
          const isHighest = props.highlight && r === bestR && c === bestC;
          const normalizedValue = (v - lo) / span;

          if (isHighest) {
            // Highest cell in accent
            view.appendChild(svg("rect", {
              x,
              y,
              width: colWidth,
              height: rowHeight,
              fill: cssVar("accent"),
            }));
            // Label with value on highest cell
            const valueLabel = svg("text", {
              x: x + colWidth / 2,
              y: y + rowHeight / 2,
              "text-anchor": "middle",
              "dominant-baseline": "middle",
              fill: cssVar("bg"),
              "font-size": "9",
            });
            valueLabel.textContent = formatNumber(v);
            view.appendChild(valueLabel);
          } else {
            // Regular cells: opacity-based tone
            const opacity = Math.max(0.1, normalizedValue);
            view.appendChild(svg("rect", {
              x,
              y,
              width: colWidth,
              height: rowHeight,
              fill: cssVar("fg"),
              opacity: String(opacity),
            }));
          }
        });
      });

      // Draw row labels
      rows.forEach((label, i) => {
        const y = rowBands.at(i) + rowBands.bandwidth / 2;
        const text = svg("text", {
          x: chartLeft - 6,
          y,
          "text-anchor": "end",
          "dominant-baseline": "middle",
          fill: cssVar("muted"),
        });
        text.textContent = label;
        view.appendChild(text);
      });

      // Draw column labels (rotated or positioned)
      cols.forEach((label, i) => {
        const x = colBands.at(i) + colBands.bandwidth / 2;
        const text = svg("text", {
          x,
          y: chartTop - 8,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          fill: cssVar("muted"),
        });
        text.textContent = label;
        view.appendChild(text);
      });

      // Draw frame
      view.appendChild(svg("line", {
        x1: chartLeft,
        y1: chartTop,
        x2: chartRight,
        y2: chartTop,
        stroke: cssVar("muted"),
        "stroke-width": 1,
      }));
      view.appendChild(svg("line", {
        x1: chartLeft,
        y1: chartBottom,
        x2: chartRight,
        y2: chartBottom,
        stroke: cssVar("muted"),
        "stroke-width": 1,
      }));
      view.appendChild(svg("line", {
        x1: chartLeft,
        y1: chartTop,
        x2: chartLeft,
        y2: chartBottom,
        stroke: cssVar("muted"),
        "stroke-width": 1,
      }));
      view.appendChild(svg("line", {
        x1: chartRight,
        y1: chartTop,
        x2: chartRight,
        y2: chartBottom,
        stroke: cssVar("muted"),
        "stroke-width": 1,
      }));

      // Draw key
      if (props.legend) {
        const keyY = chartBottom + 20;
        const keySteps = Math.min(props.steps, 8);
        const keyHeight = fontSize;
        const stepWidth = (chartRight - chartLeft) / keySteps;

        for (let i = 0; i < keySteps; i++) {
          const x = chartLeft + i * stepWidth;
          const value = lo + (span * (i + 0.5)) / keySteps;
          const opacity = Math.max(0.1, (i + 0.5) / keySteps);

          view.appendChild(svg("rect", {
            x,
            y: keyY,
            width: stepWidth,
            height: keyHeight,
            fill: cssVar("fg"),
            opacity: String(opacity),
          }));

          const label = svg("text", {
            x: x + stepWidth / 2,
            y: keyY + keyHeight + 10,
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            fill: cssVar("muted"),
            "font-size": "9",
          });
          label.textContent = formatNumber(value);
          view.appendChild(label);
        }
      }
    }

    host.dataset.picaReady = "true";
  }

  function drawGlyph(): void {
    const g = grid;
    if (!g) return;
    g.clear();
    const { cols, rows } = g;
    const data = props.data;
    const colors = readPalette(host);

    const rowLabels = data.rows ?? [];
    const colLabels = data.columns ?? [];
    const values = data.values ?? [];

    if (rowLabels.length === 0 || colLabels.length === 0 || values.length === 0) {
      const note = "no data";
      const x = Math.max(0, Math.floor((cols - note.length) / 2));
      const y = Math.floor(rows / 2);
      g.write(x, y, note, colors.muted);
      g.flush();
      host.dataset.picaReady = "true";
      return;
    }

    const [, bestR, bestC] = props.highlight ? maxIndex(data) : [-1, -1, -1];
    const rowCount = rowLabels.length;
    const colCount = colLabels.length;
    const [lo, hi] = domainOf(data);
    const span = hi - lo || 1;

    // One column of cells per row label, plus a gap, on the left. One row of cells for the column
    // labels, on top. What is left is the matrix, addressed in whole grid cells.
    const labelWidth = Math.max(1, ...rowLabels.map((label) => label.length));
    const area = chartCells(g, { left: labelWidth + 1, top: 1 });
    const cellWidth = Math.max(1, Math.floor(area.cols / colCount));
    const cellHeight = Math.max(1, Math.floor(area.rows / rowCount));
    const usedCols = cellWidth * colCount;
    const usedRows = cellHeight * rowCount;
    const originCol = area.col + Math.max(0, Math.floor((area.cols - usedCols) / 2));
    const originRow = area.row + Math.max(0, Math.floor((area.rows - usedRows) / 2));

    // Draw column labels
    colLabels.forEach((label, c) => {
      const x0 = originCol + c * cellWidth;
      const text = label.slice(0, cellWidth);
      const pad = Math.max(0, Math.floor((cellWidth - text.length) / 2));
      g.write(x0 + pad, 0, text, colors.muted);
    });

    // Draw row labels
    rowLabels.forEach((label, r) => {
      const y = originRow + r * cellHeight + Math.floor(cellHeight / 2);
      const text = label.slice(0, labelWidth);
      const pad = Math.max(0, labelWidth - text.length);
      g.write(pad, y, text, colors.muted);
    });

    // Draw cells
    values.forEach((row, r) => {
      const y0 = originRow + r * cellHeight;
      row.forEach((v, c) => {
        const x0 = originCol + c * cellWidth;
        const normalizedValue = (v - lo) / span;
        const isHighest = props.highlight && r === bestR && c === bestC;

        const tint = isHighest ? colors.accent : colors.fg;
        const glyphLevel = Math.min(8, Math.max(0, Math.round(normalizedValue * 8)));
        const glyph = shade(glyphLevel);

        for (let ry = 0; ry < cellHeight; ry++) {
          const cy = y0 + ry;
          for (let rx = 0; rx < cellWidth; rx++) {
            g.set(x0 + rx, cy, glyph, tint);
          }
        }

        // Label highest cell
        if (isHighest) {
          const valueLabel = formatNumber(v).slice(0, cellWidth);
          const vpad = Math.max(0, Math.floor((cellWidth - valueLabel.length) / 2));
          g.write(x0 + vpad, y0 + Math.floor(cellHeight / 2), valueLabel, colors.accent);
        }
      });
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
      grid = createGrid(host, gridOptions(props), drawGlyph);
    } else {
      root = svg("svg", { "data-pica": "", "aria-hidden": "true" });
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
      if (props.label !== before.label) labelHost(host, props.label, "figure");
      if (props.label !== before.label || !sameJson(props.data, before.data)) renderTable();
      if (props.look !== before.look) {
        unmountView();
        mountView();
      } else if (grid && props.fontFamily !== before.fontFamily) {
        grid.update(gridOptions(props));
      }
      draw();
    },
    destroy() {
      unmountView();
      table?.remove();
      table = null;
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/data/heatmap/index.tsx
export type HeatmapComponentProps = Partial<HeatmapProps> & WrapperProps;

/** A matrix of values displayed as tone-stepped cells with row and column labels. */
export function Heatmap({ className, style, palette, ...props }: HeatmapComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
