import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { bayerAt } from "../../../lib/dither";
import { blueNoiseMatrix, maskAt } from "../../../lib/dither-mask";
import { watchPalette } from "../../../lib/palette";
import { createPlate, inkPixels } from "../../../lib/pixels";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface DitherPosterImageProps {
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
  /** Flat tone bands the image posterizes into. */
  levels: number;
  /** Width of the dithered transition at each step, as a share of the tone range. 0 is a hard edge. */
  band: number;
  /** The ordered mask that screens a transition: a Bayer matrix, or a blue noise pattern. */
  mask: "bayer" | "blue";
  /** CSS pixels per posterized pixel. Higher values give a coarser, more graphic result. */
  scale: number;
}

export const defaults: DitherPosterImageProps = {
  src: "",
  alt: "",
  fit: "cover",
  tone: "auto",
  contrast: 1.1,
  levels: 4,
  band: 0.12,
  mask: "bayer",
  scale: 2,
};

/** Bayer matrix size for the "bayer" mask: the finest one lib/dither.ts offers. */
const BAYER_SIZE = 8;
/** Blue noise mask size for the "blue" mask: fine enough that its own tiling stays invisible in a transition. */
const BLUE_SIZE = 32;

/** The tone band, from 0 to levels - 1, that `t` falls in once `mask` has nudged it by up to half of `band`.
 *  Farther from a step than that the nudge can never cross it, so the tone reads exactly flat; only inside
 *  the band does the mask decide which side a pixel lands on, which is what turns a hard step into a dot
 *  gradient the width of `band` instead of screening the whole picture the way lib/dither.ts's own
 *  threshold does across the full range. At `band` 0 this is plain posterizing, with no dither at all. */
function bandAt(t: number, levels: number, band: number, mask: number): number {
  const top = levels - 1;
  const shifted = (t - (mask - 0.5) * band) * levels;
  if (shifted <= 0) return 0;
  return shifted >= levels ? top : Math.floor(shifted);
}

export const mount: Mount<DitherPosterImageProps> = (host, initial = {}) => {
  let props: DitherPosterImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let ready = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  const sampler = createSampler();
  // The finished picture, worked out once in prepare() and only ever drawn from afterward.
  const plate = createPlate();
  const surface = createCanvas(host, { autoSize: false, css: "image-rendering:pixelated", onResize: () => resized() });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const palette = watchPalette(host, () => prepare());

  function load(): void {
    cancel();
    failed = false;
    cancel = loadSource(props.src, use, () => {
      source = null;
      failed = true;
      paint();
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

  /** The plate's size: the host's box at one pixel per `scale` CSS pixels. The visible canvas is sized to
   *  match exactly, so painting it is a plain copy and the CSS upscale that follows is what stays crisp. */
  function plateSize(): [number, number] {
    return [Math.max(1, Math.round(host.clientWidth / props.scale)), Math.max(1, Math.round(host.clientHeight / props.scale))];
  }

  /** Samples the source and posterizes it into the plate. Runs once the image arrives, and again whenever
   *  anything that changes what a pixel is does: the fit, the tone, the contrast, the level count, the band,
   *  the mask, the plate's own size, or the palette. A resize that leaves the plate's size unchanged skips
   *  this and only repaints. */
  function prepare(): void {
    const [cols, rows] = plateSize();
    canvas.width = cols;
    canvas.height = rows;
    ready = false;
    if (source && !failed) {
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols, rows, aspect: 1, n: 1, fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      const levels = Math.max(2, props.levels);
      const bandWidth = Math.min(0.5, Math.max(0, props.band));
      const blue = props.mask === "blue" ? blueNoiseMatrix(BLUE_SIZE) : null;
      const coverage = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const m = blue ? maskAt(blue, BLUE_SIZE, x, y) : bayerAt(BAYER_SIZE, x, y);
          coverage[i] = bandAt(ink[i] ?? 0, levels, bandWidth, m) / (levels - 1);
        }
      }
      plate.put(inkPixels(coverage, cols, rows, parseColor(palette.colors.fg)));
      ready = true;
    }
    paint();
  }

  /** Draws the prepared plate onto the visible canvas. Never resamples or redithers, so a redundant resize
   *  or an unrelated prop change costs one clear and one drawImage. */
  function paint(): void {
    setNote(failed);
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (ready) ctx.drawImage(plate.canvas, 0, 0);
    }
    if (source || failed) host.dataset.picaReady = "true";
  }

  function resized(): void {
    const [cols, rows] = plateSize();
    if (cols !== canvas.width || rows !== canvas.height) prepare();
    else paint();
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
        props.tone !== before.tone ||
        props.contrast !== before.contrast ||
        props.levels !== before.levels ||
        props.band !== before.band ||
        props.mask !== before.mask ||
        props.scale !== before.scale
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
