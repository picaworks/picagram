import { dataTable, extent, formatNumber, linePath, linearScale, niceTicks, svg } from "../../../lib/chart";
import { gridLines, svgLabel } from "../../../lib/chart-marks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type Grid } from "../../../lib/glyph-grid";
import { hostAttributes, styleHost } from "../../../lib/host";
import { changed } from "../../../lib/json";
import { cssVar, watchPalette } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import type { Mount } from "../../../lib/types";

export interface FanChartInterval {
  /** Display name for this uncertainty interval, such as 80%. */
  label: string;
  /** Lower bounds aligned with series indices; null leaves a gap. */
  lower: (number | null)[];
  /** Upper bounds aligned with series indices; null leaves a gap. */
  upper: (number | null)[];
}

export interface FanChartProps {
  /** Central values in time order; null leaves a gap rather than implying zero. */
  series: (number | null)[];
  /** Supplied uncertainty envelopes; reversed or nonfinite bound pairs are omitted. */
  intervals: FanChartInterval[];
  /** Time labels aligned with the central series and bounds. */
  labels: string[];
  /** Accessible chart name and numeric table caption; empty hides the chart. */
  label: string;
  /** Glyph uses measured ink density; SVG draws exact piecewise-linear envelopes. */
  look: "glyph" | "svg";
}

export const defaults: FanChartProps = {
  series: [74, 76, 73, 78, 80, 83, 85, 88, 91, 94, 97, 100],
  intervals: [
    { label: "50%", lower: [null, null, null, null, 80, 81, 82, 84, 86, 88, 90, 92], upper: [null, null, null, null, 80, 85, 88, 92, 96, 100, 104, 108] },
    { label: "80%", lower: [null, null, null, null, 80, 79, 79, 79, 80, 81, 82, 83], upper: [null, null, null, null, 80, 87, 91, 97, 102, 107, 112, 117] },
    { label: "95%", lower: [null, null, null, null, 80, 77, 75, 74, 73, 72, 71, 70], upper: [null, null, null, null, 80, 89, 95, 102, 109, 116, 123, 130] },
  ],
  labels: ["Q1 '25", "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26", "Q2 '26", "Q3 '26", "Q4 '26", "Q1 '27", "Q2 '27", "Q3 '27", "Q4 '27"],
  label: "Quarterly central forecast with supplied 50%, 80%, and 95% uncertainty bounds",
  look: "glyph",
};

type FanChartBand = { label: string; lower: (number | null)[]; upper: (number | null)[]; width: number };
type FanChartData = { central: (number | null)[]; bands: FanChartBand[]; count: number; ticks: number[]; domain: [number, number]; valid: boolean };

function fanChartFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function fanChartPrepare(props: FanChartProps): FanChartData {
  const source = Array.isArray(props.series) ? props.series : [];
  const intervals = (Array.isArray(props.intervals) ? props.intervals : []).filter((band) => band && Array.isArray(band.lower) && Array.isArray(band.upper)).slice(0, 12);
  const count = Math.min(512, Math.max(source.length, ...intervals.map((band) => Math.max(band.lower.length, band.upper.length)), 0));
  const central = Array.from({ length: count }, (_, index) => fanChartFinite(source[index]));
  const bands = intervals.map((band, ordinal) => {
    const lower: (number | null)[] = [];
    const upper: (number | null)[] = [];
    let width = 0;
    let validCount = 0;
    for (let index = 0; index < count; index++) {
      const lo = fanChartFinite(band.lower[index]);
      const hi = fanChartFinite(band.upper[index]);
      const valid = lo !== null && hi !== null && lo <= hi;
      lower.push(valid ? lo : null);
      upper.push(valid ? hi : null);
      if (valid) { width += hi - lo; validCount++; }
    }
    return { label: typeof band.label === "string" && band.label ? band.label : `Interval ${ordinal + 1}`, lower, upper, width: width / Math.max(1, validCount) };
  });
  const values = [...central, ...bands.flatMap((band) => [...band.lower, ...band.upper])].filter((value): value is number => value !== null);
  const [min, max] = extent(values);
  const ticks = niceTicks(min, max, 5);
  return { central, bands, count, ticks, domain: [ticks[0] ?? 0, ticks[ticks.length - 1] ?? 1], valid: values.length > 0 };
}

