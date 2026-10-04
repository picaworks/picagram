# Process map

> A decision flow drawn in box-drawing characters, with native choices that trace the selected route.

Category: ascii. Tags: diagram, flowchart, process, decision, box-drawing. Static. Size: 4.7 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/ascii-process-map.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | string | `"Document intake"` | Names the region and prints as the drawing's caption. Empty leaves out both the caption and the region role. |
| `start` | string | `"Receive submission"` | The entry step, drawn in a light box above the decision. Empty leaves the box out. |
| `decision` | string | `"Can it be reviewed?"` | The question the routes answer, drawn in a double box. Empty leaves the box out. |
| `routes` | { choice: string; steps: string[]; outcome: string }[] | `[{"choice":"Ready for review","steps":["Validate identifiers","Assign an editor","Schedule review"],"outcome":"The document enters the review queue."},{"choice":"Needs information","steps":["List missing fields","Return to contributor","Receive amended record"],"outcome":"The amended record returns to intake."},{"choice":"Out of scope","steps":["Record the reason","Refer to another archive","Close the submission"],"outcome":"The contributor receives a referral."}]` | Each answer with its ordered steps and its outcome. At most four are drawn and listed. |
| `value` | number \| null | `null` | The selected route's index. Null leaves the component uncontrolled, so it keeps its own choice. |
| `defaultValue` | number | `0` | The route selected at mount, read once, while value is null. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `valueChange` | `onValueChange` | `number` | The index of the route chosen, from its button or from its head box in the drawing. |

## Colors

Draws with `--pica-fg`, `--pica-muted`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Process map · ascii-process-map
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

// registry/ascii/ascii-process-map/core.ts
export interface AsciiProcessMapProps {
  /** Names the region and prints as the drawing's caption. Empty leaves out both the caption and the region role. */
  label: string;
  /** The entry step, drawn in a light box above the decision. Empty leaves the box out. */
  start: string;
  /** The question the routes answer, drawn in a double box. Empty leaves the box out. */
  decision: string;
  /** Each answer with its ordered steps and its outcome. At most four are drawn and listed. */
  routes: { choice: string; steps: string[]; outcome: string }[];
  /** The selected route's index. Null leaves the component uncontrolled, so it keeps its own choice. */
  value: number | null;
  /** The route selected at mount, read once, while value is null. */
  defaultValue: number;
}

export interface AsciiProcessMapEvents {
  /** The index of the route chosen, from its button or from its head box in the drawing. */
  valueChange: number;
}

export const defaults: AsciiProcessMapProps = {
  label: "Document intake",
  start: "Receive submission",
  decision: "Can it be reviewed?",
  routes: [
    { choice: "Ready for review", steps: ["Validate identifiers", "Assign an editor", "Schedule review"], outcome: "The document enters the review queue." },
    { choice: "Needs information", steps: ["List missing fields", "Return to contributor", "Receive amended record"], outcome: "The amended record returns to intake." },
    { choice: "Out of scope", steps: ["Record the reason", "Refer to another archive", "Close the submission"], outcome: "The contributor receives a referral." },
  ],
  value: null,
  defaultValue: 0,
};

type ProcessRoute = AsciiProcessMapProps["routes"][number];

/** One cell of the drawing: a glyph set directly, its tone, the light lines that meet in it as bits (up 1,
 *  down 2, left 4, right 8), and the route whose head it belongs to, or -1. */
interface ProcessCell {
  c: string;
  t: string;
  l: number;
  r: number;
}

/** Frame glyphs by weight: four corners, the rule, the side, then the junctions where a light line meets the
 *  top, the bottom, and the left edge. */
const PROCESS_LIGHT = "┌┐└┘─│┴┬┤";
const PROCESS_HEAVY = "┏┓┗┛━┃┷┯┨";
const PROCESS_DOUBLE = "╔╗╚╝═║╧╤╢";
/** The light line through a cell for each set of directions, indexed by ProcessCell.l. */
const PROCESS_LINES = " ╵╷│╴┘┐┤╶└┌├─┴┬┼";

/** Measures glyph ink. Made on first use, because the build imports every core in Node. */
let processInk: CanvasRenderingContext2D | null | undefined;

/** Greedy word wrap that never truncates. A word longer than a line breaks across lines with no ellipsis, and
 *  lines after the first start with `hang`. */
function processWrap(text: string, width: number, hang = ""): string[] {
  const lines: string[] = [];
  let line = "";
  for (let word of text.split(/\s+/).filter(Boolean)) {
    for (;;) {
      const room = Math.max(1, width - (lines.length ? hang.length : 0));
      const next = line ? `${line} ${word}` : word;
      if (next.length <= room) {
        line = next;
        break;
      }
      if (line) lines.push(line);
      else {
        lines.push(word.slice(0, room));
        word = word.slice(room);
      }
      line = "";
    }
  }
  lines.push(line);
  return lines.map((s, i) => (i ? hang + s : s));
}

