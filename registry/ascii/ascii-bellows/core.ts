import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiBellowsProps extends MotionProps {
  /** Complete accordion folds between the square plates, from 6 to 14. */
  folds: number;
  /** Compression of the resting bellows length, from 0.3 to 0.75. */
  compression: number;
  /** Expansion and compression travel relative to resting length, from 0.1 to 0.25. */
  travel: number;
  /** Rate of the expansion cycle, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 20. */
  fontSize: number;
}

export const defaults: AsciiBellowsProps = {
  folds: 9,
  compression: 0.5,
  travel: 0.15,
  speed: 0.65,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

type BellowsPoint = [number, number, number, number];
type BellowsFace = [number, number, number, number, number];
type BellowsLayout = { cols: number; rows: number; rest: number; points: BellowsPoint[]; faces: BellowsFace[]; edges: [number, number][]; x: Float64Array; y: Float64Array; masks: Uint8Array; tones: number[]; sx: number; sy: number; ox: number; oy: number; cosine: number; sine: number; view: number };

function bellowsBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

function bellowsDot(masks: Uint8Array, cols: number, rows: number, x: number, y: number): void {
  const dx = Math.round(x);
  const dy = Math.round(y);
  if (dx < 0 || dy < 0 || dx >= cols * 2 || dy >= rows * 4) return;
  const index = Math.floor(dy / 4) * cols + Math.floor(dx / 2);
  masks[index] = (masks[index] ?? 0) | brailleDot(dy % 4, dx % 2);
}

function bellowsLine(masks: Uint8Array, cols: number, rows: number, ax: number, ay: number, bx: number, by: number): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 1.4));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    bellowsDot(masks, cols, rows, ax + (bx - ax) * t, ay + (by - ay) * t);
  }
}

function bellowsFill(layout: BellowsLayout, face: BellowsFace): void {
  const { cols, rows, x, y, masks, tones } = layout;
  const tone = tones[face[4]] ?? 0;
  let left = cols * 2;
  let right = 0;
  let top = rows * 4;
  let bottom = 0;
  for (let i = 0; i < 4; i++) {
    const vertex = face[i] ?? 0;
    left = Math.min(left, x[vertex] ?? 0);
    right = Math.max(right, x[vertex] ?? 0);
    top = Math.min(top, y[vertex] ?? 0);
    bottom = Math.max(bottom, y[vertex] ?? 0);
  }
  for (let py = Math.max(0, Math.ceil(top)); py <= Math.min(rows * 4 - 1, bottom); py++) {
    for (let px = Math.max(0, Math.ceil(left)); px <= Math.min(cols * 2 - 1, right); px++) {
      const bit = brailleDot(py % 4, px % 2);
      if (!(tone & bit)) continue;
      let positive = false;
      let negative = false;
      for (let i = 0; i < 4; i++) {
        const a = face[i] ?? 0;
        const b = face[(i + 1) % 4] ?? 0;
        const cross = ((x[b] ?? 0) - (x[a] ?? 0)) * (py - (y[a] ?? 0)) - ((y[b] ?? 0) - (y[a] ?? 0)) * (px - (x[a] ?? 0));
        if (cross > 0) positive = true;
        if (cross < 0) negative = true;
      }
      if (positive && negative) continue;
      const index = Math.floor(py / 4) * cols + Math.floor(px / 2);
      masks[index] = (masks[index] ?? 0) | bit;
    }
  }
}

