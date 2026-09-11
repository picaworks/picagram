# ASCII Solid

> A torus, sphere, or cube rotated in three dimensions and shaded with the measured ramp.

Category: ascii. Tags: 3d, rotation, measured ramp, depth buffer. Animated. Holds a still frame under prefers-reduced-motion, and stops offscreen and in hidden tabs. Size: 4.5 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/ascii-solid.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `shape` | "torus" \| "sphere" \| "cube" | `"torus"` | Solid to rasterize: a torus, a sphere, or a cube. |
| `speed` | number | `0.6` | Rotation speed. 0 holds the solid at its starting orientation, and 2 tumbles it quickly. |
| `size` | number | `0.8` | Diameter of the solid as a fraction of the host's smaller side. |
| `glyphs` | string | `" .:-=+*#%@"` | Glyphs to shade with, in any order: they are sorted by the ink each one puts down in the font. |
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

// Pica · ASCII Solid · ascii-solid
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

// registry/ascii/ascii-solid/core.ts
export interface AsciiSolidProps extends MotionProps {
  /** Solid to rasterize: a torus, a sphere, or a cube. */
  shape: "torus" | "sphere" | "cube";
  /** Rotation speed. 0 holds the solid at its starting orientation, and 2 tumbles it quickly. */
  speed: number;
  /** Diameter of the solid as a fraction of the host's smaller side. */
  size: number;
  /** Glyphs to shade with, in any order: they are sorted by the ink each one puts down in the font. */
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

export const defaults: AsciiSolidProps = {
  shape: "torus",
  speed: 0.6,
  size: 0.8,
  glyphs: FALLBACK_RAMP,
  fontSize: 12,
  fontFamily: GRID_FONT,
  lineHeight: 1.2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

const TAU = Math.PI * 2;
/** Target cell-units between adjacent samples, so the surface leaves no holes at its widest. */
const SPACING = 0.7;
/** Camera distance in world units, where every solid has a bounding radius of 1. */
const CAM_DIST = 2.6;
/** Radians per second per unit of speed, tilting the solid forward or back. */
const RATE_A = 0.5;
/** Radians per second per unit of speed, turning the solid around its vertical axis. */
const RATE_B = 0.8;
/** Constant tilt added to every frame, so the solid never sits edge-on or face-on at rest. */
const BASE_TILT = 0.39;
/** Constant turn added to every frame, so the default view shows more than one face. */
const BASE_SPIN = 0;
/** Minimum lit fraction, so the shaded side of the solid is dim rather than invisible. */
const AMBIENT = 0.16;
const LIGHT_MAG = Math.sqrt(3);
/** A fixed light from the upper left, and slightly toward the viewer. */
const LIGHT: readonly [number, number, number] = [-1 / LIGHT_MAG, 1 / LIGHT_MAG, -1 / LIGHT_MAG];
/** Sweep radius and tube radius of the torus, in world units. Their sum is the bounding radius. */
const TORUS_R2 = 2 / 3;
const TORUS_R1 = 1 / 3;
/** Half the cube's side, chosen so its corners reach the bounding radius of 1. */
const CUBE_HALF = 1 / Math.sqrt(3);
const CUBE_FACES: readonly (readonly [number, number, number])[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/** Sample steps around a loop of this radius, in grid cells, close enough to leave no holes. */
function ringSteps(radiusCells: number, min: number, max: number): number {
  const raw = Math.ceil((TAU * Math.max(0, radiusCells)) / SPACING);
  return Math.min(max, Math.max(min, raw));
}

/** Sample steps across a span of this length, in grid cells, close enough to leave no holes. */
function spanSteps(lengthCells: number, min: number, max: number): number {
  const raw = Math.ceil(Math.max(0, lengthCells) / SPACING);
  return Math.min(max, Math.max(min, raw));
}

export const mount: Mount<AsciiSolidProps> = (host, initial = {}) => {
  let props: AsciiSolidProps = { ...defaults, ...initial };
  let lastTime = 0;
  let depth = new Float64Array(0);

  labelHost(host, "");
  const grid = createGrid(host, gridOptions(props), () => draw(lastTime));
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: 1200, frame: draw });

  function gridOptions(p: AsciiSolidProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  function draw(t: number): void {
    lastTime = t;
    grid.clear();
    const { cols, rows, aspect } = grid;
    const scale = (props.size / 2) * Math.min(cols, rows / aspect);
    if (scale > 0) {
      if (depth.length !== cols * rows) depth = new Float64Array(cols * rows);
      depth.fill(-Infinity);
      const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
      const seconds = t / 1000;
      const angleA = (BASE_TILT + seconds * props.speed * RATE_A) % TAU;
      const angleB = (BASE_SPIN + seconds * props.speed * RATE_B) % TAU;
      const cosA = Math.cos(angleA);
      const sinA = Math.sin(angleA);
      const cosB = Math.cos(angleB);
      const sinB = Math.sin(angleB);
      const centerCol = (cols - 1) / 2;
      const centerRow = (rows - 1) / 2;
      const [lightX, lightY, lightZ] = LIGHT;

      // Rotates one surface sample (position and normal) by tilting it around the horizontal
      // axis and then turning it around the vertical axis, and, if it is the nearest sample so
      // far for its cell, shades it by the dot product of the rotated normal with the fixed light.
      function plot(x0: number, y0: number, z0: number, nx0: number, ny0: number, nz0: number): void {
        const y1 = y0 * cosA - z0 * sinA;
        const z1 = y0 * sinA + z0 * cosA;
        const x2 = x0 * cosB + z1 * sinB;
        const z2 = z1 * cosB - x0 * sinB;
        const ny1 = ny0 * cosA - nz0 * sinA;
        const nz1 = ny0 * sinA + nz0 * cosA;
        const nx2 = nx0 * cosB + nz1 * sinB;
        const nz2 = nz1 * cosB - nx0 * sinB;
        const zCam = z2 + CAM_DIST;
        if (zCam <= 0.01) return;
        const ooz = CAM_DIST / zCam;
        const col = Math.round(centerCol + x2 * ooz * scale);
        const row = Math.round(centerRow - y1 * ooz * scale * aspect);
        if (col < 0 || col >= cols || row < 0 || row >= rows) return;
        const idx = row * cols + col;
        if (ooz <= (depth[idx] ?? -Infinity)) return;
        depth[idx] = ooz;
        const lambert = nx2 * lightX + ny1 * lightY + nz2 * lightZ;
        const v = AMBIENT + (1 - AMBIENT) * Math.max(0, lambert);
        grid.set(col, row, pick(ramp, v));
      }

      if (props.shape === "torus") {
        const thetaN = ringSteps(TORUS_R1 * scale, 20, 160);
        const phiN = ringSteps((TORUS_R1 + TORUS_R2) * scale, 32, 460);
        const cosPhi = new Array<number>(phiN);
        const sinPhi = new Array<number>(phiN);
        for (let j = 0; j < phiN; j++) {
          const phi = (j / phiN) * TAU;
          cosPhi[j] = Math.cos(phi);
          sinPhi[j] = Math.sin(phi);
        }
        for (let i = 0; i < thetaN; i++) {
          const theta = (i / thetaN) * TAU;
          const ct = Math.cos(theta);
          const st = Math.sin(theta);
          const circleX = TORUS_R2 + TORUS_R1 * ct;
          for (let j = 0; j < phiN; j++) {
            const cp = cosPhi[j] ?? 1;
            const sp = sinPhi[j] ?? 0;
            plot(circleX * cp, circleX * sp, TORUS_R1 * st, ct * cp, ct * sp, st);
          }
        }
      } else if (props.shape === "sphere") {
        const thetaN = spanSteps(Math.PI * scale, 18, 210);
        const phiN = ringSteps(scale, 24, 460);
        const cosPhi = new Array<number>(phiN);
        const sinPhi = new Array<number>(phiN);
        for (let j = 0; j < phiN; j++) {
          const phi = (j / phiN) * TAU;
          cosPhi[j] = Math.cos(phi);
          sinPhi[j] = Math.sin(phi);
        }
        for (let i = 0; i <= thetaN; i++) {
          const theta = (i / thetaN) * Math.PI;
          const ct = Math.cos(theta);
          const st = Math.sin(theta);
          for (let j = 0; j < phiN; j++) {
            const cp = cosPhi[j] ?? 1;
            const sp = sinPhi[j] ?? 0;
            const x0 = st * cp;
            const z0 = st * sp;
            plot(x0, ct, z0, x0, ct, z0);
          }
        }
      } else {
        const n = spanSteps(2 * CUBE_HALF * scale, 8, 90);
        for (const face of CUBE_FACES) {
          const [nx, ny, nz] = face;
          for (let i = 0; i <= n; i++) {
            const u = (i / n) * 2 - 1;
            for (let j = 0; j <= n; j++) {
              const v = (j / n) * 2 - 1;
              let x0: number;
              let y0: number;
              let z0: number;
              if (nx !== 0) {
                x0 = nx * CUBE_HALF;
                y0 = u * CUBE_HALF;
                z0 = v * CUBE_HALF;
              } else if (ny !== 0) {
                x0 = u * CUBE_HALF;
                y0 = ny * CUBE_HALF;
                z0 = v * CUBE_HALF;
              } else {
                x0 = u * CUBE_HALF;
                y0 = v * CUBE_HALF;
                z0 = nz * CUBE_HALF;
              }
              plot(x0, y0, z0, nx, ny, nz);
            }
          }
        }
      }
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.fontFamily !== before.fontFamily || props.fontSize !== before.fontSize || props.lineHeight !== before.lineHeight) {
        grid.update(gridOptions(props));
      }
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      loop.destroy();
      grid.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/ascii/ascii-solid/index.tsx
export type AsciiSolidComponentProps = Partial<AsciiSolidProps> & WrapperProps;

/** A torus, sphere, or cube rotated in three dimensions and shaded with the measured ramp. */
export function AsciiSolid({ className, style, palette, ...props }: AsciiSolidComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · ASCII Solid · ascii-solid
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>ASCII Solid · Pica</title>
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
var PicaAsciiSolid = (() => {
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

  // registry/ascii/ascii-solid/core.ts
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

  // registry/ascii/ascii-solid/core.ts
  var defaults = {
    shape: "torus",
    speed: 0.6,
    size: 0.8,
    glyphs: FALLBACK_RAMP,
    fontSize: 12,
    fontFamily: GRID_FONT,
    lineHeight: 1.2,
    fps: 30,
    paused: false,
    time: null,
    seed: 1
  };
  var TAU = Math.PI * 2;
  var SPACING = 0.7;
  var CAM_DIST = 2.6;
  var RATE_A = 0.5;
  var RATE_B = 0.8;
  var BASE_TILT = 0.39;
  var BASE_SPIN = 0;
  var AMBIENT = 0.16;
  var LIGHT_MAG = Math.sqrt(3);
  var LIGHT = [-1 / LIGHT_MAG, 1 / LIGHT_MAG, -1 / LIGHT_MAG];
  var TORUS_R2 = 2 / 3;
  var TORUS_R1 = 1 / 3;
  var CUBE_HALF = 1 / Math.sqrt(3);
  var CUBE_FACES = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1]
  ];
  function ringSteps(radiusCells, min, max) {
    const raw = Math.ceil(TAU * Math.max(0, radiusCells) / SPACING);
    return Math.min(max, Math.max(min, raw));
  }
  function spanSteps(lengthCells, min, max) {
    const raw = Math.ceil(Math.max(0, lengthCells) / SPACING);
    return Math.min(max, Math.max(min, raw));
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let lastTime = 0;
    let depth = new Float64Array(0);
    labelHost(host, "");
    const grid = createGrid(host, gridOptions(props), () => draw(lastTime));
    const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: 1200, frame: draw });
    function gridOptions(p) {
      return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
    }
    function draw(t) {
      lastTime = t;
      grid.clear();
      const { cols, rows, aspect } = grid;
      const scale = props.size / 2 * Math.min(cols, rows / aspect);
      if (scale > 0) {
        let plot2 = function(x0, y0, z0, nx0, ny0, nz0) {
          const y1 = y0 * cosA - z0 * sinA;
          const z1 = y0 * sinA + z0 * cosA;
          const x2 = x0 * cosB + z1 * sinB;
          const z2 = z1 * cosB - x0 * sinB;
          const ny1 = ny0 * cosA - nz0 * sinA;
          const nz1 = ny0 * sinA + nz0 * cosA;
          const nx2 = nx0 * cosB + nz1 * sinB;
          const nz2 = nz1 * cosB - nx0 * sinB;
          const zCam = z2 + CAM_DIST;
          if (zCam <= 0.01) return;
          const ooz = CAM_DIST / zCam;
          const col = Math.round(centerCol + x2 * ooz * scale);
          const row = Math.round(centerRow - y1 * ooz * scale * aspect);
          if (col < 0 || col >= cols || row < 0 || row >= rows) return;
          const idx = row * cols + col;
          if (ooz <= (depth[idx] ?? -Infinity)) return;
          depth[idx] = ooz;
          const lambert = nx2 * lightX + ny1 * lightY + nz2 * lightZ;
          const v = AMBIENT + (1 - AMBIENT) * Math.max(0, lambert);
          grid.set(col, row, pick(ramp, v));
        };
        var plot = plot2;
        if (depth.length !== cols * rows) depth = new Float64Array(cols * rows);
        depth.fill(-Infinity);
        const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
        const seconds = t / 1e3;
        const angleA = (BASE_TILT + seconds * props.speed * RATE_A) % TAU;
        const angleB = (BASE_SPIN + seconds * props.speed * RATE_B) % TAU;
        const cosA = Math.cos(angleA);
        const sinA = Math.sin(angleA);
        const cosB = Math.cos(angleB);
        const sinB = Math.sin(angleB);
        const centerCol = (cols - 1) / 2;
        const centerRow = (rows - 1) / 2;
        const [lightX, lightY, lightZ] = LIGHT;
        if (props.shape === "torus") {
          const thetaN = ringSteps(TORUS_R1 * scale, 20, 160);
          const phiN = ringSteps((TORUS_R1 + TORUS_R2) * scale, 32, 460);
          const cosPhi = new Array(phiN);
          const sinPhi = new Array(phiN);
          for (let j = 0; j < phiN; j++) {
            const phi = j / phiN * TAU;
            cosPhi[j] = Math.cos(phi);
            sinPhi[j] = Math.sin(phi);
          }
          for (let i = 0; i < thetaN; i++) {
            const theta = i / thetaN * TAU;
            const ct = Math.cos(theta);
            const st = Math.sin(theta);
            const circleX = TORUS_R2 + TORUS_R1 * ct;
            for (let j = 0; j < phiN; j++) {
              const cp = cosPhi[j] ?? 1;
              const sp = sinPhi[j] ?? 0;
              plot2(circleX * cp, circleX * sp, TORUS_R1 * st, ct * cp, ct * sp, st);
            }
          }
        } else if (props.shape === "sphere") {
          const thetaN = spanSteps(Math.PI * scale, 18, 210);
          const phiN = ringSteps(scale, 24, 460);
          const cosPhi = new Array(phiN);
          const sinPhi = new Array(phiN);
          for (let j = 0; j < phiN; j++) {
            const phi = j / phiN * TAU;
            cosPhi[j] = Math.cos(phi);
            sinPhi[j] = Math.sin(phi);
          }
          for (let i = 0; i <= thetaN; i++) {
            const theta = i / thetaN * Math.PI;
            const ct = Math.cos(theta);
            const st = Math.sin(theta);
            for (let j = 0; j < phiN; j++) {
              const cp = cosPhi[j] ?? 1;
              const sp = sinPhi[j] ?? 0;
              const x0 = st * cp;
              const z0 = st * sp;
              plot2(x0, ct, z0, x0, ct, z0);
            }
          }
        } else {
          const n = spanSteps(2 * CUBE_HALF * scale, 8, 90);
          for (const face of CUBE_FACES) {
            const [nx, ny, nz] = face;
            for (let i = 0; i <= n; i++) {
              const u = i / n * 2 - 1;
              for (let j = 0; j <= n; j++) {
                const v = j / n * 2 - 1;
                let x0;
                let y0;
                let z0;
                if (nx !== 0) {
                  x0 = nx * CUBE_HALF;
                  y0 = u * CUBE_HALF;
                  z0 = v * CUBE_HALF;
                } else if (ny !== 0) {
                  x0 = u * CUBE_HALF;
                  y0 = ny * CUBE_HALF;
                  z0 = v * CUBE_HALF;
                } else {
                  x0 = u * CUBE_HALF;
                  y0 = v * CUBE_HALF;
                  z0 = nz * CUBE_HALF;
                }
                plot2(x0, y0, z0, nx, ny, nz);
              }
            }
          }
        }
      }
      grid.flush();
      host.dataset.picaReady = "true";
    }
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (props.fontFamily !== before.fontFamily || props.fontSize !== before.fontSize || props.lineHeight !== before.lineHeight) {
          grid.update(gridOptions(props));
        }
        loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      },
      destroy() {
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
  var instance = PicaAsciiSolid.mount(host, take(window.PICA_PROPS || {}));
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

- Technique from [Donut math: how donut.c works](https://www.a1k0n.net/2011/07/20/donut-math.html) by Andy Sloane (Article).
