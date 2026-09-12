import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { boxMean, sobelEdges } from "../../../lib/filter";
import { watchPalette } from "../../../lib/palette";
import { createPlate, inkPixels } from "../../../lib/pixels";
import { fitRect } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface EdgeTraceImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** Contrast around mid grey before the gradient runs. 1 leaves the image as it is. */
  contrast: number;
  /** Lower threshold, 0 to 1. A thinned pixel under it is dropped unless it touches one that clears the upper threshold. */
  low: number;
  /** Upper threshold, 0 to 1. A thinned pixel that clears it is kept on its own. */
  high: number;
  /** Mean smoothing radius in pixels, run before the gradient so single-pixel noise stays out of it. */
  smooth: number;
  /** Traced line thickness in pixels, drawn as coverage rather than a wider mask. */
  weight: number;
  /** Inks the ground and leaves the traced lines bare, instead of the other way around. */
  invert: boolean;
}

export const defaults: EdgeTraceImageProps = {
  src: "",
  alt: "",
  fit: "cover",
  contrast: 1.1,
  low: 0.08,
  high: 0.2,
  smooth: 1,
  weight: 1,
  invert: false,
};

/** Longest side, in pixels, the working copy is prepared at. Held under this so the one-time pass stays
 *  fast and a frame only ever has to scale the result, never fit or crop it again. */
const WORK_MAX = 480;

/** The image as one field from 0 to 1: a pixel's own contrast-adjusted brightness where the source covers
 *  it, and a neutral middle where it does not. A silhouette then meets its surroundings at a real step no
 *  matter how light or dark the surroundings would otherwise read, which is what keeps the built-in
 *  sphere's rim traced whole instead of fading into a ground that happens to be nearly as dark as it is. */
function contrastField(raw: Uint8ClampedArray, width: number, height: number, contrast: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let p = 0; p < out.length; p++) {
    const o = p * 4;
    const a = (raw[o + 3] ?? 0) / 255;
    const luma = (0.2126 * (raw[o] ?? 0) + 0.7152 * (raw[o + 1] ?? 0) + 0.0722 * (raw[o + 2] ?? 0)) / 255;
    const linear = Math.min(1, Math.max(0, (luma - 0.5) * contrast + 0.5)) ** 2.2;
    out[p] = a * linear + (1 - a) * 0.5;
  }
  return out;
}

/** The neighbour offset non-maximum suppression compares a pixel against, for one of the four directions a
 *  gradient quantizes to: 0 horizontal, 1 the falling diagonal, 2 vertical, 3 the rising diagonal. */
function directionOffset(bin: number): readonly [number, number] {
  if (bin === 1) return [1, 1];
  if (bin === 2) return [0, 1];
  if (bin === 3) return [1, -1];
  return [1, 0];
}

/** Gradient direction at every pixel, quantized to the four lines directionOffset names, from the same
 *  Sobel kernels sobelEdges runs. lib/filter.ts keeps only their size, so thinning works this out itself. */
function edgeDirections(values: Float32Array, width: number, height: number): Uint8Array {
  const bins = new Uint8Array(width * height);
  const at = (x: number, y: number): number =>
    values[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))] ?? 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tl = at(x - 1, y - 1);
      const tr = at(x + 1, y - 1);
      const bl = at(x - 1, y + 1);
      const br = at(x + 1, y + 1);
      const gx = tr + 2 * at(x + 1, y) + br - tl - 2 * at(x - 1, y) - bl;
      const gy = bl + 2 * at(x, y + 1) + br - tl - 2 * at(x, y - 1) - tr;
      let angle = Math.atan2(gy, gx);
      if (angle < 0) angle += Math.PI;
      bins[y * width + x] = Math.round(angle / (Math.PI / 4)) % 4;
    }
  }
  return bins;
}

/** Keeps a pixel only where its gradient is at least as large as its two neighbours along its own
 *  direction, so a blurred band collapses to the ridge at its centre and a line lands one pixel wide.
 *  Canny's first rule. */
function thinRidges(mag: Float32Array, dirs: Uint8Array, width: number, height: number): Uint8Array {
  const thin = new Uint8Array(width * height);
  const at = (x: number, y: number): number =>
    mag[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))] ?? 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const [dx, dy] = directionOffset(dirs[i] ?? 0);
      const m = mag[i] ?? 0;
      thin[i] = m >= at(x - dx, y - dy) && m >= at(x + dx, y + dy) ? 1 : 0;
    }
  }
  return thin;
}

/** Keeps a thinned pixel when it clears `high`, or clears `low` and is eight-connected to a pixel already
 *  kept, so a faint but connected line survives while an isolated speck does not. Canny's second rule. */
function keepEdges(mag: Float32Array, thin: Uint8Array, width: number, height: number, low: number, high: number): Uint8Array {
  const kept = new Uint8Array(width * height);
  const stack: number[] = [];
  for (let i = 0; i < thin.length; i++) {
    if (thin[i] && (mag[i] ?? 0) >= high) {
      kept[i] = 1;
      stack.push(i);
    }
  }
  while (stack.length > 0) {
    const i = stack.pop();
    if (i === undefined) break;
    const x = i % width;
    const y = Math.floor(i / width);
    for (let oy = -1; oy <= 1; oy++) {
      const ny = y + oy;
      if (ny < 0 || ny >= height) continue;
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        const nx = x + ox;
        if (nx < 0 || nx >= width) continue;
        const j = ny * width + nx;
        if (!kept[j] && thin[j] && (mag[j] ?? 0) >= low) {
          kept[j] = 1;
          stack.push(j);
        }
      }
    }
  }
  return kept;
}

