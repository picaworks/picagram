# Edge Trace Image

> A photograph reduced to its outlines: crisp one-pixel Sobel edges kept by Canny's two-threshold rule.

Category: effects. Tags: image, static, canvas, edges. Static. Size: 4.0 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/edge-trace-image.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | string | `""` | Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. |
| `alt` | string | `""` | Text alternative. Empty marks the image decorative and hides it from assistive technology. |
| `fit` | "cover" \| "contain" | `"cover"` | "cover" fills the host and crops; "contain" fits the whole image. |
| `contrast` | number | `1.1` | Contrast around mid grey before the gradient runs. 1 leaves the image as it is. |
| `low` | number | `0.08` | Lower threshold, 0 to 1. A thinned pixel under it is dropped unless it touches one that clears the upper threshold. |
| `high` | number | `0.2` | Upper threshold, 0 to 1. A thinned pixel that clears it is kept on its own. |
| `smooth` | number | `1` | Mean smoothing radius in pixels, run before the gradient so single-pixel noise stays out of it. |
| `weight` | number | `1` | Traced line thickness in pixels, drawn as coverage rather than a wider mask. |
| `invert` | boolean | `false` | Inks the ground and leaves the traced lines bare, instead of the other way around. |

## Colors

Draws with `--pica-fg`. Set it on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Edge Trace Image · edge-trace-image
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
  accent: "#e8a020",
  muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)",
};

/** The CSS value of a token, with its fallback, for use in a style: var(--pica-accent, #e8a020). */
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

// lib/filter.ts
/** Two measurements over a field of values from 0 to 1, row-major: where its edges run, and what its
 *  neighbourhood averages. Both answer a question a component then draws something else from. Neither is a
 *  picture: a local mean is read, never shown, because STYLE.md rules blur out. */

/** The largest gradient magnitude the Sobel kernels can return for values in 0 to 1, at a diagonal step. */
const SOBEL_PEAK = Math.SQRT2 * 4;

/** Gradient magnitude at every pixel, through the two 3 by 3 Sobel kernels, divided by the largest magnitude
 *  those kernels can return. Values land in 0 to 1 on a scale that holds from frame to frame, so a threshold
 *  on an edge means the same thing in every frame. Samples outside the field repeat its edge pixel. */
function sobelEdges(values: ArrayLike<number>, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  const at = (x: number, y: number): number =>
    values[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))] ?? 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tl = at(x - 1, y - 1);
      const tr = at(x + 1, y - 1);
      const bl = at(x - 1, y + 1);
      const br = at(x + 1, y + 1);
      const gx = tr + 2 * at(x + 1, y) + br - tl - 2 * at(x - 1, y) - bl;
      const gy = bl + 2 * at(x, y + 1) + br - tl - 2 * at(x, y - 1) - tr;
      out[y * width + x] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / SOBEL_PEAK);
    }
  }
  return out;
}

/** The mean of the square of side 2 * radius + 1 around every pixel, in the same time per pixel whatever the
 *  radius, through a summed area table (Crow 1984). A square near an edge is clipped to the field and
 *  divided by the pixels it actually covers. It feeds adaptive thresholds and shading decisions, where the
 *  question is how a pixel compares with its neighbourhood. */
function boxMean(values: ArrayLike<number>, width: number, height: number, radius: number): Float32Array {
  const r = Math.max(0, Math.floor(radius));
  const stride = width + 1;
  // Doubles, so a wide field's running total keeps every value the float array would round away.
  const sums = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += values[y * width + x] ?? 0;
      sums[(y + 1) * stride + x + 1] = (sums[y * stride + x + 1] ?? 0) + row;
    }
  }
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(height, y + r + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(width, x + r + 1);
      const total = (sums[y1 * stride + x1] ?? 0) - (sums[y0 * stride + x1] ?? 0) - (sums[y1 * stride + x0] ?? 0) + (sums[y0 * stride + x0] ?? 0);
      out[y * width + x] = total / ((y1 - y0) * (x1 - x0));
    }
  }
  return out;
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

// lib/sample.ts
/** Turns any drawable (image, video frame, canvas) into ink values for a glyph grid. */

interface SampleOptions {
  cols: number;
  rows: number;
  /** Cell width over cell height, from the grid. */
  aspect: number;
  /** Samples per cell side: 1 for ramp picking, 3 for shape matching. */
  n: number;
  /** Samples per cell vertically, when it differs from `n`: braille cells are 2 wide by 4 tall. */
  ny?: number;
  fit: "cover" | "contain";
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** Contrast around mid grey. 1 leaves the source as it is. */
  contrast: number;
  /** Mirror horizontally, as a webcam preview expects. */
  mirror: boolean;
  /** Where a fitted source sits across the grid: 0 at the left, 0.5 centered, 1 at the right. */
  alignX?: number;
  /** Where a fitted source sits down the grid: 0 at the top, 0.5 centered, 1 at the bottom. */
  alignY?: number;
}

