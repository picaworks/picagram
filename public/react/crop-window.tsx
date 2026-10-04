"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Crop Window · crop-window
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

// registry/ui/crop-window/core.ts
export interface CropWindowRect {
  /** Left edge as a fraction of the host width. */
  left: number;
  /** Top edge as a fraction of the host height. */
  top: number;
  /** Right edge as a fraction of the host width. */
  right: number;
  /** Bottom edge as a fraction of the host height. */
  bottom: number;
}

export interface CropWindowProps {
  /** Controlled normalized edges, or null to let the crop manage its own rectangle. */
  value: CropWindowRect | null;
  /** Initial normalized edges, read once when value is null. */
  defaultValue: CropWindowRect;
  /** Positive crop width/height ratio in rendered pixels; null permits independent edges. */
  aspectRatio: number | null;
  /** Accessible name for the crop and its four keyboard-adjustable edges. */
  label: string;
}

export interface CropWindowEvents {
  /** Requested normalized crop edges, constrained to the host and optional aspect ratio. */
  valueChange: CropWindowRect;
}

export const defaults: CropWindowProps = {
  value: null,
  defaultValue: { left: 0.16, top: 0.18, right: 0.84, bottom: 0.82 },
  aspectRatio: null,
  label: "Crop region",
};

const CROP_EDGES = ["left", "top", "right", "bottom"] as const;
type CropEdge = typeof CROP_EDGES[number];
const CROP_MIN = 0.03;

function cropNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function cropClamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function cropPart<K extends keyof HTMLElementTagNameMap>(tag: K, part: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-part", part);
  return node;
}

