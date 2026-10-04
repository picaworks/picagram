import { labelHost, unlabelHost } from "../../../lib/a11y";
import { bandScale, dataTable, formatNumber, linearScale, niceTicks, svg } from "../../../lib/chart";
import { gridLines, svgLabel } from "../../../lib/chart-marks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { sameJson } from "../../../lib/json";
import { cssVar, watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface BoxPlotProps {
  /** Groups to compare, each with a label and the raw values of its sample. Empty draws the axes and a muted "no data" note. */
  data: { label: string; values: number[] }[];
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** Index of the group whose median is drawn in the accent and printed. -1 picks the group with the highest median. */
  highlight: number;
  /** Whiskers reach the most extreme values within this multiple of the interquartile range of the box. */
  whisker: number;
  /** About this many rounded ticks on the value axis. */
  ticks: number;
  /** "svg" draws hairline axes, boxes, and circles. "glyph" draws the same plot in a monospace grid. */
  look: "svg" | "glyph";
  /** CSS font-family stack for every label. Must be monospace. */
  fontFamily: string;
}

export const defaults: BoxPlotProps = {
  data: [
    { label: "Build", values: [41, 44, 46, 47, 48, 49, 50, 51, 52, 52, 53, 54, 55, 56, 58, 59, 61, 63, 64, 96] },
    { label: "Test", values: [19, 21, 22, 22, 23, 24, 24, 25, 25, 26, 26, 27, 28, 28, 29, 31, 32, 33] },
    { label: "Lint", values: [8, 9, 9, 10, 11, 11, 12, 12, 13, 13, 14, 15, 16, 17, 19] },
    {
      label: "Deploy",
      values: [58, 63, 68, 72, 77, 81, 85, 89, 93, 97, 101, 104, 107, 111, 115, 119, 123, 127, 131, 135, 139, 143, 146, 148],
    },
    { label: "Rollback", values: [11, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 25, 27, 29, 31, 78] },
  ],
  label: "Task duration by stage, in seconds",
  highlight: -1,
  whisker: 1.5,
  ticks: 5,
  look: "svg",
  fontFamily: GRID_FONT,
};

interface Stat {
  label: string;
  n: number;
  /** Whisker ends, the quartiles, and the median. */
  lo: number;
  q1: number;
  med: number;
  q3: number;
  hi: number;
  /** The smallest and largest value of all, outliers included. */
  min: number;
  max: number;
  out: number[];
}

/** The value at probability p of an ascending sample, by linear interpolation at position (n - 1) * p. */
function quantile(sorted: readonly number[], p: number): number {
  const at = (sorted.length - 1) * p;
  const i = Math.floor(at);
  const a = sorted[i] ?? 0;
  return a + ((sorted[i + 1] ?? a) - a) * (at - i);
}

function summarize(group: { label?: unknown; values?: unknown }, k: number): Stat {
  const raw: unknown[] = Array.isArray(group?.values) ? group.values : [];
  const sorted = raw.filter((v): v is number => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const reach = (q3 - q1) * k;
  const inside = sorted.filter((v) => v >= q1 - reach && v <= q3 + reach);
  return {
    label: String(group?.label ?? ""),
    n,
    lo: inside[0] ?? q1,
    q1,
    med: quantile(sorted, 0.5),
    q3,
    hi: inside[inside.length - 1] ?? q3,
    min: sorted[0] ?? 0,
    max: sorted[n - 1] ?? 0,
    out: sorted.filter((v) => v < q1 - reach || v > q3 + reach),
  };
}

const round2 = (v: number): number => Number(v.toFixed(2));
const crisp = (v: number): number => Math.round(v) + 0.5;

export const mount: Mount<BoxPlotProps> = (host, initial = {}) => {
  let props: BoxPlotProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;
  const palette = watchPalette(host, () => draw());

  function stats(): Stat[] {
    const groups: unknown[] = Array.isArray(props.data) ? props.data : [];
    return groups.map((g) => summarize((g ?? {}) as { values?: unknown }, props.whisker));
  }

  /** The group drawn in the accent: the one named, or the highest median when `highlight` is -1. */
  function featured(all: readonly Stat[]): number {
    if (props.highlight >= 0) return props.highlight;
    let best = -1;
    all.forEach((s, i) => {
      if (s.n > 0 && (best < 0 || s.med > (all[best]?.med ?? 0))) best = i;
    });
    return best;
  }

  function gridOptions(): GridOptions {
    return { fontFamily: props.fontFamily, fontSize: 12, columns: 0, lineHeight: 1, renderer: "canvas", color: "" };
  }

  function renderTable(): void {
    table?.remove();
    const rows = stats().map((s) =>
      s.n === 0
        ? [s.label, 0, "", "", "", "", "", ""]
        : [s.label, s.n, round2(s.lo), round2(s.q1), round2(s.med), round2(s.q3), round2(s.hi), s.out.map(round2).join(", ")],
    );
    table = dataTable(props.label || "Box plot", ["Group", "n", "Min", "Q1", "Median", "Q3", "Max", "Outliers"], rows);
    host.appendChild(table);
  }

  /** Axis ticks spanning every value, or none when no group has one. */
  function axisOf(all: readonly Stat[]): number[] {
    const live = all.filter((s) => s.n > 0);
    if (live.length === 0) return [];
    return niceTicks(Math.min(...live.map((s) => s.min)), Math.max(...live.map((s) => s.max)), props.ticks);
  }

  /** A group name cut to `room` characters, with an ellipsis where it was cut. */
  function fit(text: string, room: number): string {
    return text.length <= room ? text : room > 1 ? `${text.slice(0, room - 1)}…` : text.slice(0, room);
  }

  function drawSvg(): void {
    const view = root;
    if (!view) return;
    while (view.firstChild) view.firstChild.remove();
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const size = 11;
    view.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const all = stats();
    const ticks = axisOf(all);
    const first = ticks[0] ?? 0;
    const last = ticks[ticks.length - 1] ?? 1;
    const cell = measureCell(props.fontFamily, size, 1);
    const tickChars = Math.max(1, ...ticks.map((t) => formatNumber(t).length));
    const em = 12;
    const x0 = em + tickChars * cell.w + 8;
    const x1 = Math.max(x0 + 1, w - em);
    const top = em;
    const bottom = Math.max(top + 1, h - em - size - 8);
    const y = linearScale([first, last], [bottom, top]);
    const plot = { x: x0, y: top, width: x1 - x0, height: bottom - top };

    view.appendChild(gridLines(ticks, { side: "left", plot, at: y, label: (t) => formatNumber(t), size }));
    view.appendChild(svg("line", { x1: crisp(x0), y1: top, x2: crisp(x0), y2: bottom, stroke: cssVar("muted"), "stroke-width": 1 }));
    if (ticks.length === 0) {
      view.appendChild(svg("line", { x1: x0, y1: crisp(bottom), x2: x1, y2: crisp(bottom), stroke: cssVar("muted"), "stroke-width": 1 }));
      view.appendChild(svgLabel("no data", (x0 + x1) / 2, (top + bottom) / 2, { anchor: "middle", middle: true, size, font: props.fontFamily }));
    }

    const bands = bandScale(all.length, [x0, x1], 2 / 3);
    const boxWidth = Math.max(6, bands.bandwidth);
    const lit = featured(all);
    // Thin the names to every other group when a band cannot hold three characters.
    const room = Math.floor((bands.step - 8) / cell.w);
    const skip = room < 3 ? 2 : 1;
    const stroke = { stroke: cssVar("fg"), "stroke-width": 1, fill: "none" };

    all.forEach((s, i) => {
      const left = crisp(bands.at(i) + (bands.bandwidth - boxWidth) / 2);
      const right = crisp(bands.at(i) + (bands.bandwidth + boxWidth) / 2);
      const mid = crisp((left + right) / 2);
      if (i % skip === 0) {
        const name = fit(s.label, Math.max(1, Math.floor((bands.step * skip - 8) / cell.w)));
        view.appendChild(svgLabel(name, mid, bottom + size + 8, { anchor: "middle", size, font: props.fontFamily }));
      }
      if (s.n === 0) return;
      const py = (v: number): number => crisp(y(v));
      const tint = i === lit ? cssVar("accent") : cssVar("fg");
      if (s.n > 1) {
        const cap = Math.max(2, Math.floor(boxWidth / 4));
        view.appendChild(svg("path", { ...stroke, d: `M${mid} ${py(s.q3)}V${py(s.hi)}M${mid - cap} ${py(s.hi)}H${mid + cap}M${mid} ${py(s.q1)}V${py(s.lo)}M${mid - cap} ${py(s.lo)}H${mid + cap}` }));
        view.appendChild(svg("rect", { ...stroke, x: left, y: py(s.q3), width: right - left, height: py(s.q1) - py(s.q3) }));
      }
      view.appendChild(svg("line", { x1: left, y1: py(s.med), x2: right, y2: py(s.med), stroke: tint, "stroke-width": 3 }));
      for (const v of s.out) view.appendChild(svg("circle", { ...stroke, cx: mid, cy: py(v), r: 3 }));
      if (i === lit) {
        view.appendChild(svgLabel(formatNumber(s.med), right + 8, py(s.med), { middle: true, size, token: "fg", font: props.fontFamily }));
      }
    });

    host.dataset.picaReady = "true";
  }

  function drawGlyph(): void {
    const g = grid;
    if (!g) return;
    g.clear();
    const { cols, rows } = g;
    const { fg, accent, muted } = palette.colors;
    const all = stats();
    const ticks = axisOf(all);
    const first = ticks[0] ?? 0;
    const last = ticks[ticks.length - 1] ?? 1;
    const tickChars = Math.max(1, ...ticks.map((t) => formatNumber(t).length));
    const labelRow = Math.max(2, rows - 2);
    const top = 1;
    const plotRows = Math.max(1, labelRow - top);
    const axis = 1 + tickChars + 1;
    const x0 = axis + 1;
    const plotCols = Math.max(1, cols - x0 - 1);

    for (let r = top; r < labelRow; r++) g.set(axis, r, "│", muted);
    if (ticks.length === 0) {
      const note = "no data";
      g.write(x0 + Math.max(0, Math.floor((plotCols - note.length) / 2)), top + Math.floor(plotRows / 2), note, muted);
    }
    /** Where a value falls down the plot, in cell rows from the top, fractional. */
    const along = (v: number): number => (last === first ? 0 : ((last - v) / (last - first)) * (plotRows - 1));
    /** The one row mapping: every tick, wall, cap, median and outlier lands on the row whose centre is nearest. */
    const rowOf = (v: number): number => top + Math.min(plotRows - 1, Math.max(0, Math.round(along(v))));

    for (const t of ticks) {
      const r = rowOf(t);
      const text = formatNumber(t);
      g.write(1 + tickChars - text.length, r, text, muted);
      g.set(axis, r, "┤", muted);
      g.write(x0, r, "┈".repeat(plotCols), muted);
    }

    const band = Math.max(1, Math.floor(plotCols / Math.max(1, all.length)));
    const wide = Math.max(3, Math.round(band / 3) | 1);
    const boxWidth = Math.max(3, Math.min(wide, (band - 2) | 1));
    const half = (boxWidth - 1) >> 1;
    const lit = featured(all);
    const skip = band < 4 ? 2 : 1;

    all.forEach((s, i) => {
      const cx = x0 + i * band + (band >> 1);
      if (i % skip === 0) {
        const name = fit(s.label, Math.max(1, band * skip - 1));
        g.write(Math.max(0, cx - (name.length >> 1)), labelRow, name, muted);
      }
      if (s.n === 0) return;
      const tint = i === lit ? accent : fg;
      const rM = rowOf(s.med);
      if (s.n === 1) {
        g.write(cx - half, rM, "━".repeat(boxWidth), tint);
        return;
      }
      const rT = rowOf(s.q3);
      const rB = rowOf(s.q1);
      const rH = rowOf(s.hi);
      const rL = rowOf(s.lo);
      for (let r = rH; r <= rL; r++) {
        if (r >= rT && r <= rB) continue;
        const end = r === rH || r === rL;
        g.set(cx, r, end ? (r === rH ? "┬" : "┴") : "│", fg);
        if (end) {
          g.set(cx - 1, r, "╶", fg);
          g.set(cx + 1, r, "╴", fg);
        }
      }
      for (let r = rT; r <= rB; r++) {
        const med = r === rM;
        const edgeT = r === rT;
        const edgeB = r === rB;
        const up = edgeT && rH < rT;
        const down = edgeB && rL > rB;
        // Both walls and the fill come from this one row, so the walls cannot part.
        const l = med ? "┣" : edgeT && edgeB ? "├" : edgeT ? "┌" : edgeB ? "└" : "│";
        const rr = med ? "┫" : edgeT && edgeB ? "┤" : edgeT ? "┐" : edgeB ? "┘" : "│";
        const fill = med ? "━" : edgeT || edgeB ? "─" : " ";
        const joint = med ? (up && down ? "╋" : up ? "┻" : down ? "┳" : "━") : up && down ? "┼" : up ? "┴" : down ? "┬" : fill;
        const color = med ? tint : fg;
        g.set(cx - half, r, l, color);
        g.set(cx + half, r, rr, color);
        for (let c = 1; c < boxWidth - 1; c++) g.set(cx - half + c, r, c === half ? joint : fill, color);
      }
      for (const v of s.out) g.set(cx, rowOf(v), "○", fg);
      if (i === lit) {
        const text = formatNumber(s.med);
        g.write(cx + half + 2, rM, fit(text, Math.max(1, band * 2 - boxWidth - 3)), fg);
      }
    });

    g.flush();
    host.dataset.picaReady = "true";
  }

  function draw(): void {
    if (grid) drawGlyph();
    else drawSvg();
  }

  function mountView(): void {
    if (props.look === "glyph") {
      grid = createGrid(host, gridOptions(), drawGlyph);
    } else {
      root = svg("svg", { "data-pica": "", "aria-hidden": "true", "font-family": props.fontFamily });
      root.style.cssText = "display:block;width:100%;height:100%";
      host.appendChild(root);
      resizeObserver = new ResizeObserver(drawSvg);
      resizeObserver.observe(host);
    }
  }

  function unmountView(): void {
    resizeObserver?.disconnect();
    resizeObserver = null;
    root?.remove();
    root = null;
    grid?.destroy();
    grid = null;
  }

  labelHost(host, props.label, "figure");
  renderTable();
  mountView();
  draw();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      palette.refresh();
      if (props.label !== before.label) labelHost(host, props.label, "figure");
      if (props.label !== before.label || props.whisker !== before.whisker || !sameJson(props.data, before.data)) renderTable();
      if (props.look !== before.look) {
        unmountView();
        mountView();
      } else if (grid && props.fontFamily !== before.fontFamily) {
        grid.update(gridOptions());
      }
      draw();
    },
    destroy() {
      unmountView();
      palette.destroy();
      table?.remove();
      table = null;
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
