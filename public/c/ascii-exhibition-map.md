# ASCII Exhibition Map

> A floor plan drawn in box-drawing glyphs from room rectangles and doors, with a route-ordered room list that selects and fills one room.

Category: ascii. Tags: ascii, floor plan, map, box drawing, selection. Static. Size: 5.4 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/ascii-exhibition-map.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | string | `"Ground floor plan"` | Names the region and prints as the plan's caption. Empty leaves no caption and no role. |
| `plan` | { cols: number; rows: number } | `{"cols":16,"rows":11}` | The plan's size in plan units. It grows to hold every room. |
| `rooms` | readonly AsciiExhibitionMapRoom[] | `[{"name":"Entrance","subject":"Desk, lockers and the start of the route","note":"Pick up a printed plan at the desk. Lockers sit beside the street door, and the route begins through the opening in the north wall.","access":"Level street entrance / Seats at the desk","x":0,"y":7,"w":11,"h":4,"doors":[{"side":"s","at":5},{"side":"n","at":2}]},{"name":"Measure","subject":"Tools for agreeing on a length","note":"A folded ruler, a marked string and a workshop gauge show three ways of making a measurement repeatable. Read the wear marks beside the numbered divisions.","access":"Level access / Seating by the east wall","x":0,"y":0,"w":5,"h":7,"doors":[{"side":"e","at":3}]},{"name":"Mend","subject":"Repair as a visible record","note":"Patched cloth and a joined ceramic bowl preserve the decision to keep an object in use. A handling sample lets visitors feel the seam without touching the exhibited pieces.","access":"Level access / Seated handling sample","x":5,"y":0,"w":6,"h":7,"doors":[{"side":"e","at":2}]},{"name":"Carry","subject":"The shape of a daily journey","note":"A market basket, a tool roll and a parcel wrapper are arranged around the routes they served. Each label traces a repeated trip from the maker to the place of use.","access":"Level access / Large print labels","x":11,"y":0,"w":5,"h":6,"doors":[{"side":"s","at":2}]},{"name":"Keep","subject":"Where each tool waits between jobs","note":"Shadow boards, labelled drawers and a mended tool chest show how a workshop keeps its things in order. The last opening leads back to the entrance.","access":"Level access / Drawers at seated height","x":11,"y":6,"w":5,"h":5,"doors":[{"side":"w","at":2}]}]` | The rooms in route order, numbered from 01. Rooms that touch share one wall, and a door cuts it for both. |
| `value` | number \| null | `null` | The selected room's index while controlled, or null to let the component keep its own selection. |
| `defaultValue` | number | `0` | The room selected at mount while uncontrolled, or -1 for none. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `valueChange` | `onValueChange` | `number` | The index of the room a visitor chose, from its button or from the plan. |

## Colors

Draws with `--pica-fg`, `--pica-muted`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · ASCII Exhibition Map · ascii-exhibition-map
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

// registry/ascii/ascii-exhibition-map/core.ts
/** One room on the plan. Its rectangle is in plan units, counted from the plan's top left corner. */
export interface AsciiExhibitionMapRoom {
  /** The room's name, drawn after its number inside the plan and on its button. */
  name: string;
  /** One line about the room, shown first when it is selected. */
  subject: string;
  /** A short paragraph about what the room holds. */
  note: string;
  /** Practical access notes, set as a label under the note. */
  access: string;
  /** The left edge, in plan units. */
  x: number;
  /** The top edge, in plan units. */
  y: number;
  /** The width, in plan units. */
  w: number;
  /** The height, in plan units. */
  h: number;
  /** Openings one plan unit wide: the wall each one cuts, and which unit along it, counted from 0 at the room's left or top corner. */
  doors?: readonly { side: "n" | "e" | "s" | "w"; at: number }[];
}

export interface AsciiExhibitionMapProps {
  /** Names the region and prints as the plan's caption. Empty leaves no caption and no role. */
  label: string;
  /** The plan's size in plan units. It grows to hold every room. */
  plan: { cols: number; rows: number };
  /** The rooms in route order, numbered from 01. Rooms that touch share one wall, and a door cuts it for both. */
  rooms: readonly AsciiExhibitionMapRoom[];
  /** The selected room's index while controlled, or null to let the component keep its own selection. */
  value: number | null;
  /** The room selected at mount while uncontrolled, or -1 for none. */
  defaultValue: number;
}

export interface AsciiExhibitionMapEvents {
  /** The index of the room a visitor chose, from its button or from the plan. */
  valueChange: number;
}

