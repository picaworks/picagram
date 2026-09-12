import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { blueNoiseMatrix, clusterMatrix, ditherLevels } from "../../../lib/dither-mask";
import { createLoop } from "../../../lib/loop";
import { createNoise, type Noise } from "../../../lib/noise";
import { watchPalette } from "../../../lib/palette";
import { inkPixels } from "../../../lib/pixels";
import type { Mount, MotionProps } from "../../../lib/types";

export interface DitherNoiseProps extends MotionProps {
  /** Noise cycles across the field's longer side. Higher values give smaller, more numerous clouds. */
  scale: number;
  /** Fractal noise layers summed into the field, each finer than the last. */
  octaves: number;
  /** Flat tone bands the field is screened into, from the ground up to full ink. */
  levels: number;
  /** "blue" scatters ink for a photographic grain. "cluster" grows round dots for a newsprint screen. */
  mask: "blue" | "cluster";
  /** How fast the field drifts. 0 holds it still. */
  speed: number;
  /** Direction the field drifts toward, in degrees. 0 drifts rightward, 90 drifts downward. */
  angle: number;
  /** CSS pixels each screened cell covers before the canvas is scaled up. */
  pixel: number;
  /** Contrast around mid grey, applied before the field is screened into bands. 1 leaves it as it is. */
  contrast: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: DitherNoiseProps = {
  scale: 2,
  octaves: 3,
  levels: 3,
  mask: "blue",
  speed: 0.15,
  angle: 20,
  pixel: 3,
  contrast: 1,
  fps: 15,
  paused: false,
  time: null,
  seed: 1,
};

/** Animation time reduced motion holds, and what captures use, in milliseconds. */
const STILL_TIME = 1200;
/** Cap on the noise tile's longer side, in cells, so the one-time build stays brief. The field is read back
 *  through bilinear sampling, so a coarser tile still scrolls as a smooth, soft cloud. */
const TILE_MAX = 160;
/** Cell count of the dispersed mask, from lib/dither-mask.ts. */
const BLUE_SIZE = 32;
/** Cell count of the clustered dot screen, from lib/dither-mask.ts. The larger of its two sizes. */
const CLUSTER_SIZE = 8;
/** Milliseconds the field takes to drift one tile width at speed 1, its fastest setting. Keeps a comfortable
 *  margin over the 20 second floor, whatever speed a caller picks, so the drift never churns. */
const CROSS_MS = 24000;
/** Degrees added to the base angle for the field's second read, so the two do not move in parallel. */
const LAYER_TURN = 47;
/** The second read's speed, relative to the first, at speed 1. Lower, so it trails and gives the drift depth. */
const LAYER_RATE = 0.6;
/** Gain that spreads the two reads' average back toward both tones. Averaging narrows a field that already
 *  spans 0 to 1, the way mixing two greys makes a third; this restores the contrast that mixing removes. */
const LAYER_GAIN = 1.6;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Fractal noise at one point, its octaves summed with each half the amplitude and twice the frequency of
 *  the last, then brought back to roughly -1 to 1 by the total amplitude they carried. */
function noiseSum(noise: Noise, x: number, y: number, octaves: number): number {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amplitude * noise.noise2(x * frequency, y * frequency);
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total > 0 ? sum / total : 0;
}

/** noiseSum at (nx, ny) in 0 to 1, blended with three copies shifted by one full cycle of `scale`, so the
 *  tile it fills repeats with no seam when its opposite edges are read as neighbors. */
function fieldAt(noise: Noise, nx: number, ny: number, scale: number, octaves: number): number {
  const sx = nx * scale;
  const sy = ny * scale;
  const a = noiseSum(noise, sx, sy, octaves);
  const b = noiseSum(noise, sx - scale, sy, octaves);
  const c = noiseSum(noise, sx, sy - scale, octaves);
  const d = noiseSum(noise, sx - scale, sy - scale, octaves);
  return a * (1 - nx) * (1 - ny) + b * nx * (1 - ny) + c * (1 - nx) * ny + d * nx * ny;
}

/** The longer side held to TILE_MAX, the other scaled to match the display grid's own aspect, so a cell
 *  covers the same ground in both directions and a cloud is never stretched. */
function tileDims(aspect: number): [number, number] {
  const a = aspect > 0 ? aspect : 1;
  return a >= 1 ? [TILE_MAX, Math.max(8, Math.round(TILE_MAX / a))] : [Math.max(8, Math.round(TILE_MAX * a)), TILE_MAX];
}

/** Bilinear read of a tile that wraps at its own size, at a fractional cell position. */
function readField(tile: Float32Array, tileW: number, tileH: number, x: number, y: number): number {
  const wx = ((x % tileW) + tileW) % tileW;
  const wy = ((y % tileH) + tileH) % tileH;
  const x0 = Math.floor(wx);
  const y0 = Math.floor(wy);
  const x1 = (x0 + 1) % tileW;
  const y1 = (y0 + 1) % tileH;
  const tx = wx - x0;
  const ty = wy - y0;
  const v00 = tile[y0 * tileW + x0] ?? 0;
  const v10 = tile[y0 * tileW + x1] ?? 0;
  const v01 = tile[y1 * tileW + x0] ?? 0;
  const v11 = tile[y1 * tileW + x1] ?? 0;
  return v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
}

export const mount: Mount<DitherNoiseProps> = (host, initial = {}) => {
  let props: DitherNoiseProps = { ...defaults, ...initial };
  let cols = 1;
  let rows = 1;
  let values = new Float32Array(1);
  let imageData: ImageData | null = null;
  let tile = new Float32Array(1);
  let tileW = 1;
  let tileH = 1;
  let builtSeed = Number.NaN;
  let builtScale = Number.NaN;
  let builtOctaves = Number.NaN;

  const surface = createCanvas(host, {
    autoSize: false,
    css: "image-rendering:pixelated",
    onResize: () => {
      if (layout()) loop.redraw();
    },
  });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const palette = watchPalette(host, () => loop.redraw());

  function octaveCount(): number {
    return Math.max(1, Math.min(5, Math.round(props.octaves)));
  }

  /** Builds the noise tile once for the current seed, scale, octaves, and aspect. Never called per frame:
   *  draw() only scrolls what this lays down. Normalizing to its own min and max spends the full 0 to 1
   *  range on whatever the field's true contrast turns out to be, however the octaves and the seam blend
   *  above happen to compress it. */
  function rebuildField(): void {
    const [w, h] = tileDims(cols / rows);
    tileW = w;
    tileH = h;
    tile = new Float32Array(w * h);
    const noise = createNoise(props.seed);
    const octaves = octaveCount();
    const scale = Math.max(0.1, props.scale);
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let y = 0; y < h; y++) {
      const ny = (y + 0.5) / h;
      for (let x = 0; x < w; x++) {
        const nx = (x + 0.5) / w;
        const v = fieldAt(noise, nx, ny, scale, octaves);
        tile[y * w + x] = v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    const span = max > min ? max - min : 1;
    for (let i = 0; i < tile.length; i++) tile[i] = ((tile[i] ?? 0) - min) / span;
    builtSeed = props.seed;
    builtScale = props.scale;
    builtOctaves = octaves;
  }

  /** Recomputes the low-resolution grid from the host and `pixel`, and the field whenever its own shape
   *  needs to change. Returns true when either did, so a caller not already animating knows to redraw. */
  function layout(): boolean {
    const pixelSize = Math.max(1, props.pixel);
    const w = Math.max(1, Math.round(surface.cssWidth / pixelSize));
    const h = Math.max(1, Math.round(surface.cssHeight / pixelSize));
    let changed = false;
    if (w !== cols || h !== rows || !imageData) {
      cols = w;
      rows = h;
      canvas.width = cols;
      canvas.height = rows;
      imageData = ctx ? ctx.createImageData(cols, rows) : null;
      values = new Float32Array(cols * rows);
      changed = true;
    }
    const [tw, th] = tileDims(cols / rows);
    if (tw !== tileW || th !== tileH || props.seed !== builtSeed || props.scale !== builtScale || octaveCount() !== builtOctaves) {
      rebuildField();
      changed = true;
    }
    return changed;
  }

  function draw(t: number): void {
    if (!ctx || !imageData) {
      host.dataset.picaReady = "true";
      return;
    }
    const radA = (props.angle * Math.PI) / 180;
    const radB = ((props.angle + LAYER_TURN) * Math.PI) / 180;
    const period = Math.max(tileW, tileH);
    const rateA = (props.speed * period) / CROSS_MS;
    const rateB = rateA * LAYER_RATE;
    const shiftAx = Math.cos(radA) * rateA * t;
    const shiftAy = Math.sin(radA) * rateA * t;
    const shiftBx = Math.cos(radB) * rateB * t;
    const shiftBy = Math.sin(radB) * rateB * t;
    const contrast = props.contrast;
    for (let y = 0; y < rows; y++) {
      const cy = ((y + 0.5) / rows) * tileH;
      for (let x = 0; x < cols; x++) {
        const cx = ((x + 0.5) / cols) * tileW;
        const a = readField(tile, tileW, tileH, cx - shiftAx, cy - shiftAy);
        const b = readField(tile, tileW, tileH, cx - shiftBx, cy - shiftBy);
        const mixed = clamp01(((a + b) * 0.5 - 0.5) * LAYER_GAIN + 0.5);
        values[y * cols + x] = clamp01((mixed - 0.5) * contrast + 0.5);
      }
    }
    const levels = Math.max(2, Math.min(4, Math.round(props.levels)));
    const maskSize = props.mask === "cluster" ? CLUSTER_SIZE : BLUE_SIZE;
    const mask = props.mask === "cluster" ? clusterMatrix(CLUSTER_SIZE) : blueNoiseMatrix(BLUE_SIZE);
    const bands = ditherLevels(values, cols, rows, levels, mask, maskSize);
    const top = levels - 1;
    for (let i = 0; i < bands.length; i++) values[i] = (bands[i] ?? 0) / top;
    const fg = parseColor(palette.colors.fg);
    ctx.putImageData(inkPixels(values, cols, rows, fg, imageData), 0, 0);
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  layout();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });

  return {
    update(next) {
      props = { ...props, ...next };
      palette.refresh();
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
