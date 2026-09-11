# ASCII Pointer Ripple

> A glyph field of low-density noise that sends rippling rings outward from the pointer, as if the grid were water.

Category: ascii. Tags: pointer, ripple, noise, interactive. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 5.1 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/ascii-pointer-ripple.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `growth` | number | `18` | How many cells per second a ripple's ring moves outward. |
| `width` | number | `2.5` | How wide a ripple's ring is, in cells. |
| `lifetime` | number | `1.6` | Seconds a ripple takes to expand and fade away completely. |
| `strength` | number | `0.8` | Ink a fresh ripple's ring adds at its peak, 0 to 1. |
| `base` | number | `0.12` | Ink of the resting field with no ripples on it, 0 to 0.4. |
| `glyphs` | string | `" .:-=+*#%@"` | Glyphs to draw with, in any order: they are sorted by the ink each one puts down in the font. |
| `fontSize` | number | `12` | Glyph size in CSS pixels. |
| `fontFamily` | string | `"\"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Menlo, monospace"` | CSS font-family stack for the glyphs. Must be monospace. |
| `lineHeight` | number | `1.2` | Line height as a multiple of the glyph size. |
| `fps` | number | `30` | Frames per second ceiling. |
| `paused` | boolean | `false` | Stop animating and hold the current frame. |
| `time` | number \| null | `null` | Render exactly this animation time, in milliseconds, and do not animate. Null animates. |
| `seed` | number | `1` | Seed for every random choice, so the same seed always draws the same frame. |

## Colors

Draws with `--pica-fg`. Set it on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · ASCII Pointer Ripple · ascii-pointer-ripple
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

// lib/font.ts
/** The monospace stack glyph components default to. It lives in its own module, so a text component that
 *  never draws a grid does not carry lib/glyph-grid.ts into its single React file just for the font. */
const GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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

// lib/ramp.ts
/** Glyph density measured in the font actually in use. See STYLE.md, principle 2. */

/** Used when no glyphs are given: ten steps from space to at-sign. */
const FALLBACK_RAMP = " .:-=+*#%@";

interface Ramp {
  /** Glyphs from least to most ink. */
  readonly glyphs: readonly string[];
  /** Ink per glyph, scaled so the lightest is 0 and the darkest is 1. */
  readonly levels: readonly number[];
}

interface Shapes {
  readonly glyphs: readonly string[];
  /** Sub-cells per side. */
  readonly n: number;
  /** Ink per glyph in an n by n grid of sub-cells, row-major, scaled so the inkiest sub-cell of any glyph is 1. */
  readonly cells: readonly (readonly number[])[];
}

const rampCache = new Map<string, Ramp>();
const shapeCache = new Map<string, Shapes>();

function uniqueGlyphs(chars: string): string[] {
  return Array.from(new Set(Array.from(chars.length > 0 ? chars : FALLBACK_RAMP)));
}

/** A measurement taken before a web font loads describes the fallback font, so it is not cached. */
function fontSettled(fontFamily: string): boolean {
  try {
    return document.fonts.check(`12px ${fontFamily}`);
  } catch {
    return true;
  }
}

