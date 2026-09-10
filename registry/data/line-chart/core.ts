import { labelHost, unlabelHost } from "../../../lib/a11y";
import { braille, brailleDot } from "../../../lib/blocks";
import { areaPath, dataTable, extent, formatNumber, linearScale, linePath, niceTicks, svg } from "../../../lib/chart";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface LineChartSeries {
  /** Name for this series, shown at its line's end in the svg look and as its column in the data table. */
  name: string;
  /** One value per label, in the same order as data.labels. A value that is not a finite number opens a gap. */
  values: number[];
}

export interface LineChartData {
  /** Category under each column, in the order plotted along the x axis. */
  labels: string[];
  /** One or more series over the same labels. The first series draws in the accent color. */
  series: LineChartSeries[];
}

export interface LineChartProps {
  /** Labels and series to plot. */
  data: LineChartData;
  /** Name assistive technology reads for the chart, before its data table. Empty hides the chart from it. */
  label: string;
  /** Fills the area under the first series with the accent color, at low opacity. Only the svg look draws it. */
  area: boolean;
  /** Marks each point of every series. Only the svg look draws it. */
  dots: boolean;
  /** "svg" draws hairline axes and lines with lib/chart.ts. "glyph" draws the same lines as braille dots in a monospace grid. */
  look: "svg" | "glyph";
  /** Approximate number of horizontal tick lines on the y axis, from 2 to 10. */
  ticks: number;
  /** CSS font-family stack for every label and number. Must be monospace. */
  fontFamily: string;
}

export const defaults: LineChartProps = {
  data: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    series: [
      { name: "Requests", values: [12, 15, 18, 22, 26, 21, 19, 23, 29, 33, 37, 40] },
      { name: "Errors", values: [2, 1, 2, 3, 2, 4, 5, 6, 4, 3, 2, 1] },
    ],
  },
  label: "Requests and errors per month",
  area: true,
  dots: false,
  look: "svg",
  ticks: 5,
  fontFamily: GRID_FONT,
};

/** Pixel size of the labels the svg look draws, and the gap it keeps around a mark. */
const LABEL_SIZE = 10;
const GAP = 6;

/** The chart's labels and series, defaulting missing pieces to empty since a caller may pass a partial object. */
function chartParts(props: LineChartProps): { labels: string[]; series: LineChartSeries[] } {
  return { labels: props.data.labels ?? [], series: props.data.series ?? [] };
}

/** `count` values resampled from `source` by linear interpolation along its index. A sample stays a gap when
 *  either value it interpolates between is not a finite number. */
function resample(source: readonly number[], count: number): number[] {
  const last = Math.max(0, source.length - 1);
  const out = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? (i * last) / (count - 1) : 0;
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, last);
    const a = source[lo];
    const b = source[hi];
    out[i] = Number.isFinite(a) && Number.isFinite(b) ? (a as number) + ((b as number) - (a as number)) * (t - lo) : Number.NaN;
  }
  return out;
}

/** One series' plotted points, split into runs wherever a value is not a finite number. */
function seriesRuns(xs: readonly number[], raw: readonly number[], yAt: (value: number) => number): (readonly [number, number])[][] {
  const out: (readonly [number, number])[][] = [];
  let run: (readonly [number, number])[] = [];
  for (let i = 0; i < xs.length; i++) {
    const v = raw[i];
    if (Number.isFinite(v)) run.push([xs[i] ?? 0, yAt(v as number)]);
    else if (run.length > 0) {
      out.push(run);
      run = [];
    }
  }
  if (run.length > 0) out.push(run);
  return out;
}

/** A value formatted for the hidden data table, or blank where there is none. */
function cellText(value: number | undefined): string {
  return Number.isFinite(value) ? formatNumber(value as number, { compact: false }) : "";
}

