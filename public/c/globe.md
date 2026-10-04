# Globe

> A dotted globe that turns slowly on a tilted axis, with named places marked on its surface.

Category: immersive. Tags: 3d, rotation, map, canvas. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 3.4 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/globe.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `markers` | readonly GlobeMarker[] | `[{"lat":37.77,"lon":-122.42,"label":"San Francisco"},{"lat":51.51,"lon":-0.13,"label":"London"},{"lat":35.68,"lon":139.69,"label":"Tokyo"},{"lat":-33.87,"lon":151.21,"label":"Sydney"}]` | Places on the sphere, drawn in the accent with a thin ring, and hidden when they turn to the back. |
| `label` | string | `"A dotted globe"` | Text alternative for the globe, followed by each marker's label. Empty hides the host from assistive technology. |
| `dots` | number | `2400` | Points spread over the sphere's surface with a Fibonacci lattice. |
| `speed` | number | `0.25` | Spin speed. 0 holds the globe at its starting turn. |
| `tilt` | number | `20` | Tilt of the spin axis away from the viewer, in degrees. |
| `dotSize` | number | `1.2` | Diameter of each surface dot facing the viewer straight on, in CSS pixels. |
| `fps` | number | `30` | Frames per second ceiling. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Colors

Draws with `--pica-fg`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Globe · globe
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

// registry/immersive/globe/core.ts
export interface GlobeMarker {
  /** Degrees north of the equator. Negative is south. */
  lat: number;
  /** Degrees east of the prime meridian. Negative is west. */
  lon: number;
  /** Read after the globe's own label. Not drawn on screen. */
  label: string;
}

export interface GlobeProps extends MotionProps {
  /** Places on the sphere, drawn in the accent with a thin ring, and hidden when they turn to the back. */
  markers: readonly GlobeMarker[];
  /** Text alternative for the globe, followed by each marker's label. Empty hides the host from assistive technology. */
  label: string;
  /** Points spread over the sphere's surface with a Fibonacci lattice. */
  dots: number;
  /** Spin speed. 0 holds the globe at its starting turn. */
  speed: number;
  /** Tilt of the spin axis away from the viewer, in degrees. */
  tilt: number;
  /** Diameter of each surface dot facing the viewer straight on, in CSS pixels. */
  dotSize: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: GlobeProps = {
  markers: [
    { lat: 37.77, lon: -122.42, label: "San Francisco" },
    { lat: 51.51, lon: -0.13, label: "London" },
    { lat: 35.68, lon: 139.69, label: "Tokyo" },
    { lat: -33.87, lon: 151.21, label: "Sydney" },
  ],
  label: "A dotted globe",
  dots: 2400,
  speed: 0.25,
  tilt: 20,
  dotSize: 1.2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
/** The golden angle, the azimuthal step between consecutive lattice points, in radians. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** Radians of spin per second at speed 1. A full turn then takes 24 seconds. */
const SPIN_RATE = TAU / 24;
/** A fixed starting turn, chosen only so the default markers already read well at the still frame. */
const BASE_SPIN = 171 * DEG;
/** The frame held under reduced motion, and the time captures use. With the defaults it shows most markers. */
const STILL = 1200;
/** Cosine to the viewer above which a point counts as on the front hemisphere. */
const HORIZON = 0.02;
/** Shade steps the surface dots are grouped into, so one fill draws every dot at that shade in one call. */
const LEVELS = 12;

/** How far the first sample sits from the pole, as a fraction of one lattice step. A larger offset keeps a
 *  bigger lattice from crowding its poles, and a small one already spaces a small lattice evenly. */
function poleEpsilon(n: number): number {
  if (n < 24) return 0.33;
  if (n < 177) return 1.33;
  if (n < 890) return 3.33;
  return 10;
}

/** Points on the unit sphere from a Fibonacci lattice, y as the pole axis, flattened as x, y, z triples. */
function buildLattice(n: number): Float32Array {
  const count = Math.max(0, Math.floor(n));
  const out = new Float32Array(count * 3);
  const epsilon = poleEpsilon(count);
  const denom = Math.max(1e-6, count - 1 + 2 * epsilon);
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + epsilon)) / denom;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * GOLDEN_ANGLE;
    out[i * 3] = r * Math.cos(theta);
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = r * Math.sin(theta);
  }
  return out;
}