function fanChartSample(values: readonly (number | null)[], index: number): number | null {
  const low = Math.floor(index);
  const high = Math.min(values.length - 1, Math.ceil(index));
  const a = values[low], b = values[high];
  if (a === null || b === null || a === undefined || b === undefined) return null;
  return a + (b - a) * (index - low);
}

function fanChartRuns(count: number, valid: (index: number) => boolean): number[][] {
  const runs: number[][] = [];
  let run: number[] = [];
  for (let index = 0; index < count; index++) {
    if (valid(index)) run.push(index);
    else if (run.length) { runs.push(run); run = []; }
  }
  if (run.length) runs.push(run);
  return runs;
}

function fanChartIndices(count: number, capacity: number): number[] {
  const ticks = Math.min(count, Math.max(1, Math.floor(capacity)));
  if (ticks <= 1) return count ? [0] : [];
  return Array.from({ length: ticks }, (_, index) => Math.round(index * (count - 1) / (ticks - 1)));
}

export const mount: Mount<FanChartProps> = (host, initial = {}) => {
  let props: FanChartProps = { ...defaults, ...initial };
  let data = fanChartPrepare(props);
  let alive = true;
  let grid: Grid | null = null;
  let graphic: SVGSVGElement | null = null;
  let table: HTMLTableElement | null = null;
  const attrs = hostAttributes(host);
  const restore = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
  const frame = document.createElement("div");
  frame.setAttribute("data-pica", "");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${cssVar("bg")}`;
  host.append(frame);
  const palette = watchPalette(host, () => draw());

  function accessibility(): void {
    const label = props.label.trim();
    attrs.set("role", label ? "group" : null);
    attrs.set("aria-label", label || null);
    attrs.set("aria-hidden", label ? null : "true");
  }

  function timeLabel(index: number): string {
    return typeof props.labels[index] === "string" ? props.labels[index] : String(index + 1);
  }

  function updateTable(): void {
    table?.remove();
    const head = ["Period", "Central", ...data.bands.flatMap((band) => [`${band.label} lower`, `${band.label} upper`])];
    const rows = Array.from({ length: data.count }, (_, index) => [timeLabel(index), data.central[index] ?? "Missing", ...data.bands.flatMap((band) => [band.lower[index] ?? "Missing", band.upper[index] ?? "Missing"])]);
    table = dataTable(props.label || "Fan chart", head, rows);
    for (const node of table.querySelectorAll("*")) node.setAttribute("data-pica", "");
    host.append(table);
  }

  function sortedBands(): FanChartBand[] {
    return [...data.bands].sort((a, b) => b.width - a.width);
  }

  function drawSvg(): void {
    graphic?.remove();
    const width = Math.max(1, frame.clientWidth);
    const height = Math.max(1, frame.clientHeight);
    const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}` });
    root.style.cssText = "display:block;width:100%;height:100%";
    graphic = root;
    frame.append(root);
    const longestTick = Math.max(...data.ticks.map((tick) => formatNumber(tick, { locale: "en-US" }).length), 1);
    const left = Math.min(width * 0.3, Math.max(36, longestTick * 7 + 10));
    const plot = { x: left, y: 42, width: Math.max(1, width - left - 18), height: Math.max(1, height - 82) };
    const x = linearScale([0, Math.max(1, data.count - 1)], [plot.x, plot.x + plot.width]);
    const y = linearScale(data.domain, [plot.y + plot.height, plot.y]);
    const atX = (index: number): number => data.count === 1 ? plot.x + plot.width / 2 : x(index);
    const guides = gridLines(data.ticks, { side: "left", plot, at: y, label: (value) => formatNumber(value, { locale: "en-US" }), size: 11 });
    for (const line of guides.querySelectorAll("line")) line.setAttribute("stroke-opacity", "0.22");
    root.append(guides);
    root.append(svg("line", { x1: plot.x, y1: plot.y + plot.height, x2: plot.x + plot.width, y2: plot.y + plot.height, stroke: cssVar("muted"), "stroke-width": 1 }));
    const bands = sortedBands();
    bands.forEach((band, level) => {
      const opacity = 0.12 + (level / Math.max(1, bands.length - 1)) * 0.16;
      for (const run of fanChartRuns(data.count, (index) => band.lower[index] !== null && band.upper[index] !== null)) {
        const upper = run.map((index): [number, number] => [atX(index), y(band.upper[index] as number)]);
        const lower = [...run].reverse().map((index): [number, number] => [atX(index), y(band.lower[index] as number)]);
        if (run.length === 1) {
          const index = run[0] as number;
          root.append(svg("line", { x1: atX(index), x2: atX(index), y1: y(band.lower[index] as number), y2: y(band.upper[index] as number), stroke: cssVar("fg"), "stroke-opacity": opacity + 0.2, "stroke-width": 3 }));
        } else {
          const path = linePath([...upper, ...lower]) + "Z";
          root.append(svg("path", { d: path, fill: cssVar("fg"), "fill-opacity": opacity, stroke: cssVar("fg"), "stroke-opacity": 0.24, "stroke-width": 0.7 }));
        }
      }
    });
    for (const run of fanChartRuns(data.count, (index) => data.central[index] !== null)) {
      const points = run.map((index): [number, number] => [atX(index), y(data.central[index] as number)]);
      root.append(svg("path", { d: linePath(points), fill: "none", stroke: cssVar("accent"), "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      for (const [cx, cy] of points) root.append(svg("circle", { cx, cy, r: 2.2, fill: cssVar("accent") }));
    }
    const capacity = Math.max(2, Math.floor(plot.width / 88));
    for (const index of fanChartIndices(data.count, capacity)) {
      const label = svgLabel(timeLabel(index).slice(0, 14), atX(index), plot.y + plot.height + 23, { size: 11, anchor: index === 0 ? "start" : index === data.count - 1 ? "end" : "middle" });
      const title = svg("title");
      title.textContent = timeLabel(index);
      label.append(title);
      root.append(label);
    }
    root.append(svg("line", { x1: plot.x, x2: plot.x + 14, y1: 19, y2: 19, stroke: cssVar("accent"), "stroke-width": 2 }));
    root.append(svgLabel("Central", plot.x + 20, 23, { token: "fg", size: 11 }));
    let legendX = plot.x + 88;
    for (const band of data.bands) {
      const name = band.label.slice(0, 18);
      if (legendX + name.length * 7 > width - 12) break;
      root.append(svg("rect", { x: legendX, y: 13, width: 8, height: 8, fill: cssVar("fg"), "fill-opacity": 0.3 }));
      root.append(svgLabel(name, legendX + 14, 23, { token: "fg", size: 11 }));
      legendX += name.length * 7 + 32;
    }
    if (!data.valid) root.append(svgLabel("NO VALID DATA", plot.x + plot.width / 2, plot.y + plot.height / 2, { anchor: "middle", size: 12 }));
    for (const node of root.querySelectorAll("*")) node.setAttribute("data-pica", "");
  }

  function drawGlyph(): void {
    if (!grid) return;
    const g = grid;
    const colors = palette.colors;
    const ramp = measureRamp(" .:-=+*#%@", GRID_FONT, 1.25);
    g.clear();
    const tickStrings = data.ticks.map((value) => formatNumber(value, { locale: "en-US" }));
    const left = Math.max(2, Math.min(Math.floor(g.cols / 3), Math.max(...tickStrings.map((text) => text.length), 1) + 2));
    const right = Math.max(left + 1, g.cols - 3);
    const top = 4;
    const bottom = Math.max(top + 1, g.rows - 4);
    const x = linearScale([0, Math.max(1, data.count - 1)], [left, right]);
    const y = linearScale(data.domain, [bottom, top]);
    const atX = (index: number): number => data.count === 1 ? (left + right) / 2 : x(index);
    for (let index = 0; index < data.ticks.length; index++) {
      const value = data.ticks[index] as number;
      const row = Math.round(y(value));
      const label = tickStrings[index] ?? "";
      g.write(Math.max(0, left - label.length - 1), row, label, colors.muted);
      for (let col = left; col <= right; col++) if ((col - left) % 3 === 0) g.set(col, row, "·", colors.muted);
    }
    const bands = sortedBands();
    for (let col = left; col <= right; col++) {
      if (data.count < 2) continue;
      const position = (col - left) / Math.max(1, right - left) * (data.count - 1);
      bands.forEach((band, level) => {
        const lo = fanChartSample(band.lower, position);
        const hi = fanChartSample(band.upper, position);
        if (lo === null || hi === null) return;
        const shade = pick(ramp, 0.28 + 0.42 * (level + 1) / Math.max(1, bands.length));
        const firstRow = Math.max(top, Math.ceil(y(hi)));
        const lastRow = Math.min(bottom, Math.floor(y(lo)));
        for (let row = firstRow; row <= lastRow; row++) g.set(col, row, shade, colors.fg);
      });
    }
    if (data.count === 1) {
      for (const band of bands) {
        const lo = band.lower[0], hi = band.upper[0];
        if (lo === null || hi === null || lo === undefined || hi === undefined) continue;
        for (let row = Math.ceil(y(hi)); row <= Math.floor(y(lo)); row++) g.set(Math.round(atX(0)), row, pick(ramp, 0.5), colors.fg);
      }
    }
    function segment(a: [number, number], b: [number, number]): void {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
      for (let step = 0; step <= steps; step++) g.set(Math.round(a[0] + (b[0] - a[0]) * step / steps), Math.round(a[1] + (b[1] - a[1]) * step / steps), "•", colors.accent);
    }
    for (const run of fanChartRuns(data.count, (index) => data.central[index] !== null)) {
      run.forEach((index, ordinal) => {
        const point: [number, number] = [atX(index), y(data.central[index] as number)];
        const prior = run[ordinal - 1];
        if (prior === undefined) segment(point, point);
        else segment([atX(prior), y(data.central[prior] as number)], point);
      });
    }
    g.set(left, 1, "━", colors.accent);
    g.write(left + 2, 1, "Central", colors.fg);
    g.write(left + 11, 1, data.bands.map((band) => band.label).join(" / ").slice(0, Math.max(0, g.cols - left - 12)), colors.fg);
    for (const index of fanChartIndices(data.count, Math.max(2, Math.floor((right - left) / 11)))) {
      const label = timeLabel(index).slice(0, 10);
      const col = Math.max(left, Math.min(right - label.length + 1, Math.round(atX(index) - label.length / 2)));
      g.write(col, bottom + 2, label, colors.muted);
    }
    if (!data.valid) g.write(Math.max(left, Math.floor((left + right - 13) / 2)), Math.round((top + bottom) / 2), "NO VALID DATA", colors.muted);
    g.flush();
  }

  function draw(): void {
    if (!alive) return;
    if (grid) drawGlyph(); else drawSvg();
    attrs.set("data-pica-ready", "true");
  }

  function mountView(): void {
    if (props.look === "glyph") grid = createGrid(frame, { fontFamily: GRID_FONT, fontSize: 12, columns: 0, lineHeight: 1.25, renderer: "canvas", color: "" }, draw);
    draw();
  }

  const resize = new ResizeObserver(() => { if (alive && !grid) draw(); });
  resize.observe(frame);
  accessibility();
  updateTable();
  mountView();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const dataChanged = changed(before, props, ["series", "intervals"]);
      if (dataChanged) data = fanChartPrepare(props);
      if (dataChanged || changed(before, props, ["labels", "label"])) updateTable();
      if (before.label !== props.label) accessibility();
      palette.refresh();
      if (before.look !== props.look) {
        grid?.destroy(); grid = null;
        graphic?.remove(); graphic = null;
        mountView();
      } else if (dataChanged || changed(before, props, ["labels", "label"]) || grid) draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      resize.disconnect();
      grid?.destroy();
      palette.destroy();
      frame.remove();
      table?.remove();
      attrs.restore();
      restore();
    },
  };
};
