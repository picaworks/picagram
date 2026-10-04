import { labelHost, unlabelHost } from "../../../lib/a11y";
import { braille } from "../../../lib/blocks";
import { createBraillePlot } from "../../../lib/braille-plot";
import { dataTable, extent, formatNumber, linearScale, linePath, niceTicks, svg } from "../../../lib/chart";
import { gridLines, svgLabel } from "../../../lib/chart-marks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface SlopeChartRow {
  /** Name of the item, printed at both ends of its line and as its row in the data table. */
  name: string;
  /** The item's value in the first period. A value that is not a finite number leaves the item with no line. */
  a: number;
  /** The item's value in the second period, on the same scale as the first. */
  b: number;
}

export interface SlopeChartData {
  /** Name of the first period, which heads the left axis and the first value column of the table. */
  from: string;
  /** Name of the second period, which heads the right axis and the second value column of the table. */
  to: string;
  /** One row per item, each drawn as a straight line from its first value to its second. */
  rows: SlopeChartRow[];
}

export interface SlopeChartProps {
  /** The two periods and the items compared between them. */
  data: SlopeChartData;
  /** Name assistive technology reads for the chart, before its data table. Empty hides the chart from it. */
  label: string;
  /** Index of the row drawn in the accent, with both values and its change printed. -1 picks the row with the largest absolute change. */
  highlight: number;
  /** Prints both end values beside every name. Off prints them for the highlighted row alone. */
  values: boolean;
  /** Approximate number of value ticks on the far left, from 2 to 10. */
  ticks: number;
  /** "svg" draws hairline axes and straight lines with lib/chart.ts. "glyph" draws the lines as braille dots in a monospace grid. */
  look: "svg" | "glyph";
  /** CSS font-family stack for every label and number. Must be monospace. */
  fontFamily: string;
}

export const defaults: SlopeChartProps = {
  data: {
    from: "2023",
    to: "2025",
    rows: [
      { name: "React", a: 62, b: 58 },
      { name: "Vue", a: 34, b: 31 },
      { name: "jQuery", a: 38, b: 24 },
      { name: "Angular", a: 27, b: 19 },
      { name: "Next.js", a: 21, b: 33 },
      { name: "Svelte", a: 8, b: 18 },
      { name: "Astro", a: 4, b: 13 },
      { name: "Vite", a: 17, b: 36 },
    ],
  },
  label: "Share of projects by tool, 2023 and 2025",
  highlight: -1,
  values: true,
  ticks: 5,
  look: "svg",
  fontFamily: GRID_FONT,
};

/** Pixel size of the labels the svg look draws, the least distance between two labels, the gap around a
 *  mark, the room between an axis and its labels, and the inset kept around the whole drawing. */
const SIZE = 11;
const LINE = 15;
const GAP = 6;
const LEAD = 14;
const PAD = 14;

/** A finite number, or NaN where the value is missing. */
const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : Number.NaN);

/** The length of the longest string, in characters. */
const longest = (list: readonly string[]): number => Math.max(0, ...list.map((text) => text.length));

/** A signed change, with a true minus sign. */
const signed = (change: number): string => (change > 0 ? "+" : change < 0 ? "−" : "") + formatNumber(Math.abs(change), { compact: false });

interface Row {
  i: number;
  name: string;
  a: number;
  b: number;
}

/** Where `ys` want their labels, moved apart to at least `gap` and held inside [lo, hi]. Labels are ordered by
 *  value with the input index breaking ties. Any that touch are stacked as one block centred on where its
 *  members wanted to be, and a block that leaves the range slides back inside, so one input gives one answer. */
