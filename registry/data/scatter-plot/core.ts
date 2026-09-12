import { labelHost, unlabelHost } from "../../../lib/a11y";
import { dataTable, extent, formatNumber, linearScale, niceTicks, svg } from "../../../lib/chart";
import { chartCells, chartDots, type ChartInset } from "../../../lib/chart-plot";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { sameJson } from "../../../lib/json";
import { cssVar, readPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ScatterPlotProps {
  /** Points to plot, each with x, y, and optional label. Empty draws the axes and a muted "no data" note. */
  data: { x: number; y: number; label?: string }[];
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** Labels of points to highlight and label directly. */
  highlight: string[];
  /** Draws a least-squares fit line through the data. */
  fit: boolean;
  /** Label for the x-axis. */
  xLabel: string;
  /** Label for the y-axis. */
  yLabel: string;
  /** Radius of each point in CSS pixels. */
  dotSize: number;
  /** About this many rounded ticks on each axis, in the svg look. */
  ticks: number;
  /** "svg" draws hairline axes and circles. "glyph" draws the same points in a monospace grid. */
  look: "svg" | "glyph";
  /** CSS font-family stack for every label. Must be monospace. */
  fontFamily: string;
}

export const defaults: ScatterPlotProps = {
  data: [
    { x: 0, y: 10, label: "Zero" },
    { x: 1, y: 12 },
    { x: 2, y: 15 },
    { x: 3, y: 18 },
    { x: 4, y: 20, label: "Four" },
    { x: 5, y: 22 },
    { x: 6, y: 25 },
    { x: 7, y: 28 },
    { x: 8, y: 30 },
    { x: 9, y: 32 },
    { x: 1.5, y: 14 },
    { x: 2.5, y: 16 },
    { x: 3.5, y: 19 },
    { x: 4.5, y: 21 },
    { x: 5.5, y: 23 },
    { x: 6.5, y: 26 },
    { x: 7.5, y: 29 },
    { x: 8.5, y: 31 },
    { x: 0.5, y: 11 },
    { x: 1.8, y: 13 },
    { x: 3.2, y: 17 },
    { x: 4.8, y: 21 },
    { x: 6.2, y: 24 },
    { x: 7.2, y: 27 },
    { x: 8.2, y: 31 },
    { x: 9.2, y: 33 },
    { x: 2.2, y: 15 },
    { x: 5.2, y: 23 },
    { x: 6.8, y: 26 },
    { x: 8.8, y: 32 },
    { x: 0.8, y: 12 },
    { x: 3.8, y: 19 },
    { x: 7.8, y: 29 },
    { x: 9.8, y: 33 },
  ],
  label: "Score against hours studied",
  highlight: ["Zero", "Four"],
  fit: false,
  xLabel: "Hours",
  yLabel: "Score",
  dotSize: 2,
  ticks: 5,
  look: "svg",
  fontFamily: GRID_FONT,
};

/** Compute least-squares fit line through points, returning [slope, intercept]. */
function fitLine(data: readonly { x: number; y: number }[]): [number, number] | null {
  const valid = data.filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));
  if (valid.length < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const d of valid) {
    sumX += d.x;
    sumY += d.y;
    sumXY += d.x * d.y;
    sumX2 += d.x * d.x;
  }

  const n = valid.length;
  const meanX = sumX / n;
  const meanY = sumY / n;
  const slope = (sumXY - n * meanX * meanY) / (sumX2 - n * meanX * meanX);
  const intercept = meanY - slope * meanX;

  return Number.isFinite(slope) && Number.isFinite(intercept) ? [slope, intercept] : null;
}

function gridOptions(p: ScatterPlotProps): GridOptions {
  return { fontFamily: p.fontFamily, fontSize: 12, columns: 0, lineHeight: 1, renderer: "canvas", color: "" };
}

function makeDataTable(host: HTMLElement, props: ScatterPlotProps): void {
  const existing = host.querySelector("table[data-pica]");
  existing?.remove();
  const rows = props.data.map((d) => [d.label ?? `(${formatNumber(d.x, { compact: false })}, ${formatNumber(d.y, { compact: false })})`, d.x, d.y]);
  const table = dataTable(props.label || "Scatter plot", ["Label", "X", "Y"], rows);
  host.appendChild(table);
}

