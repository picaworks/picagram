# Sketch Hero

> A hero still being drawn, with hatched fills, overshot construction lines, and working annotations behind the content.

Category: sections. Tags: hero, sketch, construction, crosshatch, section, landing. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 7.9 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/sketch-hero.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `headline` | string | `"Still being drawn."` | The headline, set large in the page's own font. Empty hides it. |
| `subhead` | string | `"Hatched fills, overshot construction lines, and notes in a working hand, behind the page's own content."` | Supporting copy under the headline, in the muted color. Empty hides it. |
| `actions` | readonly SketchHeroAction[] | `[{"label":"See the method","href":"#method"},{"label":"All components","href":"#components"}]` | Calls to action, drawn as links in source order. At most three: the first draws solid, the rest outline. |
| `align` | "start" \| "center" | `"start"` | Horizontal alignment of the content column within the host. |
| `minHeight` | number | `72` | The host's minimum height, in percent of the viewport height. |
| `src` | string | `""` | Image URL or data URI for the figure, hatched by a composed crosshatch image. Empty draws a built-in sphere study. |
| `alt` | string | `""` | Text alternative for the figure image. Empty marks it decorative. |
| `fit` | "cover" \| "contain" | `"cover"` | How the figure image fits its square: "cover" fills and crops, "contain" fits whole. |
| `density` | number | `0.5` | How densely the hatching is worked, from 0 open to 1 tight. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with `--pica-fg`, `--pica-muted`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Sketch Hero · sketch-hero
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

