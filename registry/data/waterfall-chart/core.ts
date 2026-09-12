import { labelHost, unlabelHost } from "../../../lib/a11y";
import { lowerEighth } from "../../../lib/blocks";
import { bandScale, dataTable, extent, formatNumber, linearScale, niceTicks, svg } from "../../../lib/chart";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { sameJson } from "../../../lib/json";
import { cssVar, readPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface WaterfallChartProps {
  /** Data with a start value, changes, and an ending total. Each item has a label and a signed value. */
  data: { label: string; value: number }[];
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** Index of the bar drawn in the accent. -1 highlights the bar with the largest change by absolute value. */
  highlight: number;
  /** "svg" draws hairline axes and rectangles. "glyph" draws the same bars in a monospace grid. */
  look: "svg" | "glyph";
  /** Shows each bar's value in mono figures. */
  values: boolean;
  /** About this many rounded ticks on the value axis, in the svg look. */
  ticks: number;
  /** CSS font-family stack for every label. Must be monospace. */
  fontFamily: string;
}

export const defaults: WaterfallChartProps = {
  data: [
    { label: "Start", value: 120 },
    { label: "New", value: 48 },
    { label: "Expansion", value: 22 },
    { label: "Churn", value: -19 },
    { label: "Downgrade", value: -8 },
    { label: "Recovery", value: 11 },
    { label: "Total", value: 174 },
  ],
  label: "Revenue bridge",
  highlight: -1,
  look: "svg",
  values: true,
  ticks: 5,
  fontFamily: GRID_FONT,
};

interface BarInfo {
  label: string;
  value: number;
  type: "start" | "change" | "total";
  base: number;
  top: number;
  isPositive: boolean;
}

export const mount: Mount<WaterfallChartProps> = (host, initial = {}) => {
  let props: WaterfallChartProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;

  /** Parse the data to extract bar info with running totals. */
  function parseBars(data: readonly { label: string; value: number }[]): BarInfo[] {
    if (data.length === 0) return [];

    const bars: BarInfo[] = [];
    let running = 0;

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (!d) continue;
      let type: "start" | "change" | "total";
      let base: number;
      let top: number;
      let isPositive: boolean;

      if (i === 0) {
        // First bar is the start, sits on baseline
        type = "start";
        base = 0;
        top = d.value;
        running = d.value;
        isPositive = true;
      } else if (i === data.length - 1) {
        // Last bar is the total, sits on baseline
        type = "total";
        base = 0;
        top = d.value;
        isPositive = true;
      } else {
        // Middle bars are changes, float between running totals
        type = "change";
        isPositive = d.value >= 0;
        const prev = running;
        running += d.value;
        base = Math.min(prev, running);
        top = Math.max(prev, running);
      }

      bars.push({
        label: d.label,
        value: d.value,
        type,
        base,
        top,
        isPositive,
      });
    }

    return bars;
  }

  /** Find the index of the most extreme change (largest absolute value), excluding start and total. */
  function maxChangeIndex(bars: readonly BarInfo[]): number {
    let best = -1;
    let bestValue = 0;
    for (let i = 1; i < bars.length - 1; i++) {
      const bar = bars[i];
      if (!bar) continue;
      const absVal = Math.abs(bar.value);
      if (absVal > bestValue) {
        bestValue = absVal;
        best = i;
      }
    }
    return best;
  }

  /** The value axis domain covering all bar heights. */
  function domainOf(bars: readonly BarInfo[]): [number, number] {
    const values = bars.map((b) => b.top);
    const [lo, hi] = extent(values);
    return [Math.min(0, lo), Math.max(0, hi)];
  }

  function gridOptions(p: WaterfallChartProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: 0, lineHeight: 1, renderer: "canvas", color: "" };
  }

  function renderTable(): void {
    table?.remove();
    const bars = parseBars(props.data);
    const tableData = bars.map((b) => [b.label, b.value]);
    table = dataTable(props.label || "Waterfall chart", ["Label", "Value"], tableData);
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

    const bars = parseBars(props.data);
    const empty = bars.length === 0;
    const [lo, hi] = domainOf(empty ? [{ label: "", value: 0, type: "start" as const, base: 0, top: 1, isPositive: true }] : bars);
    const ticks = empty ? [] : niceTicks(lo, hi, props.ticks);
    let first: number = lo;
    let last: number = hi;
    if (ticks.length > 0) {
      const t0 = ticks[0];
      const tn = ticks[ticks.length - 1];
      if (t0 !== undefined) first = t0;
      if (tn !== undefined) last = tn;
    }
    const maxTickChars = Math.max(1, ...ticks.map((t) => formatNumber(t).length));
    const cell = measureCell(props.fontFamily, fontSize, 1);

    const left = 12 + maxTickChars * cell.w;
    const right = 8;
    const top = props.values && !empty ? fontSize + 10 : 8;
    const bottom = fontSize + 14;
    const chartLeft = left;
    const chartRight = Math.max(chartLeft + 1, w - right);
    const chartTop = top;
    const chartBottom = Math.max(chartTop + 1, h - bottom);

    const y = linearScale([first, last], [chartBottom, chartTop]);

    // Draw gridlines and ticks
    for (const t of ticks) {
      const ty = y(t);
      view.appendChild(svg("line", { x1: chartLeft, y1: ty, x2: chartRight, y2: ty, stroke: cssVar("muted"), "stroke-width": 1 }));
      const tickLabel = svg("text", { x: chartLeft - 6, y: ty, "text-anchor": "end", "dominant-baseline": "middle", fill: cssVar("muted") });
      tickLabel.textContent = formatNumber(t);
      view.appendChild(tickLabel);
    }

    // Draw y-axis
    view.appendChild(svg("line", { x1: chartLeft, y1: chartTop, x2: chartLeft, y2: chartBottom, stroke: cssVar("muted"), "stroke-width": 1 }));
    if (ticks.length === 0) {
      const base = y(0);
      view.appendChild(svg("line", { x1: chartLeft, y1: base, x2: chartRight, y2: base, stroke: cssVar("muted"), "stroke-width": 1 }));
    }

    if (empty) {
      const note = svg("text", {
        x: (chartLeft + chartRight) / 2, y: (chartTop + chartBottom) / 2, "text-anchor": "middle", "dominant-baseline": "middle", fill: cssVar("muted"),
      });
      note.textContent = "no data";
      view.appendChild(note);
    } else {
      const scales = bandScale(bars.length, [chartLeft, chartRight], 0.3);
      const best = maxChangeIndex(bars);

      bars.forEach((bar, i) => {
        const x = scales.at(i);
        const barY = y(bar.top);
        const barBase = y(bar.base);
        const barHeight = Math.abs(barBase - barY);
        const tint = (props.highlight === -1 ? i === best : i === props.highlight) ? cssVar("accent") : cssVar("fg");

        // Draw the main bar
        if (bar.type === "start" || bar.type === "total") {
          // Start and total bars sit on baseline
          view.appendChild(svg("rect", { x, y: barY, width: scales.bandwidth, height: barHeight, fill: tint }));
        } else {
          // Change bars float between base and top
          view.appendChild(svg("rect", { x, y: barY, width: scales.bandwidth, height: barHeight, fill: bar.isPositive ? tint : "none", stroke: tint, "stroke-width": 1 }));
        }

        // Draw connector line to next bar if this is not the last bar
        if (i < bars.length - 1) {
          const nextBar = bars[i + 1];
          const nextX = scales.at(i + 1);
          if (nextBar && nextX !== undefined) {
            const nextBarBase = y(nextBar.base);
            view.appendChild(svg("line", {
              x1: x + scales.bandwidth, y1: barBase, x2: nextX, y2: nextBarBase,
              stroke: cssVar("muted"), "stroke-width": 1, "stroke-dasharray": "2,2",
            }));
          }
        }

        // Draw label
        const label = svg("text", { x: x + scales.bandwidth / 2, y: chartBottom + fontSize + 4, "text-anchor": "middle", fill: cssVar("muted") });
        label.textContent = bar.label;
        view.appendChild(label);

        // Draw value label if enabled
        if (props.values) {
          const valueLabel = svg("text", { x: x + scales.bandwidth / 2, y: barY - 6, "text-anchor": "middle", fill: cssVar("muted") });
          valueLabel.textContent = formatNumber(bar.value);
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

    const bars = parseBars(props.data);
    const colors = readPalette(host);

    if (bars.length === 0) {
      const note = "no data";
      const x = Math.max(0, Math.floor((cols - note.length) / 2));
      const y = Math.floor(rows / 2);
      g.write(x, y, note, colors.muted);
      g.flush();
      host.dataset.picaReady = "true";
      return;
    }

    const reserveTop = props.values ? 1 : 0;
    const labelRow = rows - 1;
    const plotBottom = Math.max(reserveTop, labelRow - 1);
    const plotRows = Math.max(1, plotBottom - reserveTop + 1);
    const [lo, hi] = domainOf(bars);
    const span = hi - lo || 1;
    const gap = bars.length > 1 ? 1 : 0;
    const barWidth = Math.max(1, Math.floor((cols - gap * (bars.length - 1)) / bars.length));
    const used = barWidth * bars.length + gap * (bars.length - 1);
    const offset = Math.max(0, Math.floor((cols - used) / 2));
    const best = maxChangeIndex(bars);

    bars.forEach((bar, i) => {
      const x0 = offset + i * (barWidth + gap);
      const tint = (props.highlight === -1 ? i === best : i === props.highlight) ? colors.accent : colors.fg;

      // Calculate bar height in eighths
      const topFraction = Math.max(0, Math.min(1, (bar.top - lo) / span));
      const baseFraction = Math.max(0, Math.min(1, (bar.base - lo) / span));
      const topEighths = Math.round(topFraction * plotRows * 8);
      const baseEighths = Math.round(baseFraction * plotRows * 8);

      const topFullRows = Math.min(plotRows, Math.floor(topEighths / 8));
      const baseFullRows = Math.min(plotRows, Math.floor(baseEighths / 8));
      const topPartial = topEighths - topFullRows * 8;
      const basePartial = baseEighths - baseFullRows * 8;

      const barBottomRow = plotBottom - baseFullRows;
      const barTopRow = plotBottom - topFullRows;

      // Draw filled rows
      for (let r = barTopRow; r < barBottomRow; r++) {
        for (let c = 0; c < barWidth; c++) {
          g.set(x0 + c, r, lowerEighth(8), tint);
        }
      }

      // Draw partial rows
      if (topPartial > 0 && topFullRows < plotRows) {
        for (let c = 0; c < barWidth; c++) {
          g.set(x0 + c, barTopRow, lowerEighth(topPartial), tint);
        }
      }

      if (basePartial > 0 && baseFullRows < plotRows) {
        for (let c = 0; c < barWidth; c++) {
          g.set(x0 + c, barBottomRow, lowerEighth(basePartial), tint);
        }
      }

      // Draw label
      const text = bar.label.slice(0, barWidth);
      const pad = Math.max(0, Math.floor((barWidth - text.length) / 2));
      g.write(x0 + pad, labelRow, text, colors.muted);

      // Draw value label
      if (props.values) {
        const vtext = formatNumber(bar.value).slice(0, barWidth);
        const vpad = Math.max(0, Math.floor((barWidth - vtext.length) / 2));
        g.write(x0 + vpad, 0, vtext, colors.muted);
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
