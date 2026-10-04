# Perspective Maze

> A supplied wall grid becomes a perspective viewport with collision-safe navigation, native controls, and a text-map fallback.

Category: immersive. Tags: maze, perspective, raycasting, navigation, keyboard, canvas. Static. Size: 5.1 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/perspective-maze.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `grid` | string[] | `["#########","#......E#","#.###.#.#","#.#...#.#","#.#.###.#","#...#...#","#########"]` | Grid rows: # is a wall, . or a space is a passage, E is an exit; all other and missing cells are solid. |
| `position` | [number, number] \| null | `null` | Controlled zero-based [column, row]; null uses internal navigation. Invalid cells resolve to the nearest passage. |
| `defaultPosition` | [number, number] | `[1,1]` | Initial [column, row], read once when mounted in uncontrolled mode. |
| `direction` | MazeDirection \| null | `null` | Controlled cardinal heading; null uses internal turning. |
| `defaultDirection` | MazeDirection | `"east"` | Initial cardinal heading, read once when mounted in uncontrolled mode. |
| `label` | string | `"Perspective maze"` | Accessible name for the viewport, controls, and location summary; empty hides the component. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `positionChange` | `onPositionChange` | `[number, number]` | A collision-safe destination cell, emitted only in response to navigation input. |
| `directionChange` | `onDirectionChange` | `MazeDirection` | A proposed cardinal heading, emitted only in response to a turn. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Perspective Maze · perspective-maze
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

// registry/immersive/perspective-maze/core.ts
export type MazeDirection = "north" | "east" | "south" | "west";

export interface PerspectiveMazeProps {
  /** Grid rows: # is a wall, . or a space is a passage, E is an exit; all other and missing cells are solid. */
  grid: string[];
  /** Controlled zero-based [column, row]; null uses internal navigation. Invalid cells resolve to the nearest passage. */
  position: [number, number] | null;
  /** Initial [column, row], read once when mounted in uncontrolled mode. */
  defaultPosition: [number, number];
  /** Controlled cardinal heading; null uses internal turning. */
  direction: MazeDirection | null;
  /** Initial cardinal heading, read once when mounted in uncontrolled mode. */
  defaultDirection: MazeDirection;
  /** Accessible name for the viewport, controls, and location summary; empty hides the component. */
  label: string;
}

export interface PerspectiveMazeEvents {
  /** A collision-safe destination cell, emitted only in response to navigation input. */
  positionChange: [number, number];
  /** A proposed cardinal heading, emitted only in response to a turn. */
  directionChange: MazeDirection;
}

export const defaults: PerspectiveMazeProps = {
  grid: [
    "#########",
    "#......E#",
    "#.###.#.#",
    "#.#...#.#",
    "#.#.###.#",
    "#...#...#",
    "#########",
  ],
  position: null,
  defaultPosition: [1, 1],
  direction: null,
  defaultDirection: "east",
  label: "Perspective maze",
};

const MAZE_HEADINGS: readonly MazeDirection[] = ["north", "east", "south", "west"];
const MAZE_VECTORS: readonly (readonly [number, number])[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

function mazeHeading(direction: MazeDirection): MazeDirection {
  return MAZE_HEADINGS.includes(direction) ? direction : "east";
}

function mazeOpen(rows: readonly string[], x: number, y: number): boolean {
  const cell = rows[y]?.[x];
  return cell === "." || cell === " " || cell === "E";
}

function mazePosition(rows: readonly string[], raw: readonly number[]): [number, number] | null {
  const x = Math.round(Number.isFinite(raw[0]) ? (raw[0] ?? 0) : 0);
  const y = Math.round(Number.isFinite(raw[1]) ? (raw[1] ?? 0) : 0);
  if (mazeOpen(rows, x, y)) return [x, y];
  let nearest: [number, number] | null = null;
  let distance = Infinity;
  for (let row = 0; row < rows.length; row++) {
    for (let column = 0; column < (rows[row]?.length ?? 0); column++) {
      if (!mazeOpen(rows, column, row)) continue;
      const next = Math.abs(column - x) + Math.abs(row - y);
      if (next < distance) { distance = next; nearest = [column, row]; }
    }
  }
  return nearest;
}

function mazePart<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-part", name);
  return node;
}

