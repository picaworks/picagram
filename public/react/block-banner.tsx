"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Block Banner · block-banner
// MIT + Commons Clause · https://github.com/rishabbalak/pica/blob/main/LICENSE.md
// Docs and credits: https://github.com/rishabbalak/pica

// lib/types.ts
/** The contract every Pica core implements. See docs/architecture/contract.md. */

/** A mounted component. */
interface PicaInstance<P> {
  /** Merge new prop values. The core decides what has to be rebuilt. */
  update(props: Partial<P>): void;
  /** Stop all work and remove everything the core added. Safe to call twice. */
  destroy(): void;
}

/** Mounts a core into a host element. Props are plain data: strings, numbers, booleans, null. */
type Mount<P> = (host: HTMLElement, props?: Partial<P>) => PicaInstance<P>;

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
/** Mounts a Pica core into the returned ref and forwards prop changes to it.
 *  Props are plain data by contract, so a JSON key is enough to detect a change. */
function usePica<P>(mount: Mount<P>, props: Partial<P>) {
  const ref = useRef<HTMLDivElement>(null);
  const instance = useRef<PicaInstance<P> | null>(null);
  const defined = definedProps(props);
  const latest = useRef(defined);
  latest.current = defined;
  const key = JSON.stringify(defined);

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

  return ref;
}

