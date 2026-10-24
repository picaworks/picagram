import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiMobiusBandProps extends MotionProps {
  /** Half width of the continuous ribbon, from 0.25 to 0.6. */
  width: number;
  /** Resting view tilt in degrees, from 15 to 65. */
  tilt: number;
  /** Rate of the slow three dimensional turn, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 12 to 20. */
  fontSize: number;
}

export const defaults: AsciiMobiusBandProps = {
  width: 0.45,
  tilt: 42,
  speed: 0.6,
  fontSize: 14,
  paused: false,
  time: null,
  seed: 1,
};

type MobiusVertex = [number, number, number, number];

function mobiusBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiMobiusBandProps> = (host, initial = {}) => {
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
    fontSize: mobiusBound(props.fontSize, 14, 12, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const ramp = measureRamp(" .:-=+*#%@", GRID_FONT, 1.2);
  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  let depths = new Float32Array(0);
  let shades = new Float32Array(0);

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows, cellWidth, cellHeight } = grid;
    const sw = cols * 2;
    const sh = rows * 4;
    if (depths.length !== sw * sh) {
      depths = new Float32Array(sw * sh);
      shades = new Float32Array(sw * sh);
    }
    depths.fill(Infinity);
    shades.fill(0);
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const phase = seed * 0.43 + milliseconds * 0.00023 * mobiusBound(props.speed, 0.6, 0, 2);
    const pitch = mobiusBound(props.tilt, 42, 15, 65) * Math.PI / 180 + Math.cos(phase) * 0.09;
    const yaw = Math.sin(phase) * 0.32;
    const portrait = cols * cellWidth < rows * cellHeight;
    const roll = (portrait ? -0.2 : -0.12) + Math.sin(phase * 0.7) * 0.16;
    const rx = portrait ? 0.82 : 1.18;
    const ry = portrait ? 1.35 : 1;
    const width = mobiusBound(props.width, 0.45, 0.25, 0.6);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const rotate = (x: number, y: number, z: number): [number, number, number] => {
      const py = y * cp - z * sp;
      const pz = y * sp + z * cp;
      const px = x * cy + pz * sy;
      return [px * cr - py * sr, px * sr + py * cr, pz * cy - x * sy];
    };
    const vertices: MobiusVertex[] = [];
    const segments = 96;
    const bands = 8;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments * Math.PI * 2;
      const c = Math.cos(u), s = Math.sin(u);
      const h = Math.cos(u / 2), k = Math.sin(u / 2);
      for (let j = 0; j <= bands; j++) {
        const v = (j / bands * 2 - 1) * width;
        const p = rotate((rx + v * h) * c, (ry + v * h) * s, v * k);
        const ux = -(rx + v * h) * s - v * k * c / 2;
        const uy = (ry + v * h) * c - v * k * s / 2;
        const uz = v * h / 2;
        const vx = h * c, vy = h * s, vz = k;
        const n = rotate(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
        const length = Math.hypot(...n) || 1;
        const facing = n[2] > 0 ? -1 : 1;
        const light = Math.max(0, (-0.35 * n[0] - 0.6 * n[1] - 0.72 * n[2]) * facing / length);
        const perspective = 5 / (5 + p[2]);
        vertices.push([p[0] * perspective, p[1] * perspective, p[2], 0.23 + 0.66 * light]);
      }
    }
    const xs = vertices.map((p) => p[0]);
    const ys = vertices.map((p) => p[1]);
    const left = Math.min(...xs), right = Math.max(...xs);
    const top = Math.min(...ys), bottom = Math.max(...ys);
    const scale = Math.min(Math.max(1, cols - 5) * cellWidth / (right - left), Math.max(1, rows - 5) * cellHeight / (bottom - top));
    for (const p of vertices) {
      p[0] = cols + (p[0] - (left + right) / 2) * scale / cellWidth * 2;
      p[1] = rows * 2 + (p[1] - (top + bottom) / 2) * scale / cellHeight * 4;
    }
    function triangle(a: MobiusVertex, b: MobiusVertex, c: MobiusVertex): void {
      const area = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(area) < 0.0001) return;
      const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
      const x1 = Math.min(sw - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
      const y1 = Math.min(sh - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const aa = ((b[1] - c[1]) * (x + 0.5 - c[0]) + (c[0] - b[0]) * (y + 0.5 - c[1])) / area;
          const bb = ((c[1] - a[1]) * (x + 0.5 - c[0]) + (a[0] - c[0]) * (y + 0.5 - c[1])) / area;
          const cc = 1 - aa - bb;
          if (aa < 0 || bb < 0 || cc < 0) continue;
          const depth = aa * a[2] + bb * b[2] + cc * c[2];
          const index = y * sw + x;
          if (depth >= (depths[index] ?? Infinity)) continue;
          depths[index] = depth;
          shades[index] = aa * a[3] + bb * b[3] + cc * c[3];
        }
      }
    }
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < bands; j++) {
        const k = i * (bands + 1) + j;
        const a = vertices[k], b = vertices[k + bands + 1];
        const c = vertices[k + bands + 2], d = vertices[k + 1];
        if (a && b && c && d) { triangle(a, b, c); triangle(a, c, d); }
      }
    }
    grid.clear();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let mask = 0;
        let tone = 0;
        let count = 0;
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const shade = shades[(y * 4 + dy) * sw + x * 2 + dx] ?? 0;
            if (!shade) continue;
            mask |= brailleDot(dy, dx);
            tone += shade;
            count++;
          }
        }
        if (count) grid.set(x, y, count === 8 ? pick(ramp, tone / count) : braille(mask));
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
