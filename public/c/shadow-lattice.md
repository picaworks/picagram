# Shadow Lattice

> A slowly moving grazing light casts coherent, dithered shadows through shallow crossed ribs, with a palette-based CSS fallback.

Category: shaders. Tags: lattice, shadows, grazing-light, occlusion, dither. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 5.8 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/shadow-lattice.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `pitch` | number | `64` | Distance between adjacent lattice ribs in CSS pixels, from 24 to 160. |
| `depth` | number | `13` | Height of the shallow ribs in CSS pixels, from 0 to 32; higher ribs cast longer shadows. |
| `lightAngle` | number | `-32` | Starting azimuth of the grazing light in degrees. |
| `speed` | number | `6` | Light rotation in degrees per second, from -12 to 12; zero keeps the light still. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Colors

Draws with `--pica-fg`, `--pica-bg`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Shadow Lattice · shadow-lattice
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

// lib/gl.ts
/** WebGL2 for shader components: one fullscreen triangle, a fragment shader, and its uniforms. The core owns
 *  the frame loop and calls draw(); this module never schedules a frame. It is the only module that asks for
 *  a WebGL2 context. See docs/decisions/0006-webgl2-runtime.md. */

type Uniform = number | readonly number[];

interface ShaderOptions {
  /** GLSL ES 3.00 that follows the prelude. It declares any extra uniforms, defines main(), and writes
   *  pica_color, with straight (not premultiplied) alpha. The prelude declares u_resolution in device
   *  pixels, u_time in seconds (wrapping every hour), u_seed, u_pointer (0 to 1 across the host with y
   *  running up, the same way as gl_FragCoord, or -1 when outside: set it with pointerUv), the palette as
   *  u_fg, u_bg, u_accent, and u_muted (RGBA, 0 to 1), and two helpers:
   *  pica_hash(uvec2), an integer hash, and pica_random(vec2), a seeded value in [0, 1) per cell. */
  fragment: string;
  /** A CSS background shown instead when WebGL2 is unavailable or the shader cannot build. Build it from
   *  palette tokens with cssVar, so it still follows the page. */
  fallback: string;
  /** Starting values for extra uniforms, by name. Numbers set floats; arrays of 2 to 4 set vectors; longer
   *  arrays set float arrays. */
  uniforms?: Readonly<Record<string, Uniform>>;
  /** Device pixel ratio ceiling. Shaders are soft, so 1.5 looks like 2 for less work. Below 1 renders at a
   *  lower resolution that CSS scales up: 0.5 draws one pixel per two CSS pixels. */
  maxDpr?: number;
  /** Extra inline CSS for the canvas, such as image-rendering:pixelated to keep scaled-up pixels square. */
  css?: string;
  /** Called when the picture is stale without a new frame: after a resize, a palette change, or a restored
   *  context. Redraw there, usually with loop.redraw(). */
  onInvalidate: () => void;
}

interface Shader {
  /** False when WebGL2 is unavailable or the shader failed to build. The fallback background shows then. */
  readonly ok: boolean;
  /** Sets an extra uniform for the next draw. */
  set(name: string, value: Uniform): void;
  /** Draws one frame at animation time `t`, in milliseconds. */
  draw(t: number): void;
  destroy(): void;
}

/** Three vertices from gl_VertexID that cover the viewport, so no vertex buffer is needed. */
const FULLSCREEN_VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

/** Declarations every fragment shader starts with. The hash is integer arithmetic, so it gives the same
 *  values on every GPU, unlike the usual fract(sin(x) * 43758.5). */