export const defaults: AsciiExhibitionMapProps = {
  label: "Ground floor plan",
  plan: { cols: 16, rows: 11 },
  rooms: [
    {
      name: "Entrance",
      subject: "Desk, lockers and the start of the route",
      note: "Pick up a printed plan at the desk. Lockers sit beside the street door, and the route begins through the opening in the north wall.",
      access: "Level street entrance / Seats at the desk",
      x: 0,
      y: 7,
      w: 11,
      h: 4,
      doors: [{ side: "s", at: 5 }, { side: "n", at: 2 }],
    },
    {
      name: "Measure",
      subject: "Tools for agreeing on a length",
      note: "A folded ruler, a marked string and a workshop gauge show three ways of making a measurement repeatable. Read the wear marks beside the numbered divisions.",
      access: "Level access / Seating by the east wall",
      x: 0,
      y: 0,
      w: 5,
      h: 7,
      doors: [{ side: "e", at: 3 }],
    },
    {
      name: "Mend",
      subject: "Repair as a visible record",
      note: "Patched cloth and a joined ceramic bowl preserve the decision to keep an object in use. A handling sample lets visitors feel the seam without touching the exhibited pieces.",
      access: "Level access / Seated handling sample",
      x: 5,
      y: 0,
      w: 6,
      h: 7,
      doors: [{ side: "e", at: 2 }],
    },
    {
      name: "Carry",
      subject: "The shape of a daily journey",
      note: "A market basket, a tool roll and a parcel wrapper are arranged around the routes they served. Each label traces a repeated trip from the maker to the place of use.",
      access: "Level access / Large print labels",
      x: 11,
      y: 0,
      w: 5,
      h: 6,
      doors: [{ side: "s", at: 2 }],
    },
    {
      name: "Keep",
      subject: "Where each tool waits between jobs",
      note: "Shadow boards, labelled drawers and a mended tool chest show how a workshop keeps its things in order. The last opening leads back to the entrance.",
      access: "Level access / Drawers at seated height",
      x: 11,
      y: 6,
      w: 5,
      h: 5,
      doors: [{ side: "w", at: 2 }],
    },
  ],
  value: null,
  defaultValue: 0,
};

/** Wall glyphs indexed by the sides a wall cell joins: north 1, east 2, south 4, west 8. A cell that joins
 *  on one side only is a door's jamb. */
const EXHIBIT_WALLS = "─╵╶└╷│┌├╴┘─┴┐┤┬┼";

let exhibitProbe: CanvasRenderingContext2D | null | undefined;

function exhibitEl<K extends keyof HTMLElementTagNameMap>(tag: K, parent: Node, part = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (part) el.setAttribute("data-part", part);
  parent.appendChild(el);
  return el;
}

/** The row height as a multiple of the glyph size: the measured ink of a vertical rule, less a quarter pixel
 *  and rounded down to whole pixels, so the rules of consecutive rows always overlap. Kept between 1 and 1.25. */
function exhibitLine(size: number): number {
  if (exhibitProbe === undefined) exhibitProbe = document.createElement("canvas").getContext("2d");
  let ink = size * 1.2;
  if (exhibitProbe) {
    exhibitProbe.font = `${size}px ${GRID_FONT}`;
    const m = exhibitProbe.measureText("│");
    ink = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || ink;
  }
  return Math.max(1, Math.floor(Math.min(1.25 * size, Math.max(size, ink - 0.25)))) / size;
}

/** Greedy word wrap. A word longer than the width keeps a line of its own, so the caller can reject the fit. */
function exhibitWrap(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && last.length + word.length < width) lines[lines.length - 1] = `${last} ${word}`;
    else if (word) lines.push(word);
  }
  return lines;
}

const exhibitUnit = (value: unknown, min: number): number => Math.max(min, Math.round(Number(value)) || 0);

function exhibitRules(map: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const rule = `1px solid color-mix(in srgb, ${fg} 24%, transparent)`;
  return [
    `:where(${map}){box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr);gap:1.5rem 2.5rem;align-items:start;padding:clamp(1rem,4%,2.5rem);color:${fg}}`,
    `${map}[data-layout=split]{grid-template-columns:repeat(2,minmax(0,1fr))}`,
    `${map}[data-layout=split]>figure{grid-column:1/-1}`,
    `${map}[data-layout=wide]{grid-template-columns:minmax(0,1fr) 22rem;grid-template-rows:auto 1fr}`,
    `${map}[data-layout=wide]>figure{grid-row:span 2}`,
    `${map} figure{min-width:0;margin:0;overflow-x:auto;overflow-y:hidden}`,
    `${map} p{margin:0}`,
    `${map} figcaption,${map} [data-part=empty],${map} [data-part=access]{font:.75em/1.4 ${GRID_FONT};letter-spacing:.04em;text-transform:uppercase;color:${muted}}`,
    `${map} figcaption{margin-bottom:1rem}`,
    `${map} pre{margin:0;font-family:${GRID_FONT};letter-spacing:0;word-spacing:0;font-kerning:none;font-variant-ligatures:none;white-space:pre;user-select:none}`,
    `${map} [data-tone=accent]{color:${accent}}`,
    `${map} [data-room]{cursor:pointer}`,
    `${map} ol{margin:0;padding:0;list-style:none;border-top:${rule}}`,
    `${map} li{border-bottom:${rule}}`,
    `${map} button{box-sizing:border-box;display:flex;align-items:baseline;gap:.9em;width:100%;min-height:2.75rem;margin:0;padding:.6em .75em;border:0;border-left:3px solid transparent;border-radius:0;background:none;color:inherit;font:inherit;line-height:1.3;text-align:left;cursor:pointer}`,
    `${map} button:hover{background:color-mix(in srgb, ${fg} 8%, transparent)}`,
    `${map} button[aria-pressed=true]{border-left-color:${accent}}`,
    `${map} button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${map} button>span{font:.8em/1 ${GRID_FONT};color:${muted}}`,
    `${map} button[aria-pressed=true]>span{color:inherit}`,
    `${map} [data-part=detail]{max-width:62ch}`,
    `${map} [data-part=detail] p+p{margin-top:.75em}`,
    `${map} [data-part=subject]{font-size:1.125em;line-height:1.35}`,
    `${map} [data-part=note]{line-height:1.6}`,
  ].join("\n");
}

