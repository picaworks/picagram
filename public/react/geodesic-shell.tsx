"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Geodesic Shell · geodesic-shell
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

// registry/immersive/geodesic-shell/core.ts
export interface GeodesicShellPanel {
  /** Unique panel identifier used for selection. */
  id: string;
  /** Zero-based dome facet index in deterministic base-face and subdivision order. */
  facet: number;
  /** Short name shown on the corresponding selection button. */
  label: string;
  /** Supplied panel information read with its name when selected. */
  description: string;
}

export interface GeodesicShellProps {
  /** Subdivision frequency of each icosahedron face, from 1 to 6; facet indices depend on frequency. */
  frequency: number;
  /** Panel records mapped to actual facet indices; invalid mappings and duplicate IDs or facets are omitted. */
  panels: GeodesicShellPanel[];
  /** Selected panel ID; null enables internal selection, and an empty string selects nothing. */
  value: string | null;
  /** Initial selected panel ID, read once in uncontrolled mode. */
  defaultValue: string;
  /** Camera azimuth and elevation in degrees, plus zoom from 0.5 to 1.5. */
  view: { azimuth: number; elevation: number; zoom: number };
  /** Accessible name for the faceted dome and panel controls; empty hides the component. */
  label: string;
}

export interface GeodesicShellEvents {
  /** Panel ID selected by facet click or keyboard/button input. */
  valueChange: string;
  /** A copy of the supplied record belonging to the selected facet. */
  panelSelect: GeodesicShellPanel;
}

export const defaults: GeodesicShellProps = {
  frequency: 3,
  panels: [
    { id: "panel-a", facet: 4, label: "Crown A", description: "Crown cladding panel" },
    { id: "panel-b", facet: 13, label: "Crown B", description: "Second crown cladding panel" },
    { id: "panel-c", facet: 22, label: "Crown C", description: "Third crown cladding panel" },
    { id: "panel-d", facet: 31, label: "Crown D", description: "Fourth crown cladding panel" },
  ],
  value: null,
  defaultValue: "panel-a",
  view: { azimuth: 25, elevation: 28, zoom: 1 },
  label: "Geodesic dome with selectable cladding panels",
};

type ShellVector = readonly [number, number, number];
type ShellTriangle = readonly [ShellVector, ShellVector, ShellVector];
type ShellFacet = { vertices: ShellVector[]; normal: ShellVector; center: ShellVector };
type ShellScreenFacet = { index: number; points: [number, number][]; depth: number; shade: number };

