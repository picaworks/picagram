# Range Brush

> A two-handle numeric interval brush with ordered, stepped pointer and keyboard input.

Category: ui. Tags: range, interval, brush, slider, ui. Static. Size: 3.1 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/range-brush.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `min` | number | `0` | The lowest selectable value. |
| `max` | number | `100` | The highest selectable value. |
| `step` | number | `1` | The positive increment between selectable values. |
| `value` | [number, number] \| null | `null` | The current ordered interval, or null for internal state. |
| `defaultValue` | [number, number] | `[25,75]` | The initial interval, read once at mount. |
| `label` | string | `"Selected window"` | The visible and accessible name of the interval. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `valueChange` | `onValueChange` | `[number, number]` | The ordered interval requested by keyboard or pointer input. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Range Brush · range-brush
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

// registry/ui/range-brush/core.ts
export interface RangeBrushProps {
  /** The lowest selectable value. */
  min: number;
  /** The highest selectable value. */
  max: number;
  /** The positive increment between selectable values. */
  step: number;
  /** The current ordered interval, or null for internal state. */
  value: [number, number] | null;
  /** The initial interval, read once at mount. */
  defaultValue: [number, number];
  /** The visible and accessible name of the interval. */
  label: string;
}
export interface RangeBrushEvents {
  /** The ordered interval requested by keyboard or pointer input. */
  valueChange: [number, number];
}
export const defaults: RangeBrushProps = {
  min: 0, max: 100, step: 1, value: null, defaultValue: [25, 75], label: "Selected window",
};
function rangeBrushLimits(p: RangeBrushProps): [number, number] {
  const min = Number.isFinite(p.min) ? p.min : 0;
  return [min, Number.isFinite(p.max) ? Math.max(min, p.max) : min];
}
function rangeBrushStep(p: RangeBrushProps): number {
  return Number.isFinite(p.step) && p.step > 0 ? p.step : 1;
}
function rangeBrushSnap(raw: number, p: RangeBrushProps): number {
  const [min, max] = rangeBrushLimits(p);
  const step = rangeBrushStep(p);
  const bounded = Math.min(max, Math.max(min, Number.isFinite(raw) ? raw : min));
  return Number(Math.min(max, Math.max(min, min + Math.round((bounded - min) / step) * step)).toFixed(10));
}
function rangeBrushPair(value: [number, number], p: RangeBrushProps): [number, number] {
  const a = rangeBrushSnap(value[0], p);
  const b = rangeBrushSnap(value[1], p);
  return a <= b ? [a, b] : [b, a];
}
function rangeBrushRules(s: string): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  return [
    `${s}{display:inline-block;color:${fg};vertical-align:middle}`,
    `${s} [data-part="root"]{box-sizing:border-box;width:min(28rem,80vw);padding:1.4em;background:${bg};border:1px solid ${muted};font-family:${GRID_FONT};font-size:0.875em}`,
    `${s} [data-part="head"]{display:flex;align-items:baseline;justify-content:space-between;gap:1em;line-height:1.5}`,
    `${s} [data-part="label"]{font-size:0.8em;text-transform:uppercase;letter-spacing:0.04em}`,
    `${s} [data-part="value"]{font-variant-numeric:tabular-nums;white-space:nowrap}`,
    `${s} [data-part="track"]{position:relative;height:3.5em;margin:0.5em 0;touch-action:none;user-select:none;cursor:pointer}`,
    `${s} [data-part="rail"]{position:absolute;left:0.75em;right:0.75em;top:50%;height:2px;background:${muted}}`,
    `${s} [data-part="fill"]{position:absolute;top:-2px;height:6px;left:var(--brush-start);width:var(--brush-width);background:${accent}}`,
    `${s} input{appearance:none;-webkit-appearance:none;position:absolute;left:0;top:0;width:100%;height:100%;margin:0;border:0;border-radius:0;background:transparent;pointer-events:none;color:${fg};outline:none;font:inherit}`,
    `${s} input::-webkit-slider-runnable-track{height:2px;background:transparent}`,
    `${s} input::-moz-range-track{height:2px;background:transparent}`,
    `${s} input::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;box-sizing:border-box;width:1.5em;height:2em;margin-top:calc(-1em + 1px);border:2px solid ${fg};border-radius:0;background:${bg};pointer-events:auto;cursor:grab}`,
    `${s} input::-moz-range-thumb{box-sizing:border-box;width:1.5em;height:2em;border:2px solid ${fg};border-radius:0;background:${bg};pointer-events:auto;cursor:grab}`,
    `${s} input:hover::-webkit-slider-thumb,${s} input:focus-visible::-webkit-slider-thumb{background:${accent}}`,
    `${s} input:hover::-moz-range-thumb,${s} input:focus-visible::-moz-range-thumb{background:${accent}}`,
    `${s} input:focus-visible::-webkit-slider-thumb{outline:2px solid ${fg};outline-offset:3px}`,
    `${s} input:focus-visible::-moz-range-thumb{outline:2px solid ${fg};outline-offset:3px}`,
    `${s} [data-part="scale"]{display:flex;justify-content:space-between;color:${muted};font-size:0.8em;font-variant-numeric:tabular-nums}`,
  ].join("\n");
}
export const mount: Mount<RangeBrushProps> = (host, initial = {}) => {
  let props: RangeBrushProps = { ...defaults, ...initial };
  let current = rangeBrushPair(props.value ?? props.defaultValue, props);
  let destroyed = false;
  let active: 0 | 1 = 0;
  let pointerId: number | null = null;
  const emit = emitter<RangeBrushEvents>(host);
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  const sheet = scope(host);
  const labelId = nextId("pica-range-brush");
  const root = document.createElement("div");
  const head = document.createElement("div");
  const label = document.createElement("span");
  const value = document.createElement("span");
  const track = document.createElement("div");
  const rail = document.createElement("div");
  const fill = document.createElement("div");
  const lower = document.createElement("input");
  const upper = document.createElement("input");
  const scale = document.createElement("div");
  const minLabel = document.createElement("span");
  const maxLabel = document.createElement("span");
  const handles = [lower, upper] as const;
  for (const [node, part] of [
    [root, "root"], [head, "head"], [label, "label"], [value, "value"],
    [track, "track"], [rail, "rail"], [fill, "fill"], [lower, "lower"],
    [upper, "upper"], [scale, "scale"], [minLabel, "minimum"], [maxLabel, "maximum"],
  ] as const) {
    node.setAttribute("data-pica", "");
    node.setAttribute("data-part", part);
  }
  root.setAttribute("role", "group");
  root.setAttribute("aria-labelledby", labelId);
  label.id = labelId;
  rail.setAttribute("aria-hidden", "true");
  scale.setAttribute("aria-hidden", "true");
  value.setAttribute("aria-hidden", "true");
  lower.type = upper.type = "range";
  lower.setAttribute("aria-orientation", "horizontal");
  upper.setAttribute("aria-orientation", "horizontal");
  rail.append(fill);
  track.append(rail, lower, upper);
  head.append(label, value);
  scale.append(minLabel, maxLabel);
  root.append(head, track, scale);
  host.append(root);
  sheet.setRules(rangeBrushRules(sheet.selector));
  function shown(): [number, number] {
    return rangeBrushPair(props.value ?? current, props);
  }
  function render(): void {
    const [min, max] = rangeBrushLimits(props);
    const pair = shown();
    const start = max === min ? 0 : (pair[0] - min) / (max - min);
    const end = max === min ? 0 : (pair[1] - min) / (max - min);
    const name = props.label.trim() || "Selected window";
    label.textContent = name;
    value.textContent = `${pair[0]} — ${pair[1]}`;
    minLabel.textContent = String(min);
    maxLabel.textContent = String(max);
    rail.style.setProperty("--brush-start", `${start * 100}%`);
    rail.style.setProperty("--brush-width", `${(end - start) * 100}%`);
    for (const index of [0, 1] as const) {
      const handle = handles[index];
      handle.min = String(min);
      handle.max = String(max);
      handle.step = "any";
      handle.value = String(pair[index]);
      handle.disabled = min === max;
      handle.setAttribute("aria-label", `${name}: ${index === 0 ? "lower" : "upper"} bound`);
      handle.setAttribute("aria-valuemin", String(index === 0 ? min : pair[0]));
      handle.setAttribute("aria-valuemax", String(index === 0 ? pair[1] : max));
      handle.setAttribute("aria-valuenow", String(pair[index]));
      handle.style.zIndex = index === active ? "2" : "1";
    }
  }
  function choose(index: 0 | 1, raw: number): void {
    const pair = shown();
    const snapped = rangeBrushSnap(raw, props);
    const next: [number, number] = index === 0
      ? [Math.min(snapped, pair[1]), pair[1]]
      : [pair[0], Math.max(snapped, pair[0])];
    if (props.value === null) current = next;
    render();
    if (next[0] !== pair[0] || next[1] !== pair[1]) emit("valueChange", next);
  }
  function pointerValue(event: PointerEvent): number {
    const [min, max] = rangeBrushLimits(props);
    const rect = rail.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
    return min + ratio * (max - min);
  }
  const onPointerDown = (event: PointerEvent): void => {
    const [min, max] = rangeBrushLimits(props);
    if (event.button !== 0 || pointerId !== null || min === max) return;
    event.preventDefault();
    const raw = pointerValue(event);
    const pair = shown();
    if (event.target === lower) active = 0;
    else if (event.target === upper) active = 1;
    else if (Math.abs(raw - pair[0]) !== Math.abs(raw - pair[1])) active = Math.abs(raw - pair[0]) < Math.abs(raw - pair[1]) ? 0 : 1;
    pointerId = event.pointerId;
    track.dataset.dragging = "true";
    handles[active].focus();
    track.setPointerCapture(event.pointerId);
    choose(active, raw);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (pointerId === event.pointerId) choose(active, pointerValue(event));
  };
  const endPointer = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    pointerId = null;
    track.removeAttribute("data-dragging");
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    const index: 0 | 1 = event.currentTarget === lower ? 0 : 1;
    const pair = shown();
    const [min, max] = rangeBrushLimits(props);
    const step = rangeBrushStep(props);
    let next: number;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = pair[index] + step;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = pair[index] - step;
    else if (event.key === "PageUp") next = pair[index] + step * 10;
    else if (event.key === "PageDown") next = pair[index] - step * 10;
    else if (event.key === "Home") next = index === 0 ? min : pair[0];
    else if (event.key === "End") next = index === 0 ? pair[1] : max;
    else return;
    event.preventDefault();
    active = index;
    choose(index, next);
  };
  const onInput = (event: Event): void => {
    const index: 0 | 1 = event.currentTarget === lower ? 0 : 1;
    choose(index, handles[index].valueAsNumber);
  };
  const onFocus = (event: FocusEvent): void => {
    active = event.currentTarget === lower ? 0 : 1;
    render();
  };
  for (const handle of handles) {
    handle.addEventListener("keydown", onKeyDown);
    handle.addEventListener("input", onInput);
    handle.addEventListener("focus", onFocus);
  }
  track.addEventListener("pointerdown", onPointerDown);
  track.addEventListener("pointermove", onPointerMove);
  track.addEventListener("pointerup", endPointer);
  track.addEventListener("pointercancel", endPointer);
  track.addEventListener("lostpointercapture", endPointer);
  render();
  attributes.set("data-pica-ready", "true");
  return {
    update(next) {
      if (destroyed) return;
      const previous = shown();
      props = { ...props, ...next };
      current = rangeBrushPair(props.value ?? previous, props);
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (pointerId !== null && track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
      for (const handle of handles) {
        handle.removeEventListener("keydown", onKeyDown);
        handle.removeEventListener("input", onInput);
        handle.removeEventListener("focus", onFocus);
      }
      track.removeEventListener("pointerdown", onPointerDown);
      track.removeEventListener("pointermove", onPointerMove);
      track.removeEventListener("pointerup", endPointer);
      track.removeEventListener("pointercancel", endPointer);
      track.removeEventListener("lostpointercapture", endPointer);
      root.remove();
      sheet.destroy();
      attributes.restore();
    },
  };
};

