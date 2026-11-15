import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiTensionSailProps extends MotionProps {
  /** Curvature of the finite saddle and its bowed edges, from 0.2 to 0.65. */
  curve: number;
  /** Number of textile divisions in each mesh direction, from 7 to 13. */
  mesh: number;
  /** Interior breeze displacement relative to the sail, from 0.05 to 0.2. */
  breeze: number;
  /** Breeze travel rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 20. */
  fontSize: number;
}

export const defaults: AsciiTensionSailProps = {
  curve: 0.45,
  mesh: 10,
  breeze: 0.12,
  speed: 0.7,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

type SailPoint = [number, number];
type SailPath = { samples: Float32Array; edge: boolean };

function sailBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiTensionSailProps> = (host, initial = {}) => {
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
    fontSize: sailBound(props.fontSize, 16, 14, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => { prepare(); loop?.redraw(); });
  let masks = new Uint8Array(0);
  let paths: SailPath[] = [];
  let anchors: SailPoint[] = [];
  let scale = 1;
  let cx = 0;
  let cy = 0;
  let dx = 1;
  let dy = 1;
  let moveX = 0;
  let moveY = 0;
  let rate = 0.7;
  let phase = 0;
  let pin = 7;

  function prepare(): void {
    const curve = sailBound(props.curve, 0.45, 0.2, 0.65);
    const mesh = Math.round(sailBound(props.mesh, 10, 7, 13));
    const breeze = sailBound(props.breeze, 0.12, 0.05, 0.2);
    const seed = Math.round(sailBound(props.seed, 1, 1, 99));
    const rotation = ((seed * 0.618034) % 1 - 0.5) * 0.22;
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    phase = seed * 2.39996;
    rate = sailBound(props.speed, 0.7, 0, 2);
    moveX = 0.18 * cosine + 0.7 * sine;
    moveY = 0.18 * sine - 0.7 * cosine;
    dx = grid.cellWidth / 2;
    dy = grid.cellHeight / 4;
    pin = Math.max(7, grid.cellWidth * 0.75);
    const sample = (a: number, b: number): number[] => {
      const c = Math.max(0, 1 - a - b);
      const pinch = 1 - curve * 1.8 * (a * b + b * c + c * a);
      const x = (-a + 0.95 * b + 0.02 * c) * pinch;
      const y = (-0.54 * a - 0.35 * b + 0.86 * c) * pinch;
      const z = 0.16 * a - 0.12 * b + 0.08 * c + curve * 1.4 * (a * b - b * c + c * a);
      const px = x + z * 0.18;
      const py = y * 0.78 - z * 0.7;
      return [px * cosine - py * sine, px * sine + py * cosine, breeze * 27 * a * b * c, (b - c) * 5 + a * 2, c];
    };
    paths = [];
    const addPath = (family: number, fixed: number, edge: boolean): void => {
      const samples = new Float32Array(65 * 5);
      for (let i = 0; i <= 64; i++) {
        const t = i / 64 * (1 - fixed);
        const a = family === 0 ? fixed : t;
        const b = family === 0 ? t : family === 1 ? fixed : 1 - fixed - t;
        samples.set(sample(a, b), i * 5);
      }
      paths.push({ samples, edge });
    };
    for (let family = 0; family < 3; family++) {
      addPath(family, 0, true);
      for (let i = 1; i < mesh; i++) {
        const t = i / mesh;
        addPath(family, family === 2 ? 1 - (1 - t) ** 1.3 : t ** 1.3, false);
      }
    }
    anchors = [[1, 0], [0, 1], [0, 0]].map(([a, b]) => {
      const p = sample(a ?? 0, b ?? 0);
      return [p[0] ?? 0, p[1] ?? 0];
    });
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const include = (x: number, y: number, amplitude: number): void => {
      minX = Math.min(minX, x - Math.abs(moveX) * amplitude);
      maxX = Math.max(maxX, x + Math.abs(moveX) * amplitude);
      minY = Math.min(minY, y - Math.abs(moveY) * amplitude);
      maxY = Math.max(maxY, y + Math.abs(moveY) * amplitude);
    };
    // Reserve the whole breeze envelope before choosing a scale, including the anchor tethers.
    for (let i = 0; i <= 32; i++) {
      for (let j = 0; j <= 32 - i; j++) {
        const p = sample(i / 32, j / 32);
        include(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
      }
    }
    for (const anchor of anchors) include(anchor[0] * 1.14, anchor[1] * 1.14, 0);
    const width = Math.max(1, (grid.cols - 4) * grid.cellWidth - 2 * (pin + dx));
    const height = Math.max(1, (grid.rows - 4) * grid.cellHeight - 2 * (pin + dy));
    scale = Math.min(width / (maxX - minX + 0.03), height / (maxY - minY + 0.03));
    cx = grid.cols * grid.cellWidth / 2 - (minX + maxX) * scale / 2;
    cy = grid.rows * grid.cellHeight / 2 - (minY + maxY) * scale / 2;
    masks = new Uint8Array(grid.cols * grid.rows);
  }

  function dot(x: number, y: number, erase = false): void {
    const px = Math.round(x / dx);
    const py = Math.round(y / dy);
    if (px < 0 || py < 0 || px >= grid.cols * 2 || py >= grid.rows * 4) return;
    const index = Math.floor(py / 4) * grid.cols + Math.floor(px / 2);
    const bit = brailleDot(py % 4, px % 2);
    masks[index] = erase ? (masks[index] ?? 0) & ~bit : (masks[index] ?? 0) | bit;
  }

  function line(a: SailPoint, b: SailPoint, heavy = false): void {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]) / dx, Math.abs(b[1] - a[1]) / dy) * 1.5));
    for (let i = 0; i <= steps; i++) {
      const x = a[0] + (b[0] - a[0]) * i / steps;
      const y = a[1] + (b[1] - a[1]) * i / steps;
      dot(x, y);
      if (heavy) dot(x + dx, y);
    }
  }

  function frame(milliseconds: number): void {
    if (!alive) return;
    masks.fill(0);
    const clock = phase + milliseconds * 0.00065 * rate;
    for (const path of paths) {
      let previous: SailPoint | null = null;
      for (let i = 0; i < path.samples.length; i += 5) {
        const amplitude = (path.samples[i + 2] ?? 0) * Math.sin(clock + (path.samples[i + 3] ?? 0));
        const current: SailPoint = [
          cx + ((path.samples[i] ?? 0) + moveX * amplitude) * scale,
          cy + ((path.samples[i + 1] ?? 0) + moveY * amplitude) * scale,
        ];
        if (previous) line(previous, current, path.edge && (path.samples[i + 4] ?? 0) > 0.25);
        previous = current;
      }
    }
    for (const anchor of anchors) {
      const corner: SailPoint = [cx + anchor[0] * scale, cy + anchor[1] * scale];
      const bolt: SailPoint = [cx + anchor[0] * scale * 1.14, cy + anchor[1] * scale * 1.14];
      line(corner, bolt, true);
      for (let y = -pin; y <= pin; y += dy / 2) {
        for (let x = -pin; x <= pin; x += dx / 2) {
          if (x * x + y * y < pin * pin * 0.5) dot(bolt[0] + x, bolt[1] + y, true);
        }
      }
      for (let i = 0; i < 32; i++) {
        const angle = i * Math.PI / 16;
        dot(bolt[0] + Math.cos(angle) * pin, bolt[1] + Math.sin(angle) * pin);
      }
      dot(bolt[0], bolt[1]);
    }
    grid.clear();
    for (let i = 0; i < masks.length; i++) {
      const mask = masks[i] ?? 0;
      if (mask) grid.set(i % grid.cols, Math.floor(i / grid.cols), braille(mask));
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  prepare();
  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.fontSize !== props.fontSize) grid.update(options());
      else prepare();
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
