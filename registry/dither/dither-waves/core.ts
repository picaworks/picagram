import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { blueNoiseMatrix, clusterMatrix, ditherLevels } from "../../../lib/dither-mask";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface DitherWavesProps extends MotionProps {
  /** Number of overlapping wave trains, from two to four. */
  trains: number;
  /** Wavelength of each wave train, in computed pixels. */
  period: number;
  /** Degrees of angle from one wave train to the next. */
  spread: number;
  /** Angle of the first wave train, in degrees. */
  angle: number;
  /** Ink levels the interference is screened into, from two to four. */
  levels: number;
  /** Ordered mask that screens the interference: an even blue noise scatter, or a clustered dot screen. */
  mask: "blue" | "cluster";
  /** CSS pixels each computed pixel covers. */
  pixel: number;
  /** How fast the wave trains drift. 0 holds them still. */
  speed: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: DitherWavesProps = {
  trains: 3,
  period: 34,
  spread: 27,
  angle: 0,
  levels: 2,
  mask: "cluster",
  pixel: 2,
  speed: 0.12,
  fps: 15,
  paused: false,
  time: null,
  seed: 1,
};

/** Animation time shown under reduced motion, and what captures use, in milliseconds. */
const STILL_TIME = 1200;
/** Most wave trains a lattice carries. */
const MAX_TRAINS = 4;
/** Cells on a side of the blue noise mask: fine enough to scatter evenly, cheap enough to build once. */
const BLUE_SIZE = 32;
/** Cells on a side of the clustered dot screen. */
const CLUSTER_SIZE = 8;
/** Radians a train's phase turns per second, at speed 1. */
const BASE_RATE = 0.4;
/** Per-train multiple of BASE_RATE. No pair shares a simple ratio, so the trains drift in and out of step with
 *  one another and the whole lattice never returns to a frame it already showed. */
const TRAIN_RATE: readonly number[] = [0.37, 0.53, 0.29, 0.61];

/** The mask and its tile size for one setting of the `mask` prop. Both matrices are built once and cached by
 *  lib/dither-mask.ts, so asking again each frame costs nothing. */
function maskFor(kind: DitherWavesProps["mask"]): { mask: Float32Array; size: number } {
  return kind === "blue" ? { mask: blueNoiseMatrix(BLUE_SIZE), size: BLUE_SIZE } : { mask: clusterMatrix(CLUSTER_SIZE), size: CLUSTER_SIZE };
}

/** Each train's starting phase, from the seed, so the same seed always begins the same way. */
function seedPhases(seed: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length: MAX_TRAINS }, () => rng() * Math.PI * 2);
}

