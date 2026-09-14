# Maximalist Hero

> A maximalist page hero that packs two beating fields, an index and a boxed figure, and edge bands around a headline and copy.

Category: sections. Tags: hero, landing, section, cta, maximalist, marquee, dither, background. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 9.1 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/maximalist-hero.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `headline` | string | `"More is more."` | The largest type in the frame, drawn as dark text on foreground chips. |
| `subhead` | string | `"Two fields deep, four tones wide, and every edge of the frame working."` | The middle size, a line or two of copy under the headline. |
| `kicker` | string | `"Components drawn in text"` | The smallest size, a mono label row above the headline. Empty hides the row. |
| `ticker` | string | `"ASCII / Dither / Shader / Grid / Type"` | The text the top and bottom bands scroll. Empty hides both bands. |
| `figure` | string | `"70+"` | The boxed figure on the right, the frame's second large type block. Empty hides it. |
| `caption` | string | `"Components · one palette · four tones"` | The mono line under the figure. Empty hides it. |
| `index` | readonly string[] | `["ASCII","Dither","Shaders","Motion","Sections"]` | Rows of the index list beside the headline, numbered automatically. Empty hides the list. |
| `indexTitle` | string | `"Index"` | The header the index box carries. |
| `actions` | readonly MaximalistAction[] | `[{"label":"Browse components","href":"#components"},{"label":"Read the docs","href":"#docs"}]` | Calls to action, drawn as links. At most three show; the first draws solid in the accent, the rest outline. |
| `align` | "start" \| "center" | `"start"` | Horizontal alignment of the content column within the host. |
| `intensity` | number | `0.55` | How strongly the two background fields show, from 0 to 1. |
| `minHeight` | number | `84` | The host's minimum height, in percent of the viewport height. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with `--pica-fg`, `--pica-muted`, `--pica-accent`, `--pica-bg`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Maximalist Hero · maximalist-hero
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

// registry/dither/dither-waves/core.ts
const ditherWaves = (() => {
interface DitherWavesProps extends MotionProps {
  /** Number of overlapping wave trains, from two to four. */
  trains: number;
  /** Wavelength of each wave train, in computed pixels. */
  period: number;
  /** Degrees of angle from one wave train to the next. */
  spread: number;
  /** Angle of the first wave train, in degrees. */
  angle: number;
  /** Ink levels the interference is screened into, from two to four. */
  levels: number;
  /** Ordered mask that screens the interference: an even blue noise scatter, or a clustered dot screen. */
  mask: "blue" | "cluster";
  /** CSS pixels each computed pixel covers. */
  pixel: number;
  /** How fast the wave trains drift. 0 holds them still. */
  speed: number;
  /** Frames per second ceiling. */
  fps: number;
}

const defaults: DitherWavesProps = {
  trains: 3,
  period: 34,
  spread: 27,
  angle: 0,
  levels: 2,
  mask: "cluster",
  pixel: 2,
  speed: 0.12,
  fps: 15,
  paused: false,
  time: null,
  seed: 1,
};

/** Animation time shown under reduced motion, and what captures use, in milliseconds. */
const STILL_TIME = 1200;
/** Most wave trains a lattice carries. */
const MAX_TRAINS = 4;
/** Cells on a side of the blue noise mask: fine enough to scatter evenly, cheap enough to build once. */
const BLUE_SIZE = 32;
/** Cells on a side of the clustered dot screen. */
const CLUSTER_SIZE = 8;
/** Radians a train's phase turns per second, at speed 1. */
const BASE_RATE = 0.4;
/** Per-train multiple of BASE_RATE. No pair shares a simple ratio, so the trains drift in and out of step with
 *  one another and the whole lattice never returns to a frame it already showed. */
const TRAIN_RATE: readonly number[] = [0.37, 0.53, 0.29, 0.61];

/** The mask and its tile size for one setting of the `mask` prop. Both matrices are built once and cached by
 *  lib/dither-mask.ts, so asking again each frame costs nothing. */
function maskFor(kind: DitherWavesProps["mask"]): { mask: Float32Array; size: number } {
  return kind === "blue" ? { mask: blueNoiseMatrix(BLUE_SIZE), size: BLUE_SIZE } : { mask: clusterMatrix(CLUSTER_SIZE), size: CLUSTER_SIZE };
}

/** Each train's starting phase, from the seed, so the same seed always begins the same way. */
function seedPhases(seed: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length: MAX_TRAINS }, () => rng() * Math.PI * 2);
}

const mount: Mount<DitherWavesProps> = (host, initial = {}) => {
  let props: DitherWavesProps = { ...defaults, ...initial };
  let cols = 1;
  let rows = 1;
  let imageData: ImageData | null = null;
  // Column and row tables, one train's worth at a time, flattened as train * length + index. Rebuilt in
  // layout() whenever the grid resizes, then refilled every frame in draw().
  let colCos = new Float32Array(0);
  let colSin = new Float32Array(0);
  let rowCos = new Float32Array(0);
  let rowSin = new Float32Array(0);
  let field = new Float32Array(0);
  let inkR = 0;
  let inkG = 0;
  let inkB = 0;
  let inkA = 255;
  let cachedSeed = props.seed;
  let phase0 = seedPhases(props.seed);

  const surface = createCanvas(host, {
    autoSize: false,
    css: "image-rendering:pixelated",
    onResize: () => {
      if (layout()) loop.redraw();
    },
  });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");

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

  /** Recomputes the low-resolution grid from the host and `pixel`, and its buffers with it. Returns true
   *  when the size actually changed. */
  function layout(): boolean {
    const pixelSize = Math.max(1, props.pixel);
    const w = Math.max(1, Math.round(surface.cssWidth / pixelSize));
    const h = Math.max(1, Math.round(surface.cssHeight / pixelSize));
    if (w === cols && h === rows && imageData) return false;
    cols = w;
    rows = h;
    canvas.width = cols;
    canvas.height = rows;
    imageData = ctx ? ctx.createImageData(cols, rows) : null;
    colCos = new Float32Array(MAX_TRAINS * cols);
    colSin = new Float32Array(MAX_TRAINS * cols);
    rowCos = new Float32Array(MAX_TRAINS * rows);
    rowSin = new Float32Array(MAX_TRAINS * rows);
    field = new Float32Array(cols * rows);
    return true;
  }

  function draw(t: number): void {
    const context = ctx;
    const data = imageData;
    if (!context || !data) {
      host.dataset.picaReady = "true";
      return;
    }
    if (props.seed !== cachedSeed) {
      cachedSeed = props.seed;
      phase0 = seedPhases(cachedSeed);
    }
    const trainCount = Math.max(2, Math.min(MAX_TRAINS, Math.round(props.trains)));
    // In computed pixels, not CSS ones, so the wave's own shape holds steady while `pixel` only changes how
    // coarsely it is sampled. That also keeps the period well clear of the pixel scale at every setting,
    // since the smallest allowed period is still many cells wide.
    const periodCells = Math.max(1, props.period);
    const k = (2 * Math.PI) / periodCells;
    const angleBase = (props.angle * Math.PI) / 180;
    const spreadRad = (props.spread * Math.PI) / 180;
    const timeS = t * 0.001 * props.speed;

    // Each train's phase varies along one axis only, so its column table (x only) and row table (y only,
    // carrying the time drift) are all a frame needs: cos(a + b) = cos(a)cos(b) - sin(a)sin(b) turns every
    // pixel's wave into one lookup from each table, never a fresh trig call.
    for (let i = 0; i < trainCount; i++) {
      const theta = angleBase + i * spreadRad;
      const kx = k * Math.cos(theta);
      const ky = k * Math.sin(theta);
      const phase = (phase0[i] ?? 0) + timeS * BASE_RATE * (TRAIN_RATE[i] ?? 1);
      const colBase = i * cols;
      for (let x = 0; x < cols; x++) {
        const a = kx * x;
        colCos[colBase + x] = Math.cos(a);
        colSin[colBase + x] = Math.sin(a);
      }
      const rowBase = i * rows;
      for (let y = 0; y < rows; y++) {
        const b = ky * y + phase;
        rowCos[rowBase + y] = Math.cos(b);
        rowSin[rowBase + y] = Math.sin(b);
      }
    }

    let idx = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let sum = 0;
        for (let i = 0; i < trainCount; i++) {
          const cc = colCos[i * cols + x] ?? 0;
          const cs = colSin[i * cols + x] ?? 0;
          const rc = rowCos[i * rows + y] ?? 0;
          const rs = rowSin[i * rows + y] ?? 0;
          sum += cc * rc - cs * rs;
        }
        // Crests coincide at 1 (full ink); trains cancel at 0 (bare ground).
        field[idx] = (sum / trainCount) * 0.5 + 0.5;
        idx++;
      }
    }

    const { mask, size } = maskFor(props.mask);
    const levels = Math.max(2, Math.min(4, Math.round(props.levels)));
    const bands = ditherLevels(field, cols, rows, levels, mask, size);
    const top = levels - 1;
    const buf = data.data;
    for (let p = 0; p < bands.length; p++) {
      const o = p * 4;
      const band = bands[p] ?? 0;
      const alpha = top > 0 ? Math.round((band / top) * inkA) : inkA;
      buf[o] = inkR;
      buf[o + 1] = inkG;
      buf[o + 2] = inkB;
      buf[o + 3] = alpha;
    }
    context.putImageData(data, 0, 0);
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  layout();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });

  return {
    update(next) {
      props = { ...props, ...next };
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
return { mount, defaults };
})();

