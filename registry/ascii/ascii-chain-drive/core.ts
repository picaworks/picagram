import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiChainDriveProps extends MotionProps {
  /** Large to small sprocket radius ratio, from 1.2 to 2.2. */
  ratio: number;
  /** Number of discrete links on the closed chain, from 24 to 56. */
  links: number;
  /** Axle separation that stretches the straight runs, from 0.5 to 1.5. */
  tension: number;
  /** Clockwise chain travel rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 12 to 20. */
  fontSize: number;
}

export const defaults: AsciiChainDriveProps = {
  ratio: 1.6,
  links: 36,
  tension: 1,
  speed: 0.7,
  fontSize: 14,
  paused: false,
  time: null,
  seed: 1,
};

type ChainPoint = [number, number];
type ChainSample = [number, number, number, number];

function chainBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiChainDriveProps> = (host, initial = {}) => {
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
    fontSize: chainBound(props.fontSize, 14, 12, 20),
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
    const small = 1 / chainBound(props.ratio, 1.6, 1.2, 2.2);
    const distance = 2.8 + chainBound(props.tension, 1, 0.5, 1.5) * 0.7;
    const largePath = 1.08;
    const smallPath = small + 0.08;
    const theta = Math.acos((largePath - smallPath) / distance);
    const straight = Math.sqrt(distance * distance - (largePath - smallPath) ** 2);
    const shortArc = 2 * theta * smallPath;
    const longArc = (Math.PI * 2 - 2 * theta) * largePath;
    const perimeter = 2 * straight + shortArc + longArc;
    const count = Math.round(chainBound(props.links, 36, 24, 56));
    const pitch = perimeter / count;
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const travel = seed * 0.21 + milliseconds * 0.00035 * chainBound(props.speed, 0.7, 0, 2);
    const rotation = width / Math.max(1, height) < 0.9 ? -Math.PI / 2 + 0.18 : -0.12;
    const rotate = (x: number, y: number): ChainPoint => [x * Math.cos(rotation) - y * Math.sin(rotation), x * Math.sin(rotation) + y * Math.cos(rotation)];
    const corners: ChainPoint[] = [];
    for (const x of [-distance / 2 - largePath - 0.1, distance / 2 + smallPath + 0.1]) {
      for (const y of [-largePath - 0.1, largePath + 0.1]) corners.push(rotate(x, y));
    }
    const minX = Math.min(...corners.map((p) => p[0]));
    const maxX = Math.max(...corners.map((p) => p[0]));
    const minY = Math.min(...corners.map((p) => p[1]));
    const maxY = Math.max(...corners.map((p) => p[1]));
    const scale = Math.min(Math.max(cellWidth, width - cellWidth * 4) / (maxX - minX), Math.max(cellHeight, height - cellHeight * 4) / (maxY - minY));
    const screen = (p: ChainPoint): ChainPoint => {
      const q = rotate(p[0], p[1]);
      return [(cols - 1) / 2 + (q[0] - (minX + maxX) / 2) * scale / cellWidth, (rows - 1) / 2 + (q[1] - (minY + maxY) / 2) * scale / cellHeight];
    };
    const dots = new Uint8Array(cols * rows);
    const line = (from: ChainPoint, to: ChainPoint): void => {
      const a = screen(from);
      const b = screen(to);
      const samples = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]) * 3, Math.abs(b[1] - a[1]) * 6)));
      for (let i = 0; i <= samples; i++) {
        const x = Math.round((a[0] + (b[0] - a[0]) * i / samples) * 2);
        const y = Math.round((a[1] + (b[1] - a[1]) * i / samples) * 4);
        if (x < 0 || y < 0 || x >= cols * 2 || y >= rows * 4) continue;
        const index = Math.floor(y / 4) * cols + Math.floor(x / 2);
        dots[index] = (dots[index] ?? 0) | brailleDot(y % 4, x % 2);
      }
    };
    const path = (offset: number): ChainSample => {
      let s = ((offset % perimeter) + perimeter) % perimeter;
      const nx = Math.cos(theta);
      const ny = Math.sin(theta);
      if (s < straight) {
        const t = s / straight;
        return [-distance / 2 + largePath * nx + (distance + (smallPath - largePath) * nx) * t, -largePath * ny + (largePath - smallPath) * ny * t, ny, nx];
      }
      s -= straight;
      if (s < shortArc) {
        const a = -theta + s / smallPath;
        return [distance / 2 + smallPath * Math.cos(a), smallPath * Math.sin(a), -Math.sin(a), Math.cos(a)];
      }
      s -= shortArc;
      if (s < straight) {
        const t = s / straight;
        return [distance / 2 + smallPath * nx - (distance + (smallPath - largePath) * nx) * t, smallPath * ny + (largePath - smallPath) * ny * t, -ny, nx];
      }
      s -= straight;
      const a = theta + s / largePath;
      return [-distance / 2 + largePath * Math.cos(a), largePath * Math.sin(a), -Math.sin(a), Math.cos(a)];
    };
    // Both wheels turn by the same chain distance at their own pitch radius.
    for (const [cx, radius, pathRadius] of [[-distance / 2, 1, largePath], [distance / 2, small, smallPath]]) {
      if (cx === undefined || radius === undefined || pathRadius === undefined) continue;
      const teeth = Math.max(9, Math.round(Math.PI * 2 * pathRadius / pitch));
      const angle = travel / pathRadius;
      let previous: ChainPoint | null = null;
      for (let step = 0; step <= teeth * 4; step++) {
        const a = angle + step / (teeth * 4) * Math.PI * 2;
        const r = radius * (step % 4 === 1 || step % 4 === 2 ? 1 : 0.86);
        const p: ChainPoint = [cx + Math.cos(a) * r, Math.sin(a) * r];
        if (previous) line(previous, p);
        previous = p;
      }
      for (let spoke = 0; spoke < 5; spoke++) {
        const a = angle + spoke * Math.PI * 2 / 5;
        line([cx + Math.cos(a) * radius * 0.2, Math.sin(a) * radius * 0.2], [cx + Math.cos(a) * radius * 0.82, Math.sin(a) * radius * 0.82]);
      }
      for (let step = 0; step < 20; step++) {
        const a = step / 20 * Math.PI * 2;
        const b = (step + 1) / 20 * Math.PI * 2;
        line([cx + Math.cos(a) * radius * 0.2, Math.sin(a) * radius * 0.2], [cx + Math.cos(b) * radius * 0.2, Math.sin(b) * radius * 0.2]);
      }
    }
    for (let link = 0; link < count; link++) {
      const [x, y, tx, ty] = path(link * pitch + travel);
      const half = pitch * 0.44;
      const side = Math.min(0.065, pitch * 0.2);
      const a: ChainPoint = [x - tx * half - ty * side, y - ty * half + tx * side];
      const b: ChainPoint = [x + tx * half - ty * side, y + ty * half + tx * side];
      const c: ChainPoint = [x + tx * half + ty * side, y + ty * half - tx * side];
      const d: ChainPoint = [x - tx * half + ty * side, y - ty * half - tx * side];
      line(a, b); line(b, c); line(c, d); line(d, a);
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