function mazeRules(selector: string): string {
  const part = (name: string): string => `${selector} [data-part="${name}"]`;
  const fg = cssVar("fg"), muted = cssVar("muted"), accent = cssVar("accent");
  return [
    `${selector}{display:block;color:${fg}}`,
    `${part("root")}{display:grid;grid-template-rows:minmax(0,1fr) auto auto;gap:0.55em;width:100%;height:100%;min-height:0}`,
    `${part("view")}{position:relative;overflow:hidden;min-height:0;background:${cssVar("bg")};border:1px solid color-mix(in srgb,${fg} 30%,transparent)}`,
    `${part("view")}:focus-visible{outline:2px solid ${accent};outline-offset:-3px}`,
    `${part("status")}{font-family:${GRID_FONT};font-size:0.75em;line-height:1.5;color:${muted};min-height:1.5em}`,
    `${part("controls")}{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0.35em}`,
    `${selector} button{font:inherit;font-family:${GRID_FONT};font-size:0.7em;line-height:1.35;padding:0.55em 0.3em;white-space:nowrap;color:${fg};background:${cssVar("bg")};border:1px solid color-mix(in srgb,${fg} 35%,transparent);border-radius:0;cursor:pointer}`,
    `${selector} button:hover:not(:disabled){background:color-mix(in srgb,${fg} 10%,transparent)}`,
    `${selector} button:focus-visible,${selector} summary:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} button:disabled,${selector} button[aria-disabled="true"]{color:${muted};border-style:dashed;cursor:not-allowed}`,
    `${part("fallback")}{box-sizing:border-box;margin:0;padding:0.8em;font-family:${GRID_FONT};font-size:0.85em;line-height:1.3;color:${fg};max-width:100%;max-height:100%;overflow:auto}`,
    `${part("help")}{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}`,
  ].join("\n");
}

