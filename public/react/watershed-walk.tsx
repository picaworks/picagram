"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Watershed walk · watershed-walk
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

// lib/rng.ts
/** Seeded pseudo-random numbers in [0, 1), mulberry32. The same seed gives the same sequence,
 *  which is what makes every capture reproducible. */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The final mixing step of the lowbias32 integer hash: every input bit affects every output bit. */
function hashMix(h: number): number {
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** A new seed from a seed and one or two integers, for an independent stream per column, cell, or burst:
 *  createRng(hashSeed(seed, column, epoch)). Neighboring inputs give unrelated seeds. */
function hashSeed(seed: number, a: number, b = 0): number {
  return hashMix(hashMix(hashMix(seed >>> 0) ^ (a >>> 0)) ^ (b >>> 0));
}

// registry/immersive/watershed-walk/core.ts
export interface WatershedWalkRecord {
  /** Short label used by both the scene and the linear register. */
  name: string;
  /** Reference or location printed above the detail heading. */
  reference: string;
  /** The title of this record's full account. */
  title: string;
  /** Readable context for the selected record. */
  description: string;
  /** Supplied dimensions, access information or observation values. */
  facts: string;
  /** A practical visiting or reading note. */
  note: string;
  /** Horizontal scene position as a percentage, clamped to 8 through 92. */
  x: number;
  /** Vertical scene position as a percentage, clamped to 12 through 86. */
  y: number;
  /** Thematic group used in the reading register. */
  group: string;
  /** Chapter or observation cues displayed in the record. */
  chapters: readonly string[];
  /** Optional program notes for individually selectable chapter cues. */
  chapterNotes?: readonly string[];
}

export interface WatershedWalkProps extends MotionProps {
  /** Heading of the complete entry experience. */
  title: string;
  /** Introduction displayed above the spatial scene. */
  introduction: string;
  /** Editable records, with spatial positions and full readable details; an empty array displays an empty register. */
  stations: readonly WatershedWalkRecord[];
  /** Frames per second ceiling, between 1 and 30. */
  fps: number;
}

export const defaults: WatershedWalkProps = {
  title: "From spring to estuary",
  introduction: "Follow one drop through an invented catchment. Four connected stations show how water, sediment and people shape the same route.",
  stations: [
  {
    "name": "Spring",
    "reference": "01 / HEADWATER",
    "title": "Water arrives from below",
    "description": "At the seep line, water emerges between sandstone and clay. Its temperature stays close to the ground temperature while the air changes through the day.",
    "facts": "Elevation 412 m · Water 11.2 °C · Flow 0.8 L/s",
    "note": "Observe: compare the wet line with the boundary between the two rock layers.",
    "x": 17,
    "y": 31,
    "group": "Upper",
    "chapters": [
      "Locate the seep",
      "Record temperature",
      "Compare the layers"
    ]
  },
  {
    "name": "Mill reach",
    "reference": "02 / CHANNEL",
    "title": "A bend stores yesterday",
    "description": "A wide bend slows the current and leaves fine silt behind a stone wall. A short sample record shows the water becoming cloudy after the previous evening rain.",
    "facts": "Elevation 208 m · Turbidity 18 NTU · Flow 14 L/s",
    "note": "Observe: compare the inside and outside of the bend without entering the channel.",
    "x": 39,
    "y": 53,
    "group": "Middle",
    "chapters": [
      "Read the bend",
      "Sample suspended silt",
      "Sketch the bank"
    ]
  },
  {
    "name": "Reed bed",
    "reference": "03 / WETLAND",
    "title": "A place to pause",
    "description": "The channel spreads across a shallow reed bed. Root stems interrupt the current, while insects gather at the clear edge between the reeds and open water.",
    "facts": "Elevation 46 m · Water depth 0.32 m · pH 7.1",
    "note": "Observe: count stems within a fixed square before comparing the open-water edge.",
    "x": 63,
    "y": 65,
    "group": "Lower",
    "chapters": [
      "Measure depth",
      "Count reed stems",
      "Watch the open edge"
    ]
  },
  {
    "name": "Estuary",
    "reference": "04 / TIDAL LIMIT",
    "title": "The route meets the tide",
    "description": "A salinity sample at the tidal limit records freshwater mixing with a rising tide. The mud surface carries branching traces from the last retreating water.",
    "facts": "Elevation 2 m · Salinity 9 ppt · Tide rising",
    "note": "Observe: mark the upper wet edge, then return to the same point after one hour.",
    "x": 83,
    "y": 77,
    "group": "Lower",
    "chapters": [
      "Locate the tide line",
      "Measure salinity",
      "Repeat the visit"
    ]
  }
],
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

export const mount: Mount<WatershedWalkProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sceneId = nextId("scene");
  attrs.set("data-pica-id", sceneId);
  const sheet = document.createElement("style");
  sheet.setAttribute("data-pica", "");
  host.append(sheet);
  const s = `[data-pica-id="${sceneId}"]`;
  sheet.textContent = `
    ${s}{color:${cssVar("fg")};background:${cssVar("bg")};box-sizing:border-box}
    ${s} *,${s} *::before{box-sizing:border-box}
    ${s} [data-part="page"]{padding:clamp(18px,3vw,40px);max-width:1440px;margin:auto}
    ${s} [data-part="edition"],${s} [data-part="caption"],${s} [data-part="reference"]{font:12px/1.5 ${GRID_FONT};letter-spacing:.06em;color:${cssVar("muted")}}
    ${s} h1{font-size:clamp(34px,5vw,68px);font-weight:500;line-height:1.06;letter-spacing:-.045em;margin:14px 0}
    ${s} [data-part="intro"]{max-width:760px;font-size:17px;line-height:1.6;margin:0 0 22px}
    ${s} [data-part="workspace"]{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(270px,1fr);gap:28px;border-top:1px solid ${cssVar("muted")};padding-top:18px}
    ${s} [data-part="scene"]{position:relative;min-width:0;height:365px;border-bottom:1px solid ${cssVar("muted")}}
    ${s} [data-action="select"]{font-family:${GRID_FONT}}
    ${s} [data-part="markers"]{position:absolute;inset:0}
    ${s} [data-part="markers"] button{position:absolute;transform:translate(-50%,-50%);width:44px;height:44px;padding:0;background:${cssVar("bg")};font-size:15px;border:1px solid ${cssVar("fg")};z-index:1}
    ${s} [data-part="markers"] button[aria-pressed="true"]{border:3px solid ${cssVar("accent")}}
    ${s} button{font:inherit;color:inherit;cursor:pointer;background:transparent;border:1px solid ${cssVar("muted")};border-radius:0;min-height:44px;padding:8px 12px}
    ${s} button:focus-visible{outline:2px solid ${cssVar("accent")};outline-offset:3px}
    ${s} button:disabled{opacity:.45;cursor:default}
    ${s} button[aria-pressed="true"]{border-bottom:3px solid ${cssVar("accent")}}
    ${s} [data-part="detail"]{min-width:0}
    ${s} h2{font-size:25px;font-weight:500;line-height:1.2;margin:10px 0 14px}
    ${s} [data-part="detail"] p{font-size:16px;line-height:1.6;margin:12px 0}
    ${s} [data-part="facts"]{border-top:1px solid ${cssVar("muted")};padding-top:12px;font:13px/1.6 ${GRID_FONT}}
    ${s} [data-part="chapters"]{margin:14px 0;padding-left:20px;font-size:14px;line-height:1.7}
    ${s} [data-part="controls"]{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
    ${s} [data-part="register"]{display:flex;gap:0;flex-wrap:wrap;margin:12px 0 18px;padding:0;list-style:none}
    ${s} [data-part="register"] li{flex:1;min-width:155px}
    ${s} [data-part="register"] button{width:100%;text-align:left;border:0;border-top:1px solid ${cssVar("muted")};font-size:14px;padding:12px 8px}
    ${s} [data-part="foot"]{font:12px/1.6 ${GRID_FONT};color:${cssVar("muted")};border-top:1px solid ${cssVar("muted")};padding-top:12px}
    @media(max-width:620px){${s} [data-part="workspace"]{grid-template-columns:1fr;gap:16px}${s} [data-part="scene"]{height:235px}${s} [data-part="intro"]{font-size:15px;line-height:1.5;margin-bottom:16px}${s} h1{margin:10px 0}${s} [data-part="detail"] p{font-size:15px;line-height:1.5}${s} [data-part="register"] li{min-width:45%}${s} h2{font-size:23px}${s} [data-part="page"]{padding:18px}${s} [data-part="controls"]{margin:12px 0}}
  `;
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, part: string, text = ""): HTMLElementTagNameMap[K] => {
    const el = document.createElement(tag);
    el.setAttribute("data-pica", "");
    el.dataset.part = part;
    el.textContent = text;
    return el;
  };
  const button = (action: string, text: string): HTMLButtonElement => {
    const el = node("button", action, text);
    el.type = "button";
    el.dataset.action = action;
    return el;
  };
  const page = node("div", "page");
  const edition = node("p", "edition", "FIELD EXPEDITION / WATERSHED 06");
  const heading = node("h1", "heading");
  const intro = node("p", "intro");
  const workspace = node("div", "workspace");
  const sceneWrap = node("div", "scene-wrap");
  const scene = node("div", "scene");
  const markers = node("div", "markers");
  markers.setAttribute("role", "group");
  markers.setAttribute("aria-label", "Spatial station selection");
  const caption = node("p", "caption", "Scene / Select a number. The register below follows the same route.");
  const detail = node("section", "detail");
  const reference = node("p", "reference");
  const detailTitle = node("h2", "detail-title");
  detailTitle.tabIndex = -1;
  const account = node("p", "account");
  const facts = node("p", "facts");
  const note = node("p", "note");
  const chapters = node("ol", "chapters");
  const chapterNote = node("p", "chapter-note");
  const controls = node("div", "controls");
  const enter = button("enter", "Start the field walk");
  const back = button("back", "Back to overview");
  const prev = button("previous", "Previous station");
  const next = button("next", "Next station");
  const pause = button("pause", "Pause scene");
  const registerTitle = node("p", "reference", "LINEAR station REGISTER");
  const filters = node("div", "controls");
  const register = node("ol", "register");
  const foot = node("p", "foot", "FIELD NOTE / These supplied observations describe an invented route, not current conditions.");
  sceneWrap.append(scene, caption);
  controls.append(enter, back, prev, next, pause);
  detail.append(reference, detailTitle, account, facts, note, chapters, chapterNote, controls);
  workspace.append(sceneWrap, detail);
  page.append(edition, heading, intro, workspace, registerTitle, filters, register, foot);
  host.append(page);
  const runtime: { loop?: Loop } = {};
  const pathFiltering = false;
  const chapterSelection = false;
  const surface = createCanvas(scene, { maxDpr: 1.5, maxPixels: 1500000, onResize: () => runtime.loop?.redraw() });
  scene.append(markers);
  const ink = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => runtime.loop?.redraw());
  let entries: readonly WatershedWalkRecord[] = [];
  let selected = -1;
  let selectedChapter = 0;
  let entered = false;
  let path = "All";
  let userPaused = props.paused;
  let lastIndex = 0;
  let destroyed = false;
  const point = (entry: WatershedWalkRecord): readonly [number, number] => [
    Math.min(92, Math.max(8, Number.isFinite(entry.x) ? entry.x : 50)),
    Math.min(86, Math.max(12, Number.isFinite(entry.y) ? entry.y : 50)),
  ];
  function paint(t: number, reduced: boolean): void {
    if (!ink) return;
    const w = surface.width, h = surface.height;
    const colors = palette.colors;
    ink.clearRect(0, 0, w, h);
    ink.lineWidth = Math.max(1, surface.dpr);
    ink.lineJoin = "miter";
    ink.strokeStyle = colors.muted;
    const line = (points: readonly (readonly number[])[], width = 1): void => {
      ink.lineWidth = width * surface.dpr;
      ink.beginPath();
      points.forEach((p, i) => i ? ink.lineTo((p[0] ?? 0)*w,(p[1] ?? 0)*h) : ink.moveTo((p[0] ?? 0)*w,(p[1] ?? 0)*h));
      ink.stroke();
    };
    const rect = (x:number,y:number,a:number,b:number): void => { ink.strokeRect(x*w,y*h,a*w,b*h); };
    const phase = reduced ? .5 : (Math.sin(t / 2200 + hashSeed(props.seed, 7) / 4294967296) + 1) / 2;

    // A geological section and its continuous channel, not a free terrain field.
    line([[.06,.25],[.16,.28],[.25,.39],[.35,.42],[.44,.58],[.54,.6],[.65,.68],[.75,.72],[.94,.79]],2);
    line([[.06,.4],[.2,.44],[.33,.54],[.45,.7],[.61,.78],[.94,.87]]);
    line([[.06,.58],[.26,.62],[.46,.83],[.94,.94]]);
    for(let j=0;j<12;j++){const x=.08+j*.072;line([[x,.86],[x+.025,.91]]);}
    ink.strokeStyle=colors.fg;line([[.14,.25],[.25,.34],[.33,.43],[.45,.49],[.53,.62],[.65,.62],[.74,.74],[.92,.74]],2);
    for(let j=0;j<7;j++){const x=.58+j*.018;line([[x,.65],[x-.008,.55]]);line([[x,.59],[x+.012,.57]]);}
    ink.strokeStyle=colors.accent;const x=.24+phase*.09;line([[x,.35],[x+.024,.374]],3);line([[.77+phase*.07,.75],[.8+phase*.07,.75]],2);
    ink.strokeStyle=colors.muted;rect(.07,.9,.03,.04);line([[.08,.94],[.42,.94]]);for(let j=0;j<4;j++)line([[.08+j*.1,.92],[.08+j*.1,.96]]);

    // Selection marks are geometric and never change the record typography.
    entries.forEach((entry,i) => {
      if(pathFiltering && path !== "All" && entry.group !== path) return;
      const [x,y] = point(entry);
      const px=x*w/100, py=y*h/100, radius=22*surface.dpr;
      ink.clearRect(px-radius,py-radius,2*radius,2*radius);
      ink.strokeStyle = i===selected ? colors.accent : colors.fg;
      ink.lineWidth = surface.dpr;
      ink.strokeRect(px-27*surface.dpr,py-27*surface.dpr,54*surface.dpr,54*surface.dpr);
    });
  }
  function render(): void {
    heading.textContent = props.title || "Untitled experience";
    intro.textContent = props.introduction;
    attrs.set("role", "region");
    attrs.set("aria-label", heading.textContent);
    attrs.set("aria-hidden", null);
    page.dataset.view = selected >= 0 ? "detail" : entered ? "overview" : "entrance";
    markers.replaceChildren(); register.replaceChildren(); filters.replaceChildren(); chapters.replaceChildren();
    entries = props.stations.slice(0,12);
    if (selected >= entries.length) selected = -1;
    entries.forEach((entry,i) => {
      if (pathFiltering && path !== "All" && entry.group !== path) return;
      const mark = button("select", String(i+1).padStart(2,"0"));
      mark.dataset.index = String(i);
      mark.setAttribute("aria-label", `station ${i+1}: ${entry.name}`);
      mark.setAttribute("aria-pressed", String(i===selected));
      const [x,y] = point(entry);mark.style.left=`${x}%`;mark.style.top=`${y}%`;
      markers.append(mark);
      const row = node("li", "row");
      const link = button("select", `${String(i+1).padStart(2,"0")} / ${entry.name}`);
      link.dataset.index=String(i);link.setAttribute("aria-pressed", String(i===selected));
      row.append(link); register.append(row);
    });
    if (pathFiltering) for (const group of ["All", ...new Set(entries.map(e=>e.group))]) {
      const filter=button("path",`${group} path`);filter.dataset.path=group;filter.setAttribute("aria-pressed",String(group===path));filters.append(filter);
    }
    const current = entries[selected];
    reference.textContent = current?.reference ?? (entered ? "Overview / Choose a station" : "ENTRY / OPEN THE ROUTE");
    detailTitle.textContent = current?.title ?? (entries.length ? "Read the whole catchment" : "The register is empty");
    account.textContent = current?.description ?? (entries.length ? "Start at the spring and move downstream. Station notes hold measured sample values and a practical observation prompt." : "Add records to the stations prop to build a route. The scene remains an architectural guide.");
    facts.textContent = current?.facts ?? `${entries.length} station${entries.length===1?"":"s"} / Native buttons support keyboard and touch.`;
    note.textContent = current?.note ?? "Escape returns to the overview, then to the entrance.";
    note.hidden = !current;
    for(const [index,cue] of (current?.chapters ?? []).entries()) {
      const row=node("li","chapter");
      if(chapterSelection){const cueButton=button("chapter",cue);cueButton.dataset.chapter=String(index);cueButton.setAttribute("aria-pressed",String(index===selectedChapter));row.append(cueButton);}
      else row.textContent=cue;
      chapters.append(row);
    }
    chapterNote.hidden=!chapterSelection || !current;
    chapterNote.textContent=current?.chapterNotes?.[selectedChapter] ?? "";
    chapters.hidden = !current;
    enter.hidden=entered;enter.disabled=!entries.length;
    back.hidden=!entered;
    prev.hidden=!current;next.hidden=!current;
    const route=entries.map((entry,index)=>({entry,index})).filter(({entry})=>!pathFiltering || path==="All" || entry.group===path).map(({index})=>index);
    prev.disabled=route.indexOf(selected)<=0;next.disabled=route.indexOf(selected)>=route.length-1;
    pause.textContent=userPaused ? "Resume scene" : "Pause scene";
    pause.setAttribute("aria-pressed",String(userPaused));
    runtime.loop?.redraw();
  }
  function choose(i: number): void {
    if(!entries[i]) return;
    selected=i;selectedChapter=0;entered=true;lastIndex=i;
    render();detailTitle.focus({preventScroll:true});
  }
  function overview(): void {
    selected=-1;render();
    const target = markers.querySelector<HTMLButtonElement>(`[data-index="${lastIndex}"]`);
    (target ?? back).focus({preventScroll:true});
  }
  const onClick = (event: Event): void => {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-action]") : null;
    if(!target || !page.contains(target)) return;
    const action=target.dataset.action;
    if(action==="select") choose(Number(target.dataset.index));
    else if(action==="enter"){entered=true;render();markers.querySelector<HTMLButtonElement>("button")?.focus({preventScroll:true});}
    else if(action==="back") overview();
    else if(action==="previous" || action==="next"){const route=entries.map((entry,index)=>({entry,index})).filter(({entry})=>!pathFiltering || path==="All" || entry.group===path).map(({index})=>index);choose(route[route.indexOf(selected)+(action==="next"?1:-1)] ?? -1);}
    else if(action==="chapter"){selectedChapter=Number(target.dataset.chapter);render();Array.from(chapters.querySelectorAll<HTMLButtonElement>("button")).find(b=>Number(b.dataset.chapter)===selectedChapter)?.focus({preventScroll:true});}
    else if(action==="path"){path=target.dataset.path ?? "All";selected=-1;entered=true;render();Array.from(filters.querySelectorAll<HTMLButtonElement>("button")).find(b=>b.dataset.path===path)?.focus({preventScroll:true});}
    else if(action==="pause"){userPaused=!userPaused;runtime.loop?.update({paused:userPaused});render();}
  };
  const onKey = (event: KeyboardEvent): void => {
    if(event.key!=="Escape") return;
    if(selected>=0){event.preventDefault();overview();}
    else if(entered){event.preventDefault();entered=false;path="All";render();enter.focus({preventScroll:true});}
  };
  page.addEventListener("click",onClick);page.addEventListener("keydown",onKey);
  render();
  runtime.loop=createLoop({el:scene,paused:userPaused,time:props.time,fps:Math.max(1,Math.min(30,props.fps)),still:1200,frame:paint});
  attrs.set("data-pica-ready","true");
  return {
    update(partial){
      const old=props;props={...props,...partial};
      if(partial.paused!==undefined) userPaused=props.paused;
      if(!sameJson(old.stations,props.stations)){selected=-1;path="All";}
      palette.refresh();render();runtime.loop?.update({paused:userPaused,time:props.time,fps:Math.max(1,Math.min(30,props.fps))});runtime.loop?.redraw();
    },
    destroy(){
      if(destroyed)return;destroyed=true;
      runtime.loop?.destroy();palette.destroy();surface.destroy();
      page.removeEventListener("click",onClick);page.removeEventListener("keydown",onKey);
      page.remove();sheet.remove();attrs.restore();
    },
  };
};

// registry/immersive/watershed-walk/index.tsx
export type WatershedWalkComponentProps = Partial<WatershedWalkProps> & WrapperProps;

/** An original spatial station route with a readable linear register. */
export function WatershedWalk({ className, style, palette, ...props }: WatershedWalkComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
