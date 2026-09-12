import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { hostTone, parseColor } from "../../../lib/color";
import { blueNoiseMatrix, clusterMatrix, maskAt } from "../../../lib/dither-mask";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { inkPixels } from "../../../lib/pixels";
import { createRng, hashSeed } from "../../../lib/rng";
import { createSampler } from "../../../lib/sample";
import { litSphere } from "../../../lib/subject";
import type { Mount, MotionProps } from "../../../lib/types";

export interface DitherTemporalProps extends MotionProps {
  /** What the screen dithers: the built-in lit sphere, or a plain gradient brightest at the upper left. */
  subject: "sphere" | "gradient";
  /** CSS pixels each dithered pixel covers before the canvas is scaled up, unsmoothed. */
  scale: number;
  /** Which threshold mask supplies the screen. Blue noise scatters ink so evenly no structure shows; cluster grows dots the way a printed halftone does. */
  mask: "blue" | "cluster";
  /** Side length of the tiled mask, in cells: 16, 32, or 64. A cluster screen keeps to its own coarser 4 or 8 cell sizes, so this rounds to the nearest one it has. */
  maskSize: number;
  /** Visible steps of ink density the screen can show, from 2 to 4. 2 draws a plain two-tone screen. */
  levels: number;
  /** Contrast around mid grey, applied before the screen cuts ink from ground. 1 leaves the subject as it is. */
  contrast: number;
  /** How far the mask's threshold turns between frames, from 0 to 1. 0 holds one mask still; higher values crawl faster. */
  drift: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: DitherTemporalProps = {
  subject: "sphere",
  scale: 3,
  mask: "blue",
  maskSize: 32,
  levels: 2,
  contrast: 1,
  drift: 0.5,
  fps: 8,
  paused: false,
  time: null,
  seed: 1,
};

/** Animation time shown under reduced motion, and what captures use, in milliseconds. */
const STILL_TIME = 1200;

/** The golden ratio's conjugate. Stepping a threshold by this much and wrapping it never realigns with the
 *  mask's own period, so the sequence of masks a fixed pixel sees stays blue over time as well as over
 *  space, the requirement Wolfe and colleagues add to Ulichney's method. lib/dither-mask.ts's own docs
 *  suggest exactly this step for a shift that crawls. */
const GOLDEN_STEP = 0.6180339887498949;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** The tiled mask `kind` reads, and its side length in cells. Cluster screens only come in two sizes, so a
 *  mask size meant for blue noise still lands on the nearest one cluster has. */
function pickMask(kind: DitherTemporalProps["mask"], requested: number): { readonly values: Float32Array; readonly size: number } {
  if (kind === "cluster") {
    const size = requested <= 16 ? 4 : 8;
    return { values: clusterMatrix(size), size };
  }
  const size = requested <= 16 ? 16 : requested <= 32 ? 32 : 64;
  return { values: blueNoiseMatrix(size), size };
}

/** Ink coverage from 0 to 1 for each tone, quantized to `levels` visible steps and cut against a tiled mask
 *  whose threshold turns by `shift`, wrapped to 0..1. The tone never moves, only the cut a fixed pixel falls
 *  on either side of, which is what lets the grain crawl while the tone holds. Generalizes
 *  lib/dither-mask.ts's thresholdMask from two steps to a few, and reproduces it exactly when `levels` is 2. */
function driftCoverage(
  tone: Float32Array,
  width: number,
  height: number,
  mask: ArrayLike<number>,
  size: number,
  levels: number,
  shift: number,
): Float32Array {
  const top = Math.max(1, levels - 1);
  const turn = ((shift % 1) + 1) % 1;
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const cut = maskAt(mask, size, x, y) + turn;
      const wrapped = cut >= 1 ? cut - 1 : cut;
      const scaled = Math.min(1, Math.max(0, tone[i] ?? 0)) * top;
      const band = Math.floor(scaled);
      const lit = scaled - band >= wrapped ? 1 : 0;
      out[i] = Math.min(top, band + lit) / top;
    }
  }
  return out;
}