function relax(ys: readonly number[], gap: number, lo: number, hi: number): number[] {
  const order = ys.map((_, i) => i).sort((p, q) => (ys[p] ?? 0) - (ys[q] ?? 0) || p - q);
  const step = Math.min(gap, ys.length > 1 ? (hi - lo) / (ys.length - 1) : gap);
  const stack: { from: number; n: number; sum: number; top: number }[] = [];
  order.forEach((index, k) => {
    const sum = ys[index] ?? 0;
    let cur = { from: k, n: 1, sum, top: Math.min(hi, Math.max(lo, sum)) };
    for (let prev = stack[stack.length - 1]; prev && prev.top + prev.n * step > cur.top + 1e-9; prev = stack[stack.length - 1]) {
      stack.pop();
      const n = prev.n + cur.n;
      const total = prev.sum + cur.sum - prev.n * cur.n * step;
      cur = { from: prev.from, n, sum: total, top: Math.min(hi - (n - 1) * step, Math.max(lo, total / n)) };
    }
    stack.push(cur);
  });
  const out = new Array<number>(ys.length).fill(0);
  for (const block of stack) for (let m = 0; m < block.n; m++) out[order[block.from + m] ?? 0] = block.top + m * step;
  return out;
}

/** Splits the room into the three widths a layout needs, in any unit. `fixed` is everything that is neither a
 *  label nor the plot. The plot takes about 60 percent of the room, at least `min`, and what is left on either
 *  side is shared. The repeated name at the right end is dropped first when the plot would shrink below `min`. */
function span(room: number, tick: number, left: number, wide: number, narrow: number, fixed: number, min: number) {
  const used = tick + left + fixed;
  const roomy = room - used - wide >= min;
  const plot = Math.max(1, Math.min(room - used - (roomy ? wide : narrow), Math.max(min, room * 0.6)));
  return { x: Math.max(0, (room - used - (roomy ? wide : narrow) - plot) / 2), plot, roomy };
}

/** The rows, the value scale, the highlighted row, and the label text each side prints. */
function parts(props: SlopeChartProps) {
  const data = props.data ?? {};
  const rows: Row[] = (data.rows ?? []).map((r, i) => ({ i, name: String(r.name ?? ""), a: num(r.a), b: num(r.b) }));
  const finite = rows.flatMap((r) => [r.a, r.b]).filter(Number.isFinite);
  const [lo, hi] = finite.length > 0 ? extent(finite) : [0, 1];
  const ticks = niceTicks(lo, hi, Math.max(2, Math.min(10, Math.round(props.ticks))));
  let best = props.highlight;
  if (best === -1) {
    let big = -1;
    for (const r of rows) {
      const change = Math.abs(r.b - r.a);
      if (change > big) {
        big = change;
        best = r.i;
      }
    }
  }
  const fmt = (n: number): string => formatNumber(n);
  const shown = (r: Row): boolean => props.values || r.i === best;
  const left = rows.map((r) => (Number.isFinite(r.a) ? [r.name, shown(r) && fmt(r.a)].filter(Boolean).join(" ") : ""));
  /** The right label of each row, with or without the name repeated. */
  const right = (named: boolean): string[] => {
    const width = longest(rows.filter((r) => shown(r) && Number.isFinite(r.b)).map((r) => fmt(r.b)));
    return rows.map((r) =>
      Number.isFinite(r.b)
        ? [
            shown(r) && (named && r.name ? fmt(r.b).padEnd(width) : fmt(r.b)),
            named && r.name,
            r.i === best && Number.isFinite(r.a) && signed(r.b - r.a),
          ].filter(Boolean).join(" ")
        : "",
    );
  };
  const has = finite.length > 0;
  return { data, rows, ticks, best, left, wide: right(true), narrow: right(false), has, yLo: ticks[0] ?? 0, yHi: ticks[ticks.length - 1] ?? 1 };
}

