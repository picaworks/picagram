# Dither Contours

> A drifting noise landscape cut into hypsometric bands of flat dither tone with hairline boundaries.

Category: dither. Tags: contours, hypsometric, relief map, terrain. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 4.5 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/dither-contours.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `bands` | number | `6` | Number of elevation bands the height field is cut into. |
| `scale` | number | `1.6` | Noise frequency. Higher values pack the bands closer together. |
| `octaves` | number | `4` | Octaves of noise summed into the height field. More octaves add finer detail. |
| `speed` | number | `0.1` | How fast the height field drifts, in noise units per second. Zero holds it still. |
| `lineWeight` | number | `1` | Boundary line thickness, in CSS pixels. |
| `index` | number | `5` | How often a boundary is drawn as an index contour in the accent color, counted in bands. Zero draws none. |
| `pixel` | number | `2` | CSS pixels each computed pixel covers, for the dither fill. |
| `fps` | number | `15` | Frames per second ceiling for the drift. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Colors

Draws with `--pica-fg`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Dither Contours · dither-contours
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

// lib/dither-mask.ts
/** Threshold masks beyond the Bayer matrix in lib/dither.ts, and the ordered dithers that read them. Blue
 *  noise scatters ink so evenly that no structure shows; a clustered dot screen gathers it into growing dots,
 *  the way a printed halftone does. Every mask here holds the same evenly spaced thresholds, one per cell,
 *  so swapping one for another changes the grain and not the tone. */


/** Width of the filter that finds voids and clusters, in pixels, from Ulichney's paper. */
const VOID_SIGMA = 1.5;

const blueNoiseCache = new Map<number, Float32Array>();

/** A size by size blue noise mask, row-major, each value in (0, 1). Blue noise carries no low frequency
 *  energy, so ink lands evenly at every level with none of the crosshatch a Bayer matrix leaves. Built by
 *  void and cluster (Ulichney 1993): scatter a sparse pattern, then move ink from the tightest cluster to the
 *  largest void until it settles, then rank every pixel by the order it joins or leaves that pattern. Each
 *  size is built once and shared, because 64 takes real time, so read the array and never write into it. */
function blueNoiseMatrix(size: 16 | 32 | 64): Float32Array {
  const kept = blueNoiseCache.get(size);
  if (kept) return kept;
  const n = size * size;
  const pattern = new Uint8Array(n);
  const energy = new Float32Array(n);
  // The filter wraps, and stays narrower than the mask, so every pixel receives the same total energy from a
  // full pattern. That is why the second half of the ranking needs no rule of its own: with the total fixed,
  // the largest void among the zeros is also the tightest cluster of them.
  const radius = Math.min(Math.ceil(VOID_SIGMA * 3), (size >> 1) - 1);
  const span = radius * 2 + 1;
  const kernel = new Float32Array(span * span);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      kernel[(dy + radius) * span + dx + radius] = Math.exp(-(dx * dx + dy * dy) / (2 * VOID_SIGMA * VOID_SIGMA));
    }
  }

  /** Adds the filter, or subtracts it with a sign of -1, around the pixel at `index`. */
  const spread = (index: number, sign: number): void => {
    const cx = index % size;
    const cy = (index - cx) / size;
    for (let dy = -radius; dy <= radius; dy++) {
      const row = ((((cy + dy) % size) + size) % size) * size;
      const krow = (dy + radius) * span;
      for (let dx = -radius; dx <= radius; dx++) {
        const x = (((cx + dx) % size) + size) % size;
        energy[row + x] = (energy[row + x] ?? 0) + sign * (kernel[krow + dx + radius] ?? 0);
      }
    }
  };

  /** The 1 with the most ink around it, or with `most` off the 0 with the least. Ties go to the lower index,
   *  so the mask is the same everywhere. */
  const peak = (want: number, most: boolean): number => {
    let best = 0;
    let bestEnergy = Number.NaN;
    for (let i = 0; i < n; i++) {
      if (pattern[i] !== want) continue;
      const e = energy[i] ?? 0;
      if (Number.isNaN(bestEnergy) || (most ? e > bestEnergy : e < bestEnergy)) {
        best = i;
        bestEnergy = e;
      }
    }
    return best;
  };

  const ones = Math.max(1, Math.round(n / 10));
  const scatter = createRng(size);
  for (let placed = 0; placed < ones; ) {
    const i = Math.floor(scatter() * n);
    if (pattern[i] === 0) {
      pattern[i] = 1;
      spread(i, 1);
      placed++;
    }
  }

  // Even the sparse pattern out: take the tightest cluster's ink and put it in the largest void, until the
  // void the move opens is the one it just left. The bound only guards against a cycle; it settles long before.
  for (let pass = 0; pass < n; pass++) {
    const cluster = peak(1, true);
    pattern[cluster] = 0;
    spread(cluster, -1);
    const hole = peak(0, false);
    if (hole === cluster) {
      pattern[cluster] = 1;
      spread(cluster, 1);
      break;
    }
    pattern[hole] = 1;
    spread(hole, 1);
  }

  // Rank downward by emptying that pattern one tightest cluster at a time, then upward from a copy of it by
  // filling one largest void at a time. Every pixel gets exactly one rank.
  const rank = new Int32Array(n);
  const settled = pattern.slice();
  for (let r = ones - 1; r >= 0; r--) {
    const cluster = peak(1, true);
    pattern[cluster] = 0;
    spread(cluster, -1);
    rank[cluster] = r;
  }
  pattern.set(settled);
  energy.fill(0);
  for (let i = 0; i < n; i++) if (pattern[i] === 1) spread(i, 1);
  for (let r = ones; r < n; r++) {
    const hole = peak(0, false);
    pattern[hole] = 1;
    spread(hole, 1);
    rank[hole] = r;
  }

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = ((rank[i] ?? 0) + 0.5) / n;
  blueNoiseCache.set(size, out);
  return out;
}

