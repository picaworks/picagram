# Pixel Art Hero

> A hero drawn as one low resolution screen: pixel type, snapped frames, and a field that shimmers a cell at a time.

Category: sections. Tags: hero, pixel, lattice, section, cta, landing. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 7.6 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/pixel-art-hero.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `headline` | string | `"PIXEL ART"` | The headline, drawn in a five row pixel font on the lattice. Letters are uppercased, and any character the font has no shape for draws blank. Empty hides it. |
| `subhead` | string | `"Type, rules, and field all snapped to one coarse lattice, with a seeded shimmer crossing it a cell at a time."` | Supporting copy under the headline, in the page's own typeface on lattice snapped lines. Empty hides it. |
| `kicker` | string | `"LOW RES // HIGH SIGNAL"` | A short mono label above the headline. Empty hides it. |
| `actions` | readonly PixelArtHeroAction[] | `[{"label":"Browse components","href":"#components"},{"label":"Read the docs","href":"#docs"}]` | Calls to action, drawn as links inside pixel frames. At most three show, and the first fills with the accent. |
| `align` | "start" \| "center" | `"start"` | Horizontal alignment of the composition: "start" hangs it on the content's edge, "center" centers each part. |
| `columns` | number | `64` | Lattice columns across the host. One lattice pixel is one column wide and half a glyph row tall. |
| `intensity` | number | `0.7` | How much of the field shimmers behind the type, from 0 (empty) to 1. |
| `speed` | number | `9` | Wavefront steps per second. Each step moves the shimmer exactly one lattice pixel, never part of one. |
| `minHeight` | number | `72` | The host's minimum height, in percent of the viewport height. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Children

Put content inside the component. It decorates that content and never changes it.

## Colors

Draws with `--pica-fg`, `--pica-accent`, `--pica-bg`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Pixel Art Hero · pixel-art-hero
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

// lib/blocks.ts
/** Unicode block and braille glyphs for text-mode drawing. Every glyph here is one UTF-16 code unit, so a
 *  table can be indexed like an array. */

/** The braille pattern with no dots raised. Add dot bits to it. */
const BRAILLE_BASE = 0x2800;

/** The bit for the braille dot at `row` 0 to 3 and `col` 0 or 1. Rows 0 to 2 are dots 1 to 3 on the left
 *  and 4 to 6 on the right. Row 3 holds dots 7 and 8, which Unicode added later, so their bits come last. */
function brailleDot(row: number, col: number): number {
  if (row === 3) return col === 0 ? 0x40 : 0x80;
  return 1 << (col === 0 ? row : row + 3);
}

/** The braille glyph for a set of dot bits. */
function braille(bits: number): string {
  return String.fromCharCode(BRAILLE_BASE + (bits & 0xff));
}

/** Quadrant glyphs, indexed by top left 1, top right 2, bottom left 4, and bottom right 8. */
const QUADRANTS = " ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";

/** The glyph that inks the given quadrants of a cell. */
function quadrant(tl: boolean, tr: boolean, bl: boolean, br: boolean): string {
  return QUADRANTS[(tl ? 1 : 0) | (tr ? 2 : 0) | (bl ? 4 : 0) | (br ? 8 : 0)] ?? " ";
}

/** A cell filled from the bottom by 0 to 8 eighths. */
const LOWER_EIGHTHS = " ▁▂▃▄▅▆▇█";

/** A cell filled from the left by 0 to 8 eighths. */
const LEFT_EIGHTHS = " ▏▎▍▌▋▊▉█";

/** Blank, light shade, medium shade, dark shade, and full block. */
const SHADES = " ░▒▓█";

const clampEighths = (n: number): number => Math.max(0, Math.min(8, Math.round(n)));

/** The glyph filling `n` eighths of a cell from the bottom, clamped to 0 to 8. */
function lowerEighth(n: number): string {
  return LOWER_EIGHTHS[clampEighths(n)] ?? " ";
}

/** The shade glyph for level `n`, clamped to 0 (blank) through 4 (full block). */
function shade(n: number): string {
  return SHADES[Math.max(0, Math.min(4, Math.round(n)))] ?? " ";
}