export const mount: Mount<PerspectiveMazeProps> = (host, initial = {}) => {
  let props: PerspectiveMazeProps = { ...defaults, ...initial };
  let internalPosition = mazePosition(props.grid, props.defaultPosition);
  let internalDirection = mazeHeading(props.defaultDirection);
  let alive = true;
  let surface: ReturnType<typeof createCanvas> | null = null;
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  sheet.setRules(mazeRules(sheet.selector));
  const emit = emitter<PerspectiveMazeEvents>(host);
  const abort = new AbortController();
  const on = { signal: abort.signal };
  const root = mazePart("div", "root");
  const view = mazePart("div", "view");
  view.tabIndex = 0;
  view.setAttribute("role", "group");
  const fallback = mazePart("pre", "fallback");
  const status = mazePart("div", "status");
  status.id = nextId("maze-status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  const help = mazePart("span", "help");
  help.id = nextId("maze-help");
  help.textContent = "Arrow Up or W moves forward; Arrow Down or S moves backward; Arrow Left or A turns left; Arrow Right or D turns right. Native buttons offer the same navigation. Coordinates are zero-based. Walls and cells outside the supplied grid cannot be entered. E marks an exit.";
  const controls = mazePart("div", "controls");
  const actions = ["left", "forward", "back", "right"] as const;
  const titles = ["Turn left", "Forward", "Back", "Turn right"] as const;
  const buttons = actions.map((action, index) => {
    const button = mazePart("button", action);
    button.type = "button";
    button.textContent = titles[index] ?? action;
    button.setAttribute("data-action", action);
    controls.append(button);
    return button;
  });
  view.append(fallback);
  root.append(view, status, controls, help);
  host.append(root);
  surface = createCanvas(view, { onResize: () => draw() });
  surface.canvas.setAttribute("aria-hidden", "true");
  const ctx = surface.canvas.getContext("2d");
  fallback.hidden = Boolean(ctx);
  const palette = watchPalette(host, () => { if (alive) draw(); });

  function position(): [number, number] | null {
    return mazePosition(props.grid, props.position ?? internalPosition ?? props.defaultPosition);
  }
  function direction(): MazeDirection { return mazeHeading(props.direction ?? internalDirection); }
  function vector(): readonly [number, number] { return MAZE_VECTORS[MAZE_HEADINGS.indexOf(direction())] ?? [1, 0]; }
  function available(sign: number): boolean {
    const p = position();
    const v = vector();
    return Boolean(p && mazeOpen(props.grid, p[0] + v[0] * sign, p[1] + v[1] * sign));
  }

  function configure(): void {
    const label = props.label.trim();
    attrs.set("role", label ? "group" : null);
    attrs.set("aria-label", label || null);
    attrs.set("aria-hidden", label ? null : "true");
    attrs.set("aria-describedby", label ? `${help.id} ${status.id}` : null);
    view.setAttribute("aria-label", `${label || "Maze"} viewport`);
    view.setAttribute("aria-describedby", `${help.id} ${status.id}`);
  }

  function describe(): void {
    const p = position();
    const heading = direction();
    root.setAttribute("data-direction", heading);
    root.setAttribute("data-position", p ? p.join(",") : "");
    if (!p) {
      status.textContent = "No walkable cells in the supplied grid.";
      buttons.forEach((button) => { button.disabled = true; });
    } else {
      const v = vector();
      const left = mazeOpen(props.grid, p[0] + v[1], p[1] - v[0]);
      const right = mazeOpen(props.grid, p[0] - v[1], p[1] + v[0]);
      status.textContent = `x${p[0]} y${p[1]} · ${heading.charAt(0).toUpperCase() + heading.slice(1)} · ${props.grid[p[1]]?.[p[0]] === "E" ? "Exit reached" : `Forward ${available(1) ? "open" : "wall"}, left ${left ? "open" : "wall"}, right ${right ? "open" : "wall"}`}`;
      // Keep a blocked movement button focusable so turning never drops
      // keyboard focus. act() still enforces collision for every input.
      buttons.forEach((button) => { button.disabled = false; });
      buttons[1]?.setAttribute("aria-disabled", String(!available(1)));
      buttons[2]?.setAttribute("aria-disabled", String(!available(-1)));
    }
    if (!ctx) {
      const marker = { north: "^", east: ">", south: "v", west: "<" }[heading];
      fallback.textContent = props.grid.map((row, y) => [...row].map((cell, x) => p && p[0] === x && p[1] === y ? marker : cell).join("")).join("\n") || "No grid supplied";
    }
  }

  function draw(): void {
    if (!alive || !surface) return;
    describe();
    const p = position();
    if (ctx && surface.width > 0 && surface.height > 0) {
      const width = surface.cssWidth, height = surface.cssHeight;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, surface.width, surface.height);
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.colors.bg;
      ctx.fillRect(0, 0, width, height);
      if (p) {
        const forward = vector();
        const right: readonly [number, number] = [-forward[1], forward[0]];
        const originX = p[0] + 0.5, originY = p[1] + 0.5;
        const columns = Math.max(1, Math.min(600, Math.ceil(width)));
        const slice = width / columns;
        const depths = new Float64Array(columns);
        const maxSteps = props.grid.length + Math.max(0, ...props.grid.map((row) => row.length)) + 4;
        ctx.strokeStyle = palette.colors.muted;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
        for (let depth = 1; depth <= 8; depth++) {
          const y = height / 2 + height / (depth * 2);
          if (y < height) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        }
        ctx.stroke();
        for (let column = 0; column < columns; column++) {
          const camera = 2 * (column + 0.5) / columns - 1;
          const rayX = forward[0] + right[0] * 0.66 * camera;
          const rayY = forward[1] + right[1] * 0.66 * camera;
          const deltaX = rayX === 0 ? Infinity : Math.abs(1 / rayX);
          const deltaY = rayY === 0 ? Infinity : Math.abs(1 / rayY);
          const stepX = rayX < 0 ? -1 : 1, stepY = rayY < 0 ? -1 : 1;
          let cellX = p[0], cellY = p[1];
          let sideX = (rayX < 0 ? originX - cellX : cellX + 1 - originX) * deltaX;
          let sideY = (rayY < 0 ? originY - cellY : cellY + 1 - originY) * deltaY;
          let verticalSide = false;
          for (let i = 0; i < maxSteps; i++) {
            if (sideX < sideY) { sideX += deltaX; cellX += stepX; verticalSide = true; }
            else { sideY += deltaY; cellY += stepY; verticalSide = false; }
            if (!mazeOpen(props.grid, cellX, cellY)) break;
          }
          const distance = Math.max(0.05, verticalSide ? sideX - deltaX : sideY - deltaY);
          depths[column] = distance;
          const wallHeight = height / distance;
          const top = (height - wallHeight) / 2;
          const face = verticalSide ? originY + distance * rayY : originX + distance * rayX;
          const fraction = face - Math.floor(face);
          const seam = fraction < 0.018 || fraction > 0.982;
          ctx.fillStyle = palette.colors.fg;
          ctx.globalAlpha = seam ? 0.68 : Math.min(0.6, (verticalSide ? 0.48 : 0.34) / (1 + distance * 0.09));
          ctx.fillRect(column * slice, top, slice + 0.3, wallHeight);
          ctx.globalAlpha = 0.78;
          ctx.fillRect(column * slice, top, slice + 0.3, 1);
          ctx.fillRect(column * slice, top + wallHeight - 1, slice + 0.3, 1);
        }
        // Exit plaques project from actual E cells and are occluded by the
        // same depth buffer as the supplied walls.
        ctx.strokeStyle = palette.colors.accent;
        ctx.fillStyle = palette.colors.accent;
        ctx.globalAlpha = 1;
        for (let y = 0; y < props.grid.length; y++) {
          for (let x = 0; x < (props.grid[y]?.length ?? 0); x++) {
            if (props.grid[y]?.[x] !== "E") continue;
            const relativeX = x + 0.5 - originX, relativeY = y + 0.5 - originY;
            const depth = relativeX * forward[0] + relativeY * forward[1];
            if (depth <= 0.05) continue;
            const sideways = relativeX * right[0] + relativeY * right[1];
            const center = width * (0.5 + sideways / (depth * 1.32));
            const size = Math.min(height * 0.6, height / depth * 0.38);
            const index = Math.max(0, Math.min(columns - 1, Math.floor(center / slice)));
            if (center < 0 || center > width || (depths[index] ?? Infinity) < depth - 0.05) continue;
            ctx.lineWidth = Math.max(1.5, size * 0.08);
            ctx.strokeRect(center - size * 0.35, height / 2 - size / 2, size * 0.7, size);
            ctx.beginPath();
            ctx.moveTo(center - size * 0.17, height / 2); ctx.lineTo(center + size * 0.17, height / 2);
            ctx.moveTo(center + size * 0.03, height / 2 - size * 0.12); ctx.lineTo(center + size * 0.17, height / 2); ctx.lineTo(center + size * 0.03, height / 2 + size * 0.12);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    attrs.set("data-pica-ready", "true");
  }

  function act(action: typeof actions[number]): void {
    const p = position();
    if (!p) return;
    if (action === "left" || action === "right") {
      const index = MAZE_HEADINGS.indexOf(direction());
      const next = MAZE_HEADINGS[(index + (action === "left" ? 3 : 1)) % 4] ?? "east";
      if (props.direction === null) { internalDirection = next; draw(); }
      emit("directionChange", next);
      return;
    }
    const v = vector();
    const sign = action === "forward" ? 1 : -1;
    const next: [number, number] = [p[0] + v[0] * sign, p[1] + v[1] * sign];
    if (!mazeOpen(props.grid, next[0], next[1])) return;
    if (props.position === null) { internalPosition = next; draw(); }
    emit("positionChange", next);
  }

  buttons.forEach((button, index) => button.addEventListener("click", () => { const action = actions[index]; if (action) act(action); }, on));
  const onKey = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey || !root.contains(event.target as Node)) return;
    const key = event.key.toLowerCase();
    const action = key === "arrowup" || key === "w" ? "forward" : key === "arrowdown" || key === "s" ? "back" : key === "arrowleft" || key === "a" ? "left" : key === "arrowright" || key === "d" ? "right" : null;
    if (!action) return;
    event.preventDefault();
    act(action);
  };
  root.addEventListener("keydown", onKey, on);
  configure();
  draw();

  return {
    update(partial) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...partial };
      if (!sameJson(before.grid, props.grid)) internalPosition = mazePosition(props.grid, internalPosition ?? props.defaultPosition);
      if (before.label !== props.label) configure();
      palette.refresh();
      draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      abort.abort();
      palette.destroy();
      surface?.destroy();
      root.remove();
      sheet.destroy();
      attrs.restore();
    },
  };
};