const clusterCache = new Map<number, Float32Array>();

/** A size by size clustered dot screen, row-major, each value in (0, 1). Ink grows as round dots on a
 *  lattice turned 45 degrees, with a dot centre at the tile's corner and another at its middle, so a
 *  gradient reads as a printed halftone rather than as scattered pixels. Shared like the mask above. */
function clusterMatrix(size: 4 | 8): Float32Array {
  const kept = clusterCache.get(size);
  if (kept) return kept;
  const n = size * size;
  // Two cosines along the turned axes: their peaks are the dot centres, and the fall from a peak is the
  // order ink fills in around it.
  const turn = (Math.PI * 2) / size;
  const spot = new Float32Array(n);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) spot[y * size + x] = Math.cos(turn * (x + y)) + Math.cos(turn * (y - x));
  }
  const order = Array.from({ length: n }, (_, i) => i);
  // Ties go to the lower index, so the screen is the same everywhere.
  order.sort((a, b) => (spot[b] ?? 0) - (spot[a] ?? 0) || a - b);
  const out = new Float32Array(n);
  order.forEach((index, r) => {
    out[index] = (r + 0.5) / n;
  });
  clusterCache.set(size, out);
  return out;
}

/** The threshold a tiled mask puts at pixel (x, y). Negative coordinates wrap like any other. */
function maskAt(mask: ArrayLike<number>, size: number, x: number, y: number): number {
  const mx = ((x % size) + size) % size;
  const my = ((y % size) + size) % size;
  return mask[my * size + mx] ?? 0.5;
}

/** Ink or no ink for each value in 0..1, row-major, dithered against any tiled mask. Ink goes where a value
 *  reaches `level + threshold - 0.5`, the same cut lib/dither.ts makes, so a mask can replace a Bayer matrix
 *  in place. `shift` moves every threshold along and wraps it, which moves which pixels carry the ink while
 *  the count holds: step it by 0.618 each frame for a grain that crawls under a tone that does not. */
function thresholdMask(
  values: ArrayLike<number>,
  width: number,
  height: number,
  mask: ArrayLike<number>,
  size: number,
  level = 0.5,
  shift = 0,
): Uint8Array {
  const out = new Uint8Array(width * height);
  const turn = ((shift % 1) + 1) % 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const t = maskAt(mask, size, x, y) + turn;
      out[i] = (values[i] ?? 0) >= level + (t >= 1 ? t - 1 : t) - 0.5 ? 1 : 0;
    }
  }
  return out;
}

/** The same ordered dither quantized to `levels` bands rather than to ink or no ink, row-major. Returns the
 *  band each pixel falls in, from 0 to levels - 1, which a caller reads as a ramp index or a shade. */
function ditherLevels(
  values: ArrayLike<number>,
  width: number,
  height: number,
  levels: number,
  mask: ArrayLike<number>,
  size: number,
): Uint8Array {
  const top = Math.max(1, Math.min(255, Math.floor(levels) - 1));
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const scaled = Math.min(1, Math.max(0, values[i] ?? 0)) * top;
      const band = Math.floor(scaled);
      out[i] = Math.min(top, band + (scaled - band >= maskAt(mask, size, x, y) ? 1 : 0));
    }
  }
  return out;
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

