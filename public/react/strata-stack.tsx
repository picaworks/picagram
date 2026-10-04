"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Strata Stack · strata-stack
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

// registry/immersive/strata-stack/core.ts
export interface StrataLayer {
  /** Stable record identifier returned when the layer is selected. */
  id: string;
  /** Geological name shown on the layer's selection button. */
  label: string;
  /** Actual layer thickness in metres; invalid or negative values are treated as zero. */
  thickness: number;
}

export interface StrataStackProps {
  /** Geological records ordered from the top surface downward. */
  layers: readonly StrataLayer[];
  /** Gap between adjacent layers in metres, from 0 to 30. */
  separation: number;
  /** Controlled selected record ID, or null to let the stack manage selection. */
  value: string | null;
  /** Initial selected record ID, read once while value is null. */
  defaultValue: string;
  /** Orthographic camera used to show the stack's thickness and exposed section faces. */
  view: "isometric" | "oblique" | "front";
  /** Accessible name for the stack and its current selected geological record. */
  label: string;
}

export interface StrataStackEvents {
  /** ID of the supplied geological layer requested by pointer or keyboard input. */
  valueChange: string;
}

export const defaults: StrataStackProps = {
  layers: [
    { id: "sandstone", label: "Sandstone", thickness: 22 },
    { id: "shale", label: "Shale", thickness: 9 },
    { id: "limestone", label: "Limestone", thickness: 34 },
    { id: "siltstone", label: "Siltstone", thickness: 14 },
    { id: "basalt", label: "Basalt", thickness: 18 },
  ],
  separation: 8,
  value: null,
  defaultValue: "limestone",
  view: "isometric",
  label: "Geological strata",
};

type StrataPoint = readonly [number, number];
type StrataFace = readonly [StrataPoint, StrataPoint, StrataPoint, StrataPoint];
type StrataHit = { id: string; polygon: StrataFace };

function strataNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function strataRecords(raw: readonly StrataLayer[]): StrataLayer[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  const result: StrataLayer[] = [];
  for (const record of raw) {
    if (!record || typeof record.id !== "string" || !record.id.trim() || ids.has(record.id)) continue;
    ids.add(record.id);
    result.push({ id: record.id, label: String(record.label || record.id), thickness: Math.max(0, strataNumber(record.thickness, 0)) });
  }
  return result;
}

function strataInside(point: StrataPoint, polygon: StrataFace): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