export const mount: Mount<AsciiExhibitionMapProps> = (host, initial = {}) => {
  let props: AsciiExhibitionMapProps = { ...defaults, ...initial };
  let chosen = props.defaultValue;
  let width = -1;
  let base = 0;
  let shown = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const emit = emitter<AsciiExhibitionMapEvents>(host);
  const root = exhibitEl("div", host, "map");
  const figure = exhibitEl("figure", root, "plan");
  const caption = exhibitEl("figcaption", figure);
  const pre = exhibitEl("pre", figure, "drawing");
  const empty = exhibitEl("p", figure, "empty");
  const list = exhibitEl("ol", root, "rooms");
  const detail = exhibitEl("div", root, "detail");
  pre.setAttribute("aria-hidden", "true");
  detail.setAttribute("aria-live", "polite");
  empty.textContent = "No rooms";
  sheet.setRules(exhibitRules(`${sheet.selector}>[data-part=map]`));

  const current = (): number => {
    const index = typeof props.value === "number" ? props.value : chosen;
    return Number.isInteger(index) && index >= 0 && index < props.rooms.length ? index : -1;
  };

  function draw(): void {
    base = parseFloat(getComputedStyle(host).fontSize) || 16;
    width = root.clientWidth;
    root.setAttribute("data-layout", width >= 72 * base ? "wide" : width >= 40 * base ? "split" : "stack");
    const units = props.rooms.map((room) => ({ room, x: exhibitUnit(room.x, 0), y: exhibitUnit(room.y, 0), w: exhibitUnit(room.w, 1), h: exhibitUnit(room.h, 1) }));
    if (units.length === 0) {
      pre.replaceChildren();
      return;
    }
    let cols = exhibitUnit(props.plan?.cols, 1);
    let rows = exhibitUnit(props.plan?.rows, 1);
    for (const u of units) {
      cols = Math.max(cols, u.x + u.w);
      rows = Math.max(rows, u.y + u.h);
    }
    // Two columns per unit keep doors open and units near square, so glyphs shrink, down to 10 px, before a
    // plan falls back to one column per unit.
    const avail = figure.clientWidth - 1;
    const advance = measureCell(GRID_FONT, base, 1).w / base;
    const fit = (per: number): number => Math.floor((avail / ((per * cols + 1) * advance)) * 10) / 10;
    const size = fit(2) >= base ? base : fit(2) >= 10 ? fit(2) : Math.max(10, Math.min(base, fit(1)));
    const lh = exhibitLine(size);
    const cell = measureCell(GRID_FONT, size, lh);
    // A unit is sx columns by a whole number of rows, so it can come out far from square. One column fewer is
    // taken when that brings the plan's proportions much closer, so the drawing keeps its shape at every width.
    const rowsFor = (per: number): number => Math.max(1, Math.round((per * cell.w) / cell.h));
    const skew = (per: number): number => Math.abs(Math.log((per * cell.w) / (rowsFor(per) * cell.h)));
    let sx = Math.max(1, Math.floor((avail / cell.w - 1) / cols + 1e-6));
    if (sx > 2 && skew(sx) > 0.22 && skew(sx - 1) < skew(sx)) sx -= 1;
    const sy = rowsFor(sx);
    const stride = cols * sx + 1;
    const n = stride * (rows * sy + 1);
    const walls = new Uint8Array(n);
    const owner = new Int16Array(n).fill(-1);
    const glyphs = new Array<string>(n).fill(" ");
    const tinted = new Uint8Array(n);
    const join = (at: number, sides: number): void => {
      walls[at] = (walls[at] ?? 0) | sides;
    };
    const cut = (at: number, sides: number): void => {
      walls[at] = (walls[at] ?? 0) & ~sides;
    };
    units.forEach(({ x, y, w, h }, i) => {
      for (let r = y * sy; r <= (y + h) * sy; r++) {
        for (let c = x * sx; c <= (x + w) * sx; c++) {
          const at = r * stride + c;
          const across = r === y * sy || r === (y + h) * sy;
          const down = c === x * sx || c === (x + w) * sx;
          if (across) join(at, (c < (x + w) * sx ? 2 : 0) | (c > x * sx ? 8 : 0));
          if (down) join(at, (r < (y + h) * sy ? 4 : 0) | (r > y * sy ? 1 : 0));
          if (!across && !down) owner[at] = i;
        }
      }
    });
    for (const { room, x, y, w, h } of units) {
      for (const door of room.doors ?? []) {
        const across = door.side === "n" || door.side === "s";
        const step = across ? sx : sy;
        const from = exhibitUnit(door.at, 0) * step;
        if (from + step > (across ? w * sx : h * sy)) continue;
        const next = across ? 1 : stride;
        const origin = across ? (door.side === "n" ? y : y + h) * sy * stride + x * sx : y * sy * stride + (door.side === "w" ? x : x + w) * sx;
        // A door cuts the wall's own links between two unit lines, so the opening is one unit at every scale, the
        // cells at either end join one way only and draw as jambs, and a wall that meets the opening keeps its links.
        for (let k = from; k < from + step; k++) {
          cut(origin + k * next, across ? 2 : 4);
          cut(origin + (k + 1) * next, across ? 8 : 1);
        }
      }
    }
    const index = current();
    const dot = measureRamp("·.", GRID_FONT, lh).glyphs[0] ?? ".";
    units.forEach(({ room, x, y, w, h }, i) => {
      const inner = w * sx - 1;
      const tall = h * sy - 1;
      const number = String(i + 1).padStart(2, "0");
      let lines = exhibitWrap(`${number} ${room.name ?? ""}`, inner - 2);
      if (lines.length + 2 > tall || lines.some((line) => line.length > inner - 2)) lines = tall > 0 && number.length <= inner - 2 ? [number] : [];
      if (i === index) {
        owner.forEach((o, at) => {
          if (o === i && !walls[at]) {
            glyphs[at] = dot;
            tinted[at] = 1;
          }
        });
      }
      // Each label line keeps a clear cell on either side, and a lone fill cell left between it and a wall is
      // cleared as well, so the label reads against the fill.
      const top = y * sy + 1 + ((tall - lines.length) >> 1);
      lines.forEach((line, k) => {
        const left = x * sx + 1 + ((inner - line.length) >> 1);
        const lo = left - 1 === x * sx + 2 ? left - 2 : left - 1;
        const hi = left + line.length === (x + w) * sx - 2 ? left + line.length + 1 : left + line.length;
        for (let c = lo; c <= hi; c++) {
          const at = (top + k) * stride + c;
          glyphs[at] = line[c - left] ?? " ";
          tinted[at] = 0;
        }
      });
    });
    const out = document.createDocumentFragment();
    for (let at = 0; at < n; ) {
      if (at > 0 && at % stride === 0) out.append("\n");
      const room = walls[at] ? -1 : (owner[at] ?? -1);
      const tone = tinted[at] ?? 0;
      const end = at - (at % stride) + stride;
      let text = "";
      while (at < end && (walls[at] ? -1 : (owner[at] ?? -1)) === room && (tinted[at] ?? 0) === tone) {
        text += walls[at] ? (EXHIBIT_WALLS[walls[at] ?? 0] ?? "") : (glyphs[at] ?? " ");
        at++;
      }
      const run = exhibitEl("span", out);
      run.setAttribute("data-tone", tone ? "accent" : "fg");
      if (room >= 0) run.setAttribute("data-room", String(room));
      run.textContent = text;
    }
    pre.style.cssText = `font-size:${size}px;line-height:${cell.h}px`;
    pre.replaceChildren(out);
  }

  function render(): void {
    const index = current();
    const room = props.rooms[index];
    const none = props.rooms.length === 0;
    caption.textContent = props.label;
    caption.hidden = !props.label;
    empty.hidden = !none;
    pre.hidden = list.hidden = detail.hidden = none;
    figure.setAttribute("data-selected", String(index));
    list.querySelectorAll("button").forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
    const text: [string, string][] = room ? [["subject", room.subject], ["note", room.note], ["access", room.access]] : [];
    if (JSON.stringify(text) !== shown) {
      shown = JSON.stringify(text);
      detail.replaceChildren();
      for (const [part, line] of text) if (line) exhibitEl("p", detail, part).textContent = line;
    }
    draw();
  }

  function buildList(): void {
    list.replaceChildren();
    props.rooms.forEach((room, i) => {
      const button = exhibitEl("button", exhibitEl("li", list));
      button.type = "button";
      button.setAttribute("data-index", String(i));
      exhibitEl("span", button).textContent = String(i + 1).padStart(2, "0");
      button.append(` ${room.name ?? ""}`);
    });
  }

  function nameRegion(): void {
    attrs.set("role", props.label ? "region" : null);
    attrs.set("aria-label", props.label || null);
  }

  root.addEventListener("click", (event) => {
    const hit = (event.target as Element | null)?.closest?.("[data-room],[data-index]");
    if (!hit) return;
    const index = Number(hit.getAttribute("data-room") ?? hit.getAttribute("data-index"));
    if (typeof props.value !== "number") {
      chosen = index;
      render();
    }
    emit("valueChange", index);
  });

  // A redraw changes the host's height, so it waits for the next task instead of running inside the
  // observer's own callback, where it would trip the resize loop error.
  const observer = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => {
        if (root.clientWidth === width && (parseFloat(getComputedStyle(host).fontSize) || 16) === base) return;
        clearTimeout(timer);
        timer = setTimeout(draw);
      })
    : null;
  observer?.observe(host);
  document.fonts?.addEventListener("loadingdone", draw);

  nameRegion();
  buildList();
  render();
  attrs.set("data-pica-ready", "true");

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      nameRegion();
      if (!sameJson(before.rooms, props.rooms)) buildList();
      render();
    },
    destroy() {
      clearTimeout(timer);
      observer?.disconnect();
      document.fonts?.removeEventListener("loadingdone", draw);
      root.remove();
      sheet.destroy();
      attrs.restore();
    },
  };
};