// lib/noise.ts
/** Seeded simplex noise in two and three dimensions, returning values in [-1, 1].
 *  Follows Stefan Gustavson's public-domain reference implementation. */
interface Noise {
  noise2(x: number, y: number): number;
  noise3(x: number, y: number, z: number): number;
}

const SIMPLEX_GRAD = [
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1,
  1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
];
const SIMPLEX_F2 = 0.5 * (Math.sqrt(3) - 1);
const SIMPLEX_G2 = (3 - Math.sqrt(3)) / 6;
const SIMPLEX_F3 = 1 / 3;
const SIMPLEX_G3 = 1 / 6;

function createNoise(seed = 1): Noise {
  const random = createRng(seed);
  const p: number[] = [];
  for (let i = 0; i < 256; i++) p.push(i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = p[i]!;
    p[i] = p[j]!;
    p[j] = swap;
  }
  // Doubled so lookups never need a modulo; `grad` stores an offset into SIMPLEX_GRAD.
  const perm: number[] = [];
  const grad: number[] = [];
  for (let i = 0; i < 512; i++) {
    const v = p[i & 255]!;
    perm.push(v);
    grad.push((v % 12) * 3);
  }

  function corner2(g: number, x: number, y: number): number {
    let t = 0.5 - x * x - y * y;
    if (t < 0) return 0;
    t *= t;
    return t * t * (SIMPLEX_GRAD[g]! * x + SIMPLEX_GRAD[g + 1]! * y);
  }

  function corner3(g: number, x: number, y: number, z: number): number {
    let t = 0.6 - x * x - y * y - z * z;
    if (t < 0) return 0;
    t *= t;
    return t * t * (SIMPLEX_GRAD[g]! * x + SIMPLEX_GRAD[g + 1]! * y + SIMPLEX_GRAD[g + 2]! * z);
  }

  function noise2(xin: number, yin: number): number {
    const s = (xin + yin) * SIMPLEX_F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * SIMPLEX_G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = 1 - i1;
    const ii = i & 255;
    const jj = j & 255;
    return 70 * (
      corner2(grad[ii + perm[jj]!]!, x0, y0) +
      corner2(grad[ii + i1 + perm[jj + j1]!]!, x0 - i1 + SIMPLEX_G2, y0 - j1 + SIMPLEX_G2) +
      corner2(grad[ii + 1 + perm[jj + 1]!]!, x0 - 1 + 2 * SIMPLEX_G2, y0 - 1 + 2 * SIMPLEX_G2)
    );
  }

  function noise3(xin: number, yin: number, zin: number): number {
    const s = (xin + yin + zin) * SIMPLEX_F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * SIMPLEX_G3;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const z0 = zin - (k - t);
    let i1 = 0, j1 = 0, k1 = 0, i2 = 0, j2 = 0, k2 = 0;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; i2 = 1; j2 = 1; }
      else if (x0 >= z0) { i1 = 1; i2 = 1; k2 = 1; }
      else { k1 = 1; i2 = 1; k2 = 1; }
    } else if (y0 < z0) { k1 = 1; j2 = 1; k2 = 1; }
    else if (x0 < z0) { j1 = 1; j2 = 1; k2 = 1; }
    else { j1 = 1; i2 = 1; j2 = 1; }
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const g = SIMPLEX_G3;
    return 32 * (
      corner3(grad[ii + perm[jj + perm[kk]!]!]!, x0, y0, z0) +
      corner3(grad[ii + i1 + perm[jj + j1 + perm[kk + k1]!]!]!, x0 - i1 + g, y0 - j1 + g, z0 - k1 + g) +
      corner3(grad[ii + i2 + perm[jj + j2 + perm[kk + k2]!]!]!, x0 - i2 + 2 * g, y0 - j2 + 2 * g, z0 - k2 + 2 * g) +
      corner3(grad[ii + 1 + perm[jj + 1 + perm[kk + 1]!]!]!, x0 - 1 + 3 * g, y0 - 1 + 3 * g, z0 - 1 + 3 * g)
    );
  }

  return { noise2, noise3 };
}

// lib/pixels.ts
/** Turning coverage into palette ink a canvas can show, and holding a finished picture still. Between them
 *  they keep an animated effect's frame down to one drawImage, with no pixel read back. */

