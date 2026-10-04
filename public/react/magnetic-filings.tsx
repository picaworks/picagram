"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Magnetic Filings · magnetic-filings
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

// registry/effects/magnetic-filings/core.ts
export interface MagneticFilingsProps extends MotionProps {
  /** Up to four charges: x and y place each one as a fraction of the host, and charge runs from -1 to 1. Each is marked [+] or [−] in the accent, drifts on its own small figure eight, and moves to the nearest free place when its path would meet the content. */
  sources: { x: number; y: number; charge: number }[];
  /** Glyph columns from one filing to the next, 1 to 3. At 2 each filing sits in a square cell. */
  spacing: number;
  /** Glyph size in CSS pixels, 10 to 20. */
  fontSize: number;
  /** Cells around the content, past the one cell kept clear, that draw only the faintest glyph, 0 to 6. */
  quiet: number;
  /** "center" makes the host a grid that centers its children in a column up to 34em wide, inside two cells of padding. "none" leaves layout to the page. */
  layout: "none" | "center";
  /** Seconds for each charge to close its path, 12 to 60. */
  period: number;
  /** Ink strength of the filings, from zero to one: the strongest draw in fg at this strength, the rest in muted. */
  opacity: number;
  /** Frames per second ceiling, 12 to 24. */
  fps: number;
}

export const defaults: MagneticFilingsProps = {
  sources: [{ x: 0.2, y: 0.25, charge: 1 }, { x: 0.8, y: 0.75, charge: -1 }],
  spacing: 2,
  fontSize: 13,
  quiet: 3,
  layout: "none",
  period: 24,
  opacity: 0.6,
  fps: 15,
  paused: false,
  time: null,
  seed: 1,
};

/** The orientation glyphs, in the order measureShapes keeps them. */
const FILINGS = "-\\|/";

