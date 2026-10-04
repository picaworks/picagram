import { GRID_FONT } from "../../../lib/font";
import { createGrid } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { changed } from "../../../lib/json";
import { cssVar, watchPalette } from "../../../lib/palette";
import { createRng } from "../../../lib/rng";
import type { Mount } from "../../../lib/types";

export interface AsciiTreeRingsProps {
  /** Annual radial growth, from the oldest central ring outward; nonpositive values add no width. */
  growth: number[];
  /** Calendar year for each growth value; a missing year uses its one-based position. */
  years: number[];
  /** Deterministic seed for the pith offset and irregular annual contours. */
  seed: number;
  /** Calendar year whose annual band is accented; null leaves all rings in the foreground color. */
  selectedYear: number | null;
}

export const defaults: AsciiTreeRingsProps = {
  growth: [1.8, 2.6, 1.2, 3.4, 2.1, 0.9, 2.8, 1.5, 2.4, 1.7],
  years: [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023],
  seed: 1,
  selectedYear: 2018,
};

type TreeAnnual = { growth: number; year: number; phase: number; ripple: number };
const TREE_TAU = Math.PI * 2;

function treeAnnualData(props: AsciiTreeRingsProps): TreeAnnual[] {
  const random = createRng(Number.isFinite(props.seed) ? props.seed : 1);
  return props.growth.map((value, index) => ({
    growth: Number.isFinite(value) ? Math.max(0, value) : 0,
    year: Number.isFinite(props.years[index]) ? props.years[index]! : index + 1,
    phase: random() * TREE_TAU,
    ripple: random() * TREE_TAU,
  }));
}

export const mount: Mount<AsciiTreeRingsProps> = (host, initial = {}) => {
  let props: AsciiTreeRingsProps = { ...defaults, ...initial };
  let annual = treeAnnualData(props);
  let alive = true;
  let initialized = false;
  const attributes = hostAttributes(host);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "over");
  const grid = createGrid(drawing.el, {
    fontFamily: GRID_FONT,
    fontSize: 9,
    columns: 0,
    lineHeight: 1.1,
    renderer: "canvas",
    color: "",
  }, () => { if (initialized) draw(); });
  const palette = watchPalette(host, () => draw());

  function describe(): void {
    const positive = annual.filter((entry) => entry.growth > 0);
    const selected = annual.find((entry) => entry.year === props.selectedYear);
    const summary = annual.map((entry) => `${entry.year}: ${entry.growth}`).join("; ");
    attributes.set("role", "img");
    attributes.set("aria-label", positive.length
      ? `Tree cross-section. Annual radial growth from pith to bark: ${summary}.${selected ? ` Selected year ${selected.year}, growth ${selected.growth}.` : ""}`
      : "Tree cross-section: no positive annual growth supplied.");
  }

  function draw(): void {
    if (!alive || !initialized) return;
    grid.clear();
    const width = grid.cols * grid.cellWidth;
    const height = grid.rows * grid.cellHeight;
    const radius = Math.min(width, height) * 0.405;
    // Normalize once to avoid overflow and preserve all relative annual widths.
    const largest = Math.max(0, ...annual.map((entry) => entry.growth));
    const weights = annual.map((entry) => largest > 0 ? entry.growth / largest : 0);
    const total = weights.reduce((sum, value) => sum + value, 0);
    if (!total || radius < grid.cellHeight) {
      if (!total) grid.write(Math.max(0, Math.floor((grid.cols - 14) / 2)), Math.floor(grid.rows / 2), "No growth data");
      grid.flush();
      attributes.set("data-pica-ready", "true");
      return;
    }
    const random = createRng(Number.isFinite(props.seed) ? props.seed : 1);
    const phase = random() * TREE_TAU;
    const cx = width / 2 + Math.cos(phase) * radius * 0.075;
    const cy = height / 2 + Math.sin(phase) * radius * 0.045;
    const pith = radius * 0.026;
    const boundaries = new Float64Array(annual.length);

    function contours(angle: number): void {
      const shape = 1 + 0.055 * Math.sin(2 * angle + phase) + 0.027 * Math.cos(5 * angle - phase);
      let distance = pith;
      for (let i = 0; i < annual.length; i++) {
        const entry = annual[i]!;
        // Positive local growth keeps contours nested. Wide and narrow years
        // retain their measured proportions rather than becoming equal rings.
        const local = 1 + 0.085 * Math.sin(3 * angle + entry.phase) + 0.035 * Math.cos(7 * angle + entry.ripple);
        distance += weights[i]! / total * radius * shape * local;
        boundaries[i] = distance;
      }
    }

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const dx = (x + 0.5) * grid.cellWidth - cx;
        const dy = (y + 0.5) * grid.cellHeight - cy;
        const distance = Math.hypot(dx, dy);
        if (distance > radius * 1.22) continue;
        const angle = Math.atan2(dy, dx);
        contours(angle);
        const projection = Math.abs(Math.cos(angle)) * grid.cellWidth + Math.abs(Math.sin(angle)) * grid.cellHeight;
        const tolerance = projection * 0.39;
        let closest = -1;
        let error = Infinity;
        let band = -1;
        for (let i = 0; i < annual.length; i++) {
          if (weights[i] === 0) continue;
          if (band < 0 && distance <= boundaries[i]!) band = i;
          const delta = Math.abs(distance - boundaries[i]!);
          if (delta < error) { error = delta; closest = i; }
        }
        if (distance <= pith + grid.cellWidth * 0.42) {
          grid.set(x, y, "+");
          continue;
        }
        if (closest >= 0 && error <= tolerance) {
          const outer = boundaries[closest]!;
          contours(angle + 0.012);
          const slope = (boundaries[closest]! - outer) / 0.012 / Math.max(outer, 1);
          const nx = Math.cos(angle) + slope * Math.sin(angle);
          const ny = Math.sin(angle) - slope * Math.cos(angle);
          const glyph = Math.abs(nx) < Math.abs(ny) * 0.48 ? "-"
            : Math.abs(ny) < Math.abs(nx) * 0.48 ? "|"
            : nx * ny > 0 ? "/" : "\\";
          grid.set(x, y, glyph, annual[closest]!.year === props.selectedYear ? palette.colors.accent : undefined);
        } else if (band >= 0 && annual[band]!.year === props.selectedYear) {
          // Sparse rays mark the whole selected annual band without concealing
          // its measured width or introducing a legend or metadata panel.
          const ray = Math.abs(Math.sin(angle * 24 + phase));
          if (ray < 0.085) grid.set(x, y, ".", palette.colors.accent);
        }
      }
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  initialized = true;
  describe();
  draw();
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const dataChanged = changed(before, props, ["growth", "years", "seed"]);
      const selectionChanged = before.selectedYear !== props.selectedYear;
      if (dataChanged) annual = treeAnnualData(props);
      if (dataChanged || selectionChanged) describe();
      const paletteChanged = palette.refresh();
      if (dataChanged || selectionChanged || paletteChanged) draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      palette.destroy();
      grid.destroy();
      drawing.remove();
      restore();
      attributes.restore();
    },
  };
};
