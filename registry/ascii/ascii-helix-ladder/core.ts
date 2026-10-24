import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiHelixLadderProps extends MotionProps {
  /** Complete revolutions along the finite ladder, from 0.75 to 3. */
  turns: number;
  /** Strand radius relative to available width, from 0.4 to 1. */
  radius: number;
  /** Number of evenly spaced rungs, including both ends, from 8 to 28. */
  rungs: number;
  /** Rotation rate about the vertical axis, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 20. */
  fontSize: number;
}

export const defaults: AsciiHelixLadderProps = {
  turns: 1.5,
  radius: 0.8,
  rungs: 17,
  speed: 0.7,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

type HelixPoint = [number, number, number];

function helixBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiHelixLadderProps> = (host, initial = {}) => {
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
    fontSize: helixBound(props.fontSize, 16, 14, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => loop?.redraw());

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows, cellWidth, cellHeight } = grid;
    const height = Math.max(1, rows - 5) * cellHeight;
    const radius = Math.max(1, Math.min((cols - 5) * cellWidth / 2, height * 0.33))
      * helixBound(props.radius, 0.8, 0.4, 1);
    const turns = helixBound(props.turns, 1.5, 0.75, 3);
    const count = Math.round(helixBound(props.rungs, 17, 8, 28));
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const phase = seed * 2.39996 + milliseconds * 0.00025 * helixBound(props.speed, 0.7, 0, 2);
    const masks = new Uint8Array(cols * rows);
    const point = (v: number, side: number): HelixPoint => {
      const angle = phase + v * turns * Math.PI * 2 + side * Math.PI;
      return [Math.cos(angle) * radius, (v - 0.5) * height, Math.sin(angle)];
    };
    const project = (p: HelixPoint): HelixPoint => {
      const perspective = 1 + p[2] * 0.065;
      return [
        ((cols - 1) / 2 + p[0] * perspective / cellWidth) * 2,
        ((rows - 1) / 2 + p[1] * perspective / cellHeight) * 4,
        p[2],
      ];
    };
    const dot = (x: number, y: number): void => {
      if (x < 0 || y < 0 || x >= cols * 2 || y >= rows * 4) return;
      const index = Math.floor(y / 4) * cols + Math.floor(x / 2);
      masks[index] = (masks[index] ?? 0) | brailleDot(y % 4, x % 2);
    };
    const line = (a: HelixPoint, b: HelixPoint, strand: boolean): void => {
      const start = project(a);
      const end = project(b);
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(end[0] - start[0]), Math.abs(end[1] - start[1])) * 1.5));
      for (let i = 0; i <= steps; i++) {
        const v = i / steps;
        const x = Math.round(start[0] + (end[0] - start[0]) * v);
        const y = Math.round(start[1] + (end[1] - start[1]) * v);
        dot(x, y);
        // The near strand carries a second dot, while the rear remains a fine line.
        if (strand && a[2] + (b[2] - a[2]) * v > 0.1) dot(x + 1, y);
      }
    };
    for (let i = 0; i < count; i++) {
      const v = i / (count - 1);
      line(point(v, 0), point(v, 1), false);
    }
    const samples = Math.max(100, Math.ceil(rows * turns * 12));
    for (let side = 0; side < 2; side++) {
      let previous = point(0, side);
      for (let i = 1; i <= samples; i++) {
        const current = point(i / samples, side);
        line(previous, current, true);
        previous = current;
      }
    }
    grid.clear();
    for (let i = 0; i < masks.length; i++) {
      const mask = masks[i] ?? 0;
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
