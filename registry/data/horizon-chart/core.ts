import { dataTable, svg } from "../../../lib/chart";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type Grid } from "../../../lib/glyph-grid";
import { hostAttributes, nextId, styleHost } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar, watchPalette } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import type { Mount } from "../../../lib/types";

export interface HorizonChartProps {
  /** Named equally spaced series; null or nonfinite values leave gaps instead of implying zero. */
  series: { name: string; values: (number | null)[] }[];
  /** Value from which every signed deviation is measured. */
  baseline: number;
  /** Number of magnitude bands folded into each row, from 2 to 6. */
  bands: number;
  /** Shared sample labels in order; missing labels fall back to one-based sample numbers. */
  labels: string[];
  /** Glyph uses measured ink density; SVG uses exact folded areas with stippled density. */
  look: "glyph" | "svg";
  /** Accessible chart and data-table name; empty input hides the chart from assistive technology. */
  label: string;
}

export const defaults: HorizonChartProps = {
  series: [
    { name: "North", values: [0, 1, 3, 5, 7, 8, 6, 4, 1, -2, -4, -6, -7, -5, -3, 0, 2, 4, 6, 5, 3, 1, -1, -3] },
    { name: "Central", values: [-3, -4, -2, 0, 2, 4, 3, 1, -1, -3, -5, -4, -2, 1, 3, 5, 7, 6, 4, 2, 0, -2, -4, -2] },
    { name: "South", values: [4, 3, 1, -2, -4, -6, -8, -7, -5, -2, 1, 3, 5, 4, 2, 0, -1, -3, -4, -2, 0, 2, 4, 5] },
  ],
  baseline: 0,
  bands: 4,
  labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`),
  look: "glyph",
  label: "Hourly signed deviations by region",
};

const HORIZON_ORDER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

function horizonNumber(value: number): string {
  if (!Number.isFinite(value)) return "Missing";
  if (Math.abs(value) >= 10000 || (value !== 0 && Math.abs(value) < 0.001)) return value.toExponential(2);
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function horizonValid(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export const mount: Mount<HorizonChartProps> = (host, initial = {}) => {
  let props: HorizonChartProps = { ...defaults, ...initial };
  let alive = true;
  let ready = false;
  let grid: Grid | null = null;
  let graphic: SVGSVGElement | null = null;
  let table: HTMLTableElement | null = null;
  const attributes = hostAttributes(host);
  const restore = styleHost(host, getComputedStyle(host).position === "static" ? { position: "relative" } : {});
  const frame = document.createElement("div");
  frame.setAttribute("data-pica", "");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${cssVar("bg")}`;
  host.appendChild(frame);
  const patternPrefix = nextId("horizon-density");
  const palette = watchPalette(host, () => { if (alive && ready) draw(); });

  function data(): HorizonChartProps["series"] {
    return Array.isArray(props.series) ? props.series.filter((row) => row && Array.isArray(row.values)) : [];
  }

  function dimensions(): { baseline: number; bands: number; maximum: number; step: number; count: number } {
    const baseline = Number.isFinite(props.baseline) ? props.baseline : defaults.baseline;
    const bands = Math.max(2, Math.min(6, Math.round(Number.isFinite(props.bands) ? props.bands : defaults.bands)));
    let maximum = 0;
    let count = 0;
    for (const row of data()) {
      count = Math.max(count, row.values.length);
      for (const value of row.values) if (horizonValid(value)) maximum = Math.max(maximum, Math.abs(value - baseline));
    }
    return { baseline, bands, maximum, step: maximum > 0 ? maximum / bands : 1, count };
  }

  function sampleLabel(index: number): string {
    return props.labels[index] || String(index + 1);
  }

  function accessibility(): void {
    const label = props.label.trim();
    attributes.set("role", label ? "group" : null);
    attributes.set("aria-label", label ? `${label}. Density encodes absolute deviation from the baseline; slash hatching marks negative values. Rows share one magnitude scale.` : null);
    attributes.set("aria-hidden", label ? null : "true");
  }

  function updateTable(): void {
    table?.remove();
    const scale = dimensions();
    table = dataTable(props.label || "Horizon chart", ["Series", "Sample", "Value", "Signed deviation", "Magnitude band", "Sign"], data().flatMap((row) => row.values.map((value, index) => {
      const valid = horizonValid(value);
      const deviation = valid ? value - scale.baseline : 0;
      return [row.name || "Unnamed series", sampleLabel(index), valid ? value : "Missing", valid ? deviation : "Missing", valid ? Math.min(scale.bands, Math.ceil(Math.abs(deviation) / scale.step)) : "Missing", valid ? deviation < 0 ? "Negative (slash hatched)" : deviation > 0 ? "Positive" : "At baseline" : "Missing"];
    })));
    host.appendChild(table);
  }

  function interpolated(values: (number | null)[], t: number): number | null {
    const index = Math.floor(t);
    const a = values[index];
    const fraction = t - index;
    if (!horizonValid(a)) return null;
    if (fraction < 0.000001) return a;
    const b = values[index + 1];
    return horizonValid(b) ? a + (b - a) * fraction : null;
  }

  function drawGlyph(): void {
    if (!grid) return;
    const g = grid;
    const colors = palette.colors;
    const rows = data();
    const scale = dimensions();
    const ramp = measureRamp(" .:-=+*#%@", GRID_FONT, 1.3);
    g.clear();
    const left = Math.min(2, Math.max(0, g.cols - 1));
    const width = Math.max(1, g.cols - 4);
    g.write(left, 1, `BASE ${horizonNumber(scale.baseline)}  ${scale.bands} BANDS x ${horizonNumber(scale.step)}`.slice(0, width), colors.fg);
    const bandRows = Math.max(1, Math.min(5, Math.floor(Math.max(1, g.rows - 9) / Math.max(1, rows.length)) - 2));
    const laneRows = bandRows + 3;
    const start = Math.max(4, Math.floor((g.rows - rows.length * laneRows) / 2));
    rows.forEach((row, index) => {
      const top = start + index * laneRows;
      const latest = [...row.values].reverse().find(horizonValid);
      const deviation = latest === undefined ? "Missing" : `${latest - scale.baseline >= 0 ? "+" : ""}${horizonNumber(latest - scale.baseline)}`;
      g.write(left, top - 1, (row.name || "Unnamed series").slice(0, Math.max(1, width - deviation.length - 2)), colors.fg);
      if (width > deviation.length + 4) g.write(left + width - deviation.length, top - 1, deviation, colors.fg);
      for (let x = 0; x < width; x++) {
        const value = interpolated(row.values, width <= 1 ? 0 : x / (width - 1) * Math.max(0, scale.count - 1));
        if (value === null) continue;
        const signed = value - scale.baseline;
        const magnitude = Math.abs(signed) / scale.step;
        for (let y = 0; y < bandRows; y++) {
          const height = (bandRows - y - 0.5) / bandRows;
          if (magnitude <= height) continue;
          const band = Math.min(scale.bands - 1, Math.floor(magnitude - height));
          const tone = 0.18 + 0.8 * (band + 1) / scale.bands;
          const glyph = signed < 0 && (x + y * 2) % 4 === 0 ? "/" : pick(ramp, tone);
          g.set(left + x, top + y, glyph, colors.fg);
        }
        if (x % 4 === 0) g.set(left + x, top + bandRows, ".", colors.muted);
      }
      row.values.forEach((value, sample) => {
        if (!horizonValid(value) || scale.count <= 1 || horizonValid(row.values[sample - 1]) || horizonValid(row.values[sample + 1])) return;
        const x = Math.round(sample / (scale.count - 1) * (width - 1));
        const signed = value - scale.baseline;
        const magnitude = Math.abs(signed) / scale.step;
        for (let y = 0; y < bandRows; y++) {
          const height = (bandRows - y - 0.5) / bandRows;
          if (magnitude <= height) continue;
          const band = Math.min(scale.bands - 1, Math.floor(magnitude - height));
          g.set(left + x, top + y, signed < 0 ? "/" : pick(ramp, 0.18 + 0.8 * (band + 1) / scale.bands), colors.fg);
        }
      });
    });
    if (!rows.length || !scale.count) g.write(left, Math.floor(g.rows / 2), "NO SERIES DATA".slice(0, width), colors.fg);
    const ticks = width >= 48 ? 5 : width >= 20 ? 3 : 2;
    const tickRow = Math.max(0, g.rows - 3);
    for (let i = 0; i < ticks && scale.count; i++) {
      const index = Math.round(i / (ticks - 1) * Math.max(0, scale.count - 1));
      const label = sampleLabel(index).slice(0, Math.max(1, Math.floor(width / ticks) - 1));
      const x = Math.max(left, Math.min(left + width - label.length, left + Math.round(i / (ticks - 1) * (width - 1)) - Math.floor(label.length / 2)));
      g.write(x, tickRow, label, colors.fg);
    }
    g.write(left, Math.max(0, g.rows - 1), "/ NEGATIVE  DENSITY = MAGNITUDE".slice(0, width), colors.fg);
    g.flush();
  }

  function drawSvg(): void {
    graphic?.remove();
    const width = Math.max(1, frame.clientWidth);
    const height = Math.max(1, frame.clientHeight);
    const rows = data();
    const scale = dimensions();
    const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}`, "font-family": GRID_FONT, "font-size": 11 });
    root.style.cssText = "width:100%;height:100%;display:block";
    graphic = root;
    frame.appendChild(root);
    const defs = svg("defs", { "data-pica": "" });
    root.appendChild(defs);
    for (let band = 0; band < scale.bands; band++) {
      const pattern = svg("pattern", { "data-pica": "", id: `${patternPrefix}-${band}`, width: 8, height: 8, patternUnits: "userSpaceOnUse" });
      const sites = Math.max(1, Math.round((band + 1) / scale.bands * 16));
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        if ((HORIZON_ORDER[y * 4 + x] ?? 0) < sites) pattern.appendChild(svg("circle", { "data-pica": "", cx: x * 2 + 1, cy: y * 2 + 1, r: 0.9, fill: cssVar("fg") }));
      }
      defs.appendChild(pattern);
    }
    const negative = svg("pattern", { "data-pica": "", id: `${patternPrefix}-negative`, width: 8, height: 8, patternUnits: "userSpaceOnUse" });
    negative.appendChild(svg("path", { "data-pica": "", d: "M-2 2L2 -2M0 8L8 0M6 10L10 6", fill: "none", stroke: cssVar("fg"), "stroke-width": 0.8 }));
    defs.appendChild(negative);
    function text(x: number, y: number, value: string, anchor = "start"): void {
      const node = svg("text", { "data-pica": "", x, y, fill: cssVar("fg"), "text-anchor": anchor });
      node.textContent = value;
      root.appendChild(node);
    }
    const left = Math.min(18, width * 0.05);
    const plotWidth = Math.max(1, width - left * 2);
    text(left, 24, `BASE ${horizonNumber(scale.baseline)}  /  ${scale.bands} BANDS x ${horizonNumber(scale.step)}`);
    const bandHeight = Math.max(6, Math.min(54, (height - 120) / Math.max(1, rows.length) - 28));
    const laneHeight = bandHeight + 28;
    const start = Math.max(64, (height - rows.length * laneHeight) / 2);
    rows.forEach((row, rowIndex) => {
      const top = start + rowIndex * laneHeight;
      const bottom = top + bandHeight;
      text(left, top - 9, (row.name || "Unnamed series").slice(0, Math.max(1, Math.floor(plotWidth / 7) - 12)));
      const latest = [...row.values].reverse().find(horizonValid);
      text(left + plotWidth, top - 9, latest === undefined ? "Missing" : `${latest - scale.baseline >= 0 ? "+" : ""}${horizonNumber(latest - scale.baseline)}`, "end");
      function area(sign: number, band: number): string {
        let path = "";
        let points: [number, number][] = [];
        function flush(): void {
          const first = points[0];
          const last = points[points.length - 1];
          if (first && last) {
            if (points.length === 1) {
              const span = scale.count === 1 ? plotWidth : Math.max(2, plotWidth / Math.max(1, scale.count - 1) * 0.15);
              const x0 = Math.max(left, Math.min(left + plotWidth - span, first[0] - span / 2));
              path += `M${x0},${bottom}L${x0},${first[1]}L${x0 + span},${first[1]}L${x0 + span},${bottom}Z`;
            } else path += `M${first[0]},${bottom}L${points.map((point) => `${point[0]},${point[1]}`).join("L")}L${last[0]},${bottom}Z`;
          }
          points = [];
        }
        function append(index: number, value: number): void {
          const magnitude = sign * (value - scale.baseline) / scale.step;
          const folded = Math.max(0, Math.min(1, magnitude - band));
          points.push([left + index / Math.max(1, scale.count - 1) * plotWidth, bottom - folded * bandHeight]);
        }
        row.values.forEach((value, index) => {
          if (!horizonValid(value)) { flush(); return; }
          append(index, value);
          const next = row.values[index + 1];
          if (!horizonValid(next) || next === value) return;
          // Insert every fold crossing: the SVG area remains piecewise exact.
          const crossings = [0, band * scale.step, (band + 1) * scale.step].map((level) => (scale.baseline + sign * level - value) / (next - value)).filter((t) => t > 0 && t < 1).sort((a, b) => a - b);
          for (const t of crossings) append(index + t, value + (next - value) * t);
        });
        flush();
        return path;
      }
      for (let band = 0; band < scale.bands; band++) {
        for (const sign of [1, -1]) root.appendChild(svg("path", { "data-pica": "", d: area(sign, band), fill: `url(#${patternPrefix}-${band})` }));
      }
      root.appendChild(svg("path", { "data-pica": "", d: area(-1, 0), fill: `url(#${patternPrefix}-negative)` }));
      root.appendChild(svg("line", { "data-pica": "", x1: left, x2: left + plotWidth, y1: bottom, y2: bottom, stroke: cssVar("muted"), "stroke-width": 0.7, "stroke-dasharray": "2 5" }));
    });
    const ticks = width >= 500 ? 5 : 3;
    for (let i = 0; i < ticks && scale.count; i++) {
      const index = Math.round(i / (ticks - 1) * Math.max(0, scale.count - 1));
      text(left + i / (ticks - 1) * plotWidth, height - 34, sampleLabel(index).slice(0, Math.max(1, Math.floor(plotWidth / ticks / 7))), i === 0 ? "start" : i === ticks - 1 ? "end" : "middle");
    }
    text(left, height - 12, "/ NEGATIVE  /  DENSITY = MAGNITUDE");
    if (!rows.length || !scale.count) text(width / 2, height / 2, "NO SERIES DATA", "middle");
  }

  function draw(): void {
    if (!alive) return;
    if (grid) drawGlyph(); else drawSvg();
    attributes.set("data-pica-ready", "true");
  }

  function mountView(): void {
    if (props.look !== "svg") grid = createGrid(frame, { fontFamily: GRID_FONT, fontSize: 12, columns: 0, lineHeight: 1.3, renderer: "canvas", color: "" }, draw);
    draw();
  }

  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => { if (alive && ready && !grid) draw(); }) : null;
  resize?.observe(frame);
  accessibility();
  updateTable();
  ready = true;
  mountView();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const dataChanged = !sameJson(before.series, props.series) || !sameJson(before.labels, props.labels) || before.baseline !== props.baseline || before.bands !== props.bands;
      if (dataChanged || before.label !== props.label) updateTable();
      if (before.label !== props.label) accessibility();
      const recolored = palette.refresh();
      if (before.look !== props.look) {
        grid?.destroy();
        grid = null;
        graphic?.remove();
        graphic = null;
        mountView();
      } else if (dataChanged || recolored) draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      resize?.disconnect();
      palette.destroy();
      grid?.destroy();
      frame.remove();
      table?.remove();
      attributes.restore();
      restore();
    },
  };
};
