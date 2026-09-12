import { labelHost, unlabelHost } from "../../../lib/a11y";
import { arcPath, dataTable, formatNumber, svg } from "../../../lib/chart";
import { chartCells, chartDots, type ChartInset } from "../../../lib/chart-plot";
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

    // The bottom row holds the min and max labels, so the dial itself sits above them.
    const inset: ChartInset = { bottom: 1 };
    const area = chartCells({ cols, rows }, inset);
    const track = chartDots(area, g.aspect);
    const fill = chartDots(area, g.aspect);

    /* A point on the dial at `angleDeg`, in the convention drawSvg uses: 0 is right, 90 is down. The cosine
     * term is scaled by the dot grid's physical width and the sine term by its physical height, rather than
     * by one shared radius, which is what keeps the sweep round instead of squashed to the area's shape. */
    const physicalWidth = track.wide * track.aspect;
    const physicalHeight = track.tall;
    // The same proportion drawSvg uses for its own arc radius, so the dial reads at the same size on
    // both grounds: a modest fraction of the smaller physical dimension, with margin on every side.
    const radius = Math.min(physicalWidth, physicalHeight) * 0.28;
    const centerFx = 0.5;
    // drawSvg centers its arc 60% of the way down from the top; read bottom-up that is 40% up from the floor.
    const centerFy = 0.4;

    function pointAt(angleDeg: number): readonly [number, number] {
      const angleRad = (angleDeg * Math.PI) / 180;
      const fx = centerFx + (radius * Math.cos(angleRad)) / physicalWidth;
      const fy = centerFy - (radius * Math.sin(angleRad)) / physicalHeight;
      return [fx, fy];
    }

    /* The track runs the whole sweep and the fill stops where the value sits. Drawing only the track would
     * leave the glyph look showing an empty dial, the same picture for every value it is given. */
    const arcSteps = 48;
    let prev = pointAt(ARC_START_ANGLE);
    for (let i = 1; i <= arcSteps; i++) {
      const t = i / arcSteps;
      const next = pointAt(ARC_START_ANGLE + ARC_DEGREES * t);
      track.stroke(prev[0], prev[1], next[0], next[1]);
      if (t <= clampedNorm) fill.stroke(prev[0], prev[1], next[0], next[1]);
      prev = next;
    }

    // A blank dot from the fill would rub out the track underneath it, so `paint` leaves it alone.
    track.paint(g, colors.muted);
    fill.paint(g, colors.accent);

    // Min and max sit in the reserved row, under the dial's two ends.
    const labelRow = rows - 1;
    const minLabel = formatNumber(props.min);
    const maxLabel = formatNumber(props.max);
    const [minFx] = pointAt(ARC_START_ANGLE);
    const [maxFx] = pointAt(ARC_START_ANGLE + ARC_DEGREES);
    const minCol = Math.max(0, area.colAt(minFx) - Math.floor(minLabel.length / 2));
    const maxCol = Math.min(cols - maxLabel.length, area.colAt(maxFx) - Math.floor(maxLabel.length / 2));
    g.write(minCol, labelRow, minLabel, colors.muted);
    if (maxCol > minCol + minLabel.length) g.write(maxCol, labelRow, maxLabel, colors.muted);

    // The value sits at the dial's own center, the one spot the ring never draws over.
    const textRow = area.rowAt(centerFy);
    const textCol = Math.max(0, area.colAt(centerFx) - Math.floor(valueText.length / 2));
    g.write(textCol, textRow, valueText, colors.fg);

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