/** A point on the unit sphere for a latitude and longitude in degrees, in the same frame as the lattice. */
function llToVec3(lat: number, lon: number): readonly [number, number, number] {
  const latR = lat * DEG;
  const lonR = lon * DEG;
  const y = Math.sin(latR);
  const r = Math.cos(latR);
  return [r * Math.sin(lonR), y, r * Math.cos(lonR)];
}

/** Spins a unit point around the vertical axis, then tilts the whole globe around the horizontal axis.
 *  Returns its unscaled screen x and y and the cosine of its angle to the viewer, positive on the front. */
function project(
  x0: number,
  y0: number,
  z0: number,
  cosSpin: number,
  sinSpin: number,
  cosTilt: number,
  sinTilt: number,
): readonly [number, number, number] {
  const x1 = x0 * cosSpin + z0 * sinSpin;
  const z1 = z0 * cosSpin - x0 * sinSpin;
  const y2 = y0 * cosTilt - z1 * sinTilt;
  const z2 = y0 * sinTilt + z1 * cosTilt;
  return [x1, y2, z2];
}

export const mount: Mount<GlobeProps> = (host, initial = {}) => {
  let props: GlobeProps = { ...defaults, ...initial };
  let lattice = buildLattice(props.dots);
  let markerVecs: (readonly [number, number, number])[] = props.markers.map((m) => llToVec3(m.lat, m.lon));

  function updateLabel(): void {
    const names = props.markers.map((m) => m.label).filter((name) => name !== "");
    const text = props.label === "" ? "" : names.length > 0 ? `${props.label}: ${names.join(", ")}.` : `${props.label}.`;
    labelHost(host, text);
  }

  const surface = createCanvas(host, { onResize: () => loop.redraw() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => loop.redraw());
  updateLabel();

  function draw(t: number): void {
    const { width, height, dpr, cssWidth, cssHeight } = surface;
    if (ctx && width > 0 && height > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = cssWidth / 2;
      const cy = cssHeight / 2;
      const sphereRadius = (Math.min(cssWidth, cssHeight) / 2) * 0.84;
      const spin = BASE_SPIN + (t / 1000) * props.speed * SPIN_RATE;
      const cosSpin = Math.cos(spin);
      const sinSpin = Math.sin(spin);
      const tiltRad = props.tilt * DEG;
      const cosTilt = Math.cos(tiltRad);
      const sinTilt = Math.sin(tiltRad);

      const buckets: number[][] = [];
      for (let level = 0; level < LEVELS; level++) buckets.push([]);
      for (let i = 0; i < lattice.length; i += 3) {
        const x0 = lattice[i]!;
        const y0 = lattice[i + 1]!;
        const z0 = lattice[i + 2]!;
        const [ux, uy, depth] = project(x0, y0, z0, cosSpin, sinSpin, cosTilt, sinTilt);
        if (depth <= HORIZON) continue;
        const level = Math.min(LEVELS - 1, Math.floor(depth * LEVELS));
        buckets[level]?.push(ux, uy);
      }
      ctx.fillStyle = palette.colors.fg;
      for (let level = 0; level < LEVELS; level++) {
        const points = buckets[level];
        if (!points || points.length === 0) continue;
        const shade = (level + 0.5) / LEVELS;
        const dotRadius = (props.dotSize * (0.55 + 0.45 * shade)) / 2;
        ctx.globalAlpha = shade;
        ctx.beginPath();
        for (let p = 0; p < points.length; p += 2) {
          const px = cx + (points[p] ?? 0) * sphereRadius;
          const py = cy - (points[p + 1] ?? 0) * sphereRadius;
          ctx.moveTo(px + dotRadius, py);
          ctx.arc(px, py, dotRadius, 0, TAU);
        }
        ctx.fill();
      }

      ctx.fillStyle = palette.colors.accent;
      ctx.strokeStyle = palette.colors.accent;
      ctx.lineWidth = Math.max(1, props.dotSize * 0.6);
      for (const vec of markerVecs) {
        const [ux, uy, depth] = project(vec[0], vec[1], vec[2], cosSpin, sinSpin, cosTilt, sinTilt);
        if (depth <= HORIZON) continue;
        const shade = Math.min(1, depth);
        const px = cx + ux * sphereRadius;
        const py = cy - uy * sphereRadius;
        const dotRadius = (props.dotSize * 1.8 * (0.55 + 0.45 * shade)) / 2;
        ctx.globalAlpha = 0.65 + 0.35 * shade;
        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, dotRadius * 2.2, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.dots !== before.dots) lattice = buildLattice(props.dots);
      const markersChanged = !sameJson(props.markers, before.markers);
      if (markersChanged) markerVecs = props.markers.map((m) => llToVec3(m.lat, m.lon));
      if (markersChanged || props.label !== before.label) updateLabel();
      palette.refresh();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      surface.destroy();
      palette.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/immersive/globe/index.tsx
export type GlobeComponentProps = Partial<GlobeProps> & WrapperProps;

/** A dotted globe that turns slowly on a tilted axis, with named places marked on its surface. */
export function Globe({ className, style, palette, ...props }: GlobeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Globe · globe
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Globe · Pica</title>
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
var PicaGlobe = (() => {
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

  // registry/immersive/globe/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/a11y.ts
  function labelHost(host, label, role = "img") {
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
  function unlabelHost(host) {
    host.removeAttribute("role");
    host.removeAttribute("aria-label");
    host.removeAttribute("aria-hidden");
  }

  // lib/host.ts
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

  // registry/immersive/globe/core.ts
  var defaults = {
    markers: [
      { lat: 37.77, lon: -122.42, label: "San Francisco" },
      { lat: 51.51, lon: -0.13, label: "London" },
      { lat: 35.68, lon: 139.69, label: "Tokyo" },
      { lat: -33.87, lon: 151.21, label: "Sydney" }
    ],
    label: "A dotted globe",
    dots: 2400,
    speed: 0.25,
    tilt: 20,
    dotSize: 1.2,
    fps: 30,
    paused: false,
    time: null,
    seed: 1
  };
  var TAU = Math.PI * 2;
  var DEG = Math.PI / 180;
  var GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  var SPIN_RATE = TAU / 24;
  var BASE_SPIN = 171 * DEG;
  var STILL = 1200;
  var HORIZON = 0.02;
  var LEVELS = 12;
  function poleEpsilon(n) {
    if (n < 24) return 0.33;
    if (n < 177) return 1.33;
    if (n < 890) return 3.33;
    return 10;
  }
  function buildLattice(n) {
    const count = Math.max(0, Math.floor(n));
    const out = new Float32Array(count * 3);
    const epsilon = poleEpsilon(count);
    const denom = Math.max(1e-6, count - 1 + 2 * epsilon);
    for (let i = 0; i < count; i++) {
      const y = 1 - 2 * (i + epsilon) / denom;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = i * GOLDEN_ANGLE;
      out[i * 3] = r * Math.cos(theta);
      out[i * 3 + 1] = y;
      out[i * 3 + 2] = r * Math.sin(theta);
    }
    return out;
  }
  function llToVec3(lat, lon) {
    const latR = lat * DEG;
    const lonR = lon * DEG;
    const y = Math.sin(latR);
    const r = Math.cos(latR);
    return [r * Math.sin(lonR), y, r * Math.cos(lonR)];
  }
  function project(x0, y0, z0, cosSpin, sinSpin, cosTilt, sinTilt) {
    const x1 = x0 * cosSpin + z0 * sinSpin;
    const z1 = z0 * cosSpin - x0 * sinSpin;
    const y2 = y0 * cosTilt - z1 * sinTilt;
    const z2 = y0 * sinTilt + z1 * cosTilt;
    return [x1, y2, z2];
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let lattice = buildLattice(props.dots);
    let markerVecs = props.markers.map((m) => llToVec3(m.lat, m.lon));
    function updateLabel() {
      const names = props.markers.map((m) => m.label).filter((name) => name !== "");
      const text = props.label === "" ? "" : names.length > 0 ? `${props.label}: ${names.join(", ")}.` : `${props.label}.`;
      labelHost(host, text);
    }
    const surface = createCanvas(host, { onResize: () => loop.redraw() });
    const ctx = surface.canvas.getContext("2d");
    const palette = watchPalette(host, () => loop.redraw());
    updateLabel();
    function draw(t) {
      const { width, height, dpr, cssWidth, cssHeight } = surface;
      if (ctx && width > 0 && height > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cx = cssWidth / 2;
        const cy = cssHeight / 2;
        const sphereRadius = Math.min(cssWidth, cssHeight) / 2 * 0.84;
        const spin = BASE_SPIN + t / 1e3 * props.speed * SPIN_RATE;
        const cosSpin = Math.cos(spin);
        const sinSpin = Math.sin(spin);
        const tiltRad = props.tilt * DEG;
        const cosTilt = Math.cos(tiltRad);
        const sinTilt = Math.sin(tiltRad);
        const buckets = [];
        for (let level = 0; level < LEVELS; level++) buckets.push([]);
        for (let i = 0; i < lattice.length; i += 3) {
          const x0 = lattice[i];
          const y0 = lattice[i + 1];
          const z0 = lattice[i + 2];
          const [ux, uy, depth] = project(x0, y0, z0, cosSpin, sinSpin, cosTilt, sinTilt);
          if (depth <= HORIZON) continue;
          const level = Math.min(LEVELS - 1, Math.floor(depth * LEVELS));
          buckets[level]?.push(ux, uy);
        }
        ctx.fillStyle = palette.colors.fg;
        for (let level = 0; level < LEVELS; level++) {
          const points = buckets[level];
          if (!points || points.length === 0) continue;
          const shade = (level + 0.5) / LEVELS;
          const dotRadius = props.dotSize * (0.55 + 0.45 * shade) / 2;
          ctx.globalAlpha = shade;
          ctx.beginPath();
          for (let p = 0; p < points.length; p += 2) {
            const px = cx + (points[p] ?? 0) * sphereRadius;
            const py = cy - (points[p + 1] ?? 0) * sphereRadius;
            ctx.moveTo(px + dotRadius, py);
            ctx.arc(px, py, dotRadius, 0, TAU);
          }
          ctx.fill();
        }
        ctx.fillStyle = palette.colors.accent;
        ctx.strokeStyle = palette.colors.accent;
        ctx.lineWidth = Math.max(1, props.dotSize * 0.6);
        for (const vec of markerVecs) {
          const [ux, uy, depth] = project(vec[0], vec[1], vec[2], cosSpin, sinSpin, cosTilt, sinTilt);
          if (depth <= HORIZON) continue;
          const shade = Math.min(1, depth);
          const px = cx + ux * sphereRadius;
          const py = cy - uy * sphereRadius;
          const dotRadius = props.dotSize * 1.8 * (0.55 + 0.45 * shade) / 2;
          ctx.globalAlpha = 0.65 + 0.35 * shade;
          ctx.beginPath();
          ctx.arc(px, py, dotRadius, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px, py, dotRadius * 2.2, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      host.dataset.picaReady = "true";
    }
    const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL, frame: draw });
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.dots !== before.dots) lattice = buildLattice(props.dots);
        const markersChanged = !sameJson(props.markers, before.markers);
        if (markersChanged) markerVecs = props.markers.map((m) => llToVec3(m.lat, m.lon));
        if (markersChanged || props.label !== before.label) updateLabel();
        palette.refresh();
        loop.update({ paused: props.paused, time: props.time, fps: props.fps });
        loop.redraw();
      },
      destroy() {
        loop.destroy();
        surface.destroy();
        palette.destroy();
        unlabelHost(host);
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
  var instance = PicaGlobe.mount(host, take(window.PICA_PROPS || {}));
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

- Technique from [Evenly distributing points on a sphere](https://extremelearning.com.au/how-to-evenly-distribute-points-on-a-sphere-more-effectively-than-the-canonical-fibonacci-lattice/) by Martin Roberts (Article).