export const mount: Mount<AsciiBellowsProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  let layout: BellowsLayout | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "under");
  const options = (): GridOptions => ({ fontFamily: GRID_FONT, fontSize: bellowsBound(props.fontSize, 16, 14, 20), lineHeight: 1.2, columns: 0, renderer: "canvas", fixedCells: true, color: "" });
  const grid = createGrid(drawing.el, options(), () => { layout = null; loop?.redraw(); });

  function prepare(): BellowsLayout {
    const { cols, rows, cellWidth: cw, cellHeight: ch } = grid;
    const folds = Math.round(bellowsBound(props.folds, 9, 6, 14));
    const rest = 7 * (1 - 0.65 * bellowsBound(props.compression, 0.5, 0.3, 0.75));
    const travel = bellowsBound(props.travel, 0.15, 0.1, 0.25);
    const seed = Math.round(bellowsBound(props.seed, 1, 1, 99));
    const view = seed % 2 ? 1 : -1;
    const angle = cols * cw < rows * ch * 1.2 ? Math.PI / 2 - 0.1 : 0;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const points: BellowsPoint[] = [];
    const faces: BellowsFace[] = [];
    const edges: [number, number][] = [];
    const ring = (t: number, offset: number, r: number): number[] => {
      const start = points.length;
      points.push([t, offset, -r, -r], [t, offset, -r, r], [t, offset, r, r], [t, offset, r, -r]);
      return [start, start + 1, start + 2, start + 3];
    };
    const edge = (a: number | undefined, b: number | undefined): void => { if (a !== undefined && b !== undefined) edges.push([a, b]); };
    let previous: number[] = [];
    let first: number[] = [];
    for (let i = 0; i <= folds * 2; i++) {
      const current = ring(i / (folds * 2) - 0.5, 0, i % 2 ? 0.62 : 0.8);
      if (!i) first = current;
      edge(current[0], current[1]);
      edge(current[1], current[2]);
      edge(current[2], current[3]);
      if (i) {
        faces.push([previous[0] ?? 0, previous[1] ?? 0, current[1] ?? 0, current[0] ?? 0, i % 2 ? 2 : 0]);
        faces.push([previous[1] ?? 0, previous[2] ?? 0, current[2] ?? 0, current[1] ?? 0, i % 2 ? 1 : 0]);
        for (let j = 0; j < 4; j++) edge(previous[j], current[j]);
      }
      previous = current;
    }
    edge(first[1], previous[1]);
    edge(first[2], previous[2]);
    for (const side of [-1, 1]) {
      const inside = ring(side / 2, 0, 0.94);
      const outside = ring(side / 2, side * 0.12, 0.94);
      faces.push([outside[0] ?? 0, outside[1] ?? 0, outside[2] ?? 0, outside[3] ?? 0, 2]);
      for (let i = 0; i < 4; i++) {
        edge(inside[i], inside[(i + 1) % 4]);
        edge(outside[i], outside[(i + 1) % 4]);
        edge(inside[i], outside[i]);
      }
      edge(outside[0], outside[2]);
      edge(outside[1], outside[3]);
    }
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    for (const length of [rest * (1 - travel), rest * (1 + travel)]) {
      for (const p of points) {
        const px = p[0] * length + p[1] + p[3] * 0.55 * view;
        const py = p[2] - p[3] * 0.35;
        const x = px * cosine - py * sine;
        const y = px * sine + py * cosine;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    const scale = Math.max(1, Math.min(Math.max(1, (cols - 6) * cw) / (right - left), Math.max(1, (rows - 6) * ch) / (bottom - top)));
    const sx = scale * 2 / cw;
    const sy = scale * 4 / ch;
    const ramp = measureRamp(" ⠇⣿⠁⠿⠉⠋", GRID_FONT);
    const tones = [0.08, 0.36, 0.2].map((tone) => Math.max(0, (pick(ramp, tone).codePointAt(0) ?? 0x2800) - 0x2800));
    return { cols, rows, rest, points, faces, edges, x: new Float64Array(points.length), y: new Float64Array(points.length), masks: new Uint8Array(cols * rows), tones, sx, sy, ox: cols - 1 - (left + right) / 2 * sx, oy: (rows - 1) * 2 - (top + bottom) / 2 * sy, cosine, sine, view };
  }

  function frame(milliseconds: number): void {
    if (!alive) return;
    if (!layout || layout.cols !== grid.cols || layout.rows !== grid.rows) layout = prepare();
    const { cols, rows, rest, points, faces, edges, x, y, masks, sx, sy, ox, oy, cosine, sine, view } = layout;
    masks.fill(0);
    const seed = Math.round(bellowsBound(props.seed, 1, 1, 99));
    const phase = seed * 2.39996 + milliseconds * 0.00055 * bellowsBound(props.speed, 0.65, 0, 2);
    const length = rest * (1 + bellowsBound(props.travel, 0.15, 0.1, 0.25) * Math.sin(phase));
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!p) continue;
      const px = p[0] * length + p[1] + p[3] * 0.55 * view;
      const py = p[2] - p[3] * 0.35;
      x[i] = ox + (px * cosine - py * sine) * sx;
      y[i] = oy + (px * sine + py * cosine) * sy;
    }
    for (const face of faces) bellowsFill(layout, face);
    for (const [a, b] of edges) bellowsLine(masks, cols, rows, x[a] ?? 0, y[a] ?? 0, x[b] ?? 0, y[b] ?? 0);
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
      if (before.folds !== props.folds || before.compression !== props.compression || before.travel !== props.travel || before.seed !== props.seed) layout = null;
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