/** Lays the map out in cells across `cols` columns. Route heads stand side by side under a bus while each box
 *  keeps 20 columns, and otherwise hang from a trunk down the left. Only the selected route draws its steps.
 *  Every rule and frame takes an opaque tone, fg or accent: a translucent tone darkens wherever neighboring
 *  glyphs overlap, which beads a rule at every cell. Muted is kept for the step counts. */
function processLayout(props: AsciiProcessMapProps, sel: number, cols: number): ProcessCell[][] {
  const grid: ProcessCell[][] = [];
  const at = (x: number, y: number): ProcessCell => {
    const row = (grid[y] ??= []);
    return (row[x] ??= { c: " ", t: "", l: 0, r: -1 });
  };
  const put = (x: number, y: number, c: string, t: string, r = -1): void => {
    Object.assign(at(x, y), { c, t, r });
  };
  const write = (x: number, y: number, text: string, t: string, r = -1): void => {
    [...text].forEach((c, i) => put(x + i, y, c, t, r));
  };
  /** Gives a junction on the selected route's line the accent, whichever frame it belongs to. */
  const mark = (x: number, y: number): void => {
    at(x, y).t = "accent";
  };
  /** A straight light line between two cells. A cell that already holds a glyph keeps it, and its tone. */
  const line = (x0: number, y0: number, x1: number, y1: number, t: string): void => {
    const down = x0 === x1;
    const a = down ? Math.min(y0, y1) : Math.min(x0, x1);
    const b = down ? Math.max(y0, y1) : Math.max(x0, x1);
    for (let i = a; a < b && i <= b; i++) {
      const k = down ? at(x0, i) : at(i, y0);
      k.l |= (i > a ? (down ? 1 : 4) : 0) | (i < b ? (down ? 2 : 8) : 0);
      if (k.c === " ") k.t = t;
    }
  };
  /** A framed box of wrapped lines. `legs` adds the junctions where a line enters the top (1), leaves the
   *  bottom (2), or enters the left edge at the first line (4). Returns the bottom row. */
  const box = (x: number, y: number, w: number, lines: string[], f: string, t: string, r: number, legs: number, lx = x + ((w - 1) >> 1)): number => {
    const end = y + lines.length + 1;
    const rule = f.charAt(4).repeat(w - 2);
    write(x, y, f.charAt(0) + rule + f.charAt(1), t, r);
    write(x, end, f.charAt(2) + rule + f.charAt(3), t, r);
    lines.forEach((text, i) => {
      put(x, y + i + 1, f.charAt(legs & 4 && !i ? 8 : 5), t, r);
      write(x + 1, y + i + 1, ` ${text}`.padEnd(w - 2), "fg", r);
      put(x + w - 1, y + i + 1, f.charAt(5), t, r);
    });
    if (legs & 1) put(lx, y, f.charAt(6), t, r);
    if (legs & 2) put(lx, end, f.charAt(7), t, r);
    return end;
  };
  /** The selected route's steps under its head, each joined to the box above, then an arrow into the outcome.
   *  The line and the junctions it passes through take the accent, so it reads as one stroke; frames stay fg. */
  const chain = (x: number, w: number, y: number, item: ProcessRoute): number => {
    const cx = x + ((w - 1) >> 1);
    const outcome = item.outcome.trim();
    item.steps.forEach((step, i) => {
      const top = y + 2;
      const more = Boolean(outcome) || i < item.steps.length - 1;
      line(cx, y, cx, top, "accent");
      y = box(x, top, w, processWrap(step, w - 4), PROCESS_LIGHT, "fg", -1, more ? 3 : 1);
      mark(cx, top);
      if (more) mark(cx, y);
    });
    if (outcome) {
      put(cx, y + 1, "▼", "accent");
      y = box(x, y + 2, w, processWrap(outcome, w - 4), PROCESS_LIGHT, "fg", -1, 0);
    }
    return y;
  };

  const routes = props.routes.slice(0, 4);
  const n = routes.length;
  const trunk = ([[props.start, PROCESS_LIGHT], [props.decision, PROCESS_DOUBLE]] as [string, string][]).filter(([text]) => text.trim());
  const heads = routes.map((item, i) => `${String(i + 1).padStart(2, "0")} ${item.choice}`);
  const texts = [...trunk.map(([text]) => text), ...heads, ...routes.flatMap((item) => [...item.steps, item.outcome])];
  const per = n ? Math.floor((cols - 2 * (n - 1)) / n) : cols;
  const wide = n < 2 || per >= 20;
  const w = wide ? Math.min(28, per, Math.max(20, ...texts.map((text) => text.length + 4))) : Math.min(cols, 44) - 4;
  const h = (w - 1) >> 1;
  const colX = (i: number): number => (wide ? i * (w + 2) : 4);
  const mid = wide ? h + ((Math.max(0, n - 1) * (w + 2)) >> 1) : 2;
  const tw = wide ? w : w + 4;
  const count = (item: ProcessRoute): string => `${item.steps.length} step${item.steps.length === 1 ? "" : "s"}`;
  const exit = (item: ProcessRoute, on: boolean): number => (on && (item.steps.length || item.outcome.trim()) ? 2 : 0);
  let y = -1;
  trunk.forEach(([text, f], i) => {
    const ty = y + (i ? 2 : 1);
    if (i) line(mid, y, mid, ty, "fg");
    y = box(mid - (wide ? h : 2), ty, tw, processWrap(text, tw - 4), f, "fg", -1, (i ? 1 : 0) | (n || i < trunk.length - 1 ? 2 : 0), mid);
  });
  if (n && trunk.length) mark(mid, y);
  if (!n) write(2, trunk.length ? y + 2 : 0, "No routes", "muted");
  const labels = heads.map((text) => processWrap(text, w - 4, "   "));
  const top = trunk.length ? y + (wide ? (n > 1 ? 4 : 2) : 1) : 0;
  if (wide) {
    const cs = colX(sel) + h;
    const tall = Math.max(1, ...labels.map((text) => text.length));
    if (trunk.length && n > 1) {
      const bus = y + 2;
      line(h, bus, colX(n - 1) + h, bus, "fg");
      routes.forEach((_, i) => line(colX(i) + h, bus, colX(i) + h, top, "fg"));
      line(mid, bus, cs, bus, "accent");
      line(cs, bus, cs, top, "accent");
      line(mid, y, mid, bus, "accent");
    } else if (trunk.length && n) line(mid, y, mid, top, "accent");
    routes.forEach((item, i) => {
      const on = i === sel;
      const text = labels[i] ?? [];
      while (text.length < tall) text.push("");
      const end = box(colX(i), top, w, text, on ? PROCESS_HEAVY : PROCESS_LIGHT, on ? "accent" : "fg", i, (trunk.length ? 1 : 0) | exit(item, on));
      if (on) chain(colX(i), w, end, item);
      else write(colX(i) + ((w - count(item).length) >> 1), end + 1, count(item), "muted", i);
    });
  } else {
    let pick = 0;
    let last = 0;
    y = top - 1;
    routes.forEach((item, i) => {
      const on = i === sel;
      const end = box(4, y + 1, w, labels[i] ?? [], on ? PROCESS_HEAVY : PROCESS_LIGHT, on ? "accent" : "fg", i, 4 | exit(item, on));
      last = y + 2;
      if (on) pick = last;
      line(2, last, 4, last, "fg");
      if (on) y = chain(4, w, end, item) + (i < n - 1 ? 1 : 0);
      else {
        write(6, end + 1, count(item), "muted", i);
        y = end + 1;
      }
    });
    if (n) {
      const first = trunk.length ? top - 1 : top + 1;
      line(2, first, 2, last, "fg");
      line(2, first, 2, pick, "accent");
      line(2, pick, 4, pick, "accent");
    }
  }
  return grid;
}

