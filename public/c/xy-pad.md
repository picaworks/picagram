# XY pad

> A square two-axis pad with a crosshair, paired with numeric fields so both axes move by pointer and keyboard.

Category: ui. Tags: xy-pad, two-axis, crosshair, position, form, ui. Static. Size: 3.5 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/xy-pad.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | [number, number] \| null | `null` | The current [x, y] position, or null to let the pad manage its own. |
| `defaultValue` | [number, number] | `[50,50]` | The initial [x, y] position when value is null. |
| `bounds` | [number, number, number, number] | `[0,100,0,100]` | The limits of the two axes as [xMin, xMax, yMin, yMax]. |
| `step` | number | `1` | The interval between selectable values on both axes. |
| `label` | string | `"Position"` | The visible and accessible name of the pad. |
| `axes` | [string, string] | `["X","Y"]` | The names of the two numeric fields, x first. |
| `size` | number | `16` | The side of the pad in rem. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `valueChange` | `onValueChange` | `[number, number]` | The user chose a position with the pad or a numeric field, as [x, y]. |

## Colors

Draws with `--pica-fg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · XY pad · xy-pad
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

// registry/ui/xy-pad/core.ts
export interface XyPadProps {
  /** The current [x, y] position, or null to let the pad manage its own. */
  value: [number, number] | null;
  /** The initial [x, y] position when value is null. */
  defaultValue: [number, number];
  /** The limits of the two axes as [xMin, xMax, yMin, yMax]. */
  bounds: [number, number, number, number];
  /** The interval between selectable values on both axes. */
  step: number;
  /** The visible and accessible name of the pad. */
  label: string;
  /** The names of the two numeric fields, x first. */
  axes: [string, string];
  /** The side of the pad in rem. */
  size: number;
}

export interface XyPadEvents {
  /** The user chose a position with the pad or a numeric field, as [x, y]. */
  valueChange: [number, number];
}

export const defaults: XyPadProps = {
  value: null,
  defaultValue: [50, 50],
  bounds: [0, 100, 0, 100],
  step: 1,
  label: "Position",
  axes: ["X", "Y"],
  size: 16,
};

/** The props that shape the labels, the fields' limits, and the stylesheet. */
const xyLayout: readonly (keyof XyPadProps)[] = ["bounds", "step", "label", "axes", "size"];

function xyNumber(raw: unknown, fallback: number): number {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
}

/** The limits as [xMin, xMax, yMin, yMax], repaired when a bound is missing, not a number, or reversed. */
function xyLimits(props: XyPadProps): readonly [number, number, number, number] {
  const raw: readonly unknown[] = Array.isArray(props.bounds) ? props.bounds : [];
  const axis = (at: number): readonly [number, number] => {
    const min = xyNumber(raw[at], 0);
    const max = xyNumber(raw[at + 1], 100);
    return max >= min ? [min, max] : [min, min];
  };
  const [x0, x1] = axis(0);
  const [y0, y1] = axis(2);
  return [x0, x1, y0, y1];
}

function xyStep(props: XyPadProps): number {
  return Number.isFinite(props.step) && props.step > 0 ? props.step : 1;
}

function xySnap(raw: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, xyNumber(raw, min)));
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(10));
}

/** Decimal places in a number as written, so a field shows the precision its step allows. */
function xyPlaces(n: number): number {
  const text = String(n);
  const dot = text.indexOf(".");
  return dot < 0 ? 0 : Math.min(8, text.length - dot - 1);
}

function xyPart<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  name: string,
  ...children: readonly Node[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-part", name);
  node.append(...children);
  return node;
}

function xyRules(s: string, props: XyPadProps, chars: number): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const line = `color-mix(in srgb, ${fg} 35%, transparent)`;
  const size = Math.min(32, Math.max(8, xyNumber(props.size, 16)));
  const part = (name: string): string => `${s} [data-part="${name}"]`;
  const pad = part("pad");
  const thumb = part("thumb");
  const input = `${s} input`;
  // The marker is 0.9rem, and its centre stays 0.45rem inside the pad so it never leaves the frame.
  const x = "calc(0.45rem + (100% - 0.9rem) * var(--xy-x, 0.5))";
  const y = "calc(0.45rem + (100% - 0.9rem) * var(--xy-y, 0.5))";
  const tick = `font-family:${GRID_FONT};font-size:0.75em;line-height:1;font-variant-numeric:tabular-nums;color:${muted}`;
  return [
    `${s}{display:inline-block;color:${fg};vertical-align:middle}`,
    `${part("root")}{display:grid;grid-template-columns:auto auto;justify-content:start;gap:0.4em 0.5em;line-height:1.2}`,
    `${part("label")}{grid-column:1/-1;contain:inline-size}`,
    `${part("yticks")}{display:flex;flex-direction:column;justify-content:space-between;text-align:right;${tick}}`,
    `${part("xticks")}{grid-column:2;display:flex;justify-content:space-between;${tick}}`,
    `${pad}{position:relative;box-sizing:border-box;width:min(${size}rem,100vw - 8rem);aspect-ratio:1;border:1px solid ${line};touch-action:none;-webkit-user-select:none;user-select:none;cursor:crosshair}`,
    `${pad}[data-dragging="true"]{border-color:${fg}}`,
    `${part("h")}{position:absolute;left:0;right:0;top:${y};height:1px;background:${accent};pointer-events:none}`,
    `${part("v")}{position:absolute;top:0;bottom:0;left:${x};width:1px;background:${accent};pointer-events:none}`,
    `${thumb}{position:absolute;box-sizing:border-box;width:0.9rem;height:0.9rem;left:${x};top:${y};transform:translate(-50%,-50%);border:1px solid ${fg};border-radius:0;background:transparent;cursor:grab}`,
    `${thumb}:hover,${pad}[data-dragging="true"] ${thumb}{background:${accent};border-color:${accent}}`,
    `${pad}[data-dragging="true"] ${thumb}{cursor:grabbing}`,
    `${part("fields")}{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:0.4em 0.9em;contain:inline-size}`,
    `${part("field")}{display:flex;align-items:center;gap:0.4em}`,
    `${part("axis")}{color:${muted}}`,
    `${input}{box-sizing:content-box;width:${chars}ch;margin:0;padding:0.2em 0.4em;font:inherit;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;text-align:right;color:${fg};background:transparent;border:1px solid ${line};border-radius:0;-moz-appearance:textfield;appearance:textfield}`,
    `${input}::-webkit-inner-spin-button,${input}::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`,
    `${input}:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${input}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${input}:invalid{box-shadow:none}`,
  ].join("\n");
}

export const mount: Mount<XyPadProps> = (host, initial = {}) => {
  let props: XyPadProps = { ...defaults, ...initial };
  let current: [number, number] = snapPair(props.value ?? props.defaultValue);
  let places = 0;
  let rules = "";
  let dragging = false;
  let pointerId = -1;
  // The field the user is typing in, which paint leaves alone so a half-written number is not overwritten.
  let typing: HTMLInputElement | null = null;
  const emit = emitter<XyPadEvents>(host);
  const sheet = scope(host);
  const abort = new AbortController();
  const on = { signal: abort.signal };
  const labelId = nextId("pica-xy-pad-label");
  const label = xyPart("span", "label");
  const yTicks = [xyPart("span", "tick"), xyPart("span", "tick")] as const;
  const xTicks = [xyPart("span", "tick"), xyPart("span", "tick")] as const;
  const names = [xyPart("span", "axis"), xyPart("span", "axis")] as const;
  const inputs = [xyPart("input", "x"), xyPart("input", "y")] as const;
  const thumb = xyPart("div", "thumb");
  const pad = xyPart("div", "pad", xyPart("div", "h"), xyPart("div", "v"), thumb);
  const left = xyPart("div", "yticks", ...yTicks);
  const base = xyPart("div", "xticks", ...xTicks);
  const fields = xyPart(
    "div",
    "fields",
    xyPart("label", "field", names[0], inputs[0]),
    xyPart("label", "field", names[1], inputs[1]),
  );
  const root = xyPart("div", "root", label, left, pad, base, fields);

  label.id = labelId;
  root.setAttribute("role", "group");
  for (const node of [pad, left, base]) node.setAttribute("aria-hidden", "true");
  for (const input of inputs) {
    input.type = "number";
    input.autocomplete = "off";
  }
  host.append(root);

  function snapPair(raw: readonly number[]): [number, number] {
    const [x0, x1, y0, y1] = xyLimits(props);
    const step = xyStep(props);
    return [xySnap(raw[0] ?? x0, x0, x1, step), xySnap(raw[1] ?? y0, y0, y1, step)];
  }

  function shown(): [number, number] {
    return snapPair(props.value ?? current);
  }

  /** Everything that depends on the props rather than the position. */
  function configure(): void {
    const [x0, x1, y0, y1] = xyLimits(props);
    const step = xyStep(props);
    places = Math.max(xyPlaces(step), xyPlaces(x0), xyPlaces(y0));
    const show = (n: number): string => n.toFixed(places);
    const title = String(props.label ?? "");
    label.textContent = title;
    label.hidden = title === "";
    if (title) root.setAttribute("aria-labelledby", labelId);
    else root.removeAttribute("aria-labelledby");
    yTicks[0].textContent = show(y1);
    yTicks[1].textContent = show(y0);
    xTicks[0].textContent = show(x0);
    xTicks[1].textContent = show(x1);
    const axes = [
      [names[0], inputs[0], x0, x1],
      [names[1], inputs[1], y0, y1],
    ] as const;
    for (const [at, [name, input, min, max]] of axes.entries()) {
      const axis = String(props.axes?.[at] ?? "") || (at === 0 ? "X" : "Y");
      name.textContent = axis;
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.setAttribute("aria-label", title ? `${title} ${axis}` : axis);
    }
    const chars = Math.max(3, ...[x0, x1, y0, y1].map((n) => show(n).length)) + 1;
    const next = xyRules(sheet.selector, props, chars);
    if (next !== rules) {
      rules = next;
      sheet.setRules(next);
    }
  }

  /** The position: the crosshair, and the text of each field that is not being typed in. */
  function paint(): void {
    const [x0, x1, y0, y1] = xyLimits(props);
    const [x, y] = shown();
    const share = (n: number, min: number, max: number): number => (max > min ? (n - min) / (max - min) : 0);
    pad.style.setProperty("--xy-x", String(share(x, x0, x1)));
    pad.style.setProperty("--xy-y", String(1 - share(y, y0, y1)));
    const texts = [x.toFixed(places), y.toFixed(places)];
    inputs.forEach((input, at) => {
      const text = texts[at];
      if (text !== undefined && input !== typing && input.value !== text) input.value = text;
    });
  }

  function choose(raw: readonly number[]): void {
    const next = snapPair(raw);
    const [x, y] = shown();
    const moved = next[0] !== x || next[1] !== y;
    if (moved && props.value === null) current = next;
    paint();
    if (moved) emit("valueChange", next);
  }

  function choosePoint(event: PointerEvent): void {
    const [x0, x1, y0, y1] = xyLimits(props);
    const box = pad.getBoundingClientRect();
    // One pixel of border, then half the marker, so the marker's centre can reach every edge.
    const edge = 1 + thumb.offsetWidth / 2;
    const along = (offset: number, length: number): number =>
      Math.min(1, Math.max(0, (offset - edge) / Math.max(1, length - 2 * edge)));
    choose([
      x0 + along(event.clientX - box.left, box.width) * (x1 - x0),
      y1 - along(event.clientY - box.top, box.height) * (y1 - y0),
    ]);
  }

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    pointerId = event.pointerId;
    typing = null;
    pad.dataset.dragging = "true";
    pad.setPointerCapture(event.pointerId);
    choosePoint(event);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (dragging && event.pointerId === pointerId) choosePoint(event);
  };
  const endPointer = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    dragging = false;
    pointerId = -1;
    pad.removeAttribute("data-dragging");
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    const at = inputs.indexOf(event.target as HTMLInputElement);
    const sign = event.key === "ArrowUp" || event.key === "PageUp" ? 1 : event.key === "ArrowDown" || event.key === "PageDown" ? -1 : 0;
    if (at < 0 || sign === 0 || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    typing = null;
    const jump = event.shiftKey || event.key.startsWith("Page") ? 10 : 1;
    const next: [number, number] = shown();
    next[at] = (next[at] ?? 0) + sign * jump * xyStep(props);
    choose(next);
  };
  const onInput = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    const at = inputs.indexOf(input);
    if (at < 0) return;
    typing = input;
    if (!Number.isFinite(input.valueAsNumber)) return;
    const next: [number, number] = shown();
    next[at] = input.valueAsNumber;
    choose(next);
  };
  const settle = (): void => {
    typing = null;
    paint();
  };

  pad.addEventListener("pointerdown", onPointerDown, on);
  pad.addEventListener("pointermove", onPointerMove, on);
  pad.addEventListener("pointerup", endPointer, on);
  pad.addEventListener("pointercancel", endPointer, on);
  pad.addEventListener("lostpointercapture", endPointer, on);
  fields.addEventListener("keydown", onKeyDown, on);
  fields.addEventListener("input", onInput, on);
  fields.addEventListener("change", settle, on);
  fields.addEventListener("focusout", settle, on);
  configure();
  paint();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      current = snapPair(props.value ?? current);
      if (changed(before, props, xyLayout)) configure();
      paint();
    },
    destroy() {
      abort.abort();
      root.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/ui/xy-pad/index.tsx
export type XyPadComponentProps = Partial<XyPadProps> & Handlers<XyPadEvents> & WrapperProps;

/** A square two-axis pad with a crosshair and a numeric field for each axis. */
export function XyPad({ className, style, palette, ...props }: XyPadComponentProps) {
  const ref = usePica<XyPadProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · XY pad · xy-pad
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>XY pad · Pica</title>
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
<div class="pica-stage"><div id="pica"></div></div>
<script>
"use strict";
var PicaXyPad = (() => {
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

  // registry/ui/xy-pad/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

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
    accent: "#13C4A3",
    muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)"
  };
  function cssVar(token) {
    return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
  }

  // registry/ui/xy-pad/core.ts
  var defaults = {
    value: null,
    defaultValue: [50, 50],
    bounds: [0, 100, 0, 100],
    step: 1,
    label: "Position",
    axes: ["X", "Y"],
    size: 16
  };
  var xyLayout = ["bounds", "step", "label", "axes", "size"];
  function xyNumber(raw, fallback) {
    return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
  }
  function xyLimits(props) {
    const raw = Array.isArray(props.bounds) ? props.bounds : [];
    const axis = (at) => {
      const min = xyNumber(raw[at], 0);
      const max = xyNumber(raw[at + 1], 100);
      return max >= min ? [min, max] : [min, min];
    };
    const [x0, x1] = axis(0);
    const [y0, y1] = axis(2);
    return [x0, x1, y0, y1];
  }
  function xyStep(props) {
    return Number.isFinite(props.step) && props.step > 0 ? props.step : 1;
  }
  function xySnap(raw, min, max, step) {
    const clamped = Math.min(max, Math.max(min, xyNumber(raw, min)));
    const snapped = min + Math.round((clamped - min) / step) * step;
    return Number(Math.min(max, Math.max(min, snapped)).toFixed(10));
  }
  function xyPlaces(n) {
    const text = String(n);
    const dot = text.indexOf(".");
    return dot < 0 ? 0 : Math.min(8, text.length - dot - 1);
  }
  function xyPart(tag, name, ...children) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    node.setAttribute("data-part", name);
    node.append(...children);
    return node;
  }
  function xyRules(s, props, chars) {
    const fg = cssVar("fg");
    const accent = cssVar("accent");
    const muted = cssVar("muted");
    const line = `color-mix(in srgb, ${fg} 35%, transparent)`;
    const size = Math.min(32, Math.max(8, xyNumber(props.size, 16)));
    const part = (name) => `${s} [data-part="${name}"]`;
    const pad = part("pad");
    const thumb = part("thumb");
    const input = `${s} input`;
    const x = "calc(0.45rem + (100% - 0.9rem) * var(--xy-x, 0.5))";
    const y = "calc(0.45rem + (100% - 0.9rem) * var(--xy-y, 0.5))";
    const tick = `font-family:${GRID_FONT};font-size:0.75em;line-height:1;font-variant-numeric:tabular-nums;color:${muted}`;
    return [
      `${s}{display:inline-block;color:${fg};vertical-align:middle}`,
      `${part("root")}{display:grid;grid-template-columns:auto auto;justify-content:start;gap:0.4em 0.5em;line-height:1.2}`,
      `${part("label")}{grid-column:1/-1;contain:inline-size}`,
      `${part("yticks")}{display:flex;flex-direction:column;justify-content:space-between;text-align:right;${tick}}`,
      `${part("xticks")}{grid-column:2;display:flex;justify-content:space-between;${tick}}`,
      `${pad}{position:relative;box-sizing:border-box;width:min(${size}rem,100vw - 8rem);aspect-ratio:1;border:1px solid ${line};touch-action:none;-webkit-user-select:none;user-select:none;cursor:crosshair}`,
      `${pad}[data-dragging="true"]{border-color:${fg}}`,
      `${part("h")}{position:absolute;left:0;right:0;top:${y};height:1px;background:${accent};pointer-events:none}`,
      `${part("v")}{position:absolute;top:0;bottom:0;left:${x};width:1px;background:${accent};pointer-events:none}`,
      `${thumb}{position:absolute;box-sizing:border-box;width:0.9rem;height:0.9rem;left:${x};top:${y};transform:translate(-50%,-50%);border:1px solid ${fg};border-radius:0;background:transparent;cursor:grab}`,
      `${thumb}:hover,${pad}[data-dragging="true"] ${thumb}{background:${accent};border-color:${accent}}`,
      `${pad}[data-dragging="true"] ${thumb}{cursor:grabbing}`,
      `${part("fields")}{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:0.4em 0.9em;contain:inline-size}`,
      `${part("field")}{display:flex;align-items:center;gap:0.4em}`,
      `${part("axis")}{color:${muted}}`,
      `${input}{box-sizing:content-box;width:${chars}ch;margin:0;padding:0.2em 0.4em;font:inherit;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;text-align:right;color:${fg};background:transparent;border:1px solid ${line};border-radius:0;-moz-appearance:textfield;appearance:textfield}`,
      `${input}::-webkit-inner-spin-button,${input}::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`,
      `${input}:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
      `${input}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${input}:invalid{box-shadow:none}`
    ].join("\n");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let current = snapPair(props.value ?? props.defaultValue);
    let places = 0;
    let rules = "";
    let dragging = false;
    let pointerId = -1;
    let typing = null;
    const emit = emitter(host);
    const sheet = scope(host);
    const abort = new AbortController();
    const on = { signal: abort.signal };
    const labelId = nextId("pica-xy-pad-label");
    const label = xyPart("span", "label");
    const yTicks = [xyPart("span", "tick"), xyPart("span", "tick")];
    const xTicks = [xyPart("span", "tick"), xyPart("span", "tick")];
    const names = [xyPart("span", "axis"), xyPart("span", "axis")];
    const inputs = [xyPart("input", "x"), xyPart("input", "y")];
    const thumb = xyPart("div", "thumb");
    const pad = xyPart("div", "pad", xyPart("div", "h"), xyPart("div", "v"), thumb);
    const left = xyPart("div", "yticks", ...yTicks);
    const base = xyPart("div", "xticks", ...xTicks);
    const fields = xyPart(
      "div",
      "fields",
      xyPart("label", "field", names[0], inputs[0]),
      xyPart("label", "field", names[1], inputs[1])
    );
    const root = xyPart("div", "root", label, left, pad, base, fields);
    label.id = labelId;
    root.setAttribute("role", "group");
    for (const node of [pad, left, base]) node.setAttribute("aria-hidden", "true");
    for (const input of inputs) {
      input.type = "number";
      input.autocomplete = "off";
    }
    host.append(root);
    function snapPair(raw) {
      const [x0, x1, y0, y1] = xyLimits(props);
      const step = xyStep(props);
      return [xySnap(raw[0] ?? x0, x0, x1, step), xySnap(raw[1] ?? y0, y0, y1, step)];
    }
    function shown() {
      return snapPair(props.value ?? current);
    }
    function configure() {
      const [x0, x1, y0, y1] = xyLimits(props);
      const step = xyStep(props);
      places = Math.max(xyPlaces(step), xyPlaces(x0), xyPlaces(y0));
      const show = (n) => n.toFixed(places);
      const title = String(props.label ?? "");
      label.textContent = title;
      label.hidden = title === "";
      if (title) root.setAttribute("aria-labelledby", labelId);
      else root.removeAttribute("aria-labelledby");
      yTicks[0].textContent = show(y1);
      yTicks[1].textContent = show(y0);
      xTicks[0].textContent = show(x0);
      xTicks[1].textContent = show(x1);
      const axes = [
        [names[0], inputs[0], x0, x1],
        [names[1], inputs[1], y0, y1]
      ];
      for (const [at, [name, input, min, max]] of axes.entries()) {
        const axis = String(props.axes?.[at] ?? "") || (at === 0 ? "X" : "Y");
        name.textContent = axis;
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.setAttribute("aria-label", title ? `${title} ${axis}` : axis);
      }
      const chars = Math.max(3, ...[x0, x1, y0, y1].map((n) => show(n).length)) + 1;
      const next = xyRules(sheet.selector, props, chars);
      if (next !== rules) {
        rules = next;
        sheet.setRules(next);
      }
    }
    function paint() {
      const [x0, x1, y0, y1] = xyLimits(props);
      const [x, y] = shown();
      const share = (n, min, max) => max > min ? (n - min) / (max - min) : 0;
      pad.style.setProperty("--xy-x", String(share(x, x0, x1)));
      pad.style.setProperty("--xy-y", String(1 - share(y, y0, y1)));
      const texts = [x.toFixed(places), y.toFixed(places)];
      inputs.forEach((input, at) => {
        const text = texts[at];
        if (text !== void 0 && input !== typing && input.value !== text) input.value = text;
      });
    }
    function choose(raw) {
      const next = snapPair(raw);
      const [x, y] = shown();
      const moved = next[0] !== x || next[1] !== y;
      if (moved && props.value === null) current = next;
      paint();
      if (moved) emit("valueChange", next);
    }
    function choosePoint(event) {
      const [x0, x1, y0, y1] = xyLimits(props);
      const box = pad.getBoundingClientRect();
      const edge = 1 + thumb.offsetWidth / 2;
      const along = (offset, length) => Math.min(1, Math.max(0, (offset - edge) / Math.max(1, length - 2 * edge)));
      choose([
        x0 + along(event.clientX - box.left, box.width) * (x1 - x0),
        y1 - along(event.clientY - box.top, box.height) * (y1 - y0)
      ]);
    }
    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      dragging = true;
      pointerId = event.pointerId;
      typing = null;
      pad.dataset.dragging = "true";
      pad.setPointerCapture(event.pointerId);
      choosePoint(event);
    };
    const onPointerMove = (event) => {
      if (dragging && event.pointerId === pointerId) choosePoint(event);
    };
    const endPointer = (event) => {
      if (event.pointerId !== pointerId) return;
      dragging = false;
      pointerId = -1;
      pad.removeAttribute("data-dragging");
    };
    const onKeyDown = (event) => {
      const at = inputs.indexOf(event.target);
      const sign = event.key === "ArrowUp" || event.key === "PageUp" ? 1 : event.key === "ArrowDown" || event.key === "PageDown" ? -1 : 0;
      if (at < 0 || sign === 0 || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      typing = null;
      const jump = event.shiftKey || event.key.startsWith("Page") ? 10 : 1;
      const next = shown();
      next[at] = (next[at] ?? 0) + sign * jump * xyStep(props);
      choose(next);
    };
    const onInput = (event) => {
      const input = event.target;
      const at = inputs.indexOf(input);
      if (at < 0) return;
      typing = input;
      if (!Number.isFinite(input.valueAsNumber)) return;
      const next = shown();
      next[at] = input.valueAsNumber;
      choose(next);
    };
    const settle = () => {
      typing = null;
      paint();
    };
    pad.addEventListener("pointerdown", onPointerDown, on);
    pad.addEventListener("pointermove", onPointerMove, on);
    pad.addEventListener("pointerup", endPointer, on);
    pad.addEventListener("pointercancel", endPointer, on);
    pad.addEventListener("lostpointercapture", endPointer, on);
    fields.addEventListener("keydown", onKeyDown, on);
    fields.addEventListener("input", onInput, on);
    fields.addEventListener("change", settle, on);
    fields.addEventListener("focusout", settle, on);
    configure();
    paint();
    host.dataset.picaReady = "true";
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        current = snapPair(props.value ?? current);
        if (changed(before, props, xyLayout)) configure();
        paint();
      },
      destroy() {
        abort.abort();
        root.remove();
        sheet.destroy();
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
  var initial = Object.assign({}, {"label":"Offset","bounds":[-100,100,-100,100],"defaultValue":[40,-60]}, window.PICA_PROPS || {});
  var instance = PicaXyPad.mount(host, take(initial));
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
