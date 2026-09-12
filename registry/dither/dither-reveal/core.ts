import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { bayerAt } from "../../../lib/dither";
import { blueNoiseMatrix, maskAt } from "../../../lib/dither-mask";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { inkPixels } from "../../../lib/pixels";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount, MotionProps } from "../../../lib/types";

export interface DitherRevealProps extends MotionProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" inks the bright pixels; "dark-on-light" inks the dark ones. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** "blue" reveals in an even grain from a void-and-cluster mask. "bayer" reveals in a visible crosshatch. */
  mask: "blue" | "bayer";
  /** CSS pixels per dithered dot. Higher values give a coarser, more graphic result. */
  scale: number;
  /** Milliseconds the picture takes to dissolve fully in, and again to dissolve fully out. */
  reveal: number;
  /** Milliseconds the finished picture holds before it dissolves out again. */
  hold: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: DitherRevealProps = {
  src: "",
  alt: "",
  fit: "cover",
  tone: "auto",
  contrast: 1.1,
  mask: "blue",
  scale: 3,
  reveal: 1800,
  hold: 3600,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** Longest side, in plate pixels, the picture is ever prepared at, so a very large host or a small scale
 *  still keeps every frame down to a threshold pass and one putImageData. */
const WORK_MAX = 480;

/** Tile size of the blue noise mask. */
const MASK_SIZE = 32;

/** A threshold no reveal progress ever reaches, for a pixel the finished picture never inks at all. */
const UNREACHABLE = 2;

export const mount: Mount<DitherRevealProps> = (host, initial = {}) => {
  let props: DitherRevealProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let ready = false;
  let plateW = 0;
  let plateH = 0;
  let started = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  let fg: [number, number, number, number] = [0, 0, 0, 0];
  // The order each pixel joins the picture, from the mask, or UNREACHABLE for a pixel too light to ever ink.
  let appear = new Float32Array(0);
  let onBits = new Uint8Array(0);
  let image: ImageData | undefined;

  const sampler = createSampler();
  const surface = createCanvas(host, { autoSize: false, css: "image-rendering:pixelated", onResize: () => resized() });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const palette = watchPalette(host, () => prepare());

  function load(): void {
    cancel();
    failed = false;
    cancel = loadSource(props.src, use, () => {
      source = null;
      ready = false;
      failed = true;
      if (started) loop.redraw();
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

  /** The plate size for the host's box at `scale` CSS pixels a dot, capped on its longer side so a frame
   *  never has to sweep more than WORK_MAX by WORK_MAX pixels. */
  function plateSize(): [number, number] {
    const cols = Math.max(1, Math.round(surface.cssWidth / props.scale));
    const rows = Math.max(1, Math.round(surface.cssHeight / props.scale));
    const shrink = Math.min(1, WORK_MAX / Math.max(cols, rows));
    return [Math.max(1, Math.round(cols * shrink)), Math.max(1, Math.round(rows * shrink))];
  }

  /** Works out which order every pixel joins the picture in. It runs when the image arrives, when the
   *  host's size or scale changes, and when a color, tone, or mask prop changes, and at no other time: every
   *  frame afterwards only compares this array to the current progress. */
  function prepare(): void {
    const [w, h] = plateSize();
    plateW = w;
    plateH = h;
    canvas.width = w;
    canvas.height = h;
    ready = false;
    fg = parseColor(palette.colors.fg);
    image = undefined;
    if (source && !failed) {
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols: w, rows: h, aspect: 1, n: 1, fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      if (appear.length !== w * h) appear = new Float32Array(w * h);
      // Void and cluster, or the ordered Bayer matrix in its place: each gives every pixel a distinct,
      // evenly spread threshold. A pixel joins once the reveal passes its own, so the whole picture ever
      // stays an even, thickening halftone instead of filling in from one side.
      const blue = props.mask === "blue" ? blueNoiseMatrix(MASK_SIZE) : null;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const m = blue ? maskAt(blue, MASK_SIZE, x, y) : bayerAt(8, x, y);
          appear[i] = (ink[i] ?? 0) >= m ? m : UNREACHABLE;
        }
      }
      ready = true;
    }
    if (started) loop.redraw();
  }

  function resized(): void {
    const [w, h] = plateSize();
    if (w !== plateW || h !== plateH) prepare();
    else if (started) loop.redraw();
  }

  /** How much of the picture has joined at animation time t: a rise over `reveal` ms, a hold at 1, and a
   *  fall back over another `reveal` ms, before the cycle repeats. */
  function densityAt(t: number, p: DitherRevealProps): number {
    const reveal = Math.max(1, p.reveal);
    const hold = Math.max(0, p.hold);
    const cycle = reveal * 2 + hold;
    const pos = ((t % cycle) + cycle) % cycle;
    if (pos < reveal) return pos / reveal;
    if (pos < reveal + hold) return 1;
    return 1 - (pos - reveal - hold) / reveal;
  }

  /** The frame reduced motion holds: the middle of the hold, where the picture is fully inked. With no
   *  hold at all, the last moment of the rise, which is the nearest frame to it. */
  function stillAt(p: DitherRevealProps): number {
    const reveal = Math.max(1, p.reveal);
    const hold = Math.max(0, p.hold);
    return hold > 0 ? reveal + hold / 2 : reveal - 1;
  }

  function draw(t: number): void {
    setNote(failed);
    if (ctx && ready) {
      const progress = densityAt(t, props);
      if (onBits.length !== plateW * plateH) onBits = new Uint8Array(plateW * plateH);
      for (let i = 0; i < appear.length; i++) onBits[i] = (appear[i] ?? UNREACHABLE) <= progress ? 1 : 0;
      image = inkPixels(onBits, plateW, plateH, fg, image);
      ctx.putImageData(image, 0, 0);
    } else if (ctx) {
      ctx.clearRect(0, 0, plateW, plateH);
    }
    if (source || failed) host.dataset.picaReady = "true";
  }

  labelHost(host, props.alt);
  load();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: stillAt(props), frame: draw });
  started = true;

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const recolored = palette.refresh();
      labelHost(host, props.alt);
      loop.update({ paused: props.paused, time: props.time, fps: props.fps, still: stillAt(props) });
      if (props.src !== before.src) {
        load();
      } else if (
        recolored ||
        props.fit !== before.fit ||
        props.tone !== before.tone ||
        props.contrast !== before.contrast ||
        props.mask !== before.mask ||
        props.scale !== before.scale
      ) {
        prepare();
      } else {
        loop.redraw();
      }
    },
    destroy() {
      loop.destroy();
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