// registry/immersive/perspective-maze/index.tsx
export type PerspectiveMazeComponentProps = Partial<PerspectiveMazeProps> & Handlers<PerspectiveMazeEvents> & WrapperProps;

/** A supplied wall grid viewed in perspective, with collision-safe keyboard and native-button navigation. */
export function PerspectiveMaze({ className, style, palette, ...props }: PerspectiveMazeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Perspective Maze · perspective-maze
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Perspective Maze · Pica</title>
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
var PicaPerspectiveMaze = (() => {
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

  // registry/immersive/perspective-maze/core.ts
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

  // registry/immersive/perspective-maze/core.ts
  var defaults = {
    grid: [
      "#########",
      "#......E#",
      "#.###.#.#",
      "#.#...#.#",
      "#.#.###.#",
      "#...#...#",
      "#########"
    ],
    position: null,
    defaultPosition: [1, 1],
    direction: null,
    defaultDirection: "east",
    label: "Perspective maze"
  };
  var MAZE_HEADINGS = ["north", "east", "south", "west"];
  var MAZE_VECTORS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  function mazeHeading(direction) {
    return MAZE_HEADINGS.includes(direction) ? direction : "east";
  }
  function mazeOpen(rows, x, y) {
    const cell = rows[y]?.[x];
    return cell === "." || cell === " " || cell === "E";
  }
  function mazePosition(rows, raw) {
    const x = Math.round(Number.isFinite(raw[0]) ? raw[0] ?? 0 : 0);
    const y = Math.round(Number.isFinite(raw[1]) ? raw[1] ?? 0 : 0);
    if (mazeOpen(rows, x, y)) return [x, y];
    let nearest = null;
    let distance = Infinity;
    for (let row = 0; row < rows.length; row++) {
      for (let column = 0; column < (rows[row]?.length ?? 0); column++) {
        if (!mazeOpen(rows, column, row)) continue;
        const next = Math.abs(column - x) + Math.abs(row - y);
        if (next < distance) {
          distance = next;
          nearest = [column, row];
        }
      }
    }
    return nearest;
  }
  function mazePart(tag, name) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    node.setAttribute("data-part", name);
    return node;
  }
  function mazeRules(selector) {
    const part = (name) => `${selector} [data-part="${name}"]`;
    const fg = cssVar("fg"), muted = cssVar("muted"), accent = cssVar("accent");
    return [
      `${selector}{display:block;color:${fg}}`,
      `${part("root")}{display:grid;grid-template-rows:minmax(0,1fr) auto auto;gap:0.55em;width:100%;height:100%;min-height:0}`,
      `${part("view")}{position:relative;overflow:hidden;min-height:0;background:${cssVar("bg")};border:1px solid color-mix(in srgb,${fg} 30%,transparent)}`,
      `${part("view")}:focus-visible{outline:2px solid ${accent};outline-offset:-3px}`,
      `${part("status")}{font-family:${GRID_FONT};font-size:0.75em;line-height:1.5;color:${muted};min-height:1.5em}`,
      `${part("controls")}{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0.35em}`,
      `${selector} button{font:inherit;font-family:${GRID_FONT};font-size:0.7em;line-height:1.35;padding:0.55em 0.3em;white-space:nowrap;color:${fg};background:${cssVar("bg")};border:1px solid color-mix(in srgb,${fg} 35%,transparent);border-radius:0;cursor:pointer}`,
      `${selector} button:hover:not(:disabled){background:color-mix(in srgb,${fg} 10%,transparent)}`,
      `${selector} button:focus-visible,${selector} summary:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${selector} button:disabled,${selector} button[aria-disabled="true"]{color:${muted};border-style:dashed;cursor:not-allowed}`,
      `${part("fallback")}{box-sizing:border-box;margin:0;padding:0.8em;font-family:${GRID_FONT};font-size:0.85em;line-height:1.3;color:${fg};max-width:100%;max-height:100%;overflow:auto}`,
      `${part("help")}{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}`
    ].join("\n");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let internalPosition = mazePosition(props.grid, props.defaultPosition);
    let internalDirection = mazeHeading(props.defaultDirection);
    let alive = true;
    let surface = null;
    const attrs = hostAttributes(host);
    const sheet = scope(host);
    sheet.setRules(mazeRules(sheet.selector));
    const emit = emitter(host);
    const abort = new AbortController();
    const on = { signal: abort.signal };
    const root = mazePart("div", "root");
    const view = mazePart("div", "view");
    view.tabIndex = 0;
    view.setAttribute("role", "group");
    const fallback = mazePart("pre", "fallback");
    const status = mazePart("div", "status");
    status.id = nextId("maze-status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    const help = mazePart("span", "help");
    help.id = nextId("maze-help");
    help.textContent = "Arrow Up or W moves forward; Arrow Down or S moves backward; Arrow Left or A turns left; Arrow Right or D turns right. Native buttons offer the same navigation. Coordinates are zero-based. Walls and cells outside the supplied grid cannot be entered. E marks an exit.";
    const controls = mazePart("div", "controls");
    const actions = ["left", "forward", "back", "right"];
    const titles = ["Turn left", "Forward", "Back", "Turn right"];
    const buttons = actions.map((action, index) => {
      const button = mazePart("button", action);
      button.type = "button";
      button.textContent = titles[index] ?? action;
      button.setAttribute("data-action", action);
      controls.append(button);
      return button;
    });
    view.append(fallback);
    root.append(view, status, controls, help);
    host.append(root);
    surface = createCanvas(view, { onResize: () => draw() });
    surface.canvas.setAttribute("aria-hidden", "true");
    const ctx = surface.canvas.getContext("2d");
    fallback.hidden = Boolean(ctx);
    const palette = watchPalette(host, () => {
      if (alive) draw();
    });
    function position() {
      return mazePosition(props.grid, props.position ?? internalPosition ?? props.defaultPosition);
    }
    function direction() {
      return mazeHeading(props.direction ?? internalDirection);
    }
    function vector() {
      return MAZE_VECTORS[MAZE_HEADINGS.indexOf(direction())] ?? [1, 0];
    }
    function available(sign) {
      const p = position();
      const v = vector();
      return Boolean(p && mazeOpen(props.grid, p[0] + v[0] * sign, p[1] + v[1] * sign));
    }
    function configure() {
      const label = props.label.trim();
      attrs.set("role", label ? "group" : null);
      attrs.set("aria-label", label || null);
      attrs.set("aria-hidden", label ? null : "true");
      attrs.set("aria-describedby", label ? `${help.id} ${status.id}` : null);
      view.setAttribute("aria-label", `${label || "Maze"} viewport`);
      view.setAttribute("aria-describedby", `${help.id} ${status.id}`);
    }
    function describe() {
      const p = position();
      const heading = direction();
      root.setAttribute("data-direction", heading);
      root.setAttribute("data-position", p ? p.join(",") : "");
      if (!p) {
        status.textContent = "No walkable cells in the supplied grid.";
        buttons.forEach((button) => {
          button.disabled = true;
        });
      } else {
        const v = vector();
        const left = mazeOpen(props.grid, p[0] + v[1], p[1] - v[0]);
        const right = mazeOpen(props.grid, p[0] - v[1], p[1] + v[0]);
        status.textContent = `x${p[0]} y${p[1]} · ${heading.charAt(0).toUpperCase() + heading.slice(1)} · ${props.grid[p[1]]?.[p[0]] === "E" ? "Exit reached" : `Forward ${available(1) ? "open" : "wall"}, left ${left ? "open" : "wall"}, right ${right ? "open" : "wall"}`}`;
        buttons.forEach((button) => {
          button.disabled = false;
        });
        buttons[1]?.setAttribute("aria-disabled", String(!available(1)));
        buttons[2]?.setAttribute("aria-disabled", String(!available(-1)));
      }
      if (!ctx) {
        const marker = { north: "^", east: ">", south: "v", west: "<" }[heading];
        fallback.textContent = props.grid.map((row, y) => [...row].map((cell, x) => p && p[0] === x && p[1] === y ? marker : cell).join("")).join("\n") || "No grid supplied";
      }
    }
    function draw() {
      if (!alive || !surface) return;
      describe();
      const p = position();
      if (ctx && surface.width > 0 && surface.height > 0) {
        const width = surface.cssWidth, height = surface.cssHeight;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, surface.width, surface.height);
        ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
        ctx.globalAlpha = 1;
        ctx.fillStyle = palette.colors.bg;
        ctx.fillRect(0, 0, width, height);
        if (p) {
          const forward = vector();
          const right = [-forward[1], forward[0]];
          const originX = p[0] + 0.5, originY = p[1] + 0.5;
          const columns = Math.max(1, Math.min(600, Math.ceil(width)));
          const slice = width / columns;
          const depths = new Float64Array(columns);
          const maxSteps = props.grid.length + Math.max(0, ...props.grid.map((row) => row.length)) + 4;
          ctx.strokeStyle = palette.colors.muted;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.moveTo(0, height / 2);
          ctx.lineTo(width, height / 2);
          for (let depth = 1; depth <= 8; depth++) {
            const y = height / 2 + height / (depth * 2);
            if (y < height) {
              ctx.moveTo(0, y);
              ctx.lineTo(width, y);
            }
          }
          ctx.stroke();
          for (let column = 0; column < columns; column++) {
            const camera = 2 * (column + 0.5) / columns - 1;
            const rayX = forward[0] + right[0] * 0.66 * camera;
            const rayY = forward[1] + right[1] * 0.66 * camera;
            const deltaX = rayX === 0 ? Infinity : Math.abs(1 / rayX);
            const deltaY = rayY === 0 ? Infinity : Math.abs(1 / rayY);
            const stepX = rayX < 0 ? -1 : 1, stepY = rayY < 0 ? -1 : 1;
            let cellX = p[0], cellY = p[1];
            let sideX = (rayX < 0 ? originX - cellX : cellX + 1 - originX) * deltaX;
            let sideY = (rayY < 0 ? originY - cellY : cellY + 1 - originY) * deltaY;
            let verticalSide = false;
            for (let i = 0; i < maxSteps; i++) {
              if (sideX < sideY) {
                sideX += deltaX;
                cellX += stepX;
                verticalSide = true;
              } else {
                sideY += deltaY;
                cellY += stepY;
                verticalSide = false;
              }
              if (!mazeOpen(props.grid, cellX, cellY)) break;
            }
            const distance = Math.max(0.05, verticalSide ? sideX - deltaX : sideY - deltaY);
            depths[column] = distance;
            const wallHeight = height / distance;
            const top = (height - wallHeight) / 2;
            const face = verticalSide ? originY + distance * rayY : originX + distance * rayX;
            const fraction = face - Math.floor(face);
            const seam = fraction < 0.018 || fraction > 0.982;
            ctx.fillStyle = palette.colors.fg;
            ctx.globalAlpha = seam ? 0.68 : Math.min(0.6, (verticalSide ? 0.48 : 0.34) / (1 + distance * 0.09));
            ctx.fillRect(column * slice, top, slice + 0.3, wallHeight);
            ctx.globalAlpha = 0.78;
            ctx.fillRect(column * slice, top, slice + 0.3, 1);
            ctx.fillRect(column * slice, top + wallHeight - 1, slice + 0.3, 1);
          }
          ctx.strokeStyle = palette.colors.accent;
          ctx.fillStyle = palette.colors.accent;
          ctx.globalAlpha = 1;
          for (let y = 0; y < props.grid.length; y++) {
            for (let x = 0; x < (props.grid[y]?.length ?? 0); x++) {
              if (props.grid[y]?.[x] !== "E") continue;
              const relativeX = x + 0.5 - originX, relativeY = y + 0.5 - originY;
              const depth = relativeX * forward[0] + relativeY * forward[1];
              if (depth <= 0.05) continue;
              const sideways = relativeX * right[0] + relativeY * right[1];
              const center = width * (0.5 + sideways / (depth * 1.32));
              const size = Math.min(height * 0.6, height / depth * 0.38);
              const index = Math.max(0, Math.min(columns - 1, Math.floor(center / slice)));
              if (center < 0 || center > width || (depths[index] ?? Infinity) < depth - 0.05) continue;
              ctx.lineWidth = Math.max(1.5, size * 0.08);
              ctx.strokeRect(center - size * 0.35, height / 2 - size / 2, size * 0.7, size);
              ctx.beginPath();
              ctx.moveTo(center - size * 0.17, height / 2);
              ctx.lineTo(center + size * 0.17, height / 2);
              ctx.moveTo(center + size * 0.03, height / 2 - size * 0.12);
              ctx.lineTo(center + size * 0.17, height / 2);
              ctx.lineTo(center + size * 0.03, height / 2 + size * 0.12);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
      }
      attrs.set("data-pica-ready", "true");
    }
    function act(action) {
      const p = position();
      if (!p) return;
      if (action === "left" || action === "right") {
        const index = MAZE_HEADINGS.indexOf(direction());
        const next2 = MAZE_HEADINGS[(index + (action === "left" ? 3 : 1)) % 4] ?? "east";
        if (props.direction === null) {
          internalDirection = next2;
          draw();
        }
        emit("directionChange", next2);
        return;
      }
      const v = vector();
      const sign = action === "forward" ? 1 : -1;
      const next = [p[0] + v[0] * sign, p[1] + v[1] * sign];
      if (!mazeOpen(props.grid, next[0], next[1])) return;
      if (props.position === null) {
        internalPosition = next;
        draw();
      }
      emit("positionChange", next);
    }
    buttons.forEach((button, index) => button.addEventListener("click", () => {
      const action = actions[index];
      if (action) act(action);
    }, on));
    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || !root.contains(event.target)) return;
      const key = event.key.toLowerCase();
      const action = key === "arrowup" || key === "w" ? "forward" : key === "arrowdown" || key === "s" ? "back" : key === "arrowleft" || key === "a" ? "left" : key === "arrowright" || key === "d" ? "right" : null;
      if (!action) return;
      event.preventDefault();
      act(action);
    };
    root.addEventListener("keydown", onKey, on);
    configure();
    draw();
    return {
      update(partial) {
        if (!alive) return;
        const before = props;
        props = { ...props, ...partial };
        if (!sameJson(before.grid, props.grid)) internalPosition = mazePosition(props.grid, internalPosition ?? props.defaultPosition);
        if (before.label !== props.label) configure();
        palette.refresh();
        draw();
      },
      destroy() {
        if (!alive) return;
        alive = false;
        abort.abort();
        palette.destroy();
        surface?.destroy();
        root.remove();
        sheet.destroy();
        attrs.restore();
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
  var instance = PicaPerspectiveMaze.mount(host, take(initial));
  ["positionChange","directionChange"].forEach(function (name) {
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
