import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { hostTone, parseColor } from "../../../lib/color";
import { watchPalette } from "../../../lib/palette";
import { fitRect } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface PixelSortProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** The line the sort runs along: horizontal rows or vertical columns. */
  direction: "horizontal" | "vertical";
  /** Lower brightness bound, 0 to 1. A pixel at or below it ends a run instead of joining it. */
  low: number;
  /** Upper brightness bound, 0 to 1. A pixel at or above it ends a run instead of joining it. */
  high: number;
  /** Keeps the source's own colors. Off renders one ink tone by luminance instead. */
  color: boolean;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" inks the bright pixels; "dark-on-light" inks the dark ones. Has no effect when color is true. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
}

export const defaults: PixelSortProps = {
  src: "",
  alt: "",
  direction: "horizontal",
  low: 0.25,
  high: 0.8,
  color: false,
  fit: "cover",
  tone: "auto",
};

/** Longest side, in pixels, the source is downscaled to before sorting, so the one-time sort stays fast. */
const WORK_MAX = 480;

/** Perceptual brightness of one pixel, 0 to 1. */
function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Sorts pixels darkest to brightest within each run that clears `low` and stays under `high`, along rows
 *  (`vertical` false) or columns (`vertical` true). A pixel outside that band anchors the runs on either
 *  side of it and never moves itself. Mutates `data` in place. */
function sortPixels(data: Uint8ClampedArray, width: number, height: number, vertical: boolean, low: number, high: number): void {
  const count = width * height;
  const bright = new Float32Array(count);
  for (let p = 0; p < count; p++) {
    const o = p * 4;
    bright[p] = luma(data[o] ?? 0, data[o + 1] ?? 0, data[o + 2] ?? 0);
  }
  const lines = vertical ? width : height;
  const length = vertical ? height : width;
  const at = (line: number, pos: number): number => (vertical ? pos * width + line : line * width + pos);
  // Scratch space for one run, reused across every line so sorting never allocates in the hot path.
  const order = new Uint32Array(length);
  const rTmp = new Uint8ClampedArray(length);
  const gTmp = new Uint8ClampedArray(length);
  const bTmp = new Uint8ClampedArray(length);
  const aTmp = new Uint8ClampedArray(length);

  for (let line = 0; line < lines; line++) {
    let start = -1;
    for (let pos = 0; pos <= length; pos++) {
      const value = pos < length ? bright[at(line, pos)] ?? 0 : 0;
      const inRun = pos < length && value > low && value < high;
      if (inRun) {
        if (start === -1) start = pos;
        continue;
      }
      if (start !== -1) {
        const n = pos - start;
        if (n > 1) {
          for (let i = 0; i < n; i++) order[i] = start + i;
          const run = order.subarray(0, n);
          run.sort((a, b) => (bright[at(line, a)] ?? 0) - (bright[at(line, b)] ?? 0));
          for (let i = 0; i < n; i++) {
            const src = at(line, run[i] ?? 0) * 4;
            rTmp[i] = data[src] ?? 0;
            gTmp[i] = data[src + 1] ?? 0;
            bTmp[i] = data[src + 2] ?? 0;
            aTmp[i] = data[src + 3] ?? 0;
          }
          for (let i = 0; i < n; i++) {
            const dst = at(line, start + i) * 4;
            data[dst] = rTmp[i] ?? 0;
            data[dst + 1] = gTmp[i] ?? 0;
            data[dst + 2] = bTmp[i] ?? 0;
            data[dst + 3] = aTmp[i] ?? 0;
          }
        }
        start = -1;
      }
    }
  }
}

/** Recolors already-sorted pixels to one ink tone by luminance, in place. */
function inkTint(data: Uint8ClampedArray, lightOnDark: boolean, ink: readonly [number, number, number, number]): void {
  const [ir, ig, ib, ia] = ink;
  const inkAlpha = ia / 255;
  for (let p = 0; p < data.length; p += 4) {
    const value = luma(data[p] ?? 0, data[p + 1] ?? 0, data[p + 2] ?? 0);
    const srcAlpha = (data[p + 3] ?? 0) / 255;
    data[p] = ir;
    data[p + 1] = ig;
    data[p + 2] = ib;
    data[p + 3] = (lightOnDark ? value : 1 - value) * srcAlpha * inkAlpha * 255;
  }
}

export const mount: Mount<PixelSortProps> = (host, initial = {}) => {
  let props: PixelSortProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  // The source, downscaled and sorted once. Redrawn straight from here for a resize, a color, or a tone change.
  let sorted: ImageData | null = null;

  const work = document.createElement("canvas");
  const workCtx = work.getContext("2d", { willReadFrequently: true });
  const surface = createCanvas(host, { onResize: () => draw() });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const palette = watchPalette(host, () => draw());

  function load(): void {
    cancel();
    failed = false;
    cancel = loadSource(props.src, use, () => {
      source = null;
      sorted = null;
      failed = true;
      draw();
    });
  }

  function use(next: Source): void {
    source = next;
    // A host with no height of its own takes the image's proportions.
    undoAspect();
    undoAspect = fitHostAspect(host, next.width, next.height);
    process();
  }

  function setNote(on: boolean): void {
    if (on && !removeNote) removeNote = showNote(host, "image unavailable");
    if (!on && removeNote) {
      removeNote();
      removeNote = null;
    }
  }

  /** Downscales the source and sorts it once. Only `draw` runs again for a resize or a color or tone change. */
  function process(): void {
    if (!workCtx || !source || source.width <= 0 || source.height <= 0) {
      sorted = null;
      draw();
      return;
    }
    const scale = Math.min(1, WORK_MAX / Math.max(source.width, source.height));
    const w = Math.max(1, Math.round(source.width * scale));
    const h = Math.max(1, Math.round(source.height * scale));
    work.width = w;
    work.height = h;
    workCtx.clearRect(0, 0, w, h);
    workCtx.drawImage(source.image, 0, 0, w, h);
    const image = workCtx.getImageData(0, 0, w, h);
    sortPixels(image.data, w, h, props.direction === "vertical", props.low, props.high);
    sorted = image;
    draw();
  }

  function draw(): void {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    setNote(failed);
    if (!ctx) {
      if (source || failed) host.dataset.picaReady = "true";
      return;
    }
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!failed && sorted && workCtx && source) {
      if (props.color) {
        workCtx.putImageData(sorted, 0, 0);
      } else {
        const painted = new ImageData(new Uint8ClampedArray(sorted.data), sorted.width, sorted.height);
        const resolved = props.tone === "auto" ? hostTone(host) : props.tone;
        inkTint(painted.data, resolved === "light-on-dark", parseColor(palette.colors.fg));
        workCtx.putImageData(painted, 0, 0);
      }
      const rect = fitRect(sorted.width, sorted.height, w, h, fitFor(source, props.fit));
      ctx.drawImage(work, rect.x, rect.y, rect.w, rect.h);
    }
    if (source || failed) host.dataset.picaReady = "true";
  }

  labelHost(host, props.alt);
  load();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      palette.refresh();
      labelHost(host, props.alt);
      if (props.src !== before.src) {
        load();
      } else if (props.direction !== before.direction || props.low !== before.low || props.high !== before.high) {
        process();
      } else {
        draw();
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
