import { labelHost, unlabelHost } from "../../../lib/a11y";
import { shade } from "../../../lib/blocks";
import { arcPath, dataTable, formatNumber, svg } from "../../../lib/chart";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, measureCell, type Grid, type GridOptions } from "../../../lib/glyph-grid";
import { cssVar, readPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface DonutChartProps {
  /** Parts of the whole, each a label and a value. A value that is not a positive finite number counts as zero. */
  data: { label: string; value: number }[];
  /** Name for the chart, read by assistive technology and used as the hidden data table's caption. */
  label: string;
  /** Index of the segment drawn in the accent. -1 highlights the segment with the largest value. */
  highlight: number;
  /** Ring width as a share of its outer radius, from a thin band to a thick one. */
  thickness: number;
  /** Empty space between segments, in degrees. */
  gap: number;
  /** What the ring's center shows: the sum of every value, the highlighted segment's share, or nothing. */
  center: "total" | "highlight" | "none";
  /** "svg" draws ring segments with direct or listed labels. "glyph" fills the ring in a monospace grid. */
  look: "svg" | "glyph";
  /** CSS font-family stack for every label and number the chart draws. Must be monospace. */
  fontFamily: string;
}

export const defaults: DonutChartProps = {
  data: [
    { label: "ASCII", value: 42 },
    { label: "Dither", value: 23 },
    { label: "Shaders", value: 18 },
    { label: "Charts", value: 11 },
    { label: "Controls", value: 6 },
  ],
  label: "Components by family",
  highlight: -1,
  thickness: 0.28,
  gap: 1.5,
  center: "highlight",
  look: "svg",
  fontFamily: GRID_FONT,
};

/** A full turn, in radians. Every angle here runs clockwise from twelve o'clock, as arcPath expects. */
const TAU = Math.PI * 2;
/** Opacity steps for segments drawn in fg, cycled by each segment's position in the data array, so
 *  neighbors read as separate slices without a second hue. */
const FG_STEPS: readonly number[] = [1, 0.72, 0.48, 0.3];
/** Pixel size of the labels the svg look draws, and the gap it keeps around a mark. */
const LABEL_SIZE = 11;
const GAP = 8;
/** Columns across the ring in the glyph look, fixed rather than derived from the host width, so each shade
 *  glyph stays large enough to read as a glyph instead of blurring into a smooth mask. */
const GLYPH_COLUMNS = 52;

interface DonutSlice {
  /** Position in props.data, which both looks use to cycle tone and to resolve `highlight`. */
  index: number;
  label: string;
  value: number;
  /** Share of the total, 0 to 1. 0 for every slice when every value is zero. */
  share: number;
  start: number;
  end: number;
  mid: number;
}

/** `value` as a chart weight: a positive finite number, or zero for anything else, so a negative or
 *  missing value never draws a backward slice. */
function positiveNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Slices proportional to each value, running clockwise from twelve o'clock, and the total of every value. */
function buildSlices(data: DonutChartProps["data"]): { slices: DonutSlice[]; total: number } {
  const values = data.map((d) => positiveNumber(d?.value));
  const total = values.reduce((sum, v) => sum + v, 0);
  let angle = 0;
  const slices = data.map((d, index) => {
    const value = values[index] ?? 0;
    const span = total > 0 ? (value / total) * TAU : 0;
    const start = angle;
    angle += span;
    return { index, label: typeof d?.label === "string" ? d.label : "", value, share: total > 0 ? value / total : 0, start, end: angle, mid: start + span / 2 };
  });
  return { slices, total };
}

/** The index drawn in the accent: the largest value when `highlight` is -1, otherwise `highlight` itself, so
 *  a value past the end of the data highlights nothing rather than clamping to a slice the viewer did not ask for. */
function resolveHighlight(slices: readonly DonutSlice[], highlight: number): number {
  if (highlight !== -1) return highlight;
  let best = -1;
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const slice of slices) {
    if (slice.value > bestValue) {
      bestValue = slice.value;
      best = slice.index;
    }
  }
  return best;
}

/** Degrees between each slice's center and the next slice's, the smallest of which decides whether a
 *  direct label still has room. */
function minCenterGap(slices: readonly DonutSlice[]): number {
  let min = 360;
  for (let i = 0; i < slices.length; i++) {
    const a = slices[i]?.mid ?? 0;
    const b = slices[(i + 1) % slices.length]?.mid ?? 0;
    const diff = ((b - a + TAU) % TAU || TAU) * (180 / Math.PI);
    min = Math.min(min, diff);
  }
  return min;
}