// registry/effects/halftone-css/core.ts
const halftoneCss = (() => {
interface HalftoneCssProps {
  /** Spacing between dots, in pixels. */
  size: number;
  /** Dot radius, as a fraction of size. At 0.5 dots in the same layer touch their neighbors. */
  dot: number;
  /** How the dots fade across the host. "none" keeps their strength uniform. */
  fade: "radial" | "linear" | "none";
  /** Direction of the linear fade, in degrees. Used only when fade is "linear". */
  angle: number;
  /** How strongly the dots show, from faint to fully inked. */
  strength: number;
}

const defaults: HalftoneCssProps = {
  size: 14,
  dot: 0.28,
  fade: "radial",
  angle: 45,
  strength: 0.6,
};

const mount: Mount<HalftoneCssProps> = (host, initial = {}) => {
  let props: HalftoneCssProps = { ...defaults, ...initial };
  const scoped = scope(host);
  const dots = layer(host, "over");

  labelHost(host, "");
  scoped.setRules(sheet(scoped.selector, props));
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      scoped.setRules(sheet(scoped.selector, props));
    },
    destroy() {
      scoped.destroy();
      dots.remove();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

/** The scoped rule for one instance: a dot grid plus a second layer offset by half a cell, masked by an
 *  optional fade. Both layers live in the layer div's own background-image, so only one extra node is
 *  ever added. */
function sheet(selector: string, p: HalftoneCssProps): string {
  const radius = p.size * p.dot;
  const half = p.size / 2;
  const dot = `radial-gradient(circle at center, ${cssVar("fg")} ${radius}px, transparent ${radius}px)`;
  const mask = maskImage(p.fade, p.angle);
  const rules = [
    `background-image:${dot},${dot}`,
    `background-size:${p.size}px ${p.size}px,${p.size}px ${p.size}px`,
    `background-position:0 0,${half}px ${half}px`,
    `opacity:${p.strength}`,
  ];
  if (mask) {
    rules.push(
      `-webkit-mask-image:${mask}`,
      `mask-image:${mask}`,
      "-webkit-mask-repeat:no-repeat",
      "mask-repeat:no-repeat",
      "-webkit-mask-size:100% 100%",
      "mask-size:100% 100%",
    );
  }
  return `${selector} > div{${rules.join(";")}}`;
}

/** The mask-image value for one fade mode, or an empty string when the pattern should stay uniform. A mask
 *  reads only alpha, so currentColor stands in for black with no literal color written here. */
function maskImage(fade: HalftoneCssProps["fade"], angle: number): string {
  if (fade === "radial") return "radial-gradient(circle at center, currentColor 0%, transparent 100%)";
  if (fade === "linear") return `linear-gradient(${angle}deg, currentColor 0%, transparent 100%)`;
  return "";
}
return { mount, defaults };
})();

// registry/motion/marquee/core.ts
const marquee = (() => {
interface MarqueeProps extends MotionProps {
  /** How fast the content scrolls, in pixels per second. */
  speed: number;
  /** Which way the content scrolls. */
  direction: "left" | "right";
  /** Space between adjacent items, in em. */
  gap: number;
  /** Stops the scroll while the pointer rests over the host, or while focus sits inside it. */
  pauseOnHover: boolean;
  /** Frames drawn per second while scrolling. */
  fps: number;
}

const defaults: MarqueeProps = {
  speed: 40,
  direction: "left",
  gap: 2,
  pauseOnHover: true,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** Marks every node this core adds: the clones that continue the loop. The scoped rule that moves the real
 *  children skips anything carrying it, and the child observer ignores it too. */
const DATA_PICA = "data-pica";

/** The custom property lib/loop.ts writes each frame's scroll distance into. The scoped rule reads it to
 *  move the real children; the clones this core builds read the same property from their own inline style,
 *  since a core may style a node it created directly. */
const OFFSET_VAR = "--pica-marquee-x";

const mount: Mount<MarqueeProps> = (host, initial = {}) => {
  let props: MarqueeProps = { ...defaults, ...initial };

  const sheet = scope(host);
  const restoreHost = styleHost(host, {
    display: "flex",
    "flex-wrap": "nowrap",
    "align-items": "center",
    overflow: "hidden",
    gap: `${props.gap}em`,
    [OFFSET_VAR]: "0px",
  });
  // The real children are never touched directly. This rule alone moves them, by reading the property the
  // loop writes on the host below.
  sheet.setRules(`${sheet.selector} > *:not([${DATA_PICA}]){flex:none;transform:translateX(var(${OFFSET_VAR},0px))}`);

  let hovered = false;
  let focused = false;
  /** Pixel width of one full cycle of the real children, gap to the next cycle included. Zero with no children. */
  let period = 0;
  let clones: HTMLElement[] = [];

  function isOwn(node: Node): boolean {
    return node instanceof HTMLElement && node.hasAttribute(DATA_PICA);
  }

  function realChildren(): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (const child of Array.from(host.children)) {
      if (child instanceof HTMLElement && !child.hasAttribute(DATA_PICA)) out.push(child);
    }
    return out;
  }

  /** One inert copy of every real child, in one row of its own. Hidden and unreachable as a whole, through
   *  the single attribute HTML defines for exactly that. */
  function buildClone(children: readonly HTMLElement[]): HTMLElement {
    const group = document.createElement("div");
    group.setAttribute(DATA_PICA, "");
    group.setAttribute("aria-hidden", "true");
    group.setAttribute("inert", "");
    group.style.cssText = `display:flex;flex:none;gap:${props.gap}em;transform:translateX(var(${OFFSET_VAR},0px))`;
    for (const child of children) group.appendChild(child.cloneNode(true));
    return group;
  }

  function clearClones(): void {
    for (const clone of clones) clone.remove();
    clones = [];
  }

  /** Measures one cycle, then adds just enough clones on the side the content scrolls toward to cover the
   *  host with no gap at any point in the loop. Runs again whenever the real children, the gap, or the
   *  direction changes. */
  function rebuildClones(): void {
    clearClones();
    const children = realChildren();
    const first = children[0];
    if (!first) {
      period = 0;
      return;
    }
    const startLeft = first.getBoundingClientRect().left;
    const probe = buildClone(children);
    host.append(probe);
    period = Math.max(1, probe.getBoundingClientRect().left - startLeft);
    probe.remove();
    const needed = Math.max(1, Math.ceil(host.clientWidth / period));
    const built: HTMLElement[] = [];
    for (let i = 0; i < needed; i++) {
      const clone = buildClone(children);
      if (props.direction === "right") host.prepend(clone);
      else host.append(clone);
      built.push(clone);
    }
    clones = built;
  }

  rebuildClones();

  // Watches only the host's own child list, ignoring the clones it adds and removes here, so a page that
  // swaps the real children is picked up without a resize loop of its own doing.
  const childObserver = new MutationObserver((records) => {
    const changed = records.some(
      (record) => Array.from(record.addedNodes).some((node) => !isOwn(node)) || Array.from(record.removedNodes).some((node) => !isOwn(node)),
    );
    if (changed) rebuildClones();
  });
  childObserver.observe(host, { childList: true });

  function isPaused(): boolean {
    return props.paused || (props.pauseOnHover && hovered) || focused;
  }

  function draw(t: number): void {
    const wrapped = period > 0 ? ((t / 1000) * props.speed) % period : 0;
    const offset = props.direction === "left" ? -wrapped : wrapped;
    host.style.setProperty(OFFSET_VAR, `${offset.toFixed(2)}px`);
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: isPaused(),
    time: props.time,
    still: 0,
    frame: draw,
  });

  function onEnter(): void {
    hovered = true;
    loop.update({ paused: isPaused() });
  }
  function onLeave(): void {
    hovered = false;
    loop.update({ paused: isPaused() });
  }
  function onFocusIn(): void {
    focused = true;
    loop.update({ paused: isPaused() });
  }
  function onFocusOut(event: FocusEvent): void {
    focused = event.relatedTarget instanceof Node && host.contains(event.relatedTarget);
    loop.update({ paused: isPaused() });
  }
  host.addEventListener("mouseenter", onEnter);
  host.addEventListener("mouseleave", onLeave);
  host.addEventListener("focusin", onFocusIn);
  host.addEventListener("focusout", onFocusOut);

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.gap !== before.gap) host.style.setProperty("gap", `${props.gap}em`);
      if (props.gap !== before.gap || props.direction !== before.direction) rebuildClones();
      loop.update({ paused: isPaused(), time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      host.removeEventListener("mouseenter", onEnter);
      host.removeEventListener("mouseleave", onLeave);
      host.removeEventListener("focusin", onFocusIn);
      host.removeEventListener("focusout", onFocusOut);
      childObserver.disconnect();
      clearClones();
      sheet.destroy();
      restoreHost();
      delete host.dataset.picaReady;
    },
  };
};
return { mount, defaults };
})();

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