function drawSvg(host: HTMLElement, props: ScatterPlotProps): void {
  const existing = host.querySelector("svg[data-pica]");
  if (existing) existing.remove();

  const w = Math.max(1, host.clientWidth);
  const h = Math.max(1, host.clientHeight);
  const fontSize = 11;
  const root = svg("svg", { "data-pica": "", "aria-hidden": "true" });
  root.setAttribute("viewBox", `0 0 ${w} ${h}`);
  root.setAttribute("font-family", props.fontFamily);
  root.setAttribute("font-size", String(fontSize));
  root.style.cssText = "display:block;width:100%;height:100%";
  host.appendChild(root);

  const data = props.data.filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));
  const empty = data.length === 0;

  const [minX, maxX] = empty ? [0, 1] : extent(data.map((d) => d.x));
  const [minY, maxY] = empty ? [0, 1] : extent(data.map((d) => d.y));

  const xTicks = empty ? [] : niceTicks(minX, maxX, props.ticks);
  const yTicks = empty ? [] : niceTicks(minY, maxY, props.ticks);

  const xFirst = xTicks[0] ?? minX;
  const xLast = xTicks[xTicks.length - 1] ?? maxX;
  const yFirst = yTicks[0] ?? minY;
  const yLast = yTicks[yTicks.length - 1] ?? maxY;

  const maxYTickChars = Math.max(1, ...yTicks.map((t) => formatNumber(t).length));
  const cell = measureCell(props.fontFamily, fontSize, 1);

  const left = 12 + maxYTickChars * cell.w;
  const right = 8;
  const top = 8;
  const bottom = fontSize + 14;

  const chartLeft = left;
  const chartRight = Math.max(chartLeft + 1, w - right);
  const chartTop = top;
  const chartBottom = Math.max(chartTop + 1, h - bottom);

  const scaleX = linearScale([xFirst, xLast], [chartLeft, chartRight]);
  const scaleY = linearScale([yFirst, yLast], [chartBottom, chartTop]);

  // Draw y-axis gridlines and ticks
  for (const t of yTicks) {
    const ty = scaleY(t);
    root.appendChild(svg("line", { x1: chartLeft, y1: ty, x2: chartRight, y2: ty, stroke: cssVar("muted"), "stroke-width": 1 }));
    const tickLabel = svg("text", { x: chartLeft - 6, y: ty, "text-anchor": "end", "dominant-baseline": "middle", fill: cssVar("muted") });
    tickLabel.textContent = formatNumber(t);
    root.appendChild(tickLabel);
  }

  // Draw x-axis gridlines and ticks
  for (const t of xTicks) {
    const tx = scaleX(t);
    root.appendChild(svg("line", { x1: tx, y1: chartTop, x2: tx, y2: chartBottom, stroke: cssVar("muted"), "stroke-width": 1 }));
    const tickLabel = svg("text", { x: tx, y: chartBottom + fontSize + 4, "text-anchor": "middle", fill: cssVar("muted") });
    tickLabel.textContent = formatNumber(t);
    root.appendChild(tickLabel);
  }

  // Draw axes
  root.appendChild(svg("line", { x1: chartLeft, y1: chartTop, x2: chartLeft, y2: chartBottom, stroke: cssVar("muted"), "stroke-width": 1 }));
  root.appendChild(svg("line", { x1: chartLeft, y1: chartBottom, x2: chartRight, y2: chartBottom, stroke: cssVar("muted"), "stroke-width": 1 }));

  // Draw axis labels
  const yLabelEl = svg("text", { x: 8, y: chartTop - 8, "text-anchor": "start", fill: cssVar("muted") });
  yLabelEl.textContent = props.yLabel;
  root.appendChild(yLabelEl);

  const xLabelEl = svg("text", { x: chartRight + 4, y: chartBottom + 4, "text-anchor": "start", fill: cssVar("muted") });
  xLabelEl.textContent = props.xLabel;
  root.appendChild(xLabelEl);

  if (empty) {
    const note = svg("text", {
      x: (chartLeft + chartRight) / 2, y: (chartTop + chartBottom) / 2, "text-anchor": "middle", "dominant-baseline": "middle", fill: cssVar("muted"),
    });
    note.textContent = "no data";
    root.appendChild(note);
  } else {
    // Draw fit line if requested
    if (props.fit) {
      const fit = fitLine(data);
      if (fit) {
        const [slope, intercept] = fit;
        const y1 = slope * xFirst + intercept;
        const y2 = slope * xLast + intercept;
        const x1 = scaleX(xFirst);
        const x2 = scaleX(xLast);
        const py1 = scaleY(y1);
        const py2 = scaleY(y2);
        root.appendChild(svg("line", { x1, y1: py1, x2, y2: py2, stroke: cssVar("muted"), "stroke-width": 1 }));
      }
    }

    // Draw points
    const highlightSet = new Set(props.highlight);
    const drawnLabels = new Set<string>();

    data.forEach((d) => {
      const px = scaleX(d.x);
      const py = scaleY(d.y);
      const isHighlighted = d.label && highlightSet.has(d.label);
      const color = isHighlighted ? cssVar("accent") : cssVar("fg");

      root.appendChild(svg("circle", { cx: px, cy: py, r: props.dotSize, fill: color }));

      // Draw label for highlighted points
      if (isHighlighted && d.label) {
        // Check if label will fit to the right
        const labelEl = svg("text", { x: px + props.dotSize + 4, y: py, "dominant-baseline": "middle", fill: color });
        labelEl.textContent = d.label;
        root.appendChild(labelEl);
        drawnLabels.add(d.label);
      }
    });
  }

  host.dataset.picaReady = "true";
}

