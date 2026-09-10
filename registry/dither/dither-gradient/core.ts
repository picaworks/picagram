import { labelHost, unlabelHost } from "../../../lib/a11y";
import { inkColor, parseColor } from "../../../lib/color";
import { bayerMatrix } from "../../../lib/dither";
import { createLoop } from "../../../lib/loop";
import { createNoise } from "../../../lib/noise";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface DitherGradientProps extends MotionProps {
  /** Field the gradient follows. "linear" sweeps at a slowly turning angle, "radial" drifts its center, "noise" evolves a simplex field. */
  shape: "linear" | "radial" | "noise";
  /** CSS pixels each computed pixel covers before the canvas is scaled up. Higher values draw a coarser, cheaper grid. */
  scale: number;
  /** How fast the gradient moves. 0 holds it still. */
  speed: number;
  /** Contrast around mid grey, applied before the Bayer threshold. 1 leaves the gradient as it is. */
  contrast: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: DitherGradientProps = {
  shape: "noise",
  scale: 4,
  speed: 0.2,
  contrast: 1,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** Animation time shown under reduced motion, and what captures use, in milliseconds. */
const STILL_TIME = 1200;
/** Ordered-dither thresholds, computed once and shared by every instance. */
const BAYER = bayerMatrix(8);
/** Radians per second the linear angle turns, at speed 1. */
const LINEAR_RATE = 0.3;
/** Radians per second the radial center's x and y drift, at speed 1. Different rates keep the drift from repeating. */
const RADIAL_RATE_X = 0.22;
const RADIAL_RATE_Y = 0.17;
/** How far the radial center wanders, as a share of the box's shorter side. */
const RADIAL_DRIFT = 0.18;
/** Simplex z units per second the noise field advances, at speed 1. */
const NOISE_RATE = 0.1;
/** Noise wave cycles across the box's longer side. Low, so the field reads as a few broad, calm
 *  drifts rather than an all-over static texture. */
const NOISE_FEATURES = 1.1;
/** Gain on the raw simplex value before it is centered. Simplex noise rarely reaches its own
 *  extremes, so a flat map spends most of the field near the dither's mid grey; this spreads it
 *  toward both tones, leaving clearer areas of each between the drifts. */
const NOISE_GAIN = 1.7;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

interface SeedState {
  noise: ReturnType<typeof createNoise>;
  angle0: number;
  phaseX: number;
  phaseY: number;
}

/** Everything derived from the seed: the noise field and a few starting angles, so the same seed always draws the same motion. */
function deriveSeed(seed: number): SeedState {
  const rng = createRng(seed);
  return { noise: createNoise(seed), angle0: rng() * Math.PI * 2, phaseX: rng() * Math.PI * 2, phaseY: rng() * Math.PI * 2 };
}

export const mount: Mount<DitherGradientProps> = (host, initial = {}) => {
  let props: DitherGradientProps = { ...defaults, ...initial };
  let cols = 1;
  let rows = 1;
  let imageData: ImageData | null = null;
  let inkKey = "";
  let inkR = 0;
  let inkG = 0;
  let inkB = 0;
  let inkA = 255;
  let cachedSeed = props.seed;
  let seedState = deriveSeed(props.seed);

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated";
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.style.overflow = "hidden";
  host.appendChild(canvas);

  function refreshInk(): void {
    const color = inkColor(host);
    if (color === inkKey) return;
    inkKey = color;
    const [r, g, b, a] = parseColor(color);
    inkR = r;
    inkG = g;
    inkB = b;
    inkA = a;
  }

  /** Recomputes the low-resolution canvas size from the host and `scale`. Returns true when it changed. */
  function layout(): boolean {
    const w = Math.max(1, Math.round(host.clientWidth / props.scale));
    const h = Math.max(1, Math.round(host.clientHeight / props.scale));
    if (w === cols && h === rows && imageData) return false;
    cols = w;
    rows = h;
    canvas.width = cols;
    canvas.height = rows;
    imageData = ctx ? ctx.createImageData(cols, rows) : null;
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
      seedState = deriveSeed(cachedSeed);
    }
    refreshInk();
    const buf = data.data;
    const contrast = props.contrast;
    const timeS = t * 0.001 * props.speed;
    const norm = Math.max(cols, rows);

    // Writes one pixel: below the matrix threshold is fully transparent, at or above it is solid ink.
    function put(o: number, v: number, threshold: number): void {
      const on = clamp01((v - 0.5) * contrast + 0.5) > threshold;
      buf[o] = on ? inkR : 0;
      buf[o + 1] = on ? inkG : 0;
      buf[o + 2] = on ? inkB : 0;
      buf[o + 3] = on ? inkA : 0;
    }

    if (props.shape === "linear") {
      // A single sweep across the whole box, its angle turning slowly. `maxR` is the box's support
      // distance along that angle, so the sweep always spans edge to edge with no repeats.
      const angle = seedState.angle0 + timeS * LINEAR_RATE;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      const halfW = cols / norm / 2;
      const halfH = rows / norm / 2;
      const maxR = halfW * Math.abs(dirX) + halfH * Math.abs(dirY);
      let i = 0;
      for (let y = 0; y < rows; y++) {
        const ny = (y + 0.5) / norm - halfH;
        const rowBayer = (y & 7) * 8;
        for (let x = 0; x < cols; x++) {
          const nx = (x + 0.5) / norm - halfW;
          const v = (nx * dirX + ny * dirY) / (2 * maxR) + 0.5;
          put(i * 4, v, BAYER[rowBayer + (x & 7)] ?? 0.5);
          i++;
        }
      }
    } else if (props.shape === "radial") {
      const boxW = cols / norm;
      const boxH = rows / norm;
      const driftR = RADIAL_DRIFT * Math.min(boxW, boxH);
      const cx = boxW / 2 + driftR * Math.sin(timeS * RADIAL_RATE_X + seedState.phaseX);
      const cy = boxH / 2 + driftR * Math.cos(timeS * RADIAL_RATE_Y + seedState.phaseY);
      const maxDist = Math.max(
        Math.hypot(cx, cy),
        Math.hypot(boxW - cx, cy),
        Math.hypot(cx, boxH - cy),
        Math.hypot(boxW - cx, boxH - cy),
      );
      let i = 0;
      for (let y = 0; y < rows; y++) {
        const ny = (y + 0.5) / norm;
        const rowBayer = (y & 7) * 8;
        for (let x = 0; x < cols; x++) {
          const nx = (x + 0.5) / norm;
          const v = Math.hypot(nx - cx, ny - cy) / maxDist;
          put(i * 4, v, BAYER[rowBayer + (x & 7)] ?? 0.5);
          i++;
        }
      }
    } else {
      const freq = NOISE_FEATURES / norm;
      const nz = timeS * NOISE_RATE;
      const noise = seedState.noise;
      let i = 0;
      for (let y = 0; y < rows; y++) {
        const rowBayer = (y & 7) * 8;
        for (let x = 0; x < cols; x++) {
          const v = noise.noise3(x * freq, y * freq, nz) * NOISE_GAIN * 0.5 + 0.5;
          put(i * 4, v, BAYER[rowBayer + (x & 7)] ?? 0.5);
          i++;
        }
      }
    }
    context.putImageData(data, 0, 0);
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  layout();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });
  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => {
        if (layout()) loop.redraw();
      })
    : null;
  resizeObserver?.observe(host);

  return {
    update(next) {
      props = { ...props, ...next };
      layout();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      loop.destroy();
      resizeObserver?.disconnect();
      canvas.remove();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
