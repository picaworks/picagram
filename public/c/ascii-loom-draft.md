# Loom draft

> A weaving draft in glyphs, where toggling a tie-up cell redraws the crossings of its woven repeat.

Category: ascii. Tags: weaving, draft, tie-up, drawdown, editable grid, twill. Static. Size: 4.4 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/ascii-loom-draft.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | string | `"Weaving draft"` | Names the draft for assistive technology. Empty leaves the group unnamed. |
| `draft` | { threading: number[]; treadling: number[] } | `{"threading":[1,2,3,4,4,3,2,1],"treadling":[1,2,3,4,4,3,2,1]}` | The shaft each warp thread passes through, left to right, and the treadle each weft pick presses, top to bottom. Both count from 1 and run to 16 long. |
| `value` | string[] \| null | `null` | The tie-up: one string per shaft, starting at shaft 1, with a 1 wherever a treadle lifts that shaft. Up to 8 by 8. Null leaves it uncontrolled, so it keeps its own edits. |
| `defaultValue` | string[] | `["1001","1100","0110","0011"]` | The tie-up at mount, read once, while value is null. |

## Events

Each event is a CustomEvent on the host named `pica:` plus the event name in lower case. It does not bubble. In React, pass the matching `on` prop.

| Event | React prop | Detail | Description |
|---|---|---|---|
| `valueChange` | `onValueChange` | `string[]` | The whole tie-up after a cell is toggled, from its button. |

## Colors

Draws with `--pica-fg`, `--pica-muted`, `--pica-accent`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Loom draft · ascii-loom-draft
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

// registry/ascii/ascii-loom-draft/core.ts
export interface AsciiLoomDraftProps {
  /** Names the draft for assistive technology. Empty leaves the group unnamed. */
  label: string;
  /** The shaft each warp thread passes through, left to right, and the treadle each weft pick presses, top to bottom. Both count from 1 and run to 16 long. */
  draft: { threading: number[]; treadling: number[] };
  /** The tie-up: one string per shaft, starting at shaft 1, with a 1 wherever a treadle lifts that shaft. Up to 8 by 8. Null leaves it uncontrolled, so it keeps its own edits. */
  value: string[] | null;
  /** The tie-up at mount, read once, while value is null. */
  defaultValue: string[];
}

export interface AsciiLoomDraftEvents {
  /** The whole tie-up after a cell is toggled, from its button. */
  valueChange: string[];
}

export const defaults: AsciiLoomDraftProps = {
  label: "Weaving draft",
  draft: { threading: [1, 2, 3, 4, 4, 3, 2, 1], treadling: [1, 2, 3, 4, 4, 3, 2, 1] },
  value: null,
  defaultValue: ["1001", "1100", "0110", "0011"],
};

/** Most shafts, treadles, threads, and picks drawn. */
const LOOM_TIES = 8;
const LOOM_REPEAT = 16;
/** One draft cell is two glyphs wide and one row tall, which makes it square at this line height. */
const LOOM_LINE = 1.2;
/** How far past the host's own font size the drawing may grow when the host has room. */
const LOOM_GROW = 1.75;

/** What the drawing needs, made safe to draw: the tie-up padded square, every thread and pick pointing at a
 *  shaft or treadle that exists, and the weave, true where a warp thread lies over a weft pick. `wide` and
 *  `tall` are the glyph columns and rows it takes, with a margin of one on every side. */
function loomModel(props: AsciiLoomDraftProps, tied: readonly string[]) {
  const given = tied.slice(0, LOOM_TIES).map(String);
  const source = given.length ? given : defaults.defaultValue;
  const treadles = Math.min(LOOM_TIES, Math.max(1, ...source.map((row) => row.length)));
  const tie = source.map((row) => row.replace(/[^1]/g, "0").padEnd(treadles, "0").slice(0, treadles));
  const on = (shaft: number, treadle: number): boolean => tie[shaft - 1]?.charAt(treadle - 1) === "1";
  const pick = (list: unknown, count: number): number[] =>
    (Array.isArray(list) ? list : []).slice(0, LOOM_REPEAT).map((n) => Math.min(count, Math.max(1, Math.round(Number(n)) || 1)));
  const threading = pick(props.draft?.threading ?? defaults.draft.threading, tie.length);
  const treadling = pick(props.draft?.treadling ?? defaults.draft.treadling, treadles);
  const weave = treadling.map((t) => threading.map((s) => on(s, t)));
  return { tie, on, threading, treadling, weave, shafts: tie.length, treadles, wide: 2 * (threading.length + treadles) + 5, tall: tie.length + treadling.length + 3 };
}

