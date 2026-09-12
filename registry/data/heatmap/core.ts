import { labelHost, unlabelHost } from "../../../lib/a11y";
import { shade } from "../../../lib/blocks";
import { bandScale, dataTable, extent, formatNumber, svg } from "../../../lib/chart";
import { chartCells } from "../../../lib/chart-plot";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { sameJson } from "../../../lib/json";
import { cssVar, readPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface HeatmapProps {
  /** Matrix data with rows, columns, and 2D values array. */
  data: { rows: string[]; columns: string[]; values: number[][] };
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** Number of distinct tone levels to display, from 2 to 8. */
  steps: number;
  /** Whether to highlight and label the highest value cell in accent. */
  highlight: boolean;
  /** Whether to show the stepped legend below the chart. */
  legend: boolean;
  /** "svg" draws hairline axes and filled rectangles. "glyph" draws cells in a monospace grid. */
  look: "svg" | "glyph";
  /** CSS font-family stack for every label. Must be monospace. */
  fontFamily: string;
}

export const defaults: HeatmapProps = {
  data: {
    rows: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    columns: ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"],
    values: [
      [2, 4, 6, 8, 9, 8, 6, 4, 2, 1, 1, 0],
      [1, 3, 5, 7, 9, 10, 8, 6, 4, 2, 1, 0],
      [1, 2, 4, 6, 8, 9, 7, 5, 3, 2, 1, 0],
      [2, 5, 8, 11, 13, 14, 12, 9, 6, 3, 2, 1],
      [3, 6, 10, 14, 16, 17, 15, 11, 7, 4, 2, 1],
      [1, 2, 3, 4, 5, 4, 3, 2, 1, 0, 0, 0],
      [0, 1, 2, 3, 4, 3, 2, 1, 0, 0, 0, 0],
    ],
  },
  label: "Commits by hour",
  steps: 5,
  highlight: true,
  legend: true,
  look: "svg",
  fontFamily: GRID_FONT,
};

export const mount: Mount<HeatmapProps> = (host, initial = {}) => {
  let props: HeatmapProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;

  /** Find the index and value of the maximum in the flattened data. */
  function maxIndex(data: { values?: number[][] }): [number, number, number] {
    let best = -1;
    let bestValue = Number.NEGATIVE_INFINITY;
    let bestR = 0;
    let bestC = 0;
    if (!data.values) return [best, bestR, bestC];
    data.values.forEach((row, r) => {
      if (!row) return;
      row.forEach((v, c) => {
        if (v > bestValue) {
          bestValue = v;
          best = r * row.length + c;
          bestR = r;
          bestC = c;
        }
      });
    });
    return [best, bestR, bestC];
  }

  /** Get the domain of all values. */
  function domainOf(data: { values?: number[][] }): [number, number] {
    const allValues: number[] = [];
    if (!data.values) return [0, 1];
    data.values.forEach((row) => {
      if (row) allValues.push(...row);
    });
    if (allValues.length === 0) return [0, 1];
    return extent(allValues);
  }

  function gridOptions(p: HeatmapProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: 0, lineHeight: 1, renderer: "canvas", color: "" };
  }

  function renderTable(): void {
    table?.remove();
    const data = props.data;
    const rows = (data.rows && data.rows.length > 0) ? data.rows : [""];
    const cols = (data.columns && data.columns.length > 0) ? data.columns : [""];
    const tableData: (string | number)[][] = [];

    // Header row
    tableData.push(["", ...cols]);

    // Data rows
    rows.forEach((r, i) => {
      const row = (data.values && data.values[i]) ? data.values[i] : [];
      tableData.push([r, ...row]);
    });

    table = dataTable(props.label || "Heatmap", [], tableData);
    host.appendChild(table);
  }

  function drawSvg(): void {
    const view = root;
    if (!view) return;
    while (view.firstChild) view.firstChild.remove();

    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const fontSize = 11;
    const data = props.data;
    const empty = !data.rows || !data.columns || !data.values || data.rows.length === 0 || data.columns.length === 0 || data.values.length === 0;

    view.setAttribute("viewBox", `0 0 ${w} ${h}`);
    view.setAttribute("font-family", props.fontFamily);
    view.setAttribute("font-size", String(fontSize));

    const rows = data.rows || [];
    const cols = data.columns || [];
    const [lo, hi] = domainOf(empty ? { values: [[0], [1]] } : data);
    const span = hi - lo || 1;
    const maxRowLabelChars = rows.length > 0 ? Math.max(1, ...rows.map((r) => r?.length ?? 0)) : 1;
    const maxColLabelChars = cols.length > 0 ? Math.max(1, ...cols.map((c) => c?.length ?? 0)) : 1;
    const cell = measureCell(props.fontFamily, fontSize, 1);

    const left = 12 + maxRowLabelChars * cell.w;
    const right = 8;
    const top = maxColLabelChars * cell.h + 20;
    const bottom = props.legend && !empty ? fontSize + 40 : 8;
    const chartLeft = left;
    const chartRight = Math.max(chartLeft + 1, w - right);
    const chartTop = top;
    const chartBottom = Math.max(chartTop + 1, h - bottom);

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
      const [, bestR, bestC] = props.highlight ? maxIndex(data) : [-1, -1, -1];
      const rowBands = bandScale(rows.length, [chartTop, chartBottom], 0);
      const colBands = bandScale(cols.length, [chartLeft, chartRight], 0);

      // Draw cells
      data.values.forEach((row, r) => {
        const y = rowBands.at(r);
        const rowHeight = rowBands.bandwidth;
        row.forEach((v, c) => {
          const x = colBands.at(c);
          const colWidth = colBands.bandwidth;
          const isHighest = props.highlight && r === bestR && c === bestC;
          const normalizedValue = (v - lo) / span;

          if (isHighest) {
            // Highest cell in accent
            view.appendChild(svg("rect", {
              x,
              y,
              width: colWidth,
              height: rowHeight,
              fill: cssVar("accent"),
            }));
            // Label with value on highest cell
            const valueLabel = svg("text", {
              x: x + colWidth / 2,
              y: y + rowHeight / 2,
              "text-anchor": "middle",
              "dominant-baseline": "middle",
              fill: cssVar("bg"),
              "font-size": "9",
            });
            valueLabel.textContent = formatNumber(v);
            view.appendChild(valueLabel);
          } else {
            // Regular cells: opacity-based tone
            const opacity = Math.max(0.1, normalizedValue);
            view.appendChild(svg("rect", {
              x,
              y,
              width: colWidth,
              height: rowHeight,
              fill: cssVar("fg"),
              opacity: String(opacity),
            }));
          }
        });
      });

      // Draw row labels
      rows.forEach((label, i) => {
        const y = rowBands.at(i) + rowBands.bandwidth / 2;
        const text = svg("text", {
          x: chartLeft - 6,
          y,
          "text-anchor": "end",
          "dominant-baseline": "middle",
          fill: cssVar("muted"),
        });
        text.textContent = label;
        view.appendChild(text);
      });

      // Draw column labels (rotated or positioned)
      cols.forEach((label, i) => {
        const x = colBands.at(i) + colBands.bandwidth / 2;
        const text = svg("text", {
          x,
          y: chartTop - 8,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          fill: cssVar("muted"),
        });
        text.textContent = label;
        view.appendChild(text);
      });

      // Draw frame
      view.appendChild(svg("line", {
        x1: chartLeft,
        y1: chartTop,
        x2: chartRight,
        y2: chartTop,
        stroke: cssVar("muted"),
        "stroke-width": 1,
      }));
      view.appendChild(svg("line", {
        x1: chartLeft,
        y1: chartBottom,
        x2: chartRight,
        y2: chartBottom,
        stroke: cssVar("muted"),
        "stroke-width": 1,
      }));
      view.appendChild(svg("line", {
        x1: chartLeft,
        y1: chartTop,
        x2: chartLeft,
        y2: chartBottom,
        stroke: cssVar("muted"),
        "stroke-width": 1,
      }));
      view.appendChild(svg("line", {
        x1: chartRight,
        y1: chartTop,
        x2: chartRight,
        y2: chartBottom,
        stroke: cssVar("muted"),
        "stroke-width": 1,
      }));

      // Draw key
      if (props.legend) {
        const keyY = chartBottom + 20;
        const keySteps = Math.min(props.steps, 8);
        const keyHeight = fontSize;
        const stepWidth = (chartRight - chartLeft) / keySteps;

        for (let i = 0; i < keySteps; i++) {
          const x = chartLeft + i * stepWidth;
          const value = lo + (span * (i + 0.5)) / keySteps;
          const opacity = Math.max(0.1, (i + 0.5) / keySteps);

          view.appendChild(svg("rect", {
            x,
            y: keyY,
            width: stepWidth,
            height: keyHeight,
            fill: cssVar("fg"),
            opacity: String(opacity),
          }));

          const label = svg("text", {
            x: x + stepWidth / 2,
            y: keyY + keyHeight + 10,
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            fill: cssVar("muted"),
            "font-size": "9",
          });
          label.textContent = formatNumber(value);
          view.appendChild(label);
        }
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

    const rowLabels = data.rows ?? [];
    const colLabels = data.columns ?? [];
    const values = data.values ?? [];

    if (rowLabels.length === 0 || colLabels.length === 0 || values.length === 0) {
      const note = "no data";
      const x = Math.max(0, Math.floor((cols - note.length) / 2));
      const y = Math.floor(rows / 2);
      g.write(x, y, note, colors.muted);
      g.flush();
      host.dataset.picaReady = "true";
      return;
    }

    const [, bestR, bestC] = props.highlight ? maxIndex(data) : [-1, -1, -1];
    const rowCount = rowLabels.length;
    const colCount = colLabels.length;
    const [lo, hi] = domainOf(data);
    const span = hi - lo || 1;

    // One column of cells per row label, plus a gap, on the left. One row of cells for the column
    // labels, on top. What is left is the matrix, addressed in whole grid cells.
    const labelWidth = Math.max(1, ...rowLabels.map((label) => label.length));
    const area = chartCells(g, { left: labelWidth + 1, top: 1 });
    const cellWidth = Math.max(1, Math.floor(area.cols / colCount));
    const cellHeight = Math.max(1, Math.floor(area.rows / rowCount));
    const usedCols = cellWidth * colCount;
    const usedRows = cellHeight * rowCount;
    const originCol = area.col + Math.max(0, Math.floor((area.cols - usedCols) / 2));
    const originRow = area.row + Math.max(0, Math.floor((area.rows - usedRows) / 2));

    // Draw column labels
    colLabels.forEach((label, c) => {
      const x0 = originCol + c * cellWidth;
      const text = label.slice(0, cellWidth);
      const pad = Math.max(0, Math.floor((cellWidth - text.length) / 2));
      g.write(x0 + pad, 0, text, colors.muted);
    });

    // Draw row labels
    rowLabels.forEach((label, r) => {
      const y = originRow + r * cellHeight + Math.floor(cellHeight / 2);
      const text = label.slice(0, labelWidth);
      const pad = Math.max(0, labelWidth - text.length);
      g.write(pad, y, text, colors.muted);
    });

    // Draw cells
    values.forEach((row, r) => {
      const y0 = originRow + r * cellHeight;
      row.forEach((v, c) => {
        const x0 = originCol + c * cellWidth;
        const normalizedValue = (v - lo) / span;
        const isHighest = props.highlight && r === bestR && c === bestC;

        const tint = isHighest ? colors.accent : colors.fg;
        const glyphLevel = Math.min(8, Math.max(0, Math.round(normalizedValue * 8)));
        const glyph = shade(glyphLevel);

        for (let ry = 0; ry < cellHeight; ry++) {
          const cy = y0 + ry;
          for (let rx = 0; rx < cellWidth; rx++) {
            g.set(x0 + rx, cy, glyph, tint);
          }
        }

        // Label highest cell
        if (isHighest) {
          const valueLabel = formatNumber(v).slice(0, cellWidth);
          const vpad = Math.max(0, Math.floor((cellWidth - valueLabel.length) / 2));
          g.write(x0 + vpad, y0 + Math.floor(cellHeight / 2), valueLabel, colors.accent);
        }
      });
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
