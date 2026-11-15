import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiScrewConveyorProps extends MotionProps {
  /** Complete flights along the finite shaft, from 2 to 5. */
  turns: number;
  /** Axial spacing between flights in screw diameters, from 0.7 to 1.3. */
  pitch: number;
  /** Upward shaft angle in degrees, from 15 to 65. */
  angle: number;
  /** Rotation and material transport rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 20. */
  fontSize: number;
}

export const defaults: AsciiScrewConveyorProps = {
  turns: 3,
  pitch: 1,
  angle: 35,
  speed: 0.7,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

function conveyorBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

type ConveyorPoint = [number, number];

export const mount: Mount<AsciiScrewConveyorProps> = (host, initial = {}) => {
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
    fontSize: conveyorBound(props.fontSize, 16, 14, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => { prepare(); loop?.redraw(); });
  let masks = new Uint8Array(0);
  let stations = new Float32Array(0);
  let radius = 1;
  let length = 1;
  let turns = 3;
  let rate = 0.7;
  let phase = 0;
  let ex = 1;
  let ey = 0;
  let nx = 0;
  let ny = 1;
  let cx = 0;
  let cy = 0;
  let dx = 1;
  let dy = 1;

  function prepare(): void {
    turns = Math.round(conveyorBound(props.turns, 3, 2, 5));
    const span = turns * conveyorBound(props.pitch, 1, 0.7, 1.3) * 2;
    const angle = conveyorBound(props.angle, 35, 15, 65) * Math.PI / 180;
    ex = Math.cos(angle);
    ey = -Math.sin(angle);
    nx = -ey;
    ny = ex;
    rate = conveyorBound(props.speed, 0.7, 0, 2);
    phase = Math.round(conveyorBound(props.seed, 1, 1, 99)) * 2.39996;
    dx = grid.cellWidth / 2;
    dy = grid.cellHeight / 4;
    const width = Math.max(1, grid.cols - 4) * grid.cellWidth;
    const height = Math.max(1, grid.rows - 4) * grid.cellHeight;
    radius = Math.max(1, Math.min(width / ((span + 0.9) * ex + 2.6 * nx), height / ((span + 0.9) * -ey + 2.6 * ny)));
    length = span * radius;
    cx = grid.cols * grid.cellWidth / 2 - nx * radius * 0.08;
    cy = grid.rows * grid.cellHeight / 2 - ny * radius * 0.08;
    const samples = Math.max(120, Math.ceil(length / Math.min(dx, dy)) * 3);
    stations = new Float32Array((samples + 1) * 3);
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const theta = t * turns * Math.PI * 2;
      stations[i * 3] = (t - 0.5) * length;
      stations[i * 3 + 1] = Math.cos(theta);
      stations[i * 3 + 2] = Math.sin(theta);
    }
    masks = new Uint8Array(grid.cols * grid.rows);
  }

  function point(s: number, v: number, depth = 0): ConveyorPoint {
    return [cx + (s + depth * 0.28) * ex + v * nx, cy + (s + depth * 0.28) * ey + v * ny];
  }

  function dot(x: number, y: number, erase = false): void {
    const px = Math.round(x / dx);
    const py = Math.round(y / dy);
    if (px < 0 || py < 0 || px >= grid.cols * 2 || py >= grid.rows * 4) return;
    const index = Math.floor(py / 4) * grid.cols + Math.floor(px / 2);
    const bit = brailleDot(py % 4, px % 2);
    masks[index] = erase ? (masks[index] ?? 0) & ~bit : (masks[index] ?? 0) | bit;
  }

  function line(a: ConveyorPoint, b: ConveyorPoint): void {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]) / dx, Math.abs(b[1] - a[1]) / dy) * 1.5));
    for (let i = 0; i <= steps; i++) dot(a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps);
  }

  function disc(p: ConveyorPoint, size: number, erase = false): void {
    for (let y = -size; y <= size; y += dy / 2) {
      for (let x = -size; x <= size; x += dx / 2) {
        if (x * x + y * y <= size * size) dot(p[0] + x, p[1] + y, erase);
      }
    }
  }

  function bearing(s: number): void {
    const step = Math.min(dx, dy) / 2;
    for (let v = -radius * 0.35; v <= radius * 0.48; v += step) {
      for (let u = -radius * 0.14; u <= radius * 0.14; u += step) {
        if (Math.abs(v) < radius * 0.18) continue;
        const p = point(s + u, v);
        dot(p[0], p[1]);
      }
    }
  }

  function frame(milliseconds: number): void {
    if (!alive) return;
    masks.fill(0);
    const rotation = phase + milliseconds * 0.00055 * rate;
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    // Each dense radial sweep is a full sheet from the shaft to the outer flight rim.
    for (let i = 0; i < stations.length; i += 3) {
      const axial = stations[i] ?? 0;
      const cosine = (stations[i + 1] ?? 0) * c + (stations[i + 2] ?? 0) * s;
      const sine = (stations[i + 2] ?? 0) * c - (stations[i + 1] ?? 0) * s;
      line(point(axial, cosine * radius * 0.1, sine * radius * 0.1), point(axial, cosine * radius, sine * radius));
    }
    // The shaft stays visible in the open half of every broad flight.
    for (let v = -radius * 0.1; v <= radius * 0.1; v += Math.min(dx, dy) / 2) {
      line(point(-length / 2 - radius * 0.38, v), point(length / 2 + radius * 0.38, v));
    }
    for (const end of [-1, 1]) {
      const axial = end * (length / 2 + radius * 0.2);
      bearing(axial);
      line(point(end * length / 2, radius * 0.1), point(end * length / 2, radius * 1.08));
    }
    line(point(-length / 2, radius * 1.08), point(length / 2, radius * 1.08));
    line(point(-length / 2, radius * 1.17), point(length / 2, radius * 1.17));
    for (let i = 0; i < 3; i++) {
      const t = ((rotation / (Math.PI * 2 * turns) + i / 3) % 1 + 1) % 1;
      const envelope = Math.min(1, t / 0.08, (1 - t) / 0.08);
      const size = Math.max(2.5, radius * 0.085) * envelope;
      if (size < 0.8) continue;
      const payload = point((t - 0.5) * length, radius * 0.4);
      disc(payload, size + Math.min(dx, dy) * 0.65, true);
      disc(payload, size);
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