export const mount: Mount<SlopeChartProps> = (host, initial = {}) => {
  let props: SlopeChartProps = { ...defaults, ...initial };
  let view: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resize: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;
  const palette = watchPalette(host, () => draw());

  function gridOptions(): GridOptions {
    return { fontFamily: props.fontFamily, fontSize: 13, columns: 0, lineHeight: 1.3, renderer: "canvas", color: "" };
  }

  function buildTable(): void {
    table?.remove();
    const m = parts(props);
    table = dataTable(
      props.label || "Slope chart",
      ["Item", String(m.data.from ?? ""), String(m.data.to ?? ""), "Change"],
      m.rows.map((r) => [
        r.name,
        Number.isFinite(r.a) ? formatNumber(r.a, { compact: false }) : "",
        Number.isFinite(r.b) ? formatNumber(r.b, { compact: false }) : "",
        Number.isFinite(r.a) && Number.isFinite(r.b) ? signed(r.b - r.a) : "",
      ]),
    );
    host.appendChild(table);
  }

  function drawSvg(): void {
    if (!view) return;
    const v = view;
    while (v.firstChild) v.firstChild.remove();
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    v.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const { fg, accent } = palette.colors;
    const m = parts(props);
    const cw = measureCell(props.fontFamily, SIZE, 1).w;
    const tickText = m.ticks.map((t) => formatNumber(t));
    const tickW = longest(tickText) * cw;
    const leftW = longest(m.left) * cw;
    const s = span(w - PAD * 2, tickW, leftW, longest(m.wide) * cw, longest(m.narrow) * cw, GAP * 2 + LEAD * 2, 140);
    const rightText = s.roomy ? m.wide : m.narrow;
    const xT = PAD + s.x + tickW;
    const xL = xT + GAP * 2 + leftW + LEAD;
    const xR = xL + s.plot;
    const headY = PAD + SIZE;
    const y0 = headY + GAP * 2 + LINE / 2;
    const y1 = Math.max(y0 + 1, h - PAD - LINE / 2);
    const yAt = linearScale([m.yLo, m.yHi], [y1, y0]);
    const opts = { size: SIZE, font: props.fontFamily };

    v.appendChild(gridLines([xL, xR], { side: "top", plot: { x: xL, y: y0, width: xR - xL, height: y1 - y0 }, at: (x) => x }));
    m.ticks.forEach((t, i) => v.appendChild(svgLabel(tickText[i] ?? "", xT, yAt(t), { ...opts, anchor: "end", middle: true })));
    for (const [text, x] of [[m.data.from, xL], [m.data.to, xR]] as const) {
      const head = svgLabel(String(text ?? ""), x, headY, { ...opts, anchor: "middle", token: "fg" });
      head.style.fontWeight = "700";
      v.appendChild(head);
    }
    if (!m.has) {
      v.appendChild(svgLabel("no data", (xL + xR) / 2, (y0 + y1) / 2, { ...opts, anchor: "middle", middle: true }));
      return;
    }

    const tone = (r: Row): string => (r.i === m.best ? accent : fg);
    const ordered = [...m.rows.filter((r) => r.i !== m.best), ...m.rows.filter((r) => r.i === m.best)];
    for (const r of ordered) {
      if (Number.isFinite(r.a) && Number.isFinite(r.b)) {
        const d = linePath([[xL, yAt(r.a)], [xR, yAt(r.b)]]);
        v.appendChild(svg("path", { d, fill: "none", stroke: tone(r), "stroke-width": r.i === m.best ? 2.5 : 1 }));
      }
    }
    for (const r of ordered) {
      for (const [value, x] of [[r.a, xL], [r.b, xR]] as const) {
        if (Number.isFinite(value)) v.appendChild(svg("circle", { cx: x, cy: yAt(value), r: r.i === m.best ? 3.5 : 2.5, fill: tone(r) }));
      }
    }
    for (const dir of [-1, 1] as const) {
      const items = m.rows.filter((r) => Number.isFinite(dir < 0 ? r.a : r.b));
      const ys = items.map((r) => yAt(dir < 0 ? r.a : r.b));
      const at = relax(ys, LINE, y0, y1);
      const x = (dir < 0 ? xL : xR) + dir * LEAD;
      items.forEach((r, k) => {
        const y = ys[k] ?? 0;
        const to = at[k] ?? y;
        const text = dir < 0 ? m.left[r.i] : rightText[r.i];
        if (Math.abs(to - y) > 1) {
          v.appendChild(svg("line", { x1: x - dir * (LEAD - 3), y1: y, x2: x - dir * 2, y2: to, stroke: palette.colors.muted, "stroke-width": 1 }));
        }
        if (!text) return;
        const label = svgLabel(text, x, to, { ...opts, anchor: dir < 0 ? "end" : "start", middle: true, token: "fg" });
        label.style.whiteSpace = "pre";
        if (r.i === m.best) label.style.fontWeight = "700";
        v.appendChild(label);
      });
    }
  }

  function drawGlyph(): void {
    if (!grid) return;
    const g = grid;
    const { fg, accent, muted } = palette.colors;
    const m = parts(props);
    g.clear();
    const padC = g.cols >= 24 ? 1 : 0;
    const padR = g.rows >= 10 ? 1 : 0;
    const tickText = m.ticks.map((t) => formatNumber(t));
    const tickW = longest(tickText);
    const leftW = longest(m.left);
    const fit = span(g.cols - padC * 2, tickW, leftW, longest(m.wide), longest(m.narrow), 6, 14);
    /** The grid takes whole columns only, so a fractional offset or width would drop every mark. */
    const s = { ...fit, x: Math.floor(fit.x), plot: Math.max(1, Math.floor(fit.plot)) };
    const rightText = s.roomy ? m.wide : m.narrow;
    const xT = padC + s.x;
    const xL = xT + tickW + 1 + leftW + 2;
    const xR = xL + s.plot + 1;
    const top = padR + 1;
    const bottom = Math.max(top, g.rows - 1 - padR);
    const dots = (bottom - top + 1) * 4;
    const span1 = m.yHi - m.yLo || 1;
    const dotY = (value: number): number => ((m.yHi - value) / span1) * (dots - 1);
    const rowOf = (value: number): number => top + Math.floor(dotY(value) / 4);

    for (let row = top; row <= bottom; row++) {
      g.set(xL, row, "│", muted);
      g.set(xR, row, "│", muted);
    }
    m.ticks.forEach((t, i) => g.write(xT, rowOf(t), (tickText[i] ?? "").padStart(tickW), muted));
    for (const [text, x] of [[m.data.from, xL], [m.data.to, xR]] as const) {
      const name = String(text ?? "");
      g.write(Math.max(0, Math.min(g.cols - name.length, x - Math.floor(name.length / 2))), padR, name, fg);
    }
    if (!m.has) {
      g.write(Math.floor((xL + xR) / 2 - 3), Math.floor((top + bottom) / 2), "no data", muted);
      g.flush();
      return;
    }

    const blank = braille(0);
    const lines = [createBraillePlot(s.plot, bottom - top + 1), createBraillePlot(s.plot, bottom - top + 1)];
    for (const r of m.rows) {
      if (Number.isFinite(r.a) && Number.isFinite(r.b)) {
        const plot = lines[r.i === m.best ? 1 : 0];
        plot?.line(0, dotY(r.a), (plot?.width ?? 1) - 1, dotY(r.b));
      }
    }
    lines.forEach((plot, k) => plot.paint({ set: (x, y, glyph) => glyph !== blank && g.set(x, y, glyph, k ? accent : fg) }, xL + 1, top));

    const ordered = [...m.rows.filter((r) => r.i !== m.best), ...m.rows.filter((r) => r.i === m.best)];
    for (const r of ordered) {
      if (Number.isFinite(r.a)) g.set(xL, rowOf(r.a), "●", r.i === m.best ? accent : fg);
      if (Number.isFinite(r.b)) g.set(xR, rowOf(r.b), "●", r.i === m.best ? accent : fg);
    }
    for (const dir of [-1, 1] as const) {
      const items = m.rows.filter((r) => Number.isFinite(dir < 0 ? r.a : r.b));
      const rows = items.map((r) => rowOf(dir < 0 ? r.a : r.b));
      const at = relax(rows, 1, top, bottom);
      items.forEach((r, k) => {
        const row = rows[k] ?? top;
        const to = Math.round(at[k] ?? row);
        const text = (dir < 0 ? m.left[r.i] : rightText[r.i]) ?? "";
        if (to !== row) g.set(dir < 0 ? xL - 1 : xR + 1, to, (to < row) === (dir < 0) ? "╲" : "╱", muted);
        g.write(dir < 0 ? xL - 1 - text.length : xR + 2, to, text, fg);
      });
    }
    g.flush();
  }

  function draw(): void {
    labelHost(host, props.label, "figure");
    buildTable();
    if (props.look === "glyph") {
      if (view) {
        resize?.disconnect();
        resize = null;
        view.remove();
        view = null;
      }
      if (!grid) grid = createGrid(host, gridOptions(), draw);
      drawGlyph();
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
      drawSvg();
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
