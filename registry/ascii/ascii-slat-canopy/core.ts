import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiSlatCanopyProps extends MotionProps {
  /** Number of parallel curved structural ribs, from 4 to 12. */
  ribs: number;
  /** Height of the open vault relative to its span, from 0.5 to 1.6. */
  arch: number;
  /** Resting rigid rib tilt in degrees, from -20 to 30. */
  tilt: number;
  /** Rate of the offset rib rocking, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 12 to 20. */
  fontSize: number;
}

export const defaults: AsciiSlatCanopyProps = {
  ribs: 7,
  arch: 1.05,
  tilt: 10,
  speed: 0.7,
  fontSize: 14,
  paused: false,
  time: null,
  seed: 1,
};

type CanopyPoint = [number, number];

function canopyBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiSlatCanopyProps> = (host, initial = {}) => {
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
    fontSize: canopyBound(props.fontSize, 14, 12, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows, cellWidth, cellHeight } = grid;
    const width = cols * cellWidth;
    const height = rows * cellHeight;
    const narrow = width / Math.max(1, height) < 0.9;
    const depth = narrow ? 5 : 3;
    const yaw = narrow ? -0.22 : -0.55;
    const rise = canopyBound(props.arch, 1.05, 0.5, 1.6) * 1.3;
    const count = Math.round(canopyBound(props.ribs, 7, 4, 12));
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const phase = seed * 0.83 + milliseconds * 0.00036 * canopyBound(props.speed, 0.7, 0, 2);
    const project = (x: number, y: number, z: number): CanopyPoint => [
      x * Math.cos(yaw) - y * Math.sin(yaw),
      (x * Math.sin(yaw) + y * Math.cos(yaw)) * 0.63 - z * 0.88,
    ];
    const bounds: CanopyPoint[] = [];
    for (const x of [-1.4, 1.4]) {
      for (const y of [-depth / 2 - 0.5, depth / 2 + 0.5]) {
        for (const z of [0, rise]) bounds.push(project(x, y, z));
      }
    }
    const minX = Math.min(...bounds.map((p) => p[0]));
    const maxX = Math.max(...bounds.map((p) => p[0]));
    const minY = Math.min(...bounds.map((p) => p[1]));
    const maxY = Math.max(...bounds.map((p) => p[1]));
    const scale = Math.min(Math.max(cellWidth, width - cellWidth * 4) / (maxX - minX), Math.max(cellHeight, height - cellHeight * 4) / (maxY - minY));
    const screen = (p: CanopyPoint): CanopyPoint => [
      (cols - 1) / 2 + (p[0] - (minX + maxX) / 2) * scale / cellWidth,
      (rows - 1) / 2 + (p[1] - (minY + maxY) / 2) * scale / cellHeight,
    ];
    const point = (rib: number, arc: number, edge = 0): CanopyPoint => {
      const angle = canopyBound(props.tilt, 10, -20, 30) * Math.PI / 180 + Math.sin(phase - rib * 0.55) * 0.15;
      const z = rise * Math.sin(arc * Math.PI);
      const y = (rib / (count - 1) - 0.5) * depth + (z - rise * 0.5) * Math.sin(angle) + edge * 0.055;
      return screen(project(-1.4 * Math.cos(arc * Math.PI), y, z * Math.cos(angle)));
    };
    const dots = new Uint8Array(cols * rows);
    const line = (a: CanopyPoint, b: CanopyPoint): void => {
      const samples = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]) * 3, Math.abs(b[1] - a[1]) * 6)));
      for (let i = 0; i <= samples; i++) {
        const x = Math.round((a[0] + (b[0] - a[0]) * i / samples) * 2);
        const y = Math.round((a[1] + (b[1] - a[1]) * i / samples) * 4);
        if (x < 0 || y < 0 || x >= cols * 2 || y >= rows * 4) continue;
        const index = Math.floor(y / 4) * cols + Math.floor(x / 2);
        dots[index] = (dots[index] ?? 0) | brailleDot(y % 4, x % 2);
      }
    };
    // Double edges give each rigid rib width without filling the open vault.
    for (let rib = 0; rib < count; rib++) {
      for (const edge of [-1, 1]) {
        for (let step = 0; step < 40; step++) line(point(rib, step / 40, edge), point(rib, (step + 1) / 40, edge));
      }
      for (const arc of [0, 0.25, 0.5, 0.75, 1]) line(point(rib, arc, -1), point(rib, arc, 1));
    }
    // The two eaves and crown rail join every rib into one finite structure.
    for (const arc of [0, 0.5, 1]) {
      for (let rib = 0; rib < count - 1; rib++) line(point(rib, arc), point(rib + 1, arc));
    }
    grid.clear();
    for (let i = 0; i < dots.length; i++) {
      const mask = dots[i] ?? 0;
      if (mask) grid.set(i % cols, Math.floor(i / cols), braille(mask), palette.colors.fg);
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
