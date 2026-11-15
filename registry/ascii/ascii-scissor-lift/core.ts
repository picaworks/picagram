import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiScissorLiftProps extends MotionProps {
  /** Number of connected equal-length X stages, from 2 to 4. */
  stages: number;
  /** Mid-cycle stage height as a fraction of bar length, from 0.3 to 0.85. */
  extension: number;
  /** Peak-to-peak extension travel, from 0.1 to 0.35, limited near full extension. */
  travel: number;
  /** Lift cycle rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 20. */
  fontSize: number;
}

export const defaults: AsciiScissorLiftProps = {
  stages: 3,
  extension: 0.56,
  travel: 0.28,
  speed: 0.75,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

function scissorBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiScissorLiftProps> = (host, initial = {}) => {
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
    fontSize: scissorBound(props.fontSize, 16, 14, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => {
    prepare();
    loop?.redraw();
  });
  let masks = new Uint8Array(0);
  let count = 3;
  let midpoint = 0.56;
  let amplitude = 0.14;
  let rate = 0.75;
  let phase = 0;
  let direction = 1;
  let length = 1;
  let center = 0;
  let base = 0;
  let dx = 1;
  let dy = 1;

  function prepare(): void {
    count = Math.round(scissorBound(props.stages, 3, 2, 4));
    midpoint = scissorBound(props.extension, 0.56, 0.3, 0.85);
    amplitude = Math.min(scissorBound(props.travel, 0.28, 0.1, 0.35) / 2, midpoint - 0.12, 0.94 - midpoint);
    rate = scissorBound(props.speed, 0.75, 0, 2);
    const seed = Math.round(scissorBound(props.seed, 1, 1, 99));
    phase = seed * 2.39996;
    direction = seed % 2 === 0 ? -1 : 1;
    dx = grid.cellWidth / 2;
    dy = grid.cellHeight / 4;
    const width = Math.max(1, grid.cols - 4) * grid.cellWidth;
    const height = Math.max(1, grid.rows - 4) * grid.cellHeight;
    length = Math.max(1, Math.min(width / 1.55, height / (count * (midpoint + amplitude) + 0.72)));
    center = grid.cols * grid.cellWidth / 2;
    base = (grid.rows - 2) * grid.cellHeight - length * 0.3;
    masks = new Uint8Array(grid.cols * grid.rows);
  }

  function dot(x: number, y: number, erase = false): void {
    const px = Math.round((center + direction * x) / dx);
    const py = Math.round(y / dy);
    if (px < 0 || py < 0 || px >= grid.cols * 2 || py >= grid.rows * 4) return;
    const index = Math.floor(py / 4) * grid.cols + Math.floor(px / 2);
    const bit = brailleDot(py % 4, px % 2);
    masks[index] = erase ? (masks[index] ?? 0) & ~bit : (masks[index] ?? 0) | bit;
  }

  function line(ax: number, ay: number, bx: number, by: number): void {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax) / dx, Math.abs(by - ay) / dy) * 1.5));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      dot(ax + (bx - ax) * t, ay + (by - ay) * t);
    }
  }

  function solid(left: number, top: number, right: number, bottom: number): void {
    const columns = Math.max(1, Math.ceil((right - left) / dx));
    const rows = Math.max(1, Math.ceil((bottom - top) / dy));
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= columns; x++) {
        dot(left + (right - left) * x / columns, top + (bottom - top) * y / rows);
      }
    }
  }

  function pivot(x: number, y: number, radius: number): void {
    for (let oy = -radius; oy <= radius; oy += dy / 2) {
      for (let ox = -radius; ox <= radius; ox += dx / 2) {
        if (ox * ox + oy * oy < radius * radius * 0.65) dot(x + ox, y + oy, true);
      }
    }
    for (let i = 0; i < 32; i++) {
      const angle = i * Math.PI / 16;
      dot(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }
    dot(x, y);
  }

  function frame(milliseconds: number): void {
    if (!alive) return;
    masks.fill(0);
    const extension = midpoint + amplitude * Math.sin(phase + milliseconds * 0.00065 * rate);
    const rise = length * extension;
    // Every diagonal has length L because width squared plus rise squared equals L squared.
    const left = -length * 0.5;
    const right = left + length * Math.sqrt(1 - extension * extension);
    const top = base - count * rise;
    const joint = Math.max(Math.min(dx, dy) * 1.05, length * 0.025);
    solid(-length * 0.72, base + length * 0.075, length * 0.72, base + length * 0.16);
    line(left, base, length * 0.53, base);
    line(left, base + length * 0.05, length * 0.53, base + length * 0.05);
    solid(-length * 0.67, top - length * 0.055, length * 0.67, top);
    solid(-length * 0.12, top - length * 0.32, length * 0.3, top - length * 0.055);
    for (let i = 0; i < count; i++) {
      const bottom = base - i * rise;
      const upper = bottom - rise;
      line(left, bottom, right, upper);
      line(right, bottom, left, upper);
      pivot((left + right) / 2, (bottom + upper) / 2, joint);
    }
    for (let i = 0; i <= count; i++) {
      const y = base - i * rise;
      pivot(left, y, joint);
      pivot(right, y, joint);
    }
    // A short carriage follows the sliding foot along the fixed lower rail.
    line(right - joint * 1.5, base + length * 0.045, right + joint * 1.5, base + length * 0.045);
    for (const x of [-0.49, 0.49]) pivot(x * length, base + length * 0.225, length * 0.07);
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
