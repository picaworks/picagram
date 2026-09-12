import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { blueNoiseMatrix, maskAt } from "../../../lib/dither-mask";
import { createLoop } from "../../../lib/loop";
import { createNoise } from "../../../lib/noise";
import { watchPalette } from "../../../lib/palette";
import { createPlate, inkPixels } from "../../../lib/pixels";
import type { Mount, MotionProps } from "../../../lib/types";

export interface DitherContoursProps extends MotionProps {
  /** Number of elevation bands the height field is cut into. */
  bands: number;
  /** Noise frequency. Higher values pack the bands closer together. */
  scale: number;
  /** Octaves of noise summed into the height field. More octaves add finer detail. */
  octaves: number;
  /** How fast the height field drifts, in noise units per second. Zero holds it still. */
  speed: number;
  /** Boundary line thickness, in CSS pixels. */
  lineWeight: number;
  /** How often a boundary is drawn as an index contour in the accent color, counted in bands. Zero draws none. */
  index: number;
  /** CSS pixels each computed pixel covers, for the dither fill. */
  pixel: number;
  /** Frames per second ceiling for the drift. */
  fps: number;
}

export const defaults: DitherContoursProps = {
  bands: 6,
  scale: 1.6,
  octaves: 4,
  speed: 0.1,
  lineWeight: 1,
  index: 5,
  pixel: 2,
  fps: 15,
  paused: false,
  time: null,
  seed: 1,
};

/** The screen the flat tone within a band is read against. Blue noise carries no low frequency energy, so a
 *  flat band reads as an even, calm grain rather than the wallpaper a small repeating lattice would leave. */
const MASK_SIZE = 16;
const MASK = blueNoiseMatrix(MASK_SIZE);
/** How much quieter each further octave is. Low, so fine octaves stay a texture and never speckle the terraces. */
const PERSISTENCE = 0.32;
/** How much finer each further octave is. */
const LACUNARITY = 2;
/** Extra damping under `scale`, so a hill spans hundreds of cells instead of a handful. */
const FIELD_SCALE = 0.0022;
/** Gain on the summed noise before it is centered. Fractal noise rarely reaches its own extremes, so a flat
 *  map would spend most of the field in the middle bands; this spreads it toward both ends, so the lowest
 *  and the highest band both reliably appear. */
const GAIN = 1.6;
/** Noise-space units the field drifts per second, at speed 1. Slow, so a band takes at least half a minute to cross the host. */
const DRIFT_RATE = 0.04;
/** The animation time shown under reduced motion, and the frame reviewers see first. */
const STILL_TIME = 1200;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Fractal Brownian motion: several octaves of the same noise, normalized to [-1, 1]. */
function fbm(noise: ReturnType<typeof createNoise>, x: number, y: number, octaves: number): number {
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amplitude * noise.noise2(x * frequency, y * frequency);
    total += amplitude;
    amplitude *= PERSISTENCE;
    frequency *= LACUNARITY;
  }
  return sum / total;
}

export const mount: Mount<DitherContoursProps> = (host, initial = {}) => {
  let props: DitherContoursProps = { ...defaults, ...initial };
  let noise = createNoise(props.seed);
  let cols = 1;
  let rows = 1;
  let bandGrid = new Uint8Array(1);
  let coverage = new Uint8Array(1);
  let imageData = new ImageData(1, 1);
  let inkR = 0;
  let inkG = 0;
  let inkB = 0;
  let inkA = 255;
  const plate = createPlate();

  function layout(): boolean {
    const w = Math.max(1, Math.round(surface.cssWidth / props.pixel));
    const h = Math.max(1, Math.round(surface.cssHeight / props.pixel));
    if (w === cols && h === rows) return false;
    cols = w;
    rows = h;
    bandGrid = new Uint8Array(cols * rows);
    coverage = new Uint8Array(cols * rows);
    imageData = new ImageData(cols, rows);
    return true;
  }

  const surface = createCanvas(host, {
    css: "image-rendering:pixelated",
    onResize: () => {
      layout();
      loop.redraw();
    },
  });
  const ctx = surface.canvas.getContext("2d");

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

  function draw(t: number): void {
    if (!ctx) {
      host.dataset.picaReady = "true";
      return;
    }
    const octaves = Math.max(1, Math.round(props.octaves));
    const bands = Math.max(1, Math.round(props.bands));
    const freq = props.scale * FIELD_SCALE;
    const driftX = (t / 1000) * props.speed * DRIFT_RATE;
    const driftY = driftX * 0.6;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const raw = fbm(noise, x * freq + driftX, y * freq + driftY, octaves);
        const height = clamp01((raw * GAIN + 1) / 2);
        const band = Math.min(bands - 1, Math.floor(height * bands));
        bandGrid[i] = band;
        coverage[i] = maskAt(MASK, MASK_SIZE, x, y) < (band + 1) / bands ? 1 : 0;
      }
    }
    plate.put(inkPixels(coverage, cols, rows, [inkR, inkG, inkB, inkA], imageData));

    const dpr = surface.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, surface.cssWidth, surface.cssHeight);
    ctx.drawImage(plate.canvas, 0, 0, surface.cssWidth, surface.cssHeight);

    const pixel = props.pixel;
    const fgPath = new Path2D();
    const accentPath = new Path2D();
    let hasAccent = false;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const here = bandGrid[y * cols + x] ?? 0;
        const right = x + 1 < cols ? (bandGrid[y * cols + x + 1] ?? 0) : here;
        if (right !== here) {
          const level = Math.max(here, right);
          const accent = props.index > 0 && level % props.index === 0;
          const px = (x + 1) * pixel;
          const path = accent ? accentPath : fgPath;
          path.moveTo(px, y * pixel);
          path.lineTo(px, (y + 1) * pixel);
          if (accent) hasAccent = true;
        }
        const down = y + 1 < rows ? (bandGrid[(y + 1) * cols + x] ?? 0) : here;
        if (down !== here) {
          const level = Math.max(here, down);
          const accent = props.index > 0 && level % props.index === 0;
          const py = (y + 1) * pixel;
          const path = accent ? accentPath : fgPath;
          path.moveTo(x * pixel, py);
          path.lineTo((x + 1) * pixel, py);
          if (accent) hasAccent = true;
        }
      }
    }
    ctx.lineWidth = props.lineWeight;
    ctx.strokeStyle = palette.colors.fg;
    ctx.stroke(fgPath);
    if (hasAccent) {
      ctx.strokeStyle = palette.colors.accent;
      ctx.stroke(accentPath);
    }
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  layout();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.seed !== before.seed) noise = createNoise(props.seed);
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
