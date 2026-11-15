import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiRollingCubeProps extends MotionProps {
  /** Cube size within a rotation safe envelope, from 0.5 to 0.85. */
  size: number;
  /** Secondary axis rotation and lean, from 0.2 to 0.8. */
  tumble: number;
  /** Measured face ink strength, from 0.5 to 1. */
  density: number;
  /** Continuous rotation rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 12 to 20. */
  fontSize: number;
}

export const defaults: AsciiRollingCubeProps = {
  size: 0.8,
  tumble: 0.5,
  density: 0.85,
  speed: 0.7,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

type RollingCubeAxis = [number, number, number];

function rollingCubeBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiRollingCubeProps> = (host, initial = {}) => {
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
    fontSize: rollingCubeBound(props.fontSize, 16, 12, 20),
    columns: 0,
    lineHeight: 1.2,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => { rebuild(); loop?.redraw(); });
  let ramp = measureRamp(" @.:;+x*#=%", GRID_FONT);
  let half = 1;
  let centerX = 0;
  let baseY = 0;
  let baseline = 0;
  let firstTick = 0;
  let lastTick = 0;
  let axes: RollingCubeAxis[] = [];

  function rebuild(): void {
    const width = Math.max(1, grid.cols - 6) * grid.cellWidth;
    const height = Math.max(1, grid.rows - 8) * grid.cellHeight;
    half = Math.min(width, height) * rollingCubeBound(props.size, 0.8, 0.5, 0.85) / (2 * Math.sqrt(3));
    centerX = grid.cols * grid.cellWidth / 2;
    baseline = Math.min(grid.rows - 3, Math.floor((grid.rows * grid.cellHeight / 2 + Math.sqrt(3) * half) / grid.cellHeight));
    baseY = (baseline + 0.5) * grid.cellHeight;
    const span = Math.max(3, Math.round(half * 1.6 / grid.cellWidth));
    firstTick = Math.max(2, Math.floor(grid.cols / 2) - span);
    lastTick = Math.min(grid.cols - 3, Math.floor(grid.cols / 2) + span);
    ramp = measureRamp(" @.:;+x*#=%", GRID_FONT);
  }

  function hit(x: number, y: number): number {
    let near = -Infinity;
    let far = Infinity;
    let face = -1;
    for (let i = 0; i < axes.length; i++) {
      const axis = axes[i];
      if (!axis) continue;
      const p = x * axis[0] + y * axis[1];
      const d = axis[2];
      if (Math.abs(d) < 0.000001) {
        if (Math.abs(p) > half) return -1;
        continue;
      }
      const a = (-half - p) / d;
      const b = (half - p) / d;
      near = Math.max(near, Math.min(a, b));
      const end = Math.max(a, b);
      if (end < far) { far = end; face = i; }
      if (near > far) return -1;
    }
    return face;
  }

  function frame(milliseconds: number): void {
    if (!alive) return;
    const seed = rollingCubeBound(props.seed, 1, 1, 99);
    const tumble = rollingCubeBound(props.tumble, 0.5, 0.2, 0.8);
    const t = milliseconds * 0.00018 * rollingCubeBound(props.speed, 0.7, 0, 2);
    const ax = 0.42 + seed * 0.17 + t * tumble;
    const ay = 0.58 + seed * 0.11 + t;
    const az = 0.12 + Math.sin(t * 0.6 + seed * 0.3) * tumble * 0.35;
    const sx = Math.sin(ax), cx = Math.cos(ax);
    const sy = Math.sin(ay), cy = Math.cos(ay);
    const sz = Math.sin(az), cz = Math.cos(az);
    const rotate = (x: number, y: number, z: number): RollingCubeAxis => {
      const v = y * cx - z * sx;
      const w = y * sx + z * cx;
      const u = x * cy + w * sy;
      return [u * cz - v * sz, u * sz + v * cz, -x * sy + w * cy];
    };
    axes = [rotate(1, 0, 0), rotate(0, 1, 0), rotate(0, 0, 1)];
    const extentY = half * axes.reduce((sum, axis) => sum + Math.abs(axis[1]), 0);
    const extentX = half * axes.reduce((sum, axis) => sum + Math.abs(axis[0]), 0);
    const centerY = baseY - grid.cellHeight * 1.25 - extentY;
    const density = rollingCubeBound(props.density, 0.85, 0.5, 1);
    const shades = axes.map((axis) => {
      const sign = axis[2] < 0 ? -1 : 1;
      const light = sign * (-axis[0] * 0.45 - axis[1] * 0.65 + axis[2] * 0.8) / Math.hypot(0.45, 0.65, 0.8);
      return pick(ramp, (0.28 + 0.62 * Math.max(0, light)) * density);
    });
    grid.clear();
    const left = Math.max(0, Math.floor((centerX - extentX) / grid.cellWidth));
    const right = Math.min(grid.cols - 1, Math.floor((centerX + extentX) / grid.cellWidth));
    const top = Math.max(0, Math.floor((centerY - extentY) / grid.cellHeight));
    const bottom = Math.min(grid.rows - 1, Math.floor((centerY + extentY) / grid.cellHeight));
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        let mask = 0;
        let face = -1;
        let edge = false;
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 2; col++) {
            const next = hit((x + (col + 0.5) / 2) * grid.cellWidth - centerX, (y + (row + 0.5) / 4) * grid.cellHeight - centerY);
            if (next < 0) continue;
            mask |= brailleDot(row, col);
            if (face >= 0 && next !== face) edge = true;
            face = next;
          }
        }
        if (mask) grid.set(x, y, mask === 255 && !edge ? shades[face] ?? "." : braille(mask));
      }
    }
    grid.write(firstTick, baseline, "─".repeat(Math.max(1, lastTick - firstTick + 1)));
    grid.set(firstTick, baseline, "┬");
    grid.set(lastTick, baseline, "┬");
    const lowX = half * axes.reduce((sum, axis) => sum + axis[0] * (axis[1] < 0 ? -1 : 1), 0);
    const contact = Math.max(firstTick + 1, Math.min(lastTick - 1, Math.round((centerX + lowX) / grid.cellWidth) + 1));
    grid.set(contact, baseline, "┴");
    grid.set(contact, baseline - 1, "╵");
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  rebuild();
  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.fontSize !== props.fontSize) grid.update(options());
      else if (before.size !== props.size) rebuild();
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
