# Hanging Waterfall

> A broad stepped stream spills over split rock strata into a shallow plunge basin and open outlet.

Category: immersive. Tags: pixel, isometric, waterfall, water, rock. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 6.2 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/pixel-hanging-waterfall.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Presets

Use these JSON props in React or as window.PICA_PROPS in HTML. The catalog applies them before copying either format.

### Overhang

A single high curtain hangs over an open rock recess.

```json
{
  "layout": "overhang",
  "dropHeight": 0.75,
  "flow": 0.75
}
```

### Split

A central tooth divides the upper stream into two receiving falls.

```json
{
  "layout": "split",
  "dropHeight": 0.8,
  "flow": 0.85
}
```

### Stairs

Three broad shelves carry a physically connected zigzag cascade.

```json
{
  "layout": "stairs",
  "dropHeight": 0.65,
  "flow": 0.65
}
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `layout` | "overhang" \| "split" \| "stairs" | `"overhang"` | Rock and channel arrangement for the connected cascade. |
| `dropHeight` | number | `0.75` | Drop as a fraction of the available vertical scene. |
| `flow` | number | `0.75` | Width and speed of the water, preserving a continuous stream. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Colors

Draws with `--pica-fg`, `--pica-bg`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Hanging Waterfall · pixel-hanging-waterfall
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

// lib/color.ts
/** Reading colors from the page, so components inherit instead of impose. See STYLE.md, principle 4. */


let colorProbe: CanvasRenderingContext2D | null | undefined;

/** Any CSS color as [r, g, b, a], each 0 to 255. A color the browser cannot parse reads as transparent. */
function parseColor(color: string): [number, number, number, number] {
  if (colorProbe === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    colorProbe = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!colorProbe) return [0, 0, 0, 0];
  colorProbe.clearRect(0, 0, 1, 1);
  colorProbe.fillStyle = "rgba(0, 0, 0, 0)";
  colorProbe.fillStyle = color;
  colorProbe.fillRect(0, 0, 1, 1);
  const d = colorProbe.getImageData(0, 0, 1, 1).data;
  return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0, d[3] ?? 0];
}

/** WCAG relative luminance of a CSS color: 0 for black, 1 for white. */
function relativeLuminance(color: string): number {
  const [r, g, b] = parseColor(color);
  const linear = (v: number): number => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** The color glyphs are drawn in: --pica-fg when set, otherwise the host's inherited color. It reads once;
 *  a core that needs the color every frame keeps a watchPalette handle from lib/palette.ts instead. */
function inkColor(host: HTMLElement): string {
  return readPalette(host).fg;
}

/** Whether the host shows light glyphs on a dark ground or the reverse, read from computed colors. */
function hostTone(host: HTMLElement): "light-on-dark" | "dark-on-light" {
  const fg = relativeLuminance(inkColor(host));
  let bg = 1; // A page with no background set anywhere renders white.
  for (let el: HTMLElement | null = host; el; el = el.parentElement) {
    const background = getComputedStyle(el).backgroundColor;
    if (parseColor(background)[3] > 0) {
      bg = relativeLuminance(background);
      break;
    }
  }
  return fg > bg ? "light-on-dark" : "dark-on-light";
}

// lib/dither.ts
/** Reducing tone to ink or no ink. Thresholds and kernels follow Surma's "Ditherpunk". */

/** Ordered-dither thresholds for a size by size Bayer matrix, row-major, each in (0, 1). */
function bayerMatrix(size: 2 | 4 | 8): Float32Array {
  // Built by doubling: each step places 4M, 4M + 2, 4M + 3, and 4M + 1 in the four quadrants.
  let m = [0];
  let n = 1;
  while (n < size) {
    const next = new Array<number>(4 * n * n).fill(0);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 4 * (m[y * n + x] ?? 0);
        next[y * 2 * n + x] = v;
        next[y * 2 * n + x + n] = v + 2;
        next[(y + n) * 2 * n + x] = v + 3;
        next[(y + n) * 2 * n + x + n] = v + 1;
      }
    }
    m = next;
    n *= 2;
  }
  const out = new Float32Array(size * size);
  for (let i = 0; i < out.length; i++) out[i] = ((m[i] ?? 0) + 0.5) / (size * size);
  return out;
}

const bayerCache = new Map<number, Float32Array>();

/** The ordered-dither threshold at pixel (x, y) of a tiled Bayer matrix, in (0, 1). Each size is built once. */
function bayerAt(size: 2 | 4 | 8, x: number, y: number): number {
  let m = bayerCache.get(size);
  if (!m) {
    m = bayerMatrix(size);
    bayerCache.set(size, m);
  }
  const mx = ((x % size) + size) % size;
  const my = ((y % size) + size) % size;
  return m[my * size + mx] ?? 0.5;
}

/** Ink or no ink for each value in 0..1, row-major. `bayer` 0 cuts flat at `level`; 2, 4, or 8 dithers
 *  around `level` with that Bayer matrix. Ink goes where a value reaches its threshold. Returns 1 where
 *  ink goes. */
function threshold(values: ArrayLike<number>, width: number, height: number, level = 0.5, bayer: 0 | 2 | 4 | 8 = 0): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const cut = bayer === 0 ? level : level + bayerAt(bayer, x, y) - 0.5;
      out[i] = (values[i] ?? 0) >= cut ? 1 : 0;
    }
  }
  return out;
}

type Diffusion = "floyd-steinberg" | "atkinson";

const KERNELS: Record<Diffusion, readonly (readonly [number, number, number])[]> = {
  "floyd-steinberg": [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
  // Atkinson spreads three quarters of the error, which keeps highlights and shadows cleaner.
  atkinson: [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]],
};

/** Error diffusion over ink values in 0..1, row-major. Returns 1 where ink goes. The input is not changed. */
function diffuse(values: ArrayLike<number>, width: number, height: number, kernel: Diffusion): Uint8Array {
  const v = Float32Array.from(values);
  const out = new Uint8Array(width * height);
  const taps = KERNELS[kernel];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const old = v[i] ?? 0;
      const bit = old >= 0.5 ? 1 : 0;
      out[i] = bit;
      const error = old - bit;
      for (const [dx, dy, weight] of taps) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny < height) {
          const j = ny * width + nx;
          v[j] = (v[j] ?? 0) + error * weight;
        }
      }
    }
  }
  return out;
}

// lib/pixel-scene.ts
type PixelPoint = readonly [number, number, number];
interface PixelPaint { ink?: "fg" | "accent" | "muted"; tone?: number; edge?: boolean; shadow?: boolean; }
interface PixelFace extends PixelPaint { points: readonly PixelPoint[]; }
interface PixelView {
  /** Fixed world-coordinate motion envelope, with z as height. */
  bounds: readonly [PixelPoint, PixelPoint];
  /** World height of the receiving ground plane. */
  ground?: number;
  /** Camera azimuth in degrees, default45. */
  yaw?: number;
  /** Camera elevation in degrees, default30. */
  elevation?: number;
}
interface PixelScene {
  draw(staticFaces: readonly PixelFace[], movingFaces: readonly PixelFace[], colors: Colors, view: PixelView): void;
}
type PixelColor = readonly [number, number, number, number];
type PixelProjected = readonly [number, number, number];
const pixelSceneLight: PixelPoint = [-0.65, 0.35, 1];
const pixelSceneClamp = (n: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, n));
const pixelSceneFinite = (p: PixelPoint): boolean => p.every(Number.isFinite);
const pixelSceneCross = (a: PixelPoint, b: PixelPoint): PixelPoint => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const pixelSceneSub = (a: PixelPoint, b: PixelPoint): PixelPoint => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const pixelSceneUnit = (p: PixelPoint): PixelPoint => {
  const length = Math.hypot(...p) || 1;
  return [p[0] / length, p[1] / length, p[2] / length];
};
const pixelSceneSides = (sides: number): number => Math.round(pixelSceneClamp(Number.isFinite(sides) ? sides : 8, 6, 12));

/** Closed geometry. Helpers append new faces and retain no caller-owned arrays. */
function pixelBox(out: PixelFace[], min: PixelPoint, size: PixelPoint, paint: PixelPaint = {}): void {
  if (!pixelSceneFinite(min) || !pixelSceneFinite(size) || size.some((n) => n <= 0)) return;
  const p: PixelPoint[] = [];
  for (const [x, y, z] of [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]) {
    p.push([min[0] + (x ?? 0) * size[0], min[1] + (y ?? 0) * size[1], min[2] + (z ?? 0) * size[2]]);
  }
  for (const ring of [[3, 2, 1, 0], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) {
    out.push({ ...paint, points: ring.map((i) => p[i]!) });
  }
}
function pixelPrism(out: PixelFace[], footprint: readonly (readonly [number, number])[], bottom: number, height: number, paint: PixelPaint = {}): void {
  if (footprint.length < 3 || !Number.isFinite(bottom) || !Number.isFinite(height) || height <= 0 || footprint.some((p) => !p.every(Number.isFinite))) return;
  const low: PixelPoint[] = footprint.map(([x, y]) => [x, y, bottom]);
  const high: PixelPoint[] = footprint.map(([x, y]) => [x, y, bottom + height]);
  out.push({ ...paint, points: [...low].reverse() }, { ...paint, points: high });
  for (let i = 0; i < low.length; i++) {
    const j = (i + 1) % low.length;
    out.push({ ...paint, points: [low[i]!, low[j]!, high[j]!, high[i]!] });
  }
}
function pixelCone(out: PixelFace[], base: PixelPoint, radius: number, height: number, paint: PixelPaint = {}, sides = 8): void {
  if (!pixelSceneFinite(base) || !Number.isFinite(radius) || !Number.isFinite(height) || radius <= 0 || height <= 0) return;
  const count = pixelSceneSides(sides);
  const ring: PixelPoint[] = Array.from({ length: count }, (_, i) => {
    const angle = i / count * Math.PI * 2;
    return [base[0] + Math.cos(angle) * radius, base[1] + Math.sin(angle) * radius, base[2]];
  });
  const apex: PixelPoint = [base[0], base[1], base[2] + height];
  out.push({ ...paint, points: [...ring].reverse() });
  for (let i = 0; i < count; i++) out.push({ ...paint, points: [ring[i]!, ring[(i + 1) % count]!, apex] });
}
function pixelRod(out: PixelFace[], from: PixelPoint, to: PixelPoint, radius: number, paint: PixelPaint = {}, sides = 8): void {
  if (!pixelSceneFinite(from) || !pixelSceneFinite(to) || !Number.isFinite(radius) || radius <= 0 || Math.hypot(...pixelSceneSub(to, from)) < 1e-10) return;
  const axis = pixelSceneUnit(pixelSceneSub(to, from));
  const u = pixelSceneUnit(pixelSceneCross(axis, Math.abs(axis[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0]));
  const v = pixelSceneCross(axis, u);
  const count = pixelSceneSides(sides);
  const rings = [from, to].map((center) => Array.from({ length: count }, (_, i): PixelPoint => {
    const angle = i / count * Math.PI * 2;
    return [0, 1, 2].map((j) => center[j]! + radius * (u[j]! * Math.cos(angle) + v[j]! * Math.sin(angle))) as [number, number, number];
  }));
  const low = rings[0]!, high = rings[1]!;
  out.push({ ...paint, points: [...low].reverse() }, { ...paint, points: high });
  for (let i = 0; i < count; i++) out.push({ ...paint, points: [low[i]!, low[(i + 1) % count]!, high[(i + 1) % count]!, high[i]!] });
}

/** Orthographic software rasterizer. Canvas dimensions are already logical pixels. */
function createPixelScene(canvas: HTMLCanvasElement): PixelScene {
  const context = canvas.getContext("2d");
  if (!context) return { draw() {} };
  let width = 0, height = 0, image: ImageData;
  let depth = new Float64Array(0), baseDepth = new Float64Array(0);
  let basePixels = new Uint8ClampedArray(0);
  let cachedFaces: readonly PixelFace[] | undefined, cachedView = "", paletteKey = "";
  let inks: Record<"fg" | "bg" | "accent" | "muted", PixelColor>;
  let yawCos = 1, yawSin = 0, elevCos = 1, elevSin = 0, scale = 1, offsetX = 0, offsetY = 0;
  let center: PixelPoint = [0, 0, 0], ground = 0, epsilon = 1e-5, receiverTolerance = 4e-5, lightInk = true;

  function project(p: PixelPoint): PixelProjected {
    const x = p[0] - center[0], y = p[1] - center[1], z = p[2] - center[2];
    const along = x * yawSin + y * yawCos;
    return [(x * yawCos - y * yawSin) * scale + offsetX, (along * elevSin - z * elevCos) * scale + offsetY, along * elevCos + z * elevSin];
  }
  function put(x: number, y: number, z: number, ink: PixelColor, amount: number, shadow = false, edge = false): void {
    if (x < 0 || y < 0 || x >= width || y >= height || !Number.isFinite(z)) return;
    const index = y * width + x, previous = depth[index]!;
    if (z < previous - 1e-9 || (!edge && z <= previous + 1e-9)) return;
    if (shadow && (!Number.isFinite(previous) || Math.abs(z - previous) > receiverTolerance)) return;
    const data = image.data, i = index * 4;
    if (shadow) {
      const priorAlpha = data[i + 3]! / 255;
      const source = lightInk ? inks.bg : inks.fg;
      const weight = lightInk ? 0.38 : 0.18;
      const sourceAlpha = source[3] / 255;
      const alpha = lightInk ? priorAlpha * (1 - weight) + sourceAlpha * weight : sourceAlpha * weight + priorAlpha * (1 - sourceAlpha * weight);
      for (let channel = 0; channel < 3; channel++) {
        const priorWeight = lightInk ? priorAlpha * (1 - weight) : priorAlpha * (1 - sourceAlpha * weight);
        data[i + channel] = alpha ? (data[i + channel]! * priorWeight + source[channel]! * sourceAlpha * weight) / alpha : 0;
      }
      data[i + 3] = alpha * 255;
      depth[index] = z;
      return;
    }
    const quantized = pixelSceneClamp((Math.floor(amount * 16) + (bayerAt(2, x, y) < amount * 16 % 1 ? 1 : 0)) / 16);
    // Ink coverage belongs to this winning surface. Rear faces never contribute.
    const bg = inks.bg, alpha = ink[3] / 255 * quantized, backgroundAlpha = bg[3] / 255;
    const resultAlpha = alpha + backgroundAlpha * (1 - alpha);
    for (let channel = 0; channel < 3; channel++) {
      data[i + channel] = resultAlpha ? (ink[channel]! * alpha + bg[channel]! * backgroundAlpha * (1 - alpha)) / resultAlpha : 0;
    }
    data[i + 3] = resultAlpha * 255;
    depth[index] = Math.max(z, previous);
  }
  function triangle(a: PixelProjected, b: PixelProjected, c: PixelProjected, ink: PixelColor, amount: number, shadow: boolean): void {
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (!Number.isFinite(area) || Math.abs(area) < 1e-9) return;
    const left = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const right = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const top = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const bottom = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
      const px = x + 0.5, py = y + 0.5;
      const wa = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area;
      const wb = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area;
      const wc = 1 - wa - wb;
      if (wa >= -1e-9 && wb >= -1e-9 && wc >= -1e-9) put(x, y, wa * a[2] + wb * b[2] + wc * c[2], ink, amount, shadow);
    }
  }
  function perimeter(a: PixelProjected, b: PixelProjected, ink: PixelColor, tone: number): void {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    let low = 0, high = 1;
    for (const [p, q] of [[-dx, a[0]], [dx, width - 1 - a[0]], [-dy, a[1]], [dy, height - 1 - a[1]]]) {
      if (p === 0) { if (q! < 0) return; }
      else if (p! < 0) low = Math.max(low, q! / p!);
      else high = Math.min(high, q! / p!);
    }
    if (low > high) return;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * (high - low)));
    for (let i = 0; i <= steps; i++) {
      const t = low + (high - low) * i / steps;
      put(Math.round(a[0] + dx * t), Math.round(a[1] + dy * t), a[2] + (b[2] - a[2]) * t, ink, tone, false, true);
    }
  }
  function faces(input: readonly PixelFace[], shadow = false, floorOnly = false): void {
    for (const face of input) {
      if (face.points.length < 3 || face.points.some((p) => !pixelSceneFinite(p))) continue;
      if (shadow && (!face.shadow || !face.points.some((p) => p[2] > ground + epsilon))) continue;
      const floor = face.points.every((p) => Math.abs(p[2] - ground) < epsilon);
      if (floorOnly && !floor) continue;
      const points = face.points.map((p) => project(shadow ? [p[0] - pixelSceneLight[0] * Math.max(0, p[2] - ground), p[1] - pixelSceneLight[1] * Math.max(0, p[2] - ground), ground + epsilon] : p));
      if (points.some((p) => !pixelSceneFinite(p))) continue;
      let normal: PixelPoint = [0, 0, 0];
      for (let i = 1; i < face.points.length - 1 && Math.hypot(...normal) < 1e-10; i++) normal = pixelSceneCross(pixelSceneSub(face.points[i]!, face.points[0]!), pixelSceneSub(face.points[i + 1]!, face.points[0]!));
      normal = pixelSceneUnit(normal);
      const facing = normal[0] * yawSin * elevCos + normal[1] * yawCos * elevCos + normal[2] * elevSin;
      const light = pixelSceneClamp((normal[0] * pixelSceneLight[0] + normal[1] * pixelSceneLight[1] + normal[2]) * (facing < 0 ? -1 : 1) / Math.hypot(...pixelSceneLight));
      const tone = pixelSceneClamp(Number.isFinite(face.tone ?? 1) ? face.tone ?? 1 : 1);
      const amount = shadow ? 0 : tone * (lightInk ? 0.72 + light * 0.24 : 0.94 - light * 0.2) * (floor ? 0.58 : 1);
      const ink = shadow ? inks.fg : inks[face.ink ?? "fg"];
      for (let i = 1; i < points.length - 1; i++) triangle(points[0]!, points[i]!, points[i + 1]!, ink, amount, shadow);
      if (!shadow && !floorOnly && face.edge) for (let i = 0; i < points.length; i++) perimeter(points[i]!, points[(i + 1) % points.length]!, ink, tone);
    }
  }
  return {
    draw(staticFaces, movingFaces, colors, view) {
      const nextWidth = canvas.width, nextHeight = canvas.height;
      if (nextWidth < 1 || nextHeight < 1) return;
      if (width !== nextWidth || height !== nextHeight) {
        width = nextWidth; height = nextHeight;
        image = context.createImageData(width, height);
        depth = new Float64Array(width * height); baseDepth = new Float64Array(width * height);
        basePixels = new Uint8ClampedArray(width * height * 4);
        cachedFaces = undefined;
      }
      const nextPalette = JSON.stringify([colors.fg, colors.bg, colors.accent, colors.muted]);
      if (paletteKey !== nextPalette) {
        paletteKey = nextPalette;
        inks = { fg: parseColor(colors.fg), bg: parseColor(colors.bg), accent: parseColor(colors.accent), muted: parseColor(colors.muted) };
        const groundLuminance = inks.bg[3] ? inks.bg[0] * 0.2126 + inks.bg[1] * 0.7152 + inks.bg[2] * 0.0722 : 127.5;
        lightInk = inks.fg[0] * 0.2126 + inks.fg[1] * 0.7152 + inks.fg[2] * 0.0722 >= groundLuminance;
        cachedFaces = undefined;
      }
      const viewKey = JSON.stringify([view.bounds, view.ground ?? 0, view.yaw ?? 45, view.elevation ?? 30]);
      if (cachedFaces !== staticFaces || cachedView !== viewKey) {
        cachedView = viewKey;
        const yaw = (view.yaw ?? 45) * Math.PI / 180, elevation = (view.elevation ?? 30) * Math.PI / 180;
        yawCos = Math.cos(yaw); yawSin = Math.sin(yaw); elevCos = Math.cos(elevation); elevSin = Math.sin(elevation);
        center = [0, 1, 2].map((i) => (view.bounds[0][i]! + view.bounds[1][i]!) / 2) as [number, number, number];
        ground = view.ground ?? 0;
        epsilon = Math.max(1e-6, Math.hypot(...pixelSceneSub(view.bounds[1], view.bounds[0])) * 1e-5);
        // A raised parallel plane differs in ray depth by height / sin(elevation).
        receiverTolerance = epsilon * 4 / Math.max(0.001, Math.abs(elevSin));
        scale = 1; offsetX = 0; offsetY = 0;
        const corners: PixelProjected[] = [];
        for (let i = 0; i < 8; i++) corners.push(project([view.bounds[i & 1 ? 1 : 0][0], view.bounds[i & 2 ? 1 : 0][1], view.bounds[i & 4 ? 1 : 0][2]]));
        const left = Math.min(...corners.map((p) => p[0])), right = Math.max(...corners.map((p) => p[0]));
        const top = Math.min(...corners.map((p) => p[1])), bottom = Math.max(...corners.map((p) => p[1]));
        scale = Math.min(width * 0.88 / Math.max(1e-8, right - left), height * 0.88 / Math.max(1e-8, bottom - top));
        offsetX = width / 2 - (left + right) * scale / 2; offsetY = height / 2 - (top + bottom) * scale / 2;
        const data = image.data;
        for (let i = 0; i < data.length; i += 4) { data[i] = inks.bg[0]; data[i + 1] = inks.bg[1]; data[i + 2] = inks.bg[2]; data[i + 3] = inks.bg[3]; }
        depth.fill(-Infinity);
        faces(staticFaces, false, true);
        faces(staticFaces, true);
        faces(staticFaces);
        basePixels.set(data); baseDepth.set(depth);
        cachedFaces = staticFaces;
      }
      image.data.set(basePixels); depth.set(baseDepth);
      faces(movingFaces, true);
      faces(movingFaces);
      context.putImageData(image, 0, 0);
    },
  };
}

// registry/immersive/pixel-hanging-waterfall/core.ts
export interface PixelHangingWaterfallProps extends MotionProps {
  /** Rock and channel arrangement for the connected cascade. */
  layout: "overhang" | "split" | "stairs";
  /** Drop as a fraction of the available vertical scene. */
  dropHeight: number;
  /** Width and speed of the water, preserving a continuous stream. */
  flow: number;
}
export const defaults: PixelHangingWaterfallProps = { layout: "overhang", dropHeight: 0.75, flow: 0.75, paused: false, time: null, seed: 1 };
const fallView: PixelView = { bounds: [[-5,-4,-1],[5,5,10.5]], ground: 0.4 };
type FallSegment = { a: PixelPoint; b: PixelPoint; width: number; length: number; start: number; side: PixelPoint };
type FallPath = { segments: FallSegment[]; length: number };

/** A ribbon is a surface, with a stable transverse direction on every drop. */
function fallBand(out: PixelFace[], a: PixelPoint, b: PixelPoint, side: PixelPoint, width: number, tone: number): void {
  const offset = (p: PixelPoint, sign: number): PixelPoint => [p[0]+side[0]*width*sign/2,p[1]+side[1]*width*sign/2,p[2]+side[2]*width*sign/2];
  out.push({ points:[offset(a,-1),offset(a,1),offset(b,1),offset(b,-1)], ink:"accent", tone });
}

export const mount: Mount<PixelHangingWaterfallProps> = (host, initial = {}) => {
  let props={...defaults,...initial};
  const attrs=hostAttributes(host);
  attrs.set("role",null); attrs.set("aria-label",null); attrs.set("aria-hidden","true");
  const surface=createCanvas(host,{autoSize:false,css:"image-rendering:pixelated",onResize:()=>{resize();loop.redraw();}});
  const renderer=createPixelScene(surface.canvas);
  const palette=watchPalette(host,()=>loop.redraw());
  let staticFaces:PixelFace[]=[];
  let paths:FallPath[]=[];
  let destroyed=false;
  function resize():void {
    const w=surface.cssWidth,h=surface.cssHeight;
    const scale=Math.max(3,Math.ceil(w/360),Math.ceil(h/300));
    surface.canvas.width=Math.max(1,Math.floor(w/scale));
    surface.canvas.height=Math.max(1,Math.floor(h/scale));
    Object.assign(surface.canvas.style,{width:`${surface.canvas.width*scale}px`,height:`${surface.canvas.height*scale}px`,left:`${Math.floor((w-surface.canvas.width*scale)/2)}px`,top:`${Math.floor((h-surface.canvas.height*scale)/2)}px`,right:"auto",bottom:"auto"});
  }
  function rebuild():void {
    staticFaces=[]; paths=[];
    const h=Math.max(0.45,Math.min(0.85,props.dropHeight))*10;
    const fill=0.7+Math.max(0.25,Math.min(1,props.flow))*0.55;
    const rock=(x:number,y:number,z:number,w:number,d:number,height:number,tone:number):void=>pixelBox(staticFaces,[x,y,z],[w,d,height],{tone});
    const pool=(x:number,y:number,rx:number,ry:number,z:number):void=>{
      const ring=Array.from({length:8},(_,i):readonly[number,number]=>[x+Math.cos(i*Math.PI/4)*rx,y+Math.sin(i*Math.PI/4)*ry]);
      pixelPrism(staticFaces,ring,z,0.08,{ink:"accent",tone:0.65});
    };
    const path=(points:readonly PixelPoint[],width:number):void=>{
      let length=0;
      const segments:FallSegment[]=[];
      for(let i=1;i<points.length;i++) {
        const a=points[i-1]!,b=points[i]!;
        const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
        const size=Math.hypot(dx,dy,dz);
        const flat=Math.hypot(dx,dy);
        const side:PixelPoint=Math.abs(dz)>flat?[1,0,0]:[-dy/Math.max(0.001,flat),dx/Math.max(0.001,flat),0];
        segments.push({a,b,width:width*fill,length:size,start:length,side});
        fallBand(staticFaces,a,b,side,width*fill,0.7);
        length+=size;
      }
      paths.push({segments,length});
    };
    pixelPrism(staticFaces,[[-4.8,-2.8],[-3.3,-3.6],[2.8,-3.6],[4.7,-1.6],[4.7,3.3],[2.9,4.4],[-3.3,4.4],[-4.8,2.7]],-0.8,1.2,{tone:0.25});
    // The finite lower basin has raised banks and an explicit open outlet.
    rock(-3.5,1.5,0.4,0.65,2.5,0.35,0.42);
    rock(3,1.8,0.4,0.65,2.2,0.35,0.42);
    pool(0.2,2.3,2.8,1.55,0.42);
    path([[0.2,2.7,0.52],[0.2,4.32,0.52]],1.1);
    if(props.layout==="stairs") {
      // Each shelf ends before the next drop; no water travels through a solid.
      rock(-3,-3,0.4,6,2.2,h-0.4,0.46);
      rock(-3,-0.65,0.4,6,1.55,h*0.66-0.4,0.55);
      rock(-3,1,0.4,6,1.5,h*0.33-0.4,0.64);
      rock(-3.1,-2.8,h*0.55,0.3,1.8,0.22,0.68);
      pool(1.8,-0.35,0.65,0.35,h*0.66+0.02);
      pool(-1.8,1.35,0.65,0.35,h*0.33+0.02);
      path([[-1.8,-2.7,h+0.08],[1.8,-0.72,h+0.08],[1.8,-0.62,h*0.66+0.12],[-1.8,0.94,h*0.66+0.12],[-1.8,1.02,h*0.33+0.12],[1.8,2.55,h*0.33+0.12],[1.8,2.65,0.55],[0.2,3.2,0.55]],1.05);
    } else {
      // Two large strata and a true open recess support the hanging lip.
      rock(-3,-2.7,0.4,1.6,3.35,h*0.52,0.43);
      rock(-2.8,-2.6,h*0.52+0.4,1.4,2.9,h*0.48-0.8,0.56);
      rock(1.4,-2.7,0.4,1.2,3.2,h-0.8,0.46);
      rock(-3,-2.7,h-0.8,5.7,3.7,0.8,0.68);
      // Raised side cheeks frame the source channel, leaving its center visible.
      rock(-2.8,-2.6,h,0.6,2.6,0.4,0.62);
      rock(2,-2.6,h,0.5,2.6,0.5,0.57);
      if(props.layout==="split") {
        rock(-0.4,-0.15,h,0.8,1.2,0.85,0.74);
        path([[0,-2.5,h+0.08],[0,-0.6,h+0.08],[-1.4,0.5,h+0.08],[-1.4,1.1,h+0.08],[-1.4,1.25,0.55],[-0.2,2.5,0.55]],0.9);
        path([[0,-0.6,h+0.09],[1.4,0.5,h+0.09],[1.4,1.1,h+0.09],[1.4,1.25,0.56],[0.2,2.7,0.56]],0.9);
        pool(-1.4,1.6,0.85,0.65,0.43);
        pool(1.4,1.6,0.85,0.65,0.43);
      } else {
        path([[-0.2,-2.5,h+0.08],[-0.2,1.1,h+0.08],[-0.2,1.3,0.55],[0.2,2.7,0.55]],1.65);
        pool(-0.2,1.6,1.25,0.8,0.43);
      }
    }
  }
  function draw(t:number):void {
    const moving:PixelFace[]=[];
    const speed=1.1+Math.max(0.25,Math.min(1,props.flow))*2.4;
    const phase=t/1000*speed+(Math.max(1,Math.min(99,props.seed))-1)*0.23;
    for(const path of paths) {
      const count=Math.max(2,Math.ceil(path.length/2.3));
      for(let i=0;i<count;i++) {
        const distance=((phase+i*path.length/count)%path.length+path.length)%path.length;
        const segment=path.segments.find(s=>distance>=s.start&&distance<s.start+s.length);
        if(!segment) continue;
        const fraction=(distance-segment.start)/segment.length;
        const end=Math.min(1,fraction+0.4/segment.length);
        const at=(u:number):PixelPoint=>[segment.a[0]+(segment.b[0]-segment.a[0])*u,segment.a[1]+(segment.b[1]-segment.a[1])*u+0.015,segment.a[2]+(segment.b[2]-segment.a[2])*u+0.018];
        fallBand(moving,at(fraction),at(end),segment.side,segment.width*0.68,0.97);
      }
    }
    renderer.draw(staticFaces,moving,palette.colors,fallView);
    attrs.set("data-pica-ready","true");
  }
  resize(); rebuild();
  const loop=createLoop({el:host,fps:12,paused:props.paused,time:props.time,still:1200,frame:draw});
  return {
    update(next) {
      const before=props;
      props={...props,...next};
      if(props.layout!==before.layout||props.dropHeight!==before.dropHeight||props.flow!==before.flow) rebuild();
      palette.refresh(); loop.update({paused:props.paused,time:props.time}); loop.redraw();
    },
    destroy() {
      if(destroyed) return;
      destroyed=true;
      loop.destroy(); palette.destroy(); surface.destroy(); attrs.restore();
    },
  };
};

// registry/immersive/pixel-hanging-waterfall/index.tsx
export type PixelHangingWaterfallComponentProps = Partial<PixelHangingWaterfallProps> & WrapperProps;

/** A connected stepped stream falls from a rock ledge into a finite basin. */
export function PixelHangingWaterfall({ className, style, palette, ...props }: PixelHangingWaterfallComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Hanging Waterfall · pixel-hanging-waterfall
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Hanging Waterfall · Pica</title>
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
var PicaPixelHangingWaterfall = (() => {
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

  // registry/immersive/pixel-hanging-waterfall/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

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

  // lib/color.ts
  var colorProbe;
  function parseColor(color) {
    if (colorProbe === void 0) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      colorProbe = canvas.getContext("2d", { willReadFrequently: true });
    }
    if (!colorProbe) return [0, 0, 0, 0];
    colorProbe.clearRect(0, 0, 1, 1);
    colorProbe.fillStyle = "rgba(0, 0, 0, 0)";
    colorProbe.fillStyle = color;
    colorProbe.fillRect(0, 0, 1, 1);
    const d = colorProbe.getImageData(0, 0, 1, 1).data;
    return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0, d[3] ?? 0];
  }

  // lib/dither.ts
  function bayerMatrix(size) {
    let m = [0];
    let n = 1;
    while (n < size) {
      const next = new Array(4 * n * n).fill(0);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const v = 4 * (m[y * n + x] ?? 0);
          next[y * 2 * n + x] = v;
          next[y * 2 * n + x + n] = v + 2;
          next[(y + n) * 2 * n + x] = v + 3;
          next[(y + n) * 2 * n + x + n] = v + 1;
        }
      }
      m = next;
      n *= 2;
    }
    const out = new Float32Array(size * size);
    for (let i = 0; i < out.length; i++) out[i] = ((m[i] ?? 0) + 0.5) / (size * size);
    return out;
  }
  var bayerCache = /* @__PURE__ */ new Map();
  function bayerAt(size, x, y) {
    let m = bayerCache.get(size);
    if (!m) {
      m = bayerMatrix(size);
      bayerCache.set(size, m);
    }
    const mx = (x % size + size) % size;
    const my = (y % size + size) % size;
    return m[my * size + mx] ?? 0.5;
  }
  var KERNELS = {
    "floyd-steinberg": [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
    // Atkinson spreads three quarters of the error, which keeps highlights and shadows cleaner.
    atkinson: [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]]
  };

  // lib/pixel-scene.ts
  var pixelSceneLight = [-0.65, 0.35, 1];
  var pixelSceneClamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  var pixelSceneFinite = (p) => p.every(Number.isFinite);
  var pixelSceneCross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  var pixelSceneSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  var pixelSceneUnit = (p) => {
    const length = Math.hypot(...p) || 1;
    return [p[0] / length, p[1] / length, p[2] / length];
  };
  function pixelBox(out, min, size, paint = {}) {
    if (!pixelSceneFinite(min) || !pixelSceneFinite(size) || size.some((n) => n <= 0)) return;
    const p = [];
    for (const [x, y, z] of [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]) {
      p.push([min[0] + (x ?? 0) * size[0], min[1] + (y ?? 0) * size[1], min[2] + (z ?? 0) * size[2]]);
    }
    for (const ring of [[3, 2, 1, 0], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) {
      out.push({ ...paint, points: ring.map((i) => p[i]) });
    }
  }
  function pixelPrism(out, footprint, bottom, height, paint = {}) {
    if (footprint.length < 3 || !Number.isFinite(bottom) || !Number.isFinite(height) || height <= 0 || footprint.some((p) => !p.every(Number.isFinite))) return;
    const low = footprint.map(([x, y]) => [x, y, bottom]);
    const high = footprint.map(([x, y]) => [x, y, bottom + height]);
    out.push({ ...paint, points: [...low].reverse() }, { ...paint, points: high });
    for (let i = 0; i < low.length; i++) {
      const j = (i + 1) % low.length;
      out.push({ ...paint, points: [low[i], low[j], high[j], high[i]] });
    }
  }
  function createPixelScene(canvas) {
    const context = canvas.getContext("2d");
    if (!context) return { draw() {
    } };
    let width = 0, height = 0, image;
    let depth = new Float64Array(0), baseDepth = new Float64Array(0);
    let basePixels = new Uint8ClampedArray(0);
    let cachedFaces, cachedView = "", paletteKey = "";
    let inks;
    let yawCos = 1, yawSin = 0, elevCos = 1, elevSin = 0, scale = 1, offsetX = 0, offsetY = 0;
    let center = [0, 0, 0], ground = 0, epsilon = 1e-5, receiverTolerance = 4e-5, lightInk = true;
    function project(p) {
      const x = p[0] - center[0], y = p[1] - center[1], z = p[2] - center[2];
      const along = x * yawSin + y * yawCos;
      return [(x * yawCos - y * yawSin) * scale + offsetX, (along * elevSin - z * elevCos) * scale + offsetY, along * elevCos + z * elevSin];
    }
    function put(x, y, z, ink, amount, shadow = false, edge = false) {
      if (x < 0 || y < 0 || x >= width || y >= height || !Number.isFinite(z)) return;
      const index = y * width + x, previous = depth[index];
      if (z < previous - 1e-9 || !edge && z <= previous + 1e-9) return;
      if (shadow && (!Number.isFinite(previous) || Math.abs(z - previous) > receiverTolerance)) return;
      const data = image.data, i = index * 4;
      if (shadow) {
        const priorAlpha = data[i + 3] / 255;
        const source = lightInk ? inks.bg : inks.fg;
        const weight = lightInk ? 0.38 : 0.18;
        const sourceAlpha = source[3] / 255;
        const alpha2 = lightInk ? priorAlpha * (1 - weight) + sourceAlpha * weight : sourceAlpha * weight + priorAlpha * (1 - sourceAlpha * weight);
        for (let channel = 0; channel < 3; channel++) {
          const priorWeight = lightInk ? priorAlpha * (1 - weight) : priorAlpha * (1 - sourceAlpha * weight);
          data[i + channel] = alpha2 ? (data[i + channel] * priorWeight + source[channel] * sourceAlpha * weight) / alpha2 : 0;
        }
        data[i + 3] = alpha2 * 255;
        depth[index] = z;
        return;
      }
      const quantized = pixelSceneClamp((Math.floor(amount * 16) + (bayerAt(2, x, y) < amount * 16 % 1 ? 1 : 0)) / 16);
      const bg = inks.bg, alpha = ink[3] / 255 * quantized, backgroundAlpha = bg[3] / 255;
      const resultAlpha = alpha + backgroundAlpha * (1 - alpha);
      for (let channel = 0; channel < 3; channel++) {
        data[i + channel] = resultAlpha ? (ink[channel] * alpha + bg[channel] * backgroundAlpha * (1 - alpha)) / resultAlpha : 0;
      }
      data[i + 3] = resultAlpha * 255;
      depth[index] = Math.max(z, previous);
    }
    function triangle(a, b, c, ink, amount, shadow) {
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (!Number.isFinite(area) || Math.abs(area) < 1e-9) return;
      const left = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
      const right = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const top = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
      const bottom = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
        const px = x + 0.5, py = y + 0.5;
        const wa = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area;
        const wb = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area;
        const wc = 1 - wa - wb;
        if (wa >= -1e-9 && wb >= -1e-9 && wc >= -1e-9) put(x, y, wa * a[2] + wb * b[2] + wc * c[2], ink, amount, shadow);
      }
    }
    function perimeter(a, b, ink, tone) {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      let low = 0, high = 1;
      for (const [p, q] of [[-dx, a[0]], [dx, width - 1 - a[0]], [-dy, a[1]], [dy, height - 1 - a[1]]]) {
        if (p === 0) {
          if (q < 0) return;
        } else if (p < 0) low = Math.max(low, q / p);
        else high = Math.min(high, q / p);
      }
      if (low > high) return;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * (high - low)));
      for (let i = 0; i <= steps; i++) {
        const t = low + (high - low) * i / steps;
        put(Math.round(a[0] + dx * t), Math.round(a[1] + dy * t), a[2] + (b[2] - a[2]) * t, ink, tone, false, true);
      }
    }
    function faces(input, shadow = false, floorOnly = false) {
      for (const face of input) {
        if (face.points.length < 3 || face.points.some((p) => !pixelSceneFinite(p))) continue;
        if (shadow && (!face.shadow || !face.points.some((p) => p[2] > ground + epsilon))) continue;
        const floor = face.points.every((p) => Math.abs(p[2] - ground) < epsilon);
        if (floorOnly && !floor) continue;
        const points = face.points.map((p) => project(shadow ? [p[0] - pixelSceneLight[0] * Math.max(0, p[2] - ground), p[1] - pixelSceneLight[1] * Math.max(0, p[2] - ground), ground + epsilon] : p));
        if (points.some((p) => !pixelSceneFinite(p))) continue;
        let normal = [0, 0, 0];
        for (let i = 1; i < face.points.length - 1 && Math.hypot(...normal) < 1e-10; i++) normal = pixelSceneCross(pixelSceneSub(face.points[i], face.points[0]), pixelSceneSub(face.points[i + 1], face.points[0]));
        normal = pixelSceneUnit(normal);
        const facing = normal[0] * yawSin * elevCos + normal[1] * yawCos * elevCos + normal[2] * elevSin;
        const light = pixelSceneClamp((normal[0] * pixelSceneLight[0] + normal[1] * pixelSceneLight[1] + normal[2]) * (facing < 0 ? -1 : 1) / Math.hypot(...pixelSceneLight));
        const tone = pixelSceneClamp(Number.isFinite(face.tone ?? 1) ? face.tone ?? 1 : 1);
        const amount = shadow ? 0 : tone * (lightInk ? 0.72 + light * 0.24 : 0.94 - light * 0.2) * (floor ? 0.58 : 1);
        const ink = shadow ? inks.fg : inks[face.ink ?? "fg"];
        for (let i = 1; i < points.length - 1; i++) triangle(points[0], points[i], points[i + 1], ink, amount, shadow);
        if (!shadow && !floorOnly && face.edge) for (let i = 0; i < points.length; i++) perimeter(points[i], points[(i + 1) % points.length], ink, tone);
      }
    }
    return {
      draw(staticFaces, movingFaces, colors, view) {
        const nextWidth = canvas.width, nextHeight = canvas.height;
        if (nextWidth < 1 || nextHeight < 1) return;
        if (width !== nextWidth || height !== nextHeight) {
          width = nextWidth;
          height = nextHeight;
          image = context.createImageData(width, height);
          depth = new Float64Array(width * height);
          baseDepth = new Float64Array(width * height);
          basePixels = new Uint8ClampedArray(width * height * 4);
          cachedFaces = void 0;
        }
        const nextPalette = JSON.stringify([colors.fg, colors.bg, colors.accent, colors.muted]);
        if (paletteKey !== nextPalette) {
          paletteKey = nextPalette;
          inks = { fg: parseColor(colors.fg), bg: parseColor(colors.bg), accent: parseColor(colors.accent), muted: parseColor(colors.muted) };
          const groundLuminance = inks.bg[3] ? inks.bg[0] * 0.2126 + inks.bg[1] * 0.7152 + inks.bg[2] * 0.0722 : 127.5;
          lightInk = inks.fg[0] * 0.2126 + inks.fg[1] * 0.7152 + inks.fg[2] * 0.0722 >= groundLuminance;
          cachedFaces = void 0;
        }
        const viewKey = JSON.stringify([view.bounds, view.ground ?? 0, view.yaw ?? 45, view.elevation ?? 30]);
        if (cachedFaces !== staticFaces || cachedView !== viewKey) {
          cachedView = viewKey;
          const yaw = (view.yaw ?? 45) * Math.PI / 180, elevation = (view.elevation ?? 30) * Math.PI / 180;
          yawCos = Math.cos(yaw);
          yawSin = Math.sin(yaw);
          elevCos = Math.cos(elevation);
          elevSin = Math.sin(elevation);
          center = [0, 1, 2].map((i) => (view.bounds[0][i] + view.bounds[1][i]) / 2);
          ground = view.ground ?? 0;
          epsilon = Math.max(1e-6, Math.hypot(...pixelSceneSub(view.bounds[1], view.bounds[0])) * 1e-5);
          receiverTolerance = epsilon * 4 / Math.max(1e-3, Math.abs(elevSin));
          scale = 1;
          offsetX = 0;
          offsetY = 0;
          const corners = [];
          for (let i = 0; i < 8; i++) corners.push(project([view.bounds[i & 1 ? 1 : 0][0], view.bounds[i & 2 ? 1 : 0][1], view.bounds[i & 4 ? 1 : 0][2]]));
          const left = Math.min(...corners.map((p) => p[0])), right = Math.max(...corners.map((p) => p[0]));
          const top = Math.min(...corners.map((p) => p[1])), bottom = Math.max(...corners.map((p) => p[1]));
          scale = Math.min(width * 0.88 / Math.max(1e-8, right - left), height * 0.88 / Math.max(1e-8, bottom - top));
          offsetX = width / 2 - (left + right) * scale / 2;
          offsetY = height / 2 - (top + bottom) * scale / 2;
          const data = image.data;
          for (let i = 0; i < data.length; i += 4) {
            data[i] = inks.bg[0];
            data[i + 1] = inks.bg[1];
            data[i + 2] = inks.bg[2];
            data[i + 3] = inks.bg[3];
          }
          depth.fill(-Infinity);
          faces(staticFaces, false, true);
          faces(staticFaces, true);
          faces(staticFaces);
          basePixels.set(data);
          baseDepth.set(depth);
          cachedFaces = staticFaces;
        }
        image.data.set(basePixels);
        depth.set(baseDepth);
        faces(movingFaces, true);
        faces(movingFaces);
        context.putImageData(image, 0, 0);
      }
    };
  }

  // registry/immersive/pixel-hanging-waterfall/core.ts
  var defaults = { layout: "overhang", dropHeight: 0.75, flow: 0.75, paused: false, time: null, seed: 1 };
  var fallView = { bounds: [[-5, -4, -1], [5, 5, 10.5]], ground: 0.4 };
  function fallBand(out, a, b, side, width, tone) {
    const offset = (p, sign) => [p[0] + side[0] * width * sign / 2, p[1] + side[1] * width * sign / 2, p[2] + side[2] * width * sign / 2];
    out.push({ points: [offset(a, -1), offset(a, 1), offset(b, 1), offset(b, -1)], ink: "accent", tone });
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const attrs = hostAttributes(host);
    attrs.set("role", null);
    attrs.set("aria-label", null);
    attrs.set("aria-hidden", "true");
    const surface = createCanvas(host, { autoSize: false, css: "image-rendering:pixelated", onResize: () => {
      resize();
      loop.redraw();
    } });
    const renderer = createPixelScene(surface.canvas);
    const palette = watchPalette(host, () => loop.redraw());
    let staticFaces = [];
    let paths = [];
    let destroyed = false;
    function resize() {
      const w = surface.cssWidth, h = surface.cssHeight;
      const scale = Math.max(3, Math.ceil(w / 360), Math.ceil(h / 300));
      surface.canvas.width = Math.max(1, Math.floor(w / scale));
      surface.canvas.height = Math.max(1, Math.floor(h / scale));
      Object.assign(surface.canvas.style, { width: `${surface.canvas.width * scale}px`, height: `${surface.canvas.height * scale}px`, left: `${Math.floor((w - surface.canvas.width * scale) / 2)}px`, top: `${Math.floor((h - surface.canvas.height * scale) / 2)}px`, right: "auto", bottom: "auto" });
    }
    function rebuild() {
      staticFaces = [];
      paths = [];
      const h = Math.max(0.45, Math.min(0.85, props.dropHeight)) * 10;
      const fill = 0.7 + Math.max(0.25, Math.min(1, props.flow)) * 0.55;
      const rock = (x, y, z, w, d, height, tone) => pixelBox(staticFaces, [x, y, z], [w, d, height], { tone });
      const pool = (x, y, rx, ry, z) => {
        const ring = Array.from({ length: 8 }, (_, i) => [x + Math.cos(i * Math.PI / 4) * rx, y + Math.sin(i * Math.PI / 4) * ry]);
        pixelPrism(staticFaces, ring, z, 0.08, { ink: "accent", tone: 0.65 });
      };
      const path = (points, width) => {
        let length = 0;
        const segments = [];
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1], b = points[i];
          const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
          const size = Math.hypot(dx, dy, dz);
          const flat = Math.hypot(dx, dy);
          const side = Math.abs(dz) > flat ? [1, 0, 0] : [-dy / Math.max(1e-3, flat), dx / Math.max(1e-3, flat), 0];
          segments.push({ a, b, width: width * fill, length: size, start: length, side });
          fallBand(staticFaces, a, b, side, width * fill, 0.7);
          length += size;
        }
        paths.push({ segments, length });
      };
      pixelPrism(staticFaces, [[-4.8, -2.8], [-3.3, -3.6], [2.8, -3.6], [4.7, -1.6], [4.7, 3.3], [2.9, 4.4], [-3.3, 4.4], [-4.8, 2.7]], -0.8, 1.2, { tone: 0.25 });
      rock(-3.5, 1.5, 0.4, 0.65, 2.5, 0.35, 0.42);
      rock(3, 1.8, 0.4, 0.65, 2.2, 0.35, 0.42);
      pool(0.2, 2.3, 2.8, 1.55, 0.42);
      path([[0.2, 2.7, 0.52], [0.2, 4.32, 0.52]], 1.1);
      if (props.layout === "stairs") {
        rock(-3, -3, 0.4, 6, 2.2, h - 0.4, 0.46);
        rock(-3, -0.65, 0.4, 6, 1.55, h * 0.66 - 0.4, 0.55);
        rock(-3, 1, 0.4, 6, 1.5, h * 0.33 - 0.4, 0.64);
        rock(-3.1, -2.8, h * 0.55, 0.3, 1.8, 0.22, 0.68);
        pool(1.8, -0.35, 0.65, 0.35, h * 0.66 + 0.02);
        pool(-1.8, 1.35, 0.65, 0.35, h * 0.33 + 0.02);
        path([[-1.8, -2.7, h + 0.08], [1.8, -0.72, h + 0.08], [1.8, -0.62, h * 0.66 + 0.12], [-1.8, 0.94, h * 0.66 + 0.12], [-1.8, 1.02, h * 0.33 + 0.12], [1.8, 2.55, h * 0.33 + 0.12], [1.8, 2.65, 0.55], [0.2, 3.2, 0.55]], 1.05);
      } else {
        rock(-3, -2.7, 0.4, 1.6, 3.35, h * 0.52, 0.43);
        rock(-2.8, -2.6, h * 0.52 + 0.4, 1.4, 2.9, h * 0.48 - 0.8, 0.56);
        rock(1.4, -2.7, 0.4, 1.2, 3.2, h - 0.8, 0.46);
        rock(-3, -2.7, h - 0.8, 5.7, 3.7, 0.8, 0.68);
        rock(-2.8, -2.6, h, 0.6, 2.6, 0.4, 0.62);
        rock(2, -2.6, h, 0.5, 2.6, 0.5, 0.57);
        if (props.layout === "split") {
          rock(-0.4, -0.15, h, 0.8, 1.2, 0.85, 0.74);
          path([[0, -2.5, h + 0.08], [0, -0.6, h + 0.08], [-1.4, 0.5, h + 0.08], [-1.4, 1.1, h + 0.08], [-1.4, 1.25, 0.55], [-0.2, 2.5, 0.55]], 0.9);
          path([[0, -0.6, h + 0.09], [1.4, 0.5, h + 0.09], [1.4, 1.1, h + 0.09], [1.4, 1.25, 0.56], [0.2, 2.7, 0.56]], 0.9);
          pool(-1.4, 1.6, 0.85, 0.65, 0.43);
          pool(1.4, 1.6, 0.85, 0.65, 0.43);
        } else {
          path([[-0.2, -2.5, h + 0.08], [-0.2, 1.1, h + 0.08], [-0.2, 1.3, 0.55], [0.2, 2.7, 0.55]], 1.65);
          pool(-0.2, 1.6, 1.25, 0.8, 0.43);
        }
      }
    }
    function draw(t) {
      const moving = [];
      const speed = 1.1 + Math.max(0.25, Math.min(1, props.flow)) * 2.4;
      const phase = t / 1e3 * speed + (Math.max(1, Math.min(99, props.seed)) - 1) * 0.23;
      for (const path of paths) {
        const count = Math.max(2, Math.ceil(path.length / 2.3));
        for (let i = 0; i < count; i++) {
          const distance = ((phase + i * path.length / count) % path.length + path.length) % path.length;
          const segment = path.segments.find((s) => distance >= s.start && distance < s.start + s.length);
          if (!segment) continue;
          const fraction = (distance - segment.start) / segment.length;
          const end = Math.min(1, fraction + 0.4 / segment.length);
          const at = (u) => [segment.a[0] + (segment.b[0] - segment.a[0]) * u, segment.a[1] + (segment.b[1] - segment.a[1]) * u + 0.015, segment.a[2] + (segment.b[2] - segment.a[2]) * u + 0.018];
          fallBand(moving, at(fraction), at(end), segment.side, segment.width * 0.68, 0.97);
        }
      }
      renderer.draw(staticFaces, moving, palette.colors, fallView);
      attrs.set("data-pica-ready", "true");
    }
    resize();
    rebuild();
    const loop = createLoop({ el: host, fps: 12, paused: props.paused, time: props.time, still: 1200, frame: draw });
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.layout !== before.layout || props.dropHeight !== before.dropHeight || props.flow !== before.flow) rebuild();
        palette.refresh();
        loop.update({ paused: props.paused, time: props.time });
        loop.redraw();
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        loop.destroy();
        palette.destroy();
        surface.destroy();
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
  var instance = PicaPixelHangingWaterfall.mount(host, take(initial));
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
