import { labelHost, unlabelHost } from "../../../lib/a11y";
import { arcPath, dataTable, formatNumber, svg } from "../../../lib/chart";
import { polarPoint, svgLabel } from "../../../lib/chart-marks";
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
  /** Name for the gauge: drawn under the value, read by assistive technology, and used as the hidden data table's caption. */
  label: string;
  /** Unit to display after the value (e.g., "%", "°C"). */
  unit: string;
  /** Threshold values to mark on the arc as ticks. */
  thresholds: number[];
  /** Ring thickness as a fraction of its radius (0.05 to 0.4). */
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

/* Every angle here is in the one convention arcPath and polarPoint draw in: radians clockwise from
 * twelve o'clock. The arc's ends sit thirty degrees either side of straight down, so the ring sweeps
 * three hundred degrees over the top and the gap stays centred on six o'clock. */
const ARC_START = (210 * Math.PI) / 180;
const ARC_SWEEP = (300 * Math.PI) / 180;

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

  /** The dial has a range only when `max` sits past `min`; anything else has no angle for a value. */
  function ranged(): boolean {
    return Number.isFinite(props.min) && Number.isFinite(props.max) && props.max > props.min;
  }

  /** The dial angle for `v` clamped into the range: `min` at the left end, `max` at the right. */
  function angleOf(v: number): number {
    const share = Math.max(0, Math.min(1, (v - props.min) / (props.max - props.min)));
    return ARC_START + ARC_SWEEP * share;
  }

  /** The band's edges and centerline for a given outer radius and `thickness` as a share of the centerline. */
  function band(outer: number): { radius: number; inner: number; outer: number } {
    const thickness = Math.max(0.05, Math.min(0.4, props.thickness));
    const radius = outer / (1 + thickness / 2);
    return { radius, inner: radius * (1 - thickness / 2), outer };
  }

  /** In-range values to mark on the arc: `min`, `max`, and each threshold inside the range. */
  function tickValues(): number[] {
    const span = props.max - props.min;
    return Array.from(new Set([props.min, props.max, ...props.thresholds])).filter((t) => {
      const share = (t - props.min) / span;
      return share >= 0 && share <= 1;
    });
  }

  function drawSvg(): void {
    const view = root;
    if (!view) return;
    while (view.firstChild) view.firstChild.remove();

    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const fontSize = 11;
    const labelSize = Math.max(9, fontSize - 1);
    view.setAttribute("viewBox", `0 0 ${w} ${h}`);
    view.setAttribute("font-family", props.fontFamily);
    view.setAttribute("font-size", String(fontSize));

    const { radius, inner, outer } = band(Math.min(w, h) * 0.36);
    const centerX = w / 2;
    const centerY = h * 0.52;
    const arcEnd = ARC_START + ARC_SWEEP;

    // The muted track is the whole ring; the accent refills the value's share of the same band.
    view.appendChild(
      svg("path", { d: arcPath(centerX, centerY, inner, outer, ARC_START, arcEnd), fill: cssVar("muted") })
    );

    if (!ranged()) {
      view.appendChild(svgLabel("no range", centerX, centerY, { anchor: "middle", middle: true, size: fontSize, font: props.fontFamily }));
    } else {
      const valueAngle = angleOf(props.value);
      if (valueAngle > ARC_START) {
        view.appendChild(
          svg("path", { d: arcPath(centerX, centerY, inner, outer, ARC_START, valueAngle), fill: cssVar("accent") })
        );
      }

      // Each tick is a short line across the band at its own value, so no mark floats off the ring.
      for (const tick of tickValues()) {
        const a = ARC_START + ARC_SWEEP * ((tick - props.min) / (props.max - props.min));
        const [x1, y1] = polarPoint(centerX, centerY, Math.max(1, inner - 2), a);
        const [x2, y2] = polarPoint(centerX, centerY, outer + 5, a);
        view.appendChild(svg("line", { x1, y1, x2, y2, stroke: cssVar("muted"), "stroke-width": 1 }));

        if (tick === props.min || tick === props.max) {
          const [lx, ly] = polarPoint(centerX, centerY, outer + labelSize * 1.2, a);
          view.appendChild(svgLabel(formatNumber(tick), lx, ly, { anchor: "middle", middle: true, size: labelSize, font: props.fontFamily }));
        }
      }

      const valueText = `${formatNumber(props.value)}${props.unit}`;
      const valueLabel = svgLabel(valueText, centerX, centerY - radius * 0.08, {
        anchor: "middle",
        middle: true,
        size: Math.min(34, Math.max(16, Math.floor(radius * 0.22))),
        token: "fg",
        font: props.fontFamily,
      });
      valueLabel.style.fontWeight = "bold";
      view.appendChild(valueLabel);
    }

    if (props.label) {
      view.appendChild(
        svgLabel(props.label, centerX, centerY + radius * 0.32, { anchor: "middle", middle: true, size: labelSize, font: props.fontFamily })
      );
    }

    host.dataset.picaReady = "true";
  }

  function drawGlyph(): void {
    const g = grid;
    if (!g) return;
    g.clear();
    const { cols, rows } = g;
    const colors = readPalette(host);

    // The top row holds the gauge's name and the bottom row its min and max, so the dial sits between them.
    const inset: ChartInset = { top: 1, bottom: 1 };
    const area = chartCells({ cols, rows }, inset);
    const track = chartDots(area, g.aspect);
    const fill = chartDots(area, g.aspect);

    const physicalWidth = track.wide * track.aspect;
    const physicalHeight = track.tall;
    // The dial's bounding box is the outer radius across and one radius plus the gap's rise down the ends,
    // so it fills the area with the ends near its floor and the twelve o'clock point near its top.
    const { radius, inner, outer } = band(Math.min(physicalWidth * 0.46, physicalHeight * 0.48));
    const centerFx = 0.5;
    const centerFy = 0.5 - (outer / physicalHeight) * 0.07;

    /* A point on the dial at `angle` in the same convention drawSvg uses: radians clockwise from twelve
     * o'clock. The sine term scales by the dot grid's physical width and the cosine by its physical height,
     * which keeps the sweep round instead of squashed to the area's shape. */
    function pointAt(angle: number, r: number): readonly [number, number] {
      return [centerFx + (r * Math.sin(angle)) / physicalWidth, centerFy + (r * Math.cos(angle)) / physicalHeight];
    }

    /* The band is drawn as radial spokes, about one per dot around the sweep, so `thickness` sets a real
     * width here rather than the single dot a lone centerline would give. The track covers the whole
     * sweep in muted; the fill stops where the value sits, and `paint` leaves the track's dots alone. */
    const steps = Math.max(64, Math.ceil((outer * ARC_SWEEP) / 1.1));
    const valueAngle = ranged() ? angleOf(props.value) : ARC_START;
    for (let i = 0; i <= steps; i++) {
      const a = ARC_START + ARC_SWEEP * (i / steps);
      const [x0, y0] = pointAt(a, inner);
      const [x1, y1] = pointAt(a, outer);
      track.stroke(x0, y0, x1, y1);
      if (a <= valueAngle) fill.stroke(x0, y0, x1, y1);
    }

    if (ranged()) {
      // Each tick is a short spoke out from the band's edge, on the arc at its own value.
      for (const tick of tickValues()) {
        const a = ARC_START + ARC_SWEEP * ((tick - props.min) / (props.max - props.min));
        const [x0, y0] = pointAt(a, outer);
        const [x1, y1] = pointAt(a, outer + 3);
        track.stroke(x0, y0, x1, y1);
      }
    }

    track.paint(g, colors.muted);
    fill.paint(g, colors.accent);

    if (!ranged()) {
      const note = "no range";
      g.write(Math.max(0, area.colAt(0.5) - Math.floor(note.length / 2)), area.rowAt(centerFy), note, colors.muted);
    } else {
      // Min and max sit on the row under the dial's two ends, each beneath the end it names.
      const minLabel = formatNumber(props.min);
      const maxLabel = formatNumber(props.max);
      const [minFx] = pointAt(ARC_START, radius);
      const [maxFx] = pointAt(ARC_START + ARC_SWEEP, radius);
      const endFy = pointAt(ARC_START, outer)[1];
      const labelRow = Math.min(rows - 1, area.rowAt(endFy) + 1);
      const minCol = Math.max(0, area.colAt(minFx) - Math.floor(minLabel.length / 2));
      const maxCol = Math.min(cols - maxLabel.length, area.colAt(maxFx) - Math.floor(maxLabel.length / 2));
      g.write(minCol, labelRow, minLabel, colors.muted);
      if (maxCol > minCol + minLabel.length) g.write(maxCol, labelRow, maxLabel, colors.muted);

      // The value sits at the dial's own center, the one spot the ring never draws over.
      const valueText = `${formatNumber(props.value)}${props.unit}`;
      const textCol = Math.max(0, area.colAt(centerFx) - Math.floor(valueText.length / 2));
      g.write(textCol, area.rowAt(centerFy), valueText, colors.fg);
    }

    if (props.label) {
      const name = props.label.slice(0, cols);
      g.write(Math.max(0, Math.floor((cols - name.length) / 2)), 0, name, colors.muted);
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
