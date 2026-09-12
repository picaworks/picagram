import { labelHost, unlabelHost } from "../../../lib/a11y";
import { arcPath, dataTable, formatNumber, svg } from "../../../lib/chart";
import { chartCells, chartDots, type ChartInset } from "../../../lib/chart-plot";
import { polarPoint } from "../../../lib/chart-marks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { sameJson } from "../../../lib/json";
import { cssVar, readPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface RadarChartProps {
  /** Chart data with axes and series. Each series has a name and values matching the axis count. */
  data: { axes: { label: string }[]; series: { name: string; values: number[] }[] };
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** Maximum value on the scale. */
  max: number;
  /** Number of concentric rings. */
  rings: number;
  /** Opacity of the first series' fill, from 0 to 0.4. */
  fill: number;
  /** "svg" draws hairline axes and rings. "glyph" draws the same in a monospace grid. */
  look: "svg" | "glyph";
  /** CSS font-family stack for every label. Must be monospace. */
  fontFamily: string;
}

export const defaults: RadarChartProps = {
  data: {
    axes: [
      { label: "Speed" },
      { label: "Size" },
      { label: "Setup" },
      { label: "Accessibility" },
      { label: "Docs" },
      { label: "Themes" },
    ],
    series: [
      { name: "React", values: [80, 60, 90, 85, 70, 95] },
      { name: "Vue", values: [70, 85, 75, 80, 95, 65] },
    ],
  },
  label: "Two libraries compared",
  max: 100,
  rings: 3,
  fill: 0.12,
  look: "svg",
  fontFamily: GRID_FONT,
};

export const mount: Mount<RadarChartProps> = (host, initial = {}) => {
  let props: RadarChartProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;

  function gridOptions(p: RadarChartProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: 0, lineHeight: 1, renderer: "canvas", color: "" };
  }

  function renderTable(): void {
    table?.remove();
    const axes = props.data.axes || [];
    const series = props.data.series || [];
    const tableData = series.map((s) => [s.name, ...(s.values || []).map((v) => formatNumber(v))]);
    table = dataTable(props.label || "Radar chart", ["Series", ...axes.map((a) => a.label)], tableData);
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

    const axes = props.data.axes || [];
    const series = props.data.series || [];
    const empty = axes.length === 0 || series.length === 0 || series.some((s) => !s.values || s.values.length === 0);
    const axisCount = axes.length || 1;
    const maxValue = Math.max(props.max, 1);

    // Layout
    const margin = 40;
    const chartLeft = margin;
    const chartRight = Math.max(chartLeft + 1, w - margin);
    const chartTop = margin;
    const chartBottom = Math.max(chartTop + 1, h - margin);
    const centerX = (chartLeft + chartRight) / 2;
    const centerY = (chartTop + chartBottom) / 2;
    const maxRadius = Math.min(chartRight - centerX, chartBottom - centerY);

    // Draw rings and axis labels
    for (let r = 1; r <= props.rings; r++) {
      const radius = (r / props.rings) * maxRadius;
      const startAngle = 0;
      const endAngle = Math.PI * 2;
      view.appendChild(svg("path", { d: arcPath(centerX, centerY, radius, radius, startAngle, endAngle), fill: "none", stroke: cssVar("muted"), "stroke-width": 1 }));
    }

    // Draw axes
    for (let i = 0; i < axisCount; i++) {
      const angle = (i / axisCount) * Math.PI * 2;
      const [x, y] = polarPoint(centerX, centerY, maxRadius, angle);
      view.appendChild(svg("line", { x1: centerX, y1: centerY, x2: x, y2: y, stroke: cssVar("muted"), "stroke-width": 1 }));

      // Axis labels at outer end
      const labelRadius = maxRadius * 1.15;
      const [labelX, labelY] = polarPoint(centerX, centerY, labelRadius, angle);
      const label = svg("text", { x: labelX, y: labelY, "text-anchor": "middle", "dominant-baseline": "middle", fill: cssVar("muted"), "font-size": fontSize });
      label.textContent = axes[i]?.label ?? "";
      view.appendChild(label);
    }

    if (!empty) {
      // Draw series
      series.forEach((s, seriesIndex) => {
        const points: [number, number][] = [];
        for (let i = 0; i < axisCount; i++) {
          const angle = (i / axisCount) * Math.PI * 2;
          const value = Math.max(0, Math.min(s.values[i] ?? 0, maxValue));
          const radius = (value / maxValue) * maxRadius;
          points.push(polarPoint(centerX, centerY, radius, angle));
        }

        // Polygon path
        if (points.length > 0) {
          const p0 = points[0]!;
          const pathData = `M${p0[0]},${p0[1]}` + points.slice(1).map((p) => `L${p[0]},${p[1]}`).join("") + "Z";
          const color = seriesIndex === 0 ? cssVar("accent") : seriesIndex === 1 ? cssVar("fg") : cssVar("muted");
          if (seriesIndex === 0) {
            // First series gets a fill
            view.appendChild(svg("path", { d: pathData, fill: color, opacity: String(props.fill), stroke: "none" }));
          }
          view.appendChild(svg("path", { d: pathData, fill: "none", stroke: color, "stroke-width": 1 }));

          // Series name at the longest axis
          if (s.values && s.values.length > 0) {
            const maxIdx = s.values.indexOf(Math.max(...s.values));
            const maxAngle = (maxIdx / axisCount) * Math.PI * 2;
            const nameRadius = maxRadius * 0.7;
            const [nameX, nameY] = polarPoint(centerX, centerY, nameRadius, maxAngle);
            const nameLabel = svg("text", { x: nameX, y: nameY, "text-anchor": "middle", "dominant-baseline": "middle", fill: color, "font-size": fontSize });
            nameLabel.textContent = s.name;
            view.appendChild(nameLabel);
          }
        }
      });
    } else {
      const note = svg("text", {
        x: (chartLeft + chartRight) / 2,
        y: (chartTop + chartBottom) / 2,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        fill: cssVar("muted"),
      });
      note.textContent = "no data";
      view.appendChild(note);
    }

    host.dataset.picaReady = "true";
  }

  function drawGlyph(): void {
    const g = grid;
    if (!g) return;
    g.clear();
    const { cols, rows } = g;
    const colors = readPalette(host);

    const axes = props.data.axes || [];
    const series = props.data.series || [];
    const empty = axes.length === 0 || series.length === 0 || series.some((s) => !s.values || s.values.length === 0);
    const axisCount = axes.length || 1;
    const maxValue = Math.max(props.max, 1);

    if (empty) {
      const note = "no data";
      const x = Math.max(0, Math.floor((cols - note.length) / 2));
      const y = Math.floor(rows / 2);
      g.write(x, y, note, colors.muted);
      g.flush();
      host.dataset.picaReady = "true";
      return;
    }

    // Hold back rows above and below, and columns to each side, for axis labels around the outside.
    const maxLabelLen = Math.max(1, ...axes.map((a) => a.label.length));
    const side = Math.max(3, Math.min(maxLabelLen, Math.max(1, Math.floor(cols / 4))));
    const inset: ChartInset = { top: 1, bottom: 1, left: side, right: side };
    const area = chartCells({ cols, rows }, inset);
    const ringDots = chartDots(area, g.aspect);
    const seriesDots = chartDots(area, g.aspect);

    // The farthest a value can reach from centre without the star turning into an ellipse: a step in either
    // direction has to cover the same physical distance, and `dots.aspect` is what one dot's step is worth
    // in the other direction's dots.
    const reach = (Math.min(ringDots.wide, ringDots.tall / ringDots.aspect) / 2) * 0.94;

    /** A fractional point on the plot at `angle` (0 is straight up, turning clockwise) and `radiusFraction`
     *  of `reach`, corrected by the dot aspect so the shape reads as a circle rather than an ellipse. */
    function point(angle: number, radiusFraction: number): [number, number] {
      const rx = reach * radiusFraction * Math.sin(angle);
      const ry = reach * radiusFraction * Math.cos(angle) * ringDots.aspect;
      return [0.5 + rx / ringDots.wide, 0.5 + ry / ringDots.tall];
    }

    /** The cell for a fraction pair, unclamped, so a label can sit past the ring in the held-back margin. */
    function cellAt(fx: number, fy: number): [number, number] {
      const col = Math.round(area.col + fx * (area.cols - 1));
      const row = Math.round(area.row + (area.rows - 1) - fy * (area.rows - 1));
      return [col, row];
    }

    // Rings, one polygon each so they read as circles rather than the star's own straight edges.
    const ringSteps = Math.max(axisCount * 6, 24);
    for (let ringIdx = 1; ringIdx <= props.rings; ringIdx++) {
      const radiusFraction = ringIdx / props.rings;
      for (let s = 0; s < ringSteps; s++) {
        const [fx0, fy0] = point((s / ringSteps) * Math.PI * 2, radiusFraction);
        const [fx1, fy1] = point(((s + 1) / ringSteps) * Math.PI * 2, radiusFraction);
        ringDots.stroke(fx0, fy0, fx1, fy1);
      }
    }

    // Spokes, one per axis, from the centre out to the outer ring.
    for (let i = 0; i < axisCount; i++) {
      const [fx, fy] = point((i / axisCount) * Math.PI * 2, 1);
      ringDots.stroke(0.5, 0.5, fx, fy);
    }
    ringDots.paint(g, colors.muted);

    // Series polygons, the first in the accent and the rest in fg.
    series.forEach((s, seriesIndex) => {
      const points: [number, number][] = [];
      for (let i = 0; i < axisCount; i++) {
        const value = Math.max(0, Math.min(s.values[i] ?? 0, maxValue));
        points.push(point((i / axisCount) * Math.PI * 2, value / maxValue));
      }
      for (let i = 0; i < points.length; i++) {
        const p0 = points[i];
        const p1 = points[(i + 1) % points.length];
        if (p0 && p1) seriesDots.stroke(p0[0], p0[1], p1[0], p1[1]);
      }
      seriesDots.paint(g, seriesIndex === 0 ? colors.accent : colors.fg);
      seriesDots.clear();
    });

    // Axis labels, placed in cell space just past the ring, in the margin held back for them.
    axes.forEach((axis, i) => {
      const [fx, fy] = point((i / axisCount) * Math.PI * 2, 1.5);
      const [col, row] = cellAt(fx, fy);
      const label = axis.label.slice(0, Math.max(1, side * 2));
      const startCol = Math.max(0, Math.min(cols - label.length, col - Math.floor(label.length / 2)));
      g.write(startCol, Math.max(0, Math.min(rows - 1, row)), label, colors.muted);
    });

    // Series names, placed inside the plot near each series' strongest axis.
    series.forEach((s, seriesIndex) => {
      const values = s.values || [];
      if (values.length === 0) return;
      let bestIdx = 0;
      let bestValue = Number.NEGATIVE_INFINITY;
      values.forEach((v, i) => {
        if (v > bestValue) {
          bestValue = v;
          bestIdx = i;
        }
      });
      const [fx, fy] = point((bestIdx / axisCount) * Math.PI * 2, 0.55);
      const [col, row] = cellAt(fx, fy);
      const name = s.name.slice(0, Math.max(1, area.cols));
      const startCol = Math.max(area.col, Math.min(area.col + area.cols - name.length, col - Math.floor(name.length / 2)));
      const tintRow = Math.max(area.row, Math.min(area.row + area.rows - 1, row));
      g.write(startCol, tintRow, name, seriesIndex === 0 ? colors.accent : colors.fg);
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