export const mount: Mount<CropWindowProps> = (host, initial = {}) => {
  let props: CropWindowProps = { ...defaults, ...initial };
  let alive = true;
  let current = constrain(props.value ?? props.defaultValue);
  let drag: { edge: CropEdge; pointer: number; x: number; y: number; width: number; height: number; start: CropWindowRect; handle: HTMLButtonElement } | null = null;
  const attributes = hostAttributes(host);
  // scope owns the temporary selector; preserve an existing selector attribute too.
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  const sheet = scope(host);
  const restore = styleHost(host, {
    ...(getComputedStyle(host).position === "static" ? { position: "relative" } : {}),
    overflow: "hidden",
    "background-color": cssVar("bg"),
  });
  const emit = emitter<CropWindowEvents>(host);
  const abort = new AbortController();
  const on = { signal: abort.signal };
  const root = cropPart("div", "crop-overlay");
  const frame = cropPart("div", "crop-frame");
  frame.setAttribute("aria-hidden", "true");
  for (const part of ["third-x-1", "third-x-2", "third-y-1", "third-y-2"]) {
    frame.append(cropPart("div", part));
  }
  root.append(frame);
  const handles = CROP_EDGES.map((edge) => {
    const handle = cropPart("button", `edge-${edge}`);
    handle.type = "button";
    handle.setAttribute("role", "slider");
    handle.setAttribute("aria-orientation", edge === "left" || edge === "right" ? "horizontal" : "vertical");
    handle.textContent = edge === "left" || edge === "right" ? "|" : "--";
    root.append(handle);
    return handle;
  });
  host.append(root);
  const s = sheet.selector;
  const p = (name: string): string => `${s} [data-part="${name}"]`;
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const bg = cssVar("bg");
  sheet.setRules([
    `${p("crop-overlay")}{position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden}`,
    `${p("crop-frame")}{position:absolute;box-sizing:border-box;border:1px solid ${fg};box-shadow:0 0 0 100vmax color-mix(in srgb,${fg} 13%,transparent);pointer-events:none}`,
    `${p("crop-frame")} [data-part]{position:absolute;pointer-events:none;background:color-mix(in srgb,${fg} 24%,transparent)}`,
    `${p("third-x-1")},${p("third-x-2")}{top:0;bottom:0;width:1px}`,
    `${p("third-x-1")}{left:33.333333%}${p("third-x-2")}{left:66.666667%}`,
    `${p("third-y-1")},${p("third-y-2")}{left:0;right:0;height:1px}`,
    `${p("third-y-1")}{top:33.333333%}${p("third-y-2")}{top:66.666667%}`,
    `${s} [data-part^="edge-"]{position:absolute;box-sizing:border-box;width:44px;height:44px;margin:0;padding:0;transform:translate(-50%,-50%);display:grid;place-items:center;pointer-events:auto;touch-action:none;user-select:none;border:0;border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1;cursor:ew-resize}`,
    `${s} [data-part^="edge-"]::before{content:"";position:absolute;inset:13px;border:2px solid ${accent};background:${bg};z-index:-1}`,
    `${p("edge-top")},${p("edge-bottom")}{cursor:ns-resize}`,
    `${s} [data-part^="edge-"]:hover::before,${s} [data-part^="edge-"][data-dragging="true"]::before{background:${accent}}`,
    `${s} [data-part^="edge-"]:hover,${s} [data-part^="edge-"][data-dragging="true"]{color:${cssOn("accent")}}`,
    `${s} [data-part^="edge-"]:focus-visible{outline:none}`,
    `${s} [data-part^="edge-"]:focus-visible::before{outline:2px solid ${fg};outline-offset:3px}`,
  ].join("\n"));

  function ratio(): number | null {
    const raw = props.aspectRatio;
    if (raw === null || !Number.isFinite(raw) || raw <= 0) return null;
    return cropClamp(raw * Math.max(1, host.clientHeight) / Math.max(1, host.clientWidth), 0.001, 1000);
  }

  function constrain(raw: CropWindowRect): CropWindowRect {
    const fallback = defaults.defaultValue;
    let left = cropClamp(cropNumber(raw?.left, fallback.left), 0, 1);
    let right = cropClamp(cropNumber(raw?.right, fallback.right), 0, 1);
    let top = cropClamp(cropNumber(raw?.top, fallback.top), 0, 1);
    let bottom = cropClamp(cropNumber(raw?.bottom, fallback.bottom), 0, 1);
    if (right < left) [left, right] = [right, left];
    if (bottom < top) [top, bottom] = [bottom, top];
    const r = ratio();
    let width = Math.max(CROP_MIN, right - left);
    let height = Math.max(CROP_MIN, bottom - top);
    if (r !== null) {
      const minWidth = CROP_MIN * Math.min(1, r);
      width = cropClamp(Math.sqrt(width * height * r), minWidth, Math.min(1, r));
      height = width / r;
    }
    const cx = cropClamp((left + right) / 2, width / 2, 1 - width / 2);
    const cy = cropClamp((top + bottom) / 2, height / 2, 1 - height / 2);
    return { left: cx - width / 2, top: cy - height / 2, right: cx + width / 2, bottom: cy + height / 2 };
  }

  function shown(): CropWindowRect {
    return constrain(props.value ?? current);
  }

  function moveEdge(base: CropWindowRect, edge: CropEdge, position: number): CropWindowRect {
    const next = { ...base };
    const r = ratio();
    if (r === null) {
      if (edge === "left") next.left = cropClamp(position, 0, base.right - CROP_MIN);
      if (edge === "right") next.right = cropClamp(position, base.left + CROP_MIN, 1);
      if (edge === "top") next.top = cropClamp(position, 0, base.bottom - CROP_MIN);
      if (edge === "bottom") next.bottom = cropClamp(position, base.top + CROP_MIN, 1);
      return next;
    }
    if (edge === "left" || edge === "right") {
      const cy = (base.top + base.bottom) / 2;
      const opposite = edge === "left" ? base.right : base.left;
      const room = edge === "left" ? opposite : 1 - opposite;
      const width = cropClamp(Math.abs(opposite - cropClamp(position, edge === "left" ? 0 : opposite, edge === "left" ? opposite : 1)),
        CROP_MIN * Math.min(1, r), Math.min(room, 2 * Math.min(cy, 1 - cy) * r));
      next.left = edge === "left" ? opposite - width : opposite;
      next.right = edge === "left" ? opposite : opposite + width;
      next.top = cy - width / r / 2;
      next.bottom = cy + width / r / 2;
    } else {
      const cx = (base.left + base.right) / 2;
      const opposite = edge === "top" ? base.bottom : base.top;
      const room = edge === "top" ? opposite : 1 - opposite;
      const height = cropClamp(Math.abs(opposite - cropClamp(position, edge === "top" ? 0 : opposite, edge === "top" ? opposite : 1)),
        CROP_MIN * Math.min(1, 1 / r), Math.min(room, 2 * Math.min(cx, 1 - cx) / r));
      next.top = edge === "top" ? opposite - height : opposite;
      next.bottom = edge === "top" ? opposite : opposite + height;
      next.left = cx - height * r / 2;
      next.right = cx + height * r / 2;
    }
    return next;
  }

  function paint(): void {
    if (!alive) return;
    const rect = shown();
    const label = String(props.label ?? "").trim();
    attributes.set("role", "group");
    attributes.set("aria-label", label || null);
    attributes.set("aria-hidden", null);
    const percent = (value: number): string => `${value * 100}%`;
    frame.style.left = percent(rect.left);
    frame.style.top = percent(rect.top);
    frame.style.width = percent(rect.right - rect.left);
    frame.style.height = percent(rect.bottom - rect.top);
    for (const [index, edge] of CROP_EDGES.entries()) {
      const handle = handles[index]!;
      const horizontal = edge === "left" || edge === "right";
      handle.style.left = percent(horizontal ? rect[edge] : (rect.left + rect.right) / 2);
      handle.style.top = percent(horizontal ? (rect.top + rect.bottom) / 2 : rect[edge]);
      handle.setAttribute("aria-label", `${label || "Crop"} ${edge} edge`);
      const min = moveEdge(rect, edge, 0)[edge];
      const max = moveEdge(rect, edge, 1)[edge];
      handle.setAttribute("aria-valuemin", (min * 100).toFixed(3));
      handle.setAttribute("aria-valuemax", (max * 100).toFixed(3));
      handle.setAttribute("aria-valuenow", (rect[edge] * 100).toFixed(3));
      handle.setAttribute("aria-valuetext", `${(rect[edge] * 100).toFixed(1)} percent; crop ${(rect.right - rect.left) * 100 > 0 ? ((rect.right - rect.left) * 100).toFixed(1) : "0"} percent wide, ${((rect.bottom - rect.top) * 100).toFixed(1)} percent high`);
    }
    attributes.set("data-pica-ready", "true");
  }

  function choose(candidate: CropWindowRect): void {
    const next = Object.fromEntries(CROP_EDGES.map((edge) => [edge, Number(cropClamp(candidate[edge], 0, 1).toFixed(6))])) as unknown as CropWindowRect;
    const previous = shown();
    const equal = CROP_EDGES.every((edge) => Math.abs(next[edge] - previous[edge]) < 0.0000005);
    if (equal) return;
    if (props.value === null) current = next;
    paint();
    emit("valueChange", { ...next });
  }

  function endDrag(): void {
    if (!drag) return;
    const ended = drag;
    drag = null;
    ended.handle.removeAttribute("data-dragging");
    if (ended.handle.hasPointerCapture(ended.pointer)) ended.handle.releasePointerCapture(ended.pointer);
  }

  for (const [index, edge] of CROP_EDGES.entries()) {
    const handle = handles[index]!;
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || drag) return;
      event.preventDefault();
      handle.focus({ preventScroll: true });
      const box = host.getBoundingClientRect();
      drag = { edge, pointer: event.pointerId, x: event.clientX, y: event.clientY,
        width: Math.max(1, box.width), height: Math.max(1, box.height), start: shown(), handle };
      handle.setAttribute("data-dragging", "true");
      handle.setPointerCapture(event.pointerId);
    }, on);
    handle.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointer !== event.pointerId) return;
      const horizontal = edge === "left" || edge === "right";
      const delta = horizontal ? (event.clientX - drag.x) / drag.width : (event.clientY - drag.y) / drag.height;
      choose(moveEdge(drag.start, edge, drag.start[edge] + delta));
    }, on);
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
      handle.addEventListener(name, (event) => { if (drag?.pointer === event.pointerId) endDrag(); }, on);
    }
    handle.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && drag) {
        event.preventDefault();
        const start = drag.start;
        endDrag();
        choose(start);
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const horizontal = edge === "left" || edge === "right";
      const positive = horizontal ? "ArrowRight" : "ArrowDown";
      const negative = horizontal ? "ArrowLeft" : "ArrowUp";
      const rect = shown();
      let position: number;
      if (event.key === "Home") position = 0;
      else if (event.key === "End") position = 1;
      else if (event.key === positive || event.key === "PageUp") position = rect[edge] + (event.shiftKey || event.key === "PageUp" ? 0.05 : 0.01);
      else if (event.key === negative || event.key === "PageDown") position = rect[edge] - (event.shiftKey || event.key === "PageDown" ? 0.05 : 0.01);
      else return;
      event.preventDefault();
      choose(moveEdge(rect, edge, position));
    }, on);
  }

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    if (!alive) return;
    endDrag();
    if (props.value === null) current = constrain(current);
    paint();
  }) : null;
  observer?.observe(host);
  paint();

  return {
    update(next) {
      if (!alive) return;
      const previous = shown();
      const before = props;
      props = { ...props, ...next };
      const valueChanged = !sameJson(before.value, props.value);
      const ratioChanged = before.aspectRatio !== props.aspectRatio;
      if (valueChanged || ratioChanged) {
        if (ratioChanged) endDrag();
        current = constrain(props.value ?? previous);
      }
      if (valueChanged || ratioChanged || before.label !== props.label) paint();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      endDrag();
      abort.abort();
      observer?.disconnect();
      root.remove();
      sheet.destroy();
      restore();
      attributes.restore();
    },
  };
};

// registry/ui/crop-window/index.tsx
export type CropWindowComponentProps = Partial<CropWindowProps> & Handlers<CropWindowEvents> & WrapperProps & { children?: ReactNode };

/** Four accessible edges constrain a normalized crop over the page's own content. */
export function CropWindow({ className, style, palette, children, ...props }: CropWindowComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