interface Sampler {
  /** Ink wanted at each sample, 0 to 1, row-major, (cols * n) wide by (rows * (ny ?? n)) tall.
   *  THE BUFFER IS REUSED: the next call overwrites it. Copy it with .slice() before sampling again if you
   *  need both results, as a morph between two sources does. */
  sample(source: CanvasImageSource, sourceW: number, sourceH: number, host: HTMLElement, options: SampleOptions): Float32Array;
}

/** Where a source lands when fitted into a box: "cover" fills the box and crops, "contain" shows all of it.
 *  `alignX` and `alignY` place it: 0 at the left or top, 0.5 centered, 1 at the right or bottom. */
function fitRect(
  sourceW: number,
  sourceH: number,
  boxW: number,
  boxH: number,
  fit: "cover" | "contain",
  alignX = 0.5,
  alignY = 0.5,
): { x: number; y: number; w: number; h: number } {
  const scale = fit === "cover" ? Math.max(boxW / sourceW, boxH / sourceH) : Math.min(boxW / sourceW, boxH / sourceH);
  const w = sourceW * scale;
  const h = sourceH * scale;
  return { x: (boxW - w) * alignX, y: (boxH - h) * alignY, w, h };
}

function createSampler(): Sampler {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let ink = new Float32Array(0);

  return {
    sample(source, sourceW, sourceH, host, o) {
      const ny = o.ny ?? o.n;
      const sw = o.cols * o.n;
      const sh = o.rows * ny;
      if (ink.length !== sw * sh) ink = new Float32Array(sw * sh);
      if (!ctx || sourceW <= 0 || sourceH <= 0) return ink.fill(0);
      if (canvas.width !== sw) canvas.width = sw;
      if (canvas.height !== sh) canvas.height = sh;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, sw, sh);
      if (o.mirror) ctx.setTransform(-1, 0, 0, 1, sw, 0);
      // Work in cell units, where a cell is `aspect` wide and 1 tall, then convert to sample pixels.
      const box = fitRect(sourceW, sourceH, o.cols * o.aspect, o.rows, o.fit, o.alignX, o.alignY);
      const toX = o.n / o.aspect;
      ctx.drawImage(source, box.x * toX, box.y * ny, box.w * toX, box.h * ny);
      const data = ctx.getImageData(0, 0, sw, sh).data;
      const lightOnDark = (o.tone === "auto" ? hostTone(host) : o.tone) === "light-on-dark";
      for (let p = 0; p < sw * sh; p++) {
        const i = p * 4;
        const alpha = (data[i + 3] ?? 0) / 255;
        const luma = (0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0)) / 255;
        // Contrast acts on perceived brightness; the result goes to linear light, because glyph coverage
        // mixes with the ground linearly.
        const linear = Math.min(1, Math.max(0, (luma - 0.5) * o.contrast + 0.5)) ** 2.2;
        ink[p] = alpha * (lightOnDark ? linear : 1 - linear);
      }
      return ink;
    },
  };
}

// lib/subject.ts
/** The built-in subject image components draw when given no source: a sphere lit from one side, drawn
 *  locally so nothing is fetched. Animated components move the light by passing its position. */
function litSphere(size = 256, lightX = 0.36, lightY = 0.34): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const light = ctx.createRadialGradient(size * lightX, size * lightY, size * 0.02, size * 0.5, size * 0.5, size * 0.46);
    light.addColorStop(0, "#ffffff");
    light.addColorStop(0.55, "#8a8a8a");
    light.addColorStop(1, "#141414");
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

/** Keywords that can come before the size in a CSS font shorthand: style, variant, weight, and stretch. */
const SHORTHAND_KEYWORDS = new Set([
  "normal", "italic", "oblique", "small-caps", "bold", "bolder", "lighter",
  "ultra-condensed", "extra-condensed", "condensed", "semi-condensed",
  "semi-expanded", "expanded", "extra-expanded", "ultra-expanded",
]);

/** A size token, with an optional line height after a slash. */
const SIZE_TOKEN =
  /^(?:[\d.]+(?:px|pt|pc|em|rem|ex|ch|%|vw|vh|vmin|vmax|cm|mm|in|q)|xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|smaller|larger)(?:\/\S+)?$/i;

