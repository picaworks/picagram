import { labelHost, unlabelHost } from "../../../lib/a11y";
import { dataTable, extent, formatNumber, linearScale, niceTicks, svg } from "../../../lib/chart";
import { formatTime, parseTime, timeTicks } from "../../../lib/chart-time";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { sameJson } from "../../../lib/json";
import { cssVar, readPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface CandlestickChartProps {
  /** Candles with timestamps and OHLC data. Empty draws the axes and a muted "no data" note. */
  data: { t: string; o: number; h: number; l: number; c: number }[];
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** "svg" draws hairline axes and rectangles. "glyph" draws the same candles in a monospace grid. */
  look: "svg" | "glyph";
  /** About this many rounded ticks on the time axis, in the svg look. */
  ticks: number;
  /** Width of candle body as a fraction of the candle spacing, 0.2 to 0.9. */
  width: number;
  /** CSS font-family stack for every label. Must be monospace. */
  fontFamily: string;
}

export const defaults: CandlestickChartProps = {
  data: Array.from({ length: 30 }, (_, i) => {
    const base = new Date("2026-01-01T00:00:00Z");
    base.setUTCDate(base.getUTCDate() + i);
    const t = base.toISOString();
    const cycle = i / 30;
    const trend = Math.sin(cycle * Math.PI * 3) * 1000 + 5000;
    const idx = i;
    const dither1 = ((idx * 73 + 7) % 256) / 256;
    const dither2 = ((idx * 131 + 13) % 256) / 256;
    const dither3 = ((idx * 97 + 11) % 256) / 256;
    const dither4 = ((idx * 151 + 17) % 256) / 256;
    const o = trend + (dither1 - 0.5) * 200;
    const c = trend + (dither2 - 0.5) * 200;
    const h = Math.max(o, c) + dither3 * 300;
    const l = Math.min(o, c) - dither4 * 300;
    return { t, o, h, l, c };
  }),
  label: "Daily price, thirty sessions",
  look: "svg",
  ticks: 5,
  width: 0.6,
  fontFamily: GRID_FONT,
};

export const mount: Mount<CandlestickChartProps> = (host, initial = {}) => {
  let props: CandlestickChartProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;

  function gridOptions(p: CandlestickChartProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: 0, lineHeight: 1, renderer: "canvas", color: "" };
  }

  function renderTable(): void {
    table?.remove();
    table = dataTable(
      props.label || "Candlestick chart",
      ["Time", "Open", "High", "Low", "Close"],
      props.data.map((d) => [d.t, d.o, d.h, d.l, d.c]),
    );
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

    let timeMin = 0;
    let timeMax = 1;
    let priceMin = 0;
    let priceMax = 1;

    if (!empty) {
      const times = data.map((d) => parseTime(d.t));
      const [tmin, tmax] = extent(times);
      timeMin = tmin;
      timeMax = tmax;

      const prices = data.flatMap((d) => [d.h, d.l]);
      const [pmin, pmax] = extent(prices);
      priceMin = Math.min(0, pmin);
      priceMax = Math.max(0, pmax);
      const priceSpan = priceMax - priceMin || 1;
      priceMin -= priceSpan * 0.1;
      priceMax += priceSpan * 0.1;
    }

    const priceTicks = empty ? [] : niceTicks(priceMin, priceMax, props.ticks);
    const firstPrice = priceTicks[0] ?? priceMin;
    const lastPrice = priceTicks[priceTicks.length - 1] ?? priceMax;
    const maxPriceChars = Math.max(1, ...priceTicks.map((t) => formatNumber(t).length));
    const cell = measureCell(props.fontFamily, fontSize, 1);

    const left = 12 + maxPriceChars * cell.w;
    const right = 8;
    const top = 8;
    const bottom = fontSize + 24;
    const chartLeft = left;
    const chartRight = Math.max(chartLeft + 1, w - right);
    const chartTop = top;
    const chartBottom = Math.max(chartTop + 1, h - bottom);

    const x = linearScale([timeMin, timeMax], [chartLeft, chartRight]);
    const y = linearScale([firstPrice, lastPrice], [chartBottom, chartTop]);

    for (const t of priceTicks) {
      const ty = y(t);
      view.appendChild(svg("line", { x1: chartLeft, y1: ty, x2: chartRight, y2: ty, stroke: cssVar("muted"), "stroke-width": 1 }));
      const tickLabel = svg("text", { x: chartLeft - 6, y: ty, "text-anchor": "end", "dominant-baseline": "middle", fill: cssVar("muted") });
      tickLabel.textContent = formatNumber(t);
      view.appendChild(tickLabel);
    }
    view.appendChild(svg("line", { x1: chartLeft, y1: chartTop, x2: chartLeft, y2: chartBottom, stroke: cssVar("muted"), "stroke-width": 1 }));

    if (empty) {
      const note = svg("text", {
        x: (chartLeft + chartRight) / 2,
        y: (chartTop + chartBottom) / 2,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        fill: cssVar("muted"),
      });
      note.textContent = "no data";
      view.appendChild(note);
    } else {
      const candleWidth = (chartRight - chartLeft) / data.length;
      const bodyWidth = candleWidth * props.width;

      data.forEach((d, i) => {
        const candleX = chartLeft + (i + 0.5) * candleWidth;
        const bodyX = candleX - bodyWidth / 2;

        const high = y(d.h);
        const low = y(d.l);
        const open = y(d.o);
        const close = y(d.c);

        const bodyTop = Math.min(open, close);
        const bodyHeight = Math.abs(close - open);
        const isUp = close > open;
        const tint = i === data.length - 1 ? cssVar("accent") : cssVar("fg");

        view.appendChild(svg("line", { x1: candleX, y1: high, x2: candleX, y2: low, stroke: tint, "stroke-width": 1 }));

        if (bodyHeight > 0) {
          view.appendChild(svg("rect", { x: bodyX, y: bodyTop, width: bodyWidth, height: bodyHeight, fill: isUp ? "none" : tint, stroke: tint, "stroke-width": 1 }));
        } else {
          view.appendChild(svg("line", { x1: bodyX, y1: bodyTop, x2: bodyX + bodyWidth, y2: bodyTop, stroke: tint, "stroke-width": 1 }));
        }

        if (i === data.length - 1) {
          const label = svg("text", { x: candleX + bodyWidth / 2 + 4, y: close, "dominant-baseline": "middle", fill: cssVar("accent") });
          label.textContent = formatNumber(d.c);
          view.appendChild(label);
        }
      });

      const timeTick = timeTicks(timeMin, timeMax, props.ticks);
      for (const t of timeTick.times) {
        const tx = x(t);
        const timeLabel = svg("text", { x: tx, y: chartBottom + fontSize + 4, "text-anchor": "middle", fill: cssVar("muted") });
        timeLabel.textContent = formatTime(t, timeTick.unit);
        view.appendChild(timeLabel);
      }
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

    const labelRow = rows - 1;
    const plotBottom = Math.max(0, labelRow - 1);
    const plotRows = Math.max(1, plotBottom + 1);

    const prices = data.flatMap((d) => [d.h, d.l]);
    const [pmin, pmax] = extent(prices);
    const priceMin = Math.min(0, pmin);
    const priceMax = Math.max(0, pmax);
    const priceSpan = priceMax - priceMin || 1;

    const gap = data.length > 1 ? 1 : 0;
    const candleWidth = Math.max(1, Math.floor((cols - gap * (data.length - 1)) / data.length));
    const used = candleWidth * data.length + gap * (data.length - 1);
    const offset = Math.max(0, Math.floor((cols - used) / 2));

    data.forEach((d, i) => {
      const x0 = offset + i * (candleWidth + gap);
      const tint = i === data.length - 1 ? colors.accent : colors.fg;

      const high = Math.max(0, Math.min(1, (d.h - priceMin) / priceSpan));
      const low = Math.max(0, Math.min(1, (d.l - priceMin) / priceSpan));
      const open = Math.max(0, Math.min(1, (d.o - priceMin) / priceSpan));
      const close = Math.max(0, Math.min(1, (d.c - priceMin) / priceSpan));

      const highRow = plotBottom - Math.round(high * plotRows);
      const lowRow = plotBottom - Math.round(low * plotRows);
      const openRow = plotBottom - Math.round(open * plotRows);
      const closeRow = plotBottom - Math.round(close * plotRows);

      const bodyTop = Math.min(openRow, closeRow);
      const bodyBottom = Math.max(openRow, closeRow);
      const isUp = close > open;

      for (let r = highRow; r <= lowRow; r++) {
        if (r >= 0 && r <= plotBottom) {
          for (let c = 0; c < candleWidth; c++) {
            if (r >= bodyTop && r <= bodyBottom) {
              g.set(x0 + c, r, isUp ? "▢" : "█", tint);
            } else {
              g.set(x0 + c, r, "│", tint);
            }
          }
        }
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
