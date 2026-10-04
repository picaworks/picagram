"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

// Pica · Hero · hero
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

// registry/ascii/ascii-noise-field/core.ts
const asciiNoiseField = (() => {
interface AsciiNoiseFieldProps extends MotionProps {
  /** Spatial frequency of the noise. Smaller values stretch it into broad drifting shapes, larger values pack in fine grain. */
  scale: number;
  /** How fast the field drifts, in noise units per second. */
  speed: number;
  /** Layers of noise summed at doubling frequency and halving weight, for finer detail. */
  octaves: number;
  /** How sharply ink rises around `density`. 1 is a soft gradient; 3 pushes the field toward a threshold. */
  contrast: number;
  /** The noise level mapped to the middle of the glyph ramp. Raise it for a sparser field, lower it for a denser one. */
  density: number;
  /** Glyphs to draw with, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** Glyph size in CSS pixels. */
  fontSize: number;
  /** CSS font-family stack for the glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
  /** Frames per second ceiling for the animation. */
  fps: number;
}

const defaults: AsciiNoiseFieldProps = {
  scale: 0.08,
  speed: 0.15,
  octaves: 2,
  contrast: 1.4,
  density: 0.45,
  glyphs: FALLBACK_RAMP,
  fontSize: 12,
  fontFamily: GRID_FONT,
  lineHeight: 1.2,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame shown under prefers-reduced-motion, and the one captures judge the component by. */
const STILL_TIME = 1200;

/** Amplitude kept from one octave to the next: each layer adds half the detail of the one before it. */
const OCTAVE_GAIN = 0.5;

/** Octaves beyond this add cost without a visible change at typical grid sizes. */
const MAX_OCTAVES = 3;

const mount: Mount<AsciiNoiseFieldProps> = (host, initial = {}) => {
  let props: AsciiNoiseFieldProps = { ...defaults, ...initial };
  let noise = createNoise(props.seed);
  let ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
  // Reused every frame so drawing allocates nothing: one entry per octave.
  const freq = [1, 1, 1];
  const rowCoord = [0, 0, 0];
  const timeCoord = [0, 0, 0];

  function gridOptions(p: AsciiNoiseFieldProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  function draw(t: number): void {
    const { cols, rows, aspect } = grid;
    const octaves = Math.min(MAX_OCTAVES, Math.max(1, Math.round(props.octaves)));
    const scale = props.scale;
    const contrast = props.contrast;
    const density = props.density;
    const seconds = (t / 1000) * props.speed;
    let f = 1;
    for (let o = 0; o < octaves; o++) {
      freq[o] = f;
      timeCoord[o] = seconds * f;
      f *= 2;
    }
    for (let y = 0; y < rows; y++) {
      for (let o = 0; o < octaves; o++) rowCoord[o] = ((y * scale) / aspect) * (freq[o] ?? 1);
      for (let x = 0; x < cols; x++) {
        let sum = 0;
        let amp = 1;
        let norm = 0;
        for (let o = 0; o < octaves; o++) {
          sum += noise.noise3(x * scale * (freq[o] ?? 1), rowCoord[o] ?? 0, timeCoord[o] ?? 0) * amp;
          norm += amp;
          amp *= OCTAVE_GAIN;
        }
        const level = sum / norm / 2 + 0.5;
        // A soft curve around `density`: contrast stretches how quickly ink rises on either side
        // of the pivot, and the clamp only bites at the rare extremes the noise itself reaches.
        const shaped = Math.min(1, Math.max(0, (level - density) * contrast + 0.5));
        grid.set(x, y, pick(ramp, shaped));
      }
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  const grid = createGrid(host, gridOptions(props), () => {
    ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
    loop.redraw();
  });

  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    still: STILL_TIME,
    frame: draw,
  });

  labelHost(host, "");

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.seed !== before.seed) noise = createNoise(props.seed);
      if (props.glyphs !== before.glyphs || props.fontFamily !== before.fontFamily || props.lineHeight !== before.lineHeight) {
        ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
      }
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
return { mount, defaults };
})();

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

// registry/shaders/mesh-gradient/core.ts
const meshGradient = (() => {
interface MeshGradientProps extends MotionProps {
  /** How fast the fields drift. 0 holds them still. */
  speed: number;
  /** Size of the color fields: lower values are broad and soft, higher values are busier. */
  scale: number;
  /** How far the fields fold into each other, from 0 (plain noise) to 1 (deep folds). */
  warp: number;
  /** How strongly the accent shows over the ground, from 0 to 1. */
  intensity: number;
  /** Tone steps the gradient is dithered between: 2 is one-bit, 16 reads as nearly smooth. */
  levels: number;
  /** Size of one dither cell, in CSS pixels. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

const defaults: MeshGradientProps = {
  speed: 0.25,
  scale: 1.1,
  warp: 0.6,
  intensity: 0.9,
  levels: 6,
  pixel: 2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame held under reduced motion. */
const STILL = 1200;

/** Two noise fields fold a third (domain warping), which sets how much accent each cell carries. The tone
 *  is then dithered between a few steps with the 8 by 8 Bayer matrix, so the gradient keeps a printed
 *  grain instead of banding, and the ink leans halfway toward fg at the field's peaks, the second tone. */
const FRAGMENT = `${NOISE}${DITHER}
uniform float u_speed;
uniform float u_scale;
uniform float u_warp;
uniform float u_intensity;
uniform float u_levels;
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y) * u_scale;
  float t = u_time * u_speed;
  vec2 q = vec2(pica_fbm(p + vec2(0.0, 0.35 * t), 3), pica_fbm(p + vec2(5.2, 1.3) - 0.25 * t, 3));
  float field = pica_fbm(p + 2.0 * u_warp * q + vec2(0.1 * t, 0.0), 4);
  float steps = max(1.0, u_levels - 1.0);
  float tone = clamp(smoothstep(-0.3, 0.6, field) * u_intensity, 0.0, 1.0);
  tone = floor(tone * steps + pica_bayer8(ivec2(gl_FragCoord.xy))) / steps;
  vec3 ink = mix(u_accent.rgb, u_fg.rgb, smoothstep(0.3, 0.7, field) * 0.5);
  float ground = step(0.001, u_bg.a);
  pica_color = vec4(mix(ink, mix(u_bg.rgb, ink, tone), ground), max(tone * u_accent.a, u_bg.a));
}
`;

/** What shows without WebGL2: the same accent glow as a still gradient, still in the palette's colors. */
const FALLBACK = `radial-gradient(90% 70% at 30% 35%, color-mix(in srgb, ${cssVar("accent")} 70%, transparent), transparent 75%)`;

function uniforms(p: MeshGradientProps): Record<string, number> {
  return { u_seed: p.seed, u_speed: p.speed, u_scale: p.scale, u_warp: p.warp, u_intensity: p.intensity, u_levels: p.levels };
}

const mount: Mount<MeshGradientProps> = (host, initial = {}) => {
  let props: MeshGradientProps = { ...defaults, ...initial };

  function build(): Shader {
    return createShader(host, {
      fragment: FRAGMENT,
      fallback: FALLBACK,
      uniforms: uniforms(props),
      // One drawn pixel per dither cell, scaled up square by CSS: a cell stays crisp, and a bigger cell
      // costs less to draw.
      maxDpr: 1 / Math.max(1, props.pixel),
      css: "image-rendering:pixelated",
      onInvalidate: () => loop.redraw(),
    });
  }

  let shader = build();

  function draw(t: number): void {
    shader.draw(t);
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.pixel !== before.pixel) {
        shader.destroy();
        shader = build();
      } else {
        for (const [name, value] of Object.entries(uniforms(props))) shader.set(name, value);
      }
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      shader.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
return { mount, defaults };
})();

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

// registry/sections/hero/core.ts
export interface HeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface HeroProps extends MotionProps {
  /** What draws behind the content: a mesh gradient, a drifting ASCII noise field, or nothing. */
  background: "mesh" | "noise" | "none";
  /** Calls to action, drawn as links. The first draws solid in the accent, the rest draw outline. */
  actions: readonly HeroAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** How strongly the background shows, from 0 to 1, passed through to whichever one is mounted. */
  intensity: number;
}

export const defaults: HeroProps = {
  background: "mesh",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  minHeight: 60,
  intensity: 0.6,
  paused: false,
  time: null,
  seed: 1,
};

/** Keeps minHeight inside a sane range even if a caller passes something outside 30 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** Maps the 0 to 1 intensity onto ascii-noise-field's contrast range, since that field has no intensity
 *  prop of its own: raising contrast pushes its tone toward a threshold, which reads as a more present field. */
function noiseContrast(intensity: number): number {
  return 0.6 + Math.min(1, Math.max(0, intensity)) * 1.8;
}

/** Props for the mesh background: intensity passes straight through, everything else keeps its own defaults. */
function meshProps(p: HeroProps): Partial<typeof meshGradient.defaults> {
  return { paused: p.paused, time: p.time, seed: p.seed, intensity: p.intensity };
}

/** Props for the noise background: intensity becomes contrast, the closest knob that field has. */
function noiseProps(p: HeroProps): Partial<typeof asciiNoiseField.defaults> {
  return { paused: p.paused, time: p.time, seed: p.seed, contrast: noiseContrast(p.intensity) };
}

/** The mounted background, tagged by kind so each core's own update stays correctly typed. */
type Background =
  | { kind: "none" }
  | { kind: "mesh"; layer: Layer; instance: ReturnType<typeof meshGradient.mount> }
  | { kind: "noise"; layer: Layer; instance: ReturnType<typeof asciiNoiseField.mount> };

/** Mounts the chosen background into a fresh under layer of its own. */
function mountBackground(kind: "mesh" | "noise", host: HTMLElement, p: HeroProps): Background {
  const bgLayer = layer(host, "under");
  if (kind === "mesh") return { kind, layer: bgLayer, instance: meshGradient.mount(bgLayer.el, meshProps(p)) };
  return { kind, layer: bgLayer, instance: asciiNoiseField.mount(bgLayer.el, noiseProps(p)) };
}

function destroyBackground(bg: Background): void {
  if (bg.kind === "none") return;
  bg.instance.destroy();
  bg.layer.remove();
}

/** Layout for the host and the button grammar for its calls to action, from STYLE.md: the first action
 *  solid in the accent, the rest outline, square corners, and a hairline focus ring. The minimum height goes
 *  in a :where() rule, which carries no specificity at all, so a page that gives this host a height of its
 *  own wins without having to fight an inline style. */
function rules(selector: string, p: HeroProps): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const edge = p.align === "center" ? "center" : "flex-start";
  const textAlign = p.align === "center" ? "center" : "start";
  return [
    `:where(${selector}){min-height:${vh(p.minHeight)}vh}`,
    `${selector}{position:relative;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${edge};padding:clamp(1.5rem, 5vw, 4rem);gap:0.6em}`,
    `${selector} > :not([data-pica]){max-width:40rem;text-align:${textAlign}}`,
    `${selector} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;max-width:40rem;margin-top:0.6em;justify-content:${edge}}`,
    `${selector} > [data-pica-actions]:empty{display:none}`,
    `${selector} > [data-pica-actions] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.25em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
    `${selector} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
    `${selector} > [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
    `${selector} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${selector} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

/** Rebuilds the action links from JSON: the first solid, the rest outline, in source order. */
function renderActions(container: HTMLElement, actions: readonly HeroAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href;
    a.textContent = action.label;
    container.append(a);
  }
}

export const mount: Mount<HeroProps> = (host, initial = {}) => {
  let props: HeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  // Nothing about size is set inline. A block host already sizes from its own content, the scoped :where()
  // rule adds a floor a page can override, and meta.stage "flow" is what tells the demo page and the catalog
  // frame to give this host its own height.

  const actions = document.createElement("div");
  actions.setAttribute("data-pica", "");
  actions.setAttribute("data-pica-actions", "");
  host.append(actions);

  let bg: Background = props.background === "none" ? { kind: "none" } : mountBackground(props.background, host, props);

  sheet.setRules(rules(sheet.selector, props));
  renderActions(actions, props.actions);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };

      if (props.background !== before.background) {
        destroyBackground(bg);
        bg = props.background === "none" ? { kind: "none" } : mountBackground(props.background, host, props);
      } else if (bg.kind === "mesh") {
        if (
          props.paused !== before.paused ||
          props.time !== before.time ||
          props.seed !== before.seed ||
          props.intensity !== before.intensity
        ) {
          bg.instance.update(meshProps(props));
        }
      } else if (bg.kind === "noise") {
        if (
          props.paused !== before.paused ||
          props.time !== before.time ||
          props.seed !== before.seed ||
          props.intensity !== before.intensity
        ) {
          bg.instance.update(noiseProps(props));
        }
      }

      if (props.minHeight !== before.minHeight || props.align !== before.align) sheet.setRules(rules(sheet.selector, props));
      if (!sameJson(before.actions, props.actions)) renderActions(actions, props.actions);
    },
    destroy() {
      destroyBackground(bg);
      actions.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};

// registry/sections/hero/index.tsx
export type HeroComponentProps = Partial<HeroProps> & WrapperProps & { children?: ReactNode };

/** A page hero that adds a row of calls to action and a composed background behind a headline and copy. */
export function Hero({ className, style, palette, children, ...props }: HeroComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