/** A CSS font shorthand at `px` pixels. It replaces the size in `font`, or adds one before the family list
 *  when `font` has none, as in '700 "Barlow Condensed", sans-serif'. Keywords match in any case. */
function sizedFont(font: string, px: number): string {
  const tokens = font.trim().split(/\s+/);
  const lead: string[] = [];
  let i = 0;
  for (; i < tokens.length; i++) {
    const token = tokens[i] ?? "";
    if (SIZE_TOKEN.test(token)) {
      i++;
      break;
    }
    if (SHORTHAND_KEYWORDS.has(token.toLowerCase()) || /^\d+(?:\.\d+)?$/.test(token)) {
      lead.push(token);
      continue;
    }
    break;
  }
  return [...lead, `${px}px`, tokens.slice(i).join(" ") || "sans-serif"].join(" ");
}

/** Text drawn into an offscreen canvas for sampling, cropped tight to its ink. lib/sample.ts reads ink from
 *  brightness, so the fill is white when the host shows light glyphs on dark and black otherwise. Pass a
 *  canvas to reuse it. Returns null for empty text. */
function textSubject(
  text: string,
  font: string,
  tone: "light-on-dark" | "dark-on-light",
  px = 240,
  canvas: HTMLCanvasElement = document.createElement("canvas"),
): HTMLCanvasElement | null {
  const ctx = canvas.getContext("2d");
  if (!ctx || !text) return null;
  const spec = sizedFont(font, px);
  ctx.font = spec;
  const measured = ctx.measureText(text);
  // The advance includes side bearings, which are rarely symmetric, so the tight ink box is what makes a
  // canvas that fits the glyphs exactly.
  const left = measured.actualBoundingBoxLeft || 0;
  const right = measured.actualBoundingBoxRight || measured.width;
  const ascent = measured.actualBoundingBoxAscent || px * 0.75;
  const descent = measured.actualBoundingBoxDescent || px * 0.25;
  canvas.width = Math.max(1, Math.ceil(left + right));
  canvas.height = Math.max(1, Math.ceil(ascent + descent));
  // Resizing a canvas resets its context, so the font is set again.
  ctx.font = spec;
  ctx.fillStyle = tone === "light-on-dark" ? "#fff" : "#000";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, left, ascent);
  return canvas;
}

// lib/source.ts
/** The image a component draws: a URL or data URI, or the built-in sphere when there is none, so every image
 *  component renders with no network. Also the host's proportions, and the one failure note every image
 *  component shows. */

interface Source {
  readonly image: CanvasImageSource;
  readonly width: number;
  readonly height: number;
  /** True for the built-in sphere, which is always fitted whole, never cropped. */
  readonly builtIn: boolean;
}

/** Loads `src` and calls `ready` with it, or `fail` when it cannot load. An empty `src` calls `ready` at once
 *  with the built-in sphere. Returns a function that cancels: after it, neither is called. */
function loadSource(src: string, ready: (source: Source) => void, fail: () => void): () => void {
  if (!src) {
    const sphere = litSphere();
    ready({ image: sphere, width: sphere.width, height: sphere.height, builtIn: true });
    return () => undefined;
  }
  let live = true;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.onload = () => {
    if (live) ready({ image: img, width: img.naturalWidth, height: img.naturalHeight, builtIn: false });
  };
  img.onerror = () => {
    if (live) fail();
  };
  img.src = src;
  return () => {
    live = false;
  };
}

/** The fit to draw a source with. The built-in sphere is always fitted whole; an image follows the prop. */
function fitFor(source: Source, fit: "cover" | "contain"): "cover" | "contain" {
  return source.builtIn ? "contain" : fit;
}

/** Gives a host that has no height of its own the source's proportions. Returns a function that undoes it. */
function fitHostAspect(host: HTMLElement, width: number, height: number): () => void {
  if (host.clientHeight >= 2 || width <= 0 || height <= 0) return () => undefined;
  return styleHost(host, { "aspect-ratio": `${width} / ${height}` });
}

/** A short note centered in the host, in the host's own font and the muted color, such as "image
 *  unavailable". It is hidden from assistive technology, because the host's label already names the image.
 *  Returns a function that removes it. */
function showNote(host: HTMLElement, text: string): () => void {
  const note = document.createElement("span");
  note.setAttribute("data-pica", "");
  note.setAttribute("aria-hidden", "true");
  note.textContent = text;
  note.style.cssText = [
    "position:absolute",
    "inset:0",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "pointer-events:none",
    `color:${cssVar("muted")}`,
  ].join(";");
  const restore = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
  host.appendChild(note);
  return () => {
    note.remove();
    restore();
  };
}