/** Drops undefined values, so an unset prop keeps the core's default. */
function definedProps<P>(props: Partial<P>): Partial<P> {
  const out: Partial<P> = {};
  for (const name in props) {
    const value = props[name];
    if (value !== undefined) out[name] = value;
  }
  return out;
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
  const probe = document.createElement("canvas").getContext("2d");

  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.style.overflow = "hidden";

  const font = (): string => `${fontPx}px ${opts.fontFamily}`;

  /** Recomputes the cell grid from the host's size. Returns true when the grid was rebuilt. */
  function layout(force: boolean): boolean {
    const w = host.clientWidth;
    const h = host.clientHeight;
    let advance = 0.6;
    if (probe) {
      probe.font = `100px ${opts.fontFamily}`;
      advance = probe.measureText("M").width / 100 || 0.6;
    }
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
    const color = opts.color || "var(--pica-fg)";
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
      canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;color:${color}`;
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
      const rowTints = tints.slice(start, start + cols);
      let key = cells.slice(start, start + cols).join("");
      if (rowTints.some((tint) => tint !== undefined)) key += "\u0000" + rowTints.join(",");
      if (key === shown[y]) continue;
      shown[y] = key;
      const top = y * cellH;
      context.clearRect(0, top, width, cellH);
      // One fillText per run of same-colored cells: monospace advances keep every glyph on its cell.
      let x = 0;
      while (x < cols) {
        const tint = rowTints[x] ?? ink;
        let end = x + 1;
        while (end < cols && (rowTints[end] ?? ink) === tint) end++;
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
    },
  };
}

// registry/text-mode/block-banner/core.ts
export interface BlockBannerProps {
  /** Text to render as large blocks. Letters are uppercased, and any character outside A to Z, 0 to 9, space, and . , ! ? - : / draws blank. */
  text: string;
  /** Blank pixel columns between characters. */
  spacing: number;
  /** Draws a one pixel drop shadow below and right of the text, in the light shade glyph. */
  shadow: boolean;
  /** Where the banner sits when the host is wider than the text. */
  align: "left" | "center";
  /** CSS font-family stack for the block glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. 1 makes the blocks touch. */
  lineHeight: number;
}

export const defaults: BlockBannerProps = {
  text: "PICA",
  spacing: 1,
  shadow: false,
  align: "center",
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  lineHeight: 1,
};

/** Rows in the pixel font. Every glyph below has exactly this many strings. */
const GLYPH_H = 5;
/** Cell rows needed to carry the font at two pixel rows per cell, with or without the shadow's extra row. */
const CELL_ROWS = Math.ceil((GLYPH_H + 1) / 2);

const FULL_BLOCK = "█";
const UPPER_HALF = "▀";
const LOWER_HALF = "▄";
const LIGHT_SHADE = "░";

/** An original five row pixel font: "#" is ink, "." is blank. Every character's rows share one width. */
const FONT: Readonly<Record<string, readonly string[]>> = {
  " ": ["...", "...", "...", "...", "..."],
  ".": ["..", "..", "..", "..", "##"],
  ",": ["..", "..", "..", "##", ".#"],
  "!": ["##", "##", "##", "..", "##"],
  "?": [".##.", "#..#", "..#.", "....", "..#."],
  "-": ["....", "....", "####", "....", "...."],
  ":": ["..", "##", "..", "##", ".."],
  "/": ["...#", "..#.", "..#.", ".#..", "#..."],
  "0": [".##.", "#.##", "##.#", "#..#", ".##."],
  "1": [".#..", "##..", ".#..", ".#..", "###."],
  "2": [".##.", "#..#", "..#.", ".#..", "####"],
  "3": ["###.", "..#.", ".##.", "...#", "###."],
  "4": ["..##", ".#.#", "#..#", "####", "...#"],
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
  Y: ["#..#", "#..#", ".##.", ".#..", ".#.."],
  Z: ["####", "...#", ".##.", "#...", "####"],
};

/** One character's bitmap, falling back to the blank space glyph for anything the font has no shape for. */
function glyphOf(ch: string): readonly string[] {
  return FONT[ch] ?? FONT[" "] ?? [];
}

/** Lays `text` out as `GLYPH_H` ink rows, `spacing` blank columns between characters. */
function layoutText(text: string, spacing: number): readonly string[] {
  const glyphs = [...text.toUpperCase()].map(glyphOf);
  const gap = " ".repeat(Math.max(0, spacing));
  const rows: string[] = [];
  for (let r = 0; r < GLYPH_H; r++) rows.push(glyphs.map((g) => g[r] ?? "").join(gap));
  return rows;
}

/** Pixel columns the banner needs for `p`, the shadow's one extra column included. */
function contentCols(p: BlockBannerProps): number {
  const width = layoutText(p.text, p.spacing)[0]?.length ?? 0;
  return Math.max(1, width + (p.shadow ? 1 : 0));
}

function gridOptions(p: BlockBannerProps): GridOptions {
  return { fontFamily: p.fontFamily, fontSize: 12, columns: contentCols(p), lineHeight: p.lineHeight, renderer: "auto", color: "" };
}

export const mount: Mount<BlockBannerProps> = (host, initial = {}) => {
  let props: BlockBannerProps = { ...defaults, ...initial };
  let autoHeight = false;
  const grid = createGrid(host, gridOptions(props), draw);

  function draw(): void {
    const rows = layoutText(props.text, props.spacing);
    const width = rows[0]?.length ?? 0;
    const shadow = props.shadow;
    const cols = Math.max(1, width + (shadow ? 1 : 0));
    const fg = (r: number, c: number): boolean => r >= 0 && r < GLYPH_H && c >= 0 && c < width && rows[r]?.charAt(c) === "#";
    const sh = (r: number, c: number): boolean => shadow && fg(r - 1, c - 1);
    const colOffset = props.align === "center" ? Math.max(0, Math.floor((grid.cols - cols) / 2)) : 0;
    const rowOffset = Math.max(0, Math.floor((grid.rows - CELL_ROWS) / 2));
    grid.clear();
    for (let cy = 0; cy < CELL_ROWS; cy++) {
      const top = cy * 2;
      const bottom = top + 1;
      for (let cx = 0; cx < cols; cx++) {
        const topFg = fg(top, cx);
        const bottomFg = fg(bottom, cx);
        let glyph = " ";
        if (topFg && bottomFg) glyph = FULL_BLOCK;
        else if (topFg) glyph = UPPER_HALF;
        else if (bottomFg) glyph = LOWER_HALF;
        else if (sh(top, cx) || sh(bottom, cx)) glyph = LIGHT_SHADE;
        grid.set(colOffset + cx, rowOffset + cy, glyph);
      }
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  labelHost(host, props.text);
  // A host with no height of its own gets exactly the height this banner needs, so it never renders as a
  // single clipped row: the same reasoning as ascii-image's aspect-ratio fix, sized from the measured cell.
  if (host.clientHeight < 2 && grid.aspect > 0) {
    const cellH = host.clientWidth / grid.cols / grid.aspect;
    if (cellH > 0) {
      host.style.height = `${Math.ceil(cellH * CELL_ROWS) + 1}px`;
      autoHeight = true;
    }
  }
  draw();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      labelHost(host, props.text);
      if (
        props.text !== before.text ||
        props.spacing !== before.spacing ||
        props.shadow !== before.shadow ||
        props.fontFamily !== before.fontFamily ||
        props.lineHeight !== before.lineHeight
      ) {
        grid.update(gridOptions(props));
      } else {
        draw();
      }
    },
    destroy() {
      grid.destroy();
      unlabelHost(host);
      if (autoHeight) host.style.removeProperty("height");
      delete host.dataset.picaReady;
    },
  };
};

// registry/text-mode/block-banner/index.tsx
export interface BlockBannerComponentProps extends Partial<BlockBannerProps> {
  className?: string;
  style?: CSSProperties;
}

/** Large block letters drawn in text, from an original five row pixel font. */
export function BlockBanner({ className, style, ...props }: BlockBannerComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
