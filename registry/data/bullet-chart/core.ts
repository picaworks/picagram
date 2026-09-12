import { labelHost, unlabelHost } from "../../../lib/a11y";
import { lowerEighth } from "../../../lib/blocks";
import { bandScale, dataTable, extent, formatNumber, linearScale, niceTicks, svg } from "../../../lib/chart";
import { chartCells } from "../../../lib/chart-plot";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { sameJson } from "../../../lib/json";
import { cssVar, readPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface BulletChartProps {
  /** Rows to plot, each with a label, value, optional target, and range bounds. Empty draws axes and a muted "no data" note. */
  data: { label: string; value: number; target?: number; ranges: number[] }[];
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** Index of the row drawn in the accent. -1 draws all rows in fg. */
  highlight: number;
  /** Number of range bands (muted at different opacities), 2 to 5. */
  ranges: number;
  /** About this many rounded ticks on the value axis, in the svg look. */
  ticks: number;
  /** "svg" draws hairline ranges and rectangles. "glyph" draws the same bars in a monospace grid. */
  look: "svg" | "glyph";
  /** CSS font-family stack for every label. Must be monospace. */
  fontFamily: string;
}

export const defaults: BulletChartProps = {
  data: [
    { label: "Revenue", value: 270, target: 250, ranges: [0, 150, 225, 300] },
    { label: "Signups", value: 220, target: 200, ranges: [0, 100, 200, 300] },
    { label: "Uptime", value: 95, ranges: [0, 80, 95, 100] },
    { label: "Latency", value: 45, target: 40, ranges: [0, 50, 100, 150] },
  ],
  label: "Quarter against plan",
  highlight: -1,
  ranges: 3,
  ticks: 5,
  look: "svg",
  fontFamily: GRID_FONT,
};

export const mount: Mount<BulletChartProps> = (host, initial = {}) => {
  let props: BulletChartProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;

  /** Index of the row with the largest value, or -1 when there is none. */
  function maxIndex(data: readonly { value: number }[]): number {
    let best = -1;
    let bestValue = Number.NEGATIVE_INFINITY;
    data.forEach((d, i) => {
      if (d.value > bestValue) {
        bestValue = d.value;
        best = i;
      }
    });
    return best;
  }

  /** The value axis domain: 0 to the largest value across all data, or the smallest value across all data. */
  function domainOf(data: readonly { value: number; target?: number }[]): [number, number] {
    const allValues = data.flatMap((d) => [d.value, d.target ?? 0]);
    const [dataMin, dataMax] = extent(allValues);
    return [Math.min(0, dataMin), Math.max(0, dataMax)];
  }

  function gridOptions(p: BulletChartProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: 0, lineHeight: 1, renderer: "canvas", color: "" };
  }

  function renderTable(): void {
    table?.remove();
    const rows = props.data.map((d) => {
      const cells = [d.label, String(d.value)];
      if (d.target !== undefined) cells.push(String(d.target));
      return cells;
    });
    const headers = ["Label", "Value"];
    if (props.data.some((d) => d.target !== undefined)) headers.push("Target");
    table = dataTable(props.label || "Bullet chart", headers, rows);
    host.appendChild(table);
  }

  function drawSvg(): void {
    const view = root;
    if (!view) return;
    while (view.firstChild) view.firstChild.remove();
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const fontSize = 11;
    view.setAttribute("viewBox", `0 0 ${w} ${h}`);
    view.setAttribute("font-family", props.fontFamily);
    view.setAttribute("font-size", String(fontSize));

    const data = props.data;
    const empty = data.length === 0;
    const [lo, hi] = domainOf(empty ? [{ value: 0, target: 1 }] : data);
    const tickValues = empty ? [] : niceTicks(lo, hi, props.ticks);
    const first = tickValues[0] ?? lo;
    const last = tickValues[tickValues.length - 1] ?? hi;

    const rowHeight = 28;
    const labelAreaWidth = 80;
    const left = labelAreaWidth;
    const right = 8;
    const top = 8;
    const bottom = fontSize + 14 + rowHeight;
    const chartLeft = left;
    const chartRight = Math.max(chartLeft + 1, w - right);
    const chartTop = top;
    const chartBottom = Math.max(chartTop + 1, h - bottom);

    const y = linearScale([first, last], [chartBottom, chartTop]);

    // Draw horizontal gridlines and tick labels
    for (const t of tickValues) {
      const ty = y(t);
      view.appendChild(svg("line", { x1: chartLeft, y1: ty, x2: chartRight, y2: ty, stroke: cssVar("muted"), "stroke-width": 1 }));
      const tickLabel = svg("text", { x: chartRight + 6, y: ty, "text-anchor": "start", "dominant-baseline": "middle", fill: cssVar("muted") });
      tickLabel.textContent = formatNumber(t);
      view.appendChild(tickLabel);
    }

    // Draw vertical axis
    view.appendChild(svg("line", { x1: chartLeft, y1: chartTop, x2: chartLeft, y2: chartBottom, stroke: cssVar("muted"), "stroke-width": 1 }));

    if (empty) {
      const note = svg("text", {
        x: (chartLeft + chartRight) / 2, y: (chartTop + chartBottom) / 2, "text-anchor": "middle", "dominant-baseline": "middle", fill: cssVar("muted"),
      });
      note.textContent = "no data";
      view.appendChild(note);
    } else {
      const rowBands = bandScale(data.length, [chartTop, chartBottom], 0.1);
      const best = maxIndex(data);

      data.forEach((d, i) => {
        const rowY = rowBands.at(i);
        const bandHeight = Math.max(1, rowBands.bandwidth * 0.6);
        const barHeight = Math.max(1, rowBands.bandwidth * 0.3);

        // Draw range bands from light to dark
        const rangeCount = Math.min(d.ranges.length - 1, props.ranges);
        for (let r = 0; r < rangeCount; r++) {
          const rMin = d.ranges[r] ?? 0;
          const rMax = d.ranges[r + 1] ?? 0;
          const x1 = chartLeft + ((rMin - first) / (last - first)) * (chartRight - chartLeft);
          const x2 = chartLeft + ((rMax - first) / (last - first)) * (chartRight - chartLeft);
          const opacity = 0.2 + (r / (rangeCount - 1 || 1)) * 0.4;
          view.appendChild(
            svg("rect", {
              x: Math.max(chartLeft, Math.min(x1, x2)),
              y: rowY - bandHeight / 2,
              width: Math.abs(x2 - x1),
              height: bandHeight,
              fill: cssVar("muted"),
              opacity: String(opacity),
            })
          );
        }

        // Draw measure bar
        const barMin = 0;
        const barMax = d.value;
        const x1 = chartLeft + ((barMin - first) / (last - first)) * (chartRight - chartLeft);
        const x2 = chartLeft + ((barMax - first) / (last - first)) * (chartRight - chartLeft);
        const barTint = (props.highlight === -1 ? i === best : i === props.highlight) ? cssVar("accent") : cssVar("fg");
        view.appendChild(
          svg("rect", {
            x: Math.max(chartLeft, Math.min(x1, x2)),
            y: rowY - barHeight / 2,
            width: Math.abs(x2 - x1),
            height: barHeight,
            fill: barTint,
          })
        );

        // Draw target tick if present
        if (d.target !== undefined) {
          const targetX = chartLeft + ((d.target - first) / (last - first)) * (chartRight - chartLeft);
          view.appendChild(svg("line", { x1: targetX, y1: rowY - bandHeight / 2, x2: targetX, y2: rowY + bandHeight / 2, stroke: cssVar("fg"), "stroke-width": 2 }));
        }

        // Draw label
        const label = svg("text", { x: chartLeft - 6, y: rowY, "text-anchor": "end", "dominant-baseline": "middle", fill: cssVar("fg") });
        label.textContent = d.label;
        view.appendChild(label);

        // Draw value label if highlighted
        const isHighlighted = props.highlight === -1 ? i === best : i === props.highlight;
        if (isHighlighted) {
          const valueLabel = svg("text", {
            x: chartLeft + ((d.value - first) / (last - first)) * (chartRight - chartLeft),
            y: rowY - barHeight / 2 - 4,
            "text-anchor": "middle",
            fill: cssVar("accent"),
          });
          valueLabel.textContent = formatNumber(d.value);
          view.appendChild(valueLabel);
        }
      });
    }

    host.dataset.picaReady = "true";
  }

  function drawGlyph(): void {
    const g = grid;
    if (!g) return;
    g.clear();
    const { cols, rows } = g;
    const data = props.data;
    const colors = readPalette(host);

    if (data.length === 0) {
      const note = "no data";
      const x = Math.max(0, Math.floor((cols - note.length) / 2));
      const y = Math.floor(rows / 2);
      g.write(x, y, note, colors.muted);
      g.flush();
      host.dataset.picaReady = "true";
      return;
    }

    const labelCols = Math.min(12, Math.max(4, Math.floor(cols * 0.3)));
    const area = chartCells(g, { left: labelCols });
    const [lo, hi] = domainOf(data);
    const span = hi - lo || 1;
    const best = maxIndex(data);
    const n = data.length;

    data.forEach((d, i) => {
      // Spread each row evenly across the full height of the area, top to bottom.
      const bandTop = area.row + Math.round((i * area.rows) / n);
      const bandBottom = area.row + Math.round(((i + 1) * area.rows) / n) - 1;
      const bandCenter = Math.floor((bandTop + bandBottom) / 2);
      const rangeRow = bandTop === bandBottom ? bandTop : bandCenter;
      const barRow = Math.min(bandBottom, rangeRow + 1);

      const isHighlighted = props.highlight === -1 ? i === best : i === props.highlight;
      const tint = isHighlighted ? colors.accent : colors.fg;
      const mutedTint = colors.muted;

      // Draw range bands, scaled to the area's width.
      const rangeCount = Math.min(d.ranges.length - 1, props.ranges);
      for (let r = 0; r < rangeCount; r++) {
        const rMin = d.ranges[r] ?? 0;
        const rMax = d.ranges[r + 1] ?? 0;
        const fracMin = Math.max(0, Math.min(1, (rMin - lo) / span));
        const fracMax = Math.max(0, Math.min(1, (rMax - lo) / span));
        const colMin = area.colAt(fracMin);
        const colMax = area.colAt(fracMax);
        for (let c = colMin; c <= colMax; c++) {
          g.set(c, rangeRow, "█", mutedTint);
        }
      }

      // Draw measure bar, scaled to the area's width.
      const fracBar = Math.max(0, Math.min(1, (d.value - lo) / span));
      const colBar = area.colAt(fracBar);
      for (let c = area.col; c <= colBar; c++) {
        g.set(c, barRow, lowerEighth(8), tint);
      }

      // Draw target tick if present.
      if (d.target !== undefined) {
        const fracTarget = Math.max(0, Math.min(1, (d.target - lo) / span));
        g.set(area.colAt(fracTarget), rangeRow, "│", colors.fg);
      }

      // Draw label in the reserved columns to the left of the area.
      const text = d.label.slice(0, labelCols);
      g.write(0, barRow, text, colors.fg);
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
      grid = createGrid(host, gridOptions(props), drawGlyph);
    } else {
      root = svg("svg", { "data-pica": "", "aria-hidden": "true" });
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
      if (props.label !== before.label) labelHost(host, props.label, "figure");
      if (props.label !== before.label || !sameJson(props.data, before.data)) renderTable();
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
