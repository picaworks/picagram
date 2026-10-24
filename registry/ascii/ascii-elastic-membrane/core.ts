import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiElasticMembraneProps extends MotionProps {
  /** Standing mode: one central swell, four lobes, or a coupled pair. */
  mode: "single" | "cross" | "paired";
  /** Maximum surface displacement relative to the mesh size, from 0.1 to 0.6. */
  amplitude: number;
  /** Resting view tilt in degrees, from 20 to 60. */
  tilt: number;
  /** Rate of the standing oscillation, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 12 to 20. */
  fontSize: number;
}

export const defaults: AsciiElasticMembraneProps = {
  mode: "single",
  amplitude: 0.4,
  tilt: 38,
  speed: 0.6,
  fontSize: 14,
  paused: false,
  time: null,
  seed: 1,
};

type MembranePoint = [number, number];

function membraneBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiElasticMembraneProps> = (host, initial = {}) => {
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
    fontSize: membraneBound(props.fontSize, 14, 12, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  let dots = new Uint8Array(0);

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows, cellWidth, cellHeight } = grid;
    if (dots.length !== cols * rows) dots = new Uint8Array(cols * rows);
    dots.fill(0);
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const phase = seed * 0.3 + milliseconds * 0.00065 * membraneBound(props.speed, 0.6, 0, 2);
    const amplitude = membraneBound(props.amplitude, 0.4, 0.1, 0.6);
    const tilt = membraneBound(props.tilt, 38, 20, 60) * Math.PI / 180;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const yaw = 0.22;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const roll = -0.12;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const portrait = cols * cellWidth < rows * cellHeight;
    const width = portrait ? 2.05 : 3.5;
    const height = portrait ? 3.5 : 2.7;
    const project = (u: number, v: number): MembranePoint => {
      const a = Math.PI * u, b = Math.PI * v;
      let wave = Math.sin(a) * Math.sin(b) * Math.cos(phase);
      if (props.mode === "cross") wave = Math.sin(a * 2) * Math.sin(b * 2) * Math.cos(phase);
      if (props.mode === "paired") wave = Math.sin(a * 2) * Math.sin(b) * Math.cos(phase) * 0.8 + Math.sin(a) * Math.sin(b * 2) * Math.sin(phase) * 0.25;
      const x = (u - 0.5) * width;
      const y = (v - 0.5) * height;
      const z = wave * amplitude;
      const py = y * ct - z * st;
      const pz = y * st + z * ct;
      const px = x * cy + pz * sy;
      const depth = pz * cy - x * sy;
      const perspective = 7 / (7 + depth);
      return [(px * cr - py * sr) * perspective, (px * sr + py * cr) * perspective];
    };
    const paths: MembranePoint[][] = [];
    const across = Math.round(membraneBound(cols / 6, 12, 8, 18));
    const down = Math.round(membraneBound(rows / 3.5, 12, 8, 16));
    for (let i = 0; i <= across; i++) {
      paths.push(Array.from({ length: 65 }, (_, j) => project(i / across, j / 64)));
    }
    for (let i = 0; i <= down; i++) {
      paths.push(Array.from({ length: 65 }, (_, j) => project(j / 64, i / down)));
    }
    const points = paths.flat();
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const left = Math.min(...xs), right = Math.max(...xs);
    const top = Math.min(...ys), bottom = Math.max(...ys);
    const scale = Math.min(Math.max(1, cols - 6) * cellWidth / (right - left), Math.max(1, rows - 6) * cellHeight / (bottom - top));
    const screen = (p: MembranePoint): MembranePoint => [
      cols + (p[0] - (left + right) / 2) * scale / cellWidth * 2,
      rows * 2 + (p[1] - (top + bottom) / 2) * scale / cellHeight * 4,
    ];
    function line(a: MembranePoint, b: MembranePoint): void {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 1.5));
      for (let i = 0; i <= steps; i++) {
        const x = Math.round(a[0] + (b[0] - a[0]) * i / steps);
        const y = Math.round(a[1] + (b[1] - a[1]) * i / steps);
        if (x < 0 || y < 0 || x >= cols * 2 || y >= rows * 4) continue;
        const index = Math.floor(y / 4) * cols + Math.floor(x / 2);
        dots[index] = (dots[index] ?? 0) | brailleDot(y % 4, x % 2);
      }
    }
    for (const path of paths) {
      let previous: MembranePoint | null = null;
      for (const point of path) {
        const current = screen(point);
        if (previous) line(previous, current);
        previous = current;
      }
    }
    grid.clear();
    for (let i = 0; i < dots.length; i++) {
      const mask = dots[i] ?? 0;
      if (mask) grid.set(i % cols, Math.floor(i / cols), braille(mask));
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
      loop?.update({ paused: props.paused, time: props.time });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      grid.destroy();
      drawing.remove();
      restore();
      attributes.restore();
    },
  };
};
