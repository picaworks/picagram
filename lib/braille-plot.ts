/** A braille dot canvas. Each cell of a glyph grid holds two dots across and four down, so a plot draws at
 *  eight times a grid's resolution and still reads as text: it is how a scatter, a radar, or a gauge keeps
 *  the glyph look. The dot bits come from lib/blocks.ts, so the library keeps one braille table. */
import { braille, brailleDot } from "./blocks";
import type { Grid } from "./glyph-grid";

export interface BraillePlot {
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
export function createBraillePlot(cols: number, rows: number): BraillePlot {
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
