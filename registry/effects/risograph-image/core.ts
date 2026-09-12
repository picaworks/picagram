import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { blueNoiseMatrix, maskAt } from "../../../lib/dither-mask";
import { watchPalette } from "../../../lib/palette";
import { createPlate, inkPixels } from "../../../lib/pixels";
import { createRng, hashSeed } from "../../../lib/rng";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface RisographImageProps {
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
  /** Pixels the accent pass shifts from the fg pass, the misregistration a second drum leaves on the sheet. */
  offset: number;
  /** Degrees clockwise from three o'clock, the direction the accent pass shifts away from the fg pass. */
  angle: number;
  /** Pixels per screen cell, at the plate's own resolution. Coarser reads as a bigger dot at arm's length. */
  grain: number;
  /** The tone that divides the two passes. Darker than this prints in fg; lighter prints in accent. */
  split: number;
  /** Ink a pass lays down at its fullest tone, short of solid so the paper always shows through. */
  coverage: number;
  /** Seed for the screen's placement. The same seed always draws the same grain. */
  seed: number;
}

export const defaults: RisographImageProps = {
  src: "",
  alt: "",
  fit: "cover",
  tone: "auto",
  contrast: 1.1,
  offset: 2,
  angle: 200,
  grain: 4,
  split: 0.45,
  coverage: 0.85,
  seed: 1,
};

/** Longest side, in plate pixels, the picture is worked out at. Both passes share one plate, so the one-time
 *  pass stays short and a resize that keeps the same plate size only has to move it and redraw. */
const WORK_MAX = 480;

/** Side length of the blue noise tile each pass screens through. lib/dither-mask.ts builds and caches it
 *  once, so every risograph-image on a page shares the cost. */
const MASK_SIZE = 32;

export const mount: Mount<RisographImageProps> = (host, initial = {}) => {
  let props: RisographImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let plateW = 0;
  let plateH = 0;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;

  const sampler = createSampler();
  // The shadow pass in fg and the midtone pass in accent, each worked out once and only drawn from after.
  const fgPlate = createPlate();
  const accentPlate = createPlate();
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
      draw();
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

  /** The plate size for the host's box: its own proportions, held under WORK_MAX on the longer side, so a
   *  plate maps onto the host at its own resolution and a frame never has to fit or scale it. */
  function plateSize(): [number, number] {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    const scale = Math.min(1, WORK_MAX / Math.max(w, h));
    return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
  }

  /** Works out which pixels each pass inks and fills both plates. Runs when the image arrives, when the
   *  plate's own size changes, and when a color or another per-pixel prop changes. Offset and angle only
   *  move a finished plate, so they redraw alone: see draw(). */
  function prepare(): void {
    const [w, h] = plateSize();
    plateW = w;
    plateH = h;
    if (source && !failed) {
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols: w,
        rows: h,
        aspect: 1,
        n: 1,
        fit: fitFor(source, props.fit),
        tone: props.tone,
        contrast: props.contrast,
        mirror: false,
      });
      const mask = blueNoiseMatrix(MASK_SIZE);
      const grain = Math.max(1, props.grain);
      const split = Math.min(1, Math.max(0, props.split));
      const coverage = Math.min(1, Math.max(0, props.coverage));
      // The tone span each side of the split scales into 0..coverage, so both passes fade to nothing right
      // at the split and never quite reach solid at their own extreme.
      const shadowSpan = Math.max(1e-6, 1 - split);
      const lightSpan = Math.max(1e-6, split);
      // Two independent streams, so the fg screen and the accent screen never share a placement.
      const fgRng = createRng(hashSeed(props.seed, 1));
      const fgPhaseX = Math.floor(fgRng() * MASK_SIZE);
      const fgPhaseY = Math.floor(fgRng() * MASK_SIZE);
      const acRng = createRng(hashSeed(props.seed, 2));
      const acPhaseX = Math.floor(acRng() * MASK_SIZE);
      const acPhaseY = Math.floor(acRng() * MASK_SIZE);
      const fgBits = new Uint8Array(w * h);
      const acBits = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const v = ink[i] ?? 0;
          const cx = Math.floor(x / grain);
          const cy = Math.floor(y / grain);
          if (v >= split) {
            const density = ((v - split) / shadowSpan) * coverage;
            fgBits[i] = density >= maskAt(mask, MASK_SIZE, cx + fgPhaseX, cy + fgPhaseY) ? 1 : 0;
          } else {
            // A ridge across the accent's own span, not a slope: density fades to nothing at no ink at all
            // and again at the fg boundary, so only the middle of the midtones ever nears coverage, and an
            // unpainted pixel next to the sphere never picks up a stray accent dot.
            const density = (1 - Math.abs((v / lightSpan) * 2 - 1)) * coverage;
            // A quarter turn of the same tile, so the accent screen never lines up with the fg one.
            acBits[i] = density >= maskAt(mask, MASK_SIZE, cy + acPhaseX, -cx + acPhaseY) ? 1 : 0;
          }
        }
      }
      fgPlate.put(inkPixels(fgBits, w, h, parseColor(palette.colors.fg)));
      accentPlate.put(inkPixels(acBits, w, h, parseColor(palette.colors.accent)));
    }
    draw();
  }

  function resized(): void {
    const [w, h] = plateSize();
    if (w !== plateW || h !== plateH) prepare();
    else draw();
  }

  function draw(): void {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    setNote(failed);
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (source && !failed && plateW > 0) {
        // One-bit plates, drawn crisp: the grain is a screen, not a blur.
        ctx.imageSmoothingEnabled = false;
        const scale = w / plateW;
        const rad = (props.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * props.offset * scale;
        const dy = Math.sin(rad) * props.offset * scale;
        ctx.drawImage(fgPlate.canvas, 0, 0, w, h);
        ctx.drawImage(accentPlate.canvas, dx, dy, w, h);
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
        props.tone !== before.tone ||
        props.contrast !== before.contrast ||
        props.split !== before.split ||
        props.coverage !== before.coverage ||
        props.grain !== before.grain ||
        props.seed !== before.seed
      ) {
        prepare();
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
