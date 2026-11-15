import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiCamFollowerProps extends MotionProps {
  /** Radial lift amplitude of the cam, from 0.15 to 0.4. */
  eccentricity: number;
  /** Lift lobes on each full cam revolution, from 1 to 3. */
  lobes: number;
  /** Visible turns in the connected return spring, from 5 to 9. */
  springTurns: number;
  /** Cam rotation rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 20. */
  fontSize: number;
}

export const defaults: AsciiCamFollowerProps = {
  eccentricity: 0.25,
  lobes: 1,
  springTurns: 7,
  speed: 0.7,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

type FollowerPoint = [number, number];
type FollowerLayout = { cols: number; rows: number; sx: number; sy: number; ox: number; oy: number; contour: FollowerPoint[]; circle: FollowerPoint[]; spring: FollowerPoint[]; fixed: Uint8Array; masks: Uint8Array };

function followerBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

function followerDot(masks: Uint8Array, cols: number, rows: number, x: number, y: number): void {
  const dx = Math.round(x);
  const dy = Math.round(y);
  if (dx < 0 || dy < 0 || dx >= cols * 2 || dy >= rows * 4) return;
  const index = Math.floor(dy / 4) * cols + Math.floor(dx / 2);
  masks[index] = (masks[index] ?? 0) | brailleDot(dy % 4, dx % 2);
}

function followerLine(masks: Uint8Array, cols: number, rows: number, ax: number, ay: number, bx: number, by: number): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 1.4));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    followerDot(masks, cols, rows, ax + (bx - ax) * t, ay + (by - ay) * t);
  }
}

function followerProfile(angle: number, eccentricity: number, lobes: number): FollowerPoint {
  const radius = 1.35 + eccentricity * Math.cos(lobes * angle);
  const derivative = -eccentricity * lobes * Math.sin(lobes * angle);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const length = Math.hypot(radius, derivative);
  return [radius * cosine - 0.18 * (radius * cosine + derivative * sine) / length, radius * sine - 0.18 * (radius * sine - derivative * cosine) / length];
}

