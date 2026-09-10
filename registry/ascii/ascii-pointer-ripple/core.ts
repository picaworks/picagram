import { labelHost, unlabelHost } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { createLoop } from "../../../lib/loop";
import { createNoise } from "../../../lib/noise";
import { createRng } from "../../../lib/rng";
import { FALLBACK_RAMP, measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiPointerRippleProps extends MotionProps {
  /** How many cells per second a ripple's ring moves outward. */
  growth: number;
  /** How wide a ripple's ring is, in cells. */
  width: number;
  /** Seconds a ripple takes to expand and fade away completely. */
  lifetime: number;
  /** Ink a fresh ripple's ring adds at its peak, 0 to 1. */
  strength: number;
  /** Ink of the resting field with no ripples on it, 0 to 0.4. */
  base: number;
  /** Glyphs to draw with, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** Glyph size in CSS pixels. */
  fontSize: number;
  /** CSS font-family stack for the glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: AsciiPointerRippleProps = {
  growth: 18,
  width: 2.5,
  lifetime: 1.6,
  strength: 0.8,
  base: 0.12,
  glyphs: FALLBACK_RAMP,
  fontSize: 12,
  fontFamily: GRID_FONT,
  lineHeight: 1.2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** One expanding ring, in fractional grid-cell coordinates. */
interface Ripple {
  x: number;
  y: number;
  /** Animation time, in milliseconds, when this ripple was spawned. */
  spawnMs: number;
}

/** Milliseconds a moving or tapping pointer must wait before it may spawn another ripple. */
const SPAWN_INTERVAL_MS = 80;
/** Ripples alive at once. A new one past this evicts the oldest. */
const MAX_RIPPLES = 12;
/** Ages, as a fraction of `lifetime`, the three synthetic ripples sit at when `time` is fixed. */
const SYNTHETIC_AGE_FRACTIONS = [0.18, 0.46, 0.78];
/** Cells per noise cycle in the resting field's coarse layer. */
const NOISE_SCALE = 0.22;
/** The fine layer runs at this many times the coarse frequency, to break blobs into grain. */
const NOISE_DETAIL = 4.2;
/** How fast the resting field drifts, in noise units per millisecond. */
const DRIFT_PER_MS = 0.00015;
/** The frame shown under reduced motion: the resting field, with no ripples on it. */
const STILL_MS = 0;

export const mount: Mount<AsciiPointerRippleProps> = (host, initial = {}) => {
  let props: AsciiPointerRippleProps = { ...defaults, ...initial };
  let noise = createNoise(props.seed);
  const ripples: Ripple[] = [];
  let ink = new Float32Array(0);
  let clock = 0;
  let lastSpawnMs = -Infinity;

  function gridOptions(p: AsciiPointerRippleProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  /** Three rings placed by `seed` alone, so a fixed `time` always draws the same capture. */
  function syntheticRipples(p: AsciiPointerRippleProps, cols: number, rows: number, atMs: number): Ripple[] {
    const rng = createRng(p.seed);
    return SYNTHETIC_AGE_FRACTIONS.map((fraction) => {
      const x = (0.15 + rng() * 0.7) * cols;
      const y = (0.15 + rng() * 0.7) * rows;
      return { x, y, spawnMs: atMs - fraction * p.lifetime * 1000 };
    });
  }

  function draw(t: number, reduced: boolean): void {
    clock = t;
    const { cols, rows, aspect } = grid;
    const total = cols * rows;
    if (ink.length !== total) ink = new Float32Array(total);
    const z = t * DRIFT_PER_MS;
    for (let y = 0; y < rows; y++) {
      const ny = y * NOISE_SCALE;
      for (let x = 0; x < cols; x++) {
        const nx = x * aspect * NOISE_SCALE;
        const coarse = noise.noise3(nx, ny, z);
        const grain = noise.noise3(nx * NOISE_DETAIL + 31, ny * NOISE_DETAIL + 31, z);
        const lit = 0.5 + 0.5 * (coarse * 0.55 + grain * 0.45);
        ink[y * cols + x] = props.base * lit;
      }
    }
    let active: Ripple[];
    if (props.time !== null) active = syntheticRipples(props, cols, rows, t);
    else if (reduced) active = [];
    else active = ripples;
    for (const r of active) {
      const age = (t - r.spawnMs) / 1000;
      if (age < 0 || age > props.lifetime) continue;
      const fade = 1 - age / props.lifetime;
      const amp = props.strength * fade;
      if (amp <= 0.002) continue;
      const radius = props.growth * age;
      const reachY = radius + props.width * 3;
      const reachX = reachY / aspect;
      const minY = Math.max(0, Math.floor(r.y - reachY));
      const maxY = Math.min(rows - 1, Math.ceil(r.y + reachY));
      const minX = Math.max(0, Math.floor(r.x - reachX));
      const maxX = Math.min(cols - 1, Math.ceil(r.x + reachX));
      for (let y = minY; y <= maxY; y++) {
        const dy = y - r.y;
        const row = y * cols;
        for (let x = minX; x <= maxX; x++) {
          const dx = (x - r.x) * aspect;
          const d = Math.sqrt(dx * dx + dy * dy) - radius;
          const i = row + x;
          ink[i] = (ink[i] ?? 0) + amp * Math.exp(-(d * d) / (props.width * props.width));
        }
      }
    }
    const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        grid.set(x, y, pick(ramp, ink[y * cols + x] ?? 0));
      }
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  function onLayout(): void {
    loop.redraw();
  }

  function spawn(clientX: number, clientY: number): void {
    if (props.paused || props.time !== null || loop.reduced) return;
    if (clock - lastSpawnMs < SPAWN_INTERVAL_MS) return;
    const rect = host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    lastSpawnMs = clock;
    const x = Math.floor((clientX - rect.left) / grid.cellWidth);
    const y = Math.floor((clientY - rect.top) / grid.cellHeight);
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    ripples.push({ x, y, spawnMs: clock });
  }

  function onPointerMove(e: PointerEvent): void {
    spawn(e.clientX, e.clientY);
  }

  function onPointerDown(e: PointerEvent): void {
    spawn(e.clientX, e.clientY);
  }

  const grid = createGrid(host, gridOptions(props), onLayout);
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_MS, frame: draw });

  labelHost(host, "");
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerdown", onPointerDown);

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.seed !== before.seed) noise = createNoise(props.seed);
      if (props.fontFamily !== before.fontFamily || props.fontSize !== before.fontSize || props.lineHeight !== before.lineHeight) {
        grid.update(gridOptions(props));
      }
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerdown", onPointerDown);
      loop.destroy();
      grid.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