export const mount: Mount<DitherTemporalProps> = (host, initial = {}) => {
  let props: DitherTemporalProps = { ...defaults, ...initial };
  let cols = 1;
  let rows = 1;
  let tone: Float32Array | null = null;
  let imageData: ImageData | null = null;
  let sphere: HTMLCanvasElement | null = null;
  let inkR = 0;
  let inkG = 0;
  let inkB = 0;
  let inkA = 255;
  let started = false;

  const sampler = createSampler();
  const surface = createCanvas(host, { autoSize: false, css: "image-rendering:pixelated", onResize: () => resized() });
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
    prepare();
  });
  syncInk();

  /** The canvas size the host and `scale` call for, in whole pixels. */
  function layoutSize(): [number, number] {
    const w = Math.max(1, Math.round(Math.max(1, surface.cssWidth) / Math.max(1, props.scale)));
    const h = Math.max(1, Math.round(Math.max(1, surface.cssHeight) / Math.max(1, props.scale)));
    return [w, h];
  }

  /** Works the tone out fresh: the sphere sampled to ink, or a plain gradient computed the same way, brightest
   *  toward the light and darkest away from it regardless of the ground. Runs when the size changes and when
   *  subject, scale, contrast, or the palette does, and at no other time, so a frame never resamples anything. */
  function prepare(): void {
    const [w, h] = layoutSize();
    cols = w;
    rows = h;
    canvas.width = cols;
    canvas.height = rows;
    imageData = ctx ? ctx.createImageData(cols, rows) : null;
    if (props.subject === "sphere") {
      if (!sphere) sphere = litSphere();
      const ink = sampler.sample(sphere, sphere.width, sphere.height, host, {
        cols, rows, aspect: 1, n: 1, fit: "contain", tone: "auto", contrast: props.contrast, mirror: false,
      });
      tone = ink.slice();
    } else {
      const lightOnDark = hostTone(host) === "light-on-dark";
      const next = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++) {
        const ny = rows <= 1 ? 0.5 : y / (rows - 1);
        for (let x = 0; x < cols; x++) {
          const nx = cols <= 1 ? 0.5 : x / (cols - 1);
          const brightness = 1 - (nx + ny) / 2;
          const linear = clamp01((brightness - 0.5) * props.contrast + 0.5);
          next[y * cols + x] = lightOnDark ? linear : 1 - linear;
        }
      }
      tone = next;
    }
    if (started) loop.redraw();
  }

  function resized(): void {
    const [w, h] = layoutSize();
    if (w !== cols || h !== rows) prepare();
    else if (started) loop.redraw();
  }

  function draw(t: number): void {
    if (!ctx || !imageData || !tone) {
      host.dataset.picaReady = "true";
      return;
    }
    const levels = Math.max(2, Math.min(4, Math.round(props.levels)));
    const drift = Math.max(0, Math.min(1, props.drift));
    const phase = createRng(hashSeed(props.seed, 0))();
    const frameMs = 1000 / Math.max(1, props.fps);
    const index = Math.round(t / frameMs);
    const shift = phase + index * GOLDEN_STEP * drift;
    const { values: maskValues, size } = pickMask(props.mask, props.maskSize);
    const coverage = driftCoverage(tone, cols, rows, maskValues, size, levels, shift);
    inkPixels(coverage, cols, rows, [inkR, inkG, inkB, inkA], imageData);
    ctx.putImageData(imageData, 0, 0);
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  prepare();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });
  started = true;

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const recolored = palette.refresh();
      if (recolored) syncInk();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      if (recolored || props.subject !== before.subject || props.scale !== before.scale || props.contrast !== before.contrast) {
        prepare();
      } else if (
        props.mask !== before.mask ||
        props.maskSize !== before.maskSize ||
        props.levels !== before.levels ||
        props.drift !== before.drift ||
        props.seed !== before.seed
      ) {
        loop.redraw();
      }
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
