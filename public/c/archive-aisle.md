# Archive aisle

> A one-point archive aisle on canvas whose camera walks to each collection's bay, with numbered markers, a register and a readable detail.

Category: immersive. Tags: navigation, collection, perspective, camera, original. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 7.6 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/archive-aisle.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | string | `"Aisle seven"` | Accessible name of the aisle region. Empty leaves the host without a role. |
| `collections` | readonly ArchiveAisleCollection[] | `[{"name":"Town plans","reference":"CA 61/09","title":"The unbuilt crossing","description":"Nine folded drawings trace a footbridge proposed in 1961. Pencil revisions move its landing away from the market, and the final envelope carries no approval stamp.","facts":"9 drawings · 1961–1968","note":"Open. Unfolding needs a support board from the desk.","chapters":["Scope and content","Arrangement","Access"]},{"name":"Oral histories","reference":"OH 84/24","title":"Voices from the night shift","description":"Transcripts of 24 interviews document the mill after dark, from the sound of each machine to the signals passed across the floor.","facts":"24 transcripts · 1984","note":"Edited transcripts are open. Personal addresses remain closed.","chapters":["Scope and content","Names and places","Access"]},{"name":"Correspondence","reference":"CO 72/76","title":"Letters from the allotments","description":"A bundle of 76 letters follows the making of a shared garden, with seed requests, minutes and a map drawn on an envelope.","facts":"76 letters · 1972–1975","note":"Open. Keep the bundle in its original order when asking for scans.","chapters":["Scope and content","Original order","Access"]},{"name":"Workshop ledgers","reference":"WL 49/04","title":"A repair for every season","description":"Four ledgers from a bicycle repair shop show how regular maintenance tied a street together through tools, parts and trust.","facts":"4 volumes · 1949–1963","note":"Open. The fourth volume is served as a copy.","chapters":["Scope and content","Related records","Access"]}]` | Collections in bay order, up to 12. Collection i is shelved on the left wall for even i and on the right for odd i, floor(i / 2) bays in. |
| `value` | number \| null | `null` | The open collection's index, -1 for the overview, or null to let the component manage its own view. |
| `defaultValue` | number | `-1` | The view at mount while value is null: a collection's index, or -1 for the overview. |
| `headingLevel` | number | `3` | Level of the detail heading, from 2 to 6. |
| `fps` | number | `30` | Frames per second ceiling while the camera moves, from 1 to 30. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `valueChange` | `onValueChange` | `number` | A visitor opened a collection, giving its index, or went back to the overview, giving -1. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Archive aisle · archive-aisle
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

// registry/immersive/archive-aisle/core.ts
/** One collection, shelved in a bay of its own. */
export interface ArchiveAisleCollection {
  /** Short name, read with the bay's number and listed in the register. */
  name: string;
  /** Reference code set in mono above the detail heading. */
  reference: string;
  /** Heading of the collection's detail. */
  title: string;
  /** A sentence or two describing the collection. */
  description: string;
  /** Extent and dates, set in mono. Empty leaves the line out. */
  facts: string;
  /** A practical note for a visit. Empty leaves it out. */
  note: string;
  /** Series or chapters, listed in the detail. */
  chapters: readonly string[];
}

export interface ArchiveAisleProps extends MotionProps {
  /** Accessible name of the aisle region. Empty leaves the host without a role. */
  label: string;
  /** Collections in bay order, up to 12. Collection i is shelved on the left wall for even i and on the right for odd i, floor(i / 2) bays in. */
  collections: readonly ArchiveAisleCollection[];
  /** The open collection's index, -1 for the overview, or null to let the component manage its own view. */
  value: number | null;
  /** The view at mount while value is null: a collection's index, or -1 for the overview. */
  defaultValue: number;
  /** Level of the detail heading, from 2 to 6. */
  headingLevel: number;
  /** Frames per second ceiling while the camera moves, from 1 to 30. */
  fps: number;
}

export interface ArchiveAisleEvents {
  /** A visitor opened a collection, giving its index, or went back to the overview, giving -1. */
  valueChange: number;
}

