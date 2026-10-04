import { createGrid } from "../../../lib/glyph-grid";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PendulumChainProps extends MotionProps {
  /** Number of linked pendulums, from 2 to 16. */
  count: number;
  /** Strength of the neighbor springs; zero isolates each pendulum. */
  coupling: number;
  /** Maximum swing as a fraction of each fixed cell's width, from 0 to 1. */
  amplitude: number;
  /** Natural period of an isolated pendulum, in seconds. */
  period: number;
  /** Accessible name; an empty name hides the drawing from assistive technology. */
  label: string;
}

export const defaults: PendulumChainProps = {
  count: 7,
  coupling: 0.65,
  amplitude: 0.8,
  period: 7,
  label: "A chain of coupled pendulums transferring motion between neighbors",
  paused: false,
  time: null,
  seed: 1,
};

const pendulumClamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));

export const mount: Mount<PendulumChainProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let clock = 0;
  let modeWeights: number[] = [];
  let modeShapes: number[][] = [];
  const attrs = hostAttributes(host);
  const count = (): number => Math.round(pendulumClamp(Number.isFinite(props.count) ? props.count : defaults.count, 2, 16));

  function label(): void {
    attrs.set("role", props.label ? "img" : null);
    attrs.set("aria-label", props.label || null);
    attrs.set("aria-hidden", props.label ? null : "true");
  }

  // Exact normal modes of the free-end chain: q'' = -w²(I + coupling L)q.
  // A seeded displacement starts at the first pendulum. Neighbor springs split
  // the mode frequencies, whose interference transfers energy along the row.
  // With coupling zero all frequencies match and no transfer occurs.
  function buildModes(): void {
    const n = count();
    const random = createRng(props.seed);
    const displacement = Array.from({ length: n }, (_, i) => Math.exp(-i * 1.3) * (0.92 + random() * 0.08));
    const first = displacement[0] ?? 1;
    modeShapes = Array.from({ length: n }, (_, k) => Array.from({ length: n }, (_, i) =>
      Math.sqrt((k === 0 ? 1 : 2) / n) * Math.cos(Math.PI * k * (i + 0.5) / n),
    ));
    modeWeights = modeShapes.map((shape) => shape.reduce((total, value, i) => total + value * (displacement[i] ?? 0) / first, 0));
  }

  function position(i: number, seconds: number): number {
    const n = count();
    const natural = 2 * Math.PI / pendulumClamp(props.period, 2, 30);
    const coupling = pendulumClamp(props.coupling, 0, 2);
    let value = 0;
    for (let k = 0; k < n; k++) {
      const eigenvalue = 2 - 2 * Math.cos(Math.PI * k / n);
      const frequency = natural * Math.sqrt(1 + coupling * eigenvalue);
      value += (modeWeights[k] ?? 0) * (modeShapes[k]?.[i] ?? 0) * Math.cos(frequency * seconds);
    }
    return value;
  }

  label();
  buildModes();
  const palette = watchPalette(host, () => draw(clock));
  const grid = createGrid(host, {
    fontFamily: GRID_FONT,
    fontSize: Number.parseFloat(getComputedStyle(host).fontSize) || 14,
    columns: count() * 9 + 3,
    lineHeight: 1.1,
    renderer: "canvas",
    color: "",
  }, () => draw(clock));

  function draw(t: number): void {
    if (!alive) return;
    clock = t;
    grid.clear();
    const colors = palette.colors;
    const n = count();
    const cell = (grid.cols - 2) / n;
    const depth = Math.max(1, Math.min(7, grid.rows - 6));
    const top = Math.max(0, Math.floor((grid.rows - depth - 5) / 2));
    const amplitude = pendulumClamp(props.amplitude, 0, 1);
    const seconds = t / 1000;

    function bob(i: number, at: number): { x: number; y: number; pivot: number } {
      const pivot = Math.round(1 + cell * (i + 0.5));
      const displacement = position(i, at) * amplitude;
      const shift = displacement * Math.max(1, cell * 0.35);
      const angle = Math.atan2(shift * grid.aspect, depth);
      return { pivot, x: Math.round(pivot + shift), y: top + 1 + Math.round(depth * Math.cos(angle)) };
    }

    for (let i = 0; i < n; i++) {
      const point = bob(i, seconds);
      if (i < n - 1) {
        const nextPivot = Math.round(1 + cell * (i + 1.5));
        for (let x = point.pivot + 1; x < nextPivot; x++) grid.set(x, top, x % 3 === 0 ? "~" : "-", colors.muted);
      }
      // Recent bob positions describe a swing without moving the fixed cell.
      for (let trail = 4; trail >= 1; trail--) {
        const past = bob(i, seconds - trail * 0.2);
        grid.set(past.x, past.y, ".", colors.muted);
      }
      const steps = Math.max(1, point.y - top - 1);
      for (let step = 1; step <= steps; step++) {
        const x = Math.round(point.pivot + (point.x - point.pivot) * step / (steps + 1));
        const y = top + step;
        grid.set(x, y, point.x === point.pivot ? "│" : point.x < point.pivot ? "/" : "\\", colors.fg);
      }
      grid.set(point.pivot, top, "+", colors.fg);
      grid.set(point.x, point.y, i === 0 ? "●" : "o", i === 0 ? colors.accent : colors.fg);
      grid.write(point.pivot - 1, top + depth + 3, String(i + 1).padStart(2, "0"), colors.muted);
    }
    grid.flush();
    attrs.set("data-pica-ready", "true");
  }

  const loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 4200, frame: draw });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (props.label !== before.label) label();
      if (props.count !== before.count || props.seed !== before.seed) buildModes();
      if (props.count !== before.count) grid.update({ columns: count() * 9 + 3 });
      palette.refresh();
      loop.update({ paused: props.paused, time: props.time });
      loop.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop.destroy();
      grid.destroy();
      palette.destroy();
      attrs.restore();
    },
  };
};