const SHADER_PRELUDE = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform vec2 u_pointer;
uniform vec4 u_fg;
uniform vec4 u_bg;
uniform vec4 u_accent;
uniform vec4 u_muted;
out vec4 pica_color;
uint pica_hash(uvec2 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  return v.x ^ v.y;
}
float pica_random(vec2 cell) {
  uvec2 c = uvec2(ivec2(floor(cell)));
  return float(pica_hash(c + uvec2(uint(u_seed) * 747796405u, uint(u_seed)))) / 4294967296.0;
}
`;

/** Animation time wraps every hour, so a float keeps its precision however long a page stays open. */
const WRAP_SECONDS = 3600;

/** A backing store past this many pixels costs more than a soft shader can show. */
const MAX_PIXELS = 2_000_000;

function toVectors(colors: Colors): Record<Token, number[]> {
  const vec = (color: string): number[] => parseColor(color).map((channel) => channel / 255);
  return { fg: vec(colors.fg), bg: vec(colors.bg), accent: vec(colors.accent), muted: vec(colors.muted) };
}

function compileStage(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  // A shader that does not build is a bug in the component, so say so; the fallback shows meanwhile.
  if (!gl.isContextLost()) console.error(`Pica shader did not compile: ${gl.getShaderInfoLog(shader) ?? ""}`);
  gl.deleteShader(shader);
  return null;
}

/** A pointer event as u_pointer wants it: 0 to 1 across the host, with y running up like gl_FragCoord, and
 *  [-1, -1] when the pointer is outside. Reading the DOM's own top-down y straight into the uniform is the
 *  mistake this exists to stop, because it mirrors every pointer effect vertically. */
function pointerUv(host: HTMLElement, event: { clientX: number; clientY: number }): [number, number] {
  const rect = host.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return [-1, -1];
  const x = (event.clientX - rect.left) / rect.width;
  const y = 1 - (event.clientY - rect.top) / rect.height;
  return x < 0 || x > 1 || y < 0 || y > 1 ? [-1, -1] : [x, y];
}

function createShader(host: HTMLElement, options: ShaderOptions): Shader {
  const { fragment, fallback, onInvalidate } = options;
  const values = new Map<string, Uniform>([["u_pointer", [-1, -1]], ...Object.entries(options.uniforms ?? {})]);
  const surface = createCanvas(host, {
    maxDpr: options.maxDpr ?? 1.5,
    maxPixels: MAX_PIXELS,
    css: options.css ?? "",
    onResize: () => onInvalidate(),
  });
  const canvas = surface.canvas;
  let colors: Record<Token, number[]> = { fg: [], bg: [], accent: [], muted: [] };
  const palette = watchPalette(host, (next) => {
    colors = toVectors(next);
    onInvalidate();
  });
  colors = toVectors(palette.colors);
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  });
  let program: WebGLProgram | null = null;
  let locations = new Map<string, WebGLUniformLocation | null>();
  let lost = false;

  function build(): boolean {
    program = null;
    if (!gl || gl.isContextLost()) return false;
    const vertex = compileStage(gl, gl.VERTEX_SHADER, FULLSCREEN_VERTEX);
    const pixel = compileStage(gl, gl.FRAGMENT_SHADER, SHADER_PRELUDE + fragment);
    if (!vertex || !pixel) return false;
    const linked = gl.createProgram();
    gl.attachShader(linked, vertex);
    gl.attachShader(linked, pixel);
    gl.linkProgram(linked);
    gl.deleteShader(vertex);
    gl.deleteShader(pixel);
    if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) {
      if (!gl.isContextLost()) console.error(`Pica shader did not link: ${gl.getProgramInfoLog(linked) ?? ""}`);
      gl.deleteProgram(linked);
      return false;
    }
    program = linked;
    locations = new Map();
    gl.disable(gl.DITHER);
    return true;
  }

  function upload(context: WebGL2RenderingContext, linked: WebGLProgram, name: string, value: Uniform): void {
    let location = locations.get(name);
    if (location === undefined) {
      location = context.getUniformLocation(linked, name);
      locations.set(name, location);
    }
    if (!location) return;
    if (typeof value === "number") context.uniform1f(location, value);
    else if (value.length === 2) context.uniform2f(location, value[0] ?? 0, value[1] ?? 0);
    else if (value.length === 3) context.uniform3f(location, value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
    else if (value.length === 4) context.uniform4f(location, value[0] ?? 0, value[1] ?? 0, value[2] ?? 0, value[3] ?? 0);
    else context.uniform1fv(location, new Float32Array(value));
  }

  let ok = build();
  canvas.style.background = ok ? "" : fallback;

  const onLost = (event: Event): void => {
    // Without preventDefault the browser never gives the context back.
    event.preventDefault();
    lost = true;
  };
  const onRestored = (): void => {
    lost = false;
    ok = build();
    canvas.style.background = ok ? "" : fallback;
    onInvalidate();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  return {
    get ok() {
      return ok;
    },
    set(name, value) {
      values.set(name, value);
    },
    draw(t) {
      if (!ok || lost || !gl || !program) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      upload(gl, program, "u_resolution", [canvas.width, canvas.height]);
      upload(gl, program, "u_time", (t / 1000) % WRAP_SECONDS);
      upload(gl, program, "u_fg", colors.fg);
      upload(gl, program, "u_bg", colors.bg);
      upload(gl, program, "u_accent", colors.accent);
      upload(gl, program, "u_muted", colors.muted);
      for (const [name, value] of values) upload(gl, program, name, value);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      palette.destroy();
      // Free the context now rather than at garbage collection, since browsers cap how many can be live.
      if (gl && !gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
      surface.destroy();
    },
  };
}

// lib/glsl.ts
/** GLSL snippets for shader components, placed before a fragment's own code: fragment: NOISE + code.
 *  Import only what a shader uses, since each one adds to the component's size. Both rely on the prelude
 *  in lib/gl.ts. */

/** Seeded gradient noise in 2D, after Perlin's "Improving Noise" (2002), with a quintic fade:
 *  pica_noise(p) in about -1 to 1, and pica_fbm(p, octaves), a fractal sum of up to 8 octaves. */
const NOISE = `
vec2 pica_gradient(ivec2 cell) {
  uint h = pica_hash(uvec2(cell) + uvec2(uint(u_seed) * 2654435761u, uint(u_seed)));
  float a = float(h) * 1.4629180792671596e-9;
  return vec2(cos(a), sin(a));
}
float pica_noise(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(pica_gradient(i), f);
  float b = dot(pica_gradient(i + ivec2(1, 0)), f - vec2(1.0, 0.0));
  float c = dot(pica_gradient(i + ivec2(0, 1)), f - vec2(0.0, 1.0));
  float d = dot(pica_gradient(i + ivec2(1, 1)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.41421356;
}
float pica_fbm(vec2 p, int octaves) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    sum += amp * pica_noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    amp *= 0.5;
  }
  return sum;
}
`;

/** The tail every shader repeats: take a tone from 0 to 1, quantize it through the Bayer matrix into a
 *  number of steps, and composite that much ink over the ground. Needs DITHER before it.
 *
 *  The result is straight alpha, which is what lib/gl.ts asks the context for. Mixing toward u_bg instead
 *  would be premultiplied whenever the ground is transparent, which is the default, and the browser would
 *  then multiply by alpha a second time: every mid-tone would come out squared, so six even levels would
 *  land near 7, 19, 38, 65 and 100 percent instead of 20 through 100. */
const TONE = `
vec4 pica_tone(float tone, vec4 ink, float levels) {
  float steps = max(1.0, levels);
  float q = floor(clamp(tone, 0.0, 1.0) * steps + pica_bayer8(ivec2(gl_FragCoord.xy))) / steps;
  float amount = clamp(q, 0.0, 1.0) * ink.a;
  float onto = u_bg.a * (1.0 - amount);
  float alpha = amount + onto;
  return vec4((ink.rgb * amount + u_bg.rgb * onto) / max(alpha, 0.0001), alpha);
}
`;

/** The 8 by 8 Bayer threshold at a pixel, in (0, 1), for ordered dithering:
 *  step(pica_bayer8(ivec2(gl_FragCoord.xy)), tone). The same matrix as bayerMatrix(8) in lib/dither.ts. */
const DITHER = `
float pica_bayer8(ivec2 p) {
  int x = p.x & 7;
  int y = p.y & 7;
  int a = x ^ y;
  int v = ((a & 1) << 5) | ((y & 1) << 4) | ((a & 2) << 2) | ((y & 2) << 1) | ((a & 4) >> 1) | ((y & 4) >> 2);
  return (float(v) + 0.5) / 64.0;
}
`;

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

// registry/shaders/shadow-lattice/core.ts
export interface ShadowLatticeProps extends MotionProps {
  /** Distance between adjacent lattice ribs in CSS pixels, from 24 to 160. */
  pitch: number;
  /** Height of the shallow ribs in CSS pixels, from 0 to 32; higher ribs cast longer shadows. */
  depth: number;
  /** Starting azimuth of the grazing light in degrees. */
  lightAngle: number;
  /** Light rotation in degrees per second, from -12 to 12; zero keeps the light still. */
  speed: number;
}

export const defaults: ShadowLatticeProps = {
  pitch: 64,
  depth: 13,
  lightAngle: -32,
  speed: 6,
  paused: false,
  time: null,
  seed: 1,
};

const SHADOW_LATTICE_STILL = 1200;
const SHADOW_LATTICE_FRAGMENT = `${DITHER}${TONE}
uniform vec2 u_css_size;
uniform float u_pitch;
uniform float u_depth;
uniform float u_light_angle;
uniform float u_speed;

