import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiGearTrainProps extends MotionProps {
  /** Whole teeth on each outer gear, from 10 to 18. */
  teeth: number;
  /** Center gear tooth multiplier, rounded to whole teeth, from 1 to 2. */
  ratio: number;
  /** Opening of the bent gear train, from 0.6 to 1. */
  spread: number;
  /** Drive gear rotation rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 20. */
  fontSize: number;
}

export const defaults: AsciiGearTrainProps = {
  teeth: 12,
  ratio: 1.5,
  spread: 0.8,
  speed: 0.75,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

type GearPoint = [number, number];
type TrainGear = { x: number; y: number; radius: number; count: number; phase: number; rate: number; paths: GearPoint[][] };
type TrainLayout = { cols: number; rows: number; sx: number; sy: number; gears: TrainGear[]; masks: Uint8Array; fixed: Uint8Array };

function trainBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

function trainDot(masks: Uint8Array, cols: number, rows: number, x: number, y: number): void {
  const dx = Math.round(x);
  const dy = Math.round(y);
  if (dx < 0 || dy < 0 || dx >= cols * 2 || dy >= rows * 4) return;
  const index = Math.floor(dy / 4) * cols + Math.floor(dx / 2);
  masks[index] = (masks[index] ?? 0) | brailleDot(dy % 4, dx % 2);
}

function trainLine(masks: Uint8Array, cols: number, rows: number, ax: number, ay: number, bx: number, by: number): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 1.4));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    trainDot(masks, cols, rows, ax + (bx - ax) * t, ay + (by - ay) * t);
  }
}

function trainProfile(count: number, module: number): GearPoint[][] {
  const radius = count * module / 2;
  const root = radius - 1.05 * module;
  const base = radius * Math.cos(Math.PI / 9);
  const tip = radius + 0.8 * module;
  const pitch = Math.PI * 2 / count;
  const involute = Math.tan(Math.PI / 9) - Math.PI / 9;
  const half = (r: number): number => {
    const pressure = Math.acos(Math.min(1, base / r));
    return pitch / 4 + involute - (Math.tan(pressure) - pressure);
  };
  const outline: GearPoint[] = [];
  const add = (angle: number, r: number): void => { outline.push([Math.cos(angle) * r, Math.sin(angle) * r]); };
  for (let i = 0; i < count; i++) {
    const angle = i * pitch;
    add(angle - half(base), root);
    for (let j = 0; j <= 4; j++) {
      const r = base + (tip - base) * j / 4;
      add(angle - half(r), r);
    }
    for (let j = 1; j <= 3; j++) add(angle + half(tip) * (j / 1.5 - 1), tip);
    for (let j = 3; j >= 0; j--) {
      const r = base + (tip - base) * j / 4;
      add(angle + half(r), r);
    }
    add(angle + half(base), root);
    add(angle + pitch / 2, root);
  }
  const first = outline[0];
  if (first) outline.push(first);
  const rim: GearPoint[] = [];
  for (let i = 0; i <= 80; i++) {
    const angle = i / 80 * Math.PI * 2;
    rim.push([Math.cos(angle) * radius * 0.65, Math.sin(angle) * radius * 0.65]);
  }
  const paths = [outline, rim];
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    paths.push([[Math.cos(angle) * radius * 0.22, Math.sin(angle) * radius * 0.22], [Math.cos(angle) * radius * 0.65, Math.sin(angle) * radius * 0.65]]);
  }
  return paths;
}

