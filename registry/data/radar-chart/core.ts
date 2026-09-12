import { labelHost, unlabelHost } from "../../../lib/a11y";
import { arcPath, dataTable, formatNumber, svg } from "../../../lib/chart";
import { polarPoint } from "../../../lib/chart-marks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { sameJson } from "../../../lib/json";
import { cssVar, readPalette } from "../../../lib/palette";
import { createBraillePlot } from "../../../lib/braille-plot";
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

    const axes = props.data.axes || [];
    const series = props.data.series || [];
    const empty = axes.length === 0 || series.length === 0 || series.some((s) => !s.values || s.values.length === 0);
    const axisCount = axes.length || 1;
    const maxValue = Math.max(props.max, 1);

    if (empty) {
      const note = "no data";
      const x = Math.max(0, Math.floor((cols - note.length) / 2));
      const y = Math.floor(rows / 2);
      const colors = readPalette(host);
      g.write(x, y, note, colors.muted);
      g.flush();
      host.dataset.picaReady = "true";
      return;
    }

    const centerCol = cols / 2;
    const centerRow = rows / 2;
    const maxRadiusDots = Math.min(cols - 2, (rows - 2) * 2) / 2;

    // Draw rings with braille
    const braillePlot = createBraillePlot(cols, rows);

    for (let ringIdx = 1; ringIdx <= props.rings; ringIdx++) {
      const radius = (ringIdx / props.rings) * maxRadiusDots;
      for (let i = 0; i < axisCount; i++) {
        const angle = (i / axisCount) * Math.PI * 2;
        const x = centerCol + radius * Math.sin(angle);
        const y = centerRow - radius * Math.cos(angle);
        braillePlot.dot(x, y);
      }
    }

    // Draw axes
    for (let i = 0; i < axisCount; i++) {
      const angle = (i / axisCount) * Math.PI * 2;
      const x = centerCol + maxRadiusDots * Math.sin(angle);
      const y = centerRow - maxRadiusDots * Math.cos(angle);
      braillePlot.line(centerCol, centerRow, x, y);
    }

    // Draw series as polygons
    series.forEach((s) => {
      const pointsDots: Array<[number, number]> = [];
      for (let i = 0; i < axisCount; i++) {
        const angle = (i / axisCount) * Math.PI * 2;
        const value = Math.max(0, Math.min(s.values[i] ?? 0, maxValue));
        const radius = (value / maxValue) * maxRadiusDots;
        const x = centerCol + radius * Math.sin(angle);
        const y = centerRow - radius * Math.cos(angle);
        pointsDots.push([x, y] as [number, number]);
      }

      // Draw polygon edges
      for (let i = 0; i < pointsDots.length; i++) {
        const pt0 = pointsDots[i];
        const pt1 = pointsDots[(i + 1) % pointsDots.length];
        if (pt0 && pt1) {
          braillePlot.line(pt0[0], pt0[1], pt1[0], pt1[1]);
        }
      }
    });

    braillePlot.paint(g, 0, 0);
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