export const mount: Mount<LineChartProps> = (host, initial = {}) => {
  let props: LineChartProps = { ...defaults, ...initial };
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
    const { labels, series } = chartParts(props);
    table = dataTable(
      props.label || "Line chart",
      ["", ...series.map((s) => s.name)],
      labels.map((text, i) => [text, ...series.map((s) => cellText((s.values ?? [])[i]))]),
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

    const { fg, accent, muted } = palette.colors;
    const { labels, series } = chartParts(props);
    const finite = series.flatMap((s) => (s.values ?? []).filter((value) => Number.isFinite(value)));
    const has = labels.length > 0 && series.length > 0 && finite.length > 0;
    const [lo, hi] = has ? extent(finite) : [0, 1];
    const tickValues = niceTicks(lo, hi, Math.max(2, Math.min(10, Math.round(props.ticks))));
    const yLo = tickValues[0] ?? 0;
    const yHi = tickValues[tickValues.length - 1] ?? 1;

    const charW = measureCell(props.fontFamily, LABEL_SIZE, 1).w;
    const tickText = tickValues.map((t) => formatNumber(t));
    const longestName = Math.max(0, ...series.map((s) => s.name.length));
    const marginLeft = Math.max(...tickText.map((t) => t.length), 1) * charW + GAP * 2;
    const marginRight = has && longestName > 0 ? longestName * charW + GAP * 2 : GAP;
    const marginTop = GAP * 2;
    const marginBottom = labels.length > 0 ? LABEL_SIZE + GAP * 2 : GAP;
    const x0 = marginLeft;
    const x1 = Math.max(x0 + 1, w - marginRight);
    const y0 = marginTop;
    const y1 = Math.max(y0 + 1, h - marginBottom);

    const xAt = linearScale([0, Math.max(1, labels.length - 1)], [x0, x1]);
    const yAt = linearScale([yLo, yHi], [y1, y0]);
    const font = { "font-family": props.fontFamily, "font-size": LABEL_SIZE };

    tickValues.forEach((t, i) => {
      const y = yAt(t);
      v.appendChild(svg("line", { x1: x0, y1: y, x2: x1, y2: y, stroke: muted, "stroke-width": 1 }));
      const el = svg("text", { x: x0 - GAP, y, "text-anchor": "end", "dominant-baseline": "middle", fill: muted, ...font });
      el.textContent = tickText[i] ?? "";
      v.appendChild(el);
    });

    if (labels.length > 0) {
      const maxLen = Math.max(...labels.map((l) => l.length), 1);
      const spacing = labels.length > 1 ? (x1 - x0) / (labels.length - 1) : x1 - x0;
      const step = Math.max(1, Math.ceil((maxLen * charW + GAP) / Math.max(1, spacing)));
      labels.forEach((text, i) => {
        if (i % step !== 0 && i !== labels.length - 1) return;
        const el = svg("text", { x: xAt(i), y: y1 + GAP + LABEL_SIZE, "text-anchor": "middle", fill: muted, ...font });
        el.textContent = text;
        v.appendChild(el);
      });
    }

    if (!has) {
      const note = svg("text", { x: (x0 + x1) / 2, y: (y0 + y1) / 2, "text-anchor": "middle", "dominant-baseline": "middle", fill: muted, ...font });
      note.textContent = "no data";
      v.appendChild(note);
      return;
    }

    const xs = labels.map((_, i) => xAt(i));
    series.forEach((s, si) => {
      const tone = si === 0 ? accent : si % 2 === 1 ? fg : muted;
      const raw = s.values ?? [];
      const runs = seriesRuns(xs, raw, yAt);
      for (const run of runs) {
        if (props.area && si === 0) v.appendChild(svg("path", { d: areaPath(run, y1), fill: accent, "fill-opacity": 0.15 }));
        if (run.length > 1) v.appendChild(svg("path", { d: linePath(run), fill: "none", stroke: tone, "stroke-width": 1.5 }));
        if (props.dots) for (const [px, py] of run) v.appendChild(svg("circle", { cx: px, cy: py, r: 2, fill: tone }));
      }
      const lastRun = runs[runs.length - 1];
      const end = lastRun?.[lastRun.length - 1];
      if (end) {
        const el = svg("text", { x: end[0] + GAP, y: end[1], "text-anchor": "start", "dominant-baseline": "middle", fill: tone, ...font });
        el.textContent = s.name;
        v.appendChild(el);
      }
    });
  }

  function drawGlyph(): void {
    if (!grid) return;
    const g = grid;
    const { fg, accent, muted } = palette.colors;
    const { labels, series } = chartParts(props);
    const finite = series.flatMap((s) => (s.values ?? []).filter((value) => Number.isFinite(value)));
    const has = labels.length > 0 && series.length > 0 && finite.length > 0;
    const [lo, hi] = has ? extent(finite) : [0, 1];
    const tickValues = niceTicks(lo, hi, Math.max(2, Math.min(10, Math.round(props.ticks))));
    const yLo = tickValues[0] ?? 0;
    const yHi = tickValues[tickValues.length - 1] ?? 1;
    const span = yHi - yLo || 1;

    g.clear();
    const tickText = tickValues.map((t) => formatNumber(t));
    const gutter = Math.min(Math.max(1, g.cols - 1), Math.max(...tickText.map((t) => t.length), 1) + 1);
    const bottom = labels.length > 0 && g.rows > 1 ? 1 : 0;
    const plotCols = Math.max(1, g.cols - gutter);
    const plotRows = Math.max(1, g.rows - bottom);

    tickValues.forEach((t, i) => {
      const row = Math.round(((yHi - t) / span) * (plotRows - 1));
      if (row < 0 || row >= plotRows) return;
      g.write(0, row, (tickText[i] ?? "").padStart(gutter - 1), muted);
    });

    if (bottom > 0) {
      const denom = Math.max(1, labels.length - 1);
      const maxLen = Math.max(...labels.map((l) => l.length), 1);
      const perLabel = plotCols / denom;
      const step = Math.max(1, Math.ceil((maxLen + 1) / Math.max(1, perLabel)));
      labels.forEach((text, i) => {
        if (i % step !== 0 && i !== labels.length - 1) return;
        const at = gutter + Math.round((i / denom) * (plotCols - 1)) - Math.floor(text.length / 2);
        g.write(Math.max(gutter, Math.min(g.cols - text.length, at)), g.rows - 1, text, muted);
      });
    }

    if (!has) {
      const note = "no data";
      g.write(gutter + Math.max(0, Math.floor((plotCols - note.length) / 2)), Math.floor(plotRows / 2), note, muted);
      g.flush();
      return;
    }

    const dotCols = Math.max(1, plotCols * 2);
    const dotRows = Math.max(1, plotRows * 4);
    const bits = new Array<number>(plotCols * plotRows).fill(0);
    const tint = new Array<string | undefined>(plotCols * plotRows);
    series.forEach((s, si) => {
      const tone = si === 0 ? accent : si % 2 === 1 ? fg : muted;
      const vals = resample(s.values ?? [], dotCols);
      for (let dc = 0; dc < dotCols; dc++) {
        const value = vals[dc];
        if (!Number.isFinite(value)) continue;
        const v = value as number;
        const t = (v - yLo) / span;
        const dr = Math.min(dotRows - 1, Math.max(0, Math.round((1 - t) * (dotRows - 1))));
        const cx = Math.min(plotCols - 1, Math.floor(dc / 2));
        const cy = Math.min(plotRows - 1, Math.floor(dr / 4));
        const idx = cy * plotCols + cx;
        bits[idx] = (bits[idx] ?? 0) | brailleDot(dr % 4, dc % 2);
        if (tint[idx] === undefined) tint[idx] = tone;
      }
    });
    for (let cy = 0; cy < plotRows; cy++) {
      for (let cx = 0; cx < plotCols; cx++) {
        const idx = cy * plotCols + cx;
        if (bits[idx]) g.set(gutter + cx, cy, braille(bits[idx] ?? 0), tint[idx]);
      }
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