// registry/ascii/ascii-exhibition-map/index.tsx
export type AsciiExhibitionMapComponentProps = Partial<AsciiExhibitionMapProps> & WrapperProps & Handlers<AsciiExhibitionMapEvents>;
/** A floor plan drawn in box-drawing glyphs from room rectangles and doors, with a route-ordered room list that selects one room. */
export function AsciiExhibitionMap({ className, style, palette, ...props }: AsciiExhibitionMapComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · ASCII Exhibition Map · ascii-exhibition-map
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>ASCII Exhibition Map · Pica</title>
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
var PicaAsciiExhibitionMap = (() => {
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

  // registry/ascii/ascii-exhibition-map/core.ts
  var core_exports = {};
  __export(core_exports, {
    defaults: () => defaults,
    mount: () => mount
  });

  // lib/events.ts
  function eventType(name) {
    return `pica:${name.toLowerCase()}`;
  }
  function emitter(host) {
    return (name, detail) => {
      host.dispatchEvent(new CustomEvent(eventType(name), { detail, bubbles: false }));
    };
  }

  // lib/font.ts
  var GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

  // lib/host.ts
  function nextSerial() {
    const g = globalThis;
    g.__picaSerial = (g.__picaSerial ?? 0) + 1;
    return g.__picaSerial;
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

  // lib/palette.ts
  var TOKEN_FALLBACK = {
    fg: "currentColor",
    bg: "transparent",
    accent: "#13C4A3",
    muted: "color-mix(in srgb, var(--pica-fg, currentColor) 65%, transparent)"
  };
  function cssVar(token) {
    return `var(--pica-${token}, ${TOKEN_FALLBACK[token]})`;
  }

  // lib/glyph-grid.ts
  var measurer;
  function advanceOf(fontFamily) {
    if (measurer === void 0) measurer = document.createElement("canvas").getContext("2d");
    if (!measurer) return 0.6;
    measurer.font = `100px ${fontFamily}`;
    return measurer.measureText("M").width / 100 || 0.6;
  }
  function measureCell(fontFamily, fontSize, lineHeight) {
    return { w: fontSize * advanceOf(fontFamily), h: Math.max(1, Math.round(fontSize * lineHeight)) };
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

  // registry/ascii/ascii-exhibition-map/core.ts
  var defaults = {
    label: "Ground floor plan",
    plan: { cols: 16, rows: 11 },
    rooms: [
      {
        name: "Entrance",
        subject: "Desk, lockers and the start of the route",
        note: "Pick up a printed plan at the desk. Lockers sit beside the street door, and the route begins through the opening in the north wall.",
        access: "Level street entrance / Seats at the desk",
        x: 0,
        y: 7,
        w: 11,
        h: 4,
        doors: [{ side: "s", at: 5 }, { side: "n", at: 2 }]
      },
      {
        name: "Measure",
        subject: "Tools for agreeing on a length",
        note: "A folded ruler, a marked string and a workshop gauge show three ways of making a measurement repeatable. Read the wear marks beside the numbered divisions.",
        access: "Level access / Seating by the east wall",
        x: 0,
        y: 0,
        w: 5,
        h: 7,
        doors: [{ side: "e", at: 3 }]
      },
      {
        name: "Mend",
        subject: "Repair as a visible record",
        note: "Patched cloth and a joined ceramic bowl preserve the decision to keep an object in use. A handling sample lets visitors feel the seam without touching the exhibited pieces.",
        access: "Level access / Seated handling sample",
        x: 5,
        y: 0,
        w: 6,
        h: 7,
        doors: [{ side: "e", at: 2 }]
      },
      {
        name: "Carry",
        subject: "The shape of a daily journey",
        note: "A market basket, a tool roll and a parcel wrapper are arranged around the routes they served. Each label traces a repeated trip from the maker to the place of use.",
        access: "Level access / Large print labels",
        x: 11,
        y: 0,
        w: 5,
        h: 6,
        doors: [{ side: "s", at: 2 }]
      },
      {
        name: "Keep",
        subject: "Where each tool waits between jobs",
        note: "Shadow boards, labelled drawers and a mended tool chest show how a workshop keeps its things in order. The last opening leads back to the entrance.",
        access: "Level access / Drawers at seated height",
        x: 11,
        y: 6,
        w: 5,
        h: 5,
        doors: [{ side: "w", at: 2 }]
      }
    ],
    value: null,
    defaultValue: 0
  };
  var EXHIBIT_WALLS = "─╵╶└╷│┌├╴┘─┴┐┤┬┼";
  var exhibitProbe;
  function exhibitEl(tag, parent, part = "") {
    const el = document.createElement(tag);
    el.setAttribute("data-pica", "");
    if (part) el.setAttribute("data-part", part);
    parent.appendChild(el);
    return el;
  }
  function exhibitLine(size) {
    if (exhibitProbe === void 0) exhibitProbe = document.createElement("canvas").getContext("2d");
    let ink = size * 1.2;
    if (exhibitProbe) {
      exhibitProbe.font = `${size}px ${GRID_FONT}`;
      const m = exhibitProbe.measureText("│");
      ink = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || ink;
    }
    return Math.max(1, Math.floor(Math.min(1.25 * size, Math.max(size, ink - 0.25)))) / size;
  }
  function exhibitWrap(text, width) {
    const lines = [];
    for (const word of text.split(/\s+/)) {
      const last = lines[lines.length - 1];
      if (last !== void 0 && last.length + word.length < width) lines[lines.length - 1] = `${last} ${word}`;
      else if (word) lines.push(word);
    }
    return lines;
  }
  var exhibitUnit = (value, min) => Math.max(min, Math.round(Number(value)) || 0);
  function exhibitRules(map) {
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    const rule = `1px solid color-mix(in srgb, ${fg} 24%, transparent)`;
    return [
      `:where(${map}){box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr);gap:1.5rem 2.5rem;align-items:start;padding:clamp(1rem,4%,2.5rem);color:${fg}}`,
      `${map}[data-layout=split]{grid-template-columns:repeat(2,minmax(0,1fr))}`,
      `${map}[data-layout=split]>figure{grid-column:1/-1}`,
      `${map}[data-layout=wide]{grid-template-columns:minmax(0,1fr) 22rem;grid-template-rows:auto 1fr}`,
      `${map}[data-layout=wide]>figure{grid-row:span 2}`,
      `${map} figure{min-width:0;margin:0;overflow-x:auto;overflow-y:hidden}`,
      `${map} p{margin:0}`,
      `${map} figcaption,${map} [data-part=empty],${map} [data-part=access]{font:.75em/1.4 ${GRID_FONT};letter-spacing:.04em;text-transform:uppercase;color:${muted}}`,
      `${map} figcaption{margin-bottom:1rem}`,
      `${map} pre{margin:0;font-family:${GRID_FONT};letter-spacing:0;word-spacing:0;font-kerning:none;font-variant-ligatures:none;white-space:pre;user-select:none}`,
      `${map} [data-tone=accent]{color:${accent}}`,
      `${map} [data-room]{cursor:pointer}`,
      `${map} ol{margin:0;padding:0;list-style:none;border-top:${rule}}`,
      `${map} li{border-bottom:${rule}}`,
      `${map} button{box-sizing:border-box;display:flex;align-items:baseline;gap:.9em;width:100%;min-height:2.75rem;margin:0;padding:.6em .75em;border:0;border-left:3px solid transparent;border-radius:0;background:none;color:inherit;font:inherit;line-height:1.3;text-align:left;cursor:pointer}`,
      `${map} button:hover{background:color-mix(in srgb, ${fg} 8%, transparent)}`,
      `${map} button[aria-pressed=true]{border-left-color:${accent}}`,
      `${map} button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${map} button>span{font:.8em/1 ${GRID_FONT};color:${muted}}`,
      `${map} button[aria-pressed=true]>span{color:inherit}`,
      `${map} [data-part=detail]{max-width:62ch}`,
      `${map} [data-part=detail] p+p{margin-top:.75em}`,
      `${map} [data-part=subject]{font-size:1.125em;line-height:1.35}`,
      `${map} [data-part=note]{line-height:1.6}`
    ].join("\n");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let chosen = props.defaultValue;
    let width = -1;
    let base = 0;
    let shown = "";
    let timer;
    const attrs = hostAttributes(host);
    const sheet = scope(host);
    const emit = emitter(host);
    const root = exhibitEl("div", host, "map");
    const figure = exhibitEl("figure", root, "plan");
    const caption = exhibitEl("figcaption", figure);
    const pre = exhibitEl("pre", figure, "drawing");
    const empty = exhibitEl("p", figure, "empty");
    const list = exhibitEl("ol", root, "rooms");
    const detail = exhibitEl("div", root, "detail");
    pre.setAttribute("aria-hidden", "true");
    detail.setAttribute("aria-live", "polite");
    empty.textContent = "No rooms";
    sheet.setRules(exhibitRules(`${sheet.selector}>[data-part=map]`));
    const current = () => {
      const index = typeof props.value === "number" ? props.value : chosen;
      return Number.isInteger(index) && index >= 0 && index < props.rooms.length ? index : -1;
    };
    function draw() {
      base = parseFloat(getComputedStyle(host).fontSize) || 16;
      width = root.clientWidth;
      root.setAttribute("data-layout", width >= 72 * base ? "wide" : width >= 40 * base ? "split" : "stack");
      const units = props.rooms.map((room) => ({ room, x: exhibitUnit(room.x, 0), y: exhibitUnit(room.y, 0), w: exhibitUnit(room.w, 1), h: exhibitUnit(room.h, 1) }));
      if (units.length === 0) {
        pre.replaceChildren();
        return;
      }
      let cols = exhibitUnit(props.plan?.cols, 1);
      let rows = exhibitUnit(props.plan?.rows, 1);
      for (const u of units) {
        cols = Math.max(cols, u.x + u.w);
        rows = Math.max(rows, u.y + u.h);
      }
      const avail = figure.clientWidth - 1;
      const advance = measureCell(GRID_FONT, base, 1).w / base;
      const fit = (per) => Math.floor(avail / ((per * cols + 1) * advance) * 10) / 10;
      const size = fit(2) >= base ? base : fit(2) >= 10 ? fit(2) : Math.max(10, Math.min(base, fit(1)));
      const lh = exhibitLine(size);
      const cell = measureCell(GRID_FONT, size, lh);
      const rowsFor = (per) => Math.max(1, Math.round(per * cell.w / cell.h));
      const skew = (per) => Math.abs(Math.log(per * cell.w / (rowsFor(per) * cell.h)));
      let sx = Math.max(1, Math.floor((avail / cell.w - 1) / cols + 1e-6));
      if (sx > 2 && skew(sx) > 0.22 && skew(sx - 1) < skew(sx)) sx -= 1;
      const sy = rowsFor(sx);
      const stride = cols * sx + 1;
      const n = stride * (rows * sy + 1);
      const walls = new Uint8Array(n);
      const owner = new Int16Array(n).fill(-1);
      const glyphs = new Array(n).fill(" ");
      const tinted = new Uint8Array(n);
      const join = (at, sides) => {
        walls[at] = (walls[at] ?? 0) | sides;
      };
      const cut = (at, sides) => {
        walls[at] = (walls[at] ?? 0) & ~sides;
      };
      units.forEach(({ x, y, w, h }, i) => {
        for (let r = y * sy; r <= (y + h) * sy; r++) {
          for (let c = x * sx; c <= (x + w) * sx; c++) {
            const at = r * stride + c;
            const across = r === y * sy || r === (y + h) * sy;
            const down = c === x * sx || c === (x + w) * sx;
            if (across) join(at, (c < (x + w) * sx ? 2 : 0) | (c > x * sx ? 8 : 0));
            if (down) join(at, (r < (y + h) * sy ? 4 : 0) | (r > y * sy ? 1 : 0));
            if (!across && !down) owner[at] = i;
          }
        }
      });
      for (const { room, x, y, w, h } of units) {
        for (const door of room.doors ?? []) {
          const across = door.side === "n" || door.side === "s";
          const step = across ? sx : sy;
          const from = exhibitUnit(door.at, 0) * step;
          if (from + step > (across ? w * sx : h * sy)) continue;
          const next = across ? 1 : stride;
          const origin = across ? (door.side === "n" ? y : y + h) * sy * stride + x * sx : y * sy * stride + (door.side === "w" ? x : x + w) * sx;
          for (let k = from; k < from + step; k++) {
            cut(origin + k * next, across ? 2 : 4);
            cut(origin + (k + 1) * next, across ? 8 : 1);
          }
        }
      }
      const index = current();
      const dot = measureRamp("·.", GRID_FONT, lh).glyphs[0] ?? ".";
      units.forEach(({ room, x, y, w, h }, i) => {
        const inner = w * sx - 1;
        const tall = h * sy - 1;
        const number = String(i + 1).padStart(2, "0");
        let lines = exhibitWrap(`${number} ${room.name ?? ""}`, inner - 2);
        if (lines.length + 2 > tall || lines.some((line) => line.length > inner - 2)) lines = tall > 0 && number.length <= inner - 2 ? [number] : [];
        if (i === index) {
          owner.forEach((o, at) => {
            if (o === i && !walls[at]) {
              glyphs[at] = dot;
              tinted[at] = 1;
            }
          });
        }
        const top = y * sy + 1 + (tall - lines.length >> 1);
        lines.forEach((line, k) => {
          const left = x * sx + 1 + (inner - line.length >> 1);
          const lo = left - 1 === x * sx + 2 ? left - 2 : left - 1;
          const hi = left + line.length === (x + w) * sx - 2 ? left + line.length + 1 : left + line.length;
          for (let c = lo; c <= hi; c++) {
            const at = (top + k) * stride + c;
            glyphs[at] = line[c - left] ?? " ";
            tinted[at] = 0;
          }
        });
      });
      const out = document.createDocumentFragment();
      for (let at = 0; at < n; ) {
        if (at > 0 && at % stride === 0) out.append("\n");
        const room = walls[at] ? -1 : owner[at] ?? -1;
        const tone = tinted[at] ?? 0;
        const end = at - at % stride + stride;
        let text = "";
        while (at < end && (walls[at] ? -1 : owner[at] ?? -1) === room && (tinted[at] ?? 0) === tone) {
          text += walls[at] ? EXHIBIT_WALLS[walls[at] ?? 0] ?? "" : glyphs[at] ?? " ";
          at++;
        }
        const run = exhibitEl("span", out);
        run.setAttribute("data-tone", tone ? "accent" : "fg");
        if (room >= 0) run.setAttribute("data-room", String(room));
        run.textContent = text;
      }
      pre.style.cssText = `font-size:${size}px;line-height:${cell.h}px`;
      pre.replaceChildren(out);
    }
    function render() {
      const index = current();
      const room = props.rooms[index];
      const none = props.rooms.length === 0;
      caption.textContent = props.label;
      caption.hidden = !props.label;
      empty.hidden = !none;
      pre.hidden = list.hidden = detail.hidden = none;
      figure.setAttribute("data-selected", String(index));
      list.querySelectorAll("button").forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
      const text = room ? [["subject", room.subject], ["note", room.note], ["access", room.access]] : [];
      if (JSON.stringify(text) !== shown) {
        shown = JSON.stringify(text);
        detail.replaceChildren();
        for (const [part, line] of text) if (line) exhibitEl("p", detail, part).textContent = line;
      }
      draw();
    }
    function buildList() {
      list.replaceChildren();
      props.rooms.forEach((room, i) => {
        const button = exhibitEl("button", exhibitEl("li", list));
        button.type = "button";
        button.setAttribute("data-index", String(i));
        exhibitEl("span", button).textContent = String(i + 1).padStart(2, "0");
        button.append(` ${room.name ?? ""}`);
      });
    }
    function nameRegion() {
      attrs.set("role", props.label ? "region" : null);
      attrs.set("aria-label", props.label || null);
    }
    root.addEventListener("click", (event) => {
      const hit = event.target?.closest?.("[data-room],[data-index]");
      if (!hit) return;
      const index = Number(hit.getAttribute("data-room") ?? hit.getAttribute("data-index"));
      if (typeof props.value !== "number") {
        chosen = index;
        render();
      }
      emit("valueChange", index);
    });
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
      if (root.clientWidth === width && (parseFloat(getComputedStyle(host).fontSize) || 16) === base) return;
      clearTimeout(timer);
      timer = setTimeout(draw);
    }) : null;
    observer?.observe(host);
    document.fonts?.addEventListener("loadingdone", draw);
    nameRegion();
    buildList();
    render();
    attrs.set("data-pica-ready", "true");
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (sameJson(before, props)) return;
        nameRegion();
        if (!sameJson(before.rooms, props.rooms)) buildList();
        render();
      },
      destroy() {
        clearTimeout(timer);
        observer?.disconnect();
        document.fonts?.removeEventListener("loadingdone", draw);
        root.remove();
        sheet.destroy();
        attrs.restore();
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
  var instance = PicaAsciiExhibitionMap.mount(host, take(initial));
  ["valueChange"].forEach(function (name) {
    host.addEventListener("pica:" + name.toLowerCase(), function (event) {
      if (window.parent !== window) window.parent.postMessage({ type: "pica:event", name: name, detail: event.detail }, "*");
    });
  });
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
