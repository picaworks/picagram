import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiAccordionSurfaceProps extends MotionProps {
  /** Number of complete ridge and valley pairs, from 2 to 9. */
  folds: number;
  /** Crease depth relative to panel width, from 0.15 to 1.2. */
  depth: number;
  /** Resting surface tilt in degrees, from 15 to 65. */
  tilt: number;
  /** Rate of the gentle tilt cycle, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 10 to 20. */
  fontSize: number;
}

export const defaults: AsciiAccordionSurfaceProps = {
  folds: 5,
  depth: 0.85,
  tilt: 35,
  speed: 0.6,
  fontSize: 12,
  paused: false,
  time: null,
  seed: 1,
};

type AccordionPoint = [number, number, number];

function accordionBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiAccordionSurfaceProps> = (host, initial = {}) => {
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
    fontSize: accordionBound(props.fontSize, 12, 10, 20),
    lineHeight: 1.25,
    columns: 0,
    renderer: "canvas",
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows, cellWidth, cellHeight } = grid;
    const colors = palette.colors;
    const segments = Math.round(accordionBound(props.folds, 5, 2, 9)) * 2;
    const depth = accordionBound(props.depth, 0.85, 0.15, 1.2);
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const phase = seed * 0.917 + milliseconds * 0.00012 * accordionBound(props.speed, 0.6, 0, 2);
    const pitch = accordionBound(props.tilt, 35, 15, 65) * Math.PI / 180 + Math.sin(phase) * 0.065;
    const yaw = 0.17 + Math.cos(phase * 0.73) * 0.07;
    const roll = -0.08 + Math.sin(phase * 0.63) * 0.025;
    const aspect = accordionBound(cols * cellWidth / (rows * cellHeight), 1.5, 0.65, 2);
    const sheetHeight = 2.8 / aspect;
    const project = (edge: number, v: number): AccordionPoint => {
      const x = (edge / segments - 0.5) * 2.8;
      const y = (v - 0.5) * sheetHeight;
      const z = (edge % 2 ? 1 : -1) * 1.4 / segments * depth;
      const py = y * Math.cos(pitch) - z * Math.sin(pitch);
      const pz = y * Math.sin(pitch) + z * Math.cos(pitch);
      const px = x * Math.cos(yaw) + pz * Math.sin(yaw);
      const rz = pz * Math.cos(yaw) - x * Math.sin(yaw);
      const perspective = 6 / (6 + rz);
      return [(px * Math.cos(roll) - py * Math.sin(roll)) * perspective, (px * Math.sin(roll) + py * Math.cos(roll)) * perspective, rz];
    };
    const corners = Array.from({ length: segments + 1 }, (_, i) => [project(i, 0), project(i, 1)] as const);
    const points = corners.flat();
    const minX = Math.min(...points.map((p) => p[0]));
    const maxX = Math.max(...points.map((p) => p[0]));
    const minY = Math.min(...points.map((p) => p[1]));
    const maxY = Math.max(...points.map((p) => p[1]));
    const scale = Math.min(Math.max(1, cols - 6) * cellWidth / (maxX - minX), Math.max(1, rows - 5) * cellHeight / (maxY - minY));
    const screen = (p: AccordionPoint): AccordionPoint => [
      (cols - 1) / 2 + (p[0] - (minX + maxX) / 2) * scale / cellWidth,
      (rows - 1) / 2 + (p[1] - (minY + maxY) / 2) * scale / cellHeight,
      p[2],
    ];
    const edges = corners.map(([a, b]) => [screen(a), screen(b)] as const);
    const ramp = measureRamp(" .:-=+*#%@", GRID_FONT, 1.25);
    grid.clear();
    // Density, rather than hue, separates the two sides of every crease.
    const faces = Array.from({ length: segments }, (_, i) => i).sort((a, b) => (corners[b]?.[0][2] ?? 0) - (corners[a]?.[0][2] ?? 0));
    for (const face of faces) {
      const edge = edges[face];
      const next = edges[face + 1];
      if (!edge || !next) continue;
      const polygon = [edge[0], next[0], next[1], edge[1]];
      const light = face % 2 ? 0.16 + depth * 0.08 : 0.34 + depth * 0.22;
      const glyph = pick(ramp, light);
      const x0 = Math.max(0, Math.floor(Math.min(...polygon.map((p) => p[0]))));
      const x1 = Math.min(cols - 1, Math.ceil(Math.max(...polygon.map((p) => p[0]))));
      const y0 = Math.max(0, Math.floor(Math.min(...polygon.map((p) => p[1]))));
      const y1 = Math.min(rows - 1, Math.ceil(Math.max(...polygon.map((p) => p[1]))));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          let positive = false;
          let negative = false;
          for (let k = 0; k < 4; k++) {
            const a = polygon[k];
            const b = polygon[(k + 1) % 4];
            if (!a || !b) continue;
            const side = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
            positive ||= side > 0;
            negative ||= side < 0;
          }
          if (!(positive && negative)) grid.set(x, y, glyph, colors.fg);
        }
      }
    }
    const buffers = [new Uint8Array(cols * rows), new Uint8Array(cols * rows), new Uint8Array(cols * rows)];
    function line(a: AccordionPoint, b: AccordionPoint, ink: number): void {
      const buffer = buffers[ink];
      if (!buffer) return;
      const samples = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]) * 2, Math.abs(b[1] - a[1]) * 4)));
      for (let i = 0; i <= samples; i++) {
        const x = Math.round((a[0] + (b[0] - a[0]) * i / samples) * 2);
        const y = Math.round((a[1] + (b[1] - a[1]) * i / samples) * 4);
        if (x < 0 || y < 0 || x >= cols * 2 || y >= rows * 4) continue;
        const index = Math.floor(y / 4) * cols + Math.floor(x / 2);
        buffer[index] = (buffer[index] ?? 0) | brailleDot(y % 4, x % 2);
      }
    }
    const crossbars = Math.max(4, Math.min(9, Math.round(rows / 4)));
    for (let row = 0; row <= crossbars; row++) {
      const v = row / crossbars;
      for (let i = 0; i < segments; i++) line(screen(project(i, v)), screen(project(i + 1, v)), row === 0 || row === crossbars ? 1 : 0);
    }
    const selected = Math.floor(segments / 4) * 2 + 1;
    for (let i = 0; i <= segments; i++) {
      const edge = edges[i];
      if (edge) line(edge[0], edge[1], i === selected ? 2 : i % 2 || i === 0 || i === segments ? 1 : 0);
    }
    const inks = [colors.muted, colors.fg, colors.accent];
    for (let i = 0; i < cols * rows; i++) {
      let dots = 0;
      let ink = colors.muted;
      for (let k = 0; k < 3; k++) {
        const mask = buffers[k]?.[i] ?? 0;
        if (mask) { dots |= mask; ink = inks[k] ?? colors.fg; }
      }
      if (dots) grid.set(i % cols, Math.floor(i / cols), braille(dots), ink);
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 3200, frame });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.fontSize !== props.fontSize) grid.update(options());
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