export const mount: Mount<MagneticFilingsProps> = (host, initial = {}) => {
  /** A charge's home in pixels, its strength, the phase and direction of its path, and the phase of its tick. */
  type Charge = { x: number; y: number; q: number; a: number; d: number; p: number };
  let props: MagneticFilingsProps = { ...defaults, ...initial };
  let loop: Loop | null = null;
  let undoLayout = (): void => undefined;
  let destroyed = false, ready = false, full = true, key = "";
  // Host size, glyph cell, lattice (n filings a row, one every s columns), grid origin, and the clock.
  let hw = 0, hh = 0, cw = 1, ch = 1, s = 1, n = 0, rows = 0, cols = 1, ox = 0, oy = 0, period = 24000, tick = 600;
  let zone: [number, number, number, number] | null = null;
  // Per filing, kind is 0 clear, 1 faint, 2 medium or 3 strong. Shown is the code on screen: 0 nothing, 1 the
  // faint glyph, 2 to 5 an orientation in muted, 6 to 9 an orientation in fg.
  let kind = new Uint8Array(0), shown = new Uint8Array(0), ticks = new Float64Array(0), phase = new Float64Array(0);
  let bins: number[] = [], weak = "\u00b7", charges: Charge[] = [], lit: number[] = [];
  const attrs = hostAttributes(host);
  const undoIsolation = styleHost(host, { isolation: "isolate" });
  const range = document.createRange();
  const num = (value: unknown, lo: number, hi: number, fallback: number): number => {
    const v = Number(value);
    return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
  };
  const size = (): number => num(props.fontSize, 10, 20, 13);
  const fps = (): number => num(props.fps, 12, 24, 15);
  const tickOf = (t: number, p: number): number => Math.floor((t + p) / tick);
  /** How far a cell centered at (x, y) sits outside the content box, on whichever axis it is farther out. */
  const away = (x: number, y: number): number =>
    zone ? Math.max(Math.max(zone[0] - x, x - zone[2], 0) - cw / 2, Math.max(zone[1] - y, y - zone[3], 0) - ch / 2) : Infinity;

  applyLayout();
  const surface = createCanvas(host, { maxDpr: 1.5, maxPixels: 4e6, css: "z-index:-1", onResize: () => relayout(true) });
  const ctx = surface.canvas.getContext("2d")!;
  const palette = watchPalette(host, () => {
    full = true;
    loop?.redraw();
  });
  const sizes = new ResizeObserver(() => relayout(false));
  const watch = (): void => {
    sizes.disconnect();
    sizes.observe(host);
    for (const child of Array.from(host.children)) if (!child.hasAttribute("data-pica")) sizes.observe(child);
  };
  const children = new MutationObserver(() => {
    watch();
    relayout(false);
  });
  const onFonts = (): void => relayout(true);
  watch();
  children.observe(host, { childList: true });
  document.fonts.addEventListener("loadingdone", onFonts);

  function applyLayout(): void {
    undoLayout();
    undoLayout = props.layout === "center"
      ? styleHost(host, {
          display: "grid",
          "place-content": "center",
          "justify-items": "start",
          "grid-template-columns": "minmax(0, 34em)",
          padding: `${2 * measureCell(GRID_FONT, size(), 1.2).h}px`,
          "box-sizing": "border-box",
        })
      : () => undefined;
  }

  /** The union of the boxes of the host's own children, in canvas pixels. It only reads layout. */
  function measure(): [number, number, number, number] | null {
    const o = surface.canvas.getBoundingClientRect();
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    const add = (node: Node): void => {
      const el = node.nodeType === 1 ? (node as Element) : null;
      if (el ? el.hasAttribute("data-pica") : node.nodeType !== 3 || !node.textContent?.trim()) return;
      if (!el) range.selectNodeContents(node);
      const box = (el ?? range).getBoundingClientRect();
      if (box.width || box.height) {
        l = Math.min(l, box.left);
        t = Math.min(t, box.top);
        r = Math.max(r, box.right);
        b = Math.max(b, box.bottom);
      } else el?.childNodes.forEach(add);
    };
    host.childNodes.forEach(add);
    return l > r ? null : [l - o.left, t - o.top, r - o.left, b - o.top];
  }

  /** The cell a charge's sign occupies at time t: a column between filings wherever the spacing leaves one, with room on both sides for its brackets. */
  function cellOf(c: Charge, t: number): number {
    const a = (2 * Math.PI * t) / period + c.a;
    const fx = (c.x + c.d * 4 * ch * Math.sin(a) - ox) / cw - 0.5;
    const fy = (c.y + 3 * ch * Math.sin(2 * a) - oy) / ch - 0.5;
    let col = Math.round(fx);
    if (s > 1 && col % s === 0) col += fx > col ? 1 : -1;
    col = Math.max(1, Math.min(cols - 2, col));
    return Math.max(0, Math.min(rows - 1, Math.round(fy))) * cols + col;
  }

  /** The field at (x, y) from charges listed as x, y, charge triples, in pixel space. */
  function field(x: number, y: number, at: readonly number[]): [number, number] {
    let ex = 0, ey = 0;
    for (let j = 0; j + 2 < at.length; j += 3) {
      const dx = x - at[j]!, dy = y - at[j + 1]!, d2 = dx * dx + dy * dy + ch * ch, f = at[j + 2]! / (d2 * Math.sqrt(d2));
      ex += f * dx;
      ey += f * dy;
    }
    return [ex, ey];
  }

  /** Measures the host and its content, then rebuilds the lattice, the tone bands, and the charges' homes. */
  function relayout(force: boolean): void {
    if (destroyed) return;
    const z = measure();
    const next = [surface.cssWidth, surface.cssHeight, ...(z ?? []).map(Math.round)].join();
    if (!force && next === key) return;
    key = next;
    zone = z;
    hw = surface.cssWidth;
    hh = surface.cssHeight;
    ({ w: cw, h: ch } = measureCell(GRID_FONT, size(), 1.2));
    s = Math.round(num(props.spacing, 1, 3, 2));
    n = Math.max(0, Math.floor((hw / cw - 1) / s) + 1);
    rows = Math.max(0, Math.floor(hh / ch));
    cols = Math.max(1, (n - 1) * s + 1);
    ox = (hw - cols * cw) / 2;
    oy = (hh - rows * ch) / 2;
    period = num(props.period, 12, 60, 24) * 1000;
    tick = period / Math.round(period / 600);
    const band = ch * (1 + Math.round(num(props.quiet, 0, 6, 3)));
    // A home sits where the whole path of the charge's pocket stays outside the quiet band and three cells inside
    // the host's edge, so no token or star is cropped. Where the content leaves no such place, the home's own
    // pocket alone stays outside the band.
    const rx = 4 * ch + 3.5 * cw, ry = 5 * ch;
    const keep = (v: number, pad: number, span: number): number => Math.max(pad + 3 * ch, Math.min(span - pad - 3 * ch, v));
    const free = (x: number, y: number, ex: number, ey: number): boolean =>
      !z || x <= z[0] - band - ex || x >= z[2] + band + ex || y <= z[1] - band - ey || y >= z[3] + band + ey;
    charges = (Array.isArray(props.sources) ? props.sources : []).slice(0, 4).map((src, j) => {
      const h = hashSeed(props.seed, j + 1, 7);
      let x = keep(num(src?.x, 0, 1, 0.5) * hw, rx, hw), y = keep(num(src?.y, 0, 1, 0.5) * hh, ry, hh);
      for (const [ex, ey] of [[rx, ry], [3.5 * cw, 2 * ch]] as [number, number][]) {
        if (!z || free(x, y, ex, ey)) break;
        let best = Infinity, bx = x, by = y;
        for (const [cx, cy] of [[z[0] - band - ex, y], [z[2] + band + ex, y], [x, z[1] - band - ey], [x, z[3] + band + ey]] as [number, number][]) {
          const px = keep(cx, rx, hw), py = keep(cy, ry, hh), d = Math.hypot(px - x, py - y);
          if (free(px, py, ex, ey) && d < best) [best, bx, by] = [d, px, py];
        }
        [x, y] = [bx, by];
        if (best < Infinity) break;
      }
      return { x, y, q: num(src?.charge, -1, 1, 1), a: (h / 4294967296) * 2 * Math.PI, d: h & 1 ? 1 : -1, p: ((h & 65535) / 65536) * tick };
    });
    const count = n * rows, amp = new Float64Array(count), mags: number[] = [], home = charges.flatMap((c) => [c.x, c.y, c.q]);
    kind = new Uint8Array(count);
    shown = new Uint8Array(count);
    ticks = new Float64Array(count);
    phase = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      const col = i % n, r = (i - col) / n, x = ox + (col * s + 0.5) * cw, y = oy + (r + 0.5) * ch, gap = away(x, y);
      // Filings near a home tick with that charge, so its star and its pocket move in the frame the charge moves.
      let near = 64 * ch * ch, p = (hashSeed(props.seed, col, r) / 4294967296) * tick;
      for (const c of charges) {
        const d = (x - c.x) ** 2 + (y - c.y) ** 2;
        if (d < near) [near, p] = [d, c.p];
      }
      phase[i] = p;
      if (gap < ch) continue;
      if (gap < band) {
        kind[i] = 1;
        continue;
      }
      const [ex, ey] = field(x, y, home);
      // 4 marks the two cells past the quiet band, which never draw strong, so the copy fades in three steps.
      kind[i] = gap < band + 2 * ch ? 4 : 2;
      mags.push((amp[i] = Math.hypot(ex, ey)));
    }
    // Tone holds still: each band comes from the field with every charge at home, cut at the 40th and 80th percentiles.
    mags.sort((a, b) => a - b);
    const lo = mags[Math.floor(mags.length * 0.4)] ?? 0, hi = mags[Math.floor(mags.length * 0.8)] ?? 0;
    for (let i = 0; i < count; i++) if (kind[i]! > 1) kind[i] = amp[i]! > hi && kind[i] === 2 ? 3 : amp[i]! > lo ? 2 : 1;
    // Each of 16 orientations becomes a 3 by 3 coverage sample of a line through the cell, matched to the measured ink of the four glyphs.
    const shapes = measureShapes(FILINGS, GRID_FONT, 1.2), reach = Math.hypot(cw, ch) / 64;
    bins = [];
    for (let b = 0; b < 16; b++) {
      const a = (b * Math.PI) / 16, sample = new Array<number>(9).fill(0);
      for (let j = -32; j <= 32; j++) {
        const x = 0.5 + (j * reach * Math.cos(a)) / cw, y = 0.5 + (j * reach * Math.sin(a)) / ch, at = Math.floor(y * 3) * 3 + Math.floor(x * 3);
        if (x >= 0 && x < 1 && y >= 0 && y < 1) sample[at]! += 1;
      }
      const top = Math.max(...sample);
      bins.push(shapes ? Math.max(0, FILINGS.indexOf(matchShape(shapes, sample.map((v) => v / top)))) : Math.round(b / 4) % 4);
    }
    weak = measureRamp("\u00b7:", GRID_FONT, 1.2).glyphs[0] ?? "\u00b7";
    full = true;
    loop?.redraw();
  }

  function draw(t: number): void {
    if (destroyed) return;
    const all = full, dirty = new Uint8Array(rows);
    full = false;
    if (all) dirty.fill(1);
    for (let i = 0; i < kind.length; i++) {
      const k = kind[i]!, step = tickOf(t, phase[i]!);
      let code = Math.min(1, k);
      if (k > 1) {
        // A filing turns only on its own tick, so no cell changes more than twice a second.
        if (!all && step === ticks[i]) continue;
        ticks[i] = step;
        const when = step * tick - phase[i]!, at: number[] = [];
        for (const c of charges) {
          const cell = cellOf(c, when);
          at.push(ox + ((cell % cols) + 0.5) * cw, oy + (Math.floor(cell / cols) + 0.5) * ch, c.q);
        }
        const col = i % n, [ex, ey] = field(ox + (col * s + 0.5) * cw, oy + ((i - col) / n + 0.5) * ch, at);
        code = k * 4 - 6 + bins[(Math.round((Math.atan2(ey, ex) * 16) / Math.PI) + 32) % 16]!;
      }
      if (code !== shown[i]) {
        shown[i] = code;
        dirty[Math.floor(i / n)] = 1;
      }
    }
    // Each charge clears a pocket one row and two columns around its sign, which moves with it on its tick.
    const cells = cols > 2 && rows > 0 ? charges.map((c) => cellOf(c, tickOf(t, c.p) * tick - c.p)) : [];
    if (cells.join() !== lit.join()) for (const cell of [...lit, ...cells]) for (let d = -1; d < 2; d++) dirty[Math.floor(cell / cols) + d] = 1;
    lit = cells;
    const pocket = (r: number, c: number): boolean =>
      cells.some((cell) => Math.abs(Math.floor(cell / cols) - r) < 2 && Math.abs((cell % cols) - c) < 3);
    const { fg, muted, accent } = palette.colors;
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    if (all) ctx.clearRect(0, 0, hw, hh);
    else for (let r = 0; r < rows; r++) if (dirty[r]) ctx.clearRect(0, oy + r * ch, hw, ch);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `${size()}px ${GRID_FONT}`;
    ctx.globalAlpha = num(props.opacity, 0, 1, 0.6);
    for (const strong of [false, true]) {
      ctx.fillStyle = strong ? fg : muted;
      for (let r = 0; r < rows; r++) {
        if (!dirty[r]) continue;
        for (let col = 0; col < n; col++) {
          const code = shown[r * n + col]!;
          if (!code || code > 5 !== strong || pocket(r, col * s)) continue;
          ctx.fillText(code > 1 ? FILINGS[(code - 2) % 4]! : weak, ox + col * s * cw, oy + (r + 0.5) * ch);
        }
      }
    }
    // The only accent: a bold [+] or [−] token, one glyph per cell, centered on the charge's cell.
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent;
    ctx.font = `700 ${size()}px ${GRID_FONT}`;
    cells.forEach((cell, j) => {
      const r = Math.floor(cell / cols), c = cell % cols, y = oy + (r + 0.5) * ch;
      if (!dirty[r] || [-1, 0, 1].some((k) => away(ox + (c + k + 0.5) * cw, y) < ch)) return;
      ["[", charges[j]!.q < 0 ? "\u2212" : "+", "]"].forEach((g, k) => ctx.fillText(g, ox + (c + k - 1) * cw, y));
    });
    if (!ready) {
      ready = true;
      attrs.set("data-pica-ready", "true");
    }
  }

  relayout(true);
  loop = createLoop({ el: host, fps: fps(), paused: props.paused, time: props.time, still: 1200, frame: draw });
  return {
    update(next) {
      if (destroyed) return;
      props = { ...props, ...next };
      palette.refresh();
      applyLayout();
      relayout(true);
      loop?.update({ paused: props.paused, time: props.time, fps: fps() });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      sizes.disconnect();
      children.disconnect();
      document.fonts.removeEventListener("loadingdone", onFonts);
      loop?.destroy();
      palette.destroy();
      surface.destroy();
      undoLayout();
      undoIsolation();
      attrs.restore();
    },
  };
};

// registry/effects/magnetic-filings/index.tsx
export type MagneticFilingsComponentProps = Partial<MagneticFilingsProps> & WrapperProps & { children?: ReactNode };

/** Orientation glyphs follow the field of slowly drifting charges behind the content they wrap. */
export function MagneticFilings({ className, style, palette, children, ...props }: MagneticFilingsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