function shellNumber(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

function shellNormalize(point: ShellVector): ShellVector {
  const length = Math.hypot(...point) || 1;
  return [point[0] / length, point[1] / length, point[2] / length];
}

function shellCross(a: ShellVector, b: ShellVector): ShellVector {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function shellClip(triangle: ShellTriangle): ShellVector[] {
  const result: ShellVector[] = [];
  triangle.forEach((point, index) => {
    const prior = triangle[(index + 2) % 3];
    if (!prior) return;
    if ((prior[1] >= 0) !== (point[1] >= 0)) {
      const t = prior[1] / (prior[1] - point[1]);
      result.push([prior[0] + (point[0] - prior[0]) * t, 0, prior[2] + (point[2] - prior[2]) * t]);
    }
    if (point[1] >= 0) result.push(point);
  });
  return result;
}

function shellMesh(frequency: number): ShellFacet[] {
  const upper: ShellVector[] = [];
  const lower: ShellVector[] = [];
  const ringY = 1 / Math.sqrt(5);
  const radius = 2 / Math.sqrt(5);
  for (let index = 0; index < 5; index++) {
    const angle = index * Math.PI * 2 / 5;
    upper.push([radius * Math.cos(angle), ringY, radius * Math.sin(angle)]);
    lower.push([radius * Math.cos(angle + Math.PI / 5), -ringY, radius * Math.sin(angle + Math.PI / 5)]);
  }
  const faces: ShellTriangle[] = [];
  const north: ShellVector = [0, 1, 0];
  const south: ShellVector = [0, -1, 0];
  for (let index = 0; index < 5; index++) {
    const a = upper[index], b = upper[(index + 1) % 5];
    if (a && b) faces.push([north, a, b]);
  }
  for (let index = 0; index < 5; index++) {
    const a = upper[index], b = upper[(index + 1) % 5], c = lower[index], d = lower[(index + 4) % 5];
    if (a && b && c && d) { faces.push([a, c, b]); faces.push([a, d, c]); }
  }
  for (let index = 0; index < 5; index++) {
    const a = lower[index], b = lower[(index + 1) % 5];
    if (a && b) faces.push([south, b, a]);
  }
  const facets: ShellFacet[] = [];
  for (const face of faces) {
    const sample = (i: number, j: number): ShellVector => {
      const a = 1 - (i + j) / frequency, b = i / frequency, c = j / frequency;
      return shellNormalize([face[0][0] * a + face[1][0] * b + face[2][0] * c, face[0][1] * a + face[1][1] * b + face[2][1] * c, face[0][2] * a + face[1][2] * b + face[2][2] * c]);
    };
    const add = (triangle: ShellTriangle): void => {
      const vertices = shellClip(triangle);
      if (vertices.length < 3) return;
      const [a, b, c] = triangle;
      const rawNormal = shellCross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]);
      const center: ShellVector = [vertices.reduce((sum, point) => sum + point[0], 0) / vertices.length, vertices.reduce((sum, point) => sum + point[1], 0) / vertices.length, vertices.reduce((sum, point) => sum + point[2], 0) / vertices.length];
      if (center[1] < 1e-8) return;
      const sign = rawNormal[0] * center[0] + rawNormal[1] * center[1] + rawNormal[2] * center[2] < 0 ? -1 : 1;
      const normal = shellNormalize([rawNormal[0] * sign, rawNormal[1] * sign, rawNormal[2] * sign]);
      facets.push({ vertices, normal, center });
    };
    for (let i = 0; i < frequency; i++) {
      for (let j = 0; j < frequency - i; j++) {
        add([sample(i, j), sample(i + 1, j), sample(i, j + 1)]);
        if (i + j < frequency - 1) add([sample(i + 1, j), sample(i + 1, j + 1), sample(i, j + 1)]);
      }
    }
  }
  return facets;
}

