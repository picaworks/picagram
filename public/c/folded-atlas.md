# Folded Atlas

> Supplied polygon panels form a connected accordion atlas with projected hinges, accessible panel buttons, and independent selected content.

Category: immersive. Tags: atlas, accordion, fold, panels, geometry, selection, canvas. Static. Size: 5.1 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/folded-atlas.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `panels` | FoldedAtlasPanel[] | `[{"id":"coast","label":"Coast","description":"A broken coastline surrounds sheltered bays and offshore islands.","shapes":[[[0,0.14],[0.37,0.12],[0.52,0.27],[0.33,0.39],[0.51,0.54],[0.37,0.69],[0.57,0.8],[0.38,0.9],[0,0.91]],[[0.73,0.29],[0.89,0.36],[0.81,0.47],[0.67,0.4]],[[0.69,0.63],[0.83,0.7],[0.74,0.79],[0.63,0.72]]]},{"id":"estuary","label":"Estuary","description":"Tidal channels divide the estuary into long, low islands.","shapes":[[[0,0.14],[0.63,0.1],[1,0.22],[1,0.43],[0.72,0.33],[0.43,0.4],[0.15,0.3],[0,0.36]],[[0,0.5],[0.23,0.42],[0.59,0.53],[1,0.46],[1,0.74],[0.67,0.65],[0.38,0.7],[0.13,0.63],[0,0.76]],[[0.08,0.82],[0.46,0.77],[0.81,0.86],[0.53,0.94],[0.16,0.91]]]},{"id":"highlands","label":"Highlands","description":"Three ridges rise inland, separated by narrow valleys.","shapes":[[[0,0.22],[0.26,0.13],[0.37,0.28],[0.2,0.41],[0.35,0.57],[0.18,0.74],[0,0.74]],[[0.36,0.17],[0.63,0.1],[0.7,0.32],[0.54,0.46],[0.72,0.67],[0.48,0.81],[0.35,0.61],[0.45,0.4]],[[0.76,0.17],[1,0.23],[1,0.87],[0.79,0.93],[0.85,0.73],[0.71,0.51],[0.86,0.36]]]},{"id":"interior","label":"Interior","description":"A broad interior basin holds an enclosed lake and a winding southern outlet.","shapes":[[[0,0.23],[0.38,0.11],[0.8,0.19],[0.96,0.43],[0.86,0.71],[0.63,0.77],[0.7,0.49],[0.49,0.36],[0.3,0.49],[0.42,0.68],[0.31,0.9],[0,0.87]],[[0.49,0.47],[0.63,0.51],[0.58,0.61],[0.46,0.58]]]}]` | Up to twelve connected panels with normalized polygon shapes; duplicate or empty IDs are omitted. |
| `fold` | number | `0.46` | Accordion fold from 0 (flat) to 1 (72-degree alternating hinges). |
| `value` | string \| null | `null` | Selected panel ID. Null uses internal selection; an empty string selects none. |
| `defaultValue` | string | `"estuary"` | Initial selected panel ID, read once when mounted in uncontrolled mode. |
| `label` | string | `"Folded landscape atlas"` | Accessible name for the atlas and its independent panel controls. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `valueChange` | `onValueChange` | `string` | Selected panel ID, emitted only after pointer or keyboard input. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Folded Atlas · folded-atlas
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

// lib/canvas.ts
/** A canvas that covers the host, marked as the core's own and hidden from assistive technology. By default
 *  its backing store follows the host's size in device pixels. Used by canvas components and lib/gl.ts. */

interface CanvasOptions {
  /** Device pixel ratio ceiling. */
  maxDpr: number;
  /** Backing-store pixel ceiling, so a very large host cannot allocate a very large canvas. */
  maxPixels: number;
  /** Size the backing store to the host in device pixels. Off leaves sizing to the caller, for drawing at a
   *  lower resolution that CSS scales up. */
  autoSize: boolean;
  /** Extra inline CSS for the canvas, such as image-rendering:pixelated. */
  css: string;
  /** Runs when the host's size changes, with its new size in CSS pixels. It is not called at creation, so
   *  draw once yourself after creating the canvas. With autoSize on, the backing store is already resized. */
  onResize: (cssWidth: number, cssHeight: number) => void;
}

interface Surface {
  readonly canvas: HTMLCanvasElement;
  /** Backing-store size in device pixels, kept up to date when autoSize is on. */
  readonly width: number;
  readonly height: number;
  /** Device pixels per CSS pixel, after the ceilings. */
  readonly dpr: number;
  /** The host's size in CSS pixels. */
  readonly cssWidth: number;
  readonly cssHeight: number;
  /** Stops following the host, removes the canvas, and restores the host's styles. */
  destroy(): void;
}

