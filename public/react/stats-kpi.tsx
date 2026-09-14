"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Stats KPI · stats-kpi
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

// registry/sections/stats-kpi/core.ts
export interface StatItem {
  /** Name shown under the value. */
  label: string;
  /** The number the stat counts up to. */
  value: number;
  /** Text shown right after the formatted value, such as "%" or "KB". Empty shows none. */
  unit: string;
  /** Percent change from the previous period, drawn with an up or down glyph. Null hides the delta. */
  delta: number | null;
  /** Recent values for the inline sparkline, oldest first. Empty hides the sparkline. */
  trend: number[];
}

export interface StatsKpiProps extends MotionProps {
  /** Stats to show, in order. */
  items: StatItem[];
  /** Columns at the widest size, from 1 to 6. A narrower host wraps to fewer. */
  columns: number;
  /** Index into items whose delta draws in the accent color. -1 highlights none. */
  highlight: number;
  /** Counts each value up from zero once, over duration, when true. False shows final values at once. */
  countUp: boolean;
  /** Milliseconds the count-up takes. */
  duration: number;
}

export const defaults: StatsKpiProps = {
  items: [
    { label: "Components", value: 29, unit: "", delta: null, trend: [14, 16, 18, 19, 21, 23, 26, 29] },
    { label: "Weekly installs", value: 1840, unit: "", delta: 12, trend: [900, 1020, 1150, 1300, 1420, 1560, 1700, 1840] },
    { label: "Median size", value: 3.9, unit: "KB", delta: null, trend: [4.6, 4.4, 4.3, 4.1, 4, 4, 3.95, 3.9] },
    { label: "Median verify", value: 41, unit: "s", delta: -8, trend: [58, 55, 52, 49, 47, 45, 43, 41] },
  ],
  columns: 4,
  highlight: 1,
  countUp: true,
  duration: 900,
  paused: false,
  time: null,
  seed: 1,
};

/** Eased progress from 0 to 1 for a count that starts at animation time 0 and finishes at `duration`. A pure
 *  function of its inputs, so the same time and duration always give the same progress. */
function countProgress(t: number, duration: number): number {
  if (duration <= 0) return 1;
  const linear = Math.min(1, Math.max(0, t / duration));
  return 1 - (1 - linear) ** 3;
}

/** The number to show for `item` at animation time `t`. A pure function of time: a fixed time always gives
 *  the same number, which is what makes captures and the parity check reproducible. */
function displayValue(item: StatItem, countUp: boolean, t: number, duration: number): number {
  return countUp ? item.value * countProgress(t, duration) : item.value;
}

/** A figure with at most one decimal place, dropped when the value is whole. */
function formatFigure(value: number): string {
  return formatNumber(value, { decimals: 1 });
}

/** The settled text assistive technology reads for one stat's value: the figure, and its unit when it has one. */
function finalText(item: StatItem): string {
  const figure = formatFigure(item.value);
  return item.unit ? `${figure} ${item.unit}` : figure;
}

/** The delta row: an up or down glyph, hidden from assistive technology, followed by its signed percent as
 *  plain readable text, which already reads clearly on its own. */
function buildDelta(delta: number): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("data-pica", "");
  el.className = "pica-kpi-delta";
  const glyph = document.createElement("span");
  glyph.setAttribute("data-pica", "");
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent = delta < 0 ? "▼ " : "▲ ";
  el.append(glyph, `${delta < 0 ? "-" : "+"}${formatFigure(Math.abs(delta))}%`);
  return el;
}

/** One stat's DOM, and the pieces later frames and prop changes need again. */
interface KpiCell {
  root: HTMLElement;
  text: ReturnType<typeof animatedText>;
  deltaEl: HTMLElement | null;
  sparkline: ReturnType<typeof asciiSparkline.mount> | null;
}

/** Builds one stat cell: a value that can count up, a label in the page's font, an optional delta, and, when
 *  the stat has a trend, a composed sparkline labeled with its own stat's name. */
function buildCell(item: StatItem): KpiCell {
  const root = document.createElement("div");
  root.setAttribute("data-pica", "");
  root.className = "pica-kpi-cell";

  const valueRow = document.createElement("div");
  valueRow.setAttribute("data-pica", "");
  valueRow.className = "pica-kpi-value";
  const text = animatedText(valueRow, finalText(item));
  if (item.unit) {
    const unitEl = document.createElement("span");
    unitEl.setAttribute("data-pica", "");
    unitEl.setAttribute("aria-hidden", "true");
    unitEl.className = "pica-kpi-unit";
    unitEl.textContent = item.unit;
    valueRow.appendChild(unitEl);
  }
  root.appendChild(valueRow);

  const label = document.createElement("div");
  label.setAttribute("data-pica", "");
  label.className = "pica-kpi-label";
  label.textContent = item.label;
  root.appendChild(label);

  const deltaEl = item.delta === null ? null : buildDelta(item.delta);
  if (deltaEl) root.appendChild(deltaEl);

  let sparkline: KpiCell["sparkline"] = null;
  if (item.trend.length > 0) {
    const sub = document.createElement("div");
    sub.setAttribute("data-pica", "");
    sub.className = "pica-kpi-trend";
    root.appendChild(sub);
    sparkline = asciiSparkline.mount(sub, { values: item.trend, label: `${item.label} trend` });
  }

  return { root, text, deltaEl, sparkline };
}

