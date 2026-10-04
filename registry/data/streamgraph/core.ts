import { labelHost, unlabelHost } from "../../../lib/a11y";
import { BRAILLE_BASE, braille } from "../../../lib/blocks";
import { createBraillePlot } from "../../../lib/braille-plot";
import { dataTable, formatNumber, linePath, niceTicks, svg } from "../../../lib/chart";
import { svgLabel } from "../../../lib/chart-marks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { cssOn, cssVar, watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

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