/** Writes coverage from 0 to 1, row-major, as one color's alpha, leaving its red, green, and blue alone.
 *  `color` is [r, g, b, a] with each part from 0 to 255, as parseColor in lib/color.ts returns it, and its
 *  own alpha sets the ceiling. Pass `out` to write into an image the caller keeps across frames; without one
 *  a new image of `width` by `height` is made. */
function inkPixels(
  values: ArrayLike<number>,
  width: number,
  height: number,
  color: readonly [number, number, number, number],
  out?: ImageData,
): ImageData {
  const image = out ?? new ImageData(width, height);
  const [r, g, b, a] = color;
  const data = image.data;
  for (let i = 0; i < width * height; i++) {
    const j = i * 4;
    const v = values[i] ?? 0;
    data[j] = r;
    data[j + 1] = g;
    data[j + 2] = b;
    data[j + 3] = v <= 0 ? 0 : v >= 1 ? a : Math.round(a * v);
  }
  return image;
}

interface Plate {
  /** The canvas the picture sits on. Draw from it with drawImage; never read its pixels back. */
  readonly canvas: HTMLCanvasElement;
  /** Replaces the picture, sizing the canvas to the image. */
  put(image: ImageData): void;
}

/** A canvas outside the document that keeps a picture a component worked out once. An effect that only
 *  moves that picture around draws from its plate every frame, so no frame pays for the pixels again, which
 *  is what holds a frame inside the time the verifier allows. */
function createPlate(): Plate {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  return {
    canvas,
    put(image) {
      // Assigning either size clears the canvas, and putImageData replaces every pixel it covers, so the
      // plate never holds part of an older picture.
      if (canvas.width !== image.width) canvas.width = image.width;
      if (canvas.height !== image.height) canvas.height = image.height;
      ctx?.putImageData(image, 0, 0);
    },
  };
}

// registry/dither/dither-contours/core.ts
export interface DitherContoursProps extends MotionProps {
  /** Number of elevation bands the height field is cut into. */
  bands: number;
  /** Noise frequency. Higher values pack the bands closer together. */
  scale: number;
  /** Octaves of noise summed into the height field. More octaves add finer detail. */
  octaves: number;
  /** How fast the height field drifts, in noise units per second. Zero holds it still. */
  speed: number;
  /** Boundary line thickness, in CSS pixels. */
  lineWeight: number;
  /** How often a boundary is drawn as an index contour in the accent color, counted in bands. Zero draws none. */
  index: number;
  /** CSS pixels each computed pixel covers, for the dither fill. */
  pixel: number;
  /** Frames per second ceiling for the drift. */
  fps: number;
}

export const defaults: DitherContoursProps = {
  bands: 6,
  scale: 1.6,
  octaves: 4,
  speed: 0.1,
  lineWeight: 1,
  index: 5,
  pixel: 2,
  fps: 15,
  paused: false,
  time: null,
  seed: 1,
};

/** The screen the flat tone within a band is read against. Blue noise carries no low frequency energy, so a
 *  flat band reads as an even, calm grain rather than the wallpaper a small repeating lattice would leave. */
const MASK_SIZE = 16;
const MASK = blueNoiseMatrix(MASK_SIZE);
/** How much quieter each further octave is. Low, so fine octaves stay a texture and never speckle the terraces. */
const PERSISTENCE = 0.32;
/** How much finer each further octave is. */
const LACUNARITY = 2;
/** Extra damping under `scale`, so a hill spans hundreds of cells instead of a handful. */
const FIELD_SCALE = 0.0022;
/** Gain on the summed noise before it is centered. Fractal noise rarely reaches its own extremes, so a flat
 *  map would spend most of the field in the middle bands; this spreads it toward both ends, so the lowest
 *  and the highest band both reliably appear. */
const GAIN = 1.6;
/** Noise-space units the field drifts per second, at speed 1. Slow, so a band takes at least half a minute to cross the host. */
const DRIFT_RATE = 0.04;
/** The animation time shown under reduced motion, and the frame reviewers see first. */
const STILL_TIME = 1200;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Fractal Brownian motion: several octaves of the same noise, normalized to [-1, 1]. */
function fbm(noise: ReturnType<typeof createNoise>, x: number, y: number, octaves: number): number {
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amplitude * noise.noise2(x * frequency, y * frequency);
    total += amplitude;
    amplitude *= PERSISTENCE;
    frequency *= LACUNARITY;
  }
  return sum / total;
}

