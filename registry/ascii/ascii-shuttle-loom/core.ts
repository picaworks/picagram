import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiShuttleLoomProps extends MotionProps {
  /** Evenly spaced warp threads inside the frame, from 10 to 22. */
  threads: number;
  /** Woven strip height relative to the working frame, from 0.25 to 0.55. */
  cloth: number;
  /** Raised shed depth relative to the working frame, from 0.1 to 0.3. */
  shed: number;
  /** Shuttle and cloth feed rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 20. */
  fontSize: number;
}

export const defaults: AsciiShuttleLoomProps = {
  threads: 16,
  cloth: 0.35,
  shed: 0.2,
  speed: 0.75,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

type LoomPoint = [number, number];

function loomBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiShuttleLoomProps> = (host, initial = {}) => {
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
    fontSize: loomBound(props.fontSize, 16, 14, 20),
    columns: 0,
    lineHeight: 1.2,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => { rebuild(); loop?.redraw(); });
  let cols = 1;
  let rows = 1;
  let left = 0;
  let right = 1;
  let warpTop = 0;
  let clothTop = 0;
  let clothBottom = 1;
  let gap = 1;
  let shuttleLength = 1;
  let warp: number[] = [];
  let ink = new Uint8Array(0);
  let frameInk = new Uint8Array(0);

  function dot(x: number, y: number, on = true): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= cols * 2 || y >= rows * 4) return;
    const index = Math.floor(y / 4) * cols + Math.floor(x / 2);
    const bit = brailleDot(y % 4, x % 2);
    ink[index] = on ? (ink[index] ?? 0) | bit : (ink[index] ?? 0) & ~bit;
  }

  function line(a: LoomPoint, b: LoomPoint, faint = false): void {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 1.3));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(a[0] + (b[0] - a[0]) * t);
      const y = Math.round(a[1] + (b[1] - a[1]) * t);
      if (!faint || (x + y) % 2 === 0) dot(x, y);
    }
  }

  function rebuild(): void {
    cols = grid.cols;
    rows = grid.rows;
    const dx = grid.cellWidth / 2;
    const dy = grid.cellHeight / 4;
    const availableW = Math.max(1, cols - 7) * grid.cellWidth;
    const availableH = Math.max(1, rows - 7) * grid.cellHeight;
    const width = Math.min(availableW, availableH * 0.85);
    const height = Math.min(availableH, width * 1.3);
    const x0 = (cols * 2 - width / dx) / 2;
    const x1 = x0 + width / dx;
    const y0 = (rows * 4 - height / dy) / 2;
    const y1 = y0 + height / dy;
    left = x0 + 3;
    right = x1 - 3;
    warpTop = y0 + 3;
    clothBottom = y1 - 3;
    const working = clothBottom - warpTop;
    clothTop = clothBottom - working * loomBound(props.cloth, 0.35, 0.25, 0.55);
    gap = Math.max(5, working * loomBound(props.shed, 0.2, 0.1, 0.3));
    shuttleLength = Math.max(7, Math.min(12, (right - left) * 0.23));
    const count = Math.round(loomBound(props.threads, 16, 10, 22));
    warp = Array.from({ length: count }, (_, i) => left + i / (count - 1) * (right - left));
    ink = new Uint8Array(cols * rows);
    for (const x of [x0, x0 + 1, x1 - 1, x1]) line([x, y0], [x, y1]);
    for (const y of [y0, y0 + 1, y1 - 1, y1]) line([x0, y], [x1, y]);
    line([x0 - 2, y1 + 1], [x0 + 3, y1 + 1]);
    line([x1 - 3, y1 + 1], [x1 + 2, y1 + 1]);
    frameInk = ink.slice();
  }

  function bank(which: number, lift: number, faint: boolean): void {
    const y = clothTop - gap * (0.25 + lift * 0.75);
    for (let i = which; i < warp.length; i += 2) {
      const x = warp[i];
      if (x === undefined) continue;
      const heddleX = x + (which === 0 ? -0.65 : 0.65);
      line([x, warpTop], [heddleX, y], faint);
      line([heddleX, y], [x, clothTop], faint);
      dot(heddleX - 0.7, y);
      dot(heddleX + 0.7, y);
    }
    line([left - 1, y], [right + 1, y], faint);
  }

  function shuttle(x: number, y: number): void {
    const half = shuttleLength / 2;
    const tall = Math.min(1.7, gap * 0.21);
    for (let py = Math.floor(y - tall); py <= Math.ceil(y + tall); py++) {
      for (let px = Math.floor(x - half); px <= Math.ceil(x + half); px++) {
        const nx = Math.abs(px - x) / half;
        const ny = Math.abs(py - y) / tall;
        if (ny > 1 || nx > 1 - ny * 0.26) continue;
        const rim = ny > 0.52 || nx > 0.65;
        const spool = Math.abs(px - x) < half * 0.28 && ny < 0.55;
        dot(px, py, rim || spool);
      }
    }
  }

  function frame(milliseconds: number): void {
    if (!alive) return;
    const seed = Math.round(loomBound(props.seed, 1, 1, 99));
    const speed = loomBound(props.speed, 0.75, 0, 2);
    const phase = milliseconds * 0.00032 * speed + (seed - 1) * 0.17;
    const lift = (Math.cos(phase) + 1) / 2;
    const near = lift >= 0.5 ? 0 : 1;
    const position = Math.sin(phase);
    const x = (left + right) / 2 + position * Math.max(0, (right - left - shuttleLength) / 2 - 1);
    const y = clothTop - gap * 0.6;
    ink.set(frameInk);
    bank(1 - near, near === 0 ? 1 - lift : lift, true);
    // Weft rows feed through a two row repeat, so the bounded strip never resets.
    const feed = (milliseconds * 0.0018 * speed + seed * 0.43) % 4;
    for (const thread of warp) line([thread, clothTop], [thread, clothBottom]);
    for (let row = -2; row < (clothBottom - clothTop) / 2 + 1; row++) {
      const py = clothTop + row * 2 + feed;
      if (py >= clothTop && py <= clothBottom) line([left, py], [right, py]);
    }
    line([left, clothTop], [right, clothTop]);
    const selvedge = Math.cos(phase) >= 0 ? left : right;
    line([selvedge, clothTop], [x - Math.sign(Math.cos(phase)) * shuttleLength / 2, y]);
    shuttle(x, y);
    bank(near, near === 0 ? lift : 1 - lift, false);
    grid.clear();
    for (let i = 0; i < ink.length; i++) {
      const mask = ink[i] ?? 0;
      if (mask) grid.set(i % cols, Math.floor(i / cols), braille(mask));
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  rebuild();
  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.fontSize !== props.fontSize) grid.update(options());
      else if (before.threads !== props.threads || before.cloth !== props.cloth || before.shed !== props.shed) rebuild();
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