export const mount: Mount<StrataStackProps> = (host, initial = {}) => {
  let props: StrataStackProps = { ...defaults, ...initial };
  let records = strataRecords(props.layers);
  let current = props.defaultValue;
  let alive = true;
  let initialized = false;
  let hits: StrataHit[] = [];
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  const sheet = scope(host);
  const emit = emitter<StrataStackEvents>(host);
  const abort = new AbortController();
  const surface = createCanvas(host, { maxPixels: 2400000, onResize: () => draw() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => draw());
  const controls = document.createElement("div");
  controls.setAttribute("data-pica", "");
  controls.setAttribute("data-part", "layers");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Select geological layer");
  host.append(controls);
  const s = sheet.selector;
  sheet.setRules([
    `${s} [data-part="layers"]{position:absolute;z-index:2;left:12px;right:12px;bottom:12px;display:flex;justify-content:center;flex-wrap:wrap;gap:5px;max-height:38%;overflow:auto}`,
    `${s} [data-part="layer"]{max-width:100%;box-sizing:border-box;margin:0;padding:6px 8px;border:1px solid color-mix(in srgb,${cssVar("fg")} 28%,transparent);border-radius:0;background:${cssVar("bg")};color:${cssVar("fg")};font-family:${GRID_FONT};font-size:11px;line-height:1.3;font-variant-numeric:tabular-nums;cursor:pointer}`,
    `${s} [data-part="layer"][aria-pressed="true"]{border-color:${cssVar("accent")};box-shadow:inset 0 -2px ${cssVar("accent")}}`,
    `${s} [data-part="layer"]:hover{background:color-mix(in srgb,${cssVar("fg")} 9%,${cssVar("bg")})}`,
    `${s} [data-part="layer"]:focus-visible{outline:2px solid ${cssVar("fg")};outline-offset:2px}`,
  ].join("\n"));

  function selected(): string {
    const wanted = props.value ?? current;
    return records.find((record) => record.id === wanted)?.id ?? records[0]?.id ?? "";
  }

  function buttons(): void {
    const focused = (document.activeElement as HTMLElement | null)?.getAttribute("data-layer-id");
    controls.replaceChildren();
    for (const record of records) {
      const button = document.createElement("button");
      button.setAttribute("data-pica", "");
      button.setAttribute("data-part", "layer");
      button.setAttribute("data-layer-id", record.id);
      button.type = "button";
      button.textContent = `${record.label} · ${record.thickness} m`;
      button.setAttribute("aria-label", `${record.label}, thickness ${record.thickness} metres`);
      controls.append(button);
      if (record.id === focused) button.focus({ preventScroll: true });
    }
  }

  function describe(): void {
    const id = selected();
    const record = records.find((entry) => entry.id === id);
    const name = String(props.label ?? "").trim() || "Geological strata";
    attributes.set("role", "group");
    attributes.set("aria-hidden", null);
    attributes.set("aria-label", `${name}. ${records.length} layers, top to bottom.${record ? ` Selected ${record.label}, ${record.thickness} metres thick.` : " No layer records supplied."}`);
    for (const child of Array.from(controls.children)) {
      if (!(child instanceof HTMLButtonElement)) continue;
      const active = child.getAttribute("data-layer-id") === id;
      child.setAttribute("aria-pressed", String(active));
      child.tabIndex = active ? 0 : -1;
    }
  }

  function choose(id: string): void {
    if (!records.some((record) => record.id === id) || id === selected()) return;
    if (props.value === null) current = id;
    describe();
    draw();
    emit("valueChange", id);
  }

  function draw(): void {
    if (!alive || !initialized) return;
    hits = [];
    const width = Math.max(1, surface.cssWidth);
    const height = Math.max(1, surface.cssHeight);
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = palette.colors.bg;
      ctx.fillRect(0, 0, width, height);
      if (records.length) {
        const gap = Math.max(0, Math.min(30, strataNumber(props.separation, 8)));
        // Normalize all physical dimensions by one common unit to avoid numeric
        // overflow without changing the supplied thickness or gap proportions.
        let unit = Math.max(1, gap);
        for (const record of records) unit = Math.max(unit, record.thickness);
        const total = records.reduce((sum, record) => sum + record.thickness / unit, 0) + gap / unit * Math.max(0, records.length - 1);
        const blockW = Math.max(1.8, total * 1.22);
        const blockD = blockW * 0.62;
        const view = props.view;
        const azimuth = (view === "front" ? 0 : view === "oblique" ? -18 : -36) * Math.PI / 180;
        const elevation = (view === "front" ? 0 : view === "oblique" ? 19 : 34) * Math.PI / 180;
        const ca = Math.cos(azimuth), sa = Math.sin(azimuth);
        const ce = Math.cos(elevation), se = Math.sin(elevation);
        function project(x: number, y: number, z: number): StrataPoint {
          return [x * ca - y * sa, (x * sa + y * ca) * se - z * ce];
        }
        const bounds: StrataPoint[] = [];
        for (const x of [-blockW / 2, blockW / 2]) {
          for (const y of [-blockD / 2, blockD / 2]) {
            for (const z of [0, total]) bounds.push(project(x, y, z));
          }
        }
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const point of bounds) {
          minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]);
          minY = Math.min(minY, point[1]); maxY = Math.max(maxY, point[1]);
        }
        const sceneHeight = Math.max(1, height - controls.offsetHeight - 34);
        const scale = Math.max(0.1, Math.min((width - 36) / Math.max(0.01, maxX - minX), (sceneHeight - 20) / Math.max(0.01, maxY - minY)));
        const offsetX = width / 2 - (minX + maxX) / 2 * scale;
        const offsetY = sceneHeight / 2 - (minY + maxY) / 2 * scale + 6;
        function screen(x: number, y: number, z: number): StrataPoint {
          const point = project(x, y, z);
          return [offsetX + point[0] * scale, offsetY + point[1] * scale];
        }
        const stack: { record: StrataLayer; top: number; bottom: number }[] = [];
        let cursor = total;
        for (const record of records) {
          const bottom = cursor - record.thickness / unit;
          stack.push({ record, top: cursor, bottom });
          cursor = bottom - gap / unit;
        }
        const path = (face: StrataFace): void => {
          if (!ctx) return;
          ctx.beginPath();
          ctx.moveTo(face[0][0], face[0][1]);
          for (let i = 1; i < face.length; i++) {
            const point = face[i];
            if (point) ctx.lineTo(point[0], point[1]);
          }
          ctx.closePath();
        };
        const selectedId = selected();
        const halfW = blockW / 2, halfD = blockD / 2;
        for (let i = stack.length - 1; i >= 0; i--) {
          const entry = stack[i];
          if (!entry) continue;
          const { record, top, bottom } = entry;
          const active = record.id === selectedId;
          const faces: { polygon: StrataFace; ink: number; section: boolean }[] = [
            { polygon: [screen(-halfW, -halfD, top), screen(halfW, -halfD, top), screen(halfW, halfD, top), screen(-halfW, halfD, top)], ink: 0.10, section: false },
            { polygon: [screen(-halfW, -halfD, top), screen(-halfW, halfD, top), screen(-halfW, halfD, bottom), screen(-halfW, -halfD, bottom)], ink: 0.17, section: false },
            { polygon: [screen(-halfW, halfD, top), screen(halfW, halfD, top), screen(halfW, halfD, bottom), screen(-halfW, halfD, bottom)], ink: 0.26, section: true },
          ];
          for (const face of faces) {
            // Clear prior faces under this surface even on a transparent host;
            // the result is an opaque geometric ordering, not an X-ray stack.
            ctx.save();
            path(face.polygon);
            ctx.globalCompositeOperation = "destination-out";
            ctx.globalAlpha = 1;
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = palette.colors.bg;
            ctx.fill();
            ctx.fillStyle = active ? palette.colors.accent : palette.colors.fg;
            ctx.globalAlpha = active ? face.ink + 0.11 : face.ink;
            ctx.fill();
            ctx.globalAlpha = active ? 1 : 0.62;
            ctx.strokeStyle = active ? palette.colors.accent : palette.colors.fg;
            ctx.lineWidth = active ? 1.6 : 1;
            ctx.stroke();
            if (face.section && record.thickness > 0) {
              ctx.clip();
              const beds = Math.min(20, Math.floor(record.thickness / 5));
              ctx.globalAlpha = active ? 0.62 : 0.22;
              ctx.lineWidth = 0.8;
              for (let bed = 1; bed <= beds; bed++) {
                const z = top - Math.min(record.thickness, bed * 5) / unit;
                const a = screen(-halfW, halfD, z);
                const b = screen(halfW, halfD, z);
                ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
              }
            }
            ctx.restore();
            hits.push({ id: record.id, polygon: face.polygon });
          }
        }
      }
    }
    attributes.set("data-pica-ready", "true");
  }

  controls.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || target.parentElement !== controls) return;
    const id = target.getAttribute("data-layer-id");
    if (id !== null) choose(id);
  }, { signal: abort.signal });
  controls.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const index = records.findIndex((record) => record.id === target.getAttribute("data-layer-id"));
    if (index < 0) return;
    let next: number;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = Math.min(records.length - 1, index + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = Math.max(0, index - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = records.length - 1;
    else return;
    event.preventDefault();
    const record = records[next];
    if (!record) return;
    choose(record.id);
    const button = controls.children.item(next);
    if (button instanceof HTMLButtonElement) button.focus({ preventScroll: true });
  }, { signal: abort.signal });
  surface.canvas.addEventListener("click", (event) => {
    const box = surface.canvas.getBoundingClientRect();
    const point: StrataPoint = [(event.clientX - box.left) / Math.max(1, box.width) * surface.cssWidth,
      (event.clientY - box.top) / Math.max(1, box.height) * surface.cssHeight];
    for (let i = hits.length - 1; i >= 0; i--) {
      const hit = hits[i];
      if (hit && strataInside(point, hit.polygon)) {
        choose(hit.id);
        const recordIndex = records.findIndex((record) => record.id === hit.id);
        const button = controls.children.item(recordIndex);
        if (button instanceof HTMLButtonElement) button.focus({ preventScroll: true });
        return;
      }
    }
  }, { signal: abort.signal });
  // The shared canvas is noninteractive by default; only this owned canvas gets
  // hit testing, and no page-owned node is modified.
  surface.canvas.style.pointerEvents = "auto";
  surface.canvas.style.cursor = "pointer";
  const legendObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
  legendObserver?.observe(controls);
  initialized = true;
  buttons();
  describe();
  draw();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      const previousSelection = selected();
      props = { ...props, ...next };
      const dataChanged = !sameJson(before.layers, props.layers);
      if (dataChanged) { records = strataRecords(props.layers); buttons(); }
      if (before.value !== props.value && props.value === null) current = previousSelection;
      const selectionChanged = before.value !== props.value || dataChanged;
      const paletteChanged = palette.refresh();
      if (selectionChanged || before.label !== props.label) describe();
      if (selectionChanged || before.separation !== props.separation || before.view !== props.view || paletteChanged) draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      abort.abort();
      legendObserver?.disconnect();
      controls.remove();
      palette.destroy();
      surface.destroy();
      sheet.destroy();
      attributes.restore();
    },
  };
};

// registry/immersive/strata-stack/index.tsx
export type StrataStackComponentProps = Partial<StrataStackProps> & Handlers<StrataStackEvents> & WrapperProps;

/** Supplied geological thicknesses form an exploded stack with accessible record selection. */
export function StrataStack({ className, style, palette, ...props }: StrataStackComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