export const mount: Mount<DitherWavesProps> = (host, initial = {}) => {
  let props: DitherWavesProps = { ...defaults, ...initial };
  let cols = 1;
  let rows = 1;
  let imageData: ImageData | null = null;
  // Column and row tables, one train's worth at a time, flattened as train * length + index. Rebuilt in
  // layout() whenever the grid resizes, then refilled every frame in draw().
  let colCos = new Float32Array(0);
  let colSin = new Float32Array(0);
  let rowCos = new Float32Array(0);
  let rowSin = new Float32Array(0);
  let field = new Float32Array(0);
  let inkR = 0;
  let inkG = 0;
  let inkB = 0;
  let inkA = 255;
  let cachedSeed = props.seed;
  let phase0 = seedPhases(props.seed);

  const surface = createCanvas(host, {
    autoSize: false,
    css: "image-rendering:pixelated",
    onResize: () => {
      if (layout()) loop.redraw();
    },
  });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");

  function syncInk(): void {
    const [r, g, b, a] = parseColor(palette.colors.fg);
    inkR = r;
    inkG = g;
    inkB = b;
    inkA = a;
  }

  const palette = watchPalette(host, () => {
    syncInk();
    loop.redraw();
  });
  syncInk();

  /** Recomputes the low-resolution grid from the host and `pixel`, and its buffers with it. Returns true
   *  when the size actually changed. */
  function layout(): boolean {
    const pixelSize = Math.max(1, props.pixel);
    const w = Math.max(1, Math.round(surface.cssWidth / pixelSize));
    const h = Math.max(1, Math.round(surface.cssHeight / pixelSize));
    if (w === cols && h === rows && imageData) return false;
    cols = w;
    rows = h;
    canvas.width = cols;
    canvas.height = rows;
    imageData = ctx ? ctx.createImageData(cols, rows) : null;
    colCos = new Float32Array(MAX_TRAINS * cols);
    colSin = new Float32Array(MAX_TRAINS * cols);
    rowCos = new Float32Array(MAX_TRAINS * rows);
    rowSin = new Float32Array(MAX_TRAINS * rows);
    field = new Float32Array(cols * rows);
    return true;
  }

  function draw(t: number): void {
    const context = ctx;
    const data = imageData;
    if (!context || !data) {
      host.dataset.picaReady = "true";
      return;
    }
    if (props.seed !== cachedSeed) {
      cachedSeed = props.seed;
      phase0 = seedPhases(cachedSeed);
    }
    const trainCount = Math.max(2, Math.min(MAX_TRAINS, Math.round(props.trains)));
    // In computed pixels, not CSS ones, so the wave's own shape holds steady while `pixel` only changes how
    // coarsely it is sampled. That also keeps the period well clear of the pixel scale at every setting,
    // since the smallest allowed period is still many cells wide.
    const periodCells = Math.max(1, props.period);
    const k = (2 * Math.PI) / periodCells;
    const angleBase = (props.angle * Math.PI) / 180;
    const spreadRad = (props.spread * Math.PI) / 180;
    const timeS = t * 0.001 * props.speed;

    // Each train's phase varies along one axis only, so its column table (x only) and row table (y only,
    // carrying the time drift) are all a frame needs: cos(a + b) = cos(a)cos(b) - sin(a)sin(b) turns every
    // pixel's wave into one lookup from each table, never a fresh trig call.
    for (let i = 0; i < trainCount; i++) {
      const theta = angleBase + i * spreadRad;
      const kx = k * Math.cos(theta);
      const ky = k * Math.sin(theta);
      const phase = (phase0[i] ?? 0) + timeS * BASE_RATE * (TRAIN_RATE[i] ?? 1);
      const colBase = i * cols;
      for (let x = 0; x < cols; x++) {
        const a = kx * x;
        colCos[colBase + x] = Math.cos(a);
        colSin[colBase + x] = Math.sin(a);
      }
      const rowBase = i * rows;
      for (let y = 0; y < rows; y++) {
        const b = ky * y + phase;
        rowCos[rowBase + y] = Math.cos(b);
        rowSin[rowBase + y] = Math.sin(b);
      }
    }

    let idx = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let sum = 0;
        for (let i = 0; i < trainCount; i++) {
          const cc = colCos[i * cols + x] ?? 0;
          const cs = colSin[i * cols + x] ?? 0;
          const rc = rowCos[i * rows + y] ?? 0;
          const rs = rowSin[i * rows + y] ?? 0;
          sum += cc * rc - cs * rs;
        }
        // Crests coincide at 1 (full ink); trains cancel at 0 (bare ground).
        field[idx] = (sum / trainCount) * 0.5 + 0.5;
        idx++;
      }
    }

    const { mask, size } = maskFor(props.mask);
    const levels = Math.max(2, Math.min(4, Math.round(props.levels)));
    const bands = ditherLevels(field, cols, rows, levels, mask, size);
    const top = levels - 1;
    const buf = data.data;
    for (let p = 0; p < bands.length; p++) {
      const o = p * 4;
      const band = bands[p] ?? 0;
      const alpha = top > 0 ? Math.round((band / top) * inkA) : inkA;
      buf[o] = inkR;
      buf[o + 1] = inkG;
      buf[o + 2] = inkB;
      buf[o + 3] = alpha;
    }
    context.putImageData(data, 0, 0);
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  layout();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });

  return {
    update(next) {
      props = { ...props, ...next };
      palette.refresh();
      syncInk();
      layout();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      loop.destroy();
      surface.destroy();
      palette.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