/** The scoped rules: typography and the grid, which shows `columns` at the widest and fewer as a plain
 *  attribute records the host narrowing. Mirrors bento-grid's own measured-breakpoint technique, so every
 *  section in this wave collapses the same way. */
function gridRules(selector: string, columns: number): string {
  const cols = Math.min(6, Math.max(1, Math.round(columns)));
  const mid = Math.min(2, cols);
  return [
    `${selector}{color:${cssVar("fg")}}`,
    `${selector} .pica-kpi-grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));column-gap:2em;row-gap:1.75em}`,
    `${selector}[data-pica-fit="mid"] .pica-kpi-grid{grid-template-columns:repeat(${mid},minmax(0,1fr))}`,
    `${selector}[data-pica-fit="min"] .pica-kpi-grid{grid-template-columns:1fr}`,
    `${selector} .pica-kpi-cell{display:flex;flex-direction:column;gap:0.4em;min-width:0}`,
    `${selector} .pica-kpi-value{display:inline-flex;align-items:baseline;gap:0.3em;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-size:2.15em;font-weight:600;letter-spacing:-0.01em;line-height:1.05}`,
    `${selector} .pica-kpi-unit{font-size:0.5em}`,
    `${selector} .pica-kpi-label{font-size:0.95em}`,
    `${selector} .pica-kpi-delta{font-family:${GRID_FONT};font-size:0.85em;font-variant-numeric:tabular-nums}`,
    `${selector} .pica-kpi-trend{font-size:0.85em;opacity:0.75}`,
  ].join("\n");
}

export const mount: Mount<StatsKpiProps> = (host, initial = {}) => {
  let props: StatsKpiProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  // A row of stats has its own height; it never stretches to fill a page section that gives the host 100%.
  const restoreHeight = styleHost(host, { height: "auto" });
  const grid = document.createElement("div");
  grid.setAttribute("data-pica", "");
  grid.className = "pica-kpi-grid";
  host.appendChild(grid);
  let cells: KpiCell[] = [];

  function destroyCells(): void {
    for (const cell of cells) {
      cell.sparkline?.destroy();
      cell.text.remove();
      cell.root.remove();
    }
    cells = [];
  }

  function buildCells(): void {
    destroyCells();
    cells = props.items.map(buildCell);
    grid.append(...cells.map((cell) => cell.root));
  }

  function applyHighlight(): void {
    cells.forEach((cell, i) => {
      if (cell.deltaEl) cell.deltaEl.style.color = i === props.highlight ? cssVar("accent") : "";
    });
  }

  /** Below 640px the grid drops to at most two columns; below 420px, to one. */
  function measure(): void {
    const width = host.clientWidth;
    attrs.set("data-pica-fit", width < 420 ? "min" : width < 640 ? "mid" : null);
  }

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;

  function draw(t: number): void {
    props.items.forEach((item, i) => {
      const cell = cells[i];
      if (cell) cell.text.layer.textContent = formatFigure(displayValue(item, props.countUp, t, props.duration));
    });
    host.dataset.picaReady = "true";
  }

  buildCells();
  sheet.setRules(gridRules(sheet.selector, props.columns));
  applyHighlight();
  measure();
  observer?.observe(host);

  const loop = createLoop({
    el: host,
    fps: 30,
    paused: props.paused,
    time: props.time,
    still: props.duration,
    frame: draw,
  });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (changed(before, props, ["items"])) {
        buildCells();
        applyHighlight();
      } else if (changed(before, props, ["highlight"])) {
        applyHighlight();
      }
      if (changed(before, props, ["columns"])) sheet.setRules(gridRules(sheet.selector, props.columns));
      loop.update({ paused: props.paused, time: props.time, still: props.duration });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      observer?.disconnect();
      destroyCells();
      grid.remove();
      sheet.destroy();
      attrs.restore();
      restoreHeight();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/stats-kpi/index.tsx
export type StatsKpiComponentProps = Partial<StatsKpiProps> & WrapperProps;

/** A row of key numbers, each counting up once with a delta glyph and an inline trend sparkline. */
export function StatsKpi({ className, style, palette, ...props }: StatsKpiComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