// registry/effects/edge-trace-image/core.ts
export interface EdgeTraceImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** Contrast around mid grey before the gradient runs. 1 leaves the image as it is. */
  contrast: number;
  /** Lower threshold, 0 to 1. A thinned pixel under it is dropped unless it touches one that clears the upper threshold. */
  low: number;
  /** Upper threshold, 0 to 1. A thinned pixel that clears it is kept on its own. */
  high: number;
  /** Mean smoothing radius in pixels, run before the gradient so single-pixel noise stays out of it. */
  smooth: number;
  /** Traced line thickness in pixels, drawn as coverage rather than a wider mask. */
  weight: number;
  /** Inks the ground and leaves the traced lines bare, instead of the other way around. */
  invert: boolean;
}

export const defaults: EdgeTraceImageProps = {
  src: "",
  alt: "",
  fit: "cover",
  contrast: 1.1,
  low: 0.08,
  high: 0.2,
  smooth: 1,
  weight: 1,
  invert: false,
};

/** Longest side, in pixels, the working copy is prepared at. Held under this so the one-time pass stays
 *  fast and a frame only ever has to scale the result, never fit or crop it again. */
const WORK_MAX = 480;

/** The image as one field from 0 to 1: a pixel's own contrast-adjusted brightness where the source covers
 *  it, and a neutral middle where it does not. A silhouette then meets its surroundings at a real step no
 *  matter how light or dark the surroundings would otherwise read, which is what keeps the built-in
 *  sphere's rim traced whole instead of fading into a ground that happens to be nearly as dark as it is. */
function contrastField(raw: Uint8ClampedArray, width: number, height: number, contrast: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let p = 0; p < out.length; p++) {
    const o = p * 4;
    const a = (raw[o + 3] ?? 0) / 255;
    const luma = (0.2126 * (raw[o] ?? 0) + 0.7152 * (raw[o + 1] ?? 0) + 0.0722 * (raw[o + 2] ?? 0)) / 255;
    const linear = Math.min(1, Math.max(0, (luma - 0.5) * contrast + 0.5)) ** 2.2;
    out[p] = a * linear + (1 - a) * 0.5;
  }
  return out;
}

/** The neighbour offset non-maximum suppression compares a pixel against, for one of the four directions a
 *  gradient quantizes to: 0 horizontal, 1 the falling diagonal, 2 vertical, 3 the rising diagonal. */
function directionOffset(bin: number): readonly [number, number] {
  if (bin === 1) return [1, 1];
  if (bin === 2) return [0, 1];
  if (bin === 3) return [1, -1];
  return [1, 0];
}

/** Gradient direction at every pixel, quantized to the four lines directionOffset names, from the same
 *  Sobel kernels sobelEdges runs. lib/filter.ts keeps only their size, so thinning works this out itself. */
function edgeDirections(values: Float32Array, width: number, height: number): Uint8Array {
  const bins = new Uint8Array(width * height);
  const at = (x: number, y: number): number =>
    values[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))] ?? 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tl = at(x - 1, y - 1);
      const tr = at(x + 1, y - 1);
      const bl = at(x - 1, y + 1);
      const br = at(x + 1, y + 1);
      const gx = tr + 2 * at(x + 1, y) + br - tl - 2 * at(x - 1, y) - bl;
      const gy = bl + 2 * at(x, y + 1) + br - tl - 2 * at(x, y - 1) - tr;
      let angle = Math.atan2(gy, gx);
      if (angle < 0) angle += Math.PI;
      bins[y * width + x] = Math.round(angle / (Math.PI / 4)) % 4;
    }
  }
  return bins;
}

/** Keeps a pixel only where its gradient is at least as large as its two neighbours along its own
 *  direction, so a blurred band collapses to the ridge at its centre and a line lands one pixel wide.
 *  Canny's first rule. */
function thinRidges(mag: Float32Array, dirs: Uint8Array, width: number, height: number): Uint8Array {
  const thin = new Uint8Array(width * height);
  const at = (x: number, y: number): number =>
    mag[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))] ?? 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const [dx, dy] = directionOffset(dirs[i] ?? 0);
      const m = mag[i] ?? 0;
      thin[i] = m >= at(x - dx, y - dy) && m >= at(x + dx, y + dy) ? 1 : 0;
    }
  }
  return thin;
}

/** Keeps a thinned pixel when it clears `high`, or clears `low` and is eight-connected to a pixel already
 *  kept, so a faint but connected line survives while an isolated speck does not. Canny's second rule. */