mat2 latticeTurn(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float latticeDistance(vec2 point) {
  vec2 local = abs(mod(point + 0.5 * u_pitch, u_pitch) - 0.5 * u_pitch);
  return min(local.x, local.y);
}

float latticeHeight(vec2 point) {
  float halfWidth = u_pitch * 0.041;
  return u_depth * (1.0 - smoothstep(halfWidth * 0.48, halfWidth, latticeDistance(point)));
}

// Each crossed rib is a shallow, continuous geometric occluder. Test the
// successive rib planes toward the light instead of marching through noise.
// A receiver and its shadow therefore remain attached to the same lattice.
float latticeBlocked(float coordinate, float direction, float receiver) {
  if (abs(direction) < 0.0001 || u_depth <= 0.0001) return 0.0;
  float signDirection = direction > 0.0 ? 1.0 : -1.0;
  float nextPlane = direction > 0.0 ? ceil(coordinate / u_pitch) : floor(coordinate / u_pitch);
  float blocked = 0.0;
  float halfWidth = u_pitch * 0.041;
  for (int i = 0; i < 7; i++) {
    float center = (nextPlane + float(i) * signDirection) * u_pitch;
    float travel = (center - coordinate) / direction;
    // The near wall of a finite-width rib intercepts a grazing ray before its
    // center plane. The fixed softness is a small penumbra, not an animated blur.
    travel = max(0.0, travel - halfWidth / abs(direction));
    float rayHeight = receiver + travel * 0.29;
    float clearance = u_depth - rayHeight;
    blocked = max(blocked, smoothstep(0.0, max(0.7, u_depth * 0.10), clearance));
  }
  return blocked;
}

void main() {
  float rotation = 0.17 + (pica_random(vec2(4.0, 9.0)) - 0.5) * 0.19;
  vec2 phase = vec2(pica_random(vec2(7.0, 3.0)), pica_random(vec2(2.0, 11.0))) * u_pitch;
  vec2 position = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
  vec2 p = latticeTurn(rotation) * position + phase;
  float angle = radians(u_light_angle + u_time * u_speed);
  vec2 direction = latticeTurn(rotation) * vec2(cos(angle), sin(angle));
  float height = latticeHeight(p);
  float receiver = height + 0.22;
  float shadow = max(latticeBlocked(p.x, direction.x, receiver), latticeBlocked(p.y, direction.y, receiver));
  float halfWidth = u_pitch * 0.041;
  float rib = 1.0 - smoothstep(halfWidth - 0.8, halfWidth + 0.8, latticeDistance(p));
  float dx = (latticeHeight(p + vec2(0.6, 0.0)) - latticeHeight(p - vec2(0.6, 0.0))) / 1.2;
  float dy = (latticeHeight(p + vec2(0.0, 0.6)) - latticeHeight(p - vec2(0.0, 0.6))) / 1.2;
  vec3 normal = normalize(vec3(-dx, -dy, 1.0));
  vec3 light = normalize(vec3(direction, 0.29));
  float diffuse = max(0.0, dot(normal, light));
  float ground = mix(0.27, 0.065, shadow);
  float face = 0.46 + diffuse * 0.44;
  float tone = mix(ground, face, rib);
  // Four measured coverage intervals use a stationary 8x8 threshold lattice.
  // Moving light changes geometry-derived tone, never the dither coordinates.
  pica_color = pica_tone(tone, u_fg, 4.0);
}
`;

const SHADOW_LATTICE_FALLBACK = [
  `repeating-linear-gradient(var(--sl-rotation),transparent 0 calc(var(--sl-pitch) - var(--sl-width) - var(--sl-tail)),color-mix(in srgb,${cssVar("fg")} 13%,transparent) calc(var(--sl-pitch) - var(--sl-width) - var(--sl-tail)) calc(var(--sl-pitch) - var(--sl-width)),color-mix(in srgb,${cssVar("fg")} 60%,transparent) calc(var(--sl-pitch) - var(--sl-width)) var(--sl-pitch))`,
  `repeating-linear-gradient(calc(var(--sl-rotation) + 90deg),transparent 0 calc(var(--sl-pitch) - var(--sl-width) - var(--sl-tail)),color-mix(in srgb,${cssVar("fg")} 13%,transparent) calc(var(--sl-pitch) - var(--sl-width) - var(--sl-tail)) calc(var(--sl-pitch) - var(--sl-width)),color-mix(in srgb,${cssVar("fg")} 60%,transparent) calc(var(--sl-pitch) - var(--sl-width)) var(--sl-pitch))`,
  `${cssVar("bg")}`,
].join(",");

function shadowLatticeNumber(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<ShadowLatticeProps> = (host, initial = {}) => {
  let props: ShadowLatticeProps = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("role", null);
  attributes.set("aria-label", null);
  attributes.set("aria-hidden", "true");
  labelHost(host, "");
  const drawing = layer(host, "over");

  function seed(): number {
    return Math.floor(shadowLatticeNumber(props.seed, 1, 0, 999999));
  }

  function uniforms(): Record<string, number | readonly number[]> {
    return {
      u_seed: seed(),
      u_pitch: shadowLatticeNumber(props.pitch, 64, 24, 160),
      u_depth: shadowLatticeNumber(props.depth, 13, 0, 32),
      u_light_angle: shadowLatticeNumber(props.lightAngle, -32, -3600, 3600),
      u_speed: shadowLatticeNumber(props.speed, 6, -12, 12),
      u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
    };
  }

  function fallback(): void {
    const pitch = shadowLatticeNumber(props.pitch, 64, 24, 160);
    const depth = shadowLatticeNumber(props.depth, 13, 0, 32);
    const random = createRng(seed());
    drawing.el.style.setProperty("--sl-pitch", `${pitch}px`);
    drawing.el.style.setProperty("--sl-width", `${pitch * 0.082}px`);
    drawing.el.style.setProperty("--sl-tail", `${Math.min(pitch * 0.45, depth / 0.29)}px`);
    drawing.el.style.setProperty("--sl-rotation", `${9.7 + (random() - 0.5) * 11}deg`);
  }

  fallback();
  const shader = createShader(drawing.el, {
    fragment: SHADOW_LATTICE_FRAGMENT,
    fallback: SHADOW_LATTICE_FALLBACK,
    uniforms: uniforms(),
    maxDpr: 0.5,
    css: "image-rendering:pixelated",
    onInvalidate: () => {
      if (!alive) return;
      shader.set("u_css_size", [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)]);
      loop?.redraw();
    },
  });

  function draw(time: number): void {
    if (!alive) return;
    shader.draw(time);
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: SHADOW_LATTICE_STILL, frame: draw });
  return {
    update(next) {
      if (!alive) return;
      props = { ...props, ...next };
      fallback();
      for (const [name, value] of Object.entries(uniforms())) shader.set(name, value);
      loop?.update({ paused: props.paused, time: props.time, fps: 24, still: SHADOW_LATTICE_STILL });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      shader.destroy();
      drawing.remove();
      attributes.restore();
    },
  };
};

// registry/shaders/shadow-lattice/index.tsx
export type ShadowLatticeComponentProps = Partial<ShadowLatticeProps> & WrapperProps;

/** Shallow crossed ribs cast coherent dithered shadows under a slowly moving grazing light. */
export function ShadowLattice({ className, style, palette, ...props }: ShadowLatticeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Shadow Lattice · shadow-lattice
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Shadow Lattice · Pica</title>
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
var PicaShadowLattice = (() => {
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

  // registry/shaders/shadow-lattice/core.ts
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

  // lib/gl.ts
  var FULLSCREEN_VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;
  var SHADER_PRELUDE = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform vec2 u_pointer;
uniform vec4 u_fg;
uniform vec4 u_bg;
uniform vec4 u_accent;
uniform vec4 u_muted;
out vec4 pica_color;
uint pica_hash(uvec2 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  return v.x ^ v.y;
}
float pica_random(vec2 cell) {
  uvec2 c = uvec2(ivec2(floor(cell)));
  return float(pica_hash(c + uvec2(uint(u_seed) * 747796405u, uint(u_seed)))) / 4294967296.0;
}
`;
  var WRAP_SECONDS = 3600;
  var MAX_PIXELS = 2e6;
  function toVectors(colors) {
    const vec = (color) => parseColor(color).map((channel) => channel / 255);
    return { fg: vec(colors.fg), bg: vec(colors.bg), accent: vec(colors.accent), muted: vec(colors.muted) };
  }
  function compileStage(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    if (!gl.isContextLost()) console.error(`Pica shader did not compile: ${gl.getShaderInfoLog(shader) ?? ""}`);
    gl.deleteShader(shader);
    return null;
  }
  function createShader(host, options) {
    const { fragment, fallback, onInvalidate } = options;
    const values = new Map([["u_pointer", [-1, -1]], ...Object.entries(options.uniforms ?? {})]);
    const surface = createCanvas(host, {
      maxDpr: options.maxDpr ?? 1.5,
      maxPixels: MAX_PIXELS,
      css: options.css ?? "",
      onResize: () => onInvalidate()
    });
    const canvas = surface.canvas;
    let colors = { fg: [], bg: [], accent: [], muted: [] };
    const palette = watchPalette(host, (next) => {
      colors = toVectors(next);
      onInvalidate();
    });
    colors = toVectors(palette.colors);
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "low-power"
    });
    let program = null;
    let locations = /* @__PURE__ */ new Map();
    let lost = false;
    function build() {
      program = null;
      if (!gl || gl.isContextLost()) return false;
      const vertex = compileStage(gl, gl.VERTEX_SHADER, FULLSCREEN_VERTEX);
      const pixel = compileStage(gl, gl.FRAGMENT_SHADER, SHADER_PRELUDE + fragment);
      if (!vertex || !pixel) return false;
      const linked = gl.createProgram();
      gl.attachShader(linked, vertex);
      gl.attachShader(linked, pixel);
      gl.linkProgram(linked);
      gl.deleteShader(vertex);
      gl.deleteShader(pixel);
      if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) {
        if (!gl.isContextLost()) console.error(`Pica shader did not link: ${gl.getProgramInfoLog(linked) ?? ""}`);
        gl.deleteProgram(linked);
        return false;
      }
      program = linked;
      locations = /* @__PURE__ */ new Map();
      gl.disable(gl.DITHER);
      return true;
    }
    function upload(context, linked, name, value) {
      let location = locations.get(name);
      if (location === void 0) {
        location = context.getUniformLocation(linked, name);
        locations.set(name, location);
      }
      if (!location) return;
      if (typeof value === "number") context.uniform1f(location, value);
      else if (value.length === 2) context.uniform2f(location, value[0] ?? 0, value[1] ?? 0);
      else if (value.length === 3) context.uniform3f(location, value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
      else if (value.length === 4) context.uniform4f(location, value[0] ?? 0, value[1] ?? 0, value[2] ?? 0, value[3] ?? 0);
      else context.uniform1fv(location, new Float32Array(value));
    }
    let ok = build();
    canvas.style.background = ok ? "" : fallback;
    const onLost = (event) => {
      event.preventDefault();
      lost = true;
    };
    const onRestored = () => {
      lost = false;
      ok = build();
      canvas.style.background = ok ? "" : fallback;
      onInvalidate();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return {
      get ok() {
        return ok;
      },
      set(name, value) {
        values.set(name, value);
      },
      draw(t) {
        if (!ok || lost || !gl || !program) return;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);
        upload(gl, program, "u_resolution", [canvas.width, canvas.height]);
        upload(gl, program, "u_time", t / 1e3 % WRAP_SECONDS);
        upload(gl, program, "u_fg", colors.fg);
        upload(gl, program, "u_bg", colors.bg);
        upload(gl, program, "u_accent", colors.accent);
        upload(gl, program, "u_muted", colors.muted);
        for (const [name, value] of values) upload(gl, program, name, value);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      destroy() {
        canvas.removeEventListener("webglcontextlost", onLost);
        canvas.removeEventListener("webglcontextrestored", onRestored);
        palette.destroy();
        if (gl && !gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
        surface.destroy();
      }
    };
  }

  // lib/glsl.ts
  var TONE = `
vec4 pica_tone(float tone, vec4 ink, float levels) {
  float steps = max(1.0, levels);
  float q = floor(clamp(tone, 0.0, 1.0) * steps + pica_bayer8(ivec2(gl_FragCoord.xy))) / steps;
  float amount = clamp(q, 0.0, 1.0) * ink.a;
  float onto = u_bg.a * (1.0 - amount);
  float alpha = amount + onto;
  return vec4((ink.rgb * amount + u_bg.rgb * onto) / max(alpha, 0.0001), alpha);
}
`;
  var DITHER = `
float pica_bayer8(ivec2 p) {
  int x = p.x & 7;
  int y = p.y & 7;
  int a = x ^ y;
  int v = ((a & 1) << 5) | ((y & 1) << 4) | ((a & 2) << 2) | ((y & 2) << 1) | ((a & 4) >> 1) | ((y & 4) >> 2);
  return (float(v) + 0.5) / 64.0;
}
`;

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

  // registry/shaders/shadow-lattice/core.ts
  var defaults = {
    pitch: 64,
    depth: 13,
    lightAngle: -32,
    speed: 6,
    paused: false,
    time: null,
    seed: 1
  };
  var SHADOW_LATTICE_STILL = 1200;
  var SHADOW_LATTICE_FRAGMENT = `${DITHER}${TONE}
uniform vec2 u_css_size;
uniform float u_pitch;
uniform float u_depth;
uniform float u_light_angle;
uniform float u_speed;

mat2 latticeTurn(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float latticeDistance(vec2 point) {
  vec2 local = abs(mod(point + 0.5 * u_pitch, u_pitch) - 0.5 * u_pitch);
  return min(local.x, local.y);
}

float latticeHeight(vec2 point) {
  float halfWidth = u_pitch * 0.041;
  return u_depth * (1.0 - smoothstep(halfWidth * 0.48, halfWidth, latticeDistance(point)));
}

// Each crossed rib is a shallow, continuous geometric occluder. Test the
// successive rib planes toward the light instead of marching through noise.
// A receiver and its shadow therefore remain attached to the same lattice.
float latticeBlocked(float coordinate, float direction, float receiver) {
  if (abs(direction) < 0.0001 || u_depth <= 0.0001) return 0.0;
  float signDirection = direction > 0.0 ? 1.0 : -1.0;
  float nextPlane = direction > 0.0 ? ceil(coordinate / u_pitch) : floor(coordinate / u_pitch);
  float blocked = 0.0;
  float halfWidth = u_pitch * 0.041;
  for (int i = 0; i < 7; i++) {
    float center = (nextPlane + float(i) * signDirection) * u_pitch;
    float travel = (center - coordinate) / direction;
    // The near wall of a finite-width rib intercepts a grazing ray before its
    // center plane. The fixed softness is a small penumbra, not an animated blur.
    travel = max(0.0, travel - halfWidth / abs(direction));
    float rayHeight = receiver + travel * 0.29;
    float clearance = u_depth - rayHeight;
    blocked = max(blocked, smoothstep(0.0, max(0.7, u_depth * 0.10), clearance));
  }
  return blocked;
}

void main() {
  float rotation = 0.17 + (pica_random(vec2(4.0, 9.0)) - 0.5) * 0.19;
  vec2 phase = vec2(pica_random(vec2(7.0, 3.0)), pica_random(vec2(2.0, 11.0))) * u_pitch;
  vec2 position = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
  vec2 p = latticeTurn(rotation) * position + phase;
  float angle = radians(u_light_angle + u_time * u_speed);
  vec2 direction = latticeTurn(rotation) * vec2(cos(angle), sin(angle));
  float height = latticeHeight(p);
  float receiver = height + 0.22;
  float shadow = max(latticeBlocked(p.x, direction.x, receiver), latticeBlocked(p.y, direction.y, receiver));
  float halfWidth = u_pitch * 0.041;
  float rib = 1.0 - smoothstep(halfWidth - 0.8, halfWidth + 0.8, latticeDistance(p));
  float dx = (latticeHeight(p + vec2(0.6, 0.0)) - latticeHeight(p - vec2(0.6, 0.0))) / 1.2;
  float dy = (latticeHeight(p + vec2(0.0, 0.6)) - latticeHeight(p - vec2(0.0, 0.6))) / 1.2;
  vec3 normal = normalize(vec3(-dx, -dy, 1.0));
  vec3 light = normalize(vec3(direction, 0.29));
  float diffuse = max(0.0, dot(normal, light));
  float ground = mix(0.27, 0.065, shadow);
  float face = 0.46 + diffuse * 0.44;
  float tone = mix(ground, face, rib);
  // Four measured coverage intervals use a stationary 8x8 threshold lattice.
  // Moving light changes geometry-derived tone, never the dither coordinates.
  pica_color = pica_tone(tone, u_fg, 4.0);
}
`;
  var SHADOW_LATTICE_FALLBACK = [
    `repeating-linear-gradient(var(--sl-rotation),transparent 0 calc(var(--sl-pitch) - var(--sl-width) - var(--sl-tail)),color-mix(in srgb,${cssVar("fg")} 13%,transparent) calc(var(--sl-pitch) - var(--sl-width) - var(--sl-tail)) calc(var(--sl-pitch) - var(--sl-width)),color-mix(in srgb,${cssVar("fg")} 60%,transparent) calc(var(--sl-pitch) - var(--sl-width)) var(--sl-pitch))`,
    `repeating-linear-gradient(calc(var(--sl-rotation) + 90deg),transparent 0 calc(var(--sl-pitch) - var(--sl-width) - var(--sl-tail)),color-mix(in srgb,${cssVar("fg")} 13%,transparent) calc(var(--sl-pitch) - var(--sl-width) - var(--sl-tail)) calc(var(--sl-pitch) - var(--sl-width)),color-mix(in srgb,${cssVar("fg")} 60%,transparent) calc(var(--sl-pitch) - var(--sl-width)) var(--sl-pitch))`,
    `${cssVar("bg")}`
  ].join(",");
  function shadowLatticeNumber(value, fallback, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let alive = true;
    let loop = null;
    const attributes = hostAttributes(host);
    attributes.set("role", null);
    attributes.set("aria-label", null);
    attributes.set("aria-hidden", "true");
    labelHost(host, "");
    const drawing = layer(host, "over");
    function seed() {
      return Math.floor(shadowLatticeNumber(props.seed, 1, 0, 999999));
    }
    function uniforms() {
      return {
        u_seed: seed(),
        u_pitch: shadowLatticeNumber(props.pitch, 64, 24, 160),
        u_depth: shadowLatticeNumber(props.depth, 13, 0, 32),
        u_light_angle: shadowLatticeNumber(props.lightAngle, -32, -3600, 3600),
        u_speed: shadowLatticeNumber(props.speed, 6, -12, 12),
        u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)]
      };
    }
    function fallback() {
      const pitch = shadowLatticeNumber(props.pitch, 64, 24, 160);
      const depth = shadowLatticeNumber(props.depth, 13, 0, 32);
      const random = createRng(seed());
      drawing.el.style.setProperty("--sl-pitch", `${pitch}px`);
      drawing.el.style.setProperty("--sl-width", `${pitch * 0.082}px`);
      drawing.el.style.setProperty("--sl-tail", `${Math.min(pitch * 0.45, depth / 0.29)}px`);
      drawing.el.style.setProperty("--sl-rotation", `${9.7 + (random() - 0.5) * 11}deg`);
    }
    fallback();
    const shader = createShader(drawing.el, {
      fragment: SHADOW_LATTICE_FRAGMENT,
      fallback: SHADOW_LATTICE_FALLBACK,
      uniforms: uniforms(),
      maxDpr: 0.5,
      css: "image-rendering:pixelated",
      onInvalidate: () => {
        if (!alive) return;
        shader.set("u_css_size", [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)]);
        loop?.redraw();
      }
    });
    function draw(time) {
      if (!alive) return;
      shader.draw(time);
      attributes.set("data-pica-ready", "true");
    }
    loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: SHADOW_LATTICE_STILL, frame: draw });
    return {
      update(next) {
        if (!alive) return;
        props = { ...props, ...next };
        fallback();
        for (const [name, value] of Object.entries(uniforms())) shader.set(name, value);
        loop?.update({ paused: props.paused, time: props.time, fps: 24, still: SHADOW_LATTICE_STILL });
        loop?.redraw();
      },
      destroy() {
        if (!alive) return;
        alive = false;
        loop?.destroy();
        shader.destroy();
        drawing.remove();
        attributes.restore();
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
  var instance = PicaShadowLattice.mount(host, take(initial));
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