function createCanvas(host: HTMLElement, options: Partial<CanvasOptions> = {}): Surface {
  const { maxDpr = 2, maxPixels = Number.POSITIVE_INFINITY, autoSize = true, css = "", onResize } = options;
  const restore = styleHost(
    host,
    getComputedStyle(host).position === "static" ? { position: "relative", overflow: "hidden" } : { overflow: "hidden" },
  );
  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-pica", "");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;${css}`;
  host.appendChild(canvas);
  let cssWidth = -1;
  let cssHeight = -1;
  let width = 0;
  let height = 0;
  let dpr = 1;

  /** Reads the host's size. Returns true when it changed. */
  function measure(): boolean {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === cssWidth && h === cssHeight) return false;
    cssWidth = w;
    cssHeight = h;
    dpr = Math.min(globalThis.devicePixelRatio || 1, maxDpr, Math.sqrt(maxPixels / (Math.max(1, w) * Math.max(1, h))));
    if (autoSize) {
      width = Math.max(1, Math.round(w * dpr));
      height = Math.max(1, Math.round(h * dpr));
      canvas.width = width;
      canvas.height = height;
    }
    return true;
  }

  measure();
  const observer = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => {
        if (measure()) onResize?.(cssWidth, cssHeight);
      })
    : null;
  observer?.observe(host);

  return {
    canvas,
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    get dpr() {
      return dpr;
    },
    get cssWidth() {
      return cssWidth;
    },
    get cssHeight() {
      return cssHeight;
    },
    destroy() {
      observer?.disconnect();
      canvas.remove();
      restore();
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

// registry/immersive/folded-atlas/core.ts
export interface FoldedAtlasPanel {
  /** Stable, unique panel ID used by selection. */
  id: string;
  /** Panel name, visible on its selection button. */
  label: string;
  /** Plain-text content shown independently of the folded drawing when selected. */
  description: string;
  /** Filled polygons in panel-local coordinates from 0 to 1, each with at least three finite points. */
  shapes: [number, number][][];
}

export interface FoldedAtlasProps {
  /** Up to twelve connected panels with normalized polygon shapes; duplicate or empty IDs are omitted. */
  panels: FoldedAtlasPanel[];
  /** Accordion fold from 0 (flat) to 1 (72-degree alternating hinges). */
  fold: number;
  /** Selected panel ID. Null uses internal selection; an empty string selects none. */
  value: string | null;
  /** Initial selected panel ID, read once when mounted in uncontrolled mode. */
  defaultValue: string;
  /** Accessible name for the atlas and its independent panel controls. */
  label: string;
}

export interface FoldedAtlasEvents {
  /** Selected panel ID, emitted only after pointer or keyboard input. */
  valueChange: string;
}

export const defaults: FoldedAtlasProps = {
  panels: [
    { id: "coast", label: "Coast", description: "A broken coastline surrounds sheltered bays and offshore islands.", shapes: [[[0, 0.14], [0.37, 0.12], [0.52, 0.27], [0.33, 0.39], [0.51, 0.54], [0.37, 0.69], [0.57, 0.8], [0.38, 0.9], [0, 0.91]], [[0.73, 0.29], [0.89, 0.36], [0.81, 0.47], [0.67, 0.4]], [[0.69, 0.63], [0.83, 0.7], [0.74, 0.79], [0.63, 0.72]]] },
    { id: "estuary", label: "Estuary", description: "Tidal channels divide the estuary into long, low islands.", shapes: [[[0, 0.14], [0.63, 0.1], [1, 0.22], [1, 0.43], [0.72, 0.33], [0.43, 0.4], [0.15, 0.3], [0, 0.36]], [[0, 0.5], [0.23, 0.42], [0.59, 0.53], [1, 0.46], [1, 0.74], [0.67, 0.65], [0.38, 0.7], [0.13, 0.63], [0, 0.76]], [[0.08, 0.82], [0.46, 0.77], [0.81, 0.86], [0.53, 0.94], [0.16, 0.91]]] },
    { id: "highlands", label: "Highlands", description: "Three ridges rise inland, separated by narrow valleys.", shapes: [[[0, 0.22], [0.26, 0.13], [0.37, 0.28], [0.2, 0.41], [0.35, 0.57], [0.18, 0.74], [0, 0.74]], [[0.36, 0.17], [0.63, 0.1], [0.7, 0.32], [0.54, 0.46], [0.72, 0.67], [0.48, 0.81], [0.35, 0.61], [0.45, 0.4]], [[0.76, 0.17], [1, 0.23], [1, 0.87], [0.79, 0.93], [0.85, 0.73], [0.71, 0.51], [0.86, 0.36]]] },
    { id: "interior", label: "Interior", description: "A broad interior basin holds an enclosed lake and a winding southern outlet.", shapes: [[[0, 0.23], [0.38, 0.11], [0.8, 0.19], [0.96, 0.43], [0.86, 0.71], [0.63, 0.77], [0.7, 0.49], [0.49, 0.36], [0.3, 0.49], [0.42, 0.68], [0.31, 0.9], [0, 0.87]], [[0.49, 0.47], [0.63, 0.51], [0.58, 0.61], [0.46, 0.58]]] },
  ],
  fold: 0.46,
  value: null,
  defaultValue: "estuary",
  label: "Folded landscape atlas",
};

type AtlasPoint = { x: number; y: number; z: number };
type AtlasFace = { id: string; index: number; polygon: AtlasPoint[]; depth: number };

function atlasPanels(input: FoldedAtlasPanel[]): FoldedAtlasPanel[] {
  const panels: FoldedAtlasPanel[] = [];
  const seen = new Set<string>();
  for (const panel of Array.isArray(input) ? input : []) {
    if (!panel || !panel.id || seen.has(panel.id) || panels.length >= 12) continue;
    const shapes: [number, number][][] = [];
    for (const shape of Array.isArray(panel.shapes) ? panel.shapes : []) {
      if (!Array.isArray(shape)) continue;
      const points: [number, number][] = [];
      for (const point of shape) {
        if (!Array.isArray(point)) continue;
        const x = point[0], y = point[1];
        if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) continue;
        points.push([Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))]);
      }
      if (points.length >= 3) shapes.push(points);
    }
    seen.add(panel.id);
    panels.push({ id: panel.id, label: String(panel.label || panel.id), description: String(panel.description || ""), shapes });
  }
  return panels;
}

