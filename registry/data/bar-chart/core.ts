import { labelHost, unlabelHost } from "../../../lib/a11y";
import { lowerEighth } from "../../../lib/blocks";
import { bandScale, dataTable, extent, formatNumber, linearScale, niceTicks, svg } from "../../../lib/chart";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { sameJson } from "../../../lib/json";
import { cssVar, readPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface BarChartProps {
  /** Bars to plot, each with a label and a value. Empty draws the axes and a muted "no data" note. */
  data: { label: string; value: number }[];
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** Index of the bar drawn in the accent. -1 highlights the bar with the largest value. */
  highlight: number;
  /** "svg" draws hairline axes and rectangles. "glyph" draws the same bars in a monospace grid. */
  look: "svg" | "glyph";
  /** Shows each bar's value in mono figures above it. */
  values: boolean;
  /** About this many rounded ticks on the value axis, in the svg look. */
  ticks: number;
  /** CSS font-family stack for every label. Must be monospace. */
  fontFamily: string;
}

export const defaults: BarChartProps = {
  data: [
    { label: "Mon", value: 12 },
    { label: "Tue", value: 18 },
    { label: "Wed", value: 9 },
    { label: "Thu", value: 22 },
    { label: "Fri", value: 30 },
    { label: "Sat", value: 16 },
    { label: "Sun", value: 11 },
  ],
  label: "Deploys per day",
  highlight: -1,
  look: "svg",
  values: false,
  ticks: 5,
  fontFamily: GRID_FONT,
};

export const mount: Mount<BarChartProps> = (host, initial = {}) => {
  let props: BarChartProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;

  /** Index of the largest value, or -1 when there is none. */
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

  /** The value axis domain: 0 to the largest value, or the smallest to 0 when every value is negative. */
  function domainOf(data: readonly { value: number }[]): [number, number] {
    const [dataMin, dataMax] = extent(data.map((d) => d.value));
    return [Math.min(0, dataMin), Math.max(0, dataMax)];
  }

  function gridOptions(p: BarChartProps): GridOptions {
    // lineHeight 1 keeps stacked full blocks seamless, as registry/text-mode/block-image does.
    return { fontFamily: p.fontFamily, fontSize: 12, columns: 0, lineHeight: 1, renderer: "canvas", color: "" };
  }

  function renderTable(): void {
    table?.remove();
    table = dataTable(props.label || "Bar chart", ["Label", "Value"], props.data.map((d) => [d.label, d.value]));
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
    const [lo, hi] = domainOf(empty ? [{ value: 0 }, { value: 1 }] : data);
    const ticks = empty ? [] : niceTicks(lo, hi, props.ticks);
    const first = ticks[0] ?? lo;
    const last = ticks[ticks.length - 1] ?? hi;
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

    for (const t of ticks) {
      const ty = y(t);
      view.appendChild(svg("line", { x1: chartLeft, y1: ty, x2: chartRight, y2: ty, stroke: cssVar("muted"), "stroke-width": 1 }));
      const tickLabel = svg("text", { x: chartLeft - 6, y: ty, "text-anchor": "end", "dominant-baseline": "middle", fill: cssVar("muted") });
      tickLabel.textContent = formatNumber(t);
      view.appendChild(tickLabel);
    }
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
      const bars = bandScale(data.length, [chartLeft, chartRight], 0.3);
      const base = y(0);
      const best = maxIndex(data);
      data.forEach((d, i) => {
        const x = bars.at(i);
        const barY = Math.min(base, y(d.value));
        const barHeight = Math.max(0, Math.abs(y(d.value) - base));
        const tint = (props.highlight === -1 ? i === best : i === props.highlight) ? cssVar("accent") : cssVar("fg");
        view.appendChild(svg("rect", { x, y: barY, width: bars.bandwidth, height: barHeight, fill: tint }));
        const label = svg("text", { x: x + bars.bandwidth / 2, y: chartBottom + fontSize + 4, "text-anchor": "middle", fill: cssVar("muted") });
        label.textContent = d.label;
        view.appendChild(label);
        if (props.values) {
          const valueLabel = svg("text", { x: x + bars.bandwidth / 2, y: barY - 6, "text-anchor": "middle", fill: cssVar("muted") });
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
    // The canvas renderer's per-cell tint is a fillStyle, which cannot resolve a var() reference, so
    // tints need the palette's actual colors rather than cssVar. See lib/palette.ts, "on a canvas".
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

    const reserveTop = props.values ? 1 : 0;
    const labelRow = rows - 1;
    const plotBottom = Math.max(reserveTop, labelRow - 1);
    const plotRows = Math.max(1, plotBottom - reserveTop + 1);
    const [lo, hi] = domainOf(data);
    const span = hi - lo || 1;
    const gap = data.length > 1 ? 1 : 0;
    const barWidth = Math.max(1, Math.floor((cols - gap * (data.length - 1)) / data.length));
    const used = barWidth * data.length + gap * (data.length - 1);
    const offset = Math.max(0, Math.floor((cols - used) / 2));
    const best = maxIndex(data);

    data.forEach((d, i) => {
      const x0 = offset + i * (barWidth + gap);
      const tint = (props.highlight === -1 ? i === best : i === props.highlight) ? colors.accent : colors.fg;
      const fraction = Math.max(0, Math.min(1, (d.value - lo) / span));
      const eighths = Math.round(fraction * plotRows * 8);
      const fullRows = Math.min(plotRows, Math.floor(eighths / 8));
      const partial = eighths - fullRows * 8;
      for (let r = 0; r < fullRows; r++) {
        const y = plotBottom - r;
        for (let c = 0; c < barWidth; c++) g.set(x0 + c, y, lowerEighth(8), tint);
      }
      if (partial > 0 && fullRows < plotRows) {
        const y = plotBottom - fullRows;
        const glyph = lowerEighth(partial);
        for (let c = 0; c < barWidth; c++) g.set(x0 + c, y, glyph, tint);
      }
      const text = d.label.slice(0, barWidth);
      const pad = Math.max(0, Math.floor((barWidth - text.length) / 2));
      g.write(x0 + pad, labelRow, text, colors.muted);
      if (props.values) {
        const vtext = formatNumber(d.value).slice(0, barWidth);
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