export const mount: Mount<AsciiLoomDraftProps> = (host, initial = {}) => {
  let props: AsciiLoomDraftProps = { ...defaults, ...initial };
  let internal = props.defaultValue;
  let buttons: HTMLButtonElement[] = [];
  let shape = "";
  let ruled = "";
  let heard = "";
  const emit = emitter<AsciiLoomDraftEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const s = sheet.selector;
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const cells = document.createElement("div");
  const status = hiddenText("");
  cells.setAttribute("data-pica", "");
  cells.setAttribute("data-part", "cells");
  status.setAttribute("data-pica", "");
  status.setAttribute("aria-live", "polite");

  const model = () => loomModel(props, props.value ?? internal);

  /** The scoped rules. A host with no height of its own takes the drawing's proportions. */
  function rules(wide: number, tall: number): void {
    const css = [
      `:where(${s}){aspect-ratio:${(wide * 0.6).toFixed(1)}/${(tall * LOOM_LINE).toFixed(1)}}`,
      `${s} [data-part=cells]{position:absolute;inset:0;z-index:1;pointer-events:none}`,
      `${s} [data-cell]{position:absolute;box-sizing:border-box;margin:0;padding:0;border:0;border-radius:0;background:none;pointer-events:auto;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}`,
      `${s} [data-cell]:hover{background:color-mix(in srgb,${fg} 10%,transparent)}`,
      `${s} [data-cell]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    ].join("\n");
    if (css === ruled) return;
    ruled = css;
    sheet.setRules(css);
  }

  /** The glyph size that fits the whole drawing in the host, and never exceeds LOOM_GROW times the host's own. */
  function fitSize(): number {
    const { wide, tall } = model();
    const base = parseFloat(getComputedStyle(host).fontSize) || 16;
    const advance = measureCell(GRID_FONT, 100, LOOM_LINE).w / 100;
    return Math.max(6, Math.min(base * LOOM_GROW, host.clientWidth / (wide * advance), Math.floor(host.clientHeight / tall) / LOOM_LINE));
  }

  rules(model().wide, model().tall);
  let size = fitSize();
  const plane = (color: string) =>
    createGrid(host, { fontFamily: GRID_FONT, fontSize: size, columns: 0, lineHeight: LOOM_LINE, renderer: "dom", color }, relayout);
  // Three planes share one cell grid, each in one palette color: ink for the thread marks and the weave, muted
  // for the empty cells and the numbers, and the accent for the tie-up cells that are on.
  const ink = plane("");
  const dim = plane(cssVar("muted"));
  const mark = plane(accent);
  const planes = [ink, dim, mark];
  host.append(cells, status);

  function relayout(): void {
    const next = fitSize();
    if (next === size) return draw();
    size = next;
    for (const grid of planes) grid.update({ fontSize: size });
  }

  function toggle(shaft: number, treadle: number): void {
    const next = model().tie.map((row, i) =>
      i === shaft - 1 ? `${row.slice(0, treadle - 1)}${row.charAt(treadle - 1) === "1" ? "0" : "1"}${row.slice(treadle)}` : row,
    );
    if (props.value === null) {
      internal = next;
      draw();
    }
    emit("valueChange", next);
  }

  /** Tab stops once on the tie-up, and the arrow keys move between its cells. */
  function rove(index: number): void {
    buttons.forEach((button, i) => {
      button.tabIndex = i === index ? 0 : -1;
    });
  }

  /** A button for every tie-up cell, the highest shaft first, laid over the glyphs that draw it. */
  function build(shafts: number, treadles: number): void {
    buttons = Array.from({ length: shafts * treadles }, (_, i) => {
      const shaft = shafts - Math.floor(i / treadles);
      const treadle = (i % treadles) + 1;
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-pica", "");
      button.setAttribute("data-cell", `${shaft},${treadle}`);
      button.setAttribute("aria-label", `Shaft ${shaft}, treadle ${treadle}`);
      button.addEventListener("click", () => toggle(shaft, treadle));
      button.addEventListener("focus", () => rove(i));
      button.addEventListener("keydown", (event) => {
        const dx = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        const dy = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
        if (!dx && !dy) return;
        event.preventDefault();
        const x = (i % treadles) + dx;
        const y = Math.floor(i / treadles) + dy;
        if (x >= 0 && x < treadles && y >= 0 && y < shafts) buttons[y * treadles + x]?.focus();
      });
      return button;
    });
    cells.replaceChildren(...buttons);
    rove(0);
  }

  function draw(): void {
    const m = model();
    const { shafts, treadles, threading, treadling } = m;
    const x0 = Math.max(0, (ink.cols - m.wide) >> 1) + 1;
    const y0 = Math.max(0, (ink.rows - m.tall) >> 1) + 1;
    // Threading and the weave share their columns, the tie-up and the treadling share theirs, and the tie-up
    // and the threading share their rows, so the four blocks read as one draft.
    const x1 = x0 + 2 * threading.length + 3;
    const y1 = y0 + shafts + 1;
    for (const grid of planes) grid.clear();
    const cell = (x: number, y: number, set: boolean, onto = ink): void => (set ? onto : dim).write(x, y, set ? "██" : "··");
    for (let shaft = 1; shaft <= shafts; shaft++) {
      const y = y0 + shafts - shaft;
      threading.forEach((through, i) => cell(x0 + 2 * i, y, through === shaft));
      for (let t = 1; t <= treadles; t++) cell(x1 + 2 * (t - 1), y, m.on(shaft, t), mark);
      dim.write(x0 + 2 * threading.length + 1, y, String(shaft));
    }
    for (let t = 1; t <= treadles; t++) dim.write(x1 + 2 * (t - 1), y0 + shafts, String(t));
    treadling.forEach((t, p) => {
      for (let i = 1; i <= treadles; i++) cell(x1 + 2 * (i - 1), y1 + p, i === t);
      m.weave[p]?.forEach((over, i) => ink.write(x0 + 2 * i, y1 + p, over ? "██" : "░░"));
    });
    for (const grid of planes) grid.flush();

    rules(m.wide, m.tall);
    if (`${shafts}x${treadles}` !== shape) {
      shape = `${shafts}x${treadles}`;
      build(shafts, treadles);
    }
    const w = ink.cellWidth;
    const h = ink.cellHeight;
    buttons.forEach((button, i) => {
      const shaft = shafts - Math.floor(i / treadles);
      const treadle = (i % treadles) + 1;
      button.style.cssText = `left:${(x1 + 2 * (treadle - 1)) * w}px;top:${(y0 + shafts - shaft) * h}px;width:${2 * w}px;height:${h}px`;
      button.setAttribute("aria-pressed", String(m.on(shaft, treadle)));
    });
    cells.setAttribute("data-weave", m.weave.map((row) => row.map((over) => (over ? "1" : "0")).join("")).join("/"));
    const text = `Warp over weft at ${m.weave.flat().filter(Boolean).length} of ${threading.length * treadling.length} crossings`;
    if (text !== heard) {
      heard = text;
      status.textContent = text;
    }
    attrs.set("data-pica-ready", "true");
  }

  function name(): void {
    attrs.set("role", props.label ? "group" : null);
    attrs.set("aria-label", props.label || null);
  }

  name();
  draw();

  return {
    update(next) {
      props = { ...props, ...next };
      name();
      relayout();
    },
    destroy() {
      cells.remove();
      status.remove();
      sheet.destroy();
      // Each plane put its styles on the host over the last one's, so they come off in the reverse order.
      for (const grid of [...planes].reverse()) grid.destroy();
      attrs.restore();
    },
  };
};

// registry/ascii/ascii-loom-draft/index.tsx
export type AsciiLoomDraftComponentProps = Partial<AsciiLoomDraftProps> & Handlers<AsciiLoomDraftEvents> & WrapperProps;

/** A weaving draft in glyphs: toggle a tie-up cell and the woven repeat redraws its crossings. */
export function AsciiLoomDraft({ className, style, palette, ...props }: AsciiLoomDraftComponentProps) {
  const ref = usePica<AsciiLoomDraftProps>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Loom draft · ascii-loom-draft
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Loom draft · Pica</title>
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
var PicaAsciiLoomDraft = (() => {
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

  // registry/ascii/ascii-loom-draft/core.ts
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
  var DOM_CELL_LIMIT = 12e3;
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

  // registry/ascii/ascii-loom-draft/core.ts
  var defaults = {
    label: "Weaving draft",
    draft: { threading: [1, 2, 3, 4, 4, 3, 2, 1], treadling: [1, 2, 3, 4, 4, 3, 2, 1] },
    value: null,
    defaultValue: ["1001", "1100", "0110", "0011"]
  };
  var LOOM_TIES = 8;
  var LOOM_REPEAT = 16;
  var LOOM_LINE = 1.2;
  var LOOM_GROW = 1.75;
  function loomModel(props, tied) {
    const given = tied.slice(0, LOOM_TIES).map(String);
    const source = given.length ? given : defaults.defaultValue;
    const treadles = Math.min(LOOM_TIES, Math.max(1, ...source.map((row) => row.length)));
    const tie = source.map((row) => row.replace(/[^1]/g, "0").padEnd(treadles, "0").slice(0, treadles));
    const on = (shaft, treadle) => tie[shaft - 1]?.charAt(treadle - 1) === "1";
    const pick = (list, count) => (Array.isArray(list) ? list : []).slice(0, LOOM_REPEAT).map((n) => Math.min(count, Math.max(1, Math.round(Number(n)) || 1)));
    const threading = pick(props.draft?.threading ?? defaults.draft.threading, tie.length);
    const treadling = pick(props.draft?.treadling ?? defaults.draft.treadling, treadles);
    const weave = treadling.map((t) => threading.map((s) => on(s, t)));
    return { tie, on, threading, treadling, weave, shafts: tie.length, treadles, wide: 2 * (threading.length + treadles) + 5, tall: tie.length + treadling.length + 3 };
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let internal = props.defaultValue;
    let buttons = [];
    let shape = "";
    let ruled = "";
    let heard = "";
    const emit = emitter(host);
    const attrs = hostAttributes(host);
    const sheet = scope(host);
    const s = sheet.selector;
    const fg = cssVar("fg");
    const accent = cssVar("accent");
    const cells = document.createElement("div");
    const status = hiddenText("");
    cells.setAttribute("data-pica", "");
    cells.setAttribute("data-part", "cells");
    status.setAttribute("data-pica", "");
    status.setAttribute("aria-live", "polite");
    const model = () => loomModel(props, props.value ?? internal);
    function rules(wide, tall) {
      const css = [
        `:where(${s}){aspect-ratio:${(wide * 0.6).toFixed(1)}/${(tall * LOOM_LINE).toFixed(1)}}`,
        `${s} [data-part=cells]{position:absolute;inset:0;z-index:1;pointer-events:none}`,
        `${s} [data-cell]{position:absolute;box-sizing:border-box;margin:0;padding:0;border:0;border-radius:0;background:none;pointer-events:auto;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}`,
        `${s} [data-cell]:hover{background:color-mix(in srgb,${fg} 10%,transparent)}`,
        `${s} [data-cell]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`
      ].join("\n");
      if (css === ruled) return;
      ruled = css;
      sheet.setRules(css);
    }
    function fitSize() {
      const { wide, tall } = model();
      const base = parseFloat(getComputedStyle(host).fontSize) || 16;
      const advance = measureCell(GRID_FONT, 100, LOOM_LINE).w / 100;
      return Math.max(6, Math.min(base * LOOM_GROW, host.clientWidth / (wide * advance), Math.floor(host.clientHeight / tall) / LOOM_LINE));
    }
    rules(model().wide, model().tall);
    let size = fitSize();
    const plane = (color) => createGrid(host, { fontFamily: GRID_FONT, fontSize: size, columns: 0, lineHeight: LOOM_LINE, renderer: "dom", color }, relayout);
    const ink = plane("");
    const dim = plane(cssVar("muted"));
    const mark = plane(accent);
    const planes = [ink, dim, mark];
    host.append(cells, status);
    function relayout() {
      const next = fitSize();
      if (next === size) return draw();
      size = next;
      for (const grid of planes) grid.update({ fontSize: size });
    }
    function toggle(shaft, treadle) {
      const next = model().tie.map(
        (row, i) => i === shaft - 1 ? `${row.slice(0, treadle - 1)}${row.charAt(treadle - 1) === "1" ? "0" : "1"}${row.slice(treadle)}` : row
      );
      if (props.value === null) {
        internal = next;
        draw();
      }
      emit("valueChange", next);
    }
    function rove(index) {
      buttons.forEach((button, i) => {
        button.tabIndex = i === index ? 0 : -1;
      });
    }
    function build(shafts, treadles) {
      buttons = Array.from({ length: shafts * treadles }, (_, i) => {
        const shaft = shafts - Math.floor(i / treadles);
        const treadle = i % treadles + 1;
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("data-pica", "");
        button.setAttribute("data-cell", `${shaft},${treadle}`);
        button.setAttribute("aria-label", `Shaft ${shaft}, treadle ${treadle}`);
        button.addEventListener("click", () => toggle(shaft, treadle));
        button.addEventListener("focus", () => rove(i));
        button.addEventListener("keydown", (event) => {
          const dx = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
          const dy = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
          if (!dx && !dy) return;
          event.preventDefault();
          const x = i % treadles + dx;
          const y = Math.floor(i / treadles) + dy;
          if (x >= 0 && x < treadles && y >= 0 && y < shafts) buttons[y * treadles + x]?.focus();
        });
        return button;
      });
      cells.replaceChildren(...buttons);
      rove(0);
    }
    function draw() {
      const m = model();
      const { shafts, treadles, threading, treadling } = m;
      const x0 = Math.max(0, ink.cols - m.wide >> 1) + 1;
      const y0 = Math.max(0, ink.rows - m.tall >> 1) + 1;
      const x1 = x0 + 2 * threading.length + 3;
      const y1 = y0 + shafts + 1;
      for (const grid of planes) grid.clear();
      const cell = (x, y, set, onto = ink) => (set ? onto : dim).write(x, y, set ? "██" : "··");
      for (let shaft = 1; shaft <= shafts; shaft++) {
        const y = y0 + shafts - shaft;
        threading.forEach((through, i) => cell(x0 + 2 * i, y, through === shaft));
        for (let t = 1; t <= treadles; t++) cell(x1 + 2 * (t - 1), y, m.on(shaft, t), mark);
        dim.write(x0 + 2 * threading.length + 1, y, String(shaft));
      }
      for (let t = 1; t <= treadles; t++) dim.write(x1 + 2 * (t - 1), y0 + shafts, String(t));
      treadling.forEach((t, p) => {
        for (let i = 1; i <= treadles; i++) cell(x1 + 2 * (i - 1), y1 + p, i === t);
        m.weave[p]?.forEach((over, i) => ink.write(x0 + 2 * i, y1 + p, over ? "██" : "░░"));
      });
      for (const grid of planes) grid.flush();
      rules(m.wide, m.tall);
      if (`${shafts}x${treadles}` !== shape) {
        shape = `${shafts}x${treadles}`;
        build(shafts, treadles);
      }
      const w = ink.cellWidth;
      const h = ink.cellHeight;
      buttons.forEach((button, i) => {
        const shaft = shafts - Math.floor(i / treadles);
        const treadle = i % treadles + 1;
        button.style.cssText = `left:${(x1 + 2 * (treadle - 1)) * w}px;top:${(y0 + shafts - shaft) * h}px;width:${2 * w}px;height:${h}px`;
        button.setAttribute("aria-pressed", String(m.on(shaft, treadle)));
      });
      cells.setAttribute("data-weave", m.weave.map((row) => row.map((over) => over ? "1" : "0").join("")).join("/"));
      const text = `Warp over weft at ${m.weave.flat().filter(Boolean).length} of ${threading.length * treadling.length} crossings`;
      if (text !== heard) {
        heard = text;
        status.textContent = text;
      }
      attrs.set("data-pica-ready", "true");
    }
    function name() {
      attrs.set("role", props.label ? "group" : null);
      attrs.set("aria-label", props.label || null);
    }
    name();
    draw();
    return {
      update(next) {
        props = { ...props, ...next };
        name();
        relayout();
      },
      destroy() {
        cells.remove();
        status.remove();
        sheet.destroy();
        for (const grid of [...planes].reverse()) grid.destroy();
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
  var initial = Object.assign({}, {"label":"Straight twill draft","draft":{"threading":[1,2,3,4,1,2,3,4],"treadling":[1,2,3,4,1,2,3,4]}}, window.PICA_PROPS || {});
  var instance = PicaAsciiLoomDraft.mount(host, take(initial));
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
