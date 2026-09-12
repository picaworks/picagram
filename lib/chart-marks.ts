/** The marks every chart repeats: grid lines with their tick labels, a label on its own, and a point on a
 *  circle. They live apart from lib/chart.ts so a chart that draws none of them carries none of them, and
 *  together they keep eight charts drawing one axis rather than eight. Colors come from lib/palette.ts. */
import { svg } from "./chart";
import { GRID_FONT } from "./font";
import { cssVar, type Token } from "./palette";

/** The side of the plot a set of grid lines is labelled on. A left or right side runs its lines across the
 *  plot, a top or bottom side runs them down it. */
export type MarkSide = "left" | "right" | "top" | "bottom";

export interface MarkLabelOptions {
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
export function svgLabel(text: string, x: number, y: number, options: MarkLabelOptions = {}): SVGTextElement {
  const { anchor = "start", middle = false, size = 10, token = "muted", font = GRID_FONT } = options;
  const node = svg("text", { x, y, "text-anchor": anchor, fill: cssVar(token), "font-family": font, "font-size": size });
  if (middle) node.setAttribute("dominant-baseline", "middle");
  node.style.fontVariantNumeric = "tabular-nums";
  node.textContent = text;
  return node;
}

export interface GridLineOptions {
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
export function gridLines(values: readonly number[], options: GridLineOptions): SVGGElement {
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
export function polarPoint(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];
}