function drawGlyph(host: HTMLElement, grid: Grid, props: ScatterPlotProps): void {
  grid.clear();
  const { cols, rows } = grid;
  const data = props.data.filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));
  const colors = readPalette(host);

  if (data.length === 0) {
    const note = "no data";
    const x = Math.max(0, Math.floor((cols - note.length) / 2));
    const y = Math.floor(rows / 2);
    grid.write(x, y, note, colors.muted);
    grid.flush();
    host.dataset.picaReady = "true";
    return;
  }

  const [minX, maxX] = extent(data.map((d) => d.x));
  const [minY, maxY] = extent(data.map((d) => d.y));
  const yTicks = niceTicks(minY, maxY, props.ticks);
  const xTicks = niceTicks(minX, maxX, props.ticks);
  const yFirst = yTicks[0] ?? minY;
  const yLast = yTicks[yTicks.length - 1] ?? maxY;
  const xFirst = xTicks[0] ?? minX;
  const xLast = xTicks[xTicks.length - 1] ?? maxX;
  const ySpan = yLast - yFirst || 1;
  const xSpan = xLast - xFirst || 1;

  // Reserve columns on the left for the widest y tick label plus the axis line, and rows on the
  // bottom for the axis line plus the x tick labels beneath it.
  const yLabelWidth = Math.max(1, ...yTicks.map((t) => formatNumber(t).length));
  const inset: ChartInset = { left: yLabelWidth + 1, bottom: 2 };
  const area = chartCells({ cols, rows }, inset);
  const fitDots = chartDots(area, grid.aspect);
  const pointDots = chartDots(area, grid.aspect);
  const highlightDots = chartDots(area, grid.aspect);

  // Axis lines: a vertical rule at the plot's left edge, a horizontal rule under it.
  const axisCol = area.col - 1;
  const axisRow = area.row + area.rows;
  for (let r = area.row; r < area.row + area.rows; r++) grid.set(axisCol, r, "│", colors.muted);
  grid.set(axisCol, axisRow, "└", colors.muted);
  for (let c = area.col; c < area.col + area.cols; c++) grid.set(c, axisRow, "─", colors.muted);

  // Y tick labels, right-aligned against the axis.
  for (const t of yTicks) {
    const fraction = (t - yFirst) / ySpan;
    const row = area.rowAt(fraction);
    const text = formatNumber(t);
    grid.write(Math.max(0, axisCol - text.length), row, text, colors.muted);
  }

  // X tick labels, centered under each tick, on the row below the axis.
  for (const t of xTicks) {
    const fraction = (t - xFirst) / xSpan;
    const col = area.colAt(fraction);
    const text = formatNumber(t);
    grid.write(Math.max(0, col - Math.floor(text.length / 2)), rows - 1, text, colors.muted);
  }

  // Fit line, painted first so the points sit on top of it.
  if (props.fit) {
    const line = fitLine(data);
    if (line) {
      const [slope, intercept] = line;
      const y0 = (slope * xFirst + intercept - yFirst) / ySpan;
      const y1 = (slope * xLast + intercept - yFirst) / ySpan;
      fitDots.stroke(0, y0, 1, y1);
    }
  }

  // Points, split so a highlighted point can be painted last, in the accent.
  const highlightSet = new Set(props.highlight);
  data.forEach((d) => {
    const fx = (d.x - xFirst) / xSpan;
    const fy = (d.y - yFirst) / ySpan;
    if (d.label && highlightSet.has(d.label)) highlightDots.mark(fx, fy);
    else pointDots.mark(fx, fy);
  });

  fitDots.paint(grid, colors.muted);
  pointDots.paint(grid, colors.fg);
  highlightDots.paint(grid, colors.accent);

  grid.flush();
  host.dataset.picaReady = "true";
}

export const mount: Mount<ScatterPlotProps> = (host, initial = {}) => {
  let props: ScatterPlotProps = { ...defaults, ...initial };
  let grid: Grid | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;

  function updateTable(): void {
    table?.remove();
    makeDataTable(host, props);
    table = host.querySelector("table[data-pica]") as HTMLTableElement | null;
  }

  function draw(): void {
    if (grid) {
      drawGlyph(host, grid, props);
    } else {
      drawSvg(host, props);
    }
  }

  function mountView(): void {
    if (props.look === "glyph") {
      grid = createGrid(host, gridOptions(props), () => drawGlyph(host, grid!, props));
    } else {
      resizeObserver = new ResizeObserver(() => drawSvg(host, props));
      resizeObserver.observe(host);
      drawSvg(host, props);
    }
  }

  function unmountView(): void {
    resizeObserver?.disconnect();
    resizeObserver = null;
    const svg = host.querySelector("svg[data-pica]");
    svg?.remove();
    grid?.destroy();
    grid = null;
  }

  labelHost(host, props.label, "figure");
  updateTable();
  mountView();
  draw();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.label !== before.label) labelHost(host, props.label, "figure");
      if (props.label !== before.label || !sameJson(props.data, before.data)) updateTable();
      if (props.look !== before.look) {
        unmountView();
        mountView();
      } else if (grid && props.fontFamily !== before.fontFamily) {
        grid.update(gridOptions(props));
      }
      draw();
    },
    destroy() {
      unmountView();
      table?.remove();
      table = null;
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
