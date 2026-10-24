import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiBraidedCordsProps extends MotionProps {
  /** Braid crossing frequency along the finite cords, from 2 to 6. */
  crossings: number;
  /** Horizontal separation of the three cords, from 0.6 to 1.3. */
  spread: number;
  /** Shaded cord radius, from 0.7 to 1.4. */
  thickness: number;
  /** Downward crossing travel rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 12 to 20. */
  fontSize: number;
}

export const defaults: AsciiBraidedCordsProps = {
  crossings: 3,
  spread: 1,
  thickness: 1,
  speed: 0.65,
  fontSize: 14,
  paused: false,
  time: null,
  seed: 1,
};

function cordBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiBraidedCordsProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "under");
  const options = (): GridOptions => ({
    fontFamily: GRID_FONT,
    fontSize: cordBound(props.fontSize, 14, 12, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());
  const ramp = measureRamp(" .:-=+*#%@", GRID_FONT, 1.2);

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows, cellWidth, cellHeight } = grid;
    const width = cols * cellWidth;
    const height = rows * cellHeight;
    const top = height * 0.12;
    const length = height * 0.76;
    const amplitude = Math.min(width * 0.24, height * 0.28) * cordBound(props.spread, 1, 0.6, 1.3);
    const radius = Math.min(width * 0.045, height * 0.032) * cordBound(props.thickness, 1, 0.7, 1.4);
    const frequency = Math.PI * Math.round(cordBound(props.crossings, 3, 2, 6)) / Math.max(1, length);
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const travel = seed * 0.73 - milliseconds * 0.0003 * cordBound(props.speed, 0.65, 0, 2);
    const gap = cellWidth * 0.85;
    grid.clear();
    for (let row = 0; row < rows; row++) {
      const y = (row + 0.5) * cellHeight;
      const along = Math.min(length, Math.max(0, y - top));
      const beyond = y - top - along;
      if (Math.abs(beyond) > radius) continue;
      const paths = Array.from({ length: 3 }, (_, i) => {
        const angle = along * frequency + travel + i * Math.PI * 2 / 3;
        const slope = amplitude * frequency * Math.cos(angle);
        return { x: width / 2 + amplitude * Math.sin(angle), z: Math.cos(angle), slope };
      });
      for (let col = 0; col < cols; col++) {
        const x = (col + 0.5) * cellWidth;
        let front = -2;
        let distance = 0;
        let tangent = 0;
        let covered = false;
        for (const path of paths) {
          const dx = x - path.x;
          const d = beyond === 0 ? dx / Math.sqrt(1 + path.slope * path.slope) : Math.sign(dx || 1) * Math.hypot(dx, beyond);
          // A rear cord stops before the front silhouette, leaving a depth gap.
          if (Math.abs(d) <= radius + gap && path.z > front) {
            front = path.z;
            distance = d;
            tangent = path.slope;
            covered = true;
          }
        }
        if (!covered || Math.abs(distance) > radius) continue;
        const across = distance / Math.max(1, radius);
        const roundness = Math.sqrt(Math.max(0, 1 - across * across));
        const tone = (0.18 + roundness * (0.56 - across * 0.12)) * (0.85 + front * 0.1);
        const edge = Math.abs(across) > 0.82;
        const glyph = edge ? Math.abs(tangent) < 0.3 ? "|" : tangent > 0 ? "\\" : "/" : pick(ramp, tone);
        grid.set(col, row, glyph, palette.colors.fg);
      }
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.fontSize !== props.fontSize) grid.update(options());
      palette.refresh();
      loop?.update({ paused: props.paused, time: props.time });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      palette.destroy();
      grid.destroy();
      drawing.remove();
      restore();
      attributes.restore();
    },
  };
};