function shellInside(points: readonly [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let index = 0, prior = points.length - 1; index < points.length; prior = index++) {
    const a = points[index], b = points[prior];
    if (!a || !b) continue;
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

export const mount: Mount<GeodesicShellProps> = (host, initial = {}) => {
  let props: GeodesicShellProps = { ...defaults, ...initial };
  let internalValue = props.defaultValue;
  let alive = true;
  let frequency = Math.round(shellNumber(props.frequency, 3, 1, 6));
  let facets = shellMesh(frequency);
  let records: GeodesicShellPanel[] = [];
  let projected: ShellScreenFacet[] = [];
  const attrs = hostAttributes(host);
  attrs.set("data-pica-id", host.getAttribute("data-pica-id"));
  const sheet = scope(host);
  const selector = sheet.selector;
  const surface = createCanvas(host, { maxPixels: 4_000_000, css: "pointer-events:auto;cursor:crosshair", onResize: () => draw() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => draw());
  const emit = emitter<GeodesicShellEvents>(host);
  const controls = document.createElement("div");
  controls.setAttribute("data-pica", "");
  controls.setAttribute("data-shell-controls", "");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Dome panels");
  const status = document.createElement("span");
  status.setAttribute("data-pica", "");
  status.id = nextId("shell-status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  status.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0";
  host.append(controls, status);
  sheet.setRules(`
    ${selector} [data-shell-controls] { position:absolute; bottom:12px; left:12px; right:12px; display:flex; flex-wrap:wrap; justify-content:center; gap:6px; z-index:1; }
    ${selector} [data-shell-panel] { appearance:none; border:1px solid ${cssVar("muted")}; padding:6px 9px; background:${cssVar("bg")}; color:${cssVar("fg")}; font:11px ${GRID_FONT}; border-radius:0; cursor:pointer; }
    ${selector} [data-shell-panel][aria-pressed="true"] { border-color:${cssVar("accent")}; background:${cssVar("accent")}; color:${cssOn("accent")}; }
    ${selector} [data-shell-panel]:focus-visible { outline:2px solid ${cssVar("fg")}; outline-offset:3px; }
  `);

  function selected(): string { return props.value === null ? internalValue : props.value; }

  function synchronize(): void {
    for (const button of controls.querySelectorAll<HTMLButtonElement>("[data-shell-panel]")) button.setAttribute("aria-pressed", String(button.dataset.shellPanel === selected()));
    const record = records.find((panel) => panel.id === selected());
    status.textContent = record ? `${record.label}, facet ${record.facet}. ${record.description}` : "No panel selected. Choose a panel button or click its facet. Arrow keys move between panels.";
  }

  function accessibility(): void {
    const label = props.label.trim();
    attrs.set("role", label ? "group" : null);
    attrs.set("aria-label", label || null);
    attrs.set("aria-hidden", label ? null : "true");
    attrs.set("aria-describedby", label ? status.id : null);
  }

  function rebuildControls(): void {
    const focused = document.activeElement instanceof HTMLElement && controls.contains(document.activeElement) ? document.activeElement.dataset.shellPanel : undefined;
    controls.replaceChildren();
    records = [];
    const ids = new Set<string>();
    const occupied = new Set<number>();
    for (const raw of Array.isArray(props.panels) ? props.panels : []) {
      if (!raw || typeof raw.id !== "string" || !raw.id || ids.has(raw.id) || !Number.isInteger(raw.facet) || raw.facet < 0 || raw.facet >= facets.length || occupied.has(raw.facet)) continue;
      ids.add(raw.id); occupied.add(raw.facet);
      const record: GeodesicShellPanel = { id: raw.id, facet: raw.facet, label: typeof raw.label === "string" ? raw.label : raw.id, description: typeof raw.description === "string" ? raw.description : "" };
      records.push(record);
      const button = document.createElement("button");
      button.setAttribute("data-pica", "");
      button.setAttribute("data-shell-panel", record.id);
      button.type = "button";
      button.textContent = record.label || record.id;
      button.setAttribute("aria-label", `${record.label || record.id}, facet ${record.facet}. ${record.description}`);
      button.title = `${record.description || record.label} · facet ${record.facet}`;
      controls.append(button);
      if (record.id === focused) button.focus({ preventScroll: true });
    }
    synchronize();
  }

  function rotate(point: ShellVector): ShellVector {
    const azimuth = shellNumber(props.view.azimuth, 25, -360, 360) * Math.PI / 180;
    const elevation = shellNumber(props.view.elevation, 28, 0, 85) * Math.PI / 180;
    const x = point[0] * Math.cos(azimuth) + point[2] * Math.sin(azimuth);
    const z = point[2] * Math.cos(azimuth) - point[0] * Math.sin(azimuth);
    return [x, point[1] * Math.cos(elevation) - z * Math.sin(elevation), point[1] * Math.sin(elevation) + z * Math.cos(elevation)];
  }

  function draw(): void {
    if (!alive) return;
    if (!ctx) { attrs.set("data-pica-ready", "true"); return; }
    const width = surface.cssWidth, height = surface.cssHeight;
    const colors = palette.colors;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, surface.width, surface.height);
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    const rotated = facets.flatMap((facet) => facet.vertices.map(rotate));
    const minX = Math.min(...rotated.map((point) => point[0])), maxX = Math.max(...rotated.map((point) => point[0]));
    const minY = Math.min(...rotated.map((point) => point[1])), maxY = Math.max(...rotated.map((point) => point[1]));
    const availableHeight = Math.max(1, height - controls.offsetHeight - 42);
    const zoom = shellNumber(props.view.zoom, 1, 0.5, 1.5);
    const scale = Math.max(1, Math.min(width * 0.86 / Math.max(0.01, maxX - minX), availableHeight * 0.88 / Math.max(0.01, maxY - minY))) * zoom;
    const cx = width / 2, cy = availableHeight / 2 + 10;
    const centerY = (minY + maxY) / 2;
    const screen = (point: ShellVector): [number, number] => { const p = rotate(point); return [cx + p[0] * scale, cy - (p[1] - centerY) * scale]; };
    projected = facets.map((facet, index) => ({ index, points: facet.vertices.map(screen), depth: rotate(facet.center)[2], shade: rotate(facet.normal)[2] })).sort((a, b) => a.depth - b.depth);
    const active = records.find((panel) => panel.id === selected());
    const path = (points: readonly [number, number][]): void => {
      ctx.beginPath();
      points.forEach((point, index) => { if (index === 0) ctx.moveTo(point[0], point[1]); else ctx.lineTo(point[0], point[1]); });
      ctx.closePath();
    };
    for (const facet of projected) {
      const selectedFacet = active?.facet === facet.index;
      path(facet.points);
      ctx.fillStyle = selectedFacet ? colors.accent : colors.fg;
      ctx.globalAlpha = selectedFacet ? 0.38 : facet.shade > 0 ? 0.035 + 0.105 * facet.shade : 0.015;
      ctx.fill();
      ctx.strokeStyle = selectedFacet ? colors.accent : facet.shade > 0 ? colors.fg : colors.muted;
      ctx.globalAlpha = selectedFacet ? 1 : facet.shade > 0 ? 0.56 : 0.25;
      ctx.lineWidth = selectedFacet ? 1.8 : 0.75;
      ctx.stroke();
    }
    // The horizontal rim makes the hemisphere's structural opening explicit.
    const rim: [number, number][] = [];
    for (let index = 0; index < 80; index++) { const angle = index * Math.PI * 2 / 80; rim.push(screen([Math.cos(angle), 0, Math.sin(angle)])); }
    path(rim); ctx.globalAlpha = 0.65; ctx.strokeStyle = colors.fg; ctx.lineWidth = 1.2; ctx.stroke();
    if (active) {
      const selectedFacet = projected.find((facet) => facet.index === active.facet);
      if (selectedFacet) { path(selectedFacet.points); ctx.globalAlpha = 1; ctx.strokeStyle = colors.accent; ctx.lineWidth = 2; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    synchronize();
    attrs.set("data-pica-ready", "true");
  }

  function select(record: GeodesicShellPanel): void {
    if (props.value === null) internalValue = record.id;
    draw();
    emit("valueChange", record.id);
    emit("panelSelect", { ...record });
  }

  function buttonClick(event: MouseEvent): void {
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-shell-panel]") : null;
    const record = records.find((panel) => panel.id === button?.dataset.shellPanel);
    if (record) select(record);
  }

  function keyboard(event: KeyboardEvent): void {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target?.hasAttribute("data-shell-panel") || !records.length) return;
    const current = records.findIndex((panel) => panel.id === target.dataset.shellPanel);
    let index: number;
    switch (event.key) {
      case "ArrowRight": case "ArrowDown": index = (current + 1) % records.length; break;
      case "ArrowLeft": case "ArrowUp": index = (current + records.length - 1) % records.length; break;
      case "Home": index = 0; break;
      case "End": index = records.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const record = records[index];
    if (!record) return;
    for (const button of controls.querySelectorAll<HTMLButtonElement>("[data-shell-panel]")) if (button.dataset.shellPanel === record.id) button.focus({ preventScroll: true });
    select(record);
  }

  function facetClick(event: MouseEvent): void {
    const rect = surface.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * surface.cssWidth / Math.max(1, rect.width);
    const y = (event.clientY - rect.top) * surface.cssHeight / Math.max(1, rect.height);
    const hit = [...projected].reverse().find((facet) => shellInside(facet.points, x, y));
    const record = records.find((panel) => panel.facet === hit?.index);
    if (record) select(record);
  }

  controls.addEventListener("click", buttonClick);
  controls.addEventListener("keydown", keyboard);
  surface.canvas.addEventListener("click", facetClick);
  accessibility();
  rebuildControls();
  draw();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const nextFrequency = Math.round(shellNumber(props.frequency, 3, 1, 6));
      const geometryChanged = nextFrequency !== frequency;
      if (geometryChanged) { frequency = nextFrequency; facets = shellMesh(frequency); }
      if (geometryChanged || changed(before, props, ["panels"])) rebuildControls();
      if (before.label !== props.label) accessibility();
      palette.refresh();
      draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      controls.removeEventListener("click", buttonClick);
      controls.removeEventListener("keydown", keyboard);
      surface.canvas.removeEventListener("click", facetClick);
      palette.destroy();
      surface.destroy();
      controls.remove(); status.remove();
      sheet.destroy();
      attrs.restore();
    },
  };
};

// registry/immersive/geodesic-shell/index.tsx
export type GeodesicShellComponentProps = Partial<GeodesicShellProps> & WrapperProps & Handlers<GeodesicShellEvents>;

/** A subdivided geodesic dome with supplied panel records selected directly on facets or by accessible buttons. */
export function GeodesicShell({ className, style, palette, ...props }: GeodesicShellComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
