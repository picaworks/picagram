# Streamgraph

> A stacked area chart centred on a middle line, where each layer's thickness is its value, in an svg or braille glyph look.

Category: data. Tags: chart, streamgraph, stacked, svg, braille, data. Static. Size: 7.5 KB gzipped, runtime included. License: MIT + Commons Clause, https://github.com/rishabbalak/picagram/blob/main/LICENSE.md.

## Install

```bash
npx shadcn@latest add https://picagram.dev/r/streamgraph.json
```

Or paste one of the two files below. The React file imports only `react`. The HTML file needs nothing.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | StreamgraphData | `{"labels":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],"series":[{"name":"Web","values":[8,9,11,14,17,20,22,20,16,12,10,9]},{"name":"Mobile","values":[4,5,6,8,11,15,19,23,21,16,11,7]},{"name":"Platform","values":[9,10,11,12,13,14,16,19,21,20,17,14]},{"name":"Data","values":[3,4,6,9,13,18,17,14,10,7,5,4]},{"name":"Design","values":[5,6,8,10,11,10,9,7,6,5,5,4]},{"name":"Infra","values":[12,13,12,11,9,8,7,6,6,5,5,6]}],"unit":"builds"}` | Labels and layers to stack. |
| `label` | string | `"Builds per month by team"` | Name assistive technology reads for the chart, before its data table. Empty hides the chart from it. |
| `order` | "inside-out" \| "input" | `"inside-out"` | "inside-out" puts the layers that peak earliest nearest the center. "input" stacks them as given, bottom to top. |
| `highlight` | number | `-1` | Index of the layer drawn in the accent. -1 highlights the layer with the largest total. |
| `look` | "svg" \| "glyph" | `"svg"` | "svg" draws filled bands with hairline axes. "glyph" draws the same stack as braille dots in a monospace grid. |
| `ticks` | number | `5` | Approximate number of labels on the time axis and of steps in the scale bar's round value, from 2 to 10. |
| `fontFamily` | string | `"\"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Menlo, monospace"` | CSS font-family stack for every label and number. Must be monospace. |

## Colors

Draws with `--pica-fg`, `--pica-accent`, `--pica-bg`, `--pica-muted`. Set them on any ancestor, pass `palette` to the React component, or put `palette` in `window.PICA_PROPS` for the HTML file.

## React

```tsx
"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Streamgraph · streamgraph
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

// lib/braille-plot.ts
/** A braille dot canvas. Each cell of a glyph grid holds two dots across and four down, so a plot draws at
 *  eight times a grid's resolution and still reads as text: it is how a scatter, a radar, or a gauge keeps
 *  the glyph look. The dot bits come from lib/blocks.ts, so the library keeps one braille table. */



interface BraillePlot {
  /** Dots across, which is two per cell. */
  readonly width: number;
  /** Dots down, which is four per cell. */
  readonly height: number;
  /** Raises the dot nearest (x, y) in dot space. A point outside the plot is dropped. */
  dot(x: number, y: number): void;
  /** Raises the dots along the straight line between two points in dot space, by Bresenham, so the line is
   *  the same one whichever end it is drawn from. */
  line(x0: number, y0: number, x1: number, y1: number): void;
  /** Lowers every dot. */
  clear(): void;
  /** Writes every cell as a braille glyph into `grid`, the plot's first cell at (col, row). A cell with no
   *  dots writes the blank braille glyph, which holds a cell's width, so the plot owns its rectangle. */
  paint(grid: Pick<Grid, "set">, col: number, row: number): void;
}

/** A plot `cols` cells wide and `rows` cells tall, which is twice that in dots across and four times it
 *  down. Dot space starts at the plot's top left. */
function createBraillePlot(cols: number, rows: number): BraillePlot {
  const w = Math.max(1, Math.floor(cols));
  const h = Math.max(1, Math.floor(rows));
  const bits = new Uint8Array(w * h);
  const plot: BraillePlot = {
    width: w * 2,
    height: h * 4,
    dot(x, y) {
      const dx = Math.round(x);
      const dy = Math.round(y);
      if (dx < 0 || dy < 0 || dx >= w * 2 || dy >= h * 4) return;
      const cell = (dy >> 2) * w + (dx >> 1);
      bits[cell] = (bits[cell] ?? 0) | brailleDot(dy & 3, dx & 1);
    },
    line(x0, y0, x1, y1) {
      let x = Math.round(x0);
      let y = Math.round(y0);
      const endX = Math.round(x1);
      const endY = Math.round(y1);
      const stepX = x < endX ? 1 : -1;
      const stepY = y < endY ? 1 : -1;
      const runX = Math.abs(endX - x);
      const runY = -Math.abs(endY - y);
      let error = runX + runY;
      for (;;) {
        plot.dot(x, y);
        if (x === endX && y === endY) return;
        const twice = error * 2;
        if (twice >= runY) {
          error += runY;
          x += stepX;
        }
        if (twice <= runX) {
          error += runX;
          y += stepY;
        }
      }
    },
    clear() {
      bits.fill(0);
    },
    paint(grid, col, row) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) grid.set(col + x, row + y, braille(bits[y * w + x] ?? 0));
      }
    },
  };
  return plot;
}

// lib/chart.ts
/** Scales, ticks, number labels, and SVG paths for chart components, plus the table that carries a chart's
 *  numbers for assistive technology. Written once, so every chart reads the same way. See STYLE.md, charts. */

interface LinearScale {
  (value: number): number;
  readonly domain: readonly [number, number];
  readonly range: readonly [number, number];
}

/** Maps `domain` onto `range` in a straight line. A zero-width domain maps everything to the range's start. */
function linearScale(domain: readonly [number, number], range: readonly [number, number]): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return Object.assign((value: number) => r0 + (value - d0) * k, { domain, range });
}

/** The smallest and largest finite values, or [0, 0] when there are none. */
function extent(values: readonly number[]): [number, number] {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return min <= max ? [min, max] : [0, 0];
}

/** A round number near `x`: 1, 2, or 5 times a power of ten. */
function niceNumber(x: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(x));
  const fraction = x / 10 ** exponent;
  const nice = round
    ? fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10
    : fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}

/** About `count` round tick values that enclose [min, max], stepping by 1, 2, or 5 times a power of ten,
 *  after Heckbert's "Nice Numbers for Graph Labels" (Graphics Gems, 1990). */
function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  let lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  const step = niceNumber(niceNumber(hi - lo, false) / Math.max(1, count - 1), true);
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const ticks: number[] = [];
  for (let i = 0; start + i * step <= end + step / 2; i++) {
    // toFixed removes float drift such as 0.30000000000000004, and || 0 turns -0 into 0.
    ticks.push(Number((start + i * step).toFixed(decimals)) || 0);
  }
  return ticks;
}

interface BandScale {
  /** Distance from one band's start to the next. */
  readonly step: number;
  /** Width of each band. */
  readonly bandwidth: number;
  /** Where band `index` starts. */
  at(index: number): number;
}

/** `count` evenly spaced bands across `range`. `padding` is the share of each step left empty, split
 *  between both sides of the band. */
function bandScale(count: number, range: readonly [number, number], padding = 0.2): BandScale {
  const [r0, r1] = range;
  const step = (r1 - r0) / Math.max(1, count);
  const bandwidth = step * (1 - padding);
  return { step, bandwidth, at: (index) => r0 + index * step + (step - bandwidth) / 2 };
}

const numberFormats = new Map<string, Intl.NumberFormat>();

/** A number as a chart label, in the viewer's locale unless one is given. With `compact` on, values from ten
 *  thousand up read as 12K or 3.4M. */
function formatNumber(value: number, options: { compact?: boolean; decimals?: number; locale?: string } = {}): string {
  const { compact = true, decimals = 1, locale } = options;
  const short = compact && Math.abs(value) >= 10_000;
  const key = `${locale ?? ""}|${short ? "c" : "n"}|${decimals}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, short ? { notation: "compact", maximumFractionDigits: decimals } : { maximumFractionDigits: decimals });
    numberFormats.set(key, format);
  }
  return format.format(value);
}

