/** Layout for a chart's glyph look. A glyph look lays out in cells, and a chart that reuses its SVG look's
 *  pixel math produces cell indices many times too large, so the picture overflows its frame or collapses
 *  into a corner. `chartCells` reserves the cells a chart's labels and axes need and hands back the
 *  rectangle that is left, addressed by fraction rather than by pixel. `chartDots` lays a braille plot over
 *  that rectangle for a chart that needs finer than one cell, such as a scatter, a radar, or a gauge. */
import { braille } from "./blocks";
import { createBraillePlot } from "./braille-plot";
import type { Grid } from "./glyph-grid";

/** Cells to hold back for labels and axes, on each side of the drawing area. */
export interface ChartInset {
  readonly left?: number;
  readonly right?: number;
  readonly top?: number;
  readonly bottom?: number;
}

/** The cell rectangle a chart draws into. */
export interface ChartCells {
  /** Leftmost column of the area. */
  readonly col: number;
  /** Topmost row of the area. */
  readonly row: number;
  /** Width in cells, at least 1. */
  readonly cols: number;
  /** Height in cells, at least 1. */
  readonly rows: number;
  /** The column for `fx`, which is 0 at the area's left edge and 1 at its right. */
  colAt(fx: number): number;
  /** The row for `fy`, which is 0 at the area's bottom edge and 1 at its top, so a chart reads y up. */
  rowAt(fy: number): number;
}

/** The drawing area left inside `grid` once `inset` is held back. */
export function chartCells(grid: Pick<Grid, "cols" | "rows">, inset: ChartInset = {}): ChartCells {
  const left = Math.max(0, Math.floor(inset.left ?? 0));
  const right = Math.max(0, Math.floor(inset.right ?? 0));
  const top = Math.max(0, Math.floor(inset.top ?? 0));
  const bottom = Math.max(0, Math.floor(inset.bottom ?? 0));
  const col = Math.min(left, Math.max(0, grid.cols - 1));
  const row = Math.min(top, Math.max(0, grid.rows - 1));
  const cols = Math.max(1, grid.cols - col - right);
  const rows = Math.max(1, grid.rows - row - bottom);
  const clamp = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
  return {
    col,
    row,
    cols,
    rows,
    colAt: (fx) => col + Math.round(clamp(fx) * (cols - 1)),
    rowAt: (fy) => row + rows - 1 - Math.round(clamp(fy) * (rows - 1)),
  };
}

/** A braille plot covering a `ChartCells` area, addressed by the same fractions. */
export interface ChartDots {
  /** Dots across the area, which is two per cell. */
  readonly wide: number;
  /** Dots down the area, which is four per cell. */
  readonly tall: number;
  /** One dot's width over its height, so a chart can keep a circle round. */
  readonly aspect: number;
  /** The dot at `fx` across and `fy` up, both 0 to 1 over the area. */
  dotAt(fx: number, fy: number): readonly [number, number];
  /** Raises the dot at `fx`, `fy`. */
  mark(fx: number, fy: number): void;
  /** Raises the dots along the line between two fractional points. */
  stroke(fx0: number, fy0: number, fx1: number, fy1: number): void;
  /** Lowers every dot, so one plot can be reused for a second pass. */
  clear(): void;
  /** Writes the inked cells into `grid` in `color`. A blank cell is left as it is, so a track and a fill
   *  drawn as two plots layer instead of rubbing each other out. */
  paint(grid: Pick<Grid, "set">, color: string): void;
}

/** A braille plot over `area`. `cellAspect` is the grid's own `aspect`, a cell's width over its height. */
export function chartDots(area: ChartCells, cellAspect: number): ChartDots {
  const plot = createBraillePlot(area.cols, area.rows);
  const blank = braille(0);
  const clamp = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
  const at = (fx: number, fy: number): readonly [number, number] => [
    Math.round(clamp(fx) * (plot.width - 1)),
    plot.height - 1 - Math.round(clamp(fy) * (plot.height - 1)),
  ];
  return {
    wide: plot.width,
    tall: plot.height,
    // A cell holds two dots across and four down, so a dot is half a cell wide and a quarter of one tall.
    aspect: (cellAspect / 2) / (1 / 4),
    dotAt: at,
    mark(fx, fy) {
      const [x, y] = at(fx, fy);
      plot.dot(x, y);
    },
    stroke(fx0, fy0, fx1, fy1) {
      const [x0, y0] = at(fx0, fy0);
      const [x1, y1] = at(fx1, fy1);
      plot.line(x0, y0, x1, y1);
    },
    clear() {
      plot.clear();
    },
    paint(grid, color) {
      plot.paint(
        {
          set: (x, y, glyph) => {
            if (glyph !== blank) grid.set(x, y, glyph, color);
          },
        },
        area.col,
        area.row,
      );
    },
  };
}