export const mount: Mount<FoldedAtlasProps> = (host, initial = {}) => {
  let props: FoldedAtlasProps = { ...defaults, ...initial };
  let panels = atlasPanels(props.panels);
  let internalValue = props.defaultValue;
  let alive = true;
  let started = false;
  let faces: AtlasFace[] = [];
  const buttons = new Map<string, HTMLButtonElement>();
  const attrs = hostAttributes(host);
  const restore = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
  const emit = emitter<FoldedAtlasEvents>(host);
  const frame = document.createElement("div");
  frame.setAttribute("data-pica", "");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;inset:0 0 96px;overflow:hidden;cursor:pointer";
  host.appendChild(frame);
  const footer = document.createElement("div");
  footer.setAttribute("data-pica", "");
  footer.style.cssText = "position:absolute;left:16px;right:16px;bottom:12px;display:grid;gap:8px";
  const controls = document.createElement("div");
  controls.setAttribute("data-pica", "");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Atlas panels");
  controls.style.cssText = "display:flex;flex-wrap:wrap;gap:6px";
  const content = document.createElement("section");
  content.setAttribute("data-pica", "");
  content.id = nextId("atlas-content");
  content.style.cssText = `color:${cssVar("fg")};font:inherit;line-height:1.45;min-height:1.45em`;
  footer.append(controls, content);
  host.appendChild(footer);
  const surface = createCanvas(frame, { maxPixels: 4000000, onResize: () => { if (started) draw(); } });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => { if (started) draw(); });

  function selected(): string { return props.value === null ? internalValue : props.value; }

  function accessibility(): void {
    attrs.set("role", "group");
    attrs.set("aria-label", props.label || "Folded atlas");
    attrs.set("tabindex", "0");
  }

  function buildControls(): void {
    const focused = document.activeElement instanceof HTMLButtonElement && controls.contains(document.activeElement) ? document.activeElement.getAttribute("data-atlas-panel") : null;
    for (const button of buttons.values()) button.remove();
    buttons.clear();
    for (const panel of panels) {
      const button = document.createElement("button");
      button.setAttribute("data-pica", "");
      button.setAttribute("data-atlas-panel", panel.id);
      button.id = nextId("atlas-panel");
      button.type = "button";
      button.setAttribute("aria-controls", content.id);
      button.textContent = panel.label;
      button.style.cssText = `font:inherit;line-height:1.3;color:${cssVar("fg")};background:${cssVar("bg")};border:1px solid ${cssVar("muted")};border-radius:0;padding:5px 9px;cursor:pointer`;
      buttons.set(panel.id, button);
      controls.appendChild(button);
    }
    if (focused) buttons.get(focused)?.focus({ preventScroll: true });
  }

  function selection(): void {
    const value = selected();
    for (const [id, button] of buttons) {
      const active = id === value;
      button.setAttribute("aria-pressed", String(active));
      button.style.borderColor = cssVar(active ? "accent" : "muted");
      button.style.borderWidth = active ? "2px" : "1px";
      button.style.padding = active ? "4px 8px" : "5px 9px";
    }
    const panel = panels.find((p) => p.id === value);
    const button = panel ? buttons.get(panel.id) : undefined;
    if (button) content.setAttribute("aria-labelledby", button.id);
    else content.removeAttribute("aria-labelledby");
    content.textContent = panel ? panel.description : panels.length ? "Select a panel to read its content." : "No atlas panels.";
  }

  function project(index: number, u: number, v: number): AtlasPoint {
    const fold = Math.max(0, Math.min(1, Number.isFinite(props.fold) ? props.fold : defaults.fold));
    const angle = fold * Math.PI * 0.4;
    const along = Math.cos(angle), rise = Math.sin(angle);
    const x = (index + u - panels.length / 2) * along;
    const y = (v - 0.5) * 1.45;
    const z = ((index % 2 === 0 ? u : 1 - u) - 0.5) * rise;
    const yaw = -0.22, pitch = 0.14;
    const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
    const rz = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const ry = y * Math.cos(pitch) - rz * Math.sin(pitch);
    const depth = y * Math.sin(pitch) + rz * Math.cos(pitch);
    const distance = Math.max(5, panels.length * 0.9);
    const perspective = distance / (distance + depth);
    return { x: rx * perspective, y: ry * perspective, z: depth };
  }

  function draw(): void {
    if (!alive) return;
    const width = Math.max(1, surface.cssWidth), height = Math.max(1, surface.cssHeight);
    const rawFaces: AtlasFace[] = panels.map((panel, index) => {
      const polygon = [project(index, 0, 0), project(index, 1, 0), project(index, 1, 1), project(index, 0, 1)];
      return { id: panel.id, index, polygon, depth: polygon.reduce((sum, p) => sum + p.z, 0) / 4 };
    });
    const all = rawFaces.flatMap((face) => face.polygon);
    let minX = 0, maxX = 1, minY = 0, maxY = 1;
    if (all.length) {
      minX = Math.min(...all.map((p) => p.x)); maxX = Math.max(...all.map((p) => p.x));
      minY = Math.min(...all.map((p) => p.y)); maxY = Math.max(...all.map((p) => p.y));
    }
    const scale = Math.max(1, Math.min(Math.max(1, width - 34) / Math.max(0.1, maxX - minX), Math.max(1, height - 34) / Math.max(0.1, maxY - minY)));
    const x0 = width / 2 - (minX + maxX) / 2 * scale;
    const y0 = height / 2 - (minY + maxY) / 2 * scale;
    const screen = (point: AtlasPoint): AtlasPoint => ({ x: x0 + point.x * scale, y: y0 + point.y * scale, z: point.z });
    const at = (index: number, u: number, v: number): AtlasPoint => screen(project(index, u, v));
    faces = rawFaces.map((face) => ({ ...face, polygon: face.polygon.map(screen) })).sort((a, b) => b.depth - a.depth);
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = palette.colors.bg;
      ctx.fillRect(0, 0, width, height);
      const path = (points: AtlasPoint[]): void => {
        ctx.beginPath();
        points.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
        ctx.closePath();
      };
      for (const face of faces) {
        const panel = panels[face.index];
        if (!panel) continue;
        path(face.polygon);
        ctx.fillStyle = palette.colors.bg;
        ctx.globalAlpha = 1;
        ctx.fill();
        ctx.fillStyle = palette.colors.fg;
        ctx.globalAlpha = face.index % 2 ? 0.09 : 0.035;
        ctx.fill();
        ctx.save();
        path(face.polygon);
        ctx.clip();
        ctx.strokeStyle = palette.colors.muted;
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = 0.55;
        for (const t of [0.25, 0.5, 0.75]) {
          for (const pair of [[at(face.index, t, 0), at(face.index, t, 1)], [at(face.index, 0, t), at(face.index, 1, t)]]) {
            const a = pair[0], b = pair[1];
            if (!a || !b) continue;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        for (const shape of panel.shapes) {
          const polygon = shape.map(([u, v]) => at(face.index, u, v));
          path(polygon);
          ctx.fillStyle = palette.colors.fg;
          ctx.globalAlpha = 0.18;
          ctx.fill();
          ctx.strokeStyle = palette.colors.fg;
          ctx.globalAlpha = 0.75;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
        const active = panel.id === selected();
        path(face.polygon);
        ctx.strokeStyle = active ? palette.colors.accent : palette.colors.fg;
        ctx.globalAlpha = active ? 1 : 0.7;
        ctx.lineWidth = active ? 2 : 1;
        ctx.stroke();
        const lower = at(face.index, 0.5, 0.96);
        const left = at(face.index, 0, 0.96), right = at(face.index, 1, 0.96);
        ctx.font = `10px ${GRID_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = palette.colors.fg;
        ctx.globalAlpha = 1;
        const name = panel.label.toUpperCase();
        ctx.fillText(Math.abs(right.x - left.x) >= ctx.measureText(name).width + 8 ? name : String(face.index + 1), lower.x, lower.y - 4);
      }
      ctx.globalAlpha = 1;
    }
    attrs.set("data-pica-ready", "true");
  }

  function fitContent(): void {
    if (!alive) return;
    frame.style.bottom = `${Math.max(28, footer.offsetHeight + 24)}px`;
    if (started) draw();
  }

  function select(id: string): void {
    if (id === selected() || !panels.some((p) => p.id === id)) return;
    if (props.value === null) { internalValue = id; selection(); fitContent(); }
    emit("valueChange", id);
  }

  const onButton = (event: MouseEvent): void => {
    const button = event.target instanceof Element ? event.target.closest("button[data-atlas-panel]") : null;
    if (!button || !controls.contains(button)) return;
    const id = button.getAttribute("data-atlas-panel");
    if (id) select(id);
  };
  const onKey = (event: KeyboardEvent): void => {
    const button = event.target instanceof Element ? event.target.closest("button[data-atlas-panel]") : null;
    if (event.target !== host && (!button || !controls.contains(button))) return;
    if (!panels.length) return;
    const id = button?.getAttribute("data-atlas-panel") || selected();
    const index = panels.findIndex((panel) => panel.id === id);
    let next: number;
    switch (event.key) {
      case "ArrowRight": case "ArrowDown": next = (index + 1) % panels.length; break;
      case "ArrowLeft": case "ArrowUp": next = index < 0 ? panels.length - 1 : (index + panels.length - 1) % panels.length; break;
      case "Home": next = 0; break;
      case "End": next = panels.length - 1; break;
      default: return;
    }
    const panel = panels[next];
    if (!panel) return;
    event.preventDefault();
    buttons.get(panel.id)?.focus({ preventScroll: true });
    select(panel.id);
  };
  const onCanvas = (event: MouseEvent): void => {
    host.focus({ preventScroll: true });
    const rect = frame.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    // Near faces are visited first, matching the canvas painter's order.
    for (const face of [...faces].reverse()) {
      let inside = false;
      for (let i = 0; i < face.polygon.length; i++) {
        const a = face.polygon[i], b = face.polygon[(i + 1) % face.polygon.length];
        if (!a || !b || (a.y > y) === (b.y > y)) continue;
        if (x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
      }
      if (inside) { select(face.id); return; }
    }
  };
  controls.addEventListener("click", onButton);
  host.addEventListener("keydown", onKey);
  frame.addEventListener("click", onCanvas);
  const contentResize = typeof ResizeObserver === "function" ? new ResizeObserver(fitContent) : null;
  contentResize?.observe(footer);
  accessibility();
  buildControls();
  selection();
  fitContent();
  started = true;
  draw();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (!sameJson(before.panels, props.panels)) {
        panels = atlasPanels(props.panels);
        buildControls();
      }
      accessibility();
      selection();
      palette.refresh();
      fitContent();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      contentResize?.disconnect();
      controls.removeEventListener("click", onButton);
      host.removeEventListener("keydown", onKey);
      frame.removeEventListener("click", onCanvas);
      palette.destroy();
      surface.destroy();
      frame.remove();
      footer.remove();
      buttons.clear();
      attrs.restore();
      restore();
    },
  };
};

// registry/immersive/folded-atlas/index.tsx
export type FoldedAtlasComponentProps = Partial<FoldedAtlasProps> & WrapperProps & Handlers<FoldedAtlasEvents>;

/** Connected atlas panels fold along alternating hinges with accessible independent selection. */
export function FoldedAtlas({ className, style, palette, ...props }: FoldedAtlasComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Folded Atlas · folded-atlas
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Folded Atlas · Pica</title>
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
var PicaFoldedAtlas = (() => {
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

  // registry/immersive/folded-atlas/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

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

  // lib/canvas.ts
  function createCanvas(host, options = {}) {
    const { maxDpr = 2, maxPixels = Number.POSITIVE_INFINITY, autoSize = true, css = "", onResize } = options;
    const restore = styleHost(
      host,
      getComputedStyle(host).position === "static" ? { position: "relative", overflow: "hidden" } : { overflow: "hidden" }
    );
    const canvas = document.createElement("canvas");
    canvas.setAttribute("data-pica", "");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;${css}`;
    host.appendChild(canvas);
    let cssWidth = -1;
    let cssHeight = -1;
    let width = 0;
    let height = 0;
    let dpr = 1;
    function measure() {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === cssWidth && h === cssHeight) return false;
      cssWidth = w;
      cssHeight = h;
      dpr = Math.min(globalThis.devicePixelRatio || 1, maxDpr, Math.sqrt(maxPixels / (Math.max(1, w) * Math.max(1, h))));
      if (autoSize) {
        width = Math.max(1, Math.round(w * dpr));
        height = Math.max(1, Math.round(h * dpr));
        canvas.width = width;
        canvas.height = height;
      }
      return true;
    }
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
      if (measure()) onResize?.(cssWidth, cssHeight);
    }) : null;
    observer?.observe(host);
    return {
      canvas,
      get width() {
        return width;
      },
      get height() {
        return height;
      },
      get dpr() {
        return dpr;
      },
      get cssWidth() {
        return cssWidth;
      },
      get cssHeight() {
        return cssHeight;
      },
      destroy() {
        observer?.disconnect();
        canvas.remove();
        restore();
      }
    };
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

  // registry/immersive/folded-atlas/core.ts
  var defaults = {
    panels: [
      { id: "coast", label: "Coast", description: "A broken coastline surrounds sheltered bays and offshore islands.", shapes: [[[0, 0.14], [0.37, 0.12], [0.52, 0.27], [0.33, 0.39], [0.51, 0.54], [0.37, 0.69], [0.57, 0.8], [0.38, 0.9], [0, 0.91]], [[0.73, 0.29], [0.89, 0.36], [0.81, 0.47], [0.67, 0.4]], [[0.69, 0.63], [0.83, 0.7], [0.74, 0.79], [0.63, 0.72]]] },
      { id: "estuary", label: "Estuary", description: "Tidal channels divide the estuary into long, low islands.", shapes: [[[0, 0.14], [0.63, 0.1], [1, 0.22], [1, 0.43], [0.72, 0.33], [0.43, 0.4], [0.15, 0.3], [0, 0.36]], [[0, 0.5], [0.23, 0.42], [0.59, 0.53], [1, 0.46], [1, 0.74], [0.67, 0.65], [0.38, 0.7], [0.13, 0.63], [0, 0.76]], [[0.08, 0.82], [0.46, 0.77], [0.81, 0.86], [0.53, 0.94], [0.16, 0.91]]] },
      { id: "highlands", label: "Highlands", description: "Three ridges rise inland, separated by narrow valleys.", shapes: [[[0, 0.22], [0.26, 0.13], [0.37, 0.28], [0.2, 0.41], [0.35, 0.57], [0.18, 0.74], [0, 0.74]], [[0.36, 0.17], [0.63, 0.1], [0.7, 0.32], [0.54, 0.46], [0.72, 0.67], [0.48, 0.81], [0.35, 0.61], [0.45, 0.4]], [[0.76, 0.17], [1, 0.23], [1, 0.87], [0.79, 0.93], [0.85, 0.73], [0.71, 0.51], [0.86, 0.36]]] },
      { id: "interior", label: "Interior", description: "A broad interior basin holds an enclosed lake and a winding southern outlet.", shapes: [[[0, 0.23], [0.38, 0.11], [0.8, 0.19], [0.96, 0.43], [0.86, 0.71], [0.63, 0.77], [0.7, 0.49], [0.49, 0.36], [0.3, 0.49], [0.42, 0.68], [0.31, 0.9], [0, 0.87]], [[0.49, 0.47], [0.63, 0.51], [0.58, 0.61], [0.46, 0.58]]] }
    ],
    fold: 0.46,
    value: null,
    defaultValue: "estuary",
    label: "Folded landscape atlas"
  };
  function atlasPanels(input) {
    const panels = [];
    const seen = /* @__PURE__ */ new Set();
    for (const panel of Array.isArray(input) ? input : []) {
      if (!panel || !panel.id || seen.has(panel.id) || panels.length >= 12) continue;
      const shapes = [];
      for (const shape of Array.isArray(panel.shapes) ? panel.shapes : []) {
        if (!Array.isArray(shape)) continue;
        const points = [];
        for (const point of shape) {
          if (!Array.isArray(point)) continue;
          const x = point[0], y = point[1];
          if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) continue;
          points.push([Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))]);
        }
        if (points.length >= 3) shapes.push(points);
      }
      seen.add(panel.id);
      panels.push({ id: panel.id, label: String(panel.label || panel.id), description: String(panel.description || ""), shapes });
    }
    return panels;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let panels = atlasPanels(props.panels);
    let internalValue = props.defaultValue;
    let alive = true;
    let started = false;
    let faces = [];
    const buttons = /* @__PURE__ */ new Map();
    const attrs = hostAttributes(host);
    const restore = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
    const emit = emitter(host);
    const frame = document.createElement("div");
    frame.setAttribute("data-pica", "");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:absolute;inset:0 0 96px;overflow:hidden;cursor:pointer";
    host.appendChild(frame);
    const footer = document.createElement("div");
    footer.setAttribute("data-pica", "");
    footer.style.cssText = "position:absolute;left:16px;right:16px;bottom:12px;display:grid;gap:8px";
    const controls = document.createElement("div");
    controls.setAttribute("data-pica", "");
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Atlas panels");
    controls.style.cssText = "display:flex;flex-wrap:wrap;gap:6px";
    const content = document.createElement("section");
    content.setAttribute("data-pica", "");
    content.id = nextId("atlas-content");
    content.style.cssText = `color:${cssVar("fg")};font:inherit;line-height:1.45;min-height:1.45em`;
    footer.append(controls, content);
    host.appendChild(footer);
    const surface = createCanvas(frame, { maxPixels: 4e6, onResize: () => {
      if (started) draw();
    } });
    const ctx = surface.canvas.getContext("2d");
    const palette = watchPalette(host, () => {
      if (started) draw();
    });
    function selected() {
      return props.value === null ? internalValue : props.value;
    }
    function accessibility() {
      attrs.set("role", "group");
      attrs.set("aria-label", props.label || "Folded atlas");
      attrs.set("tabindex", "0");
    }
    function buildControls() {
      const focused = document.activeElement instanceof HTMLButtonElement && controls.contains(document.activeElement) ? document.activeElement.getAttribute("data-atlas-panel") : null;
      for (const button of buttons.values()) button.remove();
      buttons.clear();
      for (const panel of panels) {
        const button = document.createElement("button");
        button.setAttribute("data-pica", "");
        button.setAttribute("data-atlas-panel", panel.id);
        button.id = nextId("atlas-panel");
        button.type = "button";
        button.setAttribute("aria-controls", content.id);
        button.textContent = panel.label;
        button.style.cssText = `font:inherit;line-height:1.3;color:${cssVar("fg")};background:${cssVar("bg")};border:1px solid ${cssVar("muted")};border-radius:0;padding:5px 9px;cursor:pointer`;
        buttons.set(panel.id, button);
        controls.appendChild(button);
      }
      if (focused) buttons.get(focused)?.focus({ preventScroll: true });
    }
    function selection() {
      const value = selected();
      for (const [id, button2] of buttons) {
        const active = id === value;
        button2.setAttribute("aria-pressed", String(active));
        button2.style.borderColor = cssVar(active ? "accent" : "muted");
        button2.style.borderWidth = active ? "2px" : "1px";
        button2.style.padding = active ? "4px 8px" : "5px 9px";
      }
      const panel = panels.find((p) => p.id === value);
      const button = panel ? buttons.get(panel.id) : void 0;
      if (button) content.setAttribute("aria-labelledby", button.id);
      else content.removeAttribute("aria-labelledby");
      content.textContent = panel ? panel.description : panels.length ? "Select a panel to read its content." : "No atlas panels.";
    }
    function project(index, u, v) {
      const fold = Math.max(0, Math.min(1, Number.isFinite(props.fold) ? props.fold : defaults.fold));
      const angle = fold * Math.PI * 0.4;
      const along = Math.cos(angle), rise = Math.sin(angle);
      const x = (index + u - panels.length / 2) * along;
      const y = (v - 0.5) * 1.45;
      const z = ((index % 2 === 0 ? u : 1 - u) - 0.5) * rise;
      const yaw = -0.22, pitch = 0.14;
      const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
      const rz = -x * Math.sin(yaw) + z * Math.cos(yaw);
      const ry = y * Math.cos(pitch) - rz * Math.sin(pitch);
      const depth = y * Math.sin(pitch) + rz * Math.cos(pitch);
      const distance = Math.max(5, panels.length * 0.9);
      const perspective = distance / (distance + depth);
      return { x: rx * perspective, y: ry * perspective, z: depth };
    }
    function draw() {
      if (!alive) return;
      const width = Math.max(1, surface.cssWidth), height = Math.max(1, surface.cssHeight);
      const rawFaces = panels.map((panel, index) => {
        const polygon = [project(index, 0, 0), project(index, 1, 0), project(index, 1, 1), project(index, 0, 1)];
        return { id: panel.id, index, polygon, depth: polygon.reduce((sum, p) => sum + p.z, 0) / 4 };
      });
      const all = rawFaces.flatMap((face) => face.polygon);
      let minX = 0, maxX = 1, minY = 0, maxY = 1;
      if (all.length) {
        minX = Math.min(...all.map((p) => p.x));
        maxX = Math.max(...all.map((p) => p.x));
        minY = Math.min(...all.map((p) => p.y));
        maxY = Math.max(...all.map((p) => p.y));
      }
      const scale = Math.max(1, Math.min(Math.max(1, width - 34) / Math.max(0.1, maxX - minX), Math.max(1, height - 34) / Math.max(0.1, maxY - minY)));
      const x0 = width / 2 - (minX + maxX) / 2 * scale;
      const y0 = height / 2 - (minY + maxY) / 2 * scale;
      const screen = (point) => ({ x: x0 + point.x * scale, y: y0 + point.y * scale, z: point.z });
      const at = (index, u, v) => screen(project(index, u, v));
      faces = rawFaces.map((face) => ({ ...face, polygon: face.polygon.map(screen) })).sort((a, b) => b.depth - a.depth);
      if (ctx) {
        ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = palette.colors.bg;
        ctx.fillRect(0, 0, width, height);
        const path = (points) => {
          ctx.beginPath();
          points.forEach((p, i) => {
            if (i) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
          });
          ctx.closePath();
        };
        for (const face of faces) {
          const panel = panels[face.index];
          if (!panel) continue;
          path(face.polygon);
          ctx.fillStyle = palette.colors.bg;
          ctx.globalAlpha = 1;
          ctx.fill();
          ctx.fillStyle = palette.colors.fg;
          ctx.globalAlpha = face.index % 2 ? 0.09 : 0.035;
          ctx.fill();
          ctx.save();
          path(face.polygon);
          ctx.clip();
          ctx.strokeStyle = palette.colors.muted;
          ctx.lineWidth = 0.6;
          ctx.globalAlpha = 0.55;
          for (const t of [0.25, 0.5, 0.75]) {
            for (const pair of [[at(face.index, t, 0), at(face.index, t, 1)], [at(face.index, 0, t), at(face.index, 1, t)]]) {
              const a = pair[0], b = pair[1];
              if (!a || !b) continue;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
          for (const shape of panel.shapes) {
            const polygon = shape.map(([u, v]) => at(face.index, u, v));
            path(polygon);
            ctx.fillStyle = palette.colors.fg;
            ctx.globalAlpha = 0.18;
            ctx.fill();
            ctx.strokeStyle = palette.colors.fg;
            ctx.globalAlpha = 0.75;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.restore();
          const active = panel.id === selected();
          path(face.polygon);
          ctx.strokeStyle = active ? palette.colors.accent : palette.colors.fg;
          ctx.globalAlpha = active ? 1 : 0.7;
          ctx.lineWidth = active ? 2 : 1;
          ctx.stroke();
          const lower = at(face.index, 0.5, 0.96);
          const left = at(face.index, 0, 0.96), right = at(face.index, 1, 0.96);
          ctx.font = `10px ${GRID_FONT}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillStyle = palette.colors.fg;
          ctx.globalAlpha = 1;
          const name = panel.label.toUpperCase();
          ctx.fillText(Math.abs(right.x - left.x) >= ctx.measureText(name).width + 8 ? name : String(face.index + 1), lower.x, lower.y - 4);
        }
        ctx.globalAlpha = 1;
      }
      attrs.set("data-pica-ready", "true");
    }
    function fitContent() {
      if (!alive) return;
      frame.style.bottom = `${Math.max(28, footer.offsetHeight + 24)}px`;
      if (started) draw();
    }
    function select(id) {
      if (id === selected() || !panels.some((p) => p.id === id)) return;
      if (props.value === null) {
        internalValue = id;
        selection();
        fitContent();
      }
      emit("valueChange", id);
    }
    const onButton = (event) => {
      const button = event.target instanceof Element ? event.target.closest("button[data-atlas-panel]") : null;
      if (!button || !controls.contains(button)) return;
      const id = button.getAttribute("data-atlas-panel");
      if (id) select(id);
    };
    const onKey = (event) => {
      const button = event.target instanceof Element ? event.target.closest("button[data-atlas-panel]") : null;
      if (event.target !== host && (!button || !controls.contains(button))) return;
      if (!panels.length) return;
      const id = button?.getAttribute("data-atlas-panel") || selected();
      const index = panels.findIndex((panel2) => panel2.id === id);
      let next;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = (index + 1) % panels.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = index < 0 ? panels.length - 1 : (index + panels.length - 1) % panels.length;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = panels.length - 1;
          break;
        default:
          return;
      }
      const panel = panels[next];
      if (!panel) return;
      event.preventDefault();
      buttons.get(panel.id)?.focus({ preventScroll: true });
      select(panel.id);
    };
    const onCanvas = (event) => {
      host.focus({ preventScroll: true });
      const rect = frame.getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      for (const face of [...faces].reverse()) {
        let inside = false;
        for (let i = 0; i < face.polygon.length; i++) {
          const a = face.polygon[i], b = face.polygon[(i + 1) % face.polygon.length];
          if (!a || !b || a.y > y === b.y > y) continue;
          if (x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
        }
        if (inside) {
          select(face.id);
          return;
        }
      }
    };
    controls.addEventListener("click", onButton);
    host.addEventListener("keydown", onKey);
    frame.addEventListener("click", onCanvas);
    const contentResize = typeof ResizeObserver === "function" ? new ResizeObserver(fitContent) : null;
    contentResize?.observe(footer);
    accessibility();
    buildControls();
    selection();
    fitContent();
    started = true;
    draw();
    return {
      update(next) {
        if (!alive) return;
        const before = props;
        props = { ...props, ...next };
        if (!sameJson(before.panels, props.panels)) {
          panels = atlasPanels(props.panels);
          buildControls();
        }
        accessibility();
        selection();
        palette.refresh();
        fitContent();
      },
      destroy() {
        if (!alive) return;
        alive = false;
        contentResize?.disconnect();
        controls.removeEventListener("click", onButton);
        host.removeEventListener("keydown", onKey);
        frame.removeEventListener("click", onCanvas);
        palette.destroy();
        surface.destroy();
        frame.remove();
        footer.remove();
        buttons.clear();
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
  var instance = PicaFoldedAtlas.mount(host, take(initial));
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