export const mount: Mount<AsciiProcessMapProps> = (host, initial = {}) => {
  let props: AsciiProcessMapProps = { ...defaults, ...initial };
  let internal = props.defaultValue;
  let cols = 0;
  let rowPx = 0;
  let metrics = "";
  let listed = "";
  let pending: ReturnType<typeof setTimeout> | undefined;
  let buttons: HTMLButtonElement[] = [];
  const emit = emitter<AsciiProcessMapEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const s = sheet.selector;
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  sheet.setRules(
    [
      `:where(${s}){display:block;box-sizing:border-box;padding:clamp(1rem,3%,2.5rem);color:${fg}}`,
      `${s} [data-part=diagram]{margin:0}`,
      `${s} [data-part=drawing]{margin:0;font:400 1em/1.2 ${GRID_FONT};letter-spacing:0;word-spacing:0;font-kerning:none;font-variant-ligatures:none;text-transform:none;text-align:left;text-indent:0;direction:ltr;white-space:pre}`,
      `${s} [data-tone=muted]{color:${muted}}`,
      `${s} [data-tone=accent]{color:${accent}}`,
      `${s} [data-route-index]{cursor:pointer}`,
      `${s} [data-part=caption]{margin-top:.75em;color:${muted};font-size:.875em}`,
      `${s} [data-part=choices]{display:flex;flex-wrap:wrap;gap:.5em;margin-top:1.25em}`,
      `${s} [data-part=choices]:empty{display:none}`,
      `${s} [data-index]{box-sizing:border-box;min-width:44px;min-height:44px;max-width:100%;margin:0;padding:.5em .9em;border:1px solid ${muted};border-radius:0;background:none;color:inherit;font:inherit;line-height:1.3;text-align:left;cursor:pointer}`,
      `${s} [data-index]:hover{background:color-mix(in srgb,${fg} 10%,transparent)}`,
      `${s} [data-index][aria-pressed=true]{border-color:${fg};box-shadow:inset 0 -2px ${accent}}`,
      `${s} [data-index]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
      `${s} [data-part=index]{font-family:${GRID_FONT};font-size:.875em;color:${muted}}`,
      `${s} [data-part=route]{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}`,
    ].join("\n"),
  );

  function make<K extends keyof HTMLElementTagNameMap>(tag: K, part = "", parent?: Node): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    if (part) node.setAttribute("data-part", part);
    parent?.appendChild(node);
    return node;
  }

  const figure = make("figure", "diagram", host);
  const pre = make("pre", "drawing", figure);
  const caption = make("figcaption", "caption");
  const choices = make("div", "choices", host);
  const route = make("div", "route", host);
  pre.setAttribute("aria-hidden", "true");
  choices.setAttribute("role", "group");
  route.setAttribute("aria-live", "polite");

  const selected = (): number => Math.min(Math.min(4, props.routes.length) - 1, Math.max(0, (props.value ?? internal) | 0));

  function choose(index: number): void {
    if (props.value === null) {
      internal = index;
      sync();
    }
    emit("valueChange", index);
  }

  function build(): void {
    buttons = props.routes.slice(0, 4).map((item, i) => {
      const button = make("button");
      button.type = "button";
      button.setAttribute("data-index", String(i));
      make("span", "index", button).textContent = String(i + 1).padStart(2, "0");
      button.append(` ${item.choice}`);
      button.addEventListener("click", () => choose(i));
      return button;
    });
    choices.replaceChildren(...buttons);
  }

  /** Takes the glyph size from the host and the cell from the font. A row is the measured ink of a vertical rule,
   *  rounded down to whole pixels with a quarter pixel to spare, so vertical runs overlap and never part.
   *  Reports whether anything the drawing depends on changed. */
  function measure(): boolean {
    const size = parseFloat(getComputedStyle(host).fontSize) || 16;
    if (processInk === undefined) processInk = document.createElement("canvas").getContext("2d");
    let lh = 1.2;
    if (processInk) {
      processInk.font = `${size}px ${GRID_FONT}`;
      const bar = processInk.measureText("│");
      lh = Math.min(1.25, Math.max(1, Math.floor(bar.actualBoundingBoxAscent + bar.actualBoundingBoxDescent - 0.25) / size));
    }
    const cell = measureCell(GRID_FONT, size, lh);
    const next = Math.max(12, Math.floor(figure.clientWidth / cell.w));
    const key = `${size} ${cell.w} ${cell.h} ${next}`;
    if (key === metrics) return false;
    metrics = key;
    cols = next;
    rowPx = cell.h;
    pre.style.fontSize = `${size}px`;
    pre.style.lineHeight = `${cell.h}px`;
    return true;
  }

  /** Paints the cell buffer as text runs, one span per stretch of cells that share a tone and a route. */
  function draw(): void {
    const index = selected();
    const grids = props.routes.slice(0, 4).map((_, i) => processLayout(props, i, cols));
    const grid = grids[index] ?? processLayout(props, index, cols);
    // Every route reserves the tallest drawing, so choosing one never moves the controls below it.
    pre.style.minHeight = `${Math.max(grid.length, ...grids.map((rows) => rows.length)) * rowPx}px`;
    const frag = document.createDocumentFragment();
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y] ?? [];
      for (let x = 0; x < row.length; ) {
        const tone = row[x]?.t ?? "";
        const owner = row[x]?.r ?? -1;
        let text = "";
        while (x < row.length && (row[x]?.t ?? "") === tone && (row[x]?.r ?? -1) === owner) {
          const k = row[x++];
          text += !k ? " " : k.c !== " " ? k.c : PROCESS_LINES.charAt(k.l);
        }
        if (!tone) frag.append(text);
        else {
          const span = make("span", "", frag);
          span.setAttribute("data-tone", tone);
          if (owner >= 0) span.setAttribute("data-route-index", String(owner));
          span.textContent = text;
        }
      }
      if (y < grid.length - 1) frag.append("\n");
    }
    pre.replaceChildren(frag);
  }

  /** Applies the props and the selection: the host's name, the caption, the pressed choice, the route that
   *  assistive technology reads, and the drawing. */
  function sync(): void {
    const label = props.label.trim();
    const decision = props.decision.trim();
    const index = selected();
    const item = props.routes[index];
    attrs.set("role", label ? "region" : null);
    attrs.set("aria-label", label || null);
    caption.textContent = label;
    if (label) figure.append(caption);
    else caption.remove();
    if (decision) choices.setAttribute("aria-label", decision);
    else choices.removeAttribute("aria-label");
    buttons.forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
    if (item) figure.setAttribute("data-selected", String(index));
    else figure.removeAttribute("data-selected");
    const steps = item ? [props.start, ...item.steps].filter((text) => text.trim()) : [];
    const end = item ? item.outcome.trim() : "No routes";
    const key = JSON.stringify([steps, end]);
    if (key !== listed) {
      listed = key;
      const list = make("ol");
      for (const text of steps) make("li", "", list).textContent = text;
      const outcome = make("p");
      outcome.textContent = end;
      route.replaceChildren(...(steps.length ? [list] : []), ...(end ? [outcome] : []));
    }
    draw();
    attrs.set("data-pica-ready", "true");
  }

  const relayout = (): void => {
    if (measure()) draw();
  };
  // A redraw changes the host's height, so it runs in a task of its own rather than inside the observer's
  // callback, where the new height would leave a notification undelivered.
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    clearTimeout(pending);
    pending = setTimeout(relayout);
  }) : null;
  pre.addEventListener("click", (event) => {
    const hit = (event.target as Element).closest("[data-route-index]");
    if (hit && pre.contains(hit)) choose(Number(hit.getAttribute("data-route-index")));
  });
  build();
  measure();
  sync();
  observer?.observe(host);
  document.fonts.addEventListener("loadingdone", relayout);

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (sameJson(before, props)) return;
      if (!sameJson(before.routes, props.routes)) build();
      measure();
      sync();
    },
    destroy() {
      clearTimeout(pending);
      observer?.disconnect();
      document.fonts.removeEventListener("loadingdone", relayout);
      figure.remove();
      choices.remove();
      route.remove();
      sheet.destroy();
      attrs.restore();
    },
  };
};

// registry/ascii/ascii-process-map/index.tsx
export type AsciiProcessMapComponentProps = Partial<AsciiProcessMapProps> & Handlers<AsciiProcessMapEvents> & WrapperProps;

/** A decision flow drawn in box-drawing characters, with native choices that trace the selected route. */
export function AsciiProcessMap({ className, style, palette, ...props }: AsciiProcessMapComponentProps) {
  const ref = usePica<AsciiProcessMapProps>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Process map · ascii-process-map
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en" data-stage="flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Process map · Pica</title>
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
var PicaAsciiProcessMap = (() => {
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

  // registry/ascii/ascii-process-map/core.ts
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

  // registry/ascii/ascii-process-map/core.ts
  var defaults = {
    label: "Document intake",
    start: "Receive submission",
    decision: "Can it be reviewed?",
    routes: [
      { choice: "Ready for review", steps: ["Validate identifiers", "Assign an editor", "Schedule review"], outcome: "The document enters the review queue." },
      { choice: "Needs information", steps: ["List missing fields", "Return to contributor", "Receive amended record"], outcome: "The amended record returns to intake." },
      { choice: "Out of scope", steps: ["Record the reason", "Refer to another archive", "Close the submission"], outcome: "The contributor receives a referral." }
    ],
    value: null,
    defaultValue: 0
  };
  var PROCESS_LIGHT = "┌┐└┘─│┴┬┤";
  var PROCESS_HEAVY = "┏┓┗┛━┃┷┯┨";
  var PROCESS_DOUBLE = "╔╗╚╝═║╧╤╢";
  var PROCESS_LINES = " ╵╷│╴┘┐┤╶└┌├─┴┬┼";
  var processInk;
  function processWrap(text, width, hang = "") {
    const lines = [];
    let line = "";
    for (let word of text.split(/\s+/).filter(Boolean)) {
      for (; ; ) {
        const room = Math.max(1, width - (lines.length ? hang.length : 0));
        const next = line ? `${line} ${word}` : word;
        if (next.length <= room) {
          line = next;
          break;
        }
        if (line) lines.push(line);
        else {
          lines.push(word.slice(0, room));
          word = word.slice(room);
        }
        line = "";
      }
    }
    lines.push(line);
    return lines.map((s, i) => i ? hang + s : s);
  }
  function processLayout(props, sel, cols) {
    const grid = [];
    const at = (x, y2) => {
      const row = grid[y2] ?? (grid[y2] = []);
      return row[x] ?? (row[x] = { c: " ", t: "", l: 0, r: -1 });
    };
    const put = (x, y2, c, t, r = -1) => {
      Object.assign(at(x, y2), { c, t, r });
    };
    const write = (x, y2, text, t, r = -1) => {
      [...text].forEach((c, i) => put(x + i, y2, c, t, r));
    };
    const mark = (x, y2) => {
      at(x, y2).t = "accent";
    };
    const line = (x0, y0, x1, y1, t) => {
      const down = x0 === x1;
      const a = down ? Math.min(y0, y1) : Math.min(x0, x1);
      const b = down ? Math.max(y0, y1) : Math.max(x0, x1);
      for (let i = a; a < b && i <= b; i++) {
        const k = down ? at(x0, i) : at(i, y0);
        k.l |= (i > a ? down ? 1 : 4 : 0) | (i < b ? down ? 2 : 8 : 0);
        if (k.c === " ") k.t = t;
      }
    };
    const box = (x, y2, w2, lines, f, t, r, legs, lx = x + (w2 - 1 >> 1)) => {
      const end = y2 + lines.length + 1;
      const rule = f.charAt(4).repeat(w2 - 2);
      write(x, y2, f.charAt(0) + rule + f.charAt(1), t, r);
      write(x, end, f.charAt(2) + rule + f.charAt(3), t, r);
      lines.forEach((text, i) => {
        put(x, y2 + i + 1, f.charAt(legs & 4 && !i ? 8 : 5), t, r);
        write(x + 1, y2 + i + 1, ` ${text}`.padEnd(w2 - 2), "fg", r);
        put(x + w2 - 1, y2 + i + 1, f.charAt(5), t, r);
      });
      if (legs & 1) put(lx, y2, f.charAt(6), t, r);
      if (legs & 2) put(lx, end, f.charAt(7), t, r);
      return end;
    };
    const chain = (x, w2, y2, item) => {
      const cx = x + (w2 - 1 >> 1);
      const outcome = item.outcome.trim();
      item.steps.forEach((step, i) => {
        const top2 = y2 + 2;
        const more = Boolean(outcome) || i < item.steps.length - 1;
        line(cx, y2, cx, top2, "accent");
        y2 = box(x, top2, w2, processWrap(step, w2 - 4), PROCESS_LIGHT, "fg", -1, more ? 3 : 1);
        mark(cx, top2);
        if (more) mark(cx, y2);
      });
      if (outcome) {
        put(cx, y2 + 1, "▼", "accent");
        y2 = box(x, y2 + 2, w2, processWrap(outcome, w2 - 4), PROCESS_LIGHT, "fg", -1, 0);
      }
      return y2;
    };
    const routes = props.routes.slice(0, 4);
    const n = routes.length;
    const trunk = [[props.start, PROCESS_LIGHT], [props.decision, PROCESS_DOUBLE]].filter(([text]) => text.trim());
    const heads = routes.map((item, i) => `${String(i + 1).padStart(2, "0")} ${item.choice}`);
    const texts = [...trunk.map(([text]) => text), ...heads, ...routes.flatMap((item) => [...item.steps, item.outcome])];
    const per = n ? Math.floor((cols - 2 * (n - 1)) / n) : cols;
    const wide = n < 2 || per >= 20;
    const w = wide ? Math.min(28, per, Math.max(20, ...texts.map((text) => text.length + 4))) : Math.min(cols, 44) - 4;
    const h = w - 1 >> 1;
    const colX = (i) => wide ? i * (w + 2) : 4;
    const mid = wide ? h + (Math.max(0, n - 1) * (w + 2) >> 1) : 2;
    const tw = wide ? w : w + 4;
    const count = (item) => `${item.steps.length} step${item.steps.length === 1 ? "" : "s"}`;
    const exit = (item, on) => on && (item.steps.length || item.outcome.trim()) ? 2 : 0;
    let y = -1;
    trunk.forEach(([text, f], i) => {
      const ty = y + (i ? 2 : 1);
      if (i) line(mid, y, mid, ty, "fg");
      y = box(mid - (wide ? h : 2), ty, tw, processWrap(text, tw - 4), f, "fg", -1, (i ? 1 : 0) | (n || i < trunk.length - 1 ? 2 : 0), mid);
    });
    if (n && trunk.length) mark(mid, y);
    if (!n) write(2, trunk.length ? y + 2 : 0, "No routes", "muted");
    const labels = heads.map((text) => processWrap(text, w - 4, "   "));
    const top = trunk.length ? y + (wide ? n > 1 ? 4 : 2 : 1) : 0;
    if (wide) {
      const cs = colX(sel) + h;
      const tall = Math.max(1, ...labels.map((text) => text.length));
      if (trunk.length && n > 1) {
        const bus = y + 2;
        line(h, bus, colX(n - 1) + h, bus, "fg");
        routes.forEach((_, i) => line(colX(i) + h, bus, colX(i) + h, top, "fg"));
        line(mid, bus, cs, bus, "accent");
        line(cs, bus, cs, top, "accent");
        line(mid, y, mid, bus, "accent");
      } else if (trunk.length && n) line(mid, y, mid, top, "accent");
      routes.forEach((item, i) => {
        const on = i === sel;
        const text = labels[i] ?? [];
        while (text.length < tall) text.push("");
        const end = box(colX(i), top, w, text, on ? PROCESS_HEAVY : PROCESS_LIGHT, on ? "accent" : "fg", i, (trunk.length ? 1 : 0) | exit(item, on));
        if (on) chain(colX(i), w, end, item);
        else write(colX(i) + (w - count(item).length >> 1), end + 1, count(item), "muted", i);
      });
    } else {
      let pick = 0;
      let last = 0;
      y = top - 1;
      routes.forEach((item, i) => {
        const on = i === sel;
        const end = box(4, y + 1, w, labels[i] ?? [], on ? PROCESS_HEAVY : PROCESS_LIGHT, on ? "accent" : "fg", i, 4 | exit(item, on));
        last = y + 2;
        if (on) pick = last;
        line(2, last, 4, last, "fg");
        if (on) y = chain(4, w, end, item) + (i < n - 1 ? 1 : 0);
        else {
          write(6, end + 1, count(item), "muted", i);
          y = end + 1;
        }
      });
      if (n) {
        const first = trunk.length ? top - 1 : top + 1;
        line(2, first, 2, last, "fg");
        line(2, first, 2, pick, "accent");
        line(2, pick, 4, pick, "accent");
      }
    }
    return grid;
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let internal = props.defaultValue;
    let cols = 0;
    let rowPx = 0;
    let metrics = "";
    let listed = "";
    let pending;
    let buttons = [];
    const emit = emitter(host);
    const attrs = hostAttributes(host);
    const sheet = scope(host);
    const s = sheet.selector;
    const fg = cssVar("fg");
    const muted = cssVar("muted");
    const accent = cssVar("accent");
    sheet.setRules(
      [
        `:where(${s}){display:block;box-sizing:border-box;padding:clamp(1rem,3%,2.5rem);color:${fg}}`,
        `${s} [data-part=diagram]{margin:0}`,
        `${s} [data-part=drawing]{margin:0;font:400 1em/1.2 ${GRID_FONT};letter-spacing:0;word-spacing:0;font-kerning:none;font-variant-ligatures:none;text-transform:none;text-align:left;text-indent:0;direction:ltr;white-space:pre}`,
        `${s} [data-tone=muted]{color:${muted}}`,
        `${s} [data-tone=accent]{color:${accent}}`,
        `${s} [data-route-index]{cursor:pointer}`,
        `${s} [data-part=caption]{margin-top:.75em;color:${muted};font-size:.875em}`,
        `${s} [data-part=choices]{display:flex;flex-wrap:wrap;gap:.5em;margin-top:1.25em}`,
        `${s} [data-part=choices]:empty{display:none}`,
        `${s} [data-index]{box-sizing:border-box;min-width:44px;min-height:44px;max-width:100%;margin:0;padding:.5em .9em;border:1px solid ${muted};border-radius:0;background:none;color:inherit;font:inherit;line-height:1.3;text-align:left;cursor:pointer}`,
        `${s} [data-index]:hover{background:color-mix(in srgb,${fg} 10%,transparent)}`,
        `${s} [data-index][aria-pressed=true]{border-color:${fg};box-shadow:inset 0 -2px ${accent}}`,
        `${s} [data-index]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
        `${s} [data-part=index]{font-family:${GRID_FONT};font-size:.875em;color:${muted}}`,
        `${s} [data-part=route]{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}`
      ].join("\n")
    );
    function make(tag, part = "", parent) {
      const node = document.createElement(tag);
      node.setAttribute("data-pica", "");
      if (part) node.setAttribute("data-part", part);
      parent?.appendChild(node);
      return node;
    }
    const figure = make("figure", "diagram", host);
    const pre = make("pre", "drawing", figure);
    const caption = make("figcaption", "caption");
    const choices = make("div", "choices", host);
    const route = make("div", "route", host);
    pre.setAttribute("aria-hidden", "true");
    choices.setAttribute("role", "group");
    route.setAttribute("aria-live", "polite");
    const selected = () => Math.min(Math.min(4, props.routes.length) - 1, Math.max(0, (props.value ?? internal) | 0));
    function choose(index) {
      if (props.value === null) {
        internal = index;
        sync();
      }
      emit("valueChange", index);
    }
    function build() {
      buttons = props.routes.slice(0, 4).map((item, i) => {
        const button = make("button");
        button.type = "button";
        button.setAttribute("data-index", String(i));
        make("span", "index", button).textContent = String(i + 1).padStart(2, "0");
        button.append(` ${item.choice}`);
        button.addEventListener("click", () => choose(i));
        return button;
      });
      choices.replaceChildren(...buttons);
    }
    function measure() {
      const size = parseFloat(getComputedStyle(host).fontSize) || 16;
      if (processInk === void 0) processInk = document.createElement("canvas").getContext("2d");
      let lh = 1.2;
      if (processInk) {
        processInk.font = `${size}px ${GRID_FONT}`;
        const bar = processInk.measureText("│");
        lh = Math.min(1.25, Math.max(1, Math.floor(bar.actualBoundingBoxAscent + bar.actualBoundingBoxDescent - 0.25) / size));
      }
      const cell = measureCell(GRID_FONT, size, lh);
      const next = Math.max(12, Math.floor(figure.clientWidth / cell.w));
      const key = `${size} ${cell.w} ${cell.h} ${next}`;
      if (key === metrics) return false;
      metrics = key;
      cols = next;
      rowPx = cell.h;
      pre.style.fontSize = `${size}px`;
      pre.style.lineHeight = `${cell.h}px`;
      return true;
    }
    function draw() {
      const index = selected();
      const grids = props.routes.slice(0, 4).map((_, i) => processLayout(props, i, cols));
      const grid = grids[index] ?? processLayout(props, index, cols);
      pre.style.minHeight = `${Math.max(grid.length, ...grids.map((rows) => rows.length)) * rowPx}px`;
      const frag = document.createDocumentFragment();
      for (let y = 0; y < grid.length; y++) {
        const row = grid[y] ?? [];
        for (let x = 0; x < row.length; ) {
          const tone = row[x]?.t ?? "";
          const owner = row[x]?.r ?? -1;
          let text = "";
          while (x < row.length && (row[x]?.t ?? "") === tone && (row[x]?.r ?? -1) === owner) {
            const k = row[x++];
            text += !k ? " " : k.c !== " " ? k.c : PROCESS_LINES.charAt(k.l);
          }
          if (!tone) frag.append(text);
          else {
            const span = make("span", "", frag);
            span.setAttribute("data-tone", tone);
            if (owner >= 0) span.setAttribute("data-route-index", String(owner));
            span.textContent = text;
          }
        }
        if (y < grid.length - 1) frag.append("\n");
      }
      pre.replaceChildren(frag);
    }
    function sync() {
      const label = props.label.trim();
      const decision = props.decision.trim();
      const index = selected();
      const item = props.routes[index];
      attrs.set("role", label ? "region" : null);
      attrs.set("aria-label", label || null);
      caption.textContent = label;
      if (label) figure.append(caption);
      else caption.remove();
      if (decision) choices.setAttribute("aria-label", decision);
      else choices.removeAttribute("aria-label");
      buttons.forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
      if (item) figure.setAttribute("data-selected", String(index));
      else figure.removeAttribute("data-selected");
      const steps = item ? [props.start, ...item.steps].filter((text) => text.trim()) : [];
      const end = item ? item.outcome.trim() : "No routes";
      const key = JSON.stringify([steps, end]);
      if (key !== listed) {
        listed = key;
        const list = make("ol");
        for (const text of steps) make("li", "", list).textContent = text;
        const outcome = make("p");
        outcome.textContent = end;
        route.replaceChildren(...steps.length ? [list] : [], ...end ? [outcome] : []);
      }
      draw();
      attrs.set("data-pica-ready", "true");
    }
    const relayout = () => {
      if (measure()) draw();
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
      clearTimeout(pending);
      pending = setTimeout(relayout);
    }) : null;
    pre.addEventListener("click", (event) => {
      const hit = event.target.closest("[data-route-index]");
      if (hit && pre.contains(hit)) choose(Number(hit.getAttribute("data-route-index")));
    });
    build();
    measure();
    sync();
    observer?.observe(host);
    document.fonts.addEventListener("loadingdone", relayout);
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        if (sameJson(before, props)) return;
        if (!sameJson(before.routes, props.routes)) build();
        measure();
        sync();
      },
      destroy() {
        clearTimeout(pending);
        observer?.disconnect();
        document.fonts.removeEventListener("loadingdone", relayout);
        figure.remove();
        choices.remove();
        route.remove();
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
  var instance = PicaAsciiProcessMap.mount(host, take(initial));
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