export const mount: Mount<AsciiCamFollowerProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  let layout: FollowerLayout | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "under");
  const options = (): GridOptions => ({
    fontFamily: GRID_FONT,
    fontSize: followerBound(props.fontSize, 16, 14, 20),
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

  function prepare(): FollowerLayout {
    const { cols, rows, cellWidth: cw, cellHeight: ch } = grid;
    const eccentricity = followerBound(props.eccentricity, 0.25, 0.15, 0.4);
    const lobes = Math.round(followerBound(props.lobes, 1, 1, 3));
    const upper = -(1.35 + eccentricity + 0.18 + 2.3);
    const scale = Math.max(1, Math.min(Math.max(1, (cols - 6) * cw) / 4.45, Math.max(1, (rows - 6) * ch) / (2.05 - upper)));
    const sx = scale * 2 / cw;
    const sy = scale * 4 / ch;
    const ox = cols - 1 - 0.225 * sx;
    const oy = (rows - 1) * 2 - (upper + 2.05) / 2 * sy;
    const fixed = new Uint8Array(cols * rows);
    const line = (ax: number, ay: number, bx: number, by: number): void => {
      followerLine(fixed, cols, rows, ox + ax * sx, oy + ay * sy, ox + bx * sx, oy + by * sy);
    };
    const circle: FollowerPoint[] = [];
    const contour: FollowerPoint[] = [];
    for (let i = 0; i <= 80; i++) {
      const angle = i / 80 * Math.PI * 2;
      circle.push([Math.cos(angle), Math.sin(angle)]);
    }
    for (let i = 0; i <= 256; i++) contour.push(followerProfile(i / 256 * Math.PI * 2, eccentricity, lobes));
    line(-2, 1.95, 2.45, 1.95);
    line(-2, 2.05, 2.45, 2.05);
    line(-2, 1.95, -2, 2.05);
    line(2.45, 1.95, 2.45, 2.05);
    line(2.1, -3.1, 2.1, 1.95);
    line(2.22, -3.1, 2.22, 1.95);
    line(0.28, -3.1, 2.22, -3.1);
    line(-0.28, -3.24, 0.28, -3.24);
    line(-0.28, -2.96, 0.28, -2.96);
    line(-0.28, -3.24, -0.28, -2.96);
    line(0.28, -3.24, 0.28, -2.96);
    line(-0.1, -3.24, -0.1, -2.96);
    line(0.1, -3.24, 0.1, -2.96);
    line(-0.12, 0.2, -0.12, 1.95);
    line(0.12, 0.2, 0.12, 1.95);
    for (let i = 1; i < circle.length; i++) {
      const a = circle[i - 1];
      const b = circle[i];
      if (a && b) line(a[0] * 0.2, a[1] * 0.2, b[0] * 0.2, b[1] * 0.2);
    }
    line(-0.07, 0, 0.07, 0);
    line(0, -0.07, 0, 0.07);
    const turns = Math.round(followerBound(props.springTurns, 7, 5, 9));
    const spring: FollowerPoint[] = [[0, 0]];
    for (let i = 1; i <= turns * 2; i++) spring.push([i % 2 ? 0.29 : -0.29, i / (turns * 2 + 1)]);
    spring.push([0, 1]);
    return { cols, rows, sx, sy, ox, oy, circle, contour, spring, fixed, masks: new Uint8Array(cols * rows) };
  }

  function frame(milliseconds: number): void {
    if (!alive) return;
    if (!layout || layout.cols !== grid.cols || layout.rows !== grid.rows) layout = prepare();
    const { cols, rows, sx, sy, ox, oy, circle, contour, spring, fixed, masks } = layout;
    masks.set(fixed);
    const line = (ax: number, ay: number, bx: number, by: number): void => {
      followerLine(masks, cols, rows, ox + ax * sx, oy + ay * sy, ox + bx * sx, oy + by * sy);
    };
    const seed = Math.round(followerBound(props.seed, 1, 1, 99));
    const phase = seed * 2.39996 + milliseconds * 0.00023 * followerBound(props.speed, 0.7, 0, 2);
    const cosine = Math.cos(phase);
    const sine = Math.sin(phase);
    let ax = 0;
    let ay = 0;
    for (let i = 0; i < contour.length; i++) {
      const p = contour[i];
      if (!p) continue;
      const x = p[0] * cosine - p[1] * sine;
      const y = p[0] * sine + p[1] * cosine;
      if (i) line(ax, ay, x, y);
      ax = x;
      ay = y;
    }
    for (const angle of [0, Math.PI * 0.75]) {
      const p = followerProfile(angle, followerBound(props.eccentricity, 0.25, 0.15, 0.4), Math.round(followerBound(props.lobes, 1, 1, 3)));
      const x = p[0] * cosine - p[1] * sine;
      const y = p[0] * sine + p[1] * cosine;
      const length = Math.hypot(x, y);
      line(x / length * 0.22, y / length * 0.22, x * 0.74, y * 0.74);
    }
    const eccentricity = followerBound(props.eccentricity, 0.25, 0.15, 0.4);
    const lobes = Math.round(followerBound(props.lobes, 1, 1, 3));
    const rollerY = -(1.35 + eccentricity * Math.cos(lobes * (-Math.PI / 2 - phase)));
    for (let i = 1; i < circle.length; i++) {
      const a = circle[i - 1];
      const b = circle[i];
      if (a && b) line(a[0] * 0.18, rollerY + a[1] * 0.18, b[0] * 0.18, rollerY + b[1] * 0.18);
    }
    line(-0.06, rollerY, 0.06, rollerY);
    line(0, rollerY - 0.06, 0, rollerY + 0.06);
    const collar = rollerY - 0.38;
    const head = rollerY - 2.38;
    line(-0.035, head, -0.035, rollerY - 0.18);
    line(0.035, head, 0.035, rollerY - 0.18);
    line(-0.17, head, 0.17, head);
    line(-0.38, collar, 0.38, collar);
    line(-0.38, collar + 0.05, 0.38, collar + 0.05);
    for (let i = 1; i < spring.length; i++) {
      const a = spring[i - 1];
      const b = spring[i];
      if (a && b) line(a[0], -2.96 + (collar + 2.96) * a[1], b[0], -2.96 + (collar + 2.96) * b[1]);
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
      if (before.eccentricity !== props.eccentricity || before.lobes !== props.lobes || before.springTurns !== props.springTurns) layout = null;
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