function keepEdges(mag: Float32Array, thin: Uint8Array, width: number, height: number, low: number, high: number): Uint8Array {
  const kept = new Uint8Array(width * height);
  const stack: number[] = [];
  for (let i = 0; i < thin.length; i++) {
    if (thin[i] && (mag[i] ?? 0) >= high) {
      kept[i] = 1;
      stack.push(i);
    }
  }
  while (stack.length > 0) {
    const i = stack.pop();
    if (i === undefined) break;
    const x = i % width;
    const y = Math.floor(i / width);
    for (let oy = -1; oy <= 1; oy++) {
      const ny = y + oy;
      if (ny < 0 || ny >= height) continue;
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        const nx = x + ox;
        if (nx < 0 || nx >= width) continue;
        const j = ny * width + nx;
        if (!kept[j] && thin[j] && (mag[j] ?? 0) >= low) {
          kept[j] = 1;
          stack.push(j);
        }
      }
    }
  }
  return kept;
}

/** Coverage from 0 to 1 for a line `weight` pixels wide centred on every kept pixel. The default of one
 *  draws a hard single pixel; a smaller or larger weight fades or spreads it through fractional coverage
 *  rather than a ragged mask. */
function strokeCoverage(kept: Uint8Array, width: number, height: number, weight: number): Float32Array {
  const half = weight / 2;
  const axis = (d: number): number => Math.min(1, Math.max(0, half - Math.abs(d) + 0.5));
  const coverage = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let oy = -1; oy <= 1; oy++) {
        const ny = y + oy;
        if (ny < 0 || ny >= height) continue;
        const cy = axis(oy);
        if (cy <= 0) continue;
        for (let ox = -1; ox <= 1; ox++) {
          const nx = x + ox;
          if (nx < 0 || nx >= width || !kept[ny * width + nx]) continue;
          const cx = axis(ox);
          if (cx > 0) v = Math.max(v, cx * cy);
        }
      }
      coverage[y * width + x] = v;
    }
  }
  return coverage;
}