// registry/sections/maximalist-hero/core.ts
export interface MaximalistAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface MaximalistHeroProps extends MotionProps {
  /** The largest type in the frame, drawn as dark text on foreground chips. */
  headline: string;
  /** The middle size, a line or two of copy under the headline. */
  subhead: string;
  /** The smallest size, a mono label row above the headline. Empty hides the row. */
  kicker: string;
  /** The text the top and bottom bands scroll. Empty hides both bands. */
  ticker: string;
  /** The boxed figure on the right, the frame's second large type block. Empty hides it. */
  figure: string;
  /** The mono line under the figure. Empty hides it. */
  caption: string;
  /** Rows of the index list beside the headline, numbered automatically. Empty hides the list. */
  index: readonly string[];
  /** The header the index box carries. */
  indexTitle: string;
  /** Calls to action, drawn as links. At most three show; the first draws solid in the accent, the rest outline. */
  actions: readonly MaximalistAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** How strongly the two background fields show, from 0 to 1. */
  intensity: number;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: MaximalistHeroProps = {
  headline: "More is more.",
  subhead: "Two fields deep, four tones wide, and every edge of the frame working.",
  kicker: "Components drawn in text",
  ticker: "ASCII / Dither / Shader / Grid / Type",
  figure: "70+",
  caption: "Components · one palette · four tones",
  index: ["ASCII", "Dither", "Shaders", "Motion", "Sections"],
  indexTitle: "Index",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  intensity: 0.55,
  minHeight: 84,
  paused: false,
  time: null,
  seed: 1,
};

/** The brief caps the calls to action at three. */
const MAX_ACTIONS = 3;
/** Items the ticker bands hold; the marquee clones them to fill any width. */
const TICKER_ITEMS = 3;
/** Rows the index list shows at most; more would crowd the figure out of its column. */
const MAX_INDEX = 6;
/** Host width in pixels under which the board folds into the flow under the headline stack. */
const FIT_MIN = 760;

/** Keeps a 0 to 1 prop inside its range. */
function unit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 30 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** The wave field's share of the intensity. The field has no strength prop of its own, so its whole layer
 *  is dimmed instead, which fades every band evenly toward the ground. Kept under the type but well above
 *  the old floor: the brief wants this coarse lattice plainly visible against the fine dot grid, so the
 *  two fields beat rather than one vanishing into the other. */
function fieldOpacity(intensity: number): string {
  return (0.08 + unit(intensity) * 0.3).toFixed(3);
}

/** The dot grid's share of the intensity, mapped onto its own strength prop. */
function dotStrength(intensity: number): number {
  return Math.round((0.05 + unit(intensity) * 0.15) * 100) / 100;
}

/** Props for the dithered wave field: a coarse interference lattice, slowed to a drift. */
function wavesProps(p: MaximalistHeroProps): Partial<typeof ditherWaves.defaults> {
  return {
    trains: 3,
    period: 64,
    spread: 24,
    angle: 12,
    levels: 3,
    mask: "cluster",
    pixel: 4,
    speed: 0.1,
    fps: 15,
    paused: p.paused,
    time: p.time,
    seed: p.seed,
  };
}

/** Props for the halftone dot grid: fine, uniform, and packed to the edges with no fade. */
function dotsProps(p: MaximalistHeroProps): Partial<typeof halftoneCss.defaults> {
  return { size: 11, dot: 0.26, fade: "none", strength: dotStrength(p.intensity) };
}

/** Props for one ticker band. The bottom band runs the other way, so the two edges counter scroll. */
function bandProps(p: MaximalistHeroProps, direction: "left" | "right"): Partial<typeof marquee.defaults> {
  return { speed: 34, direction, gap: 2.4, pauseOnHover: true, fps: 30, paused: p.paused, time: p.time, seed: p.seed };
}

/** The transform origin a rotated block hangs from, so the block tips around its reading edge. */
function origin(p: MaximalistHeroProps): string {
  return p.align === "center" ? "center" : "left";
}

/** Every scoped rule for the host and the nodes this core adds. The minimum height goes in a :where() rule,
 *  which carries no specificity, so a page that gives this host a height of its own wins. All color comes
 *  from the four palette tokens; prose keeps the page's font, and only labels and the bands set a mono one.
 *  The board's width is a custom property the host's right padding also reads, so the in-flow column can
 *  never slide beneath it; folded or empty it collapses to zero and the padding closes up with it. */
function rules(selector: string, p: MaximalistHeroProps): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const edge = p.align === "center" ? "center" : "flex-start";
  const textAlign = p.align === "center" ? "center" : "start";
  const hang = origin(p);
  const corner = `linear-gradient(${fg}, ${fg})`;
  const tint = `color-mix(in srgb, ${bg} 74%, transparent)`;
  const hairline = `color-mix(in srgb, ${fg} 38%, transparent)`;
  return [
    `:where(${selector}){min-height:${vh(p.minHeight)}vh}`,
    `${selector}{position:relative;isolation:isolate;overflow:hidden;box-sizing:border-box;display:flex;flex-direction:column;align-items:${edge};--maxh-pad:clamp(1.25rem,4vw,3.25rem);--maxh-board:min(37%,23rem);padding:var(--maxh-pad) calc(var(--maxh-pad) + var(--maxh-board)) var(--maxh-pad) var(--maxh-pad)}`,
    `${selector}[data-pica-fit="min"],${selector}[data-pica-plain]{--maxh-board:0rem}`,
    `${selector} > [data-pica-veil]{background:color-mix(in srgb, ${bg} 55%, transparent)}`,
    `${selector} > [data-pica-corners]{position:absolute;inset:0;pointer-events:none;background-image:${corner},${corner},${corner},${corner},${corner},${corner},${corner},${corner};background-repeat:no-repeat;background-size:18px 1px,1px 18px,18px 1px,1px 18px,18px 1px,1px 18px,18px 1px,1px 18px;background-position:10px 10px,10px 10px,right 10px top 10px,right 10px top 10px,left 10px bottom 10px,left 10px bottom 10px,right 10px bottom 10px,right 10px bottom 10px}`,
    `${selector} > [data-pica-rail]{position:absolute;top:50%;left:0.55em;transform:translateY(-50%);writing-mode:vertical-rl;white-space:nowrap;pointer-events:none;font-family:${GRID_FONT};font-size:0.62rem;letter-spacing:0.22em;text-transform:uppercase;color:${muted}}`,
    `${selector} > [data-pica-band]{flex:none;align-self:stretch;margin-left:calc(-1 * var(--maxh-pad));margin-right:calc(0px - var(--maxh-pad) - var(--maxh-board));border-top:1px solid ${fg};border-bottom:1px solid ${fg};background:${bg};padding:0.55em 0;font-family:${GRID_FONT};font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:${fg}}`,
    `${selector} > [data-pica-band="top"]{margin-top:calc(-1 * var(--maxh-pad));border-top:0}`,
    `${selector} > [data-pica-band="bottom"]{margin-top:auto;margin-bottom:calc(-1 * var(--maxh-pad));border-bottom:0}`,
    `${selector} > [data-pica-band] > span{white-space:nowrap}`,
    `${selector} > [data-pica-band] > span > em{font-style:normal;color:${muted}}`,
    `${selector} > [data-pica-stack]{display:flex;flex-direction:column;align-items:${edge};gap:0.9em;margin-top:auto;padding:2em 0 1.1em}`,
    `${selector} [data-pica-kicker]{display:flex;flex-wrap:wrap;align-items:center;gap:0.35em 0.7em;width:100%;max-width:56ch;font-family:${GRID_FONT};font-size:0.74rem;letter-spacing:0.08em;text-transform:uppercase;color:${muted};transform:rotate(-1deg);transform-origin:${hang} center}`,
    `${selector} [data-pica-kicker] > b{flex:none;width:0.6em;height:0.6em;background:${accent}}`,
    `${selector} [data-pica-kicker] > i{flex:1 1 2em;height:1px;background:${muted}}`,
    `${selector} [data-pica-kicker] > span{white-space:nowrap}`,
    // The knockout chip and its text need different colors: the chip paints the page's foreground and the
    // text its inverse. Both jobs need currentColor, so they sit on two nested spans. The outer keeps the
    // inherited color, so its background reads the true foreground even with --pica-fg unset; the inner
    // carries only text in the inverse ink. One element doing both would paint ink on ink.
    `${selector} [data-pica-headline]{margin:0.12em 0 0.24em;font-size:clamp(2.5rem,9.5vw,5.75rem);font-weight:800;line-height:0.98;letter-spacing:-0.02em;text-align:${textAlign};max-width:15ch;transform:rotate(1.2deg);transform-origin:${hang} center}`,
    `${selector} [data-pica-headline] > span{background:${fg};padding:0.05em 0.2em 0.11em;-webkit-box-decoration-break:clone;box-decoration-break:clone}`,
    `${selector} [data-pica-headline] > span > i{font-style:normal;color:${cssOn("fg")}}`,
    `${selector} [data-pica-subhead]{margin:0;font-size:clamp(1.05rem,2.3vw,1.4rem);line-height:1.45;color:${muted};max-width:46ch;text-align:${textAlign};transform:rotate(-0.6deg);transform-origin:${hang} top}`,
    `${selector} > :not([data-pica]){max-width:52ch;text-align:${textAlign}}`,
    `${selector} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;justify-content:${edge};gap:0.7em;max-width:52ch;margin-top:1.2em;margin-bottom:auto;transform:rotate(-0.7deg);transform-origin:${hang} center}`,
    `${selector} > [data-pica-actions]:empty{display:none}`,
    `${selector} > [data-pica-actions] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.62em 1.3em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
    `${selector} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
    `${selector} > [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
    `${selector} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${selector} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    // The board owns the right edge from the top pad to the bottom one. Absolute, so it can always reach
    // band to band; the host's right padding keeps every in-flow child clear of it.
    `${selector} > [data-pica-board]{position:absolute;top:var(--maxh-pad);right:var(--maxh-pad);bottom:var(--maxh-pad);width:var(--maxh-board);display:flex;flex-direction:column;justify-content:center;gap:clamp(0.9em,2.5vh,1.6em)}`,
    `${selector}[data-pica-fit="min"] > [data-pica-board]{position:static;width:auto;align-self:stretch;margin-top:1.4em;justify-content:flex-start}`,
    `${selector} [data-pica-index]{flex:none;border:1px solid ${fg};background:${tint};transform:rotate(0.9deg);transform-origin:right top;font-family:${GRID_FONT};font-size:0.68rem;letter-spacing:0.07em;text-transform:uppercase}`,
    `${selector} [data-pica-index] > div{display:flex;align-items:center;gap:0.7em;padding:0.6em 0.85em;color:${muted}}`,
    `${selector} [data-pica-index] > div > b{flex:none;width:0.55em;height:0.55em;background:${accent}}`,
    `${selector} [data-pica-index] > div > i{flex:1;height:1px;background:${hairline}}`,
    `${selector} [data-pica-index] ul{list-style:none;margin:0;padding:0}`,
    `${selector} [data-pica-index] li{display:flex;gap:0.8em;padding:0.5em 0.85em;border-top:1px solid ${hairline};color:${fg}}`,
    `${selector} [data-pica-index] li > b{flex:none;font-weight:400;color:${muted}}`,
    `${selector} [data-pica-figure]{position:relative;flex:1;min-height:7.5em;display:flex;flex-direction:column;justify-content:flex-end;gap:0.3em;padding:0.75em 0.85em;border:1px solid ${fg};background:${tint};transform:rotate(-1.1deg);transform-origin:left bottom}`,
    `${selector} [data-pica-figure] > b{position:absolute;top:-0.5em;right:-0.5em;width:1em;height:1em;background:${accent}}`,
    `${selector} [data-pica-figure] > strong{display:block;font-size:clamp(2.6rem,6.5vw,5.25rem);font-weight:800;line-height:0.95;letter-spacing:-0.02em;color:${fg}}`,
    `${selector} [data-pica-figure] > span{font-family:${GRID_FONT};font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;color:${muted}}`,
    `${selector} [data-pica-tones]{display:flex;height:0.55em;margin-top:0.55em}`,
    `${selector} [data-pica-tones] > i{flex:1}`,
    `${selector} [data-pica-tones] > i:nth-child(1){background:${fg}}`,
    `${selector} [data-pica-tones] > i:nth-child(2){background:${muted}}`,
    `${selector} [data-pica-tones] > i:nth-child(3){background:${accent}}`,
    `${selector} [data-pica-tones] > i:nth-child(4){background:${bg};box-shadow:inset 0 0 0 1px ${hairline}}`,
  ].join("\n");
}