/** Coverage from 0 to 1 for a line `weight` pixels wide centred on every kept pixel. The default of one
 *  draws a hard single pixel; a smaller or larger weight fades or spreads it through fractional coverage
 *  rather than a ragged mask. */
function strokeCoverage(kept: Uint8Array, width: number, height: number, weight: number): Float32Array {
  const half = weight / 2;
  const axis = (d: number): number => Math.min(1, Math.max(0, half - Math.abs(d) + 0.5));
  const coverage = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let oy = -1; oy <= 1; oy++) {
        const ny = y + oy;
        if (ny < 0 || ny >= height) continue;
        const cy = axis(oy);
        if (cy <= 0) continue;
        for (let ox = -1; ox <= 1; ox++) {
          const nx = x + ox;
          if (nx < 0 || nx >= width || !kept[ny * width + nx]) continue;
          const cx = axis(ox);
          if (cx > 0) v = Math.max(v, cx * cy);
        }
      }
      coverage[y * width + x] = v;
    }
  }
  return coverage;
}

export const mount: Mount<EdgeTraceImageProps> = (host, initial = {}) => {
  let props: EdgeTraceImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let plateW = 0;
  let plateH = 0;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;

  const work = document.createElement("canvas");
  const workCtx = work.getContext("2d", { willReadFrequently: true });
  const plate = createPlate();
  const surface = createCanvas(host, { onResize: () => resized() });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const palette = watchPalette(host, () => prepare());

  function load(): void {
    cancel();
    failed = false;
    cancel = loadSource(props.src, use, () => {
      source = null;
      failed = true;
      prepare();
    });
  }

  function use(next: Source): void {
    source = next;
    // A host with no height of its own takes the image's proportions.
    undoAspect();
    undoAspect = fitHostAspect(host, next.width, next.height);
    prepare();
  }

  function setNote(on: boolean): void {
    if (on && !removeNote) removeNote = showNote(host, "image unavailable");
    if (!on && removeNote) {
      removeNote();
      removeNote = null;
    }
  }

  /** The plate size for the host's box: its own proportions, held under WORK_MAX on the longer side, so the
   *  plate maps onto the host one to one and a frame never has to fit or offset it. Also held under the
   *  source's own longer side, so a small source is never blown up before its gradient runs: a traced line
   *  stays one pixel wide either way, but stretching first would spread that one pixel over several and
   *  thin the same line down to a much smaller share of a now much bigger frame. */
  function plateSize(): [number, number] {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    const cap = source ? Math.min(WORK_MAX, Math.max(source.width, source.height)) : WORK_MAX;
    const scale = Math.min(1, cap / Math.max(w, h));
    return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
  }

  /** Works the traced picture out and fills the plate. Runs when the image arrives, when the host's box
   *  changes size, and when any prop that changes what a pixel is changes, and at no other time. */
  function prepare(): void {
    const [w, h] = plateSize();
    plateW = w;
    plateH = h;
    if (workCtx && source && !failed) {
      work.width = w;
      work.height = h;
      // Resizing a canvas resets its context, and smoothing would soften a source pixel's own edge into a
      // several-pixel ramp exactly where fitting scales a small source up, weakening the gradient below
      // where a real step in the source ever reads.
      workCtx.imageSmoothingEnabled = false;
      workCtx.clearRect(0, 0, w, h);
      const box = fitRect(source.width, source.height, w, h, fitFor(source, props.fit));
      workCtx.drawImage(source.image, box.x, box.y, box.w, box.h);
      const field = contrastField(workCtx.getImageData(0, 0, w, h).data, w, h, props.contrast);
      const smoothed = boxMean(field, w, h, props.smooth);
      const mag = sobelEdges(smoothed, w, h);
      const dirs = edgeDirections(smoothed, w, h);
      const thin = thinRidges(mag, dirs, w, h);
      const lo = Math.min(props.low, props.high);
      const hi = Math.max(props.low, props.high);
      const kept = keepEdges(mag, thin, w, h, lo, hi);
      const coverage = strokeCoverage(kept, w, h, props.weight);
      if (props.invert) for (let i = 0; i < coverage.length; i++) coverage[i] = 1 - (coverage[i] ?? 0);
      const fg = parseColor(palette.colors.fg);
      plate.put(inkPixels(coverage, w, h, fg));
    }
    paint();
  }

  function resized(): void {
    const [w, h] = plateSize();
    if (w !== plateW || h !== plateH) prepare();
    else paint();
  }

  function paint(): void {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    setNote(failed);
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (source && !failed) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(plate.canvas, 0, 0, w, h);
      }
    }
    if (source || failed) host.dataset.picaReady = "true";
  }

  labelHost(host, props.alt);
  load();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const recolored = palette.refresh();
      labelHost(host, props.alt);
      if (props.src !== before.src) {
        load();
      } else if (
        recolored ||
        props.fit !== before.fit ||
        props.contrast !== before.contrast ||
        props.smooth !== before.smooth ||
        props.low !== before.low ||
        props.high !== before.high ||
        props.weight !== before.weight ||
        props.invert !== before.invert
      ) {
        prepare();
      } else {
        paint();
      }
    },
    destroy() {
      cancel();
      setNote(false);
      surface.destroy();
      undoAspect();
      palette.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
