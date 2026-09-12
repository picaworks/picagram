import { labelHost, unlabelHost } from "../../../lib/a11y";
import { braille } from "../../../lib/blocks";
import { arcPath, dataTable, formatNumber, svg } from "../../../lib/chart";
import { createBraillePlot } from "../../../lib/braille-plot";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { cssVar, readPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface GaugeChartProps {
  /** The current value to display. */
  value: number;
  /** The minimum value of the range. */
  min: number;
  /** The maximum value of the range. */
  max: number;
  /** Name for the gauge, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** Unit to display after the value (e.g., "%", "°C"). */
  unit: string;
  /** Threshold values to mark on the arc as ticks. */
  thresholds: number[];
  /** Thickness of the arc as a fraction of the radius (0.05 to 0.4). */
  thickness: number;
  /** "svg" draws an SVG arc with labels. "glyph" draws the same arc in a braille grid. */
  look: "svg" | "glyph";
  /** CSS font-family stack for every label. Must be monospace. */
  fontFamily: string;
}

export const defaults: GaugeChartProps = {
  value: 68,
  min: 0,
  max: 100,
  label: "Cache hit rate",
  unit: "%",
  thresholds: [50, 90],
  thickness: 0.16,
  look: "svg",
  fontFamily: GRID_FONT,
};

const ARC_DEGREES = 240;
const ARC_START_ANGLE = 150; // Starting angle: 150 degrees (left side of 240 degree arc)

export const mount: Mount<GaugeChartProps> = (host, initial = {}) => {
  let props: GaugeChartProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;

  function renderTable(): void {
    table?.remove();
    table = dataTable(props.label || "Gauge chart", ["Value"], [[props.value]]);
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

    const radius = Math.min(w, h) * 0.35;
    const centerX = w / 2;
    const centerY = h * 0.6;
    const arcRadius = radius * 0.8;
    const valueText = `${formatNumber(props.value)}${props.unit}`;
    const valueTextSize = Math.min(24, Math.max(14, Math.floor(h * 0.15)));

    // Calculate arc endpoints for 240-degree arc
    const startAngleRad = (ARC_START_ANGLE * Math.PI) / 180;
    const endAngleRad = ((ARC_START_ANGLE + ARC_DEGREES) * Math.PI) / 180;

    // Draw background arc (light, muted)
    const bgArc = svg("path", {
      d: arcPath(centerX, centerY, arcRadius, arcRadius, startAngleRad, endAngleRad),
      fill: "none",
      stroke: cssVar("muted"),
      "stroke-width": Math.max(1, arcRadius * props.thickness * 0.3),
      opacity: "0.3",
    });
    view.appendChild(bgArc);

    // Draw filled arc based on value
    const normalized = (props.value - props.min) / (props.max - props.min);
    const clampedNorm = Math.max(0, Math.min(1, normalized));
    const valueAngleRad = startAngleRad + (endAngleRad - startAngleRad) * clampedNorm;
    const valueArc = svg("path", {
      d: arcPath(centerX, centerY, arcRadius, arcRadius, startAngleRad, valueAngleRad),
      fill: "none",
      stroke: cssVar("accent"),
      "stroke-width": arcRadius * props.thickness,
      "stroke-linecap": "round",
    });
    view.appendChild(valueArc);

    // Draw ticks at min, max, and threshold values
    const allTicks = [props.min, props.max, ...props.thresholds];
    const uniqueTicks = Array.from(new Set(allTicks)).sort((a, b) => a - b);

    for (const tick of uniqueTicks) {
      const tickNorm = (tick - props.min) / (props.max - props.min);
      if (tickNorm < 0 || tickNorm > 1) continue;
      const tickAngleRad = startAngleRad + (endAngleRad - startAngleRad) * tickNorm;
      const tickInnerRadius = arcRadius * 0.85;
      const tickOuterRadius = arcRadius * 1.1;
      const tickX1 = centerX + tickInnerRadius * Math.cos(tickAngleRad);
      const tickY1 = centerY + tickInnerRadius * Math.sin(tickAngleRad);
      const tickX2 = centerX + tickOuterRadius * Math.cos(tickAngleRad);
      const tickY2 = centerY + tickOuterRadius * Math.sin(tickAngleRad);

      view.appendChild(
        svg("line", {
          x1: tickX1,
          y1: tickY1,
          x2: tickX2,
          y2: tickY2,
          stroke: cssVar("muted"),
          "stroke-width": 1,
        })
      );

      // Add labels for min and max
      if (tick === props.min || tick === props.max) {
        const labelRadius = arcRadius * 1.25;
        const labelX = centerX + labelRadius * Math.cos(tickAngleRad);
        const labelY = centerY + labelRadius * Math.sin(tickAngleRad);
        const label = svg("text", {
          x: labelX,
          y: labelY,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          fill: cssVar("muted"),
          "font-size": Math.max(9, fontSize - 2),
        });
        label.textContent = formatNumber(tick);
        view.appendChild(label);
      }
    }

    // Draw center value text
    const valueLabel = svg("text", {
      x: centerX,
      y: centerY - radius * 0.15,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      fill: cssVar("fg"),
      "font-size": valueTextSize,
      "font-weight": "bold",
      "font-family": props.fontFamily,
    });
    valueLabel.textContent = valueText;
    view.appendChild(valueLabel);

    host.dataset.picaReady = "true";
  }

  function drawGlyph(): void {
    const g = grid;
    if (!g) return;
    g.clear();
    const { cols, rows } = g;
    const colors = readPalette(host);

    const valueText = `${formatNumber(props.value)}${props.unit}`;
    const normalized = (props.value - props.min) / (props.max - props.min);
    const clampedNorm = Math.max(0, Math.min(1, normalized));

    const track = createBraillePlot(cols, rows);
    const fill = createBraillePlot(cols, rows);

    const centerX = track.width / 2;
    const centerY = track.height * 0.7;
    const arcRadius = Math.min(centerX, centerY) * 0.6;

    /* The track runs the whole sweep and the fill stops where the value sits. Drawing only the track would
     * leave the glyph look showing an empty dial, the same picture for every value it is given. */
    const arcSteps = 48;
    let prevX = 0;
    let prevY = 0;
    for (let i = 0; i <= arcSteps; i++) {
      const t = i / arcSteps;
      const angleRad = ((ARC_START_ANGLE + ARC_DEGREES * t) * Math.PI) / 180;
      const x = Math.round(centerX + arcRadius * Math.cos(angleRad));
      const y = Math.round(centerY + arcRadius * Math.sin(angleRad));
      if (i > 0) {
        track.line(prevX, prevY, x, y);
        if (t <= clampedNorm) fill.line(prevX, prevY, x, y);
      }
      prevX = x;
      prevY = y;
    }

    // A blank cell from the fill would rub out the track underneath it, so only inked cells are written.
    const blank = braille(0);
    track.paint({ set: (col, row, glyph) => g.set(col, row, glyph, colors.muted) }, 0, 0);
    fill.paint({
      set: (col, row, glyph) => {
        if (glyph !== blank) g.set(col, row, glyph, colors.accent);
      },
    }, 0, 0);

    // Draw value text in center
    const textRow = Math.max(2, Math.floor(centerY / 4 - 1));
    const textCol = Math.max(0, Math.floor(centerX / 2 - Math.floor(valueText.length / 2)));
    if (textRow >= 0 && textRow < rows && textCol >= 0) {
      g.write(textCol, textRow, valueText, colors.fg);
    }

    g.flush();
    host.dataset.picaReady = "true";
  }

  function draw(): void {
    if (grid) drawGlyph();
    else drawSvg();
  }

  function gridOptions(): GridOptions {
    return { fontFamily: props.fontFamily, fontSize: 12, columns: 0, lineHeight: 1, renderer: "canvas", color: "" };
  }

  function mountView(): void {
    if (props.look === "glyph") {
      grid = createGrid(host, gridOptions(), drawGlyph);
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
      if (props.label !== before.label || props.value !== before.value) renderTable();
      if (props.look !== before.look) {
        unmountView();
        mountView();
      } else if (grid && props.fontFamily !== before.fontFamily) {
        grid.update(gridOptions());
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
