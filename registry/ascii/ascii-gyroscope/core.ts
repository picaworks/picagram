import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiGyroscopeProps extends MotionProps {
  /** Number of nested wire rings, from 1 to 3. */
  rings: number;
  /** Inclination of the assembly in degrees, from 15 to 75. */
  tilt: number;
  /** Calm precession rate multiplier, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 12 to 22. */
  fontSize: number;
}

export const defaults: AsciiGyroscopeProps = {
  rings: 3,
  tilt: 32,
  speed: 0.65,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

function gyroBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiGyroscopeProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("role", null);
  attributes.set("aria-label", null);
  attributes.set("aria-hidden", "true");
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "under");
  const gridOptions = () => ({
    fontFamily: GRID_FONT,
    fontSize: gyroBound(props.fontSize, 16, 12, 22),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas" as const,
    color: "",
  });
  const grid = createGrid(drawing.el, gridOptions(), () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());
  let bits = new Uint8Array(0);
  let depths = new Float32Array(0);

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows, cellWidth, cellHeight } = grid;
    const size = cols * rows;
    if (bits.length !== size) {
      bits = new Uint8Array(size);
      depths = new Float32Array(size);
    }
    bits.fill(0);
    depths.fill(-Infinity);
    grid.clear();
    const radius = Math.max(1, Math.min(cols * cellWidth * 0.39, rows * cellHeight * 0.38));
    const cx = (cols * 2 - 1) / 2;
    const cy = (rows * 4 - 1) / 2;
    const tilt = gyroBound(props.tilt, 32, 15, 75) * Math.PI / 180;
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const angle = 0.38 + Math.sin(seed * 2.17) * 0.16 + milliseconds * 0.00012 * gyroBound(props.speed, 0.65, 0, 2);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const count = Math.round(gyroBound(props.rings, 3, 1, 3));
    const colors = palette.colors;

    function point(ring: number, phase: number): [number, number, number] {
      const r = 1 - ring * 0.17;
      const a = Math.cos(phase) * r;
      const b = Math.sin(phase) * r;
      const x = ring === 2 ? 0 : a;
      const y = ring === 0 ? b : ring === 2 ? a : 0;
      const z = ring === 0 ? 0 : b;
      const ry = y * ct - z * st;
      const rz = y * st + z * ct;
      return [cx + (x * ca + rz * sa) * radius * 2 / cellWidth, cy - ry * radius * 4 / cellHeight, rz * ca - x * sa];
    }

    const samples = Math.max(360, Math.ceil(radius * 5));
    for (let ring = 0; ring < count; ring++) {
      for (let i = 0; i <= samples; i++) {
        const [px, py, z] = point(ring, i / samples * Math.PI * 2);
        const sx = Math.round(px);
        const sy = Math.round(py);
        const x = Math.floor(sx / 2);
        const y = Math.floor(sy / 4);
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        const index = y * cols + x;
        const previous = depths[index] ?? -Infinity;
        // A nearer wire clears a crossing cell, opening a small gap in the rear arc.
        if (z > previous + 0.16) bits[index] = 0;
        if (z >= previous - 0.16) {
          bits[index] = (bits[index] ?? 0) | brailleDot(sy % 4, sx % 2);
          depths[index] = Math.max(previous, z);
        }
      }
    }
    for (let i = 0; i < size; i++) {
      const mask = bits[i] ?? 0;
      if (mask) grid.set(i % cols, Math.floor(i / cols), braille(mask), (depths[i] ?? 0) < -0.06 ? colors.muted : colors.fg);
    }
    grid.set(Math.floor(cols / 2), Math.floor(rows / 2), "+", colors.muted);
    const [jointX, jointY] = point(0, 0.8);
    grid.set(Math.floor(jointX / 2), Math.floor(jointY / 4), "o", colors.accent);
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 2400, frame });

  return {
    update(next) {
      if (!alive) return;
      const previousSize = props.fontSize;
      props = { ...props, ...next };
      if (previousSize !== props.fontSize) grid.update(gridOptions());
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