/** The glyph filling `n` eighths of a cell from the left, clamped to 0 to 8. */
function leftEighth(n: number): string {
  return LEFT_EIGHTHS[clampEighths(n)] ?? " ";
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

// lib/glyph-grid.ts
/** A monospace cell grid painted as text rows or onto a canvas. See docs/architecture/contract.md. */

interface GridOptions {
  /** CSS font-family stack. Must be monospace. */
  fontFamily: string;
  /** Glyph size in CSS pixels. Ignored when `columns` is above zero. */
  fontSize: number;
  /** Fit exactly this many columns across the host and derive the glyph size from it. 0 uses `fontSize`. */
  columns: number;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
  /** "dom" keeps glyphs as text and is cheapest up to DOM_CELL_LIMIT cells. "canvas" handles more
   *  cells and per-cell color. "auto" picks by cell count. */
  renderer: "dom" | "canvas" | "auto";
  /** Glyph color. Empty uses --pica-fg, and failing that the host's inherited color. */
  color: string;
}

/** Above this many cells, "auto" paints to a canvas instead of text rows. */
const DOM_CELL_LIMIT = 12000;

interface Grid {
  readonly cols: number;
  readonly rows: number;
  /** Cell width over cell height, for sampling images and fields without stretching them. */
  readonly aspect: number;
  /** Cell width in CSS pixels, for mapping a pointer or a layout onto cells. */
  readonly cellWidth: number;
  /** Cell height in CSS pixels. */
  readonly cellHeight: number;
  /** The CSS font shorthand glyphs are drawn in. */
  readonly font: string;
  /** Writes one glyph into the back buffer. `color` is honored by the canvas renderer only. */
  set(x: number, y: number, glyph: string, color?: string): void;
  /** Writes a string starting at (x, y), clipped to the grid. */
  write(x: number, y: number, text: string, color?: string): void;
  /** Fills the back buffer. */
  clear(glyph?: string): void;
  /** Paints the rows that changed since the last flush. */
  flush(): void;
  update(options: Partial<GridOptions>): void;
  destroy(): void;
}

let measurer: CanvasRenderingContext2D | null | undefined;

/** A glyph's advance as a share of the font size, or 0.6 where nothing can be measured. Measured on every
 *  call, because a web font can finish loading between calls. */
function advanceOf(fontFamily: string): number {
  if (measurer === undefined) measurer = document.createElement("canvas").getContext("2d");
  if (!measurer) return 0.6;
  measurer.font = `100px ${fontFamily}`;
  return measurer.measureText("M").width / 100 || 0.6;
}

/** The cell a glyph grid draws for this font, in CSS pixels. */
function measureCell(fontFamily: string, fontSize: number, lineHeight: number): { w: number; h: number } {
  return { w: fontSize * advanceOf(fontFamily), h: Math.max(1, Math.round(fontSize * lineHeight)) };
}

/** Creates a grid inside `host`. `onLayout` runs whenever the cell count changes (resize, font load),
 *  after which the back buffer is blank and the caller should draw again. */
function createGrid(host: HTMLElement, options: GridOptions, onLayout: () => void): Grid {
  let opts: GridOptions = { ...options };
  let cols = 1;
  let rows = 1;
  let cellW = 7.2;
  let cellH = 14;
  let fontPx = 12;
  let width = -1;
  let height = -1;
  let cells: string[] = [" "];
  let tints: (string | undefined)[] = [undefined];
  let shown: string[] = [];
  let view: HTMLElement | null = null;
  let lines: HTMLElement[] = [];
  let ctx: CanvasRenderingContext2D | null = null;
  let ink = "";
  let alive = true;

  const restoreHost = styleHost(
    host,
    getComputedStyle(host).position === "static" ? { position: "relative", overflow: "hidden" } : { overflow: "hidden" },
  );
  const font = (): string => `${fontPx}px ${opts.fontFamily}`;

  /** Recomputes the cell grid from the host's size. Returns true when the grid was rebuilt. */
  function layout(force: boolean): boolean {
    const w = host.clientWidth;
    const h = host.clientHeight;
    const advance = advanceOf(opts.fontFamily);
    const px = opts.columns > 0 ? Math.max(1, w) / (opts.columns * advance) : opts.fontSize;
    const nextCellH = Math.max(1, Math.round(px * opts.lineHeight));
    const nextCols = Math.max(1, opts.columns > 0 ? opts.columns : Math.floor(w / (px * advance)));
    const nextRows = Math.max(1, Math.floor(h / nextCellH));
    if (!force && w === width && h === height && nextCols === cols && nextRows === rows) return false;
    width = w;
    height = h;
    fontPx = px;
    cellW = px * advance;
    cellH = nextCellH;
    cols = nextCols;
    rows = nextRows;
    cells = new Array<string>(cols * rows).fill(" ");
    tints = new Array<string | undefined>(cols * rows).fill(undefined);
    mountView();
    return true;
  }

  function mountView(): void {
    view?.remove();
    lines = [];
    ctx = null;
    const color = opts.color || cssVar("fg");
    const mode = opts.renderer === "auto" ? (cols * rows > DOM_CELL_LIMIT ? "canvas" : "dom") : opts.renderer;
    if (mode === "dom") {
      const pre = document.createElement("pre");
      pre.style.cssText = [
        "position:absolute", "inset:0", "margin:0", "padding:0", "overflow:hidden",
        "white-space:pre", "letter-spacing:0", "user-select:none", "pointer-events:none",
        "font-kerning:none", "font-variant-ligatures:none",
        `font-family:${opts.fontFamily}`, `font-size:${fontPx}px`, `line-height:${cellH}px`, `color:${color}`,
      ].join(";");
      for (let y = 0; y < rows; y++) {
        const line = document.createElement("span");
        line.style.display = "block";
        line.style.height = `${cellH}px`;
        pre.appendChild(line);
        lines.push(line);
      }
      view = pre;
    } else {
      const canvas = document.createElement("canvas");
      // Text rows follow a palette change through CSS on their own; a canvas has to be painted again. A 1 ms
      // color transition turns any change to its ink into a transitionend, which repaints it, for far fewer
      // bytes than a palette watcher.
      canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;color:${color};transition:color 1ms`;
      canvas.addEventListener("transitionend", (event) => {
        event.stopPropagation();
        if (ctx && view === canvas) paintCanvas(ctx, canvas);
      });
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.textBaseline = "middle";
        ctx.font = font();
      }
      view = canvas;
    }
    view.setAttribute("data-pica", "");
    view.setAttribute("aria-hidden", "true");
    shown = new Array<string>(rows).fill("\u0000");
    ink = "";
    host.appendChild(view);
  }

  function paintCanvas(context: CanvasRenderingContext2D, target: HTMLElement): void {
    const color = getComputedStyle(target).color;
    if (color !== ink) {
      ink = color;
      shown.fill("\u0000");
    }
    for (let y = 0; y < rows; y++) {
      const start = y * cols;
      const text = cells.slice(start, start + cols).join("");
      let tinted = false;
      for (let x = 0; x < cols; x++) {
        if (tints[start + x] !== undefined) {
          tinted = true;
          break;
        }
      }
      const key = tinted ? `${text}\u0000${tints.slice(start, start + cols).join(",")}` : text;
      if (key === shown[y]) continue;
      shown[y] = key;
      const top = y * cellH;
      context.clearRect(0, top, width, cellH);
      if (!tinted) {
        context.fillStyle = ink;
        context.fillText(text, 0, top + cellH / 2);
        continue;
      }
      // One fillText per run of same-colored cells: monospace advances keep every glyph on its cell.
      let x = 0;
      while (x < cols) {
        const tint = tints[start + x] ?? ink;
        let end = x + 1;
        while (end < cols && (tints[start + end] ?? ink) === tint) end++;
        context.fillStyle = tint;
        context.fillText(cells.slice(start + x, start + end).join(""), x * cellW, top + cellH / 2);
        x = end;
      }
    }
  }

  function paintText(): void {
    for (let y = 0; y < rows; y++) {
      const row = cells.slice(y * cols, (y + 1) * cols).join("");
      if (row === shown[y]) continue;
      shown[y] = row;
      const line = lines[y];
      if (line) line.textContent = row;
    }
  }

  function set(x: number, y: number, glyph: string, color?: string): void {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;
    const i = y * cols + x;
    cells[i] = glyph;
    tints[i] = color;
  }

  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => {
        if (alive && layout(false)) onLayout();
      })
    : null;
  resizeObserver?.observe(host);

  const onFonts = (): void => {
    if (alive && layout(true)) onLayout();
  };
  document.fonts.addEventListener("loadingdone", onFonts);

  layout(true);

  return {
    get cols() {
      return cols;
    },
    get rows() {
      return rows;
    },
    get aspect() {
      return cellW / cellH;
    },
    get cellWidth() {
      return cellW;
    },
    get cellHeight() {
      return cellH;
    },
    get font() {
      return font();
    },
    set,
    write(x, y, text, color) {
      let i = 0;
      for (const glyph of text) {
        set(x + i, y, glyph, color);
        i++;
      }
    },
    clear(glyph = " ") {
      cells.fill(glyph);
      tints.fill(undefined);
    },
    flush() {
      if (!view) return;
      if (ctx) paintCanvas(ctx, view);
      else paintText();
    },
    update(next) {
      opts = { ...opts, ...next };
      layout(true);
      onLayout();
    },
    destroy() {
      alive = false;
      resizeObserver?.disconnect();
      document.fonts.removeEventListener("loadingdone", onFonts);
      view?.remove();
      view = null;
      restoreHost();
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

// registry/sections/pixel-art-hero/core.ts
/** One call to action: a link's visible text and destination. */
export interface PixelArtHeroAction {
  /** Text on the link, drawn in mono capitals inside a pixel frame. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface PixelArtHeroProps extends MotionProps {
  /** The headline, drawn in a five row pixel font on the lattice. Letters are uppercased, and any character the font has no shape for draws blank. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline, in the page's own typeface on lattice snapped lines. Empty hides it. */
  subhead: string;
  /** A short mono label above the headline. Empty hides it. */
  kicker: string;
  /** Calls to action, drawn as links inside pixel frames. At most three show, and the first fills with the accent. */
  actions: readonly PixelArtHeroAction[];
  /** Horizontal alignment of the composition: "start" hangs it on the content's edge, "center" centers each part. */
  align: "start" | "center";
  /** Lattice columns across the host. One lattice pixel is one column wide and half a glyph row tall. */
  columns: number;
  /** How much of the field shimmers behind the type, from 0 (empty) to 1. */
  intensity: number;
  /** Wavefront steps per second. Each step moves the shimmer exactly one lattice pixel, never part of one. */
  speed: number;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: PixelArtHeroProps = {
  headline: "PIXEL ART",
  subhead: "Type, rules, and field all snapped to one coarse lattice, with a seeded shimmer crossing it a cell at a time.",
  kicker: "LOW RES // HIGH SIGNAL",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  columns: 64,
  intensity: 0.7,
  speed: 9,
  minHeight: 72,
  paused: false,
  time: null,
  seed: 1,
};

/** Rows in the pixel font. Every glyph below has exactly this many strings. */
const FONT_ROWS = 5;
/** Blank font pixels left between characters. */
const CHAR_GAP = 1;
/** The largest a font pixel may be, in lattice pixels. */
const SCALE_CAP = 3;

/** An original five row pixel font: "#" is ink, "." is blank. Every character's rows share one width. */
const FONT: Readonly<Record<string, readonly string[]>> = {
  " ": ["...", "...", "...", "...", "..."],
  "!": ["##", "##", "##", "..", "##"],
  "'": ["#.", "#.", "..", "..", ".."],
  ",": ["..", "..", "..", "##", ".#"],
  "-": ["...", "...", "###", "...", "..."],
  ".": ["..", "..", "..", "..", "##"],
  "/": ["...#", "..#.", "..#.", ".#..", "#..."],
  ":": ["..", "##", "..", "##", ".."],
  "?": ["###.", "...#", ".##.", "....", ".#.."],
  "0": [".##.", "#.##", "##.#", "#..#", ".##."],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###.", "...#", ".##.", "#...", "####"],
  "3": ["###.", "...#", ".##.", "...#", "###."],
  "4": ["#..#", "#..#", "####", "...#", "...#"],
  "5": ["####", "#...", "###.", "...#", "###."],
  "6": [".##.", "#...", "###.", "#..#", ".##."],
  "7": ["####", "...#", "..#.", ".#..", ".#.."],
  "8": [".##.", "#..#", ".##.", "#..#", ".##."],
  "9": [".##.", "#..#", ".###", "...#", ".##."],
  A: [".##.", "#..#", "####", "#..#", "#..#"],
  B: ["###.", "#..#", "###.", "#..#", "###."],
  C: [".###", "#...", "#...", "#...", ".###"],
  D: ["###.", "#..#", "#..#", "#..#", "###."],
  E: ["####", "#...", "###.", "#...", "####"],
  F: ["####", "#...", "###.", "#...", "#..."],
  G: [".###", "#...", "#.##", "#..#", ".###"],
  H: ["#..#", "#..#", "####", "#..#", "#..#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  J: ["..##", "...#", "...#", "#..#", ".##."],
  K: ["#..#", "#.#.", "##..", "#.#.", "#..#"],
  L: ["#...", "#...", "#...", "#...", "####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  O: [".##.", "#..#", "#..#", "#..#", ".##."],
  P: ["###.", "#..#", "###.", "#...", "#..."],
  Q: [".##.", "#..#", "#..#", "#.#.", ".###"],
  R: ["###.", "#..#", "###.", "#.#.", "#..#"],
  S: [".###", "#...", ".##.", "...#", "###."],
  T: ["####", ".#..", ".#..", ".#..", ".#.."],
  U: ["#..#", "#..#", "#..#", "#..#", ".##."],
  V: ["#..#", "#..#", "#..#", ".##.", ".##."],
  W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
  X: ["#..#", ".##.", ".##.", ".##.", "#..#"],
  Y: ["#..#", "#..#", ".#..", ".#..", ".#.."],
  Z: ["####", "...#", ".##.", "#...", "####"],
};

/** One character's bitmap, falling back to the blank space glyph for anything the font has no shape for. */
function glyphOf(ch: string): readonly string[] {
  return FONT[ch] ?? FONT[" "] ?? [];
}

/** Width of a string in font pixels: glyph widths plus the one pixel gap between characters. */
function fontCols(text: string): number {
  let width = 0;
  for (const ch of text) width += (glyphOf(ch)[0]?.length ?? 0) + CHAR_GAP;
  return Math.max(0, width - CHAR_GAP);
}

/** Wraps a headline into lines of at most `maxCols` font pixels, breaking at spaces and splitting a word
 *  that cannot fit whole. Cap on lines keeps a very long title from filling the screen. */
function wrapHeadline(text: string, maxCols: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur ? `${cur} ${word}` : word;
    if (fontCols(trial) <= maxCols) {
      cur = trial;
      continue;
    }
    if (cur) lines.push(cur);
    if (fontCols(word) <= maxCols) {
      cur = word;
      continue;
    }
    let piece = "";
    for (const ch of word) {
      if (fontCols(piece + ch) <= maxCols) piece += ch;
      else {
        if (piece) lines.push(piece);
        piece = fontCols(ch) <= maxCols ? ch : "";
      }
    }
    cur = piece;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

/** One wrapped line, resolved to its five font rows joined into strings. */
interface LineBits {
  rows: string[];
  /** Width of the line in font pixels. */
  cols: number;
}

/** The headline laid out: wrapped lines, the font pixel size in lattice pixels, and its lattice height. */
interface HeadlinePlan {
  lines: LineBits[];
  /** Lattice pixels per font pixel. */
  scale: number;
  /** Total height in lattice pixels, line gaps included. */
  heightL: number;
}

/** Joins one wrapped line into five font rows. */
function lineBits(line: string): LineBits {
  const gap = " ".repeat(CHAR_GAP);
  const glyphs = [...line].map(glyphOf);
  const rows: string[] = [];
  for (let r = 0; r < FONT_ROWS; r++) rows.push(glyphs.map((g) => g[r] ?? "").join(gap));
  return { rows, cols: rows[0]?.length ?? 0 };
}

/** Chooses the largest font pixel that still fits the content column, then wraps to it. A taller block
 *  than `rowCap` lattice pixels sends the choice down a size, so a long title stays a hero, not a wall. */
function planHeadline(text: string, availL: number): HeadlinePlan {
  const upper = text.toUpperCase();
  const words = upper.split(/\s+/).filter(Boolean);
  const longest = Math.max(0, ...words.map(fontCols));
  const rowCap = 16;
  let scale = 1;
  for (let s = Math.min(SCALE_CAP, availL); s >= 2; s--) {
    const maxCols = Math.floor(availL / s);
    if (maxCols < 8 || longest > maxCols) continue;
    const lines = wrapHeadline(upper, maxCols);
    if (lines.length * (FONT_ROWS + 1) * s <= rowCap) {
      scale = s;
      break;
    }
  }
  const lines = wrapHeadline(upper, Math.max(8, Math.floor(availL / scale))).map(lineBits);
  const heightL = lines.length === 0 ? 0 : lines.length * FONT_ROWS * scale + (lines.length - 1) * scale;
  return { lines, scale, heightL };
}

/** Keeps a number inside a closed range. */
function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return clamp(minHeight, 0, 100);
}

/** The lattice geometry everything shares. A lattice pixel is one glyph column wide and half a glyph row
 *  tall, so the canvas, the type grid, and every snapped box agree on where the lines are. */
interface Lattice {
  /** Lattice pixel width in CSS px. */
  pw: number;
  /** Lattice pixel height in CSS px. */
  ph: number;
  /** Lattice columns across the host. */
  cols: number;
  /** Lattice rows down the host. */
  rows: number;
}

/** A box on the lattice, in lattice pixels. */
interface LatticeBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Creates one element the core owns, marked for identification and restyling. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

export const mount: Mount<PixelArtHeroProps> = (host, initial = {}) => {
  let props: PixelArtHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);

  // The drawn layers sit under the wrapped content: the field canvas first, the type grid above it, so the
  // shimmer shows through the headline's empty cells. Both live in one under layer, which keeps every real
  // child of the host above them and hit testable.
  const under = layer(host, "under");
  const fieldHost = part("div", "field");
  fieldHost.style.cssText = "position:absolute;inset:0";
  const typeHost = part("div", "type");
  typeHost.style.cssText = "position:absolute;inset:0";
  under.el.append(fieldHost, typeHost);

  // The composition leads the section, so its parts go in before the page's own children. The children are
  // never moved or touched; they simply flow after the actions.
  const kickerEl = part("p", "kicker");
  const label = hiddenText(props.headline);
  label.setAttribute("data-pica", "");
  const spacerEl = part("div", "hlspace");
  spacerEl.setAttribute("aria-hidden", "true");
  const subEl = part("p", "sub");
  const actionsEl = part("div", "actions");
  host.prepend(kickerEl, label, spacerEl, subEl, actionsEl);

  let geo: Lattice = { pw: 8, ph: 8, cols: 1, rows: 1 };
  let plan: HeadlinePlan = { lines: [], scale: 1, heightL: 0 };
  let frames: LatticeBox[] = [];
  let ruleRow = -1;
  let cursor: LatticeBox | null = null;
  let now = 0;
  let lastCss = "";

  const surface = createCanvas(fieldHost, { onResize: () => relayout() });
  const ctx = surface.canvas.getContext("2d");
  const grid = createGrid(typeHost, gridOptions(), onGridLayout);
  const pal = watchPalette(host, () => drawCanvas(now));

  function gridOptions() {
    return { fontFamily: GRID_FONT, fontSize: 12, columns: Math.max(1, Math.round(props.columns)), lineHeight: 1, renderer: "auto" as const, color: "" };
  }

  /** Reads the grid the lattice hangs on: one lattice pixel per column, two per row. */
  function readGeo(): Lattice {
    return {
      pw: grid.cellWidth,
      ph: grid.cellHeight / 2,
      cols: grid.cols,
      rows: grid.rows * 2,
    };
  }

  /** The scoped rules for the host, the composition parts, and the action links. Every measure that places
   *  or spaces a box is a whole number of lattice pixels, computed fresh whenever the lattice changes, so
   *  the type, the rules, and the calls to action all land on the same grid. The minimum height goes in a
   *  :where() rule, which carries no specificity, so a page that gives this host a height still wins. */
  function rulesText(): string {
    const fg = cssVar("fg");
    const accent = cssVar("accent");
    const center = props.align === "center";
    const padCols = 4;
    // The content column width keeps the host's parity, so a centered column still lands on lattice lines.
    let capCols = Math.min(46, Math.max(8, geo.cols - padCols * 2));
    if ((capCols + geo.cols) % 2 !== 0) capCols -= 1;
    const capW = Math.round(capCols * geo.pw);
    const padT = Math.round(6 * geo.ph);
    const padX = Math.round(padCols * geo.pw);
    const lhKick = Math.ceil(20 / geo.ph) * geo.ph;
    const lhSub = Math.ceil(25 / geo.ph) * geo.ph;
    const btnH = Math.ceil(42 / geo.ph) * geo.ph;
    const btnPadX = Math.round(2 * geo.pw);
    const rowGap = Math.round(geo.ph);
    const colGap = Math.round(2 * geo.pw);
    const s = sheet.selector;
    const inline = center ? "auto" : "0";
    const textAlign = center ? "center" : "start";
    return [
      `:where(${s}){min-height:${vh(props.minHeight)}vh}`,
      `${s}{position:relative;isolation:isolate;box-sizing:border-box;padding:${padT}px ${padX}px;color:${fg};text-align:${textAlign};overflow-wrap:break-word}`,
      `${s} *{box-sizing:border-box}`,
      `${s} > :not([data-pica]){margin:${Math.round(4 * geo.ph)}px ${inline} 0;max-width:${capW}px}`,
      `${s} > [data-pica-kicker]{margin:0;font-family:${GRID_FONT};font-size:0.72em;letter-spacing:0.14em;text-transform:uppercase;line-height:${lhKick}px;opacity:0.6;white-space:pre-line}`,
      `${s} > [data-pica-hlspace]{display:block;margin:${Math.round(2 * geo.ph)}px 0 0}`,
      `${s} > [data-pica-sub]{margin:${Math.round(3 * geo.ph)}px ${inline} 0;max-width:${capW}px;line-height:${lhSub}px}`,
      `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:flex-start;gap:${rowGap}px ${colGap}px;margin:${Math.round(4 * geo.ph)}px ${inline} 0;max-width:${capW}px;justify-content:${center ? "center" : "flex-start"}}`,
      `${s} > [data-pica-actions]:empty{display:none}`,
      `${s} > [data-pica-actions] a{appearance:none;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;height:${btnH}px;margin:0;padding:0 ${btnPadX}px;font-family:${GRID_FONT};font-size:0.75em;letter-spacing:0.1em;text-transform:uppercase;line-height:1;text-decoration:none;color:${fg};background:transparent;border:0;border-radius:0;cursor:pointer;white-space:nowrap}`,
      `${s} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
      `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 82%, ${fg})}`,
      `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 12%, transparent)}`,
      `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    ].join("\n");
  }

  /** Writes a text part and hides it when it has nothing to say, so an empty prop leaves no empty element. */
  function renderText(el: HTMLElement, text: string): void {
    el.textContent = text;
    el.hidden = text.trim() === "";
  }

  /** Rebuilds the action links from JSON: at most three, the first solid in the accent, the rest outline. */
  function renderActions(): void {
    actionsEl.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.dataset.variant = i === 0 ? "solid" : "outline";
      a.href = action.href || "#";
      a.textContent = action.label;
      actionsEl.append(a);
    }
  }

  /** Snaps every action's box onto the lattice: widths to whole lattice columns, left edges to a column
   *  line, then records each snapped box as the pixel frame the canvas draws. Widths are snapped in DOM
   *  order, and since a snapped width plus a snapped gap leaves the next link on a line, one pass does it. */
  function snapActions(): void {
    const links = Array.from(actionsEl.querySelectorAll("a"));
    frames = [];
    for (const a of links) {
      a.style.width = "";
      a.style.marginLeft = "";
    }
    for (const a of links) {
      const snappedW = Math.ceil(a.offsetWidth / geo.pw) * geo.pw;
      a.style.width = `${snappedW}px`;
      const left = a.offsetLeft;
      a.style.marginLeft = `${Math.round(left / geo.pw) * geo.pw - left}px`;
    }
    for (const a of links) {
      frames.push({
        x0: Math.round(a.offsetLeft / geo.pw),
        y0: Math.round(a.offsetTop / geo.ph),
        x1: Math.round((a.offsetLeft + a.offsetWidth) / geo.pw),
        y1: Math.round((a.offsetTop + a.offsetHeight) / geo.ph),
      });
    }
  }

  /** The whole layout pass: lattice, rules, part sizes, snapped boxes, then a repaint of both layers. */
  function relayout(): void {
    geo = readGeo();
    const css = rulesText();
    if (css !== lastCss) {
      lastCss = css;
      sheet.setRules(css);
    }
    renderText(kickerEl, props.kicker);
    renderText(subEl, props.subhead);
    const padCols = 4;
    const availL = Math.max(8, geo.cols - padCols * 2);
    plan = planHeadline(props.headline, availL);
    spacerEl.style.height = `${Math.round(plan.heightL * geo.ph)}px`;
    spacerEl.style.display = plan.heightL > 0 ? "block" : "none";
    snapActions();
    // The headline's lattice origin is the spacer's snapped offset; the dim rule and the blinking cursor
    // hang off the same anchor. Everything is a whole number of lattice pixels from the padding box origin.
    const topL = Math.round(spacerEl.offsetTop / geo.ph);
    ruleRow = plan.heightL > 0 ? topL + plan.heightL + 1 : -1;
    cursor = null;
    if (plan.lines.length > 0) {
      const last = plan.lines.length - 1;
      const lineCols = plan.lines[last]?.cols ?? 0;
      const origin = lineOrigin(last);
      cursor = { x0: origin + lineCols * plan.scale + plan.scale, y0: topL + last * (FONT_ROWS + 1) * plan.scale, x1: 0, y1: 0 };
      cursor.x1 = Math.min(cursor.x0 + plan.scale, geo.cols);
      cursor.y1 = Math.min(cursor.y0 + FONT_ROWS * plan.scale, geo.rows);
      if (cursor.x0 >= geo.cols || cursor.y0 >= geo.rows) cursor = null;
    }
    drawType(topL);
    drawCanvas(now);
  }

  /** The lattice column a wrapped headline line starts on: the content edge for "start", centered in the
   *  content column for "center". */
  function lineOrigin(index: number): number {
    const padCols = 4;
    const availL = Math.max(8, geo.cols - padCols * 2);
    const widthL = (plan.lines[index]?.cols ?? 0) * plan.scale;
    if (props.align === "center") return padCols + Math.max(0, Math.floor((availL - widthL) / 2));
    return padCols;
  }

  /** Paints the headline into the type grid, packing every two by two block of lattice pixels into one
   *  quadrant glyph, the same trick block-banner uses for its five row font. */
  function drawType(topL: number): void {
    grid.clear();
    for (const [i, line] of plan.lines.entries()) {
      const scale = plan.scale;
      const lx0 = lineOrigin(i);
      const ly0 = topL + i * (FONT_ROWS + 1) * scale;
      const on = (lx: number, ly: number): boolean => {
        const fx = Math.floor((lx - lx0) / scale);
        const fy = Math.floor((ly - ly0) / scale);
        return fx >= 0 && fx < line.cols && fy >= 0 && fy < FONT_ROWS && line.rows[fy]?.charAt(fx) === "#";
      };
      for (let cy = Math.floor(ly0 / 2); cy <= Math.floor((ly0 + FONT_ROWS * scale - 1) / 2); cy++) {
        for (let cx = Math.floor(lx0 / 2); cx <= Math.floor((lx0 + line.cols * scale - 1) / 2); cx++) {
          const glyph = quadrant(on(cx * 2, cy * 2), on(cx * 2 + 1, cy * 2), on(cx * 2, cy * 2 + 1), on(cx * 2 + 1, cy * 2 + 1));
          if (glyph !== " ") grid.set(cx, cy, glyph);
        }
      }
    }
    grid.flush();
  }

  /** Paints the canvas layer: the ground, the field, then the still marks (edge frame, rule, link frames,
   *  cursor) above it. Every rect is a whole lattice pixel, snapped to device pixels so no edge blurs. */
  function drawCanvas(t: number): void {
    now = t;
    if (!ctx) return;
    const { width, height, dpr } = surface;
    const colors = pal.colors;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    const pwD = geo.pw * dpr;
    const phD = geo.ph * dpr;
    const cell = (x: number, y: number, alpha: number, color: string): void => {
      const x0 = Math.round(x * pwD);
      const x1 = Math.round((x + 1) * pwD);
      const y0 = Math.round(y * phD);
      const y1 = Math.round((y + 1) * phD);
      if (x1 <= x0 || y1 <= y0) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    };
    const box = (b: LatticeBox, alpha: number, color: string): void => {
      for (let x = b.x0; x < b.x1; x++) {
        cell(x, b.y0, alpha, color);
        cell(x, b.y1 - 1, alpha, color);
      }
      for (let y = b.y0; y < b.y1; y++) {
        cell(b.x0, y, alpha, color);
        cell(b.x1 - 1, y, alpha, color);
      }
    };
    const solid = (b: LatticeBox, alpha: number, color: string): void => {
      for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) cell(x, y, alpha, color);
    };

    const field = clamp(props.intensity, 0, 1);
    const stepMs = 1000 / clamp(props.speed, 0.5, 60);
    const step = Math.floor(t / stepMs);
    const sweep = geo.cols + geo.rows + 16;
    const toneA: [number, number, number, number] = [0, 0.14, 0.38, 0.85];
    if (field > 0) {
      for (let py = 0; py < geo.rows; py++) {
        for (let px = 0; px < geo.cols; px++) {
          let tone = 0;
          // The shimmer is a seeded diagonal front that advances one lattice pixel per step, with a short
          // wake behind it, plus a sparse scatter of cells that each blink on their own seeded clock.
          const behind = (((step - (px + py)) % sweep) + sweep) % sweep;
          if (behind < Math.max(1, Math.round(2 * field))) tone = 3;
          else if (behind < Math.round(6 * field)) tone = 2;
          else if (behind < Math.round(12 * field)) tone = 1;
          const h = hashSeed(props.seed, px, py) / 4294967296;
          if (h < 0.05 * field) tone = Math.max(tone, 1);
          else if (h < 0.14 * field) {
            const cycle = 1800 + (h * 4096) % 2600;
            if ((t + h * 7919) % cycle < 420) tone = Math.max(tone, 2);
          }
          if (tone > 0) cell(px, py, toneA[tone] ?? 0, colors.fg);
        }
      }
    }

    // The screen's own edge, the rule under the headline, and the frames around the calls to action all
    // draw as lattice pixels, so every straight edge in the hero shares the one grid.
    const dim = toneA[1];
    for (let x = 0; x < geo.cols; x++) {
      cell(x, 0, dim, colors.fg);
      cell(x, geo.rows - 1, dim, colors.fg);
    }
    for (let y = 0; y < geo.rows; y++) {
      cell(0, y, dim, colors.fg);
      cell(geo.cols - 1, y, dim, colors.fg);
    }
    if (ruleRow >= 0 && ruleRow < geo.rows) {
      for (let x = 4; x < geo.cols - 4; x++) cell(x, ruleRow, dim, colors.fg);
    }
    for (const f of frames) box(f, toneA[3] ?? 1, colors.fg);
    if (cursor && Math.floor(t / 530) % 2 === 0) solid(cursor, toneA[3] ?? 1, colors.fg);
    ctx.globalAlpha = 1;
  }

  function onGridLayout(): void {
    relayout();
  }

  function frame(t: number): void {
    drawCanvas(t);
  }

  const onFonts = (): void => relayout();
  document.fonts.addEventListener("loadingdone", onFonts);

  renderActions();
  relayout();
  const loop = createLoop({
    el: host,
    fps: Math.round(clamp(props.speed + 3, 8, 30)),
    still: 5000,
    paused: props.paused,
    time: props.time,
    frame,
  });
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (pal.refresh()) drawCanvas(now);
      if (props.columns !== before.columns) grid.update(gridOptions());
      if (
        props.headline !== before.headline ||
        props.subhead !== before.subhead ||
        props.kicker !== before.kicker ||
        props.align !== before.align ||
        props.minHeight !== before.minHeight ||
        props.columns !== before.columns
      ) {
        relayout();
      }
      if (!sameJson(before.actions, props.actions)) {
        renderActions();
        snapActions();
      }
      label.textContent = props.headline;
      if (props.speed !== before.speed) loop.update({ fps: Math.round(clamp(props.speed + 3, 8, 30)) });
      if (props.paused !== before.paused || props.time !== before.time) loop.update({ paused: props.paused, time: props.time });
      if (props.intensity !== before.intensity || props.seed !== before.seed || !sameJson(before.actions, props.actions)) drawCanvas(now);
    },
    destroy() {
      document.fonts.removeEventListener("loadingdone", onFonts);
      loop.destroy();
      grid.destroy();
      surface.destroy();
      pal.destroy();
      under.remove();
      kickerEl.remove();
      label.remove();
      spacerEl.remove();
      subEl.remove();
      actionsEl.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/pixel-art-hero/index.tsx
export type PixelArtHeroComponentProps = Partial<PixelArtHeroProps> & WrapperProps & { children?: ReactNode };

/** A page hero drawn as one low resolution screen: pixel type, snapped frames, and a shimmering field. */
export function PixelArtHero({ className, style, palette, children, ...props }: PixelArtHeroComponentProps) {
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
  Pica · Pixel Art Hero · pixel-art-hero
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Pixel Art Hero · Pica</title>
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
<div id="pica"><h2>The rest of the page keeps its own type.</h2><p>Wrapped copy lands under the actions in the page's font, snapped to the same lattice.</p></div>
<script>
"use strict";
var PicaPixelArtHero = (() => {
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

  // registry/sections/pixel-art-hero/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/a11y.ts
  function hiddenText(text) {
    const span = document.createElement("span");
    span.textContent = text;
    span.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
    return span;
  }

  // lib/blocks.ts
  var QUADRANTS = " ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";
  function quadrant(tl, tr, bl, br) {
    return QUADRANTS[(tl ? 1 : 0) | (tr ? 2 : 0) | (bl ? 4 : 0) | (br ? 8 : 0)] ?? " ";
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

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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

  // lib/glyph-grid.ts
  var DOM_CELL_LIMIT = 12e3;
  var measurer;
  function advanceOf(fontFamily) {
    if (measurer === void 0) measurer = document.createElement("canvas").getContext("2d");
    if (!measurer) return 0.6;
    measurer.font = `100px ${fontFamily}`;
    return measurer.measureText("M").width / 100 || 0.6;
  }
  function createGrid(host, options, onLayout) {
    let opts = { ...options };
    let cols = 1;
    let rows = 1;
    let cellW = 7.2;
    let cellH = 14;
    let fontPx = 12;
    let width = -1;
    let height = -1;
    let cells = [" "];
    let tints = [void 0];
    let shown = [];
    let view = null;
    let lines = [];
    let ctx = null;
    let ink = "";
    let alive = true;
    const restoreHost = styleHost(
      host,
      getComputedStyle(host).position === "static" ? { position: "relative", overflow: "hidden" } : { overflow: "hidden" }
    );
    const font = () => `${fontPx}px ${opts.fontFamily}`;
    function layout(force) {
      const w = host.clientWidth;
      const h = host.clientHeight;
      const advance = advanceOf(opts.fontFamily);
      const px = opts.columns > 0 ? Math.max(1, w) / (opts.columns * advance) : opts.fontSize;
      const nextCellH = Math.max(1, Math.round(px * opts.lineHeight));
      const nextCols = Math.max(1, opts.columns > 0 ? opts.columns : Math.floor(w / (px * advance)));
      const nextRows = Math.max(1, Math.floor(h / nextCellH));
      if (!force && w === width && h === height && nextCols === cols && nextRows === rows) return false;
      width = w;
      height = h;
      fontPx = px;
      cellW = px * advance;
      cellH = nextCellH;
      cols = nextCols;
      rows = nextRows;
      cells = new Array(cols * rows).fill(" ");
      tints = new Array(cols * rows).fill(void 0);
      mountView();
      return true;
    }
    function mountView() {
      view?.remove();
      lines = [];
      ctx = null;
      const color = opts.color || cssVar("fg");
      const mode = opts.renderer === "auto" ? cols * rows > DOM_CELL_LIMIT ? "canvas" : "dom" : opts.renderer;
      if (mode === "dom") {
        const pre = document.createElement("pre");
        pre.style.cssText = [
          "position:absolute",
          "inset:0",
          "margin:0",
          "padding:0",
          "overflow:hidden",
          "white-space:pre",
          "letter-spacing:0",
          "user-select:none",
          "pointer-events:none",
          "font-kerning:none",
          "font-variant-ligatures:none",
          `font-family:${opts.fontFamily}`,
          `font-size:${fontPx}px`,
          `line-height:${cellH}px`,
          `color:${color}`
        ].join(";");
        for (let y = 0; y < rows; y++) {
          const line = document.createElement("span");
          line.style.display = "block";
          line.style.height = `${cellH}px`;
          pre.appendChild(line);
          lines.push(line);
        }
        view = pre;
      } else {
        const canvas = document.createElement("canvas");
        canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;color:${color};transition:color 1ms`;
        canvas.addEventListener("transitionend", (event) => {
          event.stopPropagation();
          if (ctx && view === canvas) paintCanvas(ctx, canvas);
        });
        const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.textBaseline = "middle";
          ctx.font = font();
        }
        view = canvas;
      }
      view.setAttribute("data-pica", "");
      view.setAttribute("aria-hidden", "true");
      shown = new Array(rows).fill("\0");
      ink = "";
      host.appendChild(view);
    }
    function paintCanvas(context, target) {
      const color = getComputedStyle(target).color;
      if (color !== ink) {
        ink = color;
        shown.fill("\0");
      }
      for (let y = 0; y < rows; y++) {
        const start = y * cols;
        const text = cells.slice(start, start + cols).join("");
        let tinted = false;
        for (let x2 = 0; x2 < cols; x2++) {
          if (tints[start + x2] !== void 0) {
            tinted = true;
            break;
          }
        }
        const key = tinted ? `${text}\0${tints.slice(start, start + cols).join(",")}` : text;
        if (key === shown[y]) continue;
        shown[y] = key;
        const top = y * cellH;
        context.clearRect(0, top, width, cellH);
        if (!tinted) {
          context.fillStyle = ink;
          context.fillText(text, 0, top + cellH / 2);
          continue;
        }
        let x = 0;
        while (x < cols) {
          const tint = tints[start + x] ?? ink;
          let end = x + 1;
          while (end < cols && (tints[start + end] ?? ink) === tint) end++;
          context.fillStyle = tint;
          context.fillText(cells.slice(start + x, start + end).join(""), x * cellW, top + cellH / 2);
          x = end;
        }
      }
    }
    function paintText() {
      for (let y = 0; y < rows; y++) {
        const row = cells.slice(y * cols, (y + 1) * cols).join("");
        if (row === shown[y]) continue;
        shown[y] = row;
        const line = lines[y];
        if (line) line.textContent = row;
      }
    }
    function set(x, y, glyph, color) {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      const i = y * cols + x;
      cells[i] = glyph;
      tints[i] = color;
    }
    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
      if (alive && layout(false)) onLayout();
    }) : null;
    resizeObserver?.observe(host);
    const onFonts = () => {
      if (alive && layout(true)) onLayout();
    };
    document.fonts.addEventListener("loadingdone", onFonts);
    layout(true);
    return {
      get cols() {
        return cols;
      },
      get rows() {
        return rows;
      },
      get aspect() {
        return cellW / cellH;
      },
      get cellWidth() {
        return cellW;
      },
      get cellHeight() {
        return cellH;
      },
      get font() {
        return font();
      },
      set,
      write(x, y, text, color) {
        let i = 0;
        for (const glyph of text) {
          set(x + i, y, glyph, color);
          i++;
        }
      },
      clear(glyph = " ") {
        cells.fill(glyph);
        tints.fill(void 0);
      },
      flush() {
        if (!view) return;
        if (ctx) paintCanvas(ctx, view);
        else paintText();
      },
      update(next) {
        opts = { ...opts, ...next };
        layout(true);
        onLayout();
      },
      destroy() {
        alive = false;
        resizeObserver?.disconnect();
        document.fonts.removeEventListener("loadingdone", onFonts);
        view?.remove();
        view = null;
        restoreHost();
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

  // lib/rng.ts
  function hashMix(h) {
    h = Math.imul(h ^ h >>> 16, 2146121005);
    h = Math.imul(h ^ h >>> 15, 2221713035);
    return (h ^ h >>> 16) >>> 0;
  }
  function hashSeed(seed, a, b = 0) {
    return hashMix(hashMix(hashMix(seed >>> 0) ^ a >>> 0) ^ b >>> 0);
  }

  // registry/sections/pixel-art-hero/core.ts
  var defaults = {
    headline: "PIXEL ART",
    subhead: "Type, rules, and field all snapped to one coarse lattice, with a seeded shimmer crossing it a cell at a time.",
    kicker: "LOW RES // HIGH SIGNAL",
    actions: [
      { label: "Browse components", href: "#components" },
      { label: "Read the docs", href: "#docs" }
    ],
    align: "start",
    columns: 64,
    intensity: 0.7,
    speed: 9,
    minHeight: 72,
    paused: false,
    time: null,
    seed: 1
  };
  var FONT_ROWS = 5;
  var CHAR_GAP = 1;
  var SCALE_CAP = 3;
  var FONT = {
    " ": ["...", "...", "...", "...", "..."],
    "!": ["##", "##", "##", "..", "##"],
    "'": ["#.", "#.", "..", "..", ".."],
    ",": ["..", "..", "..", "##", ".#"],
    "-": ["...", "...", "###", "...", "..."],
    ".": ["..", "..", "..", "..", "##"],
    "/": ["...#", "..#.", "..#.", ".#..", "#..."],
    ":": ["..", "##", "..", "##", ".."],
    "?": ["###.", "...#", ".##.", "....", ".#.."],
    "0": [".##.", "#.##", "##.#", "#..#", ".##."],
    "1": [".#.", "##.", ".#.", ".#.", "###"],
    "2": ["###.", "...#", ".##.", "#...", "####"],
    "3": ["###.", "...#", ".##.", "...#", "###."],
    "4": ["#..#", "#..#", "####", "...#", "...#"],
    "5": ["####", "#...", "###.", "...#", "###."],
    "6": [".##.", "#...", "###.", "#..#", ".##."],
    "7": ["####", "...#", "..#.", ".#..", ".#.."],
    "8": [".##.", "#..#", ".##.", "#..#", ".##."],
    "9": [".##.", "#..#", ".###", "...#", ".##."],
    A: [".##.", "#..#", "####", "#..#", "#..#"],
    B: ["###.", "#..#", "###.", "#..#", "###."],
    C: [".###", "#...", "#...", "#...", ".###"],
    D: ["###.", "#..#", "#..#", "#..#", "###."],
    E: ["####", "#...", "###.", "#...", "####"],
    F: ["####", "#...", "###.", "#...", "#..."],
    G: [".###", "#...", "#.##", "#..#", ".###"],
    H: ["#..#", "#..#", "####", "#..#", "#..#"],
    I: ["###", ".#.", ".#.", ".#.", "###"],
    J: ["..##", "...#", "...#", "#..#", ".##."],
    K: ["#..#", "#.#.", "##..", "#.#.", "#..#"],
    L: ["#...", "#...", "#...", "#...", "####"],
    M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
    N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
    O: [".##.", "#..#", "#..#", "#..#", ".##."],
    P: ["###.", "#..#", "###.", "#...", "#..."],
    Q: [".##.", "#..#", "#..#", "#.#.", ".###"],
    R: ["###.", "#..#", "###.", "#.#.", "#..#"],
    S: [".###", "#...", ".##.", "...#", "###."],
    T: ["####", ".#..", ".#..", ".#..", ".#.."],
    U: ["#..#", "#..#", "#..#", "#..#", ".##."],
    V: ["#..#", "#..#", "#..#", ".##.", ".##."],
    W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
    X: ["#..#", ".##.", ".##.", ".##.", "#..#"],
    Y: ["#..#", "#..#", ".#..", ".#..", ".#.."],
    Z: ["####", "...#", ".##.", "#...", "####"]
  };
  function glyphOf(ch) {
    return FONT[ch] ?? FONT[" "] ?? [];
  }
  function fontCols(text) {
    let width = 0;
    for (const ch of text) width += (glyphOf(ch)[0]?.length ?? 0) + CHAR_GAP;
    return Math.max(0, width - CHAR_GAP);
  }
  function wrapHeadline(text, maxCols) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = "";
    for (const word of words) {
      const trial = cur ? `${cur} ${word}` : word;
      if (fontCols(trial) <= maxCols) {
        cur = trial;
        continue;
      }
      if (cur) lines.push(cur);
      if (fontCols(word) <= maxCols) {
        cur = word;
        continue;
      }
      let piece = "";
      for (const ch of word) {
        if (fontCols(piece + ch) <= maxCols) piece += ch;
        else {
          if (piece) lines.push(piece);
          piece = fontCols(ch) <= maxCols ? ch : "";
        }
      }
      cur = piece;
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 4);
  }
  function lineBits(line) {
    const gap = " ".repeat(CHAR_GAP);
    const glyphs = [...line].map(glyphOf);
    const rows = [];
    for (let r = 0; r < FONT_ROWS; r++) rows.push(glyphs.map((g) => g[r] ?? "").join(gap));
    return { rows, cols: rows[0]?.length ?? 0 };
  }
  function planHeadline(text, availL) {
    const upper = text.toUpperCase();
    const words = upper.split(/\s+/).filter(Boolean);
    const longest = Math.max(0, ...words.map(fontCols));
    const rowCap = 16;
    let scale = 1;
    for (let s = Math.min(SCALE_CAP, availL); s >= 2; s--) {
      const maxCols = Math.floor(availL / s);
      if (maxCols < 8 || longest > maxCols) continue;
      const lines2 = wrapHeadline(upper, maxCols);
      if (lines2.length * (FONT_ROWS + 1) * s <= rowCap) {
        scale = s;
        break;
      }
    }
    const lines = wrapHeadline(upper, Math.max(8, Math.floor(availL / scale))).map(lineBits);
    const heightL = lines.length === 0 ? 0 : lines.length * FONT_ROWS * scale + (lines.length - 1) * scale;
    return { lines, scale, heightL };
  }
  function clamp(value, lo, hi) {
    return Math.min(hi, Math.max(lo, value));
  }
  function vh(minHeight) {
    return clamp(minHeight, 0, 100);
  }
  function part(tag, name) {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    node.setAttribute(`data-pica-${name}`, "");
    return node;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    const sheet = scope(host);
    const under = layer(host, "under");
    const fieldHost = part("div", "field");
    fieldHost.style.cssText = "position:absolute;inset:0";
    const typeHost = part("div", "type");
    typeHost.style.cssText = "position:absolute;inset:0";
    under.el.append(fieldHost, typeHost);
    const kickerEl = part("p", "kicker");
    const label = hiddenText(props.headline);
    label.setAttribute("data-pica", "");
    const spacerEl = part("div", "hlspace");
    spacerEl.setAttribute("aria-hidden", "true");
    const subEl = part("p", "sub");
    const actionsEl = part("div", "actions");
    host.prepend(kickerEl, label, spacerEl, subEl, actionsEl);
    let geo = { pw: 8, ph: 8, cols: 1, rows: 1 };
    let plan = { lines: [], scale: 1, heightL: 0 };
    let frames = [];
    let ruleRow = -1;
    let cursor = null;
    let now = 0;
    let lastCss = "";
    const surface = createCanvas(fieldHost, { onResize: () => relayout() });
    const ctx = surface.canvas.getContext("2d");
    const grid = createGrid(typeHost, gridOptions(), onGridLayout);
    const pal = watchPalette(host, () => drawCanvas(now));
    function gridOptions() {
      return { fontFamily: GRID_FONT, fontSize: 12, columns: Math.max(1, Math.round(props.columns)), lineHeight: 1, renderer: "auto", color: "" };
    }
    function readGeo() {
      return {
        pw: grid.cellWidth,
        ph: grid.cellHeight / 2,
        cols: grid.cols,
        rows: grid.rows * 2
      };
    }
    function rulesText() {
      const fg = cssVar("fg");
      const accent = cssVar("accent");
      const center = props.align === "center";
      const padCols = 4;
      let capCols = Math.min(46, Math.max(8, geo.cols - padCols * 2));
      if ((capCols + geo.cols) % 2 !== 0) capCols -= 1;
      const capW = Math.round(capCols * geo.pw);
      const padT = Math.round(6 * geo.ph);
      const padX = Math.round(padCols * geo.pw);
      const lhKick = Math.ceil(20 / geo.ph) * geo.ph;
      const lhSub = Math.ceil(25 / geo.ph) * geo.ph;
      const btnH = Math.ceil(42 / geo.ph) * geo.ph;
      const btnPadX = Math.round(2 * geo.pw);
      const rowGap = Math.round(geo.ph);
      const colGap = Math.round(2 * geo.pw);
      const s = sheet.selector;
      const inline = center ? "auto" : "0";
      const textAlign = center ? "center" : "start";
      return [
        `:where(${s}){min-height:${vh(props.minHeight)}vh}`,
        `${s}{position:relative;isolation:isolate;box-sizing:border-box;padding:${padT}px ${padX}px;color:${fg};text-align:${textAlign};overflow-wrap:break-word}`,
        `${s} *{box-sizing:border-box}`,
        `${s} > :not([data-pica]){margin:${Math.round(4 * geo.ph)}px ${inline} 0;max-width:${capW}px}`,
        `${s} > [data-pica-kicker]{margin:0;font-family:${GRID_FONT};font-size:0.72em;letter-spacing:0.14em;text-transform:uppercase;line-height:${lhKick}px;opacity:0.6;white-space:pre-line}`,
        `${s} > [data-pica-hlspace]{display:block;margin:${Math.round(2 * geo.ph)}px 0 0}`,
        `${s} > [data-pica-sub]{margin:${Math.round(3 * geo.ph)}px ${inline} 0;max-width:${capW}px;line-height:${lhSub}px}`,
        `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:flex-start;gap:${rowGap}px ${colGap}px;margin:${Math.round(4 * geo.ph)}px ${inline} 0;max-width:${capW}px;justify-content:${center ? "center" : "flex-start"}}`,
        `${s} > [data-pica-actions]:empty{display:none}`,
        `${s} > [data-pica-actions] a{appearance:none;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;height:${btnH}px;margin:0;padding:0 ${btnPadX}px;font-family:${GRID_FONT};font-size:0.75em;letter-spacing:0.1em;text-transform:uppercase;line-height:1;text-decoration:none;color:${fg};background:transparent;border:0;border-radius:0;cursor:pointer;white-space:nowrap}`,
        `${s} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
        `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 82%, ${fg})}`,
        `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 12%, transparent)}`,
        `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`
      ].join("\n");
    }
    function renderText(el, text) {
      el.textContent = text;
      el.hidden = text.trim() === "";
    }
    function renderActions() {
      actionsEl.replaceChildren();
      for (const [i, action] of props.actions.slice(0, 3).entries()) {
        const a = document.createElement("a");
        a.setAttribute("data-pica", "");
        a.dataset.variant = i === 0 ? "solid" : "outline";
        a.href = action.href || "#";
        a.textContent = action.label;
        actionsEl.append(a);
      }
    }
    function snapActions() {
      const links = Array.from(actionsEl.querySelectorAll("a"));
      frames = [];
      for (const a of links) {
        a.style.width = "";
        a.style.marginLeft = "";
      }
      for (const a of links) {
        const snappedW = Math.ceil(a.offsetWidth / geo.pw) * geo.pw;
        a.style.width = `${snappedW}px`;
        const left = a.offsetLeft;
        a.style.marginLeft = `${Math.round(left / geo.pw) * geo.pw - left}px`;
      }
      for (const a of links) {
        frames.push({
          x0: Math.round(a.offsetLeft / geo.pw),
          y0: Math.round(a.offsetTop / geo.ph),
          x1: Math.round((a.offsetLeft + a.offsetWidth) / geo.pw),
          y1: Math.round((a.offsetTop + a.offsetHeight) / geo.ph)
        });
      }
    }
    function relayout() {
      geo = readGeo();
      const css = rulesText();
      if (css !== lastCss) {
        lastCss = css;
        sheet.setRules(css);
      }
      renderText(kickerEl, props.kicker);
      renderText(subEl, props.subhead);
      const padCols = 4;
      const availL = Math.max(8, geo.cols - padCols * 2);
      plan = planHeadline(props.headline, availL);
      spacerEl.style.height = `${Math.round(plan.heightL * geo.ph)}px`;
      spacerEl.style.display = plan.heightL > 0 ? "block" : "none";
      snapActions();
      const topL = Math.round(spacerEl.offsetTop / geo.ph);
      ruleRow = plan.heightL > 0 ? topL + plan.heightL + 1 : -1;
      cursor = null;
      if (plan.lines.length > 0) {
        const last = plan.lines.length - 1;
        const lineCols = plan.lines[last]?.cols ?? 0;
        const origin = lineOrigin(last);
        cursor = { x0: origin + lineCols * plan.scale + plan.scale, y0: topL + last * (FONT_ROWS + 1) * plan.scale, x1: 0, y1: 0 };
        cursor.x1 = Math.min(cursor.x0 + plan.scale, geo.cols);
        cursor.y1 = Math.min(cursor.y0 + FONT_ROWS * plan.scale, geo.rows);
        if (cursor.x0 >= geo.cols || cursor.y0 >= geo.rows) cursor = null;
      }
      drawType(topL);
      drawCanvas(now);
    }
    function lineOrigin(index) {
      const padCols = 4;
      const availL = Math.max(8, geo.cols - padCols * 2);
      const widthL = (plan.lines[index]?.cols ?? 0) * plan.scale;
      if (props.align === "center") return padCols + Math.max(0, Math.floor((availL - widthL) / 2));
      return padCols;
    }
    function drawType(topL) {
      grid.clear();
      for (const [i, line] of plan.lines.entries()) {
        const scale = plan.scale;
        const lx0 = lineOrigin(i);
        const ly0 = topL + i * (FONT_ROWS + 1) * scale;
        const on = (lx, ly) => {
          const fx = Math.floor((lx - lx0) / scale);
          const fy = Math.floor((ly - ly0) / scale);
          return fx >= 0 && fx < line.cols && fy >= 0 && fy < FONT_ROWS && line.rows[fy]?.charAt(fx) === "#";
        };
        for (let cy = Math.floor(ly0 / 2); cy <= Math.floor((ly0 + FONT_ROWS * scale - 1) / 2); cy++) {
          for (let cx = Math.floor(lx0 / 2); cx <= Math.floor((lx0 + line.cols * scale - 1) / 2); cx++) {
            const glyph = quadrant(on(cx * 2, cy * 2), on(cx * 2 + 1, cy * 2), on(cx * 2, cy * 2 + 1), on(cx * 2 + 1, cy * 2 + 1));
            if (glyph !== " ") grid.set(cx, cy, glyph);
          }
        }
      }
      grid.flush();
    }
    function drawCanvas(t) {
      now = t;
      if (!ctx) return;
      const { width, height, dpr } = surface;
      const colors = pal.colors;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);
      const pwD = geo.pw * dpr;
      const phD = geo.ph * dpr;
      const cell = (x, y, alpha, color) => {
        const x0 = Math.round(x * pwD);
        const x1 = Math.round((x + 1) * pwD);
        const y0 = Math.round(y * phD);
        const y1 = Math.round((y + 1) * phD);
        if (x1 <= x0 || y1 <= y0) return;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      };
      const box = (b, alpha, color) => {
        for (let x = b.x0; x < b.x1; x++) {
          cell(x, b.y0, alpha, color);
          cell(x, b.y1 - 1, alpha, color);
        }
        for (let y = b.y0; y < b.y1; y++) {
          cell(b.x0, y, alpha, color);
          cell(b.x1 - 1, y, alpha, color);
        }
      };
      const solid = (b, alpha, color) => {
        for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) cell(x, y, alpha, color);
      };
      const field = clamp(props.intensity, 0, 1);
      const stepMs = 1e3 / clamp(props.speed, 0.5, 60);
      const step = Math.floor(t / stepMs);
      const sweep = geo.cols + geo.rows + 16;
      const toneA = [0, 0.14, 0.38, 0.85];
      if (field > 0) {
        for (let py = 0; py < geo.rows; py++) {
          for (let px = 0; px < geo.cols; px++) {
            let tone = 0;
            const behind = ((step - (px + py)) % sweep + sweep) % sweep;
            if (behind < Math.max(1, Math.round(2 * field))) tone = 3;
            else if (behind < Math.round(6 * field)) tone = 2;
            else if (behind < Math.round(12 * field)) tone = 1;
            const h = hashSeed(props.seed, px, py) / 4294967296;
            if (h < 0.05 * field) tone = Math.max(tone, 1);
            else if (h < 0.14 * field) {
              const cycle = 1800 + h * 4096 % 2600;
              if ((t + h * 7919) % cycle < 420) tone = Math.max(tone, 2);
            }
            if (tone > 0) cell(px, py, toneA[tone] ?? 0, colors.fg);
          }
        }
      }
      const dim = toneA[1];
      for (let x = 0; x < geo.cols; x++) {
        cell(x, 0, dim, colors.fg);
        cell(x, geo.rows - 1, dim, colors.fg);
      }
      for (let y = 0; y < geo.rows; y++) {
        cell(0, y, dim, colors.fg);
        cell(geo.cols - 1, y, dim, colors.fg);
      }
      if (ruleRow >= 0 && ruleRow < geo.rows) {
        for (let x = 4; x < geo.cols - 4; x++) cell(x, ruleRow, dim, colors.fg);
      }
      for (const f of frames) box(f, toneA[3] ?? 1, colors.fg);
      if (cursor && Math.floor(t / 530) % 2 === 0) solid(cursor, toneA[3] ?? 1, colors.fg);
      ctx.globalAlpha = 1;
    }
    function onGridLayout() {
      relayout();
    }
    function frame(t) {
      drawCanvas(t);
    }
    const onFonts = () => relayout();
    document.fonts.addEventListener("loadingdone", onFonts);
    renderActions();
    relayout();
    const loop = createLoop({
      el: host,
      fps: Math.round(clamp(props.speed + 3, 8, 30)),
      still: 5e3,
      paused: props.paused,
      time: props.time,
      frame
    });
    host.dataset.picaReady = "true";
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (pal.refresh()) drawCanvas(now);
        if (props.columns !== before.columns) grid.update(gridOptions());
        if (props.headline !== before.headline || props.subhead !== before.subhead || props.kicker !== before.kicker || props.align !== before.align || props.minHeight !== before.minHeight || props.columns !== before.columns) {
          relayout();
        }
        if (!sameJson(before.actions, props.actions)) {
          renderActions();
          snapActions();
        }
        label.textContent = props.headline;
        if (props.speed !== before.speed) loop.update({ fps: Math.round(clamp(props.speed + 3, 8, 30)) });
        if (props.paused !== before.paused || props.time !== before.time) loop.update({ paused: props.paused, time: props.time });
        if (props.intensity !== before.intensity || props.seed !== before.seed || !sameJson(before.actions, props.actions)) drawCanvas(now);
      },
      destroy() {
        document.fonts.removeEventListener("loadingdone", onFonts);
        loop.destroy();
        grid.destroy();
        surface.destroy();
        pal.destroy();
        under.remove();
        kickerEl.remove();
        label.remove();
        spacerEl.remove();
        subEl.remove();
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
  var instance = PicaPixelArtHero.mount(host, take(window.PICA_PROPS || {}));
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