export const mount: Mount<EdgeTraceImageProps> = (host, initial = {}) => {
  let props: EdgeTraceImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let plateW = 0;
  let plateH = 0;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;

  const work = document.createElement("canvas");
  const workCtx = work.getContext("2d", { willReadFrequently: true });
  const plate = createPlate();
  const surface = createCanvas(host, { onResize: () => resized() });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const palette = watchPalette(host, () => prepare());

  function load(): void {
    cancel();
    failed = false;
    cancel = loadSource(props.src, use, () => {
      source = null;
      failed = true;
      prepare();
    });
  }

  function use(next: Source): void {
    source = next;
    // A host with no height of its own takes the image's proportions.
    undoAspect();
    undoAspect = fitHostAspect(host, next.width, next.height);
    prepare();
  }

  function setNote(on: boolean): void {
    if (on && !removeNote) removeNote = showNote(host, "image unavailable");
    if (!on && removeNote) {
      removeNote();
      removeNote = null;
    }
  }

  /** The plate size for the host's box: its own proportions, held under WORK_MAX on the longer side, so the
   *  plate maps onto the host one to one and a frame never has to fit or offset it. Also held under the
   *  source's own longer side, so a small source is never blown up before its gradient runs: a traced line
   *  stays one pixel wide either way, but stretching first would spread that one pixel over several and
   *  thin the same line down to a much smaller share of a now much bigger frame. */
  function plateSize(): [number, number] {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    const cap = source ? Math.min(WORK_MAX, Math.max(source.width, source.height)) : WORK_MAX;
    const scale = Math.min(1, cap / Math.max(w, h));
    return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
  }

  /** Works the traced picture out and fills the plate. Runs when the image arrives, when the host's box
   *  changes size, and when any prop that changes what a pixel is changes, and at no other time. */
  function prepare(): void {
    const [w, h] = plateSize();
    plateW = w;
    plateH = h;
    if (workCtx && source && !failed) {
      work.width = w;
      work.height = h;
      // Resizing a canvas resets its context, and smoothing would soften a source pixel's own edge into a
      // several-pixel ramp exactly where fitting scales a small source up, weakening the gradient below
      // where a real step in the source ever reads.
      workCtx.imageSmoothingEnabled = false;
      workCtx.clearRect(0, 0, w, h);
      const box = fitRect(source.width, source.height, w, h, fitFor(source, props.fit));
      workCtx.drawImage(source.image, box.x, box.y, box.w, box.h);
      const field = contrastField(workCtx.getImageData(0, 0, w, h).data, w, h, props.contrast);
      const smoothed = boxMean(field, w, h, props.smooth);
      const mag = sobelEdges(smoothed, w, h);
      const dirs = edgeDirections(smoothed, w, h);
      const thin = thinRidges(mag, dirs, w, h);
      const lo = Math.min(props.low, props.high);
      const hi = Math.max(props.low, props.high);
      const kept = keepEdges(mag, thin, w, h, lo, hi);
      const coverage = strokeCoverage(kept, w, h, props.weight);
      if (props.invert) for (let i = 0; i < coverage.length; i++) coverage[i] = 1 - (coverage[i] ?? 0);
      const fg = parseColor(palette.colors.fg);
      plate.put(inkPixels(coverage, w, h, fg));
    }
    paint();
  }

  function resized(): void {
    const [w, h] = plateSize();
    if (w !== plateW || h !== plateH) prepare();
    else paint();
  }

  function paint(): void {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    setNote(failed);
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (source && !failed) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(plate.canvas, 0, 0, w, h);
      }
    }
    if (source || failed) host.dataset.picaReady = "true";
  }

  labelHost(host, props.alt);
  load();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const recolored = palette.refresh();
      labelHost(host, props.alt);
      if (props.src !== before.src) {
        load();
      } else if (
        recolored ||
        props.fit !== before.fit ||
        props.contrast !== before.contrast ||
        props.smooth !== before.smooth ||
        props.low !== before.low ||
        props.high !== before.high ||
        props.weight !== before.weight ||
        props.invert !== before.invert
      ) {
        prepare();
      } else {
        paint();
      }
    },
    destroy() {
      cancel();
      setNote(false);
      surface.destroy();
      undoAspect();
      palette.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/effects/edge-trace-image/index.tsx
export type EdgeTraceImageComponentProps = Partial<EdgeTraceImageProps> & WrapperProps;

/** A photograph reduced to its outlines, traced from the Sobel gradient and kept by Canny's thresholds. */
export function EdgeTraceImage({ className, style, palette, ...props }: EdgeTraceImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Edge Trace Image · edge-trace-image
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Edge Trace Image · Pica</title>
<style>:root { --pica-accent: #e8a020; }
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
var PicaEdgeTraceImage = (() => {
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

  // registry/effects/edge-trace-image/core.ts
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
    accent: "#e8a020",
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

  // lib/filter.ts
  var SOBEL_PEAK = Math.SQRT2 * 4;
  function sobelEdges(values, width, height) {
    const out = new Float32Array(width * height);
    const at = (x, y) => values[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))] ?? 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tl = at(x - 1, y - 1);
        const tr = at(x + 1, y - 1);
        const bl = at(x - 1, y + 1);
        const br = at(x + 1, y + 1);
        const gx = tr + 2 * at(x + 1, y) + br - tl - 2 * at(x - 1, y) - bl;
        const gy = bl + 2 * at(x, y + 1) + br - tl - 2 * at(x, y - 1) - tr;
        out[y * width + x] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / SOBEL_PEAK);
      }
    }
    return out;
  }
  function boxMean(values, width, height, radius) {
    const r = Math.max(0, Math.floor(radius));
    const stride = width + 1;
    const sums = new Float64Array(stride * (height + 1));
    for (let y = 0; y < height; y++) {
      let row = 0;
      for (let x = 0; x < width; x++) {
        row += values[y * width + x] ?? 0;
        sums[(y + 1) * stride + x + 1] = (sums[y * stride + x + 1] ?? 0) + row;
      }
    }
    const out = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      const y0 = Math.max(0, y - r);
      const y1 = Math.min(height, y + r + 1);
      for (let x = 0; x < width; x++) {
        const x0 = Math.max(0, x - r);
        const x1 = Math.min(width, x + r + 1);
        const total = (sums[y1 * stride + x1] ?? 0) - (sums[y0 * stride + x1] ?? 0) - (sums[y1 * stride + x0] ?? 0) + (sums[y0 * stride + x0] ?? 0);
        out[y * width + x] = total / ((y1 - y0) * (x1 - x0));
      }
    }
    return out;
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

  // lib/sample.ts
  function fitRect(sourceW, sourceH, boxW, boxH, fit, alignX = 0.5, alignY = 0.5) {
    const scale = fit === "cover" ? Math.max(boxW / sourceW, boxH / sourceH) : Math.min(boxW / sourceW, boxH / sourceH);
    const w = sourceW * scale;
    const h = sourceH * scale;
    return { x: (boxW - w) * alignX, y: (boxH - h) * alignY, w, h };
  }

  // lib/subject.ts
  function litSphere(size = 256, lightX = 0.36, lightY = 0.34) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const light = ctx.createRadialGradient(size * lightX, size * lightY, size * 0.02, size * 0.5, size * 0.5, size * 0.46);
      light.addColorStop(0, "#ffffff");
      light.addColorStop(0.55, "#8a8a8a");
      light.addColorStop(1, "#141414");
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
      ctx.fill();
    }
    return canvas;
  }

  // lib/source.ts
  function loadSource(src, ready, fail) {
    if (!src) {
      const sphere = litSphere();
      ready({ image: sphere, width: sphere.width, height: sphere.height, builtIn: true });
      return () => void 0;
    }
    let live = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      if (live) ready({ image: img, width: img.naturalWidth, height: img.naturalHeight, builtIn: false });
    };
    img.onerror = () => {
      if (live) fail();
    };
    img.src = src;
    return () => {
      live = false;
    };
  }
  function fitFor(source, fit) {
    return source.builtIn ? "contain" : fit;
  }
  function fitHostAspect(host, width, height) {
    if (host.clientHeight >= 2 || width <= 0 || height <= 0) return () => void 0;
    return styleHost(host, { "aspect-ratio": `${width} / ${height}` });
  }
  function showNote(host, text) {
    const note = document.createElement("span");
    note.setAttribute("data-pica", "");
    note.setAttribute("aria-hidden", "true");
    note.textContent = text;
    note.style.cssText = [
      "position:absolute",
      "inset:0",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "pointer-events:none",
      `color:${cssVar("muted")}`
    ].join(";");
    const restore = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
    host.appendChild(note);
    return () => {
      note.remove();
      restore();
    };
  }

  // registry/effects/edge-trace-image/core.ts
  var defaults = {
    src: "",
    alt: "",
    fit: "cover",
    contrast: 1.1,
    low: 0.08,
    high: 0.2,
    smooth: 1,
    weight: 1,
    invert: false
  };
  var WORK_MAX = 480;
  function contrastField(raw, width, height, contrast) {
    const out = new Float32Array(width * height);
    for (let p = 0; p < out.length; p++) {
      const o = p * 4;
      const a = (raw[o + 3] ?? 0) / 255;
      const luma = (0.2126 * (raw[o] ?? 0) + 0.7152 * (raw[o + 1] ?? 0) + 0.0722 * (raw[o + 2] ?? 0)) / 255;
      const linear = Math.min(1, Math.max(0, (luma - 0.5) * contrast + 0.5)) ** 2.2;
      out[p] = a * linear + (1 - a) * 0.5;
    }
    return out;
  }
  function directionOffset(bin) {
    if (bin === 1) return [1, 1];
    if (bin === 2) return [0, 1];
    if (bin === 3) return [1, -1];
    return [1, 0];
  }
  function edgeDirections(values, width, height) {
    const bins = new Uint8Array(width * height);
    const at = (x, y) => values[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))] ?? 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tl = at(x - 1, y - 1);
        const tr = at(x + 1, y - 1);
        const bl = at(x - 1, y + 1);
        const br = at(x + 1, y + 1);
        const gx = tr + 2 * at(x + 1, y) + br - tl - 2 * at(x - 1, y) - bl;
        const gy = bl + 2 * at(x, y + 1) + br - tl - 2 * at(x, y - 1) - tr;
        let angle = Math.atan2(gy, gx);
        if (angle < 0) angle += Math.PI;
        bins[y * width + x] = Math.round(angle / (Math.PI / 4)) % 4;
      }
    }
    return bins;
  }
  function thinRidges(mag, dirs, width, height) {
    const thin = new Uint8Array(width * height);
    const at = (x, y) => mag[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))] ?? 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const [dx, dy] = directionOffset(dirs[i] ?? 0);
        const m = mag[i] ?? 0;
        thin[i] = m >= at(x - dx, y - dy) && m >= at(x + dx, y + dy) ? 1 : 0;
      }
    }
    return thin;
  }
  function keepEdges(mag, thin, width, height, low, high) {
    const kept = new Uint8Array(width * height);
    const stack = [];
    for (let i = 0; i < thin.length; i++) {
      if (thin[i] && (mag[i] ?? 0) >= high) {
        kept[i] = 1;
        stack.push(i);
      }
    }
    while (stack.length > 0) {
      const i = stack.pop();
      if (i === void 0) break;
      const x = i % width;
      const y = Math.floor(i / width);
      for (let oy = -1; oy <= 1; oy++) {
        const ny = y + oy;
        if (ny < 0 || ny >= height) continue;
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const nx = x + ox;
          if (nx < 0 || nx >= width) continue;
          const j = ny * width + nx;
          if (!kept[j] && thin[j] && (mag[j] ?? 0) >= low) {
            kept[j] = 1;
            stack.push(j);
          }
        }
      }
    }
    return kept;
  }
  function strokeCoverage(kept, width, height, weight) {
    const half = weight / 2;
    const axis = (d) => Math.min(1, Math.max(0, half - Math.abs(d) + 0.5));
    const coverage = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let v = 0;
        for (let oy = -1; oy <= 1; oy++) {
          const ny = y + oy;
          if (ny < 0 || ny >= height) continue;
          const cy = axis(oy);
          if (cy <= 0) continue;
          for (let ox = -1; ox <= 1; ox++) {
            const nx = x + ox;
            if (nx < 0 || nx >= width || !kept[ny * width + nx]) continue;
            const cx = axis(ox);
            if (cx > 0) v = Math.max(v, cx * cy);
          }
        }
        coverage[y * width + x] = v;
      }
    }
    return coverage;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let source = null;
    let failed = false;
    let plateW = 0;
    let plateH = 0;
    let cancel = () => void 0;
    let undoAspect = () => void 0;
    let removeNote = null;
    const work = document.createElement("canvas");
    const workCtx = work.getContext("2d", { willReadFrequently: true });
    const plate = createPlate();
    const surface = createCanvas(host, { onResize: () => resized() });
    const canvas = surface.canvas;
    const ctx = canvas.getContext("2d");
    const palette = watchPalette(host, () => prepare());
    function load() {
      cancel();
      failed = false;
      cancel = loadSource(props.src, use, () => {
        source = null;
        failed = true;
        prepare();
      });
    }
    function use(next) {
      source = next;
      undoAspect();
      undoAspect = fitHostAspect(host, next.width, next.height);
      prepare();
    }
    function setNote(on) {
      if (on && !removeNote) removeNote = showNote(host, "image unavailable");
      if (!on && removeNote) {
        removeNote();
        removeNote = null;
      }
    }
    function plateSize() {
      const w = Math.max(1, surface.cssWidth);
      const h = Math.max(1, surface.cssHeight);
      const cap = source ? Math.min(WORK_MAX, Math.max(source.width, source.height)) : WORK_MAX;
      const scale = Math.min(1, cap / Math.max(w, h));
      return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
    }
    function prepare() {
      const [w, h] = plateSize();
      plateW = w;
      plateH = h;
      if (workCtx && source && !failed) {
        work.width = w;
        work.height = h;
        workCtx.imageSmoothingEnabled = false;
        workCtx.clearRect(0, 0, w, h);
        const box = fitRect(source.width, source.height, w, h, fitFor(source, props.fit));
        workCtx.drawImage(source.image, box.x, box.y, box.w, box.h);
        const field = contrastField(workCtx.getImageData(0, 0, w, h).data, w, h, props.contrast);
        const smoothed = boxMean(field, w, h, props.smooth);
        const mag = sobelEdges(smoothed, w, h);
        const dirs = edgeDirections(smoothed, w, h);
        const thin = thinRidges(mag, dirs, w, h);
        const lo = Math.min(props.low, props.high);
        const hi = Math.max(props.low, props.high);
        const kept = keepEdges(mag, thin, w, h, lo, hi);
        const coverage = strokeCoverage(kept, w, h, props.weight);
        if (props.invert) for (let i = 0; i < coverage.length; i++) coverage[i] = 1 - (coverage[i] ?? 0);
        const fg = parseColor(palette.colors.fg);
        plate.put(inkPixels(coverage, w, h, fg));
      }
      paint();
    }
    function resized() {
      const [w, h] = plateSize();
      if (w !== plateW || h !== plateH) prepare();
      else paint();
    }
    function paint() {
      const w = Math.max(1, surface.cssWidth);
      const h = Math.max(1, surface.cssHeight);
      setNote(failed);
      if (ctx) {
        ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        if (source && !failed) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(plate.canvas, 0, 0, w, h);
        }
      }
      if (source || failed) host.dataset.picaReady = "true";
    }
    labelHost(host, props.alt);
    load();
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        const recolored = palette.refresh();
        labelHost(host, props.alt);
        if (props.src !== before.src) {
          load();
        } else if (recolored || props.fit !== before.fit || props.contrast !== before.contrast || props.smooth !== before.smooth || props.low !== before.low || props.high !== before.high || props.weight !== before.weight || props.invert !== before.invert) {
          prepare();
        } else {
          paint();
        }
      },
      destroy() {
        cancel();
        setNote(false);
        surface.destroy();
        undoAspect();
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
  var instance = PicaEdgeTraceImage.mount(host, take(window.PICA_PROPS || {}));
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

- Technique from [A Computational Approach to Edge Detection](https://doi.org/10.1109/TPAMI.1986.4767851) by John Canny (Paper).
- Technique from [Sobel operator](https://en.wikipedia.org/wiki/Sobel_operator) by Wikipedia (Algorithm, no code).