/** A coordinate with at most two decimals, which keeps paths short without visible change. */
const coord = (value: number): string => String(Math.round(value * 100) / 100);

/** An SVG path through the points, as straight segments. */
function linePath(points: readonly (readonly [number, number])[]): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${coord(x)} ${coord(y)}`).join("");
}

/** A closed SVG path between the line through the points and a horizontal baseline, for area charts. */
function areaPath(points: readonly (readonly [number, number])[], baseline: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return "";
  return `${linePath(points)}L${coord(last[0])} ${coord(baseline)}L${coord(first[0])} ${coord(baseline)}Z`;
}

/** An SVG path for a ring segment between radii `inner` and `outer`, from angle `start` to `end` in radians,
 *  measured clockwise from twelve o'clock. An inner radius of 0 gives a pie slice. */
function arcPath(cx: number, cy: number, inner: number, outer: number, start: number, end: number): string {
  if (end - start >= Math.PI * 2 - 1e-9) {
    // A full ring has the same start and end point, which an SVG arc cannot draw, so draw two halves.
    const middle = start + Math.PI;
    return arcPath(cx, cy, inner, outer, start, middle) + arcPath(cx, cy, inner, outer, middle, start + Math.PI * 2);
  }
  const large = end - start > Math.PI ? 1 : 0;
  const at = (r: number, a: number): string => `${coord(cx + r * Math.sin(a))} ${coord(cy - r * Math.cos(a))}`;
  const outerArc = `A${coord(outer)} ${coord(outer)} 0 ${large} 1 ${at(outer, end)}`;
  if (inner <= 0) return `M${coord(cx)} ${coord(cy)}L${at(outer, start)}${outerArc}Z`;
  return `M${at(outer, start)}${outerArc}L${at(inner, end)}A${coord(inner)} ${coord(inner)} 0 ${large} 0 ${at(inner, start)}Z`;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** An SVG element with the given attributes. */
function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Readonly<Record<string, string | number>> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  return el;
}

/** A visually hidden table of the chart's numbers, which assistive technology reads instead of the drawing.
 *  The first cell of each row is its header. Append it to the host, and hide the drawing itself. */
function dataTable(caption: string, head: readonly string[], rows: readonly (readonly (string | number)[])[]): HTMLTableElement {
  const table = document.createElement("table");
  table.setAttribute("data-pica", "");
  table.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
  table.createCaption().textContent = caption;
  const headRow = table.createTHead().insertRow();
  for (const label of head) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headRow.appendChild(th);
  }
  const body = table.createTBody();
  for (const row of rows) {
    const tr = body.insertRow();
    row.forEach((cell, i) => {
      if (i === 0) {
        const th = document.createElement("th");
        th.scope = "row";
        th.textContent = String(cell);
        tr.appendChild(th);
      } else {
        tr.insertCell().textContent = String(cell);
      }
    });
  }
  return table;
}

// lib/font.ts
/** The monospace stack glyph components default to. It lives in its own module, so a text component that
 *  never draws a grid does not carry lib/glyph-grid.ts into its single React file just for the font. */
const GRID_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

// lib/chart-marks.ts
/** The marks every chart repeats: grid lines with their tick labels, a label on its own, and a point on a
 *  circle. They live apart from lib/chart.ts so a chart that draws none of them carries none of them, and
 *  together they keep eight charts drawing one axis rather than eight. Colors come from lib/palette.ts. */




/** The side of the plot a set of grid lines is labelled on. A left or right side runs its lines across the
 *  plot, a top or bottom side runs them down it. */
type MarkSide = "left" | "right" | "top" | "bottom";

interface MarkLabelOptions {
  /** Which end of the text sits at x. */
  anchor?: "start" | "middle" | "end";
  /** Whether the text is centred on y, rather than sitting on it. */
  middle?: boolean;
  /** Glyph size in the SVG's own units. */
  size?: number;
  /** Palette token for the fill. A label is secondary, so muted by default. */
  token?: Token;
  /** CSS font-family stack. Must be monospace. */
  font?: string;
}

/** A label in mono with tabular figures, so digits keep their columns as a value changes. Muted unless a
 *  token says otherwise. */
function svgLabel(text: string, x: number, y: number, options: MarkLabelOptions = {}): SVGTextElement {
  const { anchor = "start", middle = false, size = 10, token = "muted", font = GRID_FONT } = options;
  const node = svg("text", { x, y, "text-anchor": anchor, fill: cssVar(token), "font-family": font, "font-size": size });
  if (middle) node.setAttribute("dominant-baseline", "middle");
  node.style.fontVariantNumeric = "tabular-nums";
  node.textContent = text;
  return node;
}

interface GridLineOptions {
  /** Which side carries the labels, and so which way the lines run. */
  side: MarkSide;
  /** The plot rectangle, in the SVG's own units. */
  plot: { x: number; y: number; width: number; height: number };
  /** Where a value sits along the axis, usually a scale from lib/chart.ts. */
  at: (value: number) => number;
  /** The label for a value. Leave it out, or return an empty string, for a line with no label. */
  label?: (value: number) => string;
  /** Label size in the SVG's own units. */
  size?: number;
  /** Distance from the plot's edge to its labels. */
  gap?: number;
  /** Draw the hairline across the plot. Off leaves the labels alone. */
  rule?: boolean;
}

/** Hairlines in muted at the given values, each labelled on one side of the plot. Returns a single group, so
 *  a redraw replaces the whole set with one call. */
function gridLines(values: readonly number[], options: GridLineOptions): SVGGElement {
  const { side, plot, at, label, size = 10, gap = size * 0.6, rule = true } = options;
  const across = side === "left" || side === "right";
  const group = svg("g");
  for (const value of values) {
    const p = at(value);
    if (rule) {
      const ends = across
        ? { x1: plot.x, y1: p, x2: plot.x + plot.width, y2: p }
        : { x1: p, y1: plot.y, x2: p, y2: plot.y + plot.height };
      group.appendChild(svg("line", { ...ends, stroke: cssVar("muted"), "stroke-width": 1 }));
    }
    const text = label?.(value) ?? "";
    if (!text) continue;
    // A left or right label is centred on its line. A top or bottom one sits on its own baseline, clear of
    // the plot: above the line for a top side, a full glyph below the edge for a bottom one.
    const x = side === "left" ? plot.x - gap : side === "right" ? plot.x + plot.width + gap : p;
    const y = across ? p : side === "top" ? plot.y - gap : plot.y + plot.height + gap + size;
    const anchor = side === "left" ? "end" : side === "right" ? "start" : "middle";
    group.appendChild(svgLabel(text, x, y, { anchor, middle: across, size }));
  }
  return group;
}

/** The point at radius `r` and `angle` in radians from (cx, cy), measured clockwise from twelve o'clock,
 *  which is the convention arcPath in lib/chart.ts draws its rings on. */
function polarPoint(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];
}

// registry/data/streamgraph/core.ts
export interface StreamgraphSeries {
  /** Name for this layer, set inside its band or beside it, and the heading of its column in the data table. */
  name: string;
  /** One value per label, in the same order as data.labels. A negative or non-finite value counts as zero when stacking. */
  values: number[];
}

export interface StreamgraphData {
  /** Sample names along the time axis, in order. */
  labels: string[];
  /** The layers of the stack, each with one value per label. */
  series: StreamgraphSeries[];
  /** What a value counts, printed after the scale bar's round value. Optional. */
  unit?: string;
}

export interface StreamgraphProps {
  /** Labels and layers to stack. */
  data: StreamgraphData;
  /** Name assistive technology reads for the chart, before its data table. Empty hides the chart from it. */
  label: string;
  /** "inside-out" puts the layers that peak earliest nearest the center. "input" stacks them as given, bottom to top. */
  order: "inside-out" | "input";
  /** Index of the layer drawn in the accent. -1 highlights the layer with the largest total. */
  highlight: number;
  /** "svg" draws filled bands with hairline axes. "glyph" draws the same stack as braille dots in a monospace grid. */
  look: "svg" | "glyph";
  /** Approximate number of labels on the time axis and of steps in the scale bar's round value, from 2 to 10. */
  ticks: number;
  /** CSS font-family stack for every label and number. Must be monospace. */
  fontFamily: string;
}

export const defaults: StreamgraphProps = {
  data: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    series: [
      { name: "Web", values: [8, 9, 11, 14, 17, 20, 22, 20, 16, 12, 10, 9] },
      { name: "Mobile", values: [4, 5, 6, 8, 11, 15, 19, 23, 21, 16, 11, 7] },
      { name: "Platform", values: [9, 10, 11, 12, 13, 14, 16, 19, 21, 20, 17, 14] },
      { name: "Data", values: [3, 4, 6, 9, 13, 18, 17, 14, 10, 7, 5, 4] },
      { name: "Design", values: [5, 6, 8, 10, 11, 10, 9, 7, 6, 5, 5, 4] },
      { name: "Infra", values: [12, 13, 12, 11, 9, 8, 7, 6, 6, 5, 5, 6] },
    ],
    unit: "builds",
  },
  label: "Builds per month by team",
  order: "inside-out",
  highlight: -1,
  look: "svg",
  ticks: 5,
  fontFamily: GRID_FONT,
};

/** Pixel size of the labels the svg look draws, the gap it keeps around a mark, and the inset from the frame. */
const LABEL_SIZE = 10;
const GAP = 6;
const INSET = 24;
/** Opacity of the layers drawn in fg at the stronger and at the lower strength. */
const HIGH = 0.55;
const LOW = 0.25;

let instances = 0;

/** A layer as stacked: its place in the input, its name, and its values clamped to zero or more. */
interface StreamLayer {
  at: number;
  name: string;
  v: number[];
}

/** The stack's edges at each sample, and where each layer sits in it. */
interface Stack {
  layers: StreamLayer[];
  /** edge[k][i] is the lower edge of layer k at sample i, so edge[k + 1] is its upper edge. */
  edge: number[][];
  max: number;
}

function clamp(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/** The layers in drawing order, bottom to top. Inside-out sorts by the sample of each layer's peak, earliest
 *  first and input order breaking ties, then puts each on the thinner side of the growing stack. */
function ordered(layers: StreamLayer[], mode: StreamgraphProps["order"]): StreamLayer[] {
  if (mode !== "inside-out") return layers;
  const peak = (l: StreamLayer): number => l.v.indexOf(Math.max(...l.v));
  const sorted = [...layers].sort((a, b) => peak(a) - peak(b) || a.at - b.at);
  const below: StreamLayer[] = [];
  const above: StreamLayer[] = [];
  let down = 0;
  let up = 0;
  sorted.forEach((l, n) => {
    const weight = l.v.reduce((s, x) => s + x, 0);
    if (n === 0) above.push(l);
    else if (up <= down) {
      above.push(l);
      up += weight;
    } else {
      below.push(l);
      down += weight;
    }
  });
  const first = above.shift();
  return [...below.reverse(), ...(first ? [first] : []), ...above];
}

/** Stacks the layers around a centre line, so the baseline at each sample is minus half that sample's total. */
function stack(props: StreamgraphProps): Stack {
  const labels = props.data.labels ?? [];
  const raw = props.data.series ?? [];
  const layers = ordered(
    raw.map((s, at) => ({ at, name: String(s.name ?? ""), v: labels.map((_, i) => clamp((s.values ?? [])[i])) })),
    props.order,
  );
  const base = labels.map((_, i) => -layers.reduce((s, l) => s + (l.v[i] ?? 0), 0) / 2);
  const edge: number[][] = [base];
  for (const l of layers) edge.push((edge[edge.length - 1] ?? base).map((e, i) => e + (l.v[i] ?? 0)));
  return { layers, edge, max: Math.max(0, ...base.map((b) => -2 * b)) };
}

/** The index in the input of the layer to draw in the accent, or -1 for none. */
function accentLayer(props: StreamgraphProps): number {
  const raw = props.data.series ?? [];
  const sums = raw.map((s) => (s.values ?? []).reduce((a, x) => a + clamp(x), 0));
  const pick = Math.round(props.highlight);
  if (pick < 0) return sums.length ? sums.indexOf(Math.max(...sums)) : -1;
  return pick < raw.length ? pick : -1;
}

/** The round value the scale bar spans: the largest nice tick that is at most half the tallest total. */
function scaleValue(max: number, ticks: number): number {
  const nice = niceTicks(0, max, ticks).filter((t) => t > 0);
  return [...nice].reverse().find((t) => t <= max / 2) ?? nice[0] ?? 1;
}

/** Positions on the time axis that carry a label: the round steps niceTicks picks over the sample indices. */
function axisTicks(count: number, ticks: number): number[] {
  return niceTicks(0, Math.max(1, count - 1), ticks * 2 - 1).filter((t) => Number.isInteger(t) && t >= 0 && t < count);
}

/** Every `step`th of the indices, thinned until their labels no longer touch. */
function thin(indices: number[], fits: (every: number) => boolean): number[] {
  let step = 1;
  while (step < indices.length && !fits(step)) step++;
  return indices.filter((_, k) => k % step === 0);
}

/** An edge's height at the fractional sample `t`, along the straight segment between two samples. */
function along(edge: number[], t: number): number {
  const c = Math.min(edge.length - 1, Math.max(0, t));
  const j = Math.min(edge.length - 2, Math.floor(c));
  return (edge[j] ?? 0) + ((edge[j + 1] ?? 0) - (edge[j] ?? 0)) * (c - j);
}

/** A value formatted for the hidden data table, or blank where there is none. */
function cellText(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? formatNumber(value, { compact: false }) : "";
}

/** Moves labels apart along y so none sits closer than `gap` to the next, keeping their order. */
function spread(ys: number[], gap: number): number[] {
  const order = ys.map((y, i) => [y, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = new Array<number>(ys.length);
  let prev = Number.NEGATIVE_INFINITY;
  for (const [y, i] of order) {
    prev = Math.max(y, prev + gap);
    out[i] = prev;
  }
  return out;
}

/** The same ink at 99 percent. The canvas draws a run of cells in one color as one string, and braille
 *  glyphs do not advance by a cell's width in every font, so a run drifts. Alternating two inks that look
 *  the same ends every run after one cell and keeps each glyph on its own cell. */
function faint(color: string): string {
  return `color-mix(in srgb, ${color} 99%, transparent)`;
}

/** The ink for a band: fg itself on the quiet layers, which sit near the ground, and black on the stronger
 *  ones, which are mid grey on either ground. */
function inkOn(strong: boolean): string {
  return strong ? `oklch(from ${cssVar("fg")} 0 0 0)` : cssVar("fg");
}

export const mount: Mount<StreamgraphProps> = (host, initial = {}) => {
  let props: StreamgraphProps = { ...defaults, ...initial };
  let view: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resize: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;
  const id = `pica-stream-${instances++}`;
  const palette = watchPalette(host, () => draw());

  function gridOptions(): GridOptions {
    return { fontFamily: props.fontFamily, fontSize: 13, columns: 0, lineHeight: 1.3, renderer: "canvas", color: "" };
  }

  function buildTable(s: Stack, mark: number): void {
    table?.remove();
    const raw = props.data.series ?? [];
    const head = s.layers.map((l) => {
      if (l.at !== mark) return l.name;
      const lo = Math.min(...l.v);
      return `${l.name} (highlighted, ${formatNumber(lo, { compact: false })} to ${formatNumber(Math.max(...l.v), { compact: false })})`;
    });
    table = dataTable(
      props.label || "Streamgraph",
      ["", ...head],
      (props.data.labels ?? []).map((text, i) => [text, ...s.layers.map((l) => cellText((raw[l.at]?.values ?? [])[i]))]),
    );
    host.appendChild(table);
  }

  function drawSvg(s: Stack, mark: number): void {
    if (!view) return;
    const v = view;
    while (v.firstChild) v.firstChild.remove();
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    v.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const { fg, muted } = palette.colors;
    const labels = props.data.labels ?? [];
    const n = labels.length;
    const has = n > 1 && s.max > 0;
    const charW = measureCell(props.fontFamily, LABEL_SIZE, 1).w;
    const count = Math.max(2, Math.min(10, Math.round(props.ticks)));
    const unit = has ? scaleValue(s.max, count) : 0;
    const barText = `${formatNumber(unit)}${props.data.unit ? ` ${props.data.unit}` : ""}`;
    const font = { size: LABEL_SIZE, font: props.fontFamily };

    // The scale bar has its own gutter: the bar, its label, then one em before the first sample.
    const x0 = INSET + (has ? barText.length * charW + GAP + 7 + INSET : 0);
    const y0 = INSET;
    const y1 = Math.max(y0 + 1, h - INSET - LABEL_SIZE - GAP);
    const cy = (y0 + y1) / 2;
    const k = has ? (y1 - y0) / s.max : 0;
    const xRight = (outside: number): number => Math.max(x0 + 1, w - INSET - (outside > 0 ? outside * charW + GAP : 0));

    // A layer's name sits inside its band where the whole text fits; otherwise it moves beside the band.
    const fitted = (outside: Set<number>, x1: number): Map<number, { x: number; y: number }> => {
      const found = new Map<number, { x: number; y: number }>();
      const tAt = (x: number): number => ((x - x0) / (x1 - x0)) * (n - 1);
      s.layers.forEach((l, p) => {
        if (outside.has(p)) return;
        const lo = s.edge[p] ?? [];
        const hi = s.edge[p + 1] ?? [];
        const half = (l.name.length * charW) / 2;
        // The name goes at the sample where the band is thickest, and must sit inside the band at both ends
        // of the text and at every sample between, since the edges are straight between samples.
        const thick = (i: number): number => (hi[i] ?? 0) - (lo[i] ?? 0);
        const peak = lo.reduce((best, _, i) => (thick(i) > thick(best) ? i : best), 0);
        const x = Math.min(x1 - half, Math.max(x0 + half, x0 + (peak / (n - 1)) * (x1 - x0)));
        const y = cy - ((along(lo, tAt(x)) + along(hi, tAt(x))) / 2) * k;
        const xs = [x - half, x + half, ...lo.map((_, i) => x0 + (i / (n - 1)) * (x1 - x0)).filter((a) => a > x - half && a < x + half)];
        const pad = LABEL_SIZE / 2 + 1;
        if (xs.every((a) => cy - along(hi, tAt(a)) * k + pad <= y && cy - along(lo, tAt(a)) * k - pad >= y)) found.set(p, { x, y });
      });
      return found;
    };

    const outside = new Set<number>();
    let inside = new Map<number, { x: number; y: number }>();
    let x1 = xRight(0);
    if (has) {
      for (let pass = 0; pass < 4; pass++) {
        inside = fitted(outside, x1);
        const before = outside.size;
        s.layers.forEach((l, p) => {
          if (!inside.has(p)) outside.add(p);
        });
        x1 = xRight(Math.max(0, ...[...outside].map((p) => s.layers[p]?.name.length ?? 0)));
        if (outside.size === before) break;
      }
      inside = fitted(outside, x1);
    }
    const xAt = (i: number): number => x0 + (n > 1 ? (i / (n - 1)) * (x1 - x0) : 0);

    // The time axis: a hairline with a small mark at every sample, labelled at round indices.
    const axisY = y1 + GAP;
    v.appendChild(svg("line", { x1: x0, y1: axisY, x2: x1, y2: axisY, stroke: muted, "stroke-width": 1 }));
    labels.forEach((_, i) => v.appendChild(svg("line", { x1: xAt(i), y1: axisY, x2: xAt(i), y2: axisY + 3, stroke: muted, "stroke-width": 1 })));
    const maxLen = Math.max(1, ...labels.map((l) => l.length));
    const spacing = n > 1 ? (x1 - x0) / (n - 1) : x1 - x0;
    const marks = thin(axisTicks(n, count), (every) => {
      const stepPx = (axisTicks(n, count)[1] ?? 1) * every * spacing;
      return stepPx >= maxLen * charW + GAP;
    });
    for (const i of marks) v.appendChild(svgLabel(labels[i] ?? "", xAt(i), axisY + 3 + GAP + LABEL_SIZE - 3, { anchor: "middle", ...font }));

    if (!has) {
      v.appendChild(svgLabel("no data", (x0 + x1) / 2, cy, { anchor: "middle", middle: true, ...font }));
      return;
    }

    // The scale bar: a vertical hairline spanning a round value, with caps, labelled in mono.
    const bx = INSET + 2;
    const half = (unit * k) / 2;
    v.appendChild(svg("path", { d: `M${bx - 3} ${cy - half}H${bx + 3}M${bx} ${cy - half}V${cy + half}M${bx - 3} ${cy + half}H${bx + 3}`, fill: "none", stroke: muted, "stroke-width": 1 }));
    v.appendChild(svgLabel(barText, bx + GAP + 3, cy, { middle: true, ...font }));

    // Each band runs from its lower edge to its upper edge at every sample, in straight segments.
    const point = (e: number[]): [number, number][] => e.map((value, i) => [xAt(i), cy - value * k]);
    const bands = svg("g", { mask: `url(#${id})` });
    const mask = svg("mask", { id, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: w, height: h });
    mask.appendChild(svg("rect", { x: 0, y: 0, width: w, height: h, fill: "white" }));
    const rules = svg("g");
    s.layers.forEach((l, p) => {
      const top = point(s.edge[p + 1] ?? []);
      const bottom = point(s.edge[p] ?? []).reverse();
      const d = `${linePath(top)}${linePath(bottom).replace("M", "L")}Z`;
      const accent = l.at === mark;
      const full = p % 2 === 0;
      bands.appendChild(svg("path", { d, fill: accent ? palette.colors.accent : fg, "fill-opacity": accent ? 1 : full ? HIGH : LOW }));
      if (p < s.layers.length - 1) {
        mask.appendChild(svg("path", { d: linePath(top), fill: "none", stroke: "black", "stroke-width": 1 }));
        rules.appendChild(svg("path", { d: linePath(top), fill: "none", stroke: cssVar("bg"), "stroke-width": 1 }));
      }
    });
    v.appendChild(mask);
    v.appendChild(bands);
    v.appendChild(rules);

    // Direct labels: inside the band in the ink that reads on its fill, or at the right end beside it.
    const ends = s.layers.map((l, p) => cy - (((s.edge[p]?.[n - 1] ?? 0) + (s.edge[p + 1]?.[n - 1] ?? 0)) / 2) * k);
    const outs = [...outside];
    const placed = spread(outs.map((p) => ends[p] ?? cy), LABEL_SIZE + 2);
    s.layers.forEach((l, p) => {
      const spot = inside.get(p);
      const accent = l.at === mark;
      const at = outs.indexOf(p);
      const node = spot
        ? svgLabel(l.name, spot.x, spot.y, { anchor: "middle", middle: true, ...font })
        : svgLabel(l.name, x1 + GAP, placed[at] ?? 0, { middle: true, token: "fg", ...font });
      if (spot) node.style.fill = accent ? cssOn("accent") : inkOn(p % 2 === 0);
      v.appendChild(node);
    });
  }

  function drawGlyph(s: Stack, mark: number): void {
    if (!grid) return;
    const g = grid;
    const { fg, accent, muted } = palette.colors;
    const labels = props.data.labels ?? [];
    const n = labels.length;
    const has = n > 1 && s.max > 0;
    const count = Math.max(2, Math.min(10, Math.round(props.ticks)));
    const unit = has ? scaleValue(s.max, count) : 0;
    const barText = `${formatNumber(unit)}${props.data.unit ? ` ${props.data.unit}` : ""}`;
    g.clear();

    // Margins of a row above and a blank row over the axis; a gutter for the bar on the left and one for the
    // names on the right, each with a column of air.
    const gutter = Math.min(Math.max(1, g.cols - 1), has ? barText.length + 6 : 1);
    const nameCols = has ? Math.max(...s.layers.map((l) => l.name.length)) + 2 : 0;
    const right = Math.min(nameCols, Math.max(0, Math.floor(g.cols / 3)));
    const bottom = g.rows > 4 ? 2 : g.rows > 2 ? 1 : 0;
    const top0 = g.rows > 4 ? 1 : 0;
    const plotCols = Math.max(1, g.cols - gutter - right);
    const plotRows = Math.max(1, g.rows - bottom - top0);

    if (bottom > 0) {
      const maxLen = Math.max(1, ...labels.map((l) => l.length));
      const at = (i: number): number => gutter + Math.round((i / Math.max(1, n - 1)) * (plotCols - 1));
      const round = axisTicks(n, count);
      const marks = thin(round, (every) => (round[1] ?? 1) * every * ((plotCols - 1) / Math.max(1, n - 1)) >= maxLen + 2);
      for (const i of marks) {
        const text = labels[i] ?? "";
        g.write(Math.max(gutter, Math.min(g.cols - text.length, at(i) - Math.floor(text.length / 2))), g.rows - 1, text, muted);
      }
    }
    if (!has) {
      const note = "no data";
      g.write(gutter + Math.max(0, Math.floor((plotCols - note.length) / 2)), Math.floor(plotRows / 2), note, muted);
      g.flush();
      return;
    }

    // Each layer is painted into a plot of its own, so a cell can be handed to one layer whole afterwards.
    const plots = s.layers.map(() => createBraillePlot(plotCols, plotRows));
    const spanX = Math.max(1, plotCols * 2 - 1);
    const k = (plotRows * 4) / s.max;
    const cy = plotRows * 2;
    const ends: number[] = [];
    s.layers.forEach((l, p) => {
      const plot = plots[p] as ReturnType<typeof createBraillePlot>;
      const sparse = l.at !== mark && p % 2 !== 0;
      const lo = s.edge[p] ?? [];
      const hi = s.edge[p + 1] ?? [];
      const at = (e: number[], x: number): number => along(e, (x / spanX) * (n - 1));
      for (let x = 0; x < plotCols * 2; x++) {
        // A dot belongs to the band whose edges enclose its centre, so adjacent bands share every edge exactly.
        const top = cy - at(hi, x) * k;
        const bot = cy - at(lo, x) * k;
        const first = Math.ceil(top - 0.5);
        // A band two dots thick or more leaves its top dot blank, which is the gap between bands.
        const skip = bot - top >= 2 && p < s.layers.length - 1 ? 1 : 0;
        for (let y = first + skip; y + 0.5 < bot; y++) if (!sparse || (x + y) % 2 === 0) plot.dot(x, y);
      }
      ends[p] = cy - ((at(hi, spanX) + at(lo, spanX)) / 2) * k;
    });
    const bitsOf = (plot: ReturnType<typeof createBraillePlot>): number[] => {
      const out: number[] = [];
      plot.paint({ set: (x, y, glyph) => void (out[y * plotCols + x] = glyph.charCodeAt(0) - BRAILLE_BASE) }, 0, 0);
      return out;
    };
    // Every dot stays where its band puts it, and each cell takes the ink of the layer with most dots in it,
    // so the accent layer is one colour throughout and no other layer speckles it.
    const all = plots.map(bitsOf);
    for (let i = 0; i < plotCols * plotRows; i++) {
      let bits = 0;
      let best = 0;
      let most = -1;
      let total = 0;
      let lit = 0;
      all.forEach((a, p) => {
        const here = a[i] ?? 0;
        bits |= here;
        const weight = here.toString(2).replace(/0/g, "").length;
        if (weight > most) [best, most] = [p, weight];
        total += weight;
        if (s.layers[p]?.at === mark) lit = weight;
      });
      // The accent layer owns a cell once it holds a third of the dots there, so its edge is a clean line.
      const ink = s.layers[best]?.at === mark || lit * 3 >= total ? accent : fg;
      if (bits) g.set(gutter + (i % plotCols), top0 + Math.floor(i / plotCols), braille(bits), i % 2 ? faint(ink) : ink);
    }

    // The scale bar in box-drawing characters, centred on the stack, with its value and unit beside it.
    const rows = Math.max(2, Math.min(plotRows, Math.round((unit * k) / 4)));
    const barTop = top0 + Math.floor((plotRows - rows) / 2);
    for (let r = 0; r < rows; r++) g.set(2, barTop + r, r === 0 ? "┬" : r === rows - 1 ? "┴" : "│", muted);
    g.write(4,barTop + Math.floor(rows / 2), barText, muted);

    // Layer names in the right gutter at the height of each band's end, pushed apart so none overlaps.
    const placed = spread(ends.map((y) => top0 + Math.round(y / 4 - 0.5)), 1);
    const lift = Math.max(0, Math.max(...placed) - (top0 + plotRows - 1));
    s.layers.forEach((l, p) => {
      g.write(gutter + plotCols + 1, Math.max(top0, (placed[p] ?? 0) - lift), l.name.slice(0, Math.max(0, right - 1)), faint(fg));
    });
    g.flush();
  }

  function draw(): void {
    const s = stack(props);
    const mark = accentLayer(props);
    labelHost(host, props.label, "figure");
    buildTable(s, mark);
    if (props.look === "glyph") {
      if (view) {
        resize?.disconnect();
        resize = null;
        view.remove();
        view = null;
      }
      if (!grid) grid = createGrid(host, gridOptions(), draw);
      drawGlyph(s, mark);
    } else {
      if (grid) {
        grid.destroy();
        grid = null;
      }
      if (!view) {
        view = svg("svg", { "aria-hidden": "true", "data-pica": "" });
        view.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
        host.appendChild(view);
        resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
        resize?.observe(host);
      }
      drawSvg(s, mark);
    }
    host.dataset.picaReady = "true";
  }

  draw();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      palette.refresh();
      if (grid && props.fontFamily !== before.fontFamily) {
        grid.update(gridOptions());
        return;
      }
      draw();
    },
    destroy() {
      resize?.disconnect();
      resize = null;
      view?.remove();
      view = null;
      grid?.destroy();
      grid = null;
      table?.remove();
      table = null;
      palette.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};