/** Draws each glyph in one cell and reads its ink per sub-cell. Null where there is no canvas. */
function inkMaps(glyphs: readonly string[], fontFamily: string, lineHeight: number, n: number): number[][] | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const fontPx = 40;
  ctx.font = `${fontPx}px ${fontFamily}`;
  const w = Math.max(1, Math.ceil(ctx.measureText("M").width || fontPx * 0.6));
  const h = Math.max(1, Math.ceil(fontPx * lineHeight));
  canvas.width = w;
  canvas.height = h;
  ctx.font = `${fontPx}px ${fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  return glyphs.map((glyph) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillText(glyph, 0, h / 2);
    const alpha = ctx.getImageData(0, 0, w, h).data;
    const sums = new Array<number>(n * n).fill(0);
    for (let y = 0; y < h; y++) {
      const sy = Math.min(n - 1, Math.floor((y / h) * n));
      for (let x = 0; x < w; x++) {
        const k = sy * n + Math.min(n - 1, Math.floor((x / w) * n));
        sums[k] = (sums[k] ?? 0) + (alpha[(y * w + x) * 4 + 3] ?? 0);
      }
    }
    return sums;
  });
}

/** Orders `chars` by the ink each glyph puts down in `fontFamily`. Where there is no canvas
 *  (server rendering, tests) it keeps the given order, evenly spaced. */
function measureRamp(chars: string, fontFamily: string, lineHeight = 1.2): Ramp {
  const glyphs = uniqueGlyphs(chars);
  const key = `${fontFamily}|${lineHeight}|${glyphs.join("")}`;
  const cached = rampCache.get(key);
  if (cached) return cached;
  const maps = inkMaps(glyphs, fontFamily, lineHeight, 1);
  if (!maps) {
    const last = Math.max(1, glyphs.length - 1);
    return { glyphs, levels: glyphs.map((_, i) => i / last) };
  }
  const order = glyphs
    .map((glyph, i) => ({ glyph, ink: maps[i]?.[0] ?? 0 }))
    .sort((a, b) => a.ink - b.ink);
  const lightest = order[0]?.ink ?? 0;
  const span = (order[order.length - 1]?.ink ?? 1) - lightest || 1;
  const ramp: Ramp = {
    glyphs: order.map((o) => o.glyph),
    levels: order.map((o) => (o.ink - lightest) / span),
  };
  if (fontSettled(fontFamily)) rampCache.set(key, ramp);
  return ramp;
}

/** The glyph whose measured ink is nearest `v`, where 0 is no ink and 1 is the darkest glyph. */
function pick(ramp: Ramp, v: number): string {
  const { glyphs, levels } = ramp;
  const last = glyphs.length - 1;
  if (last < 0) return " ";
  if (v <= 0) return glyphs[0] ?? " ";
  if (v >= 1) return glyphs[last] ?? " ";
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((levels[mid] ?? 0) < v) lo = mid;
    else hi = mid;
  }
  const nearer = v - (levels[lo] ?? 0) <= (levels[hi] ?? 1) - v ? lo : hi;
  return glyphs[nearer] ?? " ";
}

/** Measures where inside its cell each glyph puts its ink. Null where there is no canvas. */
function measureShapes(chars: string, fontFamily: string, lineHeight = 1.2, n = 3): Shapes | null {
  const glyphs = uniqueGlyphs(chars);
  const key = `${fontFamily}|${lineHeight}|${n}|${glyphs.join("")}`;
  const cached = shapeCache.get(key);
  if (cached) return cached;
  const maps = inkMaps(glyphs, fontFamily, lineHeight, n);
  if (!maps) return null;
  let max = 1;
  for (const m of maps) for (const v of m) if (v > max) max = v;
  const shapes: Shapes = { glyphs, n, cells: maps.map((m) => m.map((v) => v / max)) };
  if (fontSettled(fontFamily)) shapeCache.set(key, shapes);
  return shapes;
}

/** The glyph whose sub-cell ink is closest to `sample`: n by n values in 0..1, row-major. */
function matchShape(shapes: Shapes, sample: ArrayLike<number>): string {
  let best = 0;
  let bestDistance = Infinity;
  for (let g = 0; g < shapes.cells.length; g++) {
    const cells = shapes.cells[g] ?? [];
    let d = 0;
    for (let i = 0; i < cells.length; i++) {
      const e = (cells[i] ?? 0) - (sample[i] ?? 0);
      d += e * e;
    }
    if (d < bestDistance) {
      bestDistance = d;
      best = g;
    }
  }
  return shapes.glyphs[best] ?? " ";
}

// registry/ascii/ascii-pointer-ripple/core.ts
export interface AsciiPointerRippleProps extends MotionProps {
  /** How many cells per second a ripple's ring moves outward. */
  growth: number;
  /** How wide a ripple's ring is, in cells. */
  width: number;
  /** Seconds a ripple takes to expand and fade away completely. */
  lifetime: number;
  /** Ink a fresh ripple's ring adds at its peak, 0 to 1. */
  strength: number;
  /** Ink of the resting field with no ripples on it, 0 to 0.4. */
  base: number;
  /** Glyphs to draw with, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** Glyph size in CSS pixels. */
  fontSize: number;
  /** CSS font-family stack for the glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: AsciiPointerRippleProps = {
  growth: 18,
  width: 2.5,
  lifetime: 1.6,
  strength: 0.8,
  base: 0.12,
  glyphs: FALLBACK_RAMP,
  fontSize: 12,
  fontFamily: GRID_FONT,
  lineHeight: 1.2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** One expanding ring, in fractional grid-cell coordinates. */
interface Ripple {
  x: number;
  y: number;
  /** Animation time, in milliseconds, when this ripple was spawned. */
  spawnMs: number;
}

/** Milliseconds a moving or tapping pointer must wait before it may spawn another ripple. */
const SPAWN_INTERVAL_MS = 80;
/** Ripples alive at once. A new one past this evicts the oldest. */
const MAX_RIPPLES = 12;
/** Ages, as a fraction of `lifetime`, the three synthetic ripples sit at when `time` is fixed. */
const SYNTHETIC_AGE_FRACTIONS = [0.18, 0.46, 0.78];
/** Cells per noise cycle in the resting field's coarse layer. */
const NOISE_SCALE = 0.22;
/** The fine layer runs at this many times the coarse frequency, to break blobs into grain. */
const NOISE_DETAIL = 4.2;
/** How fast the resting field drifts, in noise units per millisecond. */
const DRIFT_PER_MS = 0.00015;
/** The frame shown under reduced motion: the resting field, with no ripples on it. */
const STILL_MS = 0;

export const mount: Mount<AsciiPointerRippleProps> = (host, initial = {}) => {
  let props: AsciiPointerRippleProps = { ...defaults, ...initial };
  let noise = createNoise(props.seed);
  const ripples: Ripple[] = [];
  let ink = new Float32Array(0);
  let clock = 0;
  let lastSpawnMs = -Infinity;

  function gridOptions(p: AsciiPointerRippleProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  /** Three rings placed by `seed` alone, so a fixed `time` always draws the same capture. */
  function syntheticRipples(p: AsciiPointerRippleProps, cols: number, rows: number, atMs: number): Ripple[] {
    const rng = createRng(p.seed);
    return SYNTHETIC_AGE_FRACTIONS.map((fraction) => {
      const x = (0.15 + rng() * 0.7) * cols;
      const y = (0.15 + rng() * 0.7) * rows;
      return { x, y, spawnMs: atMs - fraction * p.lifetime * 1000 };
    });
  }

  function draw(t: number, reduced: boolean): void {
    clock = t;
    const { cols, rows, aspect } = grid;
    const total = cols * rows;
    if (ink.length !== total) ink = new Float32Array(total);
    const z = t * DRIFT_PER_MS;
    for (let y = 0; y < rows; y++) {
      const ny = y * NOISE_SCALE;
      for (let x = 0; x < cols; x++) {
        const nx = x * aspect * NOISE_SCALE;
        const coarse = noise.noise3(nx, ny, z);
        const grain = noise.noise3(nx * NOISE_DETAIL + 31, ny * NOISE_DETAIL + 31, z);
        const lit = 0.5 + 0.5 * (coarse * 0.55 + grain * 0.45);
        ink[y * cols + x] = props.base * lit;
      }
    }
    let active: Ripple[];
    if (props.time !== null) active = syntheticRipples(props, cols, rows, t);
    else if (reduced) active = [];
    else active = ripples;
    for (const r of active) {
      const age = (t - r.spawnMs) / 1000;
      if (age < 0 || age > props.lifetime) continue;
      const fade = 1 - age / props.lifetime;
      const amp = props.strength * fade;
      if (amp <= 0.002) continue;
      const radius = props.growth * age;
      const reachY = radius + props.width * 3;
      const reachX = reachY / aspect;
      const minY = Math.max(0, Math.floor(r.y - reachY));
      const maxY = Math.min(rows - 1, Math.ceil(r.y + reachY));
      const minX = Math.max(0, Math.floor(r.x - reachX));
      const maxX = Math.min(cols - 1, Math.ceil(r.x + reachX));
      for (let y = minY; y <= maxY; y++) {
        const dy = y - r.y;
        const row = y * cols;
        for (let x = minX; x <= maxX; x++) {
          const dx = (x - r.x) * aspect;
          const d = Math.sqrt(dx * dx + dy * dy) - radius;
          const i = row + x;
          ink[i] = (ink[i] ?? 0) + amp * Math.exp(-(d * d) / (props.width * props.width));
        }
      }
    }
    const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        grid.set(x, y, pick(ramp, ink[y * cols + x] ?? 0));
      }
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  function onLayout(): void {
    loop.redraw();
  }

  function spawn(clientX: number, clientY: number): void {
    if (props.paused || props.time !== null || loop.reduced) return;
    if (clock - lastSpawnMs < SPAWN_INTERVAL_MS) return;
    const rect = host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    lastSpawnMs = clock;
    const x = Math.floor((clientX - rect.left) / grid.cellWidth);
    const y = Math.floor((clientY - rect.top) / grid.cellHeight);
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    ripples.push({ x, y, spawnMs: clock });
  }

  function onPointerMove(e: PointerEvent): void {
    spawn(e.clientX, e.clientY);
  }

  function onPointerDown(e: PointerEvent): void {
    spawn(e.clientX, e.clientY);
  }

  const grid = createGrid(host, gridOptions(props), onLayout);
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_MS, frame: draw });

  labelHost(host, "");
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerdown", onPointerDown);

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.seed !== before.seed) noise = createNoise(props.seed);
      if (props.fontFamily !== before.fontFamily || props.fontSize !== before.fontSize || props.lineHeight !== before.lineHeight) {
        grid.update(gridOptions(props));
      }
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerdown", onPointerDown);
      loop.destroy();
      grid.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/ascii/ascii-pointer-ripple/index.tsx
export type AsciiPointerRippleComponentProps = Partial<AsciiPointerRippleProps> & WrapperProps;

/** A field of low-density glyph noise that sends rings outward from the pointer, as if it were water. */
export function AsciiPointerRipple({ className, style, palette, ...props }: AsciiPointerRippleComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · ASCII Pointer Ripple · ascii-pointer-ripple
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>ASCII Pointer Ripple · Pica</title>
<style>:root { --pica-accent: #e8a020; }
html, body { margin: 0; height: 100%; background: #0a0a0a; color: #f1f1ef; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
@media (prefers-color-scheme: light) { html:not([data-ground]), html:not([data-ground]) body { background: #f1f1ef; color: #0a0a0a; } }
html[data-ground="paper"], html[data-ground="paper"] body { background: #f1f1ef; color: #0a0a0a; }
html[data-ground="checker"] body { background: repeating-conic-gradient(#161616 0% 25%, #0a0a0a 0% 50%) 50% / 24px 24px; }
#pica { width: 100%; height: 100%; }
.pica-stage { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: clamp(20px, 3.2vw, 40px); }
.pica-stage #pica { width: auto; height: auto; }
.pica-stage span#pica, .pica-stage div#pica { display: inline-block; }</style>
</head>
<body>
<div id="pica"></div>
<script>
"use strict";
var PicaAsciiPointerRipple = (() => {
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

  // registry/ascii/ascii-pointer-ripple/core.ts
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

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

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

  // lib/palette.ts
  var TOKEN_FALLBACK = {
    fg: "currentColor",
    bg: "transparent",
    accent: "#e8a020",
    muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)"
  };
  function cssVar(token) {
    return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
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

  // lib/ramp.ts
  var FALLBACK_RAMP = " .:-=+*#%@";
  var rampCache = /* @__PURE__ */ new Map();
  function uniqueGlyphs(chars) {
    return Array.from(new Set(Array.from(chars.length > 0 ? chars : FALLBACK_RAMP)));
  }
  function fontSettled(fontFamily) {
    try {
      return document.fonts.check(`12px ${fontFamily}`);
    } catch {
      return true;
    }
  }
  function inkMaps(glyphs, fontFamily, lineHeight, n) {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const fontPx = 40;
    ctx.font = `${fontPx}px ${fontFamily}`;
    const w = Math.max(1, Math.ceil(ctx.measureText("M").width || fontPx * 0.6));
    const h = Math.max(1, Math.ceil(fontPx * lineHeight));
    canvas.width = w;
    canvas.height = h;
    ctx.font = `${fontPx}px ${fontFamily}`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    return glyphs.map((glyph) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillText(glyph, 0, h / 2);
      const alpha = ctx.getImageData(0, 0, w, h).data;
      const sums = new Array(n * n).fill(0);
      for (let y = 0; y < h; y++) {
        const sy = Math.min(n - 1, Math.floor(y / h * n));
        for (let x = 0; x < w; x++) {
          const k = sy * n + Math.min(n - 1, Math.floor(x / w * n));
          sums[k] = (sums[k] ?? 0) + (alpha[(y * w + x) * 4 + 3] ?? 0);
        }
      }
      return sums;
    });
  }
  function measureRamp(chars, fontFamily, lineHeight = 1.2) {
    const glyphs = uniqueGlyphs(chars);
    const key = `${fontFamily}|${lineHeight}|${glyphs.join("")}`;
    const cached = rampCache.get(key);
    if (cached) return cached;
    const maps = inkMaps(glyphs, fontFamily, lineHeight, 1);
    if (!maps) {
      const last = Math.max(1, glyphs.length - 1);
      return { glyphs, levels: glyphs.map((_, i) => i / last) };
    }
    const order = glyphs.map((glyph, i) => ({ glyph, ink: maps[i]?.[0] ?? 0 })).sort((a, b) => a.ink - b.ink);
    const lightest = order[0]?.ink ?? 0;
    const span = (order[order.length - 1]?.ink ?? 1) - lightest || 1;
    const ramp = {
      glyphs: order.map((o) => o.glyph),
      levels: order.map((o) => (o.ink - lightest) / span)
    };
    if (fontSettled(fontFamily)) rampCache.set(key, ramp);
    return ramp;
  }
  function pick(ramp, v) {
    const { glyphs, levels } = ramp;
    const last = glyphs.length - 1;
    if (last < 0) return " ";
    if (v <= 0) return glyphs[0] ?? " ";
    if (v >= 1) return glyphs[last] ?? " ";
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = lo + hi >> 1;
      if ((levels[mid] ?? 0) < v) lo = mid;
      else hi = mid;
    }
    const nearer = v - (levels[lo] ?? 0) <= (levels[hi] ?? 1) - v ? lo : hi;
    return glyphs[nearer] ?? " ";
  }

  // registry/ascii/ascii-pointer-ripple/core.ts
  var defaults = {
    growth: 18,
    width: 2.5,
    lifetime: 1.6,
    strength: 0.8,
    base: 0.12,
    glyphs: FALLBACK_RAMP,
    fontSize: 12,
    fontFamily: GRID_FONT,
    lineHeight: 1.2,
    fps: 30,
    paused: false,
    time: null,
    seed: 1
  };
  var SPAWN_INTERVAL_MS = 80;
  var MAX_RIPPLES = 12;
  var SYNTHETIC_AGE_FRACTIONS = [0.18, 0.46, 0.78];
  var NOISE_SCALE = 0.22;
  var NOISE_DETAIL = 4.2;
  var DRIFT_PER_MS = 15e-5;
  var STILL_MS = 0;
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let noise = createNoise(props.seed);
    const ripples = [];
    let ink = new Float32Array(0);
    let clock = 0;
    let lastSpawnMs = -Infinity;
    function gridOptions(p) {
      return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
    }
    function syntheticRipples(p, cols, rows, atMs) {
      const rng = createRng(p.seed);
      return SYNTHETIC_AGE_FRACTIONS.map((fraction) => {
        const x = (0.15 + rng() * 0.7) * cols;
        const y = (0.15 + rng() * 0.7) * rows;
        return { x, y, spawnMs: atMs - fraction * p.lifetime * 1e3 };
      });
    }
    function draw(t, reduced) {
      clock = t;
      const { cols, rows, aspect } = grid;
      const total = cols * rows;
      if (ink.length !== total) ink = new Float32Array(total);
      const z = t * DRIFT_PER_MS;
      for (let y = 0; y < rows; y++) {
        const ny = y * NOISE_SCALE;
        for (let x = 0; x < cols; x++) {
          const nx = x * aspect * NOISE_SCALE;
          const coarse = noise.noise3(nx, ny, z);
          const grain = noise.noise3(nx * NOISE_DETAIL + 31, ny * NOISE_DETAIL + 31, z);
          const lit = 0.5 + 0.5 * (coarse * 0.55 + grain * 0.45);
          ink[y * cols + x] = props.base * lit;
        }
      }
      let active;
      if (props.time !== null) active = syntheticRipples(props, cols, rows, t);
      else if (reduced) active = [];
      else active = ripples;
      for (const r of active) {
        const age = (t - r.spawnMs) / 1e3;
        if (age < 0 || age > props.lifetime) continue;
        const fade = 1 - age / props.lifetime;
        const amp = props.strength * fade;
        if (amp <= 2e-3) continue;
        const radius = props.growth * age;
        const reachY = radius + props.width * 3;
        const reachX = reachY / aspect;
        const minY = Math.max(0, Math.floor(r.y - reachY));
        const maxY = Math.min(rows - 1, Math.ceil(r.y + reachY));
        const minX = Math.max(0, Math.floor(r.x - reachX));
        const maxX = Math.min(cols - 1, Math.ceil(r.x + reachX));
        for (let y = minY; y <= maxY; y++) {
          const dy = y - r.y;
          const row = y * cols;
          for (let x = minX; x <= maxX; x++) {
            const dx = (x - r.x) * aspect;
            const d = Math.sqrt(dx * dx + dy * dy) - radius;
            const i = row + x;
            ink[i] = (ink[i] ?? 0) + amp * Math.exp(-(d * d) / (props.width * props.width));
          }
        }
      }
      const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          grid.set(x, y, pick(ramp, ink[y * cols + x] ?? 0));
        }
      }
      grid.flush();
      host.dataset.picaReady = "true";
    }
    function onLayout() {
      loop.redraw();
    }
    function spawn(clientX, clientY) {
      if (props.paused || props.time !== null || loop.reduced) return;
      if (clock - lastSpawnMs < SPAWN_INTERVAL_MS) return;
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      lastSpawnMs = clock;
      const x = Math.floor((clientX - rect.left) / grid.cellWidth);
      const y = Math.floor((clientY - rect.top) / grid.cellHeight);
      if (ripples.length >= MAX_RIPPLES) ripples.shift();
      ripples.push({ x, y, spawnMs: clock });
    }
    function onPointerMove(e) {
      spawn(e.clientX, e.clientY);
    }
    function onPointerDown(e) {
      spawn(e.clientX, e.clientY);
    }
    const grid = createGrid(host, gridOptions(props), onLayout);
    const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_MS, frame: draw });
    labelHost(host, "");
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerdown", onPointerDown);
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.seed !== before.seed) noise = createNoise(props.seed);
        if (props.fontFamily !== before.fontFamily || props.fontSize !== before.fontSize || props.lineHeight !== before.lineHeight) {
          grid.update(gridOptions(props));
        }
        loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      },
      destroy() {
        host.removeEventListener("pointermove", onPointerMove);
        host.removeEventListener("pointerdown", onPointerDown);
        loop.destroy();
        grid.destroy();
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
  var instance = PicaAsciiPointerRipple.mount(host, take(window.PICA_PROPS || {}));
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

- Technique from [play.core](https://github.com/ertdfgcvb/play.core) by Andreas Gysin (Apache-2.0).