// registry/dither/dither-crosshatch-image/core.ts
const ditherCrosshatchImage = (() => {
interface DitherCrosshatchImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" hatches the bright pixels; "dark-on-light" hatches the dark ones. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** How many hatch layers can switch on, from a single wash to a dense mesh. */
  layers: number;
  /** Distance between the strokes of one layer, in CSS pixels. */
  spacing: number;
  /** Angle of each layer's strokes, in degrees, one entry per layer. */
  angles: readonly number[];
  /** Stroke thickness in CSS pixels. */
  weight: number;
  /** How far a stroke wanders from a straight line, 0 to 1. */
  jitter: number;
  /** Seed for the jitter, so the same seed always draws the same picture. */
  seed: number;
}

const defaults: DitherCrosshatchImageProps = {
  src: "",
  alt: "",
  fit: "cover",
  tone: "auto",
  contrast: 1.1,
  layers: 3,
  spacing: 6,
  angles: [45, 135, 0, 90],
  weight: 1,
  jitter: 0.3,
  seed: 1,
};

const mount: Mount<DitherCrosshatchImageProps> = (host, initial = {}) => {
  let props: DitherCrosshatchImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  const sampler = createSampler();
  const surface = createCanvas(host, { onResize: () => draw() });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const palette = watchPalette(host, () => draw());

  function load(): void {
    cancel();
    failed = false;
    cancel = loadSource(props.src, use, () => {
      source = null;
      failed = true;
      draw();
    });
  }

  function use(next: Source): void {
    source = next;
    // A host with no height of its own takes the image's proportions.
    undoAspect();
    undoAspect = fitHostAspect(host, next.width, next.height);
    draw();
  }

  function setNote(on: boolean): void {
    if (on && !removeNote) removeNote = showNote(host, "image unavailable");
    if (!on && removeNote) {
      removeNote();
      removeNote = null;
    }
  }

  function draw(): void {
    const w = surface.cssWidth;
    const h = surface.cssHeight;
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
    }
    setNote(failed);
    if (ctx && source && !failed) {
      const spacing = props.spacing > 0 ? props.spacing : 1;
      // One tone sample per half a stroke's spacing: fine enough that a threshold crossing falls where the
      // picture actually changes, coarse enough that the pass stays quick at any host size.
      const cell = Math.max(1, spacing / 2);
      const cols = Math.max(1, Math.round(w / cell));
      const rows = Math.max(1, Math.round(h / cell));
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols, rows, aspect: 1, n: 1, fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      // Bilinear tone at any point in the host, so a stroke can be tested part way between two samples
      // instead of snapping to the nearest one.
      const toneAt = (x: number, y: number): number => {
        const bx = Math.min(cols - 1, Math.max(0, x / cell));
        const by = Math.min(rows - 1, Math.max(0, y / cell));
        const x0 = Math.floor(bx);
        const y0 = Math.floor(by);
        const x1 = Math.min(cols - 1, x0 + 1);
        const y1 = Math.min(rows - 1, y0 + 1);
        const tx = bx - x0;
        const ty = by - y0;
        const v00 = ink[y0 * cols + x0] ?? 0;
        const v10 = ink[y0 * cols + x1] ?? 0;
        const v01 = ink[y1 * cols + x0] ?? 0;
        const v11 = ink[y1 * cols + x1] ?? 0;
        return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
      };
      const count = Math.min(4, Math.max(1, Math.round(props.layers)));
      const angleList = props.angles.length > 0 ? props.angles : defaults.angles;
      const weight = props.weight > 0 ? props.weight : 1;
      const amount = Math.min(1, Math.max(0, props.jitter));
      // A step much smaller than the spacing, so a threshold edge and a jitter wobble both fall on a stroke
      // rather than between two tested points.
      const step = Math.max(1.5, spacing / 3);
      const corners: [number, number][] = [[0, 0], [w, 0], [0, h], [w, h]];
      ctx.strokeStyle = palette.colors.fg;
      ctx.lineWidth = weight;
      ctx.lineCap = "round";
      for (let i = 0; i < count; i++) {
        // Spread across the tone range, never at its ends, so no pixel switches on every layer at once and
        // the brightest ground never takes ink at all. Nesting comes for free: a tone that clears layer 3's
        // threshold also clears layers 0 through 2, so every lighter layer's strokes stay right where they were.
        const band = (i + 1) / (count + 1);
        const angle = ((angleList[i % angleList.length] ?? 0) * Math.PI) / 180;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        // This layer's own axes: u runs along a stroke, v crosses from one stroke to the next. Rotating the
        // host's own corners into that frame says how many strokes cross it and how long each one runs.
        let uMin = Infinity;
        let uMax = -Infinity;
        let vMin = Infinity;
        let vMax = -Infinity;
        for (const [cx, cy] of corners) {
          const pu = cx * cosA + cy * sinA;
          const pv = -cx * sinA + cy * cosA;
          if (pu < uMin) uMin = pu;
          if (pu > uMax) uMax = pu;
          if (pv < vMin) vMin = pv;
          if (pv > vMax) vMax = pv;
        }
        const kMin = Math.floor(vMin / spacing) - 1;
        const kMax = Math.ceil(vMax / spacing) + 1;
        ctx.beginPath();
        for (let k = kMin; k <= kMax; k++) {
          // Each stroke gets its own wobble, seeded from the layer and the stroke's own index, so neighboring
          // strokes never wander in lockstep.
          const rng = createRng(hashSeed(props.seed, i, k));
          const freq = 0.01 + rng() * 0.015;
          const phase = rng() * Math.PI * 2;
          const amp = amount * spacing * 0.3;
          const v = k * spacing;
          let drawing = false;
          for (let u = uMin; u <= uMax + step; u += step) {
            const wobble = amp > 0 ? Math.sin(u * freq + phase) * amp : 0;
            const vv = v + wobble;
            const x = u * cosA - vv * sinA;
            const y = u * sinA + vv * cosA;
            // The pen lifts wherever the tone falls short of this layer's threshold, so the mesh thins out
            // and stops on its own: no separate outline carries the subject's silhouette.
            const on = x >= 0 && x <= w && y >= 0 && y <= h && toneAt(x, y) >= band;
            if (on) {
              if (drawing) ctx.lineTo(x, y);
              else {
                ctx.moveTo(x, y);
                drawing = true;
              }
            } else {
              drawing = false;
            }
          }
        }
        ctx.stroke();
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
      palette.refresh();
      labelHost(host, props.alt);
      if (props.src !== before.src) load();
      else draw();
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

// registry/sections/sketch-hero/core.ts
/** One call to action: a link's visible text and destination. */
export interface SketchHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface SketchHeroProps extends MotionProps {
  /** The headline, set large in the page's own font. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline, in the muted color. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as links in source order. At most three: the first draws solid, the rest outline. */
  actions: readonly SketchHeroAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** Image URL or data URI for the figure, hatched by a composed crosshatch image. Empty draws a built-in sphere study. */
  src: string;
  /** Text alternative for the figure image. Empty marks it decorative. */
  alt: string;
  /** How the figure image fits its square: "cover" fills and crops, "contain" fits whole. */
  fit: "cover" | "contain";
  /** How densely the hatching is worked, from 0 open to 1 tight. */
  density: number;
}

export const defaults: SketchHeroProps = {
  headline: "Still being drawn.",
  subhead: "Hatched fills, overshot construction lines, and notes in a working hand, behind the page's own content.",
  actions: [
    { label: "See the method", href: "#method" },
    { label: "All components", href: "#components" },
  ],
  align: "start",
  minHeight: 72,
  src: "",
  alt: "",
  fit: "cover",
  density: 0.5,
  paused: false,
  time: null,
  seed: 1,
};

/** Animation time shown under reduced motion, in milliseconds. */
const STILL_TIME = 1200;
/** Milliseconds one drawing of the sketch holds before the lines jump to a fresh jitter, the boil that keeps
 *  them feeling drawn rather than plotted. */
const BOIL_MS = 140;
/** The deepest a jittered vertex strays from where a straightedge would put it, in CSS pixels. */
const JITTER = 1.1;
/** Frames per second the boil runs at: one fresh drawing a step, slow enough to read as a hand at work. */
const BOIL_FPS = 7;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** A seeded jitter stream for one sketch element at one boil frame, so the same seed and animation time
 *  always draw the same sketch. */
function elementRng(seed: number, boil: number, index: number): () => number {
  return createRng(hashSeed(seed, boil, index));
}

/** One working stroke between two points: subdivided, with every vertex nudged a pixel or so off its true
 *  position, so the line reads as drawn by a hand rather than plotted. */
function stroke(
  c: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rng: () => number,
  amp = JITTER,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = Math.max(2, Math.round(len / 18));
  c.beginPath();
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const off = (rng() * 2 - 1) * amp;
    const along = (rng() * 2 - 1) * amp * 0.7;
    const x = x1 + dx * p + nx * off + (dx / len) * along;
    const y = y1 + dy * p + ny * off + (dy / len) * along;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
}

/** An ellipse traced as a jittered polyline, in full or in part for a restated arc. */
function trace(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rng: () => number,
  amp: number,
  a0 = 0,
  a1 = Math.PI * 2,
): void {
  const span = a1 - a0;
  const steps = Math.max(16, Math.round((Math.max(rx, ry) * Math.abs(span)) / 9));
  c.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (span * i) / steps;
    const x = cx + Math.cos(a) * rx + (rng() * 2 - 1) * amp;
    const y = cy + Math.sin(a) * ry + (rng() * 2 - 1) * amp;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
}

interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Hatching by the same method as dither-crosshatch-image: strokes march across the region at one angle,
 *  each on a wobble of its own, and the pen lifts wherever the tone under it falls short of the layer's
 *  threshold, so density carries tone. */
function hatch(
  c: CanvasRenderingContext2D,
  angleDeg: number,
  spacing: number,
  bounds: Bounds,
  on: (x: number, y: number) => boolean,
  rng: () => number,
  amp: number,
): void {
  const angle = (angleDeg * Math.PI) / 180;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  const corners: readonly (readonly [number, number])[] = [
    [bounds.x0, bounds.y0],
    [bounds.x1, bounds.y0],
    [bounds.x0, bounds.y1],
    [bounds.x1, bounds.y1],
  ];
  for (const [px, py] of corners) {
    const u = px * ca + py * sa;
    const v = -px * sa + py * ca;
    if (u < uMin) uMin = u;
    if (u > uMax) uMax = u;
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }
  const step = Math.max(1.5, spacing / 3);
  c.beginPath();
  for (let k = Math.floor(vMin / spacing) - 1; k <= Math.ceil(vMax / spacing) + 1; k++) {
    const freq = 0.006 + rng() * 0.014;
    const phase = rng() * Math.PI * 2;
    const wob = amp * spacing * 0.22;
    let drawing = false;
    for (let u = uMin; u <= uMax + step; u += step) {
      const v = k * spacing + Math.sin(u * freq + phase) * wob;
      const x = u * ca - v * sa + (rng() * 2 - 1) * amp * 0.5;
      const y = u * sa + v * ca + (rng() * 2 - 1) * amp * 0.5;
      if (x >= bounds.x0 && x <= bounds.x1 && y >= bounds.y0 && y <= bounds.y1 && on(x, y)) {
        if (drawing) c.lineTo(x, y);
        else {
          c.moveTo(x, y);
          drawing = true;
        }
      } else {
        drawing = false;
      }
    }
  }
  c.stroke();
}

/** One small annotation in the working hand, jittered like everything else. */
function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, rng: () => number): void {
  c.fillText(s, x + (rng() - 0.5) * 0.9, y + (rng() - 0.5) * 0.9);
}

/** A note and its leader rule to the thing it names, ended in a small open mark. */
function note(
  c: CanvasRenderingContext2D,
  s: string,
  lx: number,
  ly: number,
  tx: number,
  ty: number,
  rng: () => number,
): void {
  c.globalAlpha = 0.7;
  stroke(c, lx - 5, ly - 3, tx, ty, rng, 0.5);
  trace(c, tx, ty, 1.8, 1.8, rng, 0.25);
  c.globalAlpha = 1;
  text(c, s, lx, ly, rng);
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** Layout for the host and the grammar for its calls to action. Prose keeps the page's font; mono stays on
 *  the canvas with the annotations. The solid link paints its background from currentColor, so the fg
 *  fallback resolves to the link's own color, and its label span inverts it back to a readable ink. The
 *  minimum height goes in a :where() rule, which carries no specificity at all, so a page that gives this
 *  host a height of its own wins. */
function rules(s: string, p: SketchHeroProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const onFg = cssOn("fg");
  const center = p.align === "center";
  const edge = center ? "center" : "flex-start";
  const textAlign = center ? "center" : "start";
  const tint = `color-mix(in srgb, ${fg} 10%, transparent)`;
  return [
    `:where(${s}){min-height:${vh(p.minHeight)}vh}`,
    `${s}{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${edge};gap:0.9em;padding:clamp(1.5rem,6vw,5rem);color:${fg};text-align:${textAlign}}`,
    `${s} > :not([data-pica]){margin-block:0;text-align:${textAlign}}`,
    `${s} > :not([data-pica]):not(:is(h1,h2,h3)){max-width:44rem}`,
    `${s} > p:not([data-pica]){color:${muted}}`,
    `${s} > :is(h1,h2,h3){margin-block:0;max-width:14em;font-size:clamp(2.4rem,6vw,4.6rem);line-height:1.05;font-weight:600;letter-spacing:-0.02em;color:${fg};text-wrap:balance;overflow-wrap:break-word}`,
    `${s} > :is(h1,h2,h3):empty{display:none}`,
    `${s} > [data-pica-subhead]{margin-block:0;max-width:52ch;font-size:clamp(1rem,1.4vw,1.15rem);line-height:1.55;color:${muted};overflow-wrap:break-word}`,
    `${s} > [data-pica-subhead]:empty{display:none}`,
    `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;margin-top:0.8em;justify-content:${edge}}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.3em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]{background:currentColor;color:${fg};border-color:transparent}`,
    `${s} > [data-pica-actions] a[data-variant="solid"] > [data-pica-label]{color:${onFg}}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${fg} 86%, transparent)}`,
    `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:${tint};border-color:${fg}}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

export const mount: Mount<SketchHeroProps> = (host, initial = {}) => {
  let props: SketchHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const under = layer(host, "under");

  // The bounded host the composed figure mounts into when src is set. The sketch canvas covers the whole
  // under layer on top of it, so the construction lines and notes draw over the image the way they would
  // over any figure on the page.
  const figure = document.createElement("div");
  figure.setAttribute("data-pica", "");
  figure.style.cssText = "position:absolute;display:none";
  under.el.append(figure);

  let w = 1;
  let h = 1;
  let m = 24;
  let cx = 0;
  let cy = 0;
  let radius = 60;

  function layout(): void {
    w = Math.max(1, surface.cssWidth);
    h = Math.max(1, surface.cssHeight);
    m = clamp(Math.min(w, h) * 0.05, 18, 44);
    const wide = w >= 700;
    // On a phone the content column fills the width, so the study shrinks and drops into the lower corner,
    // clear of the calls to action. On a wide page it holds the right hand side at full size.
    radius = clamp(Math.min(w, h) * (wide ? 0.16 : 0.13), 34, 150);
    cx = wide ? w * 0.7 : w * 0.68;
    cy = wide ? h * 0.52 : h * 0.76;
    cx = clamp(cx, m + radius + 6, w - m - radius - 6);
    cy = clamp(cy, m + radius + 6, h - m - radius * 1.5);
    figure.style.left = `${cx - radius}px`;
    figure.style.top = `${cy - radius}px`;
    figure.style.width = `${radius * 2}px`;
    figure.style.height = `${radius * 2}px`;
  }

  const surface = createCanvas(under.el, {
    onResize: () => {
      layout();
      loop.redraw();
    },
  });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => loop.redraw());

  const headlineEl = document.createElement("h1");
  headlineEl.setAttribute("data-pica", "");
  const subheadEl = document.createElement("p");
  subheadEl.setAttribute("data-pica", "");
  subheadEl.setAttribute("data-pica-subhead", "");
  const actionsEl = document.createElement("div");
  actionsEl.setAttribute("data-pica", "");
  actionsEl.setAttribute("data-pica-actions", "");
  host.append(headlineEl, subheadEl, actionsEl);

  let child: ReturnType<typeof ditherCrosshatchImage.mount> | null = null;

  /** Props forwarded to the composed figure: its own seed, its own jitter, and a stroke spacing that follows
   *  this section's density so the two hatches agree. */
  function figureProps(): Partial<typeof ditherCrosshatchImage.defaults> {
    return {
      src: props.src,
      alt: props.alt,
      fit: props.fit,
      seed: props.seed,
      spacing: 10.5 - clamp(props.density, 0, 1) * 5,
      jitter: 0.45,
      layers: 3,
      contrast: 1.05,
    };
  }

  /** Mounts, updates, or removes the figure as src comes and goes. */
  function renderFigure(): void {
    if (props.src.trim() !== "") {
      figure.style.display = "";
      if (child) child.update(figureProps());
      else child = ditherCrosshatchImage.mount(figure, figureProps());
    } else {
      if (child) {
        child.destroy();
        child = null;
      }
      figure.style.display = "none";
    }
  }

  /** Rebuilds the action links from JSON: the first solid in the page's ink, the rest outline. */
  function renderActions(): void {
    actionsEl.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.href = action.href;
      if (i === 0) {
        a.dataset.variant = "solid";
        const label = document.createElement("span");
        label.setAttribute("data-pica", "");
        label.setAttribute("data-pica-label", "");
        label.textContent = action.label;
        a.append(label);
      } else {
        a.dataset.variant = "outline";
        a.textContent = action.label;
      }
      actionsEl.append(a);
    }
  }

  function draw(t: number): void {
    const c = ctx;
    if (!c || w < 8 || h < 8) {
      host.dataset.picaReady = "true";
      return;
    }
    const boil = Math.floor(Math.max(0, t) / BOIL_MS);
    const rng = (i: number): (() => number) => elementRng(props.seed, boil, i);
    const colors = palette.colors;
    const image = child !== null;
    const spacing = 9.5 - clamp(props.density, 0, 1) * 5;
    const skew = (rng(0)() - 0.5) * 6;
    let el = 1;
    const box: Bounds = { x0: cx - radius, y0: cy - radius, x1: cx + radius, y1: cy + radius };

    c.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.lineWidth = 1;
    c.lineCap = "round";
    c.lineJoin = "round";

    // The page frame, each edge carried past the corners it defines, with the top and left edges restated
    // once at a lower strength, the way a hand goes back over a line.
    const over = clamp(m * 0.7, 10, 26);
    c.strokeStyle = colors.muted;
    c.globalAlpha = 0.85;
    stroke(c, m - over, m, w - m + over, m, rng(el++));
    stroke(c, w - m, m - over, w - m, h - m + over, rng(el++));
    stroke(c, w - m + over, h - m, m - over, h - m, rng(el++));
    stroke(c, m, h - m + over, m, m - over, rng(el++));
    c.globalAlpha = 0.3;
    stroke(c, m - over * 0.6, m + 2.5, w - m + over * 0.6, m + 2.5, rng(el++));
    stroke(c, m + 2.5, h - m + over * 0.6, m + 2.5, m - over * 0.6, rng(el++));

    // The figure's construction: a bounding square overshot at its corners, the two centerlines, and one
    // diagonal sight line, all left visible.
    const ob = Math.min(18, radius * 0.18);
    c.globalAlpha = 0.55;
    stroke(c, box.x0 - ob, box.y0, box.x1 + ob, box.y0, rng(el++));
    stroke(c, box.x1, box.y0 - ob, box.x1, box.y1 + ob, rng(el++));
    stroke(c, box.x1 + ob, box.y1, box.x0 - ob, box.y1, rng(el++));
    stroke(c, box.x0, box.y1 + ob, box.x0, box.y0 - ob, rng(el++));
    c.globalAlpha = 0.4;
    stroke(c, cx, box.y0 - radius * 0.5, cx, box.y1 + radius * 0.5, rng(el++));
    stroke(c, box.x0 - radius * 0.5, cy, box.x1 + radius * 0.5, cy, rng(el++));
    stroke(c, box.x0 - radius * 0.25, box.y1 + radius * 0.25, box.x1 + radius * 0.25, box.y0 - radius * 0.25, rng(el++));

    if (!image) {
      // The study itself: a sphere lit from the upper left over a cast shadow, worked in two hatch angles
      // whose density carries the tone.
      const sx = cx + radius * 0.42;
      const sy = cy + radius * 1.18;
      const srx = radius * 1.02;
      const sry = radius * 0.26;
      const inSphere = (x: number, y: number): boolean => {
        const nx = (x - cx) / radius;
        const ny = (y - cy) / radius;
        return nx * nx + ny * ny <= 1;
      };
      const tone = (x: number, y: number): number => {
        const nx = (x - cx) / radius;
        const ny = (y - cy) / radius;
        return clamp(0.58 + nx * 0.46 + ny * 0.5, 0, 1);
      };
      const shadowBounds: Bounds = { x0: box.x0 - radius * 0.2, y0: box.y0, x1: box.x1 + radius * 0.5, y1: box.y1 + radius * 0.55 };
      c.strokeStyle = colors.fg;
      c.globalAlpha = 0.5;
      hatch(c, -38 + skew, spacing * 1.2, shadowBounds, (x, y) => {
        const ex = (x - sx) / srx;
        const ey = (y - sy) / sry;
        const e = ex * ex + ey * ey;
        return e <= 1 && 0.78 - e * 0.55 >= 0.4;
      }, rng(el++), 0.8);
      c.globalAlpha = 0.78;
      hatch(c, -38 + skew, spacing, box, (x, y) => inSphere(x, y) && tone(x, y) >= 0.4, rng(el++), 1);
      c.globalAlpha = 0.85;
      hatch(c, 52 + skew, spacing, box, (x, y) => inSphere(x, y) && tone(x, y) >= 0.66, rng(el++), 1);
      c.strokeStyle = colors.muted;
      c.globalAlpha = 0.55;
      trace(c, sx, sy, srx, sry, rng(el++), 0.8);
    }

    // The figure's outline, restated once partway around. It stays when an image mounts, as the
    // construction the image is being drawn into.
    c.strokeStyle = colors.fg;
    c.globalAlpha = 0.9;
    trace(c, cx, cy, radius * 0.98, radius * 0.98, rng(el++), 0.9);
    c.globalAlpha = 0.35;
    trace(c, cx, cy, radius * 1.015, radius * 1.015, rng(el++), 0.9, -0.5, Math.PI * 1.15);

    // The light's direction is the one accent, named in the working hand.
    const ax = cx - radius * 1.55;
    const ay = cy - radius * 1.38;
    const ax2 = cx - radius * 1.08;
    const ay2 = cy - radius * 0.9;
    c.strokeStyle = colors.accent;
    c.globalAlpha = 1;
    stroke(c, ax, ay, ax2, ay2, rng(el++), 0.8);
    const head = Math.atan2(ay2 - ay, ax2 - ax);
    const hl = Math.min(15, radius * 0.18);
    stroke(c, ax2, ay2, ax2 - Math.cos(head - 0.5) * hl, ay2 - Math.sin(head - 0.5) * hl, rng(el++), 0.4);
    stroke(c, ax2, ay2, ax2 - Math.cos(head + 0.5) * hl, ay2 - Math.sin(head + 0.5) * hl, rng(el++), 0.4);
    c.font = `10px ${GRID_FONT}`;
    c.fillStyle = colors.accent;
    text(c, "light", ax - 4, ay - 9, rng(el++));

    // The working notes, each in small mono with a leader rule to the thing it names.
    c.fillStyle = colors.muted;
    c.strokeStyle = colors.muted;
    const notes: readonly (readonly [string, number, number, number, number])[] = [
      ["fig.01", cx - radius * 0.35, box.y1 + radius * 0.66 + 12, cx - radius * 0.1, box.y1],
      ["tone", box.x1 + radius * 0.3, cy + radius * 0.75, cx + radius * 0.62, cy + radius * 0.62],
      ["edge", w - m - 40, m + 18, w - m - 2, m + 3],
    ];
    for (const [s, lx0, ly0, tx, ty] of notes) {
      const lx = clamp(lx0, m + 8, w - m - 8 - s.length * 6.5);
      const ly = clamp(ly0, m + 16, h - m - 6);
      note(c, s, lx, ly, tx, ty, rng(el++));
    }

    c.globalAlpha = 1;
    host.dataset.picaReady = "true";
  }

  layout();
  renderFigure();
  sheet.setRules(rules(sheet.selector, props));
  headlineEl.textContent = props.headline;
  subheadEl.textContent = props.subhead;
  renderActions();
  const loop = createLoop({ el: host, fps: BOIL_FPS, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.align !== before.align || props.minHeight !== before.minHeight) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (props.headline !== before.headline) headlineEl.textContent = props.headline;
      if (props.subhead !== before.subhead) subheadEl.textContent = props.subhead;
      if (!sameJson(before.actions, props.actions)) renderActions();
      palette.refresh();
      if (
        props.src !== before.src ||
        props.alt !== before.alt ||
        props.fit !== before.fit ||
        props.density !== before.density ||
        props.seed !== before.seed
      ) {
        renderFigure();
      }
      loop.update({ paused: props.paused, time: props.time });
      if (props.seed !== before.seed || props.density !== before.density || props.src !== before.src) loop.redraw();
    },
    destroy() {
      child?.destroy();
      child = null;
      loop.destroy();
      surface.destroy();
      palette.destroy();
      under.remove();
      headlineEl.remove();
      subheadEl.remove();
      actionsEl.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/sketch-hero/index.tsx
export type SketchHeroComponentProps = Partial<SketchHeroProps> & WrapperProps & { children?: ReactNode };

/** A page hero still being drawn: hatching, construction lines, and working notes behind the content. */
export function SketchHero({ className, style, palette, children, ...props }: SketchHeroComponentProps) {
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
  Pica · Sketch Hero · sketch-hero
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Sketch Hero · Pica</title>
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
<div id="pica"><p class="kicker">Figure study 09</p><h1>A page still being drawn.</h1><p>Hatched fills, overshot construction lines, and notes in a working hand, wrapped around real content.</p></div>
<script>
"use strict";
var PicaSketchHero = (() => {
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

  // registry/sections/sketch-hero/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults2,
    mount: () => mount2
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
    accent: "#e8a020",
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
  function readPalette(host) {
    const probe = createProbe(host);
    const colors = probeColors(probe);
    probe.remove();
    return colors;
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
  function relativeLuminance(color) {
    const [r, g, b] = parseColor(color);
    const linear = (v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  }
  function inkColor(host) {
    return readPalette(host).fg;
  }
  function hostTone(host) {
    const fg = relativeLuminance(inkColor(host));
    let bg = 1;
    for (let el = host; el; el = el.parentElement) {
      const background = getComputedStyle(el).backgroundColor;
      if (parseColor(background)[3] > 0) {
        bg = relativeLuminance(background);
        break;
      }
    }
    return fg > bg ? "light-on-dark" : "dark-on-light";
  }

  // lib/sample.ts
  function fitRect(sourceW, sourceH, boxW, boxH, fit, alignX = 0.5, alignY = 0.5) {
    const scale = fit === "cover" ? Math.max(boxW / sourceW, boxH / sourceH) : Math.min(boxW / sourceW, boxH / sourceH);
    const w = sourceW * scale;
    const h = sourceH * scale;
    return { x: (boxW - w) * alignX, y: (boxH - h) * alignY, w, h };
  }
  function createSampler() {
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
        const box = fitRect(sourceW, sourceH, o.cols * o.aspect, o.rows, o.fit, o.alignX, o.alignY);
        const toX = o.n / o.aspect;
        ctx.drawImage(source, box.x * toX, box.y * ny, box.w * toX, box.h * ny);
        const data = ctx.getImageData(0, 0, sw, sh).data;
        const lightOnDark = (o.tone === "auto" ? hostTone(host) : o.tone) === "light-on-dark";
        for (let p = 0; p < sw * sh; p++) {
          const i = p * 4;
          const alpha = (data[i + 3] ?? 0) / 255;
          const luma = (0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0)) / 255;
          const linear = Math.min(1, Math.max(0, (luma - 0.5) * o.contrast + 0.5)) ** 2.2;
          ink[p] = alpha * (lightOnDark ? linear : 1 - linear);
        }
        return ink;
      }
    };
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
  function showNote(host, text2) {
    const note2 = document.createElement("span");
    note2.setAttribute("data-pica", "");
    note2.setAttribute("aria-hidden", "true");
    note2.textContent = text2;
    note2.style.cssText = [
      "position:absolute",
      "inset:0",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "pointer-events:none",
      `color:${cssVar("muted")}`
    ].join(";");
    const restore = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
    host.appendChild(note2);
    return () => {
      note2.remove();
      restore();
    };
  }

  // registry/dither/dither-crosshatch-image/core.ts
  var defaults = {
    src: "",
    alt: "",
    fit: "cover",
    tone: "auto",
    contrast: 1.1,
    layers: 3,
    spacing: 6,
    angles: [45, 135, 0, 90],
    weight: 1,
    jitter: 0.3,
    seed: 1
  };
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let source = null;
    let failed = false;
    let cancel = () => void 0;
    let undoAspect = () => void 0;
    let removeNote = null;
    const sampler = createSampler();
    const surface = createCanvas(host, { onResize: () => draw() });
    const canvas = surface.canvas;
    const ctx = canvas.getContext("2d");
    const palette = watchPalette(host, () => draw());
    function load() {
      cancel();
      failed = false;
      cancel = loadSource(props.src, use, () => {
        source = null;
        failed = true;
        draw();
      });
    }
    function use(next) {
      source = next;
      undoAspect();
      undoAspect = fitHostAspect(host, next.width, next.height);
      draw();
    }
    function setNote(on) {
      if (on && !removeNote) removeNote = showNote(host, "image unavailable");
      if (!on && removeNote) {
        removeNote();
        removeNote = null;
      }
    }
    function draw() {
      const w = surface.cssWidth;
      const h = surface.cssHeight;
      if (ctx) {
        ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
      }
      setNote(failed);
      if (ctx && source && !failed) {
        const spacing = props.spacing > 0 ? props.spacing : 1;
        const cell = Math.max(1, spacing / 2);
        const cols = Math.max(1, Math.round(w / cell));
        const rows = Math.max(1, Math.round(h / cell));
        const ink = sampler.sample(source.image, source.width, source.height, host, {
          cols,
          rows,
          aspect: 1,
          n: 1,
          fit: fitFor(source, props.fit),
          tone: props.tone,
          contrast: props.contrast,
          mirror: false
        });
        const toneAt = (x, y) => {
          const bx = Math.min(cols - 1, Math.max(0, x / cell));
          const by = Math.min(rows - 1, Math.max(0, y / cell));
          const x0 = Math.floor(bx);
          const y0 = Math.floor(by);
          const x1 = Math.min(cols - 1, x0 + 1);
          const y1 = Math.min(rows - 1, y0 + 1);
          const tx = bx - x0;
          const ty = by - y0;
          const v00 = ink[y0 * cols + x0] ?? 0;
          const v10 = ink[y0 * cols + x1] ?? 0;
          const v01 = ink[y1 * cols + x0] ?? 0;
          const v11 = ink[y1 * cols + x1] ?? 0;
          return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
        };
        const count = Math.min(4, Math.max(1, Math.round(props.layers)));
        const angleList = props.angles.length > 0 ? props.angles : defaults.angles;
        const weight = props.weight > 0 ? props.weight : 1;
        const amount = Math.min(1, Math.max(0, props.jitter));
        const step = Math.max(1.5, spacing / 3);
        const corners = [[0, 0], [w, 0], [0, h], [w, h]];
        ctx.strokeStyle = palette.colors.fg;
        ctx.lineWidth = weight;
        ctx.lineCap = "round";
        for (let i = 0; i < count; i++) {
          const band = (i + 1) / (count + 1);
          const angle = (angleList[i % angleList.length] ?? 0) * Math.PI / 180;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          let uMin = Infinity;
          let uMax = -Infinity;
          let vMin = Infinity;
          let vMax = -Infinity;
          for (const [cx, cy] of corners) {
            const pu = cx * cosA + cy * sinA;
            const pv = -cx * sinA + cy * cosA;
            if (pu < uMin) uMin = pu;
            if (pu > uMax) uMax = pu;
            if (pv < vMin) vMin = pv;
            if (pv > vMax) vMax = pv;
          }
          const kMin = Math.floor(vMin / spacing) - 1;
          const kMax = Math.ceil(vMax / spacing) + 1;
          ctx.beginPath();
          for (let k = kMin; k <= kMax; k++) {
            const rng = createRng(hashSeed(props.seed, i, k));
            const freq = 0.01 + rng() * 0.015;
            const phase = rng() * Math.PI * 2;
            const amp = amount * spacing * 0.3;
            const v = k * spacing;
            let drawing = false;
            for (let u = uMin; u <= uMax + step; u += step) {
              const wobble = amp > 0 ? Math.sin(u * freq + phase) * amp : 0;
              const vv = v + wobble;
              const x = u * cosA - vv * sinA;
              const y = u * sinA + vv * cosA;
              const on = x >= 0 && x <= w && y >= 0 && y <= h && toneAt(x, y) >= band;
              if (on) {
                if (drawing) ctx.lineTo(x, y);
                else {
                  ctx.moveTo(x, y);
                  drawing = true;
                }
              } else {
                drawing = false;
              }
            }
          }
          ctx.stroke();
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
        palette.refresh();
        labelHost(host, props.alt);
        if (props.src !== before.src) load();
        else draw();
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

  // registry/sections/sketch-hero/core.ts
  var defaults2 = {
    headline: "Still being drawn.",
    subhead: "Hatched fills, overshot construction lines, and notes in a working hand, behind the page's own content.",
    actions: [
      { label: "See the method", href: "#method" },
      { label: "All components", href: "#components" }
    ],
    align: "start",
    minHeight: 72,
    src: "",
    alt: "",
    fit: "cover",
    density: 0.5,
    paused: false,
    time: null,
    seed: 1
  };
  var STILL_TIME = 1200;
  var BOIL_MS = 140;
  var JITTER = 1.1;
  var BOIL_FPS = 7;
  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }
  function elementRng(seed, boil, index) {
    return createRng(hashSeed(seed, boil, index));
  }
  function stroke(c, x1, y1, x2, y2, rng, amp = JITTER) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const steps = Math.max(2, Math.round(len / 18));
    c.beginPath();
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      const off = (rng() * 2 - 1) * amp;
      const along = (rng() * 2 - 1) * amp * 0.7;
      const x = x1 + dx * p + nx * off + dx / len * along;
      const y = y1 + dy * p + ny * off + dy / len * along;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  }
  function trace(c, cx, cy, rx, ry, rng, amp, a0 = 0, a1 = Math.PI * 2) {
    const span = a1 - a0;
    const steps = Math.max(16, Math.round(Math.max(rx, ry) * Math.abs(span) / 9));
    c.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = a0 + span * i / steps;
      const x = cx + Math.cos(a) * rx + (rng() * 2 - 1) * amp;
      const y = cy + Math.sin(a) * ry + (rng() * 2 - 1) * amp;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  }
  function hatch(c, angleDeg, spacing, bounds, on, rng, amp) {
    const angle = angleDeg * Math.PI / 180;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    let uMin = Infinity;
    let uMax = -Infinity;
    let vMin = Infinity;
    let vMax = -Infinity;
    const corners = [
      [bounds.x0, bounds.y0],
      [bounds.x1, bounds.y0],
      [bounds.x0, bounds.y1],
      [bounds.x1, bounds.y1]
    ];
    for (const [px, py] of corners) {
      const u = px * ca + py * sa;
      const v = -px * sa + py * ca;
      if (u < uMin) uMin = u;
      if (u > uMax) uMax = u;
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
    const step = Math.max(1.5, spacing / 3);
    c.beginPath();
    for (let k = Math.floor(vMin / spacing) - 1; k <= Math.ceil(vMax / spacing) + 1; k++) {
      const freq = 6e-3 + rng() * 0.014;
      const phase = rng() * Math.PI * 2;
      const wob = amp * spacing * 0.22;
      let drawing = false;
      for (let u = uMin; u <= uMax + step; u += step) {
        const v = k * spacing + Math.sin(u * freq + phase) * wob;
        const x = u * ca - v * sa + (rng() * 2 - 1) * amp * 0.5;
        const y = u * sa + v * ca + (rng() * 2 - 1) * amp * 0.5;
        if (x >= bounds.x0 && x <= bounds.x1 && y >= bounds.y0 && y <= bounds.y1 && on(x, y)) {
          if (drawing) c.lineTo(x, y);
          else {
            c.moveTo(x, y);
            drawing = true;
          }
        } else {
          drawing = false;
        }
      }
    }
    c.stroke();
  }
  function text(c, s, x, y, rng) {
    c.fillText(s, x + (rng() - 0.5) * 0.9, y + (rng() - 0.5) * 0.9);
  }
  function note(c, s, lx, ly, tx, ty, rng) {
    c.globalAlpha = 0.7;
    stroke(c, lx - 5, ly - 3, tx, ty, rng, 0.5);
    trace(c, tx, ty, 1.8, 1.8, rng, 0.25);
    c.globalAlpha = 1;
    text(c, s, lx, ly, rng);
  }
  function vh(minHeight) {
    return Math.min(100, Math.max(0, minHeight));
  }
  function rules(s, p) {
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    const onFg = cssOn("fg");
    const center = p.align === "center";
    const edge = center ? "center" : "flex-start";
    const textAlign = center ? "center" : "start";
    const tint = `color-mix(in srgb, ${fg} 10%, transparent)`;
    return [
      `:where(${s}){min-height:${vh(p.minHeight)}vh}`,
      `${s}{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${edge};gap:0.9em;padding:clamp(1.5rem,6vw,5rem);color:${fg};text-align:${textAlign}}`,
      `${s} > :not([data-pica]){margin-block:0;text-align:${textAlign}}`,
      `${s} > :not([data-pica]):not(:is(h1,h2,h3)){max-width:44rem}`,
      `${s} > p:not([data-pica]){color:${muted}}`,
      `${s} > :is(h1,h2,h3){margin-block:0;max-width:14em;font-size:clamp(2.4rem,6vw,4.6rem);line-height:1.05;font-weight:600;letter-spacing:-0.02em;color:${fg};text-wrap:balance;overflow-wrap:break-word}`,
      `${s} > :is(h1,h2,h3):empty{display:none}`,
      `${s} > [data-pica-subhead]{margin-block:0;max-width:52ch;font-size:clamp(1rem,1.4vw,1.15rem);line-height:1.55;color:${muted};overflow-wrap:break-word}`,
      `${s} > [data-pica-subhead]:empty{display:none}`,
      `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;margin-top:0.8em;justify-content:${edge}}`,
      `${s} > [data-pica-actions]:empty{display:none}`,
      `${s} > [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.3em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
      `${s} > [data-pica-actions] a[data-variant="solid"]{background:currentColor;color:${fg};border-color:transparent}`,
      `${s} > [data-pica-actions] a[data-variant="solid"] > [data-pica-label]{color:${onFg}}`,
      `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${fg} 86%, transparent)}`,
      `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:${tint};border-color:${fg}}`,
      `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`
    ].join("\n");
  }
  var mount2 = (host, initial = {}) => {
    let props = { ...defaults2, ...initial };
    const sheet = scope(host);
    const under = layer(host, "under");
    const figure = document.createElement("div");
    figure.setAttribute("data-pica", "");
    figure.style.cssText = "position:absolute;display:none";
    under.el.append(figure);
    let w = 1;
    let h = 1;
    let m = 24;
    let cx = 0;
    let cy = 0;
    let radius = 60;
    function layout() {
      w = Math.max(1, surface.cssWidth);
      h = Math.max(1, surface.cssHeight);
      m = clamp(Math.min(w, h) * 0.05, 18, 44);
      const wide = w >= 700;
      radius = clamp(Math.min(w, h) * (wide ? 0.16 : 0.13), 34, 150);
      cx = wide ? w * 0.7 : w * 0.68;
      cy = wide ? h * 0.52 : h * 0.76;
      cx = clamp(cx, m + radius + 6, w - m - radius - 6);
      cy = clamp(cy, m + radius + 6, h - m - radius * 1.5);
      figure.style.left = `${cx - radius}px`;
      figure.style.top = `${cy - radius}px`;
      figure.style.width = `${radius * 2}px`;
      figure.style.height = `${radius * 2}px`;
    }
    const surface = createCanvas(under.el, {
      onResize: () => {
        layout();
        loop.redraw();
      }
    });
    const ctx = surface.canvas.getContext("2d");
    const palette = watchPalette(host, () => loop.redraw());
    const headlineEl = document.createElement("h1");
    headlineEl.setAttribute("data-pica", "");
    const subheadEl = document.createElement("p");
    subheadEl.setAttribute("data-pica", "");
    subheadEl.setAttribute("data-pica-subhead", "");
    const actionsEl = document.createElement("div");
    actionsEl.setAttribute("data-pica", "");
    actionsEl.setAttribute("data-pica-actions", "");
    host.append(headlineEl, subheadEl, actionsEl);
    let child = null;
    function figureProps() {
      return {
        src: props.src,
        alt: props.alt,
        fit: props.fit,
        seed: props.seed,
        spacing: 10.5 - clamp(props.density, 0, 1) * 5,
        jitter: 0.45,
        layers: 3,
        contrast: 1.05
      };
    }
    function renderFigure() {
      if (props.src.trim() !== "") {
        figure.style.display = "";
        if (child) child.update(figureProps());
        else child = mount(figure, figureProps());
      } else {
        if (child) {
          child.destroy();
          child = null;
        }
        figure.style.display = "none";
      }
    }
    function renderActions() {
      actionsEl.replaceChildren();
      for (const [i, action] of props.actions.slice(0, 3).entries()) {
        const a = document.createElement("a");
        a.setAttribute("data-pica", "");
        a.href = action.href;
        if (i === 0) {
          a.dataset.variant = "solid";
          const label = document.createElement("span");
          label.setAttribute("data-pica", "");
          label.setAttribute("data-pica-label", "");
          label.textContent = action.label;
          a.append(label);
        } else {
          a.dataset.variant = "outline";
          a.textContent = action.label;
        }
        actionsEl.append(a);
      }
    }
    function draw(t) {
      const c = ctx;
      if (!c || w < 8 || h < 8) {
        host.dataset.picaReady = "true";
        return;
      }
      const boil = Math.floor(Math.max(0, t) / BOIL_MS);
      const rng = (i) => elementRng(props.seed, boil, i);
      const colors = palette.colors;
      const image = child !== null;
      const spacing = 9.5 - clamp(props.density, 0, 1) * 5;
      const skew = (rng(0)() - 0.5) * 6;
      let el = 1;
      const box = { x0: cx - radius, y0: cy - radius, x1: cx + radius, y1: cy + radius };
      c.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      c.lineWidth = 1;
      c.lineCap = "round";
      c.lineJoin = "round";
      const over = clamp(m * 0.7, 10, 26);
      c.strokeStyle = colors.muted;
      c.globalAlpha = 0.85;
      stroke(c, m - over, m, w - m + over, m, rng(el++));
      stroke(c, w - m, m - over, w - m, h - m + over, rng(el++));
      stroke(c, w - m + over, h - m, m - over, h - m, rng(el++));
      stroke(c, m, h - m + over, m, m - over, rng(el++));
      c.globalAlpha = 0.3;
      stroke(c, m - over * 0.6, m + 2.5, w - m + over * 0.6, m + 2.5, rng(el++));
      stroke(c, m + 2.5, h - m + over * 0.6, m + 2.5, m - over * 0.6, rng(el++));
      const ob = Math.min(18, radius * 0.18);
      c.globalAlpha = 0.55;
      stroke(c, box.x0 - ob, box.y0, box.x1 + ob, box.y0, rng(el++));
      stroke(c, box.x1, box.y0 - ob, box.x1, box.y1 + ob, rng(el++));
      stroke(c, box.x1 + ob, box.y1, box.x0 - ob, box.y1, rng(el++));
      stroke(c, box.x0, box.y1 + ob, box.x0, box.y0 - ob, rng(el++));
      c.globalAlpha = 0.4;
      stroke(c, cx, box.y0 - radius * 0.5, cx, box.y1 + radius * 0.5, rng(el++));
      stroke(c, box.x0 - radius * 0.5, cy, box.x1 + radius * 0.5, cy, rng(el++));
      stroke(c, box.x0 - radius * 0.25, box.y1 + radius * 0.25, box.x1 + radius * 0.25, box.y0 - radius * 0.25, rng(el++));
      if (!image) {
        const sx = cx + radius * 0.42;
        const sy = cy + radius * 1.18;
        const srx = radius * 1.02;
        const sry = radius * 0.26;
        const inSphere = (x, y) => {
          const nx = (x - cx) / radius;
          const ny = (y - cy) / radius;
          return nx * nx + ny * ny <= 1;
        };
        const tone = (x, y) => {
          const nx = (x - cx) / radius;
          const ny = (y - cy) / radius;
          return clamp(0.58 + nx * 0.46 + ny * 0.5, 0, 1);
        };
        const shadowBounds = { x0: box.x0 - radius * 0.2, y0: box.y0, x1: box.x1 + radius * 0.5, y1: box.y1 + radius * 0.55 };
        c.strokeStyle = colors.fg;
        c.globalAlpha = 0.5;
        hatch(c, -38 + skew, spacing * 1.2, shadowBounds, (x, y) => {
          const ex = (x - sx) / srx;
          const ey = (y - sy) / sry;
          const e = ex * ex + ey * ey;
          return e <= 1 && 0.78 - e * 0.55 >= 0.4;
        }, rng(el++), 0.8);
        c.globalAlpha = 0.78;
        hatch(c, -38 + skew, spacing, box, (x, y) => inSphere(x, y) && tone(x, y) >= 0.4, rng(el++), 1);
        c.globalAlpha = 0.85;
        hatch(c, 52 + skew, spacing, box, (x, y) => inSphere(x, y) && tone(x, y) >= 0.66, rng(el++), 1);
        c.strokeStyle = colors.muted;
        c.globalAlpha = 0.55;
        trace(c, sx, sy, srx, sry, rng(el++), 0.8);
      }
      c.strokeStyle = colors.fg;
      c.globalAlpha = 0.9;
      trace(c, cx, cy, radius * 0.98, radius * 0.98, rng(el++), 0.9);
      c.globalAlpha = 0.35;
      trace(c, cx, cy, radius * 1.015, radius * 1.015, rng(el++), 0.9, -0.5, Math.PI * 1.15);
      const ax = cx - radius * 1.55;
      const ay = cy - radius * 1.38;
      const ax2 = cx - radius * 1.08;
      const ay2 = cy - radius * 0.9;
      c.strokeStyle = colors.accent;
      c.globalAlpha = 1;
      stroke(c, ax, ay, ax2, ay2, rng(el++), 0.8);
      const head = Math.atan2(ay2 - ay, ax2 - ax);
      const hl = Math.min(15, radius * 0.18);
      stroke(c, ax2, ay2, ax2 - Math.cos(head - 0.5) * hl, ay2 - Math.sin(head - 0.5) * hl, rng(el++), 0.4);
      stroke(c, ax2, ay2, ax2 - Math.cos(head + 0.5) * hl, ay2 - Math.sin(head + 0.5) * hl, rng(el++), 0.4);
      c.font = `10px ${GRID_FONT}`;
      c.fillStyle = colors.accent;
      text(c, "light", ax - 4, ay - 9, rng(el++));
      c.fillStyle = colors.muted;
      c.strokeStyle = colors.muted;
      const notes = [
        ["fig.01", cx - radius * 0.35, box.y1 + radius * 0.66 + 12, cx - radius * 0.1, box.y1],
        ["tone", box.x1 + radius * 0.3, cy + radius * 0.75, cx + radius * 0.62, cy + radius * 0.62],
        ["edge", w - m - 40, m + 18, w - m - 2, m + 3]
      ];
      for (const [s, lx0, ly0, tx, ty] of notes) {
        const lx = clamp(lx0, m + 8, w - m - 8 - s.length * 6.5);
        const ly = clamp(ly0, m + 16, h - m - 6);
        note(c, s, lx, ly, tx, ty, rng(el++));
      }
      c.globalAlpha = 1;
      host.dataset.picaReady = "true";
    }
    layout();
    renderFigure();
    sheet.setRules(rules(sheet.selector, props));
    headlineEl.textContent = props.headline;
    subheadEl.textContent = props.subhead;
    renderActions();
    const loop = createLoop({ el: host, fps: BOIL_FPS, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.align !== before.align || props.minHeight !== before.minHeight) {
          sheet.setRules(rules(sheet.selector, props));
        }
        if (props.headline !== before.headline) headlineEl.textContent = props.headline;
        if (props.subhead !== before.subhead) subheadEl.textContent = props.subhead;
        if (!sameJson(before.actions, props.actions)) renderActions();
        palette.refresh();
        if (props.src !== before.src || props.alt !== before.alt || props.fit !== before.fit || props.density !== before.density || props.seed !== before.seed) {
          renderFigure();
        }
        loop.update({ paused: props.paused, time: props.time });
        if (props.seed !== before.seed || props.density !== before.density || props.src !== before.src) loop.redraw();
      },
      destroy() {
        child?.destroy();
        child = null;
        loop.destroy();
        surface.destroy();
        palette.destroy();
        under.remove();
        headlineEl.remove();
        subheadEl.remove();
        actionsEl.remove();
        sheet.destroy();
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
  var instance = PicaSketchHero.mount(host, take(window.PICA_PROPS || {}));
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
