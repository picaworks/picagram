import { labelHost, unlabelHost } from "../../../lib/a11y";
import { dataTable, extent, formatNumber, linearScale, niceTicks, svg } from "../../../lib/chart";
import { gridLines, svgLabel } from "../../../lib/chart-marks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { sameJson } from "../../../lib/json";
import { cssVar, readPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface LollipopChartProps {
  /** Rows to plot, each with a label and a value. Empty draws the axis and a muted "no data" note. */
  data: { label: string; value: number }[];
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** "value" ranks rows from largest to smallest, input order breaking ties. "input" keeps the given order. */
  sort: "value" | "input";
  /** Input index of the row drawn in the accent with a larger dot. -1 highlights the largest value. */
  highlight: number;
  /** Prints each row's figure beside its dot in mono. */
  values: boolean;
  /** About this many rounded ticks on the value axis. */
  ticks: number;
  /** "svg" draws hairline stems and dots. "glyph" draws the same rows in a monospace grid. */
  look: "svg" | "glyph";
  /** CSS font-family stack for every label. Must be monospace. */
  fontFamily: string;
}

export const defaults: LollipopChartProps = {
  data: [
    { label: "Data", value: 12 },
    { label: "UI", value: 38 },
    { label: "Patterns", value: 12 },
    { label: "Motion", value: 10 },
    { label: "Shaders", value: 14 },
    { label: "ASCII", value: 20 },
    { label: "Effects", value: 16 },
    { label: "Dither", value: 9 },
    { label: "Sections", value: 22 },
    { label: "Immersive", value: 6 },
  ],
  label: "Components by category",
  sort: "value",
  highlight: -1,
  values: true,
  ticks: 5,
  look: "svg",
  fontFamily: GRID_FONT,
};

interface Row {
  label: string;
  value: number;
  /** Position in the input, which is what `highlight` names. */
  index: number;
}

const INSET = 16;
const NAME_GAP = 10;
const FIGURE_GAP = 8;

export const mount: Mount<LollipopChartProps> = (host, initial = {}) => {
  let props: LollipopChartProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;

  /** Rows in the drawn order. */
  function rowsOf(): Row[] {
    const rows = props.data.map((d, index) => ({ label: d.label, value: d.value, index }));
    if (props.sort === "value") rows.sort((a, b) => b.value - a.value || a.index - b.index);
    return rows;
  }

  /** The input index drawn in the accent, or -1. */
  function accentIndex(): number {
    if (props.highlight !== -1) return props.highlight;
    let best = -1;
    let bestValue = Number.NEGATIVE_INFINITY;
    props.data.forEach((d, i) => {
      if (d.value > bestValue) {
        bestValue = d.value;
        best = i;
      }
    });
    return best;
  }

  /** Round ticks over the data and zero. */
  function ticksOf(rows: readonly Row[]): number[] {
    const [dataMin, dataMax] = extent(rows.map((r) => r.value));
    return niceTicks(Math.min(0, dataMin), Math.max(0, dataMax), props.ticks);
  }

  function clip(text: string, chars: number): string {
    return text.length <= chars ? text : `${text.slice(0, Math.max(0, chars - 1))}…`;
  }

  function gridOptions(p: LollipopChartProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: 0, lineHeight: 1.4, renderer: "canvas", color: "" };
  }

  function renderTable(): void {
    table?.remove();
    table = dataTable(props.label || "Lollipop chart", ["Label", "Value"], rowsOf().map((r) => [r.label, r.value]));
    host.appendChild(table);
  }

  function drawSvg(): void {
    const view = root;
    if (!view) return;
    while (view.firstChild) view.firstChild.remove();
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const size = 11;
    view.setAttribute("viewBox", `0 0 ${w} ${h}`);
    view.setAttribute("font-family", props.fontFamily);
    view.setAttribute("font-size", String(size));

    const rows = rowsOf();
    const empty = rows.length === 0;
    const ticks = empty ? [0, 1] : ticksOf(rows);
    const first = ticks[0] ?? 0;
    const last = ticks[ticks.length - 1] ?? 1;
    const cell = measureCell(props.fontFamily, size, 1);
    const figureChars = props.values ? Math.max(1, ...rows.map((r) => formatNumber(r.value).length)) : 0;
    const figureW = figureChars ? figureChars * cell.w + FIGURE_GAP : 0;
    const negativeW = first < 0 ? figureW : 0;

    // The names take what they need, but never so much that the plot falls under half the frame.
    const longest = Math.max(0, ...rows.map((r) => r.label.length));
    const reserve = INSET * 2 + NAME_GAP + figureW + negativeW;
    const nameChars = Math.max(0, Math.floor((w / 2 - reserve) / cell.w));
    const shown = Math.min(longest, nameChars);
    const plotLeft = INSET + shown * cell.w + NAME_GAP + negativeW;
    const plotRight = Math.max(plotLeft + 1, w - INSET - figureW);
    const plotTop = INSET;
    const plotBottom = Math.max(plotTop + 1, h - INSET - size - 8);
    const plot = { x: plotLeft, y: plotTop, width: plotRight - plotLeft, height: plotBottom - plotTop };
    const x = linearScale([first, last], [plotLeft, plotRight]);

    // Gridlines sit well under the stems: muted at low strength, so a stem is the heavier line.
    view.appendChild(gridLines(ticks, { side: "bottom", plot, at: x, rule: false, label: (t) => formatNumber(t), size }));
    for (const t of ticks) {
      view.appendChild(svg("line", { x1: x(t), y1: plotTop, x2: x(t), y2: plotBottom, stroke: cssVar("muted"), "stroke-width": 1, "stroke-opacity": 0.35 }));
    }
    const zero = x(0);
    view.appendChild(svg("line", { x1: zero, y1: plotTop, x2: zero, y2: plotBottom, stroke: cssVar("muted"), "stroke-width": 1 }));

    if (empty) {
      view.appendChild(svgLabel("no data", (plotLeft + plotRight) / 2, (plotTop + plotBottom) / 2, { anchor: "middle", middle: true, size }));
    } else {
      const step = (plotBottom - plotTop) / rows.length;
      const accent = accentIndex();
      rows.forEach((row, i) => {
        const cy = plotTop + step * (i + 0.5);
        const cx = x(row.value);
        const marked = row.index === accent;
        const r = Math.max(1, Math.min(marked ? 6 : 4, step / 2));
        view.appendChild(svgLabel(clip(row.label, shown), plotLeft - NAME_GAP - negativeW, cy, { anchor: "end", middle: true, size, token: "fg" }));
        view.appendChild(svg("line", { x1: zero, y1: cy, x2: cx, y2: cy, stroke: cssVar("fg"), "stroke-width": 1 }));
        view.appendChild(svg("circle", { cx, cy, r, fill: cssVar(marked ? "accent" : "fg") }));
        if (props.values) {
          const right = row.value >= 0;
          const text = formatNumber(row.value);
          // The figure clears the gridlines behind it with a ground-colored patch.
          const tw = text.length * cell.w + 4;
          const tx = right ? cx + r + 4 : cx - r - 4 - tw;
          view.appendChild(svg("rect", { x: tx, y: cy - size / 2 - 1, width: tw, height: size + 2, fill: cssVar("bg") }));
          view.appendChild(svgLabel(text, right ? cx + r + 6 : cx - r - 6, cy, { anchor: right ? "start" : "end", middle: true, size, token: marked ? "fg" : "muted" }));
        }
      });
    }

    host.dataset.picaReady = "true";
  }

  function drawGlyph(): void {
    const g = grid;
    if (!g) return;
    g.clear();
    const { cols, rows: lines } = g;
    // The canvas renderer's per-cell tint is a fillStyle, which cannot resolve a var() reference, so
    // tints need the palette's actual colors rather than cssVar. See lib/palette.ts, "on a canvas".
    const colors = readPalette(host);
    const rows = rowsOf();

    if (rows.length === 0) {
      const note = "no data";
      g.write(Math.max(0, Math.floor((cols - note.length) / 2)), Math.floor(lines / 2), note, colors.muted);
      g.flush();
      host.dataset.picaReady = "true";
      return;
    }

    const ticks = ticksOf(rows);
    const first = ticks[0] ?? 0;
    const last = ticks[ticks.length - 1] ?? 1;
    const figureChars = props.values ? Math.max(...rows.map((r) => formatNumber(r.value).length)) + 1 : 0;
    const negative = first < 0 ? figureChars : 0;
    const longest = Math.max(...rows.map((r) => r.label.length));
    const nameCols = Math.max(0, Math.min(longest, Math.floor(cols / 2) - 2 - figureChars - negative));
    const left = 1 + nameCols + 1 + negative;
    const right = Math.max(left + 2, cols - 1 - figureChars);
    const span = right - left;
    const at = (v: number): number => left + Math.round(((v - first) / (last - first || 1)) * (span - 1));
    const zero = at(0);
    // Rows spread evenly over the canvas height, with blank rows between them, the axis on the last lines.
    const axisLine = Math.max(1, lines - 2);
    const stride = Math.max(1, Math.floor((axisLine - 3) / Math.max(1, rows.length - 1)));
    const accent = accentIndex();

    rows.forEach((row, i) => {
      const y = 1 + i * stride;
      if (y >= lines - 1) return;
      const marked = row.index === accent;
      const name = clip(row.label, nameCols);
      g.write(1 + nameCols - name.length, y, name, colors.fg);
      g.set(zero, y, "│", colors.muted);
      const cx = at(row.value);
      for (let c = Math.min(zero, cx) + 1; c < Math.max(zero, cx); c++) g.set(c, y, "─", colors.fg);
      g.set(cx, y, marked ? "●" : "•", marked ? colors.accent : colors.fg);
      if (props.values) {
        const text = formatNumber(row.value);
        g.write(row.value >= 0 ? cx + 2 : cx - 1 - text.length, y, text, marked ? colors.fg : colors.muted);
      }
    });

    // The value axis, once, beneath the last row.
    const axisY = Math.min(lines - 1, 3 + (rows.length - 1) * stride);
    let end = -1;
    for (const t of ticks) {
      const text = formatNumber(t);
      const start = Math.max(0, Math.min(cols - text.length, at(t) - Math.floor(text.length / 2)));
      if (start <= end) continue;
      g.write(start, axisY, text, colors.muted);
      end = start + text.length;
    }

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
      if (props.label !== before.label || props.sort !== before.sort || !sameJson(props.data, before.data)) renderTable();
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