/** Rebuilds the action links from JSON: the first solid, the rest outline, in source order, at most three. */
function renderActions(container: HTMLElement, actions: readonly MaximalistAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.slice(0, MAX_ACTIONS).entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href;
    a.textContent = action.label;
    container.append(a);
  }
}

/** Refills one band's items from the ticker text. The items are the composed marquee's own wrapped content,
 *  so they stay unmarked: it counts anything carrying data-pica as one of its clones and would skip them. */
function fillBand(band: HTMLElement, ticker: string): void {
  for (const item of Array.from(band.querySelectorAll(":scope > span"))) item.remove();
  for (let i = 0; ticker && i < TICKER_ITEMS; i++) {
    const item = document.createElement("span");
    item.textContent = ticker;
    const sep = document.createElement("em");
    sep.setAttribute("aria-hidden", "true");
    sep.textContent = "  ·  ";
    item.append(sep);
    band.append(item);
  }
}

/** One mounted ticker band: the div, the marquee instance scrolling inside it, and its visibility switch. */
interface Band {
  readonly el: HTMLElement;
  readonly instance: ReturnType<typeof marquee.mount>;
}

/** Builds a band div, fills it with ticker items, and mounts a marquee into it. The band is hidden from
 *  assistive technology as a whole: the same line repeated for width is texture, not copy. */
function mountBand(host: HTMLElement, where: "top" | "bottom", p: MaximalistHeroProps): Band {
  const el = document.createElement("div");
  el.setAttribute("data-pica", "");
  el.setAttribute("data-pica-band", where);
  el.setAttribute("aria-hidden", "true");
  fillBand(el, p.ticker);
  el.style.display = p.ticker ? "" : "none";
  const instance = marquee.mount(el, bandProps(p, where === "top" ? "left" : "right"));
  return { el, instance };
}

/** Creates one element the core owns, marked for identification and named for its part. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

export const mount: Mount<MaximalistHeroProps> = (host, initial = {}) => {
  let props: MaximalistHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const attrs = hostAttributes(host);
  let destroyed = false;

  // The under-layers stack in prepend order: the wave field paints first at the bottom, the dot grid beats
  // over it at a much finer scale, and the bg veil grounds them both. Each layer is this core's own sub-host.
  const veilLayer = layer(host, "under");
  veilLayer.el.setAttribute("data-pica-veil", "");
  const dotsLayer = layer(host, "under");
  const wavesLayer = layer(host, "under");
  wavesLayer.el.style.opacity = fieldOpacity(props.intensity);
  const dots = halftoneCss.mount(dotsLayer.el, dotsProps(props));
  const waves = ditherWaves.mount(wavesLayer.el, wavesProps(props));

  // In-flow content: the top band and the stack go in before the page's own children, the actions and the
  // bottom band after them. Children are never touched; they simply flow between what this core adds.
  const stack = document.createElement("div");
  stack.setAttribute("data-pica", "");
  stack.setAttribute("data-pica-stack", "");

  const kicker = document.createElement("div");
  kicker.setAttribute("data-pica", "");
  kicker.setAttribute("data-pica-kicker", "");
  const tick = document.createElement("b");
  tick.setAttribute("aria-hidden", "true");
  const kickerText = document.createElement("span");
  kickerText.textContent = props.kicker;
  const kickerLine = document.createElement("i");
  kickerLine.setAttribute("aria-hidden", "true");
  const kickerTag = document.createElement("span");
  kickerTag.setAttribute("aria-hidden", "true");
  kickerTag.textContent = "Two fields · four tones";
  kicker.append(tick, kickerText, kickerLine, kickerTag);
  kicker.style.display = props.kicker ? "" : "none";

  const headline = document.createElement("h1");
  headline.setAttribute("data-pica", "");
  headline.setAttribute("data-pica-headline", "");
  const headlineChip = document.createElement("span");
  const headlineText = document.createElement("i");
  headlineText.textContent = props.headline;
  headlineChip.append(headlineText);
  headline.append(headlineChip);
  headline.style.display = props.headline ? "" : "none";

  const subhead = document.createElement("p");
  subhead.setAttribute("data-pica", "");
  subhead.setAttribute("data-pica-subhead", "");
  subhead.textContent = props.subhead;
  subhead.style.display = props.subhead ? "" : "none";

  stack.append(kicker, headline, subhead);

  // The board is this core's second column: a numbered index box over a boxed figure, pinned to the right
  // edge of the frame. On a narrow host it folds into the flow just under the stack.
  const board = part("div", "board");

  const indexBox = part("div", "index");
  const indexHead = document.createElement("div");
  indexHead.setAttribute("data-pica", "");
  const indexTick = document.createElement("b");
  indexTick.setAttribute("aria-hidden", "true");
  const indexTitleEl = document.createElement("span");
  const indexRule = document.createElement("i");
  indexRule.setAttribute("aria-hidden", "true");
  const indexCount = document.createElement("span");
  indexHead.append(indexTick, indexTitleEl, indexRule, indexCount);
  const indexList = document.createElement("ul");
  indexBox.append(indexHead, indexList);

  const figureBox = part("div", "figure");
  const figureTab = document.createElement("b");
  figureTab.setAttribute("aria-hidden", "true");
  const figureText = document.createElement("strong");
  const figureCaption = document.createElement("span");
  const tones = part("span", "tones");
  tones.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 4; i++) {
    const cell = document.createElement("i");
    cell.setAttribute("data-pica", "");
    tones.append(cell);
  }
  figureBox.append(figureTab, figureText, figureCaption, tones);

  board.append(indexBox, figureBox);

  const actions = document.createElement("div");
  actions.setAttribute("data-pica", "");
  actions.setAttribute("data-pica-actions", "");

  const corners = document.createElement("div");
  corners.setAttribute("data-pica", "");
  corners.setAttribute("data-pica-corners", "");
  corners.setAttribute("aria-hidden", "true");

  const rail = document.createElement("div");
  rail.setAttribute("data-pica", "");
  rail.setAttribute("data-pica-rail", "");
  rail.setAttribute("aria-hidden", "true");
  rail.textContent = props.kicker;
  rail.style.display = props.kicker ? "" : "none";

  const bandTop = mountBand(host, "top", props);
  const bandBottom = mountBand(host, "bottom", props);

  host.prepend(stack);
  host.prepend(bandTop.el);
  stack.after(board);
  host.append(actions, bandBottom.el, corners, rail);

  /** The board is real content: an index list the page numbers itself, not a landmark. */
  function renderIndex(): void {
    indexTitleEl.textContent = props.indexTitle;
    const rows = props.index.slice(0, MAX_INDEX);
    indexCount.textContent = rows.length ? `01–${String(rows.length).padStart(2, "0")}` : "";
    indexList.replaceChildren();
    for (const [i, label] of rows.entries()) {
      const li = document.createElement("li");
      li.setAttribute("data-pica", "");
      const n = document.createElement("b");
      n.textContent = String(i + 1).padStart(2, "0");
      const text = document.createElement("span");
      text.textContent = label;
      li.append(n, text);
      indexList.append(li);
    }
    indexBox.style.display = rows.length || props.indexTitle ? "" : "none";
  }

  function renderFigure(): void {
    figureText.textContent = props.figure;
    figureCaption.textContent = props.caption;
    figureCaption.style.display = props.caption ? "" : "none";
    figureBox.style.display = props.figure || props.caption ? "" : "none";
  }

  /** A board with nothing in it lets the column close up: the padding that held its place goes with it. */
  function syncBoard(): void {
    const empty = !props.figure && !props.caption && props.index.length === 0 && !props.indexTitle;
    board.style.display = empty ? "none" : "";
    attrs.set("data-pica-plain", empty ? "" : null);
  }

  /** Below the fold width the board drops out of its column and into the flow under the stack. */
  function measure(): void {
    attrs.set("data-pica-fit", host.clientWidth < FIT_MIN ? "min" : null);
  }

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;

  sheet.setRules(rules(sheet.selector, props));
  renderActions(actions, props.actions);
  renderIndex();
  renderFigure();
  syncBoard();
  measure();
  observer?.observe(host);
  host.dataset.picaReady = "true";

  /** Restyles one band and refills it when the ticker text changes. */
  function syncBand(band: Band): void {
    fillBand(band.el, props.ticker);
    band.el.style.display = props.ticker ? "" : "none";
  }

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };

      if (changed(before, props, ["paused", "time", "seed"])) {
        const motion = { paused: props.paused, time: props.time, seed: props.seed };
        waves.update(wavesProps(props));
        bandTop.instance.update(motion);
        bandBottom.instance.update(motion);
      }
      if (props.intensity !== before.intensity) {
        wavesLayer.el.style.opacity = fieldOpacity(props.intensity);
        dots.update({ strength: dotStrength(props.intensity) });
      }
      if (props.align !== before.align || props.minHeight !== before.minHeight) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (props.headline !== before.headline) {
        headlineText.textContent = props.headline;
        headline.style.display = props.headline ? "" : "none";
      }
      if (props.subhead !== before.subhead) {
        subhead.textContent = props.subhead;
        subhead.style.display = props.subhead ? "" : "none";
      }
      if (props.kicker !== before.kicker) {
        kickerText.textContent = props.kicker;
        rail.textContent = props.kicker;
        kicker.style.display = props.kicker ? "" : "none";
        rail.style.display = props.kicker ? "" : "none";
      }
      if (props.ticker !== before.ticker) {
        syncBand(bandTop);
        syncBand(bandBottom);
      }
      if (props.indexTitle !== before.indexTitle || !sameJson(before.index, props.index)) renderIndex();
      if (props.figure !== before.figure || props.caption !== before.caption) renderFigure();
      if (changed(before, props, ["figure", "caption", "indexTitle"]) || !sameJson(before.index, props.index)) syncBoard();
      if (!sameJson(before.actions, props.actions)) renderActions(actions, props.actions);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      waves.destroy();
      dots.destroy();
      bandTop.instance.destroy();
      bandBottom.instance.destroy();
      // Layers come off in reverse mount order: each one's styleHost captured the host the previous layer
      // left behind, so only the last restore puts back what mount found.
      wavesLayer.remove();
      dotsLayer.remove();
      veilLayer.remove();
      bandTop.el.remove();
      bandBottom.el.remove();
      stack.remove();
      board.remove();
      actions.remove();
      corners.remove();
      rail.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/maximalist-hero/index.tsx