export const mount: Mount<DitherContoursProps> = (host, initial = {}) => {
  let props: DitherContoursProps = { ...defaults, ...initial };
  let noise = createNoise(props.seed);
  let cols = 1;
  let rows = 1;
  let bandGrid = new Uint8Array(1);
  let coverage = new Uint8Array(1);
  let imageData = new ImageData(1, 1);
  let inkR = 0;
  let inkG = 0;
  let inkB = 0;
  let inkA = 255;
  const plate = createPlate();

  function layout(): boolean {
    const w = Math.max(1, Math.round(surface.cssWidth / props.pixel));
    const h = Math.max(1, Math.round(surface.cssHeight / props.pixel));
    if (w === cols && h === rows) return false;
    cols = w;
    rows = h;
    bandGrid = new Uint8Array(cols * rows);
    coverage = new Uint8Array(cols * rows);
    imageData = new ImageData(cols, rows);
    return true;
  }

  const surface = createCanvas(host, {
    css: "image-rendering:pixelated",
    onResize: () => {
      layout();
      loop.redraw();
    },
  });
  const ctx = surface.canvas.getContext("2d");

  function syncInk(): void {
    const [r, g, b, a] = parseColor(palette.colors.fg);
    inkR = r;
    inkG = g;
    inkB = b;
    inkA = a;
  }

  const palette = watchPalette(host, () => {
    syncInk();
    loop.redraw();
  });
  syncInk();

  function draw(t: number): void {
    if (!ctx) {
      host.dataset.picaReady = "true";
      return;
    }
    const octaves = Math.max(1, Math.round(props.octaves));
    const bands = Math.max(1, Math.round(props.bands));
    const freq = props.scale * FIELD_SCALE;
    const driftX = (t / 1000) * props.speed * DRIFT_RATE;
    const driftY = driftX * 0.6;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const raw = fbm(noise, x * freq + driftX, y * freq + driftY, octaves);
        const height = clamp01((raw * GAIN + 1) / 2);
        const band = Math.min(bands - 1, Math.floor(height * bands));
        bandGrid[i] = band;
        coverage[i] = maskAt(MASK, MASK_SIZE, x, y) < (band + 1) / bands ? 1 : 0;
      }
    }
    plate.put(inkPixels(coverage, cols, rows, [inkR, inkG, inkB, inkA], imageData));

    const dpr = surface.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, surface.cssWidth, surface.cssHeight);
    ctx.drawImage(plate.canvas, 0, 0, surface.cssWidth, surface.cssHeight);

    const pixel = props.pixel;
    const fgPath = new Path2D();
    const accentPath = new Path2D();
    let hasAccent = false;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const here = bandGrid[y * cols + x] ?? 0;
        const right = x + 1 < cols ? (bandGrid[y * cols + x + 1] ?? 0) : here;
        if (right !== here) {
          const level = Math.max(here, right);
          const accent = props.index > 0 && level % props.index === 0;
          const px = (x + 1) * pixel;
          const path = accent ? accentPath : fgPath;
          path.moveTo(px, y * pixel);
          path.lineTo(px, (y + 1) * pixel);
          if (accent) hasAccent = true;
        }
        const down = y + 1 < rows ? (bandGrid[(y + 1) * cols + x] ?? 0) : here;
        if (down !== here) {
          const level = Math.max(here, down);
          const accent = props.index > 0 && level % props.index === 0;
          const py = (y + 1) * pixel;
          const path = accent ? accentPath : fgPath;
          path.moveTo(x * pixel, py);
          path.lineTo((x + 1) * pixel, py);
          if (accent) hasAccent = true;
        }
      }
    }
    ctx.lineWidth = props.lineWeight;
    ctx.strokeStyle = palette.colors.fg;
    ctx.stroke(fgPath);
    if (hasAccent) {
      ctx.strokeStyle = palette.colors.accent;
      ctx.stroke(accentPath);
    }
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  layout();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.seed !== before.seed) noise = createNoise(props.seed);
      palette.refresh();
      syncInk();
      layout();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
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

// registry/dither/dither-contours/index.tsx
export type DitherContoursComponentProps = Partial<DitherContoursProps> & WrapperProps;

