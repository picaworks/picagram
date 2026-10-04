"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Victorian Hero · victorian-hero
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

// registry/sections/victorian-hero/core.ts
/** One call to action: a link's visible text and destination. */
export interface VictorianHeroAction {
  /** Text on the link, drawn in mono capitals. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface VictorianHeroProps {
  /** The small line at the top of the stack, set in tracked mono capitals. Empty hides it. */
  kicker: string;
  /** The largest line of the bill, set in the page's own face at display size. Empty hides it. */
  headline: string;
  /** The medium line under the headline, set in italics. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as ruled links. At most three show, and the first takes a doubled rule. */
  actions: readonly VictorianHeroAction[];
  /** Text alignment inside the bill. */
  align: "center" | "start";
  /** The border: a heavy outer rule doubled by a thin inner frame with fleuron corners, the heavy rule alone, or none. */
  frame: "double" | "single" | "none";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: VictorianHeroProps = {
  kicker: "Picagram presents",
  headline: "The Victorian Hero",
  subhead: "A playbill for the printed web, drawn in type and rules alone.",
  actions: [
    { label: "See the bill", href: "#bill" },
    { label: "Book seats", href: "#seats" },
  ],
  align: "center",
  frame: "double",
  minHeight: 80,
};

/** The corner fleuron, a diamond four cells wide and three tall cut from block glyphs, written into the
 *  gap between the outer rule and the inner frame. */
const FLEURON: readonly (readonly [number, number, string])[] = [
  [1, 0, "▟"],
  [2, 0, "▙"],
  [0, 1, "▟"],
  [1, 1, "█"],
  [2, 1, "█"],
  [3, 1, "▙"],
  [1, 2, "▜"],
  [2, 2, "▛"],
];

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** One of the core's own nodes: marked, and named for its part in the bill so the scoped rules can find it. */
function part(name: string, tag: keyof HTMLElementTagNameMap = "div"): HTMLElement {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** Whether the page put anything of its own inside the host, so the stack knows to rule around it. */
function hasChildren(host: HTMLElement): boolean {
  for (const node of host.childNodes) {
    if (node.nodeType === 1) {
      if (!(node as Element).hasAttribute("data-pica")) return true;
    } else if (node.nodeType === 3 && (node.textContent ?? "").trim() !== "") {
      return true;
    }
  }
  return false;
}

/** One rule between two lines of the stack: a hairline on each side of a small diamond, the way a
 *  centered ornament breaks a rule on a printed bill. */
function makeRule(): HTMLElement {
  const rule = part("rule");
  rule.setAttribute("aria-hidden", "true");
  const gem = part("gem", "span");
  gem.textContent = "▟▙\n▜▛";
  rule.append(part("line", "span"), gem, part("line", "span"));
  return rule;
}

/** The doubled border: a heavy block outer rule, a thin inner frame four cells in, and a diamond
 *  fleuron in each corner of the margin between them. Small hosts keep the heavy rule alone. */
function drawFrame(grid: Grid, p: VictorianHeroProps): void {
  const cols = grid.cols;
  const rows = grid.rows;
  grid.clear();
  if (p.frame !== "none" && cols >= 6 && rows >= 6) {
    for (let x = 0; x < cols; x++) {
      grid.set(x, 0, x === 0 ? "▛" : x === cols - 1 ? "▜" : "▀");
      grid.set(x, rows - 1, x === 0 ? "▙" : x === cols - 1 ? "▟" : "▄");
    }
    for (let y = 1; y < rows - 1; y++) {
      grid.set(0, y, "█");
      grid.set(cols - 1, y, "█");
    }
    if (p.frame === "double" && cols >= 20 && rows >= 12) {
      for (const [x, y] of [
        [1, 1],
        [cols - 5, 1],
        [1, rows - 4],
        [cols - 5, rows - 4],
      ] as const) {
        for (const [dx, dy, ch] of FLEURON) grid.set(x + dx, y + dy, ch);
      }
      const top = 4;
      const bottom = rows - 5;
      const left = 4;
      const right = cols - 5;
      for (let x = left + 1; x < right; x++) {
        grid.set(x, top, "─");
        grid.set(x, bottom, "─");
      }
      for (let y = top + 1; y < bottom; y++) {
        grid.set(left, y, "│");
        grid.set(right, y, "│");
      }
      grid.set(left, top, "┌");
      grid.set(right, top, "┐");
      grid.set(left, bottom, "└");
      grid.set(right, bottom, "┘");
    }
  }
  grid.flush();
}

/** Layout for the bill: every line of the stack shares one measure, rules are hairlines, corners stay
 *  square, and mono belongs to the label lines alone so the prose keeps the page's own face. The
 *  minimum height goes in a :where() rule, which carries no specificity, so a page that gives this
 *  host a height of its own wins. */
function rules(selector: string, p: VictorianHeroProps): string {
  const s = selector;
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const centered = p.align !== "start";
  const pad =
    p.frame === "double"
      ? "clamp(4.5rem,10vh,7rem) clamp(3.25rem,8vw,7rem)"
      : p.frame === "single"
        ? "clamp(2.25rem,6vh,4rem) clamp(1.75rem,4vw,3rem)"
        : "clamp(1.5rem,5vh,4rem) clamp(1.5rem,5vw,4rem)";
  return [
    `:where(${s}){min-height:${vh(p.minHeight)}vh}`,
    `${s}{position:relative;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${centered ? "center" : "flex-start"};text-align:${centered ? "center" : "start"};color:${fg};padding:${pad};overflow-wrap:break-word}`,
    `${s} > *{box-sizing:border-box;margin:0}`,
    `${s} > [data-pica-kicker]{width:min(46rem,100%);font-family:${GRID_FONT};font-size:0.7em;letter-spacing:0.32em;text-transform:uppercase;color:${muted};padding-left:0.32em}`,
    `${s} > [data-pica-headline]{width:min(46rem,100%);font-size:clamp(2rem,7vw,4.5rem);font-weight:800;line-height:1.02;text-transform:uppercase;text-wrap:balance}`,
    `${s} > [data-pica-subhead]{width:min(46rem,100%);font-size:clamp(1rem,1.6vw,1.2rem);font-style:italic;line-height:1.5}`,
    `${s} > [data-pica-rule]{display:flex;align-items:center;gap:0.85em;width:min(46rem,100%);margin:0.85em 0}`,
    `${s} > [data-pica-rule] [data-pica-line]{flex:1;height:1px;background:${muted}}`,
    `${s} > [data-pica-rule] [data-pica-gem]{font-family:${GRID_FONT};font-size:0.72em;line-height:1;white-space:pre;color:${accent};text-align:center}`,
    `${s} > :not([data-pica]){width:min(46rem,100%);color:${muted};font-size:0.95em;line-height:1.75}`,
    `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;justify-content:${centered ? "center" : "flex-start"};gap:0.8em;width:min(46rem,100%)}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{appearance:none;text-decoration:none;font-family:${GRID_FONT};font-size:0.72em;letter-spacing:0.16em;text-transform:uppercase;line-height:1.35;padding:0.75em 1.3em;color:${fg};border:1px solid ${fg};border-radius:0;cursor:pointer}`,
    `${s} > [data-pica-actions] a[data-variant="lead"]{border:3px double ${fg}}`,
    `${s} > [data-pica-actions] a:hover{color:${accent};border-color:${accent}}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

export const mount: Mount<VictorianHeroProps> = (host, initial = {}) => {
  let props: VictorianHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const under = layer(host, "under");
  const grid = createGrid(
    under.el,
    { fontFamily: GRID_FONT, fontSize: 14, lineHeight: 1, columns: 0, renderer: "dom", color: "" },
    draw,
  );

  const kickerEl = part("kicker", "p");
  const headlineEl = part("headline", "h1");
  const subheadEl = part("subhead", "p");
  const actionsEl = part("actions");
  let ruleNodes: HTMLElement[] = [];

  function draw(): void {
    drawFrame(grid, props);
  }

  /** Rebuilds the action links from JSON: at most three, the first under a doubled rule. */
  function renderActions(): void {
    actionsEl.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      if (i === 0) a.dataset.variant = "lead";
      a.href = action.href || "#";
      a.textContent = action.label;
      actionsEl.append(a);
    }
  }

  /** Rebuilds the bill: its own lines before the wrapped children, the calls to action after them, and
   *  a single rule between every two neighbours and at the ends, so every line sits boxed the way a
   *  playbill prints it. Children are never moved or touched; the rules land around them. */
  function syncStack(): void {
    kickerEl.textContent = props.kicker;
    headlineEl.textContent = props.headline;
    subheadEl.textContent = props.subhead;
    for (const rule of ruleNodes) rule.remove();
    ruleNodes = [];
    const seq: (HTMLElement | "children")[] = [];
    if (props.kicker.trim()) seq.push(kickerEl);
    if (props.headline.trim()) seq.push(headlineEl);
    if (props.subhead.trim()) seq.push(subheadEl);
    if (hasChildren(host)) seq.push("children");
    if (actionsEl.childElementCount > 0) seq.push(actionsEl);
    const before: HTMLElement[] = [];
    const after: HTMLElement[] = [];
    let seen = false;
    const emit = (node: HTMLElement): void => {
      (seen ? after : before).push(node);
    };
    const rule = (): HTMLElement => {
      const node = makeRule();
      ruleNodes.push(node);
      return node;
    };
    if (seq.length > 0) emit(rule());
    for (const [i, item] of seq.entries()) {
      if (i > 0) emit(rule());
      if (item === "children") seen = true;
      else emit(item);
    }
    if (seq.length > 0) emit(rule());
    host.prepend(...before);
    host.append(...after);
  }

  sheet.setRules(rules(sheet.selector, props));
  renderActions();
  syncStack();
  draw();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.align !== before.align || props.minHeight !== before.minHeight || props.frame !== before.frame) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (props.frame !== before.frame) draw();
      const actionsChanged = !sameJson(before.actions, props.actions);
      if (actionsChanged) renderActions();
      if (actionsChanged || changed(before, props, ["kicker", "headline", "subhead"])) syncStack();
    },
    destroy() {
      grid.destroy();
      under.remove();
      for (const rule of ruleNodes) rule.remove();
      for (const node of [kickerEl, headlineEl, subheadEl, actionsEl]) node.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/victorian-hero/index.tsx
export type VictorianHeroComponentProps = Partial<VictorianHeroProps> & WrapperProps & { children?: ReactNode };

/** A playbill hero: a doubled ruled border with fleuron corners around stacked lines of type. */
export function VictorianHero({ className, style, palette, children, ...props }: VictorianHeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