// registry/ui/range-brush/index.tsx
export type RangeBrushComponentProps = Partial<RangeBrushProps> & Handlers<RangeBrushEvents> & WrapperProps;

/** A two-handle numeric interval brush with ordered pointer and keyboard input. */
export function RangeBrush({ className, style, palette, ...props }: RangeBrushComponentProps) {
  const ref = usePica<RangeBrushProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Range Brush · range-brush
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Range Brush · Pica</title>
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
var PicaRangeBrush = (() => {
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

  // registry/ui/range-brush/core.ts
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

  // registry/ui/range-brush/core.ts
  var defaults = {
    min: 0,
    max: 100,
    step: 1,
    value: null,
    defaultValue: [25, 75],
    label: "Selected window"
  };
  function rangeBrushLimits(p) {
    const min = Number.isFinite(p.min) ? p.min : 0;
    return [min, Number.isFinite(p.max) ? Math.max(min, p.max) : min];
  }
  function rangeBrushStep(p) {
    return Number.isFinite(p.step) && p.step > 0 ? p.step : 1;
  }
  function rangeBrushSnap(raw, p) {
    const [min, max] = rangeBrushLimits(p);
    const step = rangeBrushStep(p);
    const bounded = Math.min(max, Math.max(min, Number.isFinite(raw) ? raw : min));
    return Number(Math.min(max, Math.max(min, min + Math.round((bounded - min) / step) * step)).toFixed(10));
  }
  function rangeBrushPair(value, p) {
    const a = rangeBrushSnap(value[0], p);
    const b = rangeBrushSnap(value[1], p);
    return a <= b ? [a, b] : [b, a];
  }
  function rangeBrushRules(s) {
    const fg = cssVar("fg");
    const bg = cssVar("bg");
    const accent = cssVar("accent");
    const muted = cssVar("muted");
    return [
      `${s}{display:inline-block;color:${fg};vertical-align:middle}`,
      `${s} [data-part="root"]{box-sizing:border-box;width:min(28rem,80vw);padding:1.4em;background:${bg};border:1px solid ${muted};font-family:${GRID_FONT};font-size:0.875em}`,
      `${s} [data-part="head"]{display:flex;align-items:baseline;justify-content:space-between;gap:1em;line-height:1.5}`,
      `${s} [data-part="label"]{font-size:0.8em;text-transform:uppercase;letter-spacing:0.04em}`,
      `${s} [data-part="value"]{font-variant-numeric:tabular-nums;white-space:nowrap}`,
      `${s} [data-part="track"]{position:relative;height:3.5em;margin:0.5em 0;touch-action:none;user-select:none;cursor:pointer}`,
      `${s} [data-part="rail"]{position:absolute;left:0.75em;right:0.75em;top:50%;height:2px;background:${muted}}`,
      `${s} [data-part="fill"]{position:absolute;top:-2px;height:6px;left:var(--brush-start);width:var(--brush-width);background:${accent}}`,
      `${s} input{appearance:none;-webkit-appearance:none;position:absolute;left:0;top:0;width:100%;height:100%;margin:0;border:0;border-radius:0;background:transparent;pointer-events:none;color:${fg};outline:none;font:inherit}`,
      `${s} input::-webkit-slider-runnable-track{height:2px;background:transparent}`,
      `${s} input::-moz-range-track{height:2px;background:transparent}`,
      `${s} input::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;box-sizing:border-box;width:1.5em;height:2em;margin-top:calc(-1em + 1px);border:2px solid ${fg};border-radius:0;background:${bg};pointer-events:auto;cursor:grab}`,
      `${s} input::-moz-range-thumb{box-sizing:border-box;width:1.5em;height:2em;border:2px solid ${fg};border-radius:0;background:${bg};pointer-events:auto;cursor:grab}`,
      `${s} input:hover::-webkit-slider-thumb,${s} input:focus-visible::-webkit-slider-thumb{background:${accent}}`,
      `${s} input:hover::-moz-range-thumb,${s} input:focus-visible::-moz-range-thumb{background:${accent}}`,
      `${s} input:focus-visible::-webkit-slider-thumb{outline:2px solid ${fg};outline-offset:3px}`,
      `${s} input:focus-visible::-moz-range-thumb{outline:2px solid ${fg};outline-offset:3px}`,
      `${s} [data-part="scale"]{display:flex;justify-content:space-between;color:${muted};font-size:0.8em;font-variant-numeric:tabular-nums}`
    ].join("\n");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let current = rangeBrushPair(props.value ?? props.defaultValue, props);
    let destroyed = false;
    let active = 0;
    let pointerId = null;
    const emit = emitter(host);
    const attributes = hostAttributes(host);
    attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
    const sheet = scope(host);
    const labelId = nextId("pica-range-brush");
    const root = document.createElement("div");
    const head = document.createElement("div");
    const label = document.createElement("span");
    const value = document.createElement("span");
    const track = document.createElement("div");
    const rail = document.createElement("div");
    const fill = document.createElement("div");
    const lower = document.createElement("input");
    const upper = document.createElement("input");
    const scale = document.createElement("div");
    const minLabel = document.createElement("span");
    const maxLabel = document.createElement("span");
    const handles = [lower, upper];
    for (const [node, part] of [
      [root, "root"],
      [head, "head"],
      [label, "label"],
      [value, "value"],
      [track, "track"],
      [rail, "rail"],
      [fill, "fill"],
      [lower, "lower"],
      [upper, "upper"],
      [scale, "scale"],
      [minLabel, "minimum"],
      [maxLabel, "maximum"]
    ]) {
      node.setAttribute("data-pica", "");
      node.setAttribute("data-part", part);
    }
    root.setAttribute("role", "group");
    root.setAttribute("aria-labelledby", labelId);
    label.id = labelId;
    rail.setAttribute("aria-hidden", "true");
    scale.setAttribute("aria-hidden", "true");
    value.setAttribute("aria-hidden", "true");
    lower.type = upper.type = "range";
    lower.setAttribute("aria-orientation", "horizontal");
    upper.setAttribute("aria-orientation", "horizontal");
    rail.append(fill);
    track.append(rail, lower, upper);
    head.append(label, value);
    scale.append(minLabel, maxLabel);
    root.append(head, track, scale);
    host.append(root);
    sheet.setRules(rangeBrushRules(sheet.selector));
    function shown() {
      return rangeBrushPair(props.value ?? current, props);
    }
    function render() {
      const [min, max] = rangeBrushLimits(props);
      const pair = shown();
      const start = max === min ? 0 : (pair[0] - min) / (max - min);
      const end = max === min ? 0 : (pair[1] - min) / (max - min);
      const name = props.label.trim() || "Selected window";
      label.textContent = name;
      value.textContent = `${pair[0]} — ${pair[1]}`;
      minLabel.textContent = String(min);
      maxLabel.textContent = String(max);
      rail.style.setProperty("--brush-start", `${start * 100}%`);
      rail.style.setProperty("--brush-width", `${(end - start) * 100}%`);
      for (const index of [0, 1]) {
        const handle = handles[index];
        handle.min = String(min);
        handle.max = String(max);
        handle.step = "any";
        handle.value = String(pair[index]);
        handle.disabled = min === max;
        handle.setAttribute("aria-label", `${name}: ${index === 0 ? "lower" : "upper"} bound`);
        handle.setAttribute("aria-valuemin", String(index === 0 ? min : pair[0]));
        handle.setAttribute("aria-valuemax", String(index === 0 ? pair[1] : max));
        handle.setAttribute("aria-valuenow", String(pair[index]));
        handle.style.zIndex = index === active ? "2" : "1";
      }
    }
    function choose(index, raw) {
      const pair = shown();
      const snapped = rangeBrushSnap(raw, props);
      const next = index === 0 ? [Math.min(snapped, pair[1]), pair[1]] : [pair[0], Math.max(snapped, pair[0])];
      if (props.value === null) current = next;
      render();
      if (next[0] !== pair[0] || next[1] !== pair[1]) emit("valueChange", next);
    }
    function pointerValue(event) {
      const [min, max] = rangeBrushLimits(props);
      const rect = rail.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
      return min + ratio * (max - min);
    }
    const onPointerDown = (event) => {
      const [min, max] = rangeBrushLimits(props);
      if (event.button !== 0 || pointerId !== null || min === max) return;
      event.preventDefault();
      const raw = pointerValue(event);
      const pair = shown();
      if (event.target === lower) active = 0;
      else if (event.target === upper) active = 1;
      else if (Math.abs(raw - pair[0]) !== Math.abs(raw - pair[1])) active = Math.abs(raw - pair[0]) < Math.abs(raw - pair[1]) ? 0 : 1;
      pointerId = event.pointerId;
      track.dataset.dragging = "true";
      handles[active].focus();
      track.setPointerCapture(event.pointerId);
      choose(active, raw);
    };
    const onPointerMove = (event) => {
      if (pointerId === event.pointerId) choose(active, pointerValue(event));
    };
    const endPointer = (event) => {
      if (pointerId !== event.pointerId) return;
      pointerId = null;
      track.removeAttribute("data-dragging");
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    };
    const onKeyDown = (event) => {
      const index = event.currentTarget === lower ? 0 : 1;
      const pair = shown();
      const [min, max] = rangeBrushLimits(props);
      const step = rangeBrushStep(props);
      let next;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") next = pair[index] + step;
      else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = pair[index] - step;
      else if (event.key === "PageUp") next = pair[index] + step * 10;
      else if (event.key === "PageDown") next = pair[index] - step * 10;
      else if (event.key === "Home") next = index === 0 ? min : pair[0];
      else if (event.key === "End") next = index === 0 ? pair[1] : max;
      else return;
      event.preventDefault();
      active = index;
      choose(index, next);
    };
    const onInput = (event) => {
      const index = event.currentTarget === lower ? 0 : 1;
      choose(index, handles[index].valueAsNumber);
    };
    const onFocus = (event) => {
      active = event.currentTarget === lower ? 0 : 1;
      render();
    };
    for (const handle of handles) {
      handle.addEventListener("keydown", onKeyDown);
      handle.addEventListener("input", onInput);
      handle.addEventListener("focus", onFocus);
    }
    track.addEventListener("pointerdown", onPointerDown);
    track.addEventListener("pointermove", onPointerMove);
    track.addEventListener("pointerup", endPointer);
    track.addEventListener("pointercancel", endPointer);
    track.addEventListener("lostpointercapture", endPointer);
    render();
    attributes.set("data-pica-ready", "true");
    return {
      update(next) {
        if (destroyed) return;
        const previous = shown();
        props = { ...props, ...next };
        current = rangeBrushPair(props.value ?? previous, props);
        render();
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (pointerId !== null && track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
        for (const handle of handles) {
          handle.removeEventListener("keydown", onKeyDown);
          handle.removeEventListener("input", onInput);
          handle.removeEventListener("focus", onFocus);
        }
        track.removeEventListener("pointerdown", onPointerDown);
        track.removeEventListener("pointermove", onPointerMove);
        track.removeEventListener("pointerup", endPointer);
        track.removeEventListener("pointercancel", endPointer);
        track.removeEventListener("lostpointercapture", endPointer);
        root.remove();
        sheet.destroy();
        attributes.restore();
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
  var instance = PicaRangeBrush.mount(host, take(initial));
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