/** A drifting noise field cut into hypsometric bands of flat dither tone, like a printed relief map. */
export function DitherContours({ className, style, palette, ...props }: DitherContoursComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Dither Contours · dither-contours
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Dither Contours · Pica</title>
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
var PicaDitherContours = (() => {
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

  // registry/dither/dither-contours/core.ts
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

  // lib/dither-mask.ts
  var VOID_SIGMA = 1.5;
  var blueNoiseCache = /* @__PURE__ */ new Map();
  function blueNoiseMatrix(size) {
    const kept = blueNoiseCache.get(size);
    if (kept) return kept;
    const n = size * size;
    const pattern = new Uint8Array(n);
    const energy = new Float32Array(n);
    const radius = Math.min(Math.ceil(VOID_SIGMA * 3), (size >> 1) - 1);
    const span = radius * 2 + 1;
    const kernel = new Float32Array(span * span);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        kernel[(dy + radius) * span + dx + radius] = Math.exp(-(dx * dx + dy * dy) / (2 * VOID_SIGMA * VOID_SIGMA));
      }
    }
    const spread = (index, sign) => {
      const cx = index % size;
      const cy = (index - cx) / size;
      for (let dy = -radius; dy <= radius; dy++) {
        const row = ((cy + dy) % size + size) % size * size;
        const krow = (dy + radius) * span;
        for (let dx = -radius; dx <= radius; dx++) {
          const x = ((cx + dx) % size + size) % size;
          energy[row + x] = (energy[row + x] ?? 0) + sign * (kernel[krow + dx + radius] ?? 0);
        }
      }
    };
    const peak = (want, most) => {
      let best = 0;
      let bestEnergy = Number.NaN;
      for (let i = 0; i < n; i++) {
        if (pattern[i] !== want) continue;
        const e = energy[i] ?? 0;
        if (Number.isNaN(bestEnergy) || (most ? e > bestEnergy : e < bestEnergy)) {
          best = i;
          bestEnergy = e;
        }
      }
      return best;
    };
    const ones = Math.max(1, Math.round(n / 10));
    const scatter = createRng(size);
    for (let placed = 0; placed < ones; ) {
      const i = Math.floor(scatter() * n);
      if (pattern[i] === 0) {
        pattern[i] = 1;
        spread(i, 1);
        placed++;
      }
    }
    for (let pass = 0; pass < n; pass++) {
      const cluster = peak(1, true);
      pattern[cluster] = 0;
      spread(cluster, -1);
      const hole = peak(0, false);
      if (hole === cluster) {
        pattern[cluster] = 1;
        spread(cluster, 1);
        break;
      }
      pattern[hole] = 1;
      spread(hole, 1);
    }
    const rank = new Int32Array(n);
    const settled = pattern.slice();
    for (let r = ones - 1; r >= 0; r--) {
      const cluster = peak(1, true);
      pattern[cluster] = 0;
      spread(cluster, -1);
      rank[cluster] = r;
    }
    pattern.set(settled);
    energy.fill(0);
    for (let i = 0; i < n; i++) if (pattern[i] === 1) spread(i, 1);
    for (let r = ones; r < n; r++) {
      const hole = peak(0, false);
      pattern[hole] = 1;
      spread(hole, 1);
      rank[hole] = r;
    }
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = ((rank[i] ?? 0) + 0.5) / n;
    blueNoiseCache.set(size, out);
    return out;
  }
  function maskAt(mask, size, x, y) {
    const mx = (x % size + size) % size;
    const my = (y % size + size) % size;
    return mask[my * size + mx] ?? 0.5;
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

  // lib/noise.ts
  var SIMPLEX_GRAD = [
    1,
    1,
    0,
    -1,
    1,
    0,
    1,
    -1,
    0,
    -1,
    -1,
    0,
    1,
    0,
    1,
    -1,
    0,
    1,
    1,
    0,
    -1,
    -1,
    0,
    -1,
    0,
    1,
    1,
    0,
    -1,
    1,
    0,
    1,
    -1,
    0,
    -1,
    -1
  ];
  var SIMPLEX_F2 = 0.5 * (Math.sqrt(3) - 1);
  var SIMPLEX_G2 = (3 - Math.sqrt(3)) / 6;
  var SIMPLEX_F3 = 1 / 3;
  var SIMPLEX_G3 = 1 / 6;
  function createNoise(seed = 1) {
    const random = createRng(seed);
    const p = [];
    for (let i = 0; i < 256; i++) p.push(i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const swap = p[i];
      p[i] = p[j];
      p[j] = swap;
    }
    const perm = [];
    const grad = [];
    for (let i = 0; i < 512; i++) {
      const v = p[i & 255];
      perm.push(v);
      grad.push(v % 12 * 3);
    }
    function corner2(g, x, y) {
      let t = 0.5 - x * x - y * y;
      if (t < 0) return 0;
      t *= t;
      return t * t * (SIMPLEX_GRAD[g] * x + SIMPLEX_GRAD[g + 1] * y);
    }
    function corner3(g, x, y, z) {
      let t = 0.6 - x * x - y * y - z * z;
      if (t < 0) return 0;
      t *= t;
      return t * t * (SIMPLEX_GRAD[g] * x + SIMPLEX_GRAD[g + 1] * y + SIMPLEX_GRAD[g + 2] * z);
    }
    function noise2(xin, yin) {
      const s = (xin + yin) * SIMPLEX_F2;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const t = (i + j) * SIMPLEX_G2;
      const x0 = xin - (i - t);
      const y0 = yin - (j - t);
      const i1 = x0 > y0 ? 1 : 0;
      const j1 = 1 - i1;
      const ii = i & 255;
      const jj = j & 255;
      return 70 * (corner2(grad[ii + perm[jj]], x0, y0) + corner2(grad[ii + i1 + perm[jj + j1]], x0 - i1 + SIMPLEX_G2, y0 - j1 + SIMPLEX_G2) + corner2(grad[ii + 1 + perm[jj + 1]], x0 - 1 + 2 * SIMPLEX_G2, y0 - 1 + 2 * SIMPLEX_G2));
    }
    function noise3(xin, yin, zin) {
      const s = (xin + yin + zin) * SIMPLEX_F3;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const k = Math.floor(zin + s);
      const t = (i + j + k) * SIMPLEX_G3;
      const x0 = xin - (i - t);
      const y0 = yin - (j - t);
      const z0 = zin - (k - t);
      let i1 = 0, j1 = 0, k1 = 0, i2 = 0, j2 = 0, k2 = 0;
      if (x0 >= y0) {
        if (y0 >= z0) {
          i1 = 1;
          i2 = 1;
          j2 = 1;
        } else if (x0 >= z0) {
          i1 = 1;
          i2 = 1;
          k2 = 1;
        } else {
          k1 = 1;
          i2 = 1;
          k2 = 1;
        }
      } else if (y0 < z0) {
        k1 = 1;
        j2 = 1;
        k2 = 1;
      } else if (x0 < z0) {
        j1 = 1;
        j2 = 1;
        k2 = 1;
      } else {
        j1 = 1;
        i2 = 1;
        j2 = 1;
      }
      const ii = i & 255;
      const jj = j & 255;
      const kk = k & 255;
      const g = SIMPLEX_G3;
      return 32 * (corner3(grad[ii + perm[jj + perm[kk]]], x0, y0, z0) + corner3(grad[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x0 - i1 + g, y0 - j1 + g, z0 - k1 + g) + corner3(grad[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x0 - i2 + 2 * g, y0 - j2 + 2 * g, z0 - k2 + 2 * g) + corner3(grad[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x0 - 1 + 3 * g, y0 - 1 + 3 * g, z0 - 1 + 3 * g));
    }
    return { noise2, noise3 };
  }

  // lib/pixels.ts
  function inkPixels(values, width, height, color, out) {
    const image = out ?? new ImageData(width, height);
    const [r, g, b, a] = color;
    const data = image.data;
    for (let i = 0; i < width * height; i++) {
      const j = i * 4;
      const v = values[i] ?? 0;
      data[j] = r;
      data[j + 1] = g;
      data[j + 2] = b;
      data[j + 3] = v <= 0 ? 0 : v >= 1 ? a : Math.round(a * v);
    }
    return image;
  }
  function createPlate() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    return {
      canvas,
      put(image) {
        if (canvas.width !== image.width) canvas.width = image.width;
        if (canvas.height !== image.height) canvas.height = image.height;
        ctx?.putImageData(image, 0, 0);
      }
    };
  }

  // registry/dither/dither-contours/core.ts
  var defaults = {
    bands: 6,
    scale: 1.6,
    octaves: 4,
    speed: 0.1,
    lineWeight: 1,
    index: 5,
    pixel: 2,
    fps: 15,
    paused: false,
    time: null,
    seed: 1
  };
  var MASK_SIZE = 16;
  var MASK = blueNoiseMatrix(MASK_SIZE);
  var PERSISTENCE = 0.32;
  var LACUNARITY = 2;
  var FIELD_SCALE = 22e-4;
  var GAIN = 1.6;
  var DRIFT_RATE = 0.04;
  var STILL_TIME = 1200;
  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  function fbm(noise, x, y, octaves) {
    let sum = 0;
    let amplitude = 1;
    let frequency = 1;
    let total = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amplitude * noise.noise2(x * frequency, y * frequency);
      total += amplitude;
      amplitude *= PERSISTENCE;
      frequency *= LACUNARITY;
    }
    return sum / total;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let noise = createNoise(props.seed);
    let cols = 1;
    let rows = 1;
    let bandGrid = new Uint8Array(1);
    let coverage = new Uint8Array(1);
    let imageData = new ImageData(1, 1);
    let inkR = 0;
    let inkG = 0;
    let inkB = 0;
    let inkA = 255;
    const plate = createPlate();
    function layout() {
      const w = Math.max(1, Math.round(surface.cssWidth / props.pixel));
      const h = Math.max(1, Math.round(surface.cssHeight / props.pixel));
      if (w === cols && h === rows) return false;
      cols = w;
      rows = h;
      bandGrid = new Uint8Array(cols * rows);
      coverage = new Uint8Array(cols * rows);
      imageData = new ImageData(cols, rows);
      return true;
    }
    const surface = createCanvas(host, {
      css: "image-rendering:pixelated",
      onResize: () => {
        layout();
        loop.redraw();
      }
    });
    const ctx = surface.canvas.getContext("2d");
    function syncInk() {
      const [r, g, b, a] = parseColor(palette.colors.fg);
      inkR = r;
      inkG = g;
      inkB = b;
      inkA = a;
    }
    const palette = watchPalette(host, () => {
      syncInk();
      loop.redraw();
    });
    syncInk();
    function draw(t) {
      if (!ctx) {
        host.dataset.picaReady = "true";
        return;
      }
      const octaves = Math.max(1, Math.round(props.octaves));
      const bands = Math.max(1, Math.round(props.bands));
      const freq = props.scale * FIELD_SCALE;
      const driftX = t / 1e3 * props.speed * DRIFT_RATE;
      const driftY = driftX * 0.6;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const raw = fbm(noise, x * freq + driftX, y * freq + driftY, octaves);
          const height = clamp01((raw * GAIN + 1) / 2);
          const band = Math.min(bands - 1, Math.floor(height * bands));
          bandGrid[i] = band;
          coverage[i] = maskAt(MASK, MASK_SIZE, x, y) < (band + 1) / bands ? 1 : 0;
        }
      }
      plate.put(inkPixels(coverage, cols, rows, [inkR, inkG, inkB, inkA], imageData));
      const dpr = surface.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, surface.cssWidth, surface.cssHeight);
      ctx.drawImage(plate.canvas, 0, 0, surface.cssWidth, surface.cssHeight);
      const pixel = props.pixel;
      const fgPath = new Path2D();
      const accentPath = new Path2D();
      let hasAccent = false;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const here = bandGrid[y * cols + x] ?? 0;
          const right = x + 1 < cols ? bandGrid[y * cols + x + 1] ?? 0 : here;
          if (right !== here) {
            const level = Math.max(here, right);
            const accent = props.index > 0 && level % props.index === 0;
            const px = (x + 1) * pixel;
            const path = accent ? accentPath : fgPath;
            path.moveTo(px, y * pixel);
            path.lineTo(px, (y + 1) * pixel);
            if (accent) hasAccent = true;
          }
          const down = y + 1 < rows ? bandGrid[(y + 1) * cols + x] ?? 0 : here;
          if (down !== here) {
            const level = Math.max(here, down);
            const accent = props.index > 0 && level % props.index === 0;
            const py = (y + 1) * pixel;
            const path = accent ? accentPath : fgPath;
            path.moveTo(x * pixel, py);
            path.lineTo((x + 1) * pixel, py);
            if (accent) hasAccent = true;
          }
        }
      }
      ctx.lineWidth = props.lineWeight;
      ctx.strokeStyle = palette.colors.fg;
      ctx.stroke(fgPath);
      if (hasAccent) {
        ctx.strokeStyle = palette.colors.accent;
        ctx.stroke(accentPath);
      }
      host.dataset.picaReady = "true";
    }
    labelHost(host, "");
    layout();
    const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.seed !== before.seed) noise = createNoise(props.seed);
        palette.refresh();
        syncInk();
        layout();
        loop.update({ paused: props.paused, time: props.time, fps: props.fps });
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
  var instance = PicaDitherContours.mount(host, take(window.PICA_PROPS || {}));
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

- Technique from [Cartographic Relief Presentation](https://doi.org/10.1515/9783110844016) by Eduard Imhof (Book).
- Technique from [Hypsometric tints](https://en.wikipedia.org/wiki/Hypsometric_tints) by Wikipedia (Reference, no code).
