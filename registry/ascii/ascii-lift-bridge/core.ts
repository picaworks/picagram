import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiLiftBridgeProps extends MotionProps {
  /** Maximum leaf opening angle in degrees, from 15 to 65. */
  opening: number;
  /** Percentage of each cycle used by each opening or closing stroke, from 10 to 30. */
  travel: number;
  /** Tower height relative to the full closed span, from 0.3 to 0.6. */
  towerHeight: number;
  /** Complete bridge cycle rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 20. */
  fontSize: number;
}

export const defaults: AsciiLiftBridgeProps = {
  opening: 50,
  travel: 24,
  towerHeight: 0.45,
  speed: 0.7,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

type BridgePoint = [number, number];

function bridgeBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiLiftBridgeProps> = (host, initial = {}) => {
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
    fontSize: bridgeBound(props.fontSize, 16, 14, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => { prepare(); loop?.redraw(); });
  let ink = new Uint8Array(0);
  let fixed = new Uint8Array(0);
  let unit = 1;
  let cx = 0;
  let cy = 0;
  let dx = 1;
  let dy = 1;
  let tower = 0.9;
  let maximum = 1;
  let stroke = 0.24;
  let rate = 0.7;
  let phase = 0.12;
  let pin = 0.04;

  function dot(x: number, y: number, erase = false): void {
    const px = Math.round((cx + x * unit) / dx);
    const py = Math.round((cy + y * unit) / dy);
    if (px < 0 || py < 0 || px >= grid.cols * 2 || py >= grid.rows * 4) return;
    const index = Math.floor(py / 4) * grid.cols + Math.floor(px / 2);
    const bit = brailleDot(py % 4, px % 2);
    ink[index] = erase ? (ink[index] ?? 0) & ~bit : (ink[index] ?? 0) | bit;
  }

  function line(a: BridgePoint, b: BridgePoint, heavy = false): void {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]) * unit / dx, Math.abs(b[1] - a[1]) * unit / dy) * 1.5));
    for (let i = 0; i <= steps; i++) {
      const x = a[0] + (b[0] - a[0]) * i / steps;
      const y = a[1] + (b[1] - a[1]) * i / steps;
      dot(x, y);
      if (heavy) dot(x, y + dy / unit);
    }
  }

  function prepare(): void {
    maximum = bridgeBound(props.opening, 50, 15, 65) * Math.PI / 180;
    stroke = bridgeBound(props.travel, 24, 10, 30) / 100;
    tower = bridgeBound(props.towerHeight, 0.45, 0.3, 0.6) * 2;
    rate = bridgeBound(props.speed, 0.7, 0, 2);
    phase = 0.12 + (Math.round(bridgeBound(props.seed, 1, 1, 99)) - 1) * 0.137;
    dx = grid.cellWidth / 2;
    dy = grid.cellHeight / 4;
    const top = -Math.max(tower + 0.12, Math.sin(maximum) + 0.08);
    const inset = Math.max(7, grid.cellWidth * 0.65);
    const width = Math.max(1, (grid.cols - 4) * grid.cellWidth - inset * 2);
    const height = Math.max(1, (grid.rows - 4) * grid.cellHeight - inset * 2);
    unit = Math.min(width / 3.18, height / (0.91 - top));
    pin = inset / unit;
    cx = grid.cols * grid.cellWidth / 2;
    cy = grid.rows * grid.cellHeight / 2 - (top + 0.91) * unit / 2;
    ink = new Uint8Array(grid.cols * grid.rows);
    for (const side of [-1, 1]) {
      const outer = side * 1.52;
      const hinge = side;
      const a = side * 1.29;
      const b = side * 1.09;
      line([outer, 0], [hinge, 0], true);
      line([outer, 0.09], [hinge, 0.09]);
      for (let i = 0; i < 3; i++) {
        const x = outer + (hinge - outer) * i / 3;
        const next = outer + (hinge - outer) * (i + 1) / 3;
        line([x, 0.09], [next, 0]);
      }
      line([a, 0.35], [a, -tower]);
      line([b, 0.35], [b, -tower]);
      line([a, -tower], [b, -tower], true);
      const panels = 4;
      for (let i = 0; i < panels; i++) {
        const y = 0.35 - (tower + 0.35) * i / panels;
        const next = 0.35 - (tower + 0.35) * (i + 1) / panels;
        line([a, y], [b, next]);
        line([b, y], [a, next]);
      }
      line([side * 1.49, 0.35], [side * 0.94, 0.35], true);
      line([side * 1.49, 0.41], [side * 0.94, 0.41]);
    }
    line([-0.66, 0.64], [-0.12, 0.64]);
    line([0.17, 0.74], [0.68, 0.74]);
    line([-0.22, 0.88], [0.26, 0.88]);
    fixed = ink.slice();
  }

  function bearing(x: number): void {
    for (let y = -pin; y <= pin; y += dy / unit / 2) {
      for (let u = -pin; u <= pin; u += dx / unit / 2) {
        if (u * u + y * y < pin * pin * 0.5) dot(x + u, y, true);
      }
    }
    for (let i = 0; i < 32; i++) {
      const angle = i * Math.PI / 16;
      dot(x + Math.cos(angle) * pin, Math.sin(angle) * pin);
    }
    dot(x, 0);
  }

  function frame(milliseconds: number): void {
    if (!alive) return;
    ink.set(fixed);
    const t = ((phase + milliseconds * rate / 16000) % 1 + 1) % 1;
    const smooth = (value: number): number => value * value * (3 - 2 * value);
    const fraction = t < stroke ? smooth(t / stroke) : t < 0.5 ? 1 : t < 0.5 + stroke ? 1 - smooth((t - 0.5) / stroke) : 0;
    const angle = maximum * fraction;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    for (const side of [-1, 1]) {
      // Local deck coordinates rotate rigidly about the unchanged hinge at (side, 0).
      const deck = (along: number, below: number): BridgePoint => [
        side * (1 - along * cosine - below * sine),
        -along * sine + below * cosine,
      ];
      line(deck(0, 0), deck(1, 0), true);
      line(deck(0, 0.09), deck(1, 0.09));
      for (let i = 0; i <= 5; i++) {
        const u = i / 5;
        line(deck(u, 0), deck(u, 0.09));
        if (i < 5) line(deck(u, 0.09), deck((i + 1) / 5, 0));
      }
      line([side * 1.19, -tower], deck(0.74, 0));
      line([side * 1.19, -tower + 0.08], deck(0.45, 0));
      bearing(side);
    }
    grid.clear();
    for (let i = 0; i < ink.length; i++) {
      const mask = ink[i] ?? 0;
      if (mask) grid.set(i % grid.cols, Math.floor(i / grid.cols), braille(mask));
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  prepare();
  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.fontSize !== props.fontSize) grid.update(options());
      else prepare();
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