export const mount: Mount<AsciiGearTrainProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  let layout: TrainLayout | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "under");
  const options = (): GridOptions => ({
    fontFamily: GRID_FONT,
    fontSize: trainBound(props.fontSize, 16, 14, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => {
    layout = null;
    loop?.redraw();
  });

  function prepare(): TrainLayout {
    const { cols, rows, cellWidth: cw, cellHeight: ch } = grid;
    const count = Math.round(trainBound(props.teeth, 12, 10, 18));
    const centerCount = Math.round(count * trainBound(props.ratio, 1.5, 1, 2));
    const module = 2 / count;
    const radii = [1, centerCount / count, 1];
    const bend = 0.12 + (1 - trainBound(props.spread, 0.8, 0.6, 1)) * 1.35;
    const distance = 1 + centerCount / count;
    const seed = Math.round(trainBound(props.seed, 1, 1, 99));
    const turn = (cols * cw < rows * ch * 1.15 ? Math.PI / 2 : -0.12) + (seed % 7 - 3) * 0.025;
    const positions: GearPoint[] = [[-distance * Math.cos(bend), -distance * Math.sin(bend)], [0, 0], [distance * Math.cos(bend), -distance * Math.sin(bend)]];
    const counts = [count, centerCount, count];
    const gears: TrainGear[] = [];
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    for (let i = 0; i < 3; i++) {
      const p = positions[i];
      if (!p) continue;
      const x = p[0] * Math.cos(turn) - p[1] * Math.sin(turn);
      const y = p[0] * Math.sin(turn) + p[1] * Math.cos(turn);
      const radius = radii[i] ?? 1;
      const n = counts[i] ?? count;
      const outer = radius + 0.8 * module;
      left = Math.min(left, x - outer);
      right = Math.max(right, x + outer);
      top = Math.min(top, y - outer);
      bottom = Math.max(bottom, y + outer);
      const previous = gears[i - 1];
      const direction = previous ? Math.atan2(y - previous.y, x - previous.x) : 0;
      const phase = previous ? ((previous.count + n) * direction + n * Math.PI - Math.PI - previous.count * previous.phase) / n : seed * 2.39996 + turn;
      gears.push({ x, y, radius, count: n, phase, rate: i === 1 ? -count / n : count / n, paths: trainProfile(n, module) });
    }
    const scale = Math.max(1, Math.min(Math.max(1, (cols - 6) * cw) / (right - left), Math.max(1, (rows - 6) * ch) / (bottom - top)));
    const sx = scale * 2 / cw;
    const sy = scale * 4 / ch;
    const fixed = new Uint8Array(cols * rows);
    for (const gear of gears) {
      gear.x = (cols - 1) + (gear.x - (left + right) / 2) * sx;
      gear.y = (rows - 1) * 2 + (gear.y - (top + bottom) / 2) * sy;
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2;
        const b = (i + 1) / 48 * Math.PI * 2;
        trainLine(fixed, cols, rows, gear.x + Math.cos(a) * gear.radius * 0.2 * sx, gear.y + Math.sin(a) * gear.radius * 0.2 * sy, gear.x + Math.cos(b) * gear.radius * 0.2 * sx, gear.y + Math.sin(b) * gear.radius * 0.2 * sy);
      }
      trainLine(fixed, cols, rows, gear.x - gear.radius * 0.07 * sx, gear.y, gear.x + gear.radius * 0.07 * sx, gear.y);
      trainLine(fixed, cols, rows, gear.x, gear.y - gear.radius * 0.07 * sy, gear.x, gear.y + gear.radius * 0.07 * sy);
    }
    return { cols, rows, sx, sy, gears, fixed, masks: new Uint8Array(cols * rows) };
  }

  function frame(milliseconds: number): void {
    if (!alive) return;
    if (!layout || layout.cols !== grid.cols || layout.rows !== grid.rows) layout = prepare();
    const { cols, rows, sx, sy, gears, fixed, masks } = layout;
    masks.set(fixed);
    const drive = milliseconds * 0.00016 * trainBound(props.speed, 0.75, 0, 2);
    for (const gear of gears) {
      const angle = gear.phase + drive * gear.rate;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      for (const path of gear.paths) {
        let ax = 0;
        let ay = 0;
        for (let i = 0; i < path.length; i++) {
          const p = path[i];
          if (!p) continue;
          const x = gear.x + (p[0] * cosine - p[1] * sine) * sx;
          const y = gear.y + (p[0] * sine + p[1] * cosine) * sy;
          if (i) trainLine(masks, cols, rows, ax, ay, x, y);
          ax = x;
          ay = y;
        }
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
      if (before.teeth !== props.teeth || before.ratio !== props.ratio || before.spread !== props.spread || before.seed !== props.seed) layout = null;
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