export type MaximalistHeroComponentProps = Partial<MaximalistHeroProps> & WrapperProps & { children?: ReactNode };

/** A maximalist page hero that packs two beating fields, three type sizes, and edge bands around a headline and copy. */
export function MaximalistHero({ className, style, palette, children, ...props }: MaximalistHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Maximalist Hero · maximalist-hero
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Maximalist Hero · Pica</title>
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
<div id="pica"><p>Seventy components drawn in text and counting, from glyph grids to WebGL fields, all reading the same four tones.</p><ul><li>React and single file HTML builds</li><li>No runtime dependencies</li><li>One palette, everywhere</li></ul></div>
<script>
"use strict";
var PicaMaximalistHero = (() => {
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

  // registry/sections/maximalist-hero/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults4,
    mount: () => mount4
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
  function layer(host, where, tag = "div") {
    const el = document.createElement(tag);
    el.setAttribute("data-pica", "");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:${where === "under" ? -1 : 1}`;
    const styles = {};
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
  var clusterCache = /* @__PURE__ */ new Map();
  function clusterMatrix(size) {
    const kept = clusterCache.get(size);
    if (kept) return kept;
    const n = size * size;
    const turn = Math.PI * 2 / size;
    const spot = new Float32Array(n);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) spot[y * size + x] = Math.cos(turn * (x + y)) + Math.cos(turn * (y - x));
    }
    const order = Array.from({ length: n }, (_, i) => i);
    order.sort((a, b) => (spot[b] ?? 0) - (spot[a] ?? 0) || a - b);
    const out = new Float32Array(n);
    order.forEach((index, r) => {
      out[index] = (r + 0.5) / n;
    });
    clusterCache.set(size, out);
    return out;
  }
  function maskAt(mask, size, x, y) {
    const mx = (x % size + size) % size;
    const my = (y % size + size) % size;
    return mask[my * size + mx] ?? 0.5;
  }
  function ditherLevels(values, width, height, levels, mask, size) {
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

  // registry/dither/dither-waves/core.ts
  var defaults = {
    trains: 3,
    period: 34,
    spread: 27,
    angle: 0,
    levels: 2,
    mask: "cluster",
    pixel: 2,
    speed: 0.12,
    fps: 15,
    paused: false,
    time: null,
    seed: 1
  };
  var STILL_TIME = 1200;
  var MAX_TRAINS = 4;
  var BLUE_SIZE = 32;
  var CLUSTER_SIZE = 8;
  var BASE_RATE = 0.4;
  var TRAIN_RATE = [0.37, 0.53, 0.29, 0.61];
  function maskFor(kind) {
    return kind === "blue" ? { mask: blueNoiseMatrix(BLUE_SIZE), size: BLUE_SIZE } : { mask: clusterMatrix(CLUSTER_SIZE), size: CLUSTER_SIZE };
  }
  function seedPhases(seed) {
    const rng = createRng(seed);
    return Array.from({ length: MAX_TRAINS }, () => rng() * Math.PI * 2);
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let cols = 1;
    let rows = 1;
    let imageData = null;
    let colCos = new Float32Array(0);
    let colSin = new Float32Array(0);
    let rowCos = new Float32Array(0);
    let rowSin = new Float32Array(0);
    let field = new Float32Array(0);
    let inkR = 0;
    let inkG = 0;
    let inkB = 0;
    let inkA = 255;
    let cachedSeed = props.seed;
    let phase0 = seedPhases(props.seed);
    const surface = createCanvas(host, {
      autoSize: false,
      css: "image-rendering:pixelated",
      onResize: () => {
        if (layout()) loop.redraw();
      }
    });
    const canvas = surface.canvas;
    const ctx = canvas.getContext("2d");
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
    function layout() {
      const pixelSize = Math.max(1, props.pixel);
      const w = Math.max(1, Math.round(surface.cssWidth / pixelSize));
      const h = Math.max(1, Math.round(surface.cssHeight / pixelSize));
      if (w === cols && h === rows && imageData) return false;
      cols = w;
      rows = h;
      canvas.width = cols;
      canvas.height = rows;
      imageData = ctx ? ctx.createImageData(cols, rows) : null;
      colCos = new Float32Array(MAX_TRAINS * cols);
      colSin = new Float32Array(MAX_TRAINS * cols);
      rowCos = new Float32Array(MAX_TRAINS * rows);
      rowSin = new Float32Array(MAX_TRAINS * rows);
      field = new Float32Array(cols * rows);
      return true;
    }
    function draw(t) {
      const context = ctx;
      const data = imageData;
      if (!context || !data) {
        host.dataset.picaReady = "true";
        return;
      }
      if (props.seed !== cachedSeed) {
        cachedSeed = props.seed;
        phase0 = seedPhases(cachedSeed);
      }
      const trainCount = Math.max(2, Math.min(MAX_TRAINS, Math.round(props.trains)));
      const periodCells = Math.max(1, props.period);
      const k = 2 * Math.PI / periodCells;
      const angleBase = props.angle * Math.PI / 180;
      const spreadRad = props.spread * Math.PI / 180;
      const timeS = t * 1e-3 * props.speed;
      for (let i = 0; i < trainCount; i++) {
        const theta = angleBase + i * spreadRad;
        const kx = k * Math.cos(theta);
        const ky = k * Math.sin(theta);
        const phase = (phase0[i] ?? 0) + timeS * BASE_RATE * (TRAIN_RATE[i] ?? 1);
        const colBase = i * cols;
        for (let x = 0; x < cols; x++) {
          const a = kx * x;
          colCos[colBase + x] = Math.cos(a);
          colSin[colBase + x] = Math.sin(a);
        }
        const rowBase = i * rows;
        for (let y = 0; y < rows; y++) {
          const b = ky * y + phase;
          rowCos[rowBase + y] = Math.cos(b);
          rowSin[rowBase + y] = Math.sin(b);
        }
      }
      let idx = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          let sum = 0;
          for (let i = 0; i < trainCount; i++) {
            const cc = colCos[i * cols + x] ?? 0;
            const cs = colSin[i * cols + x] ?? 0;
            const rc = rowCos[i * rows + y] ?? 0;
            const rs = rowSin[i * rows + y] ?? 0;
            sum += cc * rc - cs * rs;
          }
          field[idx] = sum / trainCount * 0.5 + 0.5;
          idx++;
        }
      }
      const { mask, size } = maskFor(props.mask);
      const levels = Math.max(2, Math.min(4, Math.round(props.levels)));
      const bands = ditherLevels(field, cols, rows, levels, mask, size);
      const top = levels - 1;
      const buf = data.data;
      for (let p = 0; p < bands.length; p++) {
        const o = p * 4;
        const band = bands[p] ?? 0;
        const alpha = top > 0 ? Math.round(band / top * inkA) : inkA;
        buf[o] = inkR;
        buf[o + 1] = inkG;
        buf[o + 2] = inkB;
        buf[o + 3] = alpha;
      }
      context.putImageData(data, 0, 0);
      host.dataset.picaReady = "true";
    }
    labelHost(host, "");
    layout();
    const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });
    return {
      update(next) {
        props = { ...props, ...next };
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

  // registry/effects/halftone-css/core.ts
  var defaults2 = {
    size: 14,
    dot: 0.28,
    fade: "radial",
    angle: 45,
    strength: 0.6
  };
  var mount2 = (host, initial = {}) => {
    let props = { ...defaults2, ...initial };
    const scoped = scope(host);
    const dots = layer(host, "over");
    labelHost(host, "");
    scoped.setRules(sheet(scoped.selector, props));
    host.dataset.picaReady = "true";
    return {
      update(next) {
        props = { ...props, ...next };
        scoped.setRules(sheet(scoped.selector, props));
      },
      destroy() {
        scoped.destroy();
        dots.remove();
        unlabelHost(host);
        delete host.dataset.picaReady;
      }
    };
  };
  function sheet(selector, p) {
    const radius = p.size * p.dot;
    const half = p.size / 2;
    const dot = `radial-gradient(circle at center, ${cssVar("fg")} ${radius}px, transparent ${radius}px)`;
    const mask = maskImage(p.fade, p.angle);
    const rules2 = [
      `background-image:${dot},${dot}`,
      `background-size:${p.size}px ${p.size}px,${p.size}px ${p.size}px`,
      `background-position:0 0,${half}px ${half}px`,
      `opacity:${p.strength}`
    ];
    if (mask) {
      rules2.push(
        `-webkit-mask-image:${mask}`,
        `mask-image:${mask}`,
        "-webkit-mask-repeat:no-repeat",
        "mask-repeat:no-repeat",
        "-webkit-mask-size:100% 100%",
        "mask-size:100% 100%"
      );
    }
    return `${selector} > div{${rules2.join(";")}}`;
  }
  function maskImage(fade, angle) {
    if (fade === "radial") return "radial-gradient(circle at center, currentColor 0%, transparent 100%)";
    if (fade === "linear") return `linear-gradient(${angle}deg, currentColor 0%, transparent 100%)`;
    return "";
  }

  // registry/motion/marquee/core.ts
  var defaults3 = {
    speed: 40,
    direction: "left",
    gap: 2,
    pauseOnHover: true,
    fps: 30,
    paused: false,
    time: null,
    seed: 1
  };
  var DATA_PICA = "data-pica";
  var OFFSET_VAR = "--pica-marquee-x";
  var mount3 = (host, initial = {}) => {
    let props = { ...defaults3, ...initial };
    const sheet2 = scope(host);
    const restoreHost = styleHost(host, {
      display: "flex",
      "flex-wrap": "nowrap",
      "align-items": "center",
      overflow: "hidden",
      gap: `${props.gap}em`,
      [OFFSET_VAR]: "0px"
    });
    sheet2.setRules(`${sheet2.selector} > *:not([${DATA_PICA}]){flex:none;transform:translateX(var(${OFFSET_VAR},0px))}`);
    let hovered = false;
    let focused = false;
    let period = 0;
    let clones = [];
    function isOwn(node) {
      return node instanceof HTMLElement && node.hasAttribute(DATA_PICA);
    }
    function realChildren() {
      const out = [];
      for (const child of Array.from(host.children)) {
        if (child instanceof HTMLElement && !child.hasAttribute(DATA_PICA)) out.push(child);
      }
      return out;
    }
    function buildClone(children) {
      const group = document.createElement("div");
      group.setAttribute(DATA_PICA, "");
      group.setAttribute("aria-hidden", "true");
      group.setAttribute("inert", "");
      group.style.cssText = `display:flex;flex:none;gap:${props.gap}em;transform:translateX(var(${OFFSET_VAR},0px))`;
      for (const child of children) group.appendChild(child.cloneNode(true));
      return group;
    }
    function clearClones() {
      for (const clone of clones) clone.remove();
      clones = [];
    }
    function rebuildClones() {
      clearClones();
      const children = realChildren();
      const first = children[0];
      if (!first) {
        period = 0;
        return;
      }
      const startLeft = first.getBoundingClientRect().left;
      const probe = buildClone(children);
      host.append(probe);
      period = Math.max(1, probe.getBoundingClientRect().left - startLeft);
      probe.remove();
      const needed = Math.max(1, Math.ceil(host.clientWidth / period));
      const built = [];
      for (let i = 0; i < needed; i++) {
        const clone = buildClone(children);
        if (props.direction === "right") host.prepend(clone);
        else host.append(clone);
        built.push(clone);
      }
      clones = built;
    }
    rebuildClones();
    const childObserver = new MutationObserver((records) => {
      const changed2 = records.some(
        (record) => Array.from(record.addedNodes).some((node) => !isOwn(node)) || Array.from(record.removedNodes).some((node) => !isOwn(node))
      );
      if (changed2) rebuildClones();
    });
    childObserver.observe(host, { childList: true });
    function isPaused() {
      return props.paused || props.pauseOnHover && hovered || focused;
    }
    function draw(t) {
      const wrapped = period > 0 ? t / 1e3 * props.speed % period : 0;
      const offset = props.direction === "left" ? -wrapped : wrapped;
      host.style.setProperty(OFFSET_VAR, `${offset.toFixed(2)}px`);
      host.dataset.picaReady = "true";
    }
    const loop = createLoop({
      el: host,
      fps: props.fps,
      paused: isPaused(),
      time: props.time,
      still: 0,
      frame: draw
    });
    function onEnter() {
      hovered = true;
      loop.update({ paused: isPaused() });
    }
    function onLeave() {
      hovered = false;
      loop.update({ paused: isPaused() });
    }
    function onFocusIn() {
      focused = true;
      loop.update({ paused: isPaused() });
    }
    function onFocusOut(event) {
      focused = event.relatedTarget instanceof Node && host.contains(event.relatedTarget);
      loop.update({ paused: isPaused() });
    }
    host.addEventListener("mouseenter", onEnter);
    host.addEventListener("mouseleave", onLeave);
    host.addEventListener("focusin", onFocusIn);
    host.addEventListener("focusout", onFocusOut);
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.gap !== before.gap) host.style.setProperty("gap", `${props.gap}em`);
        if (props.gap !== before.gap || props.direction !== before.direction) rebuildClones();
        loop.update({ paused: isPaused(), time: props.time, fps: props.fps });
        loop.redraw();
      },
      destroy() {
        loop.destroy();
        host.removeEventListener("mouseenter", onEnter);
        host.removeEventListener("mouseleave", onLeave);
        host.removeEventListener("focusin", onFocusIn);
        host.removeEventListener("focusout", onFocusOut);
        childObserver.disconnect();
        clearClones();
        sheet2.destroy();
        restoreHost();
        delete host.dataset.picaReady;
      }
    };
  };

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
  function changed(before, after, keys) {
    return keys.some((key) => !sameJson(before[key], after[key]));
  }

  // registry/sections/maximalist-hero/core.ts
  var defaults4 = {
    headline: "More is more.",
    subhead: "Two fields deep, four tones wide, and every edge of the frame working.",
    kicker: "Components drawn in text",
    ticker: "ASCII / Dither / Shader / Grid / Type",
    figure: "70+",
    caption: "Components · one palette · four tones",
    index: ["ASCII", "Dither", "Shaders", "Motion", "Sections"],
    indexTitle: "Index",
    actions: [
      { label: "Browse components", href: "#components" },
      { label: "Read the docs", href: "#docs" }
    ],
    align: "start",
    intensity: 0.55,
    minHeight: 84,
    paused: false,
    time: null,
    seed: 1
  };
  var MAX_ACTIONS = 3;
  var TICKER_ITEMS = 3;
  var MAX_INDEX = 6;
  var FIT_MIN = 760;
  function unit(value) {
    return Math.min(1, Math.max(0, value));
  }
  function vh(minHeight) {
    return Math.min(100, Math.max(0, minHeight));
  }
  function fieldOpacity(intensity) {
    return (0.08 + unit(intensity) * 0.3).toFixed(3);
  }
  function dotStrength(intensity) {
    return Math.round((0.05 + unit(intensity) * 0.15) * 100) / 100;
  }
  function wavesProps(p) {
    return {
      trains: 3,
      period: 64,
      spread: 24,
      angle: 12,
      levels: 3,
      mask: "cluster",
      pixel: 4,
      speed: 0.1,
      fps: 15,
      paused: p.paused,
      time: p.time,
      seed: p.seed
    };
  }
  function dotsProps(p) {
    return { size: 11, dot: 0.26, fade: "none", strength: dotStrength(p.intensity) };
  }
  function bandProps(p, direction) {
    return { speed: 34, direction, gap: 2.4, pauseOnHover: true, fps: 30, paused: p.paused, time: p.time, seed: p.seed };
  }
  function origin(p) {
    return p.align === "center" ? "center" : "left";
  }
  function rules(selector, p) {
    const fg = cssVar("fg");
    const bg = cssVar("bg");
    const accent = cssVar("accent");
    const muted = cssVar("muted");
    const edge = p.align === "center" ? "center" : "flex-start";
    const textAlign = p.align === "center" ? "center" : "start";
    const hang = origin(p);
    const corner = `linear-gradient(${fg}, ${fg})`;
    const tint = `color-mix(in srgb, ${bg} 74%, transparent)`;
    const hairline = `color-mix(in srgb, ${fg} 38%, transparent)`;
    return [
      `:where(${selector}){min-height:${vh(p.minHeight)}vh}`,
      `${selector}{position:relative;isolation:isolate;overflow:hidden;box-sizing:border-box;display:flex;flex-direction:column;align-items:${edge};--maxh-pad:clamp(1.25rem,4vw,3.25rem);--maxh-board:min(37%,23rem);padding:var(--maxh-pad) calc(var(--maxh-pad) + var(--maxh-board)) var(--maxh-pad) var(--maxh-pad)}`,
      `${selector}[data-pica-fit="min"],${selector}[data-pica-plain]{--maxh-board:0rem}`,
      `${selector} > [data-pica-veil]{background:color-mix(in srgb, ${bg} 55%, transparent)}`,
      `${selector} > [data-pica-corners]{position:absolute;inset:0;pointer-events:none;background-image:${corner},${corner},${corner},${corner},${corner},${corner},${corner},${corner};background-repeat:no-repeat;background-size:18px 1px,1px 18px,18px 1px,1px 18px,18px 1px,1px 18px,18px 1px,1px 18px;background-position:10px 10px,10px 10px,right 10px top 10px,right 10px top 10px,left 10px bottom 10px,left 10px bottom 10px,right 10px bottom 10px,right 10px bottom 10px}`,
      `${selector} > [data-pica-rail]{position:absolute;top:50%;left:0.55em;transform:translateY(-50%);writing-mode:vertical-rl;white-space:nowrap;pointer-events:none;font-family:${GRID_FONT};font-size:0.62rem;letter-spacing:0.22em;text-transform:uppercase;color:${muted}}`,
      `${selector} > [data-pica-band]{flex:none;align-self:stretch;margin-left:calc(-1 * var(--maxh-pad));margin-right:calc(0px - var(--maxh-pad) - var(--maxh-board));border-top:1px solid ${fg};border-bottom:1px solid ${fg};background:${bg};padding:0.55em 0;font-family:${GRID_FONT};font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:${fg}}`,
      `${selector} > [data-pica-band="top"]{margin-top:calc(-1 * var(--maxh-pad));border-top:0}`,
      `${selector} > [data-pica-band="bottom"]{margin-top:auto;margin-bottom:calc(-1 * var(--maxh-pad));border-bottom:0}`,
      `${selector} > [data-pica-band] > span{white-space:nowrap}`,
      `${selector} > [data-pica-band] > span > em{font-style:normal;color:${muted}}`,
      `${selector} > [data-pica-stack]{display:flex;flex-direction:column;align-items:${edge};gap:0.9em;margin-top:auto;padding:2em 0 1.1em}`,
      `${selector} [data-pica-kicker]{display:flex;flex-wrap:wrap;align-items:center;gap:0.35em 0.7em;width:100%;max-width:56ch;font-family:${GRID_FONT};font-size:0.74rem;letter-spacing:0.08em;text-transform:uppercase;color:${muted};transform:rotate(-1deg);transform-origin:${hang} center}`,
      `${selector} [data-pica-kicker] > b{flex:none;width:0.6em;height:0.6em;background:${accent}}`,
      `${selector} [data-pica-kicker] > i{flex:1 1 2em;height:1px;background:${muted}}`,
      `${selector} [data-pica-kicker] > span{white-space:nowrap}`,
      // The knockout chip and its text need different colors: the chip paints the page's foreground and the
      // text its inverse. Both jobs need currentColor, so they sit on two nested spans. The outer keeps the
      // inherited color, so its background reads the true foreground even with --pica-fg unset; the inner
      // carries only text in the inverse ink. One element doing both would paint ink on ink.
      `${selector} [data-pica-headline]{margin:0.12em 0 0.24em;font-size:clamp(2.5rem,9.5vw,5.75rem);font-weight:800;line-height:0.98;letter-spacing:-0.02em;text-align:${textAlign};max-width:15ch;transform:rotate(1.2deg);transform-origin:${hang} center}`,
      `${selector} [data-pica-headline] > span{background:${fg};padding:0.05em 0.2em 0.11em;-webkit-box-decoration-break:clone;box-decoration-break:clone}`,
      `${selector} [data-pica-headline] > span > i{font-style:normal;color:${cssOn("fg")}}`,
      `${selector} [data-pica-subhead]{margin:0;font-size:clamp(1.05rem,2.3vw,1.4rem);line-height:1.45;color:${muted};max-width:46ch;text-align:${textAlign};transform:rotate(-0.6deg);transform-origin:${hang} top}`,
      `${selector} > :not([data-pica]){max-width:52ch;text-align:${textAlign}}`,
      `${selector} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;justify-content:${edge};gap:0.7em;max-width:52ch;margin-top:1.2em;margin-bottom:auto;transform:rotate(-0.7deg);transform-origin:${hang} center}`,
      `${selector} > [data-pica-actions]:empty{display:none}`,
      `${selector} > [data-pica-actions] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.62em 1.3em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
      `${selector} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
      `${selector} > [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
      `${selector} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
      `${selector} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
      `${selector} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      // The board owns the right edge from the top pad to the bottom one. Absolute, so it can always reach
      // band to band; the host's right padding keeps every in-flow child clear of it.
      `${selector} > [data-pica-board]{position:absolute;top:var(--maxh-pad);right:var(--maxh-pad);bottom:var(--maxh-pad);width:var(--maxh-board);display:flex;flex-direction:column;justify-content:center;gap:clamp(0.9em,2.5vh,1.6em)}`,
      `${selector}[data-pica-fit="min"] > [data-pica-board]{position:static;width:auto;align-self:stretch;margin-top:1.4em;justify-content:flex-start}`,
      `${selector} [data-pica-index]{flex:none;border:1px solid ${fg};background:${tint};transform:rotate(0.9deg);transform-origin:right top;font-family:${GRID_FONT};font-size:0.68rem;letter-spacing:0.07em;text-transform:uppercase}`,
      `${selector} [data-pica-index] > div{display:flex;align-items:center;gap:0.7em;padding:0.6em 0.85em;color:${muted}}`,
      `${selector} [data-pica-index] > div > b{flex:none;width:0.55em;height:0.55em;background:${accent}}`,
      `${selector} [data-pica-index] > div > i{flex:1;height:1px;background:${hairline}}`,
      `${selector} [data-pica-index] ul{list-style:none;margin:0;padding:0}`,
      `${selector} [data-pica-index] li{display:flex;gap:0.8em;padding:0.5em 0.85em;border-top:1px solid ${hairline};color:${fg}}`,
      `${selector} [data-pica-index] li > b{flex:none;font-weight:400;color:${muted}}`,
      `${selector} [data-pica-figure]{position:relative;flex:1;min-height:7.5em;display:flex;flex-direction:column;justify-content:flex-end;gap:0.3em;padding:0.75em 0.85em;border:1px solid ${fg};background:${tint};transform:rotate(-1.1deg);transform-origin:left bottom}`,
      `${selector} [data-pica-figure] > b{position:absolute;top:-0.5em;right:-0.5em;width:1em;height:1em;background:${accent}}`,
      `${selector} [data-pica-figure] > strong{display:block;font-size:clamp(2.6rem,6.5vw,5.25rem);font-weight:800;line-height:0.95;letter-spacing:-0.02em;color:${fg}}`,
      `${selector} [data-pica-figure] > span{font-family:${GRID_FONT};font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;color:${muted}}`,
      `${selector} [data-pica-tones]{display:flex;height:0.55em;margin-top:0.55em}`,
      `${selector} [data-pica-tones] > i{flex:1}`,
      `${selector} [data-pica-tones] > i:nth-child(1){background:${fg}}`,
      `${selector} [data-pica-tones] > i:nth-child(2){background:${muted}}`,
      `${selector} [data-pica-tones] > i:nth-child(3){background:${accent}}`,
      `${selector} [data-pica-tones] > i:nth-child(4){background:${bg};box-shadow:inset 0 0 0 1px ${hairline}}`
    ].join("\n");
  }
  function renderActions(container, actions) {
    container.replaceChildren();
    for (const [i, action] of actions.slice(0, MAX_ACTIONS).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.dataset.variant = i === 0 ? "solid" : "outline";
      a.href = action.href;
      a.textContent = action.label;
      container.append(a);
    }
  }
  function fillBand(band, ticker) {
    for (const item of Array.from(band.querySelectorAll(":scope > span"))) item.remove();
    for (let i = 0; ticker && i < TICKER_ITEMS; i++) {
      const item = document.createElement("span");
      item.textContent = ticker;
      const sep = document.createElement("em");
      sep.setAttribute("aria-hidden", "true");
      sep.textContent = "  ·  ";
      item.append(sep);
      band.append(item);
    }
  }
  function mountBand(host, where, p) {
    const el = document.createElement("div");
    el.setAttribute("data-pica", "");
    el.setAttribute("data-pica-band", where);
    el.setAttribute("aria-hidden", "true");
    fillBand(el, p.ticker);
    el.style.display = p.ticker ? "" : "none";
    const instance = mount3(el, bandProps(p, where === "top" ? "left" : "right"));
    return { el, instance };
  }
  function part(tag, name) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    node.setAttribute(`data-pica-${name}`, "");
    return node;
  }
  var mount4 = (host, initial = {}) => {
    let props = { ...defaults4, ...initial };
    const sheet2 = scope(host);
    const attrs = hostAttributes(host);
    let destroyed = false;
    const veilLayer = layer(host, "under");
    veilLayer.el.setAttribute("data-pica-veil", "");
    const dotsLayer = layer(host, "under");
    const wavesLayer = layer(host, "under");
    wavesLayer.el.style.opacity = fieldOpacity(props.intensity);
    const dots = mount2(dotsLayer.el, dotsProps(props));
    const waves = mount(wavesLayer.el, wavesProps(props));
    const stack = document.createElement("div");
    stack.setAttribute("data-pica", "");
    stack.setAttribute("data-pica-stack", "");
    const kicker = document.createElement("div");
    kicker.setAttribute("data-pica", "");
    kicker.setAttribute("data-pica-kicker", "");
    const tick = document.createElement("b");
    tick.setAttribute("aria-hidden", "true");
    const kickerText = document.createElement("span");
    kickerText.textContent = props.kicker;
    const kickerLine = document.createElement("i");
    kickerLine.setAttribute("aria-hidden", "true");
    const kickerTag = document.createElement("span");
    kickerTag.setAttribute("aria-hidden", "true");
    kickerTag.textContent = "Two fields · four tones";
    kicker.append(tick, kickerText, kickerLine, kickerTag);
    kicker.style.display = props.kicker ? "" : "none";
    const headline = document.createElement("h1");
    headline.setAttribute("data-pica", "");
    headline.setAttribute("data-pica-headline", "");
    const headlineChip = document.createElement("span");
    const headlineText = document.createElement("i");
    headlineText.textContent = props.headline;
    headlineChip.append(headlineText);
    headline.append(headlineChip);
    headline.style.display = props.headline ? "" : "none";
    const subhead = document.createElement("p");
    subhead.setAttribute("data-pica", "");
    subhead.setAttribute("data-pica-subhead", "");
    subhead.textContent = props.subhead;
    subhead.style.display = props.subhead ? "" : "none";
    stack.append(kicker, headline, subhead);
    const board = part("div", "board");
    const indexBox = part("div", "index");
    const indexHead = document.createElement("div");
    indexHead.setAttribute("data-pica", "");
    const indexTick = document.createElement("b");
    indexTick.setAttribute("aria-hidden", "true");
    const indexTitleEl = document.createElement("span");
    const indexRule = document.createElement("i");
    indexRule.setAttribute("aria-hidden", "true");
    const indexCount = document.createElement("span");
    indexHead.append(indexTick, indexTitleEl, indexRule, indexCount);
    const indexList = document.createElement("ul");
    indexBox.append(indexHead, indexList);
    const figureBox = part("div", "figure");
    const figureTab = document.createElement("b");
    figureTab.setAttribute("aria-hidden", "true");
    const figureText = document.createElement("strong");
    const figureCaption = document.createElement("span");
    const tones = part("span", "tones");
    tones.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 4; i++) {
      const cell = document.createElement("i");
      cell.setAttribute("data-pica", "");
      tones.append(cell);
    }
    figureBox.append(figureTab, figureText, figureCaption, tones);
    board.append(indexBox, figureBox);
    const actions = document.createElement("div");
    actions.setAttribute("data-pica", "");
    actions.setAttribute("data-pica-actions", "");
    const corners = document.createElement("div");
    corners.setAttribute("data-pica", "");
    corners.setAttribute("data-pica-corners", "");
    corners.setAttribute("aria-hidden", "true");
    const rail = document.createElement("div");
    rail.setAttribute("data-pica", "");
    rail.setAttribute("data-pica-rail", "");
    rail.setAttribute("aria-hidden", "true");
    rail.textContent = props.kicker;
    rail.style.display = props.kicker ? "" : "none";
    const bandTop = mountBand(host, "top", props);
    const bandBottom = mountBand(host, "bottom", props);
    host.prepend(stack);
    host.prepend(bandTop.el);
    stack.after(board);
    host.append(actions, bandBottom.el, corners, rail);
    function renderIndex() {
      indexTitleEl.textContent = props.indexTitle;
      const rows = props.index.slice(0, MAX_INDEX);
      indexCount.textContent = rows.length ? `01–${String(rows.length).padStart(2, "0")}` : "";
      indexList.replaceChildren();
      for (const [i, label] of rows.entries()) {
        const li = document.createElement("li");
        li.setAttribute("data-pica", "");
        const n = document.createElement("b");
        n.textContent = String(i + 1).padStart(2, "0");
        const text = document.createElement("span");
        text.textContent = label;
        li.append(n, text);
        indexList.append(li);
      }
      indexBox.style.display = rows.length || props.indexTitle ? "" : "none";
    }
    function renderFigure() {
      figureText.textContent = props.figure;
      figureCaption.textContent = props.caption;
      figureCaption.style.display = props.caption ? "" : "none";
      figureBox.style.display = props.figure || props.caption ? "" : "none";
    }
    function syncBoard() {
      const empty = !props.figure && !props.caption && props.index.length === 0 && !props.indexTitle;
      board.style.display = empty ? "none" : "";
      attrs.set("data-pica-plain", empty ? "" : null);
    }
    function measure() {
      attrs.set("data-pica-fit", host.clientWidth < FIT_MIN ? "min" : null);
    }
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    sheet2.setRules(rules(sheet2.selector, props));
    renderActions(actions, props.actions);
    renderIndex();
    renderFigure();
    syncBoard();
    measure();
    observer?.observe(host);
    host.dataset.picaReady = "true";
    function syncBand(band) {
      fillBand(band.el, props.ticker);
      band.el.style.display = props.ticker ? "" : "none";
    }
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (changed(before, props, ["paused", "time", "seed"])) {
          const motion = { paused: props.paused, time: props.time, seed: props.seed };
          waves.update(wavesProps(props));
          bandTop.instance.update(motion);
          bandBottom.instance.update(motion);
        }
        if (props.intensity !== before.intensity) {
          wavesLayer.el.style.opacity = fieldOpacity(props.intensity);
          dots.update({ strength: dotStrength(props.intensity) });
        }
        if (props.align !== before.align || props.minHeight !== before.minHeight) {
          sheet2.setRules(rules(sheet2.selector, props));
        }
        if (props.headline !== before.headline) {
          headlineText.textContent = props.headline;
          headline.style.display = props.headline ? "" : "none";
        }
        if (props.subhead !== before.subhead) {
          subhead.textContent = props.subhead;
          subhead.style.display = props.subhead ? "" : "none";
        }
        if (props.kicker !== before.kicker) {
          kickerText.textContent = props.kicker;
          rail.textContent = props.kicker;
          kicker.style.display = props.kicker ? "" : "none";
          rail.style.display = props.kicker ? "" : "none";
        }
        if (props.ticker !== before.ticker) {
          syncBand(bandTop);
          syncBand(bandBottom);
        }
        if (props.indexTitle !== before.indexTitle || !sameJson(before.index, props.index)) renderIndex();
        if (props.figure !== before.figure || props.caption !== before.caption) renderFigure();
        if (changed(before, props, ["figure", "caption", "indexTitle"]) || !sameJson(before.index, props.index)) syncBoard();
        if (!sameJson(before.actions, props.actions)) renderActions(actions, props.actions);
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        observer?.disconnect();
        waves.destroy();
        dots.destroy();
        bandTop.instance.destroy();
        bandBottom.instance.destroy();
        wavesLayer.remove();
        dotsLayer.remove();
        veilLayer.remove();
        bandTop.el.remove();
        bandBottom.el.remove();
        stack.remove();
        board.remove();
        actions.remove();
        corners.remove();
        rail.remove();
        sheet2.destroy();
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
  var instance = PicaMaximalistHero.mount(host, take(window.PICA_PROPS || {}));
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