// registry/data/streamgraph/index.tsx
export type StreamgraphComponentProps = Partial<StreamgraphProps> & WrapperProps;

/** A stacked area chart whose layers float around a centre line, so each band's thickness is its value. */
export function Streamgraph({ className, style, palette, ...props }: StreamgraphComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
```

## HTML, CSS, JS

```html
<!doctype html>
<!--
  Pica · Streamgraph · streamgraph
  MIT + Commons Clause · https://github.com/rishabbalak/picagram/blob/main/LICENSE.md
  Docs and credits: https://github.com/rishabbalak/picagram
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Streamgraph · Pica</title>
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
var PicaStreamgraph = (() => {
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

  // registry/data/streamgraph/core.ts
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

  // lib/blocks.ts
  var BRAILLE_BASE = 10240;
  function brailleDot(row, col) {
    if (row === 3) return col === 0 ? 64 : 128;
    return 1 << (col === 0 ? row : row + 3);
  }
  function braille(bits) {
    return String.fromCharCode(BRAILLE_BASE + (bits & 255));
  }

  // lib/braille-plot.ts
  function createBraillePlot(cols, rows) {
    const w = Math.max(1, Math.floor(cols));
    const h = Math.max(1, Math.floor(rows));
    const bits = new Uint8Array(w * h);
    const plot = {
      width: w * 2,
      height: h * 4,
      dot(x, y) {
        const dx = Math.round(x);
        const dy = Math.round(y);
        if (dx < 0 || dy < 0 || dx >= w * 2 || dy >= h * 4) return;
        const cell = (dy >> 2) * w + (dx >> 1);
        bits[cell] = (bits[cell] ?? 0) | brailleDot(dy & 3, dx & 1);
      },
      line(x0, y0, x1, y1) {
        let x = Math.round(x0);
        let y = Math.round(y0);
        const endX = Math.round(x1);
        const endY = Math.round(y1);
        const stepX = x < endX ? 1 : -1;
        const stepY = y < endY ? 1 : -1;
        const runX = Math.abs(endX - x);
        const runY = -Math.abs(endY - y);
        let error = runX + runY;
        for (; ; ) {
          plot.dot(x, y);
          if (x === endX && y === endY) return;
          const twice = error * 2;
          if (twice >= runY) {
            error += runY;
            x += stepX;
          }
          if (twice <= runX) {
            error += runX;
            y += stepY;
          }
        }
      },
      clear() {
        bits.fill(0);
      },
      paint(grid, col, row) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) grid.set(col + x, row + y, braille(bits[y * w + x] ?? 0));
        }
      }
    };
    return plot;
  }

  // lib/chart.ts
  function niceNumber(x, round) {
    const exponent = Math.floor(Math.log10(x));
    const fraction = x / 10 ** exponent;
    const nice = round ? fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10 : fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return nice * 10 ** exponent;
  }
  function niceTicks(min, max, count = 5) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
    let lo = Math.min(min, max);
    let hi = Math.max(min, max);
    if (lo === hi) {
      const pad = Math.abs(lo) * 0.1 || 1;
      lo -= pad;
      hi += pad;
    }
    const step = niceNumber(niceNumber(hi - lo, false) / Math.max(1, count - 1), true);
    const start = Math.floor(lo / step) * step;
    const end = Math.ceil(hi / step) * step;
    const decimals = Math.max(0, -Math.floor(Math.log10(step)));
    const ticks = [];
    for (let i = 0; start + i * step <= end + step / 2; i++) {
      ticks.push(Number((start + i * step).toFixed(decimals)) || 0);
    }
    return ticks;
  }
  var numberFormats = /* @__PURE__ */ new Map();
  function formatNumber(value, options = {}) {
    const { compact = true, decimals = 1, locale } = options;
    const short = compact && Math.abs(value) >= 1e4;
    const key = `${locale ?? ""}|${short ? "c" : "n"}|${decimals}`;
    let format = numberFormats.get(key);
    if (!format) {
      format = new Intl.NumberFormat(locale, short ? { notation: "compact", maximumFractionDigits: decimals } : { maximumFractionDigits: decimals });
      numberFormats.set(key, format);
    }
    return format.format(value);
  }
  var coord = (value) => String(Math.round(value * 100) / 100);
  function linePath(points) {
    return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${coord(x)} ${coord(y)}`).join("");
  }
  var SVG_NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
    return el;
  }
  function dataTable(caption, head, rows) {
    const table = document.createElement("table");
    table.setAttribute("data-pica", "");
    table.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
    table.createCaption().textContent = caption;
    const headRow = table.createTHead().insertRow();
    for (const label of head) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      headRow.appendChild(th);
    }
    const body = table.createTBody();
    for (const row of rows) {
      const tr = body.insertRow();
      row.forEach((cell, i) => {
        if (i === 0) {
          const th = document.createElement("th");
          th.scope = "row";
          th.textContent = String(cell);
          tr.appendChild(th);
        } else {
          tr.insertCell().textContent = String(cell);
        }
      });
    }
    return table;
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

  // lib/chart-marks.ts
  function svgLabel(text, x, y, options = {}) {
    const { anchor = "start", middle = false, size = 10, token = "muted", font = GRID_FONT } = options;
    const node = svg("text", { x, y, "text-anchor": anchor, fill: cssVar(token), "font-family": font, "font-size": size });
    if (middle) node.setAttribute("dominant-baseline", "middle");
    node.style.fontVariantNumeric = "tabular-nums";
    node.textContent = text;
    return node;
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

  // registry/data/streamgraph/core.ts
  var defaults = {
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      series: [
        { name: "Web", values: [8, 9, 11, 14, 17, 20, 22, 20, 16, 12, 10, 9] },
        { name: "Mobile", values: [4, 5, 6, 8, 11, 15, 19, 23, 21, 16, 11, 7] },
        { name: "Platform", values: [9, 10, 11, 12, 13, 14, 16, 19, 21, 20, 17, 14] },
        { name: "Data", values: [3, 4, 6, 9, 13, 18, 17, 14, 10, 7, 5, 4] },
        { name: "Design", values: [5, 6, 8, 10, 11, 10, 9, 7, 6, 5, 5, 4] },
        { name: "Infra", values: [12, 13, 12, 11, 9, 8, 7, 6, 6, 5, 5, 6] }
      ],
      unit: "builds"
    },
    label: "Builds per month by team",
    order: "inside-out",
    highlight: -1,
    look: "svg",
    ticks: 5,
    fontFamily: GRID_FONT
  };
  var LABEL_SIZE = 10;
  var GAP = 6;
  var INSET = 24;
  var HIGH = 0.55;
  var LOW = 0.25;
  var instances = 0;
  function clamp(value) {
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
  }
  function ordered(layers, mode) {
    if (mode !== "inside-out") return layers;
    const peak = (l) => l.v.indexOf(Math.max(...l.v));
    const sorted = [...layers].sort((a, b) => peak(a) - peak(b) || a.at - b.at);
    const below = [];
    const above = [];
    let down = 0;
    let up = 0;
    sorted.forEach((l, n) => {
      const weight = l.v.reduce((s, x) => s + x, 0);
      if (n === 0) above.push(l);
      else if (up <= down) {
        above.push(l);
        up += weight;
      } else {
        below.push(l);
        down += weight;
      }
    });
    const first = above.shift();
    return [...below.reverse(), ...first ? [first] : [], ...above];
  }
  function stack(props) {
    const labels = props.data.labels ?? [];
    const raw = props.data.series ?? [];
    const layers = ordered(
      raw.map((s, at) => ({ at, name: String(s.name ?? ""), v: labels.map((_, i) => clamp((s.values ?? [])[i])) })),
      props.order
    );
    const base = labels.map((_, i) => -layers.reduce((s, l) => s + (l.v[i] ?? 0), 0) / 2);
    const edge = [base];
    for (const l of layers) edge.push((edge[edge.length - 1] ?? base).map((e, i) => e + (l.v[i] ?? 0)));
    return { layers, edge, max: Math.max(0, ...base.map((b) => -2 * b)) };
  }
  function accentLayer(props) {
    const raw = props.data.series ?? [];
    const sums = raw.map((s) => (s.values ?? []).reduce((a, x) => a + clamp(x), 0));
    const pick = Math.round(props.highlight);
    if (pick < 0) return sums.length ? sums.indexOf(Math.max(...sums)) : -1;
    return pick < raw.length ? pick : -1;
  }
  function scaleValue(max, ticks) {
    const nice = niceTicks(0, max, ticks).filter((t) => t > 0);
    return [...nice].reverse().find((t) => t <= max / 2) ?? nice[0] ?? 1;
  }
  function axisTicks(count, ticks) {
    return niceTicks(0, Math.max(1, count - 1), ticks * 2 - 1).filter((t) => Number.isInteger(t) && t >= 0 && t < count);
  }
  function thin(indices, fits) {
    let step = 1;
    while (step < indices.length && !fits(step)) step++;
    return indices.filter((_, k) => k % step === 0);
  }
  function along(edge, t) {
    const c = Math.min(edge.length - 1, Math.max(0, t));
    const j = Math.min(edge.length - 2, Math.floor(c));
    return (edge[j] ?? 0) + ((edge[j + 1] ?? 0) - (edge[j] ?? 0)) * (c - j);
  }
  function cellText(value) {
    return typeof value === "number" && Number.isFinite(value) ? formatNumber(value, { compact: false }) : "";
  }
  function spread(ys, gap) {
    const order = ys.map((y, i) => [y, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const out = new Array(ys.length);
    let prev = Number.NEGATIVE_INFINITY;
    for (const [y, i] of order) {
      prev = Math.max(y, prev + gap);
      out[i] = prev;
    }
    return out;
  }
  function faint(color) {
    return `color-mix(in srgb, ${color} 99%, transparent)`;
  }
  function inkOn(strong) {
    return strong ? `oklch(from ${cssVar("fg")} 0 0 0)` : cssVar("fg");
  }
  var mount = (host, initial = {}) => {
    let props = { ...defaults, ...initial };
    let view = null;
    let grid = null;
    let resize = null;
    let table = null;
    const id = `pica-stream-${instances++}`;
    const palette = watchPalette(host, () => draw());
    function gridOptions() {
      return { fontFamily: props.fontFamily, fontSize: 13, columns: 0, lineHeight: 1.3, renderer: "canvas", color: "" };
    }
    function buildTable(s, mark) {
      table?.remove();
      const raw = props.data.series ?? [];
      const head = s.layers.map((l) => {
        if (l.at !== mark) return l.name;
        const lo = Math.min(...l.v);
        return `${l.name} (highlighted, ${formatNumber(lo, { compact: false })} to ${formatNumber(Math.max(...l.v), { compact: false })})`;
      });
      table = dataTable(
        props.label || "Streamgraph",
        ["", ...head],
        (props.data.labels ?? []).map((text, i) => [text, ...s.layers.map((l) => cellText((raw[l.at]?.values ?? [])[i]))])
      );
      host.appendChild(table);
    }
    function drawSvg(s, mark) {
      if (!view) return;
      const v = view;
      while (v.firstChild) v.firstChild.remove();
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      v.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const { fg, muted } = palette.colors;
      const labels = props.data.labels ?? [];
      const n = labels.length;
      const has = n > 1 && s.max > 0;
      const charW = measureCell(props.fontFamily, LABEL_SIZE, 1).w;
      const count = Math.max(2, Math.min(10, Math.round(props.ticks)));
      const unit = has ? scaleValue(s.max, count) : 0;
      const barText = `${formatNumber(unit)}${props.data.unit ? ` ${props.data.unit}` : ""}`;
      const font = { size: LABEL_SIZE, font: props.fontFamily };
      const x0 = INSET + (has ? barText.length * charW + GAP + 7 + INSET : 0);
      const y0 = INSET;
      const y1 = Math.max(y0 + 1, h - INSET - LABEL_SIZE - GAP);
      const cy = (y0 + y1) / 2;
      const k = has ? (y1 - y0) / s.max : 0;
      const xRight = (outside2) => Math.max(x0 + 1, w - INSET - (outside2 > 0 ? outside2 * charW + GAP : 0));
      const fitted = (outside2, x12) => {
        const found = /* @__PURE__ */ new Map();
        const tAt = (x) => (x - x0) / (x12 - x0) * (n - 1);
        s.layers.forEach((l, p) => {
          if (outside2.has(p)) return;
          const lo = s.edge[p] ?? [];
          const hi = s.edge[p + 1] ?? [];
          const half2 = l.name.length * charW / 2;
          const thick = (i) => (hi[i] ?? 0) - (lo[i] ?? 0);
          const peak = lo.reduce((best, _, i) => thick(i) > thick(best) ? i : best, 0);
          const x = Math.min(x12 - half2, Math.max(x0 + half2, x0 + peak / (n - 1) * (x12 - x0)));
          const y = cy - (along(lo, tAt(x)) + along(hi, tAt(x))) / 2 * k;
          const xs = [x - half2, x + half2, ...lo.map((_, i) => x0 + i / (n - 1) * (x12 - x0)).filter((a) => a > x - half2 && a < x + half2)];
          const pad = LABEL_SIZE / 2 + 1;
          if (xs.every((a) => cy - along(hi, tAt(a)) * k + pad <= y && cy - along(lo, tAt(a)) * k - pad >= y)) found.set(p, { x, y });
        });
        return found;
      };
      const outside = /* @__PURE__ */ new Set();
      let inside = /* @__PURE__ */ new Map();
      let x1 = xRight(0);
      if (has) {
        for (let pass = 0; pass < 4; pass++) {
          inside = fitted(outside, x1);
          const before = outside.size;
          s.layers.forEach((l, p) => {
            if (!inside.has(p)) outside.add(p);
          });
          x1 = xRight(Math.max(0, ...[...outside].map((p) => s.layers[p]?.name.length ?? 0)));
          if (outside.size === before) break;
        }
        inside = fitted(outside, x1);
      }
      const xAt = (i) => x0 + (n > 1 ? i / (n - 1) * (x1 - x0) : 0);
      const axisY = y1 + GAP;
      v.appendChild(svg("line", { x1: x0, y1: axisY, x2: x1, y2: axisY, stroke: muted, "stroke-width": 1 }));
      labels.forEach((_, i) => v.appendChild(svg("line", { x1: xAt(i), y1: axisY, x2: xAt(i), y2: axisY + 3, stroke: muted, "stroke-width": 1 })));
      const maxLen = Math.max(1, ...labels.map((l) => l.length));
      const spacing = n > 1 ? (x1 - x0) / (n - 1) : x1 - x0;
      const marks = thin(axisTicks(n, count), (every) => {
        const stepPx = (axisTicks(n, count)[1] ?? 1) * every * spacing;
        return stepPx >= maxLen * charW + GAP;
      });
      for (const i of marks) v.appendChild(svgLabel(labels[i] ?? "", xAt(i), axisY + 3 + GAP + LABEL_SIZE - 3, { anchor: "middle", ...font }));
      if (!has) {
        v.appendChild(svgLabel("no data", (x0 + x1) / 2, cy, { anchor: "middle", middle: true, ...font }));
        return;
      }
      const bx = INSET + 2;
      const half = unit * k / 2;
      v.appendChild(svg("path", { d: `M${bx - 3} ${cy - half}H${bx + 3}M${bx} ${cy - half}V${cy + half}M${bx - 3} ${cy + half}H${bx + 3}`, fill: "none", stroke: muted, "stroke-width": 1 }));
      v.appendChild(svgLabel(barText, bx + GAP + 3, cy, { middle: true, ...font }));
      const point = (e) => e.map((value, i) => [xAt(i), cy - value * k]);
      const bands = svg("g", { mask: `url(#${id})` });
      const mask = svg("mask", { id, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: w, height: h });
      mask.appendChild(svg("rect", { x: 0, y: 0, width: w, height: h, fill: "white" }));
      const rules = svg("g");
      s.layers.forEach((l, p) => {
        const top = point(s.edge[p + 1] ?? []);
        const bottom = point(s.edge[p] ?? []).reverse();
        const d = `${linePath(top)}${linePath(bottom).replace("M", "L")}Z`;
        const accent = l.at === mark;
        const full = p % 2 === 0;
        bands.appendChild(svg("path", { d, fill: accent ? palette.colors.accent : fg, "fill-opacity": accent ? 1 : full ? HIGH : LOW }));
        if (p < s.layers.length - 1) {
          mask.appendChild(svg("path", { d: linePath(top), fill: "none", stroke: "black", "stroke-width": 1 }));
          rules.appendChild(svg("path", { d: linePath(top), fill: "none", stroke: cssVar("bg"), "stroke-width": 1 }));
        }
      });
      v.appendChild(mask);
      v.appendChild(bands);
      v.appendChild(rules);
      const ends = s.layers.map((l, p) => cy - ((s.edge[p]?.[n - 1] ?? 0) + (s.edge[p + 1]?.[n - 1] ?? 0)) / 2 * k);
      const outs = [...outside];
      const placed = spread(outs.map((p) => ends[p] ?? cy), LABEL_SIZE + 2);
      s.layers.forEach((l, p) => {
        const spot = inside.get(p);
        const accent = l.at === mark;
        const at = outs.indexOf(p);
        const node = spot ? svgLabel(l.name, spot.x, spot.y, { anchor: "middle", middle: true, ...font }) : svgLabel(l.name, x1 + GAP, placed[at] ?? 0, { middle: true, token: "fg", ...font });
        if (spot) node.style.fill = accent ? cssOn("accent") : inkOn(p % 2 === 0);
        v.appendChild(node);
      });
    }
    function drawGlyph(s, mark) {
      if (!grid) return;
      const g = grid;
      const { fg, accent, muted } = palette.colors;
      const labels = props.data.labels ?? [];
      const n = labels.length;
      const has = n > 1 && s.max > 0;
      const count = Math.max(2, Math.min(10, Math.round(props.ticks)));
      const unit = has ? scaleValue(s.max, count) : 0;
      const barText = `${formatNumber(unit)}${props.data.unit ? ` ${props.data.unit}` : ""}`;
      g.clear();
      const gutter = Math.min(Math.max(1, g.cols - 1), has ? barText.length + 6 : 1);
      const nameCols = has ? Math.max(...s.layers.map((l) => l.name.length)) + 2 : 0;
      const right = Math.min(nameCols, Math.max(0, Math.floor(g.cols / 3)));
      const bottom = g.rows > 4 ? 2 : g.rows > 2 ? 1 : 0;
      const top0 = g.rows > 4 ? 1 : 0;
      const plotCols = Math.max(1, g.cols - gutter - right);
      const plotRows = Math.max(1, g.rows - bottom - top0);
      if (bottom > 0) {
        const maxLen = Math.max(1, ...labels.map((l) => l.length));
        const at = (i) => gutter + Math.round(i / Math.max(1, n - 1) * (plotCols - 1));
        const round = axisTicks(n, count);
        const marks = thin(round, (every) => (round[1] ?? 1) * every * ((plotCols - 1) / Math.max(1, n - 1)) >= maxLen + 2);
        for (const i of marks) {
          const text = labels[i] ?? "";
          g.write(Math.max(gutter, Math.min(g.cols - text.length, at(i) - Math.floor(text.length / 2))), g.rows - 1, text, muted);
        }
      }
      if (!has) {
        const note = "no data";
        g.write(gutter + Math.max(0, Math.floor((plotCols - note.length) / 2)), Math.floor(plotRows / 2), note, muted);
        g.flush();
        return;
      }
      const plots = s.layers.map(() => createBraillePlot(plotCols, plotRows));
      const spanX = Math.max(1, plotCols * 2 - 1);
      const k = plotRows * 4 / s.max;
      const cy = plotRows * 2;
      const ends = [];
      s.layers.forEach((l, p) => {
        const plot = plots[p];
        const sparse = l.at !== mark && p % 2 !== 0;
        const lo = s.edge[p] ?? [];
        const hi = s.edge[p + 1] ?? [];
        const at = (e, x) => along(e, x / spanX * (n - 1));
        for (let x = 0; x < plotCols * 2; x++) {
          const top = cy - at(hi, x) * k;
          const bot = cy - at(lo, x) * k;
          const first = Math.ceil(top - 0.5);
          const skip = bot - top >= 2 && p < s.layers.length - 1 ? 1 : 0;
          for (let y = first + skip; y + 0.5 < bot; y++) if (!sparse || (x + y) % 2 === 0) plot.dot(x, y);
        }
        ends[p] = cy - (at(hi, spanX) + at(lo, spanX)) / 2 * k;
      });
      const bitsOf = (plot) => {
        const out = [];
        plot.paint({ set: (x, y, glyph) => void (out[y * plotCols + x] = glyph.charCodeAt(0) - BRAILLE_BASE) }, 0, 0);
        return out;
      };
      const all = plots.map(bitsOf);
      for (let i = 0; i < plotCols * plotRows; i++) {
        let bits = 0;
        let best = 0;
        let most = -1;
        let total = 0;
        let lit = 0;
        all.forEach((a, p) => {
          const here = a[i] ?? 0;
          bits |= here;
          const weight = here.toString(2).replace(/0/g, "").length;
          if (weight > most) [best, most] = [p, weight];
          total += weight;
          if (s.layers[p]?.at === mark) lit = weight;
        });
        const ink = s.layers[best]?.at === mark || lit * 3 >= total ? accent : fg;
        if (bits) g.set(gutter + i % plotCols, top0 + Math.floor(i / plotCols), braille(bits), i % 2 ? faint(ink) : ink);
      }
      const rows = Math.max(2, Math.min(plotRows, Math.round(unit * k / 4)));
      const barTop = top0 + Math.floor((plotRows - rows) / 2);
      for (let r = 0; r < rows; r++) g.set(2, barTop + r, r === 0 ? "┬" : r === rows - 1 ? "┴" : "│", muted);
      g.write(4, barTop + Math.floor(rows / 2), barText, muted);
      const placed = spread(ends.map((y) => top0 + Math.round(y / 4 - 0.5)), 1);
      const lift = Math.max(0, Math.max(...placed) - (top0 + plotRows - 1));
      s.layers.forEach((l, p) => {
        g.write(gutter + plotCols + 1, Math.max(top0, (placed[p] ?? 0) - lift), l.name.slice(0, Math.max(0, right - 1)), faint(fg));
      });
      g.flush();
    }
    function draw() {
      const s = stack(props);
      const mark = accentLayer(props);
      labelHost(host, props.label, "figure");
      buildTable(s, mark);
      if (props.look === "glyph") {
        if (view) {
          resize?.disconnect();
          resize = null;
          view.remove();
          view = null;
        }
        if (!grid) grid = createGrid(host, gridOptions(), draw);
        drawGlyph(s, mark);
      } else {
        if (grid) {
          grid.destroy();
          grid = null;
        }
        if (!view) {
          view = svg("svg", { "aria-hidden": "true", "data-pica": "" });
          view.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
          host.appendChild(view);
          resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
          resize?.observe(host);
        }
        drawSvg(s, mark);
      }
      host.dataset.picaReady = "true";
    }
    draw();
    return {
      update(next) {
        const before = props;
        props = { ...props, ...next };
        palette.refresh();
        if (grid && props.fontFamily !== before.fontFamily) {
          grid.update(gridOptions());
          return;
        }
        draw();
      },
      destroy() {
        resize?.disconnect();
        resize = null;
        view?.remove();
        view = null;
        grid?.destroy();
        grid = null;
        table?.remove();
        table = null;
        palette.destroy();
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
  var initial = Object.assign({}, {}, window.PICA_PROPS || {});
  var instance = PicaStreamgraph.mount(host, take(initial));
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

- Technique from [Stacked Graphs: Geometry and Aesthetics](https://doi.org/10.1109/TVCG.2008.166) by Lee Byron and Martin Wattenberg (Paper).
- Technique from [Nice Numbers for Graph Labels](https://dl.acm.org/doi/10.5555/90767.90846) by Paul Heckbert, Graphics Gems (Algorithm, no code).
