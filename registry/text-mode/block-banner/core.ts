import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import type { Mount } from "../../../lib/types";

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