export const defaults: ArchiveAisleProps = {
  label: "Aisle seven",
  collections: [
    {
      name: "Town plans",
      reference: "CA 61/09",
      title: "The unbuilt crossing",
      description: "Nine folded drawings trace a footbridge proposed in 1961. Pencil revisions move its landing away from the market, and the final envelope carries no approval stamp.",
      facts: "9 drawings · 1961–1968",
      note: "Open. Unfolding needs a support board from the desk.",
      chapters: ["Scope and content", "Arrangement", "Access"],
    },
    {
      name: "Oral histories",
      reference: "OH 84/24",
      title: "Voices from the night shift",
      description: "Transcripts of 24 interviews document the mill after dark, from the sound of each machine to the signals passed across the floor.",
      facts: "24 transcripts · 1984",
      note: "Edited transcripts are open. Personal addresses remain closed.",
      chapters: ["Scope and content", "Names and places", "Access"],
    },
    {
      name: "Correspondence",
      reference: "CO 72/76",
      title: "Letters from the allotments",
      description: "A bundle of 76 letters follows the making of a shared garden, with seed requests, minutes and a map drawn on an envelope.",
      facts: "76 letters · 1972–1975",
      note: "Open. Keep the bundle in its original order when asking for scans.",
      chapters: ["Scope and content", "Original order", "Access"],
    },
    {
      name: "Workshop ledgers",
      reference: "WL 49/04",
      title: "A repair for every season",
      description: "Four ledgers from a bicycle repair shop show how regular maintenance tied a street together through tools, parts and trust.",
      facts: "4 volumes · 1949–1963",
      note: "Open. The fourth volume is served as a copy.",
      chapters: ["Scope and content", "Related records", "Access"],
    },
  ],
  value: null,
  defaultValue: -1,
  headingLevel: 3,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** A camera position in metres: across the aisle, height, and depth along it. It always looks straight down the
 *  aisle, so the vanishing point stays at the centre of the scene. */
type AisleCamera = readonly [number, number, number];
/** One book spine on a shelf front: x, near and far depth, bottom, top, and one of three tones. */
type AisleBook = readonly [number, number, number, number, number, number];

/** Milliseconds the camera takes to walk in from the aisle mouth at mount, and to move between bays after. */
const AISLE_ENTRANCE = 4000;
const AISLE_MOVE = 800;
/** Half the aisle's width, the eye's height and the top of the shelving, in metres. A bay is a metre long. */
const AISLE_HALF = 0.95;
const AISLE_EYE = 1.2;
const AISLE_TOP = 2.3;
/** The underside of a bay's four boards, and the thickness of a board or an upright. */
const AISLE_BOARDS = [0.06, 0.78, 1.5, 2.22];
const AISLE_PLANK = 0.04;
/** Focal length as a share of the scene's width, used on both axes. */
const AISLE_FOCAL = 0.6;
const AISLE_OVERVIEW: AisleCamera = [0, AISLE_EYE, -1.2];
const AISLE_MOUTH: AisleCamera = [0, AISLE_EYE + 0.3, -4.2];

/** Seeded book spines for every bay, on the plane of the shelf fronts. Each stands on its board and stops short
 *  of the board above, so no spine can cross a board once the plane is projected. */
function aisleBooks(seed: number, bays: number): AisleBook[] {
  const out: AisleBook[] = [];
  for (let bay = 0; bay < bays * 2; bay++) {
    const x = bay % 2 ? AISLE_HALF : -AISLE_HALF;
    const j = bay >> 1;
    for (let row = 0; row < 3; row++) {
      const rand = createRng(hashSeed(seed, bay, row));
      const base = (AISLE_BOARDS[row] ?? 0) + AISLE_PLANK;
      const room = (AISLE_BOARDS[row + 1] ?? 0) - base;
      for (let z = j + 0.04; ; ) {
        const thick = 0.02 + rand() * 0.045;
        if (z + thick > j + 0.96) break;
        if (rand() > 0.07) out.push([x, z, z + thick, base, base + room * (0.55 + rand() * 0.38), Math.floor(rand() * 3)]);
        z += thick + 0.005;
      }
    }
  }
  return out;
}

/** The scoped rules. Prose keeps the page's type and mono marks the numbers, references and facts. The layout
 *  follows the component's own width, and only the focus ring borrows the accent, which the scene keeps for the
 *  open bay. */
function aisleRules(s: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const tint = (n: number): string => `color-mix(in srgb,${fg} ${n}%,transparent)`;
  const line = `1px solid ${tint(22)}`;
  const ring = `outline:2px solid ${cssVar("accent")};outline-offset:2px`;
  return [
    `:where(${s}){display:block;color:${fg};background:${cssVar("bg")}}`,
    `${s} [data-part=aisle]{container-type:inline-size;padding:clamp(16px,3%,40px)}`,
    `${s} [data-part=layout]{display:grid;grid-template-columns:minmax(0,1fr);gap:24px 40px;align-items:start}`,
    `${s} [data-part=scene]{position:relative;aspect-ratio:4/3}`,
    `@container (min-width:620px){${s} [data-part=scene]{aspect-ratio:16/9}}`,
    `@container (min-width:620px) and (max-width:959px){${s} [data-part=layout]{grid-template-columns:repeat(2,minmax(0,1fr))}${s} [data-part=scene],${s} [data-view=overview] [data-part=register]{grid-column:1/-1}${s} [data-view=overview] [data-part=register]{columns:2;column-gap:40px}}`,
    `@container (min-width:960px){${s} [data-part=layout]{grid-template-columns:minmax(0,1.65fr) minmax(0,1fr)}${s} [data-part=scene]{grid-row:1/span 2}${s} [data-part=layout]>:not([data-part=scene]){grid-column:2}}`,
    `${s} [data-part=markers]{position:absolute;inset:0}`,
    `${s} [data-part=markers]:focus-within{opacity:1!important}`,
    // A marker is a clear 44 px target around a 32 by 24 plate. The plate carries the one outline and the numerals.
    `${s} [data-part=markers] button{position:absolute;left:0;top:0;display:flex;align-items:center;justify-content:center;width:44px;height:44px;margin:0;padding:0;border:0;border-radius:0;background:none;color:${fg};font:inherit;cursor:pointer}`,
    `${s} [data-part=register]{margin:0;padding:0;list-style:none;border-top:${line}}`,
    `${s} [data-part=register] li{break-inside:avoid;border-bottom:${line}}`,
    `${s} [data-part=register] button{display:flex;align-items:baseline;gap:.75em;width:100%;min-height:44px;margin:0;padding:.55em 0;border:0;border-radius:0;background:none;color:inherit;font:inherit;line-height:1.35;text-align:left;cursor:pointer}`,
    `${s} [data-part=num],${s} [data-part=ref],${s} [data-part=reference],${s} [data-part=facts]{font-family:${GRID_FONT};font-size:.75em;letter-spacing:.04em;color:${muted}}`,
    `${s} [data-part=num]{padding:.1em .4em}`,
    `${s} [data-part=markers] [data-part=num]{box-sizing:border-box;width:32px;height:24px;padding:0;border:1px solid ${fg};color:${fg};font-weight:500;line-height:22px;text-align:center}`,
    `${s} [data-part=ref]{margin-left:auto;white-space:nowrap}`,
    `${s} [data-part=reference],${s} [data-part=facts]{margin:0;text-transform:uppercase;line-height:1.6;overflow-wrap:anywhere}`,
    `${s} [data-part=heading]{margin:.3em 0 .5em;font-size:1.5em;font-weight:500;line-height:1.15}`,
    `${s} [data-part=description]{margin:0 0 .9em;max-width:62ch;line-height:1.55}`,
    `${s} [data-part=note],${s} [data-part=empty]{margin:.8em 0 0;color:${muted};line-height:1.5}`,
    `${s} [data-part=chapters]{margin:.8em 0 0;padding-left:1.4em;line-height:1.6}`,
    `${s} [data-part=controls]{display:flex;flex-wrap:wrap;gap:8px;margin-top:1.2em}`,
    `${s} [data-part=controls] button{min-height:44px;padding:0 1em;border:${line};border-radius:0;background:none;color:inherit;font:inherit;cursor:pointer}`,
    // Hover follows every button's own rule, which it would otherwise lose to at equal weight, and on a marker it
    // tints the plate rather than the whole target. The pressed fill is the ink of the plate itself, while the
    // numerals inside take the readable ink on it: currentColor stands in for fg when the page sets no palette, so
    // the fill and the figures cannot share one element.
    `${s} [data-part=register] button:hover,${s} [data-part=controls] button:hover,${s} [data-part=markers] [aria-pressed=false]:hover>span{background:${tint(10)}}`,
    `${s} [aria-pressed=true] [data-part=num]{color:${fg};background:${fg}}`,
    `${s} [aria-pressed=true] [data-part=num]>span{color:${cssOn("fg")}}`,
    `${s} [data-part=controls] button:disabled{opacity:.45;cursor:default;background:none}`,
    `${s} :focus-visible{${ring}}`,
    `${s} [data-part=markers] :focus-visible{outline:0}`,
    `${s} [data-part=markers] :focus-visible>span{${ring}}`,
  ].join("");
}

export const mount: Mount<ArchiveAisleProps> = (host, initial = {}) => {
  let props: ArchiveAisleProps = { ...defaults, ...initial };
  const emit = emitter<ArchiveAisleEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  sheet.setRules(aisleRules(sheet.selector));
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, part: string, parent?: HTMLElement): HTMLElementTagNameMap[K] => {
    const el = document.createElement(tag);
    el.setAttribute("data-pica", "");
    if (part) el.dataset.part = part;
    parent?.append(el);
    return el;
  };
  const aisle = make("div", "aisle", host);
  const layout = make("div", "layout", aisle);
  const scene = make("div", "scene", layout);
  const detail = make("div", "detail", layout);
  const register = make("ol", "register", layout);
  const empty = make("p", "empty", layout);
  empty.textContent = "No collections";
  const reference = make("p", "reference", detail);
  const description = make("p", "description", detail);
  const facts = make("p", "facts", detail);
  const note = make("p", "note", detail);
  const chapters = make("ol", "chapters", detail);
  const controls = make("div", "controls", detail);
  const action = (name: string): HTMLButtonElement => {
    const button = make("button", "", controls);
    button.type = "button";
    button.dataset.action = name.toLowerCase();
    button.textContent = name;
    return button;
  };
  action("Back");
  const previous = action("Previous");
  const next = action("Next");
  let heading: HTMLElement = make("h3", "heading");
  const run: { loop?: Loop } = {};
  const surface = createCanvas(scene, { maxDpr: 2, maxPixels: 2400000, onResize: () => (measure(), run.loop?.redraw()) });
  const ctx = surface.canvas.getContext("2d");
  const group = make("div", "markers", scene);
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Bays");
  const palette = watchPalette(host, () => run.loop?.redraw());

  let list: readonly ArchiveAisleCollection[] = [];
  let bays = 4;
  let books: AisleBook[] = [];
  let marks: HTMLButtonElement[] = [];
  let items: HTMLButtonElement[] = [];
  let mw = 44;
  let mh = 44;
  let pw = 32;
  let ph = 24;
  let internal = props.defaultValue;
  let shown = -1;
  let wish: [number, number, HTMLButtonElement | undefined] | null = null;
  let from = AISLE_MOUTH;
  let to = AISLE_OVERVIEW;
  let start = 0;
  let span = AISLE_ENTRANCE;
  let entering = true;
  let held = false;
  let now = 0;
  let dead = false;
  const num = (i: number): string => String(i + 1).padStart(2, "0");
  /** Where a crowded marker may step, in whole targets and nearest first: away from the horizon before towards it,
   *  and towards its own wall before the vanishing point. */
  const steps: [number, number][] = [];
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) steps.push([dx, dy]);
  const cost = ([dx, dy]: [number, number]): number => Math.abs(dy) + 1.5 * Math.abs(dx) + (dy < 0 ? 0.5 : 0) + (dx < 0 ? 0.5 : 0);
  steps.sort((a, b) => cost(a) - cost(b));

  /** Rebuilds the markers, the register and the shelves from the collections. */
  function build(): void {
    list = (Array.isArray(props.collections) ? props.collections : []).slice(0, 12);
    bays = Math.min(7, Math.max(4, Math.ceil(list.length / 2) + 1));
    books = aisleBooks(props.seed, bays);
    group.replaceChildren();
    register.replaceChildren();
    marks = list.map((c, i) => {
      const mark = make("button", "", group);
      mark.type = "button";
      mark.dataset.index = String(i);
      make("span", "", make("span", "num", mark)).textContent = num(i);
      mark.setAttribute("aria-label", `${num(i)} ${c.name}`);
      return mark;
    });
    items = list.map((c, i) => {
      const item = make("button", "", make("li", "", register));
      item.type = "button";
      item.dataset.index = String(i);
      make("span", "", make("span", "num", item)).textContent = num(i);
      make("span", "name", item).textContent = c.name;
      make("span", "ref", item).textContent = c.reference;
      return item;
    });
    register.hidden = !list.length;
    empty.hidden = !!list.length;
    measure();
  }

  /** Reads a marker's target and its plate as rendered, so placement, clearance and the canvas erase follow them. */
  function measure(): void {
    const plate = marks[0]?.firstElementChild as HTMLElement | null | undefined;
    mw = marks[0]?.offsetWidth || 44;
    mh = marks[0]?.offsetHeight || 44;
    pw = plate?.offsetWidth || 32;
    ph = plate?.offsetHeight || 24;
  }

  function makeHeading(): void {
    const h = make(`h${Math.min(6, Math.max(2, Math.round(props.headingLevel) || 3))}` as "h3", "heading");
    h.tabIndex = -1;
    heading.remove();
    detail.insertBefore(h, description);
    heading = h;
  }

  /** The camera that frames a view: the overview, or a step into the aisle towards the chosen bay's wall, just
   *  short of the bay, so the bay fills that side of the frame from its near upright. */
  const aim = (i: number): AisleCamera => (i < 0 ? AISLE_OVERVIEW : [i % 2 ? 0.2 : -0.2, AISLE_EYE, Math.floor(i / 2) - 0.95]);

  /** How far the camera has come at loop time t. It eases out, so it answers at once and settles softly. */
  const progress = (t: number): number => 1 - (1 - Math.min(1, Math.max(0, (t - start) / span))) ** 3;

  const view = (t: number): AisleCamera => {
    const e = progress(t);
    return [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e, from[2] + (to[2] - from[2]) * e];
  };

  const current = (): number => {
    const v = props.value ?? internal;
    return Number.isInteger(v) && v >= 0 && v < list.length ? v : -1;
  };

  const motion = (): void => run.loop?.update({ paused: props.paused || held, time: props.time, fps: Math.min(30, Math.max(1, props.fps || 30)) });

  function render(): void {
    attrs.set("role", props.label ? "region" : null);
    attrs.set("aria-label", props.label || null);
    aisle.dataset.view = shown < 0 ? "overview" : "detail";
    detail.hidden = shown < 0;
    for (const set of [marks, items]) set.forEach((button, i) => button.setAttribute("aria-pressed", String(i === shown)));
    const c = list[shown];
    if (!c) return;
    reference.textContent = c.reference;
    heading.textContent = c.title;
    description.textContent = c.description;
    facts.textContent = c.facts;
    note.textContent = c.note;
    chapters.replaceChildren(...(Array.isArray(c.chapters) ? c.chapters : []).map((text) => {
      const li = make("li", "");
      li.textContent = text;
      return li;
    }));
    facts.hidden = !c.facts;
    note.hidden = !c.note;
    chapters.hidden = !chapters.children.length;
    previous.disabled = shown < 1;
    next.disabled = shown >= list.length - 1;
  }

  /** Shows the current view, and starts the camera towards it when it changed, from wherever the camera is now. */
  function apply(): void {
    const v = current();
    if (v !== shown) {
      from = view(now);
      to = aim(v);
      start = now;
      span = AISLE_MOVE;
      shown = v;
      entering = false;
      held = false;
      motion();
    }
    render();
  }

  /** Moves focus once the view a visitor asked for is showing: into the detail when a collection opens, or onto
   *  the button pressed while it can still be pressed, and back to the collection's marker when it closes, or to
   *  its register entry while the marker is out of view. */
  function land(): void {
    if (!wish || wish[0] !== shown) return;
    const [v, was, keep] = wish;
    wish = null;
    const mark = marks[was];
    (v >= 0 ? (keep && !keep.disabled ? keep : heading) : mark?.style.visibility ? items[was] : mark)?.focus();
  }

  function act(v: number, keep?: HTMLButtonElement): void {
    if (v !== shown) emit("valueChange", v);
    wish = [v, shown, keep];
    if (props.value === null) {
      internal = v;
      apply();
    }
    land();
  }

  const onClick = (event: MouseEvent): void => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
    if (!button || !aisle.contains(button)) return;
    const { index, action: name } = button.dataset;
    if (index) act(Number(index));
    else if (name === "back") act(-1);
    else if (name) act(shown + (name === "next" ? 1 : -1), button);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || shown < 0) return;
    event.preventDefault();
    act(-1);
  };
  aisle.addEventListener("click", onClick);
  aisle.addEventListener("keydown", onKey);

  /** Projects the aisle for camera c, places the markers clear of each other, and draws the shelving. */
  function paint(c: AisleCamera, fade: number): void {
    const w = surface.cssWidth;
    const h = surface.cssHeight;
    const f = AISLE_FOCAL * w;
    const at = (x: number, y: number, z: number): [number, number] | null => {
      const d = z - c[2];
      return d > 0.2 ? [w / 2 + (f * (x - c[0])) / d, h / 2 - (f * (y - c[1])) / d] : null;
    };
    const placed: [number, number, number, number][] = [];
    const order = marks.map((_, i) => i);
    if (shown >= 0) order.unshift(...order.splice(shown, 1));
    group.style.opacity = String(fade);
    for (const i of order) {
      const mark = marks[i];
      const j = Math.floor(i / 2);
      const p = at(i % 2 ? AISLE_HALF : -AISLE_HALF, AISLE_EYE + (j % 2 ? -0.45 : 0.45), j + 0.5);
      const inside = !!p && p[0] > 0 && p[0] < w && p[1] > 0 && p[1] < h;
      if (!mark) continue;
      mark.style.visibility = inside ? "" : "hidden";
      if (!p || !inside) continue;
      // A crowded marker takes the nearest step at which its whole target sits inside the scene and clear of the
      // targets already placed, so every visible target keeps its full size.
      const away = p[1] < h / 2 ? -1 : 1;
      const out = i % 2 ? 1 : -1;
      let spot: [number, number, number, number] | undefined;
      for (const [dx, dy] of steps) {
        const x = Math.round(Math.min(w - mw, Math.max(0, p[0] - mw / 2 + out * dx * (mw + 2))));
        const y = Math.round(Math.min(h - mh, Math.max(0, p[1] - mh / 2 + away * dy * (mh + 2))));
        const clear = placed.every((q) => Math.abs(q[0] - x) >= mw + 2 || Math.abs(q[1] - y) >= mh + 2);
        if (clear || !spot) spot = [x, y, p[0], p[1]];
        if (clear) break;
      }
      if (!spot) continue;
      placed.push(spot);
      mark.style.transform = `translate(${spot[0]}px,${spot[1]}px)`;
    }
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, surface.width, surface.height);
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    const colors = palette.colors;
    const face = (x: number, y0: number, y1: number, z0: number, z1: number): void => {
      const a = at(x, y0, z0);
      const b = at(x, y0, z1);
      const e = at(x, y1, z1);
      const g = at(x, y1, z0);
      if (!a || !b || !e || !g) return;
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(e[0], e[1]);
      ctx.lineTo(g[0], g[1]);
      ctx.closePath();
    };
    const seg = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void => {
      const n = c[2] + 0.21;
      if (z0 < n && z1 < n) return;
      if (z0 < n) {
        const k = (n - z0) / (z1 - z0);
        x0 += (x1 - x0) * k;
        y0 += (y1 - y0) * k;
        z0 = n;
      } else if (z1 < n) {
        const k = (n - z1) / (z0 - z1);
        x1 += (x0 - x1) * k;
        y1 += (y0 - y1) * k;
        z1 = n;
      }
      const a = at(x0, y0, z0);
      const b = at(x1, y1, z1);
      if (!a || !b) return;
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    };
    /** An outline facing the camera, at depth z. */
    const rect = (x0: number, y0: number, x1: number, y1: number, z: number): void => {
      seg(x0, y0, z, x1, y0, z);
      seg(x1, y0, z, x1, y1, z);
      seg(x1, y1, z, x0, y1, z);
      seg(x0, y1, z, x0, y0, z);
    };
    ctx.fillStyle = colors.fg;
    for (let tone = 0; tone < 3; tone++) {
      ctx.beginPath();
      for (const [x, z0, z1, y0, y1, t] of books) if (t === tone) face(x, y0, y1, z0, z1);
      ctx.globalAlpha = 0.14 + tone * 0.1;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    for (const x of [-AISLE_HALF, AISLE_HALF]) {
      for (let j = 0; j <= bays; j++) {
        face(x, 0, AISLE_TOP, j - AISLE_PLANK / 2, j + AISLE_PLANK / 2);
        if (j < bays) for (const y of AISLE_BOARDS) face(x, y, y + AISLE_PLANK, j + AISLE_PLANK / 2, j + 1 - AISLE_PLANK / 2);
      }
    }
    ctx.fillStyle = colors.muted;
    ctx.fill();
    ctx.beginPath();
    const end = bays + 0.8;
    for (const side of [-1, 1]) {
      const x = side * AISLE_HALF;
      // The floor runs down each wall and out along the corridor from the ends of the two ranges.
      seg(x, 0, 0, x, 0, end);
      seg(side * (AISLE_HALF + 0.45), 0, 0, side * 6, 0, 0);
      rect(x, 0, side * (AISLE_HALF + 0.45), AISLE_TOP, 0);
    }
    for (let j = 0; j <= bays; j++) seg(-AISLE_HALF, 0, j, AISLE_HALF, 0, j);
    rect(-AISLE_HALF, 0, AISLE_HALF, 2.6, end);
    rect(-0.42, 0, 0.42, 2.05, end);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (shown >= 0) {
      const j = Math.floor(shown / 2);
      ctx.beginPath();
      face(shown % 2 ? AISLE_HALF : -AISLE_HALF, 0, AISLE_TOP, j, j + 1);
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // A marker that had to step aside keeps a hairline from its plate back to its bay.
    ctx.globalAlpha = fade;
    ctx.beginPath();
    for (const [x, y, ax, ay] of placed) {
      const left = x + (mw - pw) / 2;
      const top = y + (mh - ph) / 2;
      if (Math.abs(left + pw / 2 - ax) < pw && Math.abs(top + ph / 2 - ay) < ph) continue;
      ctx.moveTo(ax, ay);
      ctx.lineTo(Math.min(left + pw, Math.max(left, ax)), Math.min(top + ph, Math.max(top, ay)));
    }
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 1;
    ctx.stroke();
    // The canvas clears under every marker's plate as it fades in, so the plate's own border is its one outline.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = colors.fg;
    for (const [x, y] of placed) ctx.fillRect(x + (mw - pw) / 2, y + (mh - ph) / 2, pw, ph);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  build();
  makeHeading();
  shown = current();
  to = aim(shown);
  render();
  run.loop = createLoop({
    el: scene,
    paused: props.paused,
    time: props.time,
    fps: Math.min(30, Math.max(1, props.fps || 30)),
    still: AISLE_ENTRANCE,
    frame(t, reduced) {
      now = t;
      // Pinned to a time, paused, or under reduced motion, the camera is already where it is going.
      const instant = reduced || props.paused || props.time !== null;
      if (instant) {
        from = to;
        start = -Infinity;
      }
      const e = progress(t);
      if (e === 1) entering = false;
      // The markers fade in over the second half of the entrance, once their bays have spread apart.
      paint(view(t), entering ? Math.min(1, Math.max(0, e * 2.5 - 1.25)) : 1);
      // Once the camera settles the loop holds, so a still aisle repaints only when something changes.
      if (e === 1 && !instant && !held && run.loop) {
        held = true;
        run.loop.update({ paused: true });
      }
    },
  });
  host.dataset.picaReady = "true";

  return {
    update(nextProps) {
      const before = props;
      props = { ...props, ...nextProps };
      if (!sameJson(before.collections, props.collections) || before.seed !== props.seed) build();
      if (before.headingLevel !== props.headingLevel) makeHeading();
      palette.refresh();
      apply();
      land();
      wish = null;
      motion();
      run.loop?.redraw();
    },
    destroy() {
      if (dead) return;
      dead = true;
      run.loop?.destroy();
      palette.destroy();
      surface.destroy();
      aisle.removeEventListener("click", onClick);
      aisle.removeEventListener("keydown", onKey);
      aisle.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/immersive/archive-aisle/index.tsx
export type ArchiveAisleComponentProps = Partial<ArchiveAisleProps> & Handlers<ArchiveAisleEvents> & WrapperProps;

/** A one-point archive aisle whose camera walks to each collection's bay, with numbered markers, a register and a readable detail. */
export function ArchiveAisle({ className, style, palette, ...props }: ArchiveAisleComponentProps) {
  const ref = usePica<ArchiveAisleProps>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Archive aisle · archive-aisle
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Archive aisle · Pica</title>
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
var PicaArchiveAisle = (() => {
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

  // registry/immersive/archive-aisle/core.ts
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

  // lib/loop.ts
  var MAX_STEP_MS = 100;
  function createLoop(options) {
    const { el, frame } = options;
    let state = { paused: options.paused, time: options.time, fps: options.fps, still: options.still };
    let t = 0;
    let last = 0;
    let raf = 0;
    let onScreen = true;
    let tabVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
    const motionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    let reduced = motionQuery?.matches ?? false;
    const animating = () => !state.paused && state.time === null && !reduced && onScreen && tabVisible;
    const heldTime = () => state.time !== null ? state.time : reduced ? state.still : t;
    function tick(now) {
      raf = 0;
      if (!animating()) return;
      if (last === 0) last = now;
      const elapsed = now - last;
      if (elapsed >= 1e3 / Math.max(1, state.fps) - 1) {
        t += Math.min(elapsed, MAX_STEP_MS);
        last = now;
        frame(t, reduced);
      }
      raf = requestAnimationFrame(tick);
    }
    function sync(drawHeld) {
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
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      onScreen = entry ? entry.isIntersecting : true;
      sync(false);
    }) : null;
    observer?.observe(el);
    const onVisibility = () => {
      tabVisible = document.visibilityState !== "hidden";
      sync(false);
    };
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
    const onMotion = () => {
      reduced = motionQuery?.matches ?? false;
      sync(true);
    };
    motionQuery?.addEventListener("change", onMotion);
    frame(heldTime(), reduced);
    sync(false);
    return {
      update(next) {
        const timeChanged = next.time !== void 0 && next.time !== state.time;
        state = { ...state, ...next };
        if (state.time !== null) t = state.time;
        sync(timeChanged || next.paused !== void 0 || next.still !== void 0);
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
      }
    };
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
  function cssOn(token) {
    return `oklch(from ${cssVar(token)} clamp(0, (0.62 - l) * 1000, 1) 0 0)`;
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

  // lib/rng.ts
  function createRng(seed) {
    let state = seed >>> 0;
    return () => {
      state = state + 1831565813 >>> 0;
      let t = state;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashMix(h) {
    h = Math.imul(h ^ h >>> 16, 2146121005);
    h = Math.imul(h ^ h >>> 15, 2221713035);
    return (h ^ h >>> 16) >>> 0;
  }
  function hashSeed(seed, a, b = 0) {
    return hashMix(hashMix(hashMix(seed >>> 0) ^ a >>> 0) ^ b >>> 0);
  }

  // registry/immersive/archive-aisle/core.ts
  var defaults = {
    label: "Aisle seven",
    collections: [
      {
        name: "Town plans",
        reference: "CA 61/09",
        title: "The unbuilt crossing",
        description: "Nine folded drawings trace a footbridge proposed in 1961. Pencil revisions move its landing away from the market, and the final envelope carries no approval stamp.",
        facts: "9 drawings · 1961–1968",
        note: "Open. Unfolding needs a support board from the desk.",
        chapters: ["Scope and content", "Arrangement", "Access"]
      },
      {
        name: "Oral histories",
        reference: "OH 84/24",
        title: "Voices from the night shift",
        description: "Transcripts of 24 interviews document the mill after dark, from the sound of each machine to the signals passed across the floor.",
        facts: "24 transcripts · 1984",
        note: "Edited transcripts are open. Personal addresses remain closed.",
        chapters: ["Scope and content", "Names and places", "Access"]
      },
      {
        name: "Correspondence",
        reference: "CO 72/76",
        title: "Letters from the allotments",
        description: "A bundle of 76 letters follows the making of a shared garden, with seed requests, minutes and a map drawn on an envelope.",
        facts: "76 letters · 1972–1975",
        note: "Open. Keep the bundle in its original order when asking for scans.",
        chapters: ["Scope and content", "Original order", "Access"]
      },
      {
        name: "Workshop ledgers",
        reference: "WL 49/04",
        title: "A repair for every season",
        description: "Four ledgers from a bicycle repair shop show how regular maintenance tied a street together through tools, parts and trust.",
        facts: "4 volumes · 1949–1963",
        note: "Open. The fourth volume is served as a copy.",
        chapters: ["Scope and content", "Related records", "Access"]
      }
    ],
    value: null,
    defaultValue: -1,
    headingLevel: 3,
    fps: 30,
    paused: false,
    time: null,
    seed: 1
  };
  var AISLE_ENTRANCE = 4e3;
  var AISLE_MOVE = 800;
  var AISLE_HALF = 0.95;
  var AISLE_EYE = 1.2;
  var AISLE_TOP = 2.3;
  var AISLE_BOARDS = [0.06, 0.78, 1.5, 2.22];
  var AISLE_PLANK = 0.04;
  var AISLE_FOCAL = 0.6;
  var AISLE_OVERVIEW = [0, AISLE_EYE, -1.2];
  var AISLE_MOUTH = [0, AISLE_EYE + 0.3, -4.2];
  function aisleBooks(seed, bays) {
    const out = [];
    for (let bay = 0; bay < bays * 2; bay++) {
      const x = bay % 2 ? AISLE_HALF : -AISLE_HALF;
      const j = bay >> 1;
      for (let row = 0; row < 3; row++) {
        const rand = createRng(hashSeed(seed, bay, row));
        const base = (AISLE_BOARDS[row] ?? 0) + AISLE_PLANK;
        const room = (AISLE_BOARDS[row + 1] ?? 0) - base;
        for (let z = j + 0.04; ; ) {
          const thick = 0.02 + rand() * 0.045;
          if (z + thick > j + 0.96) break;
          if (rand() > 0.07) out.push([x, z, z + thick, base, base + room * (0.55 + rand() * 0.38), Math.floor(rand() * 3)]);
          z += thick + 5e-3;
        }
      }
    }
    return out;
  }
  function aisleRules(s) {
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const tint = (n) => `color-mix(in srgb,${fg} ${n}%,transparent)`;
    const line = `1px solid ${tint(22)}`;
    const ring = `outline:2px solid ${cssVar("accent")};outline-offset:2px`;
    return [
      `:where(${s}){display:block;color:${fg};background:${cssVar("bg")}}`,
      `${s} [data-part=aisle]{container-type:inline-size;padding:clamp(16px,3%,40px)}`,
      `${s} [data-part=layout]{display:grid;grid-template-columns:minmax(0,1fr);gap:24px 40px;align-items:start}`,
      `${s} [data-part=scene]{position:relative;aspect-ratio:4/3}`,
      `@container (min-width:620px){${s} [data-part=scene]{aspect-ratio:16/9}}`,
      `@container (min-width:620px) and (max-width:959px){${s} [data-part=layout]{grid-template-columns:repeat(2,minmax(0,1fr))}${s} [data-part=scene],${s} [data-view=overview] [data-part=register]{grid-column:1/-1}${s} [data-view=overview] [data-part=register]{columns:2;column-gap:40px}}`,
      `@container (min-width:960px){${s} [data-part=layout]{grid-template-columns:minmax(0,1.65fr) minmax(0,1fr)}${s} [data-part=scene]{grid-row:1/span 2}${s} [data-part=layout]>:not([data-part=scene]){grid-column:2}}`,
      `${s} [data-part=markers]{position:absolute;inset:0}`,
      `${s} [data-part=markers]:focus-within{opacity:1!important}`,
      // A marker is a clear 44 px target around a 32 by 24 plate. The plate carries the one outline and the numerals.
      `${s} [data-part=markers] button{position:absolute;left:0;top:0;display:flex;align-items:center;justify-content:center;width:44px;height:44px;margin:0;padding:0;border:0;border-radius:0;background:none;color:${fg};font:inherit;cursor:pointer}`,
      `${s} [data-part=register]{margin:0;padding:0;list-style:none;border-top:${line}}`,
      `${s} [data-part=register] li{break-inside:avoid;border-bottom:${line}}`,
      `${s} [data-part=register] button{display:flex;align-items:baseline;gap:.75em;width:100%;min-height:44px;margin:0;padding:.55em 0;border:0;border-radius:0;background:none;color:inherit;font:inherit;line-height:1.35;text-align:left;cursor:pointer}`,
      `${s} [data-part=num],${s} [data-part=ref],${s} [data-part=reference],${s} [data-part=facts]{font-family:${GRID_FONT};font-size:.75em;letter-spacing:.04em;color:${muted}}`,
      `${s} [data-part=num]{padding:.1em .4em}`,
      `${s} [data-part=markers] [data-part=num]{box-sizing:border-box;width:32px;height:24px;padding:0;border:1px solid ${fg};color:${fg};font-weight:500;line-height:22px;text-align:center}`,
      `${s} [data-part=ref]{margin-left:auto;white-space:nowrap}`,
      `${s} [data-part=reference],${s} [data-part=facts]{margin:0;text-transform:uppercase;line-height:1.6;overflow-wrap:anywhere}`,
      `${s} [data-part=heading]{margin:.3em 0 .5em;font-size:1.5em;font-weight:500;line-height:1.15}`,
      `${s} [data-part=description]{margin:0 0 .9em;max-width:62ch;line-height:1.55}`,
      `${s} [data-part=note],${s} [data-part=empty]{margin:.8em 0 0;color:${muted};line-height:1.5}`,
      `${s} [data-part=chapters]{margin:.8em 0 0;padding-left:1.4em;line-height:1.6}`,
      `${s} [data-part=controls]{display:flex;flex-wrap:wrap;gap:8px;margin-top:1.2em}`,
      `${s} [data-part=controls] button{min-height:44px;padding:0 1em;border:${line};border-radius:0;background:none;color:inherit;font:inherit;cursor:pointer}`,
      // Hover follows every button's own rule, which it would otherwise lose to at equal weight, and on a marker it
      // tints the plate rather than the whole target. The pressed fill is the ink of the plate itself, while the
      // numerals inside take the readable ink on it: currentColor stands in for fg when the page sets no palette, so
      // the fill and the figures cannot share one element.
      `${s} [data-part=register] button:hover,${s} [data-part=controls] button:hover,${s} [data-part=markers] [aria-pressed=false]:hover>span{background:${tint(10)}}`,
      `${s} [aria-pressed=true] [data-part=num]{color:${fg};background:${fg}}`,
      `${s} [aria-pressed=true] [data-part=num]>span{color:${cssOn("fg")}}`,
      `${s} [data-part=controls] button:disabled{opacity:.45;cursor:default;background:none}`,
      `${s} :focus-visible{${ring}}`,
      `${s} [data-part=markers] :focus-visible{outline:0}`,
      `${s} [data-part=markers] :focus-visible>span{${ring}}`
    ].join("");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const emit = emitter(host);
    const attrs = hostAttributes(host);
    const sheet = scope(host);
    sheet.setRules(aisleRules(sheet.selector));
    const make = (tag, part, parent) => {
      const el = document.createElement(tag);
      el.setAttribute("data-pica", "");
      if (part) el.dataset.part = part;
      parent?.append(el);
      return el;
    };
    const aisle = make("div", "aisle", host);
    const layout = make("div", "layout", aisle);
    const scene = make("div", "scene", layout);
    const detail = make("div", "detail", layout);
    const register = make("ol", "register", layout);
    const empty = make("p", "empty", layout);
    empty.textContent = "No collections";
    const reference = make("p", "reference", detail);
    const description = make("p", "description", detail);
    const facts = make("p", "facts", detail);
    const note = make("p", "note", detail);
    const chapters = make("ol", "chapters", detail);
    const controls = make("div", "controls", detail);
    const action = (name) => {
      const button = make("button", "", controls);
      button.type = "button";
      button.dataset.action = name.toLowerCase();
      button.textContent = name;
      return button;
    };
    action("Back");
    const previous = action("Previous");
    const next = action("Next");
    let heading = make("h3", "heading");
    const run = {};
    const surface = createCanvas(scene, { maxDpr: 2, maxPixels: 24e5, onResize: () => (measure(), run.loop?.redraw()) });
    const ctx = surface.canvas.getContext("2d");
    const group = make("div", "markers", scene);
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Bays");
    const palette = watchPalette(host, () => run.loop?.redraw());
    let list = [];
    let bays = 4;
    let books = [];
    let marks = [];
    let items = [];
    let mw = 44;
    let mh = 44;
    let pw = 32;
    let ph = 24;
    let internal = props.defaultValue;
    let shown = -1;
    let wish = null;
    let from = AISLE_MOUTH;
    let to = AISLE_OVERVIEW;
    let start = 0;
    let span = AISLE_ENTRANCE;
    let entering = true;
    let held = false;
    let now = 0;
    let dead = false;
    const num = (i) => String(i + 1).padStart(2, "0");
    const steps = [];
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) steps.push([dx, dy]);
    const cost = ([dx, dy]) => Math.abs(dy) + 1.5 * Math.abs(dx) + (dy < 0 ? 0.5 : 0) + (dx < 0 ? 0.5 : 0);
    steps.sort((a, b) => cost(a) - cost(b));
    function build() {
      list = (Array.isArray(props.collections) ? props.collections : []).slice(0, 12);
      bays = Math.min(7, Math.max(4, Math.ceil(list.length / 2) + 1));
      books = aisleBooks(props.seed, bays);
      group.replaceChildren();
      register.replaceChildren();
      marks = list.map((c, i) => {
        const mark = make("button", "", group);
        mark.type = "button";
        mark.dataset.index = String(i);
        make("span", "", make("span", "num", mark)).textContent = num(i);
        mark.setAttribute("aria-label", `${num(i)} ${c.name}`);
        return mark;
      });
      items = list.map((c, i) => {
        const item = make("button", "", make("li", "", register));
        item.type = "button";
        item.dataset.index = String(i);
        make("span", "", make("span", "num", item)).textContent = num(i);
        make("span", "name", item).textContent = c.name;
        make("span", "ref", item).textContent = c.reference;
        return item;
      });
      register.hidden = !list.length;
      empty.hidden = !!list.length;
      measure();
    }
    function measure() {
      const plate = marks[0]?.firstElementChild;
      mw = marks[0]?.offsetWidth || 44;
      mh = marks[0]?.offsetHeight || 44;
      pw = plate?.offsetWidth || 32;
      ph = plate?.offsetHeight || 24;
    }
    function makeHeading() {
      const h = make(`h${Math.min(6, Math.max(2, Math.round(props.headingLevel) || 3))}`, "heading");
      h.tabIndex = -1;
      heading.remove();
      detail.insertBefore(h, description);
      heading = h;
    }
    const aim = (i) => i < 0 ? AISLE_OVERVIEW : [i % 2 ? 0.2 : -0.2, AISLE_EYE, Math.floor(i / 2) - 0.95];
    const progress = (t) => 1 - (1 - Math.min(1, Math.max(0, (t - start) / span))) ** 3;
    const view = (t) => {
      const e = progress(t);
      return [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e, from[2] + (to[2] - from[2]) * e];
    };
    const current = () => {
      const v = props.value ?? internal;
      return Number.isInteger(v) && v >= 0 && v < list.length ? v : -1;
    };
    const motion = () => run.loop?.update({ paused: props.paused || held, time: props.time, fps: Math.min(30, Math.max(1, props.fps || 30)) });
    function render() {
      attrs.set("role", props.label ? "region" : null);
      attrs.set("aria-label", props.label || null);
      aisle.dataset.view = shown < 0 ? "overview" : "detail";
      detail.hidden = shown < 0;
      for (const set of [marks, items]) set.forEach((button, i) => button.setAttribute("aria-pressed", String(i === shown)));
      const c = list[shown];
      if (!c) return;
      reference.textContent = c.reference;
      heading.textContent = c.title;
      description.textContent = c.description;
      facts.textContent = c.facts;
      note.textContent = c.note;
      chapters.replaceChildren(...(Array.isArray(c.chapters) ? c.chapters : []).map((text) => {
        const li = make("li", "");
        li.textContent = text;
        return li;
      }));
      facts.hidden = !c.facts;
      note.hidden = !c.note;
      chapters.hidden = !chapters.children.length;
      previous.disabled = shown < 1;
      next.disabled = shown >= list.length - 1;
    }
    function apply() {
      const v = current();
      if (v !== shown) {
        from = view(now);
        to = aim(v);
        start = now;
        span = AISLE_MOVE;
        shown = v;
        entering = false;
        held = false;
        motion();
      }
      render();
    }
    function land() {
      if (!wish || wish[0] !== shown) return;
      const [v, was, keep] = wish;
      wish = null;
      const mark = marks[was];
      (v >= 0 ? keep && !keep.disabled ? keep : heading : mark?.style.visibility ? items[was] : mark)?.focus();
    }
    function act(v, keep) {
      if (v !== shown) emit("valueChange", v);
      wish = [v, shown, keep];
      if (props.value === null) {
        internal = v;
        apply();
      }
      land();
    }
    const onClick = (event) => {
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      if (!button || !aisle.contains(button)) return;
      const { index, action: name } = button.dataset;
      if (index) act(Number(index));
      else if (name === "back") act(-1);
      else if (name) act(shown + (name === "next" ? 1 : -1), button);
    };
    const onKey = (event) => {
      if (event.key !== "Escape" || shown < 0) return;
      event.preventDefault();
      act(-1);
    };
    aisle.addEventListener("click", onClick);
    aisle.addEventListener("keydown", onKey);
    function paint(c, fade) {
      const w = surface.cssWidth;
      const h = surface.cssHeight;
      const f = AISLE_FOCAL * w;
      const at = (x, y, z) => {
        const d = z - c[2];
        return d > 0.2 ? [w / 2 + f * (x - c[0]) / d, h / 2 - f * (y - c[1]) / d] : null;
      };
      const placed = [];
      const order = marks.map((_, i) => i);
      if (shown >= 0) order.unshift(...order.splice(shown, 1));
      group.style.opacity = String(fade);
      for (const i of order) {
        const mark = marks[i];
        const j = Math.floor(i / 2);
        const p = at(i % 2 ? AISLE_HALF : -AISLE_HALF, AISLE_EYE + (j % 2 ? -0.45 : 0.45), j + 0.5);
        const inside = !!p && p[0] > 0 && p[0] < w && p[1] > 0 && p[1] < h;
        if (!mark) continue;
        mark.style.visibility = inside ? "" : "hidden";
        if (!p || !inside) continue;
        const away = p[1] < h / 2 ? -1 : 1;
        const out = i % 2 ? 1 : -1;
        let spot;
        for (const [dx, dy] of steps) {
          const x = Math.round(Math.min(w - mw, Math.max(0, p[0] - mw / 2 + out * dx * (mw + 2))));
          const y = Math.round(Math.min(h - mh, Math.max(0, p[1] - mh / 2 + away * dy * (mh + 2))));
          const clear = placed.every((q) => Math.abs(q[0] - x) >= mw + 2 || Math.abs(q[1] - y) >= mh + 2);
          if (clear || !spot) spot = [x, y, p[0], p[1]];
          if (clear) break;
        }
        if (!spot) continue;
        placed.push(spot);
        mark.style.transform = `translate(${spot[0]}px,${spot[1]}px)`;
      }
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, surface.width, surface.height);
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      const colors = palette.colors;
      const face = (x, y0, y1, z0, z1) => {
        const a = at(x, y0, z0);
        const b = at(x, y0, z1);
        const e = at(x, y1, z1);
        const g = at(x, y1, z0);
        if (!a || !b || !e || !g) return;
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(e[0], e[1]);
        ctx.lineTo(g[0], g[1]);
        ctx.closePath();
      };
      const seg = (x0, y0, z0, x1, y1, z1) => {
        const n = c[2] + 0.21;
        if (z0 < n && z1 < n) return;
        if (z0 < n) {
          const k = (n - z0) / (z1 - z0);
          x0 += (x1 - x0) * k;
          y0 += (y1 - y0) * k;
          z0 = n;
        } else if (z1 < n) {
          const k = (n - z1) / (z0 - z1);
          x1 += (x0 - x1) * k;
          y1 += (y0 - y1) * k;
          z1 = n;
        }
        const a = at(x0, y0, z0);
        const b = at(x1, y1, z1);
        if (!a || !b) return;
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      };
      const rect = (x0, y0, x1, y1, z) => {
        seg(x0, y0, z, x1, y0, z);
        seg(x1, y0, z, x1, y1, z);
        seg(x1, y1, z, x0, y1, z);
        seg(x0, y1, z, x0, y0, z);
      };
      ctx.fillStyle = colors.fg;
      for (let tone = 0; tone < 3; tone++) {
        ctx.beginPath();
        for (const [x, z0, z1, y0, y1, t] of books) if (t === tone) face(x, y0, y1, z0, z1);
        ctx.globalAlpha = 0.14 + tone * 0.1;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      for (const x of [-AISLE_HALF, AISLE_HALF]) {
        for (let j = 0; j <= bays; j++) {
          face(x, 0, AISLE_TOP, j - AISLE_PLANK / 2, j + AISLE_PLANK / 2);
          if (j < bays) for (const y of AISLE_BOARDS) face(x, y, y + AISLE_PLANK, j + AISLE_PLANK / 2, j + 1 - AISLE_PLANK / 2);
        }
      }
      ctx.fillStyle = colors.muted;
      ctx.fill();
      ctx.beginPath();
      const end = bays + 0.8;
      for (const side of [-1, 1]) {
        const x = side * AISLE_HALF;
        seg(x, 0, 0, x, 0, end);
        seg(side * (AISLE_HALF + 0.45), 0, 0, side * 6, 0, 0);
        rect(x, 0, side * (AISLE_HALF + 0.45), AISLE_TOP, 0);
      }
      for (let j = 0; j <= bays; j++) seg(-AISLE_HALF, 0, j, AISLE_HALF, 0, j);
      rect(-AISLE_HALF, 0, AISLE_HALF, 2.6, end);
      rect(-0.42, 0, 0.42, 2.05, end);
      ctx.strokeStyle = colors.muted;
      ctx.lineWidth = 1;
      ctx.stroke();
      if (shown >= 0) {
        const j = Math.floor(shown / 2);
        ctx.beginPath();
        face(shown % 2 ? AISLE_HALF : -AISLE_HALF, 0, AISLE_TOP, j, j + 1);
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.globalAlpha = fade;
      ctx.beginPath();
      for (const [x, y, ax, ay] of placed) {
        const left = x + (mw - pw) / 2;
        const top = y + (mh - ph) / 2;
        if (Math.abs(left + pw / 2 - ax) < pw && Math.abs(top + ph / 2 - ay) < ph) continue;
        ctx.moveTo(ax, ay);
        ctx.lineTo(Math.min(left + pw, Math.max(left, ax)), Math.min(top + ph, Math.max(top, ay)));
      }
      ctx.strokeStyle = colors.fg;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = colors.fg;
      for (const [x, y] of placed) ctx.fillRect(x + (mw - pw) / 2, y + (mh - ph) / 2, pw, ph);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    build();
    makeHeading();
    shown = current();
    to = aim(shown);
    render();
    run.loop = createLoop({
      el: scene,
      paused: props.paused,
      time: props.time,
      fps: Math.min(30, Math.max(1, props.fps || 30)),
      still: AISLE_ENTRANCE,
      frame(t, reduced) {
        now = t;
        const instant = reduced || props.paused || props.time !== null;
        if (instant) {
          from = to;
          start = -Infinity;
        }
        const e = progress(t);
        if (e === 1) entering = false;
        paint(view(t), entering ? Math.min(1, Math.max(0, e * 2.5 - 1.25)) : 1);
        if (e === 1 && !instant && !held && run.loop) {
          held = true;
          run.loop.update({ paused: true });
        }
      }
    });
    host.dataset.picaReady = "true";
    return {
      update(nextProps) {
        const before = props;
        props = { ...props, ...nextProps };
        if (!sameJson(before.collections, props.collections) || before.seed !== props.seed) build();
        if (before.headingLevel !== props.headingLevel) makeHeading();
        palette.refresh();
        apply();
        land();
        wish = null;
        motion();
        run.loop?.redraw();
      },
      destroy() {
        if (dead) return;
        dead = true;
        run.loop?.destroy();
        palette.destroy();
        surface.destroy();
        aisle.removeEventListener("click", onClick);
        aisle.removeEventListener("keydown", onKey);
        aisle.remove();
        sheet.destroy();
        attrs.restore();
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
  var initial = Object.assign({}, {"collections":[{"name":"Town plans","reference":"CA 61/09","title":"The unbuilt crossing","description":"Nine folded drawings trace a footbridge proposed in 1961. Pencil revisions move its landing away from the market, and the final envelope carries no approval stamp.","facts":"9 drawings · 1961–1968","note":"Open. Unfolding needs a support board from the desk.","chapters":["Scope and content","Arrangement","Access"]},{"name":"Oral histories","reference":"OH 84/24","title":"Voices from the night shift","description":"Transcripts of 24 interviews document the mill after dark, from the sound of each machine to the signals passed across the floor.","facts":"24 transcripts · 1984","note":"Edited transcripts are open. Personal addresses remain closed.","chapters":["Scope and content","Names and places","Access"]},{"name":"Correspondence","reference":"CO 72/76","title":"Letters from the allotments","description":"A bundle of 76 letters follows the making of a shared garden, with seed requests, minutes and a map drawn on an envelope.","facts":"76 letters · 1972–1975","note":"Open. Keep the bundle in its original order when asking for scans.","chapters":["Scope and content","Original order","Access"]},{"name":"Workshop ledgers","reference":"WL 49/04","title":"A repair for every season","description":"Four ledgers from a bicycle repair shop show how regular maintenance tied a street together through tools, parts and trust.","facts":"4 volumes · 1949–1963","note":"Open. The fourth volume is served as a copy.","chapters":["Scope and content","Related records","Access"]},{"name":"Street photographs","reference":"PH 90/31","title":"One street, one morning","description":"Thirty-one prints record every shopfront on the high street on the morning before it was widened.","facts":"31 prints · 1990","note":"Open. Prints are served in sleeves.","chapters":["Scope and content","Sequence","Access"]},{"name":"Lamp committee","reference":"MN 55/18","title":"Minutes of the lamp committee","description":"Eighteen years of minutes argue over where the first electric street lamps should stand, with a pencilled count of every post.","facts":"3 volumes · 1955–1973","note":"Open. The 1961 volume is fragile and served by appointment.","chapters":["Scope and content","Arrangement","Related records","Access"]}]}, window.PICA_PROPS || {});
  var instance = PicaArchiveAisle.mount(host, take(initial));
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
