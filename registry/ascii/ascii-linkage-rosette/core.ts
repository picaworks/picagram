import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiLinkageRosetteProps extends MotionProps {
  /** Number of articulated radial arms, from 4 to 10. */
  arms: number;
  /** Maximum hinge opening relative to the arm spacing, from 0.25 to 1. */
  opening: number;
  /** Link length relative to available rosette radius, from 0.5 to 1. */
  reach: number;
  /** Rate of the shared opening and closing cycle, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 20. */
  fontSize: number;
}

export const defaults: AsciiLinkageRosetteProps = {
  arms: 6,
  opening: 0.9,
  reach: 0.95,
  speed: 0.65,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

type RosettePoint = [number, number];

function rosetteBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiLinkageRosetteProps> = (host, initial = {}) => {
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
    fontSize: rosetteBound(props.fontSize, 16, 14, 20),
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
    const radius = Math.max(1, Math.min((cols - 5) * cellWidth, (rows - 5) * cellHeight) / 2);
    const count = Math.round(rosetteBound(props.arms, 6, 4, 10));
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const phase = seed * 0.79 + milliseconds * 0.001 * rosetteBound(props.speed, 0.65, 0, 2);
    const opening = rosetteBound(props.opening, 0.9, 0.25, 1);
    const angle = Math.PI / count * 0.9 * (0.3 + opening * (0.35 + Math.sin(phase) * 0.3));
    const link = radius * rosetteBound(props.reach, 0.95, 0.5, 1) * 0.225;
    const halfLength = link * Math.cos(angle);
    const halfWidth = link * Math.sin(angle);
    const hub = radius * 0.095;
    const masks = new Uint8Array(cols * rows);
    const project = (p: RosettePoint): RosettePoint => [
      ((cols - 1) / 2 + p[0] / cellWidth) * 2,
      ((rows - 1) / 2 + p[1] / cellHeight) * 4,
    ];
    const dot = (x: number, y: number): void => {
      if (x < 0 || y < 0 || x >= cols * 2 || y >= rows * 4) return;
      const index = Math.floor(y / 4) * cols + Math.floor(x / 2);
      masks[index] = (masks[index] ?? 0) | brailleDot(y % 4, x % 2);
    };
    const line = (a: RosettePoint, b: RosettePoint): void => {
      const start = project(a);
      const end = project(b);
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(end[0] - start[0]), Math.abs(end[1] - start[1])) * 1.5));
      for (let i = 0; i <= steps; i++) {
        dot(Math.round(start[0] + (end[0] - start[0]) * i / steps), Math.round(start[1] + (end[1] - start[1]) * i / steps));
      }
    };
    const circle = (center: RosettePoint, size: number, segments: number): void => {
      let previous: RosettePoint = [center[0] + size, center[1]];
      for (let i = 1; i <= segments; i++) {
        const a = i / segments * Math.PI * 2;
        const current: RosettePoint = [center[0] + Math.cos(a) * size, center[1] + Math.sin(a) * size];
        line(previous, current);
        previous = current;
      }
    };
    circle([0, 0], hub, 40);
    const jointSize = Math.min(cellWidth, cellHeight / 2) * 0.3;
    for (let arm = 0; arm < count; arm++) {
      const bearing = -Math.PI / 2 + seed * 0.147 + arm / count * Math.PI * 2;
      const at = (radial: number, tangent = 0): RosettePoint => [
        Math.cos(bearing) * radial - Math.sin(bearing) * tangent,
        Math.sin(bearing) * radial + Math.cos(bearing) * tangent,
      ];
      let inner = at(hub);
      circle(inner, jointSize, 8);
      for (let diamond = 0; diamond < 2; diamond++) {
        const center = hub + (diamond * 2 + 1) * halfLength;
        const left = at(center, halfWidth);
        const right = at(center, -halfWidth);
        const outer = at(hub + (diamond + 1) * 2 * halfLength);
        // Adjacent diamonds reuse this exact outer joint as their next inner joint.
        line(inner, left);
        line(left, outer);
        line(outer, right);
        line(right, inner);
        circle(left, jointSize, 8);
        circle(right, jointSize, 8);
        circle(outer, jointSize, 8);
        inner = outer;
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
