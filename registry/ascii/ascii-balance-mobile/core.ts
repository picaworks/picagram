import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiBalanceMobileProps extends MotionProps {
  /** Number of connected rod levels, from 2 to 4. */
  levels: number;
  /** Horizontal rod span multiplier, from 0.7 to 1.25. */
  spread: number;
  /** Strength of the coupled rod tilts, from 0 to 1. */
  sway: number;
  /** Rate of the restrained sway cycle, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 12 to 20. */
  fontSize: number;
}

export const defaults: AsciiBalanceMobileProps = {
  levels: 3,
  spread: 1,
  sway: 0.65,
  speed: 0.6,
  fontSize: 14,
  paused: false,
  time: null,
  seed: 1,
};

type MobilePoint = [number, number];

function mobileBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiBalanceMobileProps> = (host, initial = {}) => {
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
    fontSize: mobileBound(props.fontSize, 14, 12, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const ramp = measureRamp(" .:-=+*#%@", GRID_FONT, 1.2);
  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  let dots = new Uint8Array(0);

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows, cellWidth, cellHeight } = grid;
    if (dots.length !== cols * rows) dots = new Uint8Array(cols * rows);
    dots.fill(0);
    const levels = Math.round(mobileBound(props.levels, 3, 2, 4));
    const portrait = cols * cellWidth < rows * cellHeight;
    const length = (portrait ? 1.35 : 3.8) * mobileBound(props.spread, 1, 0.7, 1.25);
    const suspension = 0.5 + length * 0.18;
    const height = suspension + (levels - 1) * 0.9 + 1 + length * 0.17;
    const scale = Math.min(Math.max(1, cols - 6) * cellWidth / (length * 1.7 + 0.44), Math.max(1, rows - 4) * cellHeight / height);
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const phase = seed * 0.71 + milliseconds * 0.0005 * mobileBound(props.speed, 0.6, 0, 2);
    const sway = mobileBound(props.sway, 0.65, 0, 1);
    const weights: [number, number, number][] = [];
    const screen = (p: MobilePoint): MobilePoint => [cols + p[0] * scale / cellWidth * 2, 8 + p[1] * scale / cellHeight * 4];
    function dot(x: number, y: number): void {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= cols * 2 || y >= rows * 4) return;
      const index = Math.floor(y / 4) * cols + Math.floor(x / 2);
      dots[index] = (dots[index] ?? 0) | brailleDot(y % 4, x % 2);
    }
    function line(a: MobilePoint, b: MobilePoint): void {
      const p = screen(a), q = screen(b);
      const samples = Math.max(1, Math.ceil(Math.max(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])) * 1.5));
      for (let i = 0; i <= samples; i++) dot(p[0] + (q[0] - p[0]) * i / samples, p[1] + (q[1] - p[1]) * i / samples);
    }
    function weight(endpoint: MobilePoint, depth: number): void {
      const radius = 0.16 + (levels - depth) * 0.012;
      const center: MobilePoint = [endpoint[0], endpoint[1] + 0.52 + radius];
      line(endpoint, [center[0], center[1] - radius]);
      weights.push([center[0], center[1], radius]);
    }
    function rod(pivot: MobilePoint, depth: number, inherited: number): void {
      const remaining = levels - depth;
      const span = length * Math.pow(0.72, depth);
      const direction = depth % 2 ? -1 : 1;
      const angle = sway * (Math.sin(phase * (1 + depth * 0.17) + depth * 1.3) * 0.14 + inherited * 0.25);
      const branchArm = span / (remaining + 1);
      const leafArm = span - branchArm;
      const c = Math.cos(angle), s = Math.sin(angle);
      const branch: MobilePoint = [pivot[0] + direction * branchArm * c, pivot[1] + direction * branchArm * s];
      const leaf: MobilePoint = [pivot[0] - direction * leafArm * c, pivot[1] - direction * leafArm * s];
      line(leaf, branch);
      weight(leaf, depth);
      if (remaining > 1) {
        const child: MobilePoint = [branch[0], branch[1] + 0.9];
        line(branch, child);
        rod(child, depth + 1, angle);
      } else weight(branch, depth);
    }
    line([-0.12, 0], [0.12, 0]);
    line([0, 0], [0, suspension]);
    rod([0, suspension], 0, 0);
    grid.clear();
    for (let i = 0; i < dots.length; i++) {
      const mask = dots[i] ?? 0;
      if (mask) grid.set(i % cols, Math.floor(i / cols), braille(mask));
    }
    for (const [wx, wy, radius] of weights) {
      const center = screen([wx, wy]);
      const cx = center[0] / 2, cy = center[1] / 4;
      const rx = radius * scale / cellWidth;
      const ry = radius * scale / cellHeight;
      for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(rows - 1, Math.ceil(cy + ry)); y++) {
        for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(cols - 1, Math.ceil(cx + rx)); x++) {
          let mask = 0;
          let count = 0;
          for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const nx = (x + (dx + 0.5) / 2 - cx) / rx;
              const ny = (y + (dy + 0.5) / 4 - cy) / ry;
              if (nx * nx + ny * ny <= 1) { mask |= brailleDot(dy, dx); count++; }
            }
          }
          if (!count) continue;
          const nx = (x + 0.5 - cx) / rx;
          const ny = (y + 0.5 - cy) / ry;
          const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
          const tone = 0.25 + 0.62 * Math.max(0, nz * 0.8 - nx * 0.35 - ny * 0.45);
          grid.set(x, y, count === 8 ? pick(ramp, tone) : braille(mask));
        }
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