/** Direct labels crowd once there are many segments or two centers fall close together, and more readily
 *  on a narrow host, where a label has less room to run before it meets its neighbor or the edge. */
function needsList(slices: readonly DonutSlice[], hostWidth: number): boolean {
  if (slices.length < 2) return false;
  if (slices.length > 12) return true;
  return minCenterGap(slices) < (hostWidth < 480 ? 30 : 15);
}

/** The slice angle falls within, or -1 between floating point rounding at the seam back to twelve o'clock. */
function sliceAt(slices: readonly DonutSlice[], angle: number): number {
  for (const slice of slices) {
    if (angle >= slice.start && angle < slice.end) return slice.index;
  }
  const last = slices[slices.length - 1];
  return last && angle >= last.start ? last.index : -1;
}

export const mount: Mount<DonutChartProps> = (host, initial = {}) => {
  let props: DonutChartProps = { ...defaults, ...initial };
  let root: SVGSVGElement | null = null;
  let grid: Grid | null = null;
  let resize: ResizeObserver | null = null;
  let table: HTMLTableElement | null = null;

  function gridOptions(): GridOptions {
    return { fontFamily: props.fontFamily, fontSize: 12, columns: GLYPH_COLUMNS, lineHeight: 1, renderer: "canvas", color: "" };
  }

  function renderTable(): void {
    table?.remove();
    const { slices } = buildSlices(props.data);
    table = dataTable(
      props.label || "Donut chart",
      ["Label", "Value", "Share"],
      slices.map((s) => [s.label || `Segment ${s.index + 1}`, s.value, `${Math.round(s.share * 100)}%`]),
    );
    host.appendChild(table);
  }

  function drawSvg(): void {
    const view = root;
    if (!view) return;
    while (view.firstChild) view.firstChild.remove();
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    view.setAttribute("viewBox", `0 0 ${w} ${h}`);
    view.setAttribute("font-family", props.fontFamily);
    view.setAttribute("font-size", String(LABEL_SIZE));

    const { slices, total } = buildSlices(props.data);
    const n = slices.length;
    const empty = n === 0 || total <= 0;
    const thickness = Math.max(0.05, Math.min(0.95, props.thickness));

    if (empty) {
      const outerR = Math.max(3, Math.min(w, h) / 2 - GAP);
      const innerR = outerR * (1 - thickness);
      view.appendChild(svg("path", { d: arcPath(w / 2, h / 2, innerR, outerR, 0, TAU), fill: cssVar("muted") }));
      const note = svg("text", { x: w / 2, y: h / 2, "text-anchor": "middle", "dominant-baseline": "central", fill: cssVar("muted") });
      note.textContent = "no data";
      view.appendChild(note);
    } else {
      const highlightIndex = resolveHighlight(slices, props.highlight);
      const useList = needsList(slices, w);
      const charW = measureCell(props.fontFamily, LABEL_SIZE, 1).w;
      const longestLabel = Math.max(1, ...slices.map((s) => s.label.length));
      const listWidth = useList ? Math.max(...slices.map((s) => (s.label.length + 5) * charW)) + GAP * 2 : 0;
      const plotW = useList ? Math.max(20, w - listWidth - GAP) : w;
      const cx = plotW / 2;
      const cy = h / 2;
      // A direct label can run outward from any edge of the ring, so the whole rim keeps enough clearance
      // for the longest one, however that particular segment happens to be angled when the host is narrow.
      const margin = useList ? GAP : Math.max(LABEL_SIZE * 1.6, longestLabel * charW) + GAP;
      const outerR = Math.max(3, Math.min(plotW, h) / 2 - margin);
      const innerR = outerR * (1 - thickness);
      const gapRad = (Math.max(0, Math.min(10, props.gap)) * Math.PI) / 180;

      for (const slice of slices) {
        const inset = n > 1 ? Math.min(gapRad / 2, (slice.end - slice.start) / 2) : 0;
        const start = slice.start + inset;
        const end = Math.max(start, slice.end - inset);
        const isHighlight = slice.index === highlightIndex;
        const opacity = isHighlight ? 1 : (FG_STEPS[slice.index % FG_STEPS.length] ?? 1);
        const path = svg("path", { d: arcPath(cx, cy, innerR, outerR, start, end), fill: isHighlight ? cssVar("accent") : cssVar("fg") });
        if (opacity < 1) path.setAttribute("fill-opacity", String(opacity));
        view.appendChild(path);
      }

      if (useList) {
        const rowH = LABEL_SIZE * 1.7;
        const top = cy - (n * rowH) / 2 + rowH / 2;
        const listX = plotW + GAP;
        const sw = LABEL_SIZE * 0.7;
        slices.forEach((slice, i) => {
          const y = top + i * rowH;
          const isHighlight = slice.index === highlightIndex;
          const opacity = isHighlight ? 1 : (FG_STEPS[slice.index % FG_STEPS.length] ?? 1);
          const swatch = svg("rect", { x: listX, y: y - sw / 2, width: sw, height: sw, fill: isHighlight ? cssVar("accent") : cssVar("fg") });
          if (opacity < 1) swatch.setAttribute("fill-opacity", String(opacity));
          view.appendChild(swatch);
          const name = svg("text", { x: listX + sw + GAP * 0.6, y, "dominant-baseline": "central", fill: cssVar("fg") });
          name.textContent = slice.label || `Segment ${slice.index + 1}`;
          view.appendChild(name);
          const pct = svg("text", { x: w, y, "text-anchor": "end", "dominant-baseline": "central", fill: cssVar("muted") });
          pct.textContent = `${Math.round(slice.share * 100)}%`;
          view.appendChild(pct);
        });
      } else {
        for (const slice of slices) {
          if (!slice.label) continue;
          const sx = Math.sin(slice.mid);
          const r = outerR + GAP;
          const x = cx + r * sx;
          const y = cy - r * Math.cos(slice.mid);
          const anchor = sx > 0.2 ? "start" : sx < -0.2 ? "end" : "middle";
          const el = svg("text", { x, y, "text-anchor": anchor, "dominant-baseline": "central", fill: cssVar("muted") });
          el.textContent = slice.label;
          view.appendChild(el);
        }
      }

      if (props.center !== "none") {
        const text = props.center === "total" ? formatNumber(total) : `${Math.round((slices[highlightIndex]?.share ?? 0) * 100)}%`;
        const el = svg("text", {
          x: cx,
          y: cy,
          "text-anchor": "middle",
          "dominant-baseline": "central",
          "font-size": Math.max(12, innerR * 0.6),
          fill: cssVar("fg"),
        });
        el.style.fontVariantNumeric = "tabular-nums";
        el.textContent = text;
        view.appendChild(el);
      }
    }
  }

  function drawGlyph(): void {
    const g = grid;
    if (!g) return;
    g.clear();
    const { cols, rows, cellWidth, cellHeight } = g;
    const colors = readPalette(host);
    const w = cols * cellWidth;
    const h = rows * cellHeight;
    const cx = w / 2;
    const cy = h / 2;
    const outerR = Math.min(w, h) / 2 - Math.max(cellWidth, cellHeight) * 0.5;
    const innerR = outerR * (1 - Math.max(0.05, Math.min(0.95, props.thickness)));
    const { slices, total } = buildSlices(props.data);
    const empty = slices.length === 0 || total <= 0;
    const highlightIndex = empty ? -1 : resolveHighlight(slices, props.highlight);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const dx = (col + 0.5) * cellWidth - cx;
        const dy = (row + 0.5) * cellHeight - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < innerR || dist > outerR) continue;
        if (empty) {
          g.set(col, row, shade(1), colors.muted);
          continue;
        }
        const index = sliceAt(slices, (Math.atan2(dx, -dy) + TAU) % TAU);
        if (index < 0) continue;
        const isHighlight = index === highlightIndex;
        g.set(col, row, isHighlight ? shade(4) : shade(1 + (index % 3)), isHighlight ? colors.accent : colors.fg);
      }
    }
    g.flush();
  }

  function draw(): void {
    labelHost(host, props.label, "figure");
    renderTable();
    if (props.look === "glyph") {
      if (root) {
        resize?.disconnect();
        resize = null;
        root.remove();
        root = null;
      }
      if (!grid) grid = createGrid(host, gridOptions(), draw);
      drawGlyph();
    } else {
      if (grid) {
        grid.destroy();
        grid = null;
      }
      if (!root) {
        root = svg("svg", { "aria-hidden": "true", "data-pica": "" });
        root.style.cssText = "display:block;width:100%;height:100%";
        host.appendChild(root);
        resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => drawSvg()) : null;
        resize?.observe(host);
      }
      drawSvg();
    }
    host.dataset.picaReady = "true";
  }

  draw();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (grid && props.fontFamily !== before.fontFamily) {
        grid.update(gridOptions());
        return;
      }
      draw();
    },
    destroy() {
      resize?.disconnect();
      resize = null;
      root?.remove();
      root = null;
      grid?.destroy();
      grid = null;
      table?.remove();
      table = null;
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
