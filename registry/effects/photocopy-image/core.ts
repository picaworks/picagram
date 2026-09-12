import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { boxMean, sobelEdges } from "../../../lib/filter";
import { watchPalette } from "../../../lib/palette";
import { createPlate, inkPixels } from "../../../lib/pixels";
import { createRng, hashSeed } from "../../../lib/rng";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface PhotocopyImageProps {
  /** Image URL or data URI. Empty draws the built-in lit sphere, so it renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" inks the bright pixels; "dark-on-light" inks the dark ones. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** Contrast around mid grey before the threshold sees it. 1 leaves the image as it is. */
  contrast: number;
  /** Side of the square window the local mean is measured over, in pixels. A small window keeps shadow detail; a window as large as the picture reads as one plain threshold. */
  window: number;
  /** How far above the local mean a pixel must sit to become ink. Zero lets a flat area fill with speckle from noise alone. */
  bias: number;
  /** Share of the ground dusted with toner specks, drawn from the seed. */
  speckle: number;
  /** Share of the strong edges that trail a short streak into the ground below them, drawn from the seed. */
  streaks: number;
  /** Swaps ink and ground. */
  invert: boolean;
  /** Seed for every speck and streak, so the same seed always prints the same copy. */
  seed: number;
}

export const defaults: PhotocopyImageProps = {
  src: "",
  alt: "",
  fit: "cover",
  tone: "auto",
  contrast: 1.1,
  window: 24,
  bias: 0.06,
  speckle: 0.25,
  streaks: 0.35,
  invert: false,
  seed: 1,
};

/** Longest side, in pixels, of the copy the plate is worked out at. The threshold, the specks, and the
 *  streaks are all worked out once at this size, which keeps the one-time pass short and gives the plate a
 *  size no frame ever has to fit or scale itself. */
const PLATE_MAX = 480;

/** Gradient magnitude, on the already-thresholded picture, above which a pixel counts as a strong edge worth
 *  trailing a streak from. Measured on ink and ground rather than on the source photo, so a smoothly shaded
 *  subject still reads as a hard boundary once it is two tones. */
const EDGE_STRONG = 0.5;

/** Grid step, in plate pixels, that candidate streaks are sampled on, so two candidates never start close
 *  enough together to read as one wide blot. */
const STREAK_GRID = 6;

/** Share of a candidate point that starts a streak, at streaks = 1. Kept small: most strong edges never grow
 *  one, so the ones that do read as incidents rather than a border. */
const STREAK_CHANCE = 0.05;

/** Shortest and longest streak, in plate pixels. */
const STREAK_MIN = 3;
const STREAK_MAX = 9;

/** Share of ground pixels a speck can turn to ink, at speckle = 1. Kept small: even a heavy dusting should
 *  read as toner scatter, not static. */
const SPECKLE_CEILING = 0.0015;

/** Independent seed streams, so turning speckle up and down never reshuffles where the streaks fall. */
const SPECKLE_STREAM = 1;
const STREAK_STREAM = 2;

/** Bradley and Roth's adaptive threshold over `ink`: a pixel becomes ink when it clears the mean of the
 *  square window around it by `bias`, scaled down where that mean is already bright, which is the paper's
 *  own multiplicative margin carried into ink space rather than intensity space. The ground is then dusted
 *  with seeded specks, and a few of the strong edges left in the threshold trail a short, fading streak into
 *  the ground below them. Returns 1 where ink goes, row-major. Every decision about what a pixel is lives
 *  here, so prepare can call it once and draw only ever blits the result. */
function photocopyBits(ink: Float32Array, w: number, h: number, p: PhotocopyImageProps): Uint8Array {
  const radius = Math.max(1, Math.round(p.window / 2));
  const mean = boxMean(ink, w, h, radius);
  const bits = new Uint8Array(w * h);
  for (let i = 0; i < bits.length; i++) {
    const m = mean[i] ?? 0;
    bits[i] = (ink[i] ?? 0) > m + p.bias * (1 - m) ? 1 : 0;
  }

  if (p.streaks > 0) {
    const edges = sobelEdges(bits, w, h);
    const streakRng = createRng(hashSeed(p.seed, STREAK_STREAM));
    const chance = p.streaks * STREAK_CHANCE;
    for (let y = 0; y < h; y += STREAK_GRID) {
      for (let x = 0; x < w; x += STREAK_GRID) {
        const i = y * w + x;
        if (bits[i] !== 1 || (edges[i] ?? 0) < EDGE_STRONG || streakRng() >= chance) continue;
        const length = STREAK_MIN + Math.floor(streakRng() * (STREAK_MAX - STREAK_MIN + 1));
        for (let step = 1; step <= length; step++) {
          const py = y + step;
          if (py >= h) break;
          const fade = 1 - step / length;
          const jitter = streakRng();
          const px = x + (jitter < 0.15 ? -1 : jitter > 0.85 ? 1 : 0);
          if (px >= 0 && px < w && streakRng() < fade) bits[py * w + px] = 1;
        }
      }
    }
  }

  if (p.speckle > 0) {
    const speckleRng = createRng(hashSeed(p.seed, SPECKLE_STREAM));
    const density = p.speckle * SPECKLE_CEILING;
    for (let i = 0; i < bits.length; i++) if (bits[i] === 0 && speckleRng() < density) bits[i] = 1;
  }

  if (p.invert) for (let i = 0; i < bits.length; i++) bits[i] = bits[i] === 1 ? 0 : 1;
  return bits;
}

export const mount: Mount<PhotocopyImageProps> = (host, initial = {}) => {
  let props: PhotocopyImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let ready = false;
  let plateW = 0;
  let plateH = 0;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;

  const sampler = createSampler();
  // The finished copy, worked out once and only ever blitted back. Nothing reads a pixel back per frame.
  const picture = createPlate();
  const surface = createCanvas(host, { onResize: () => resized() });
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

  /** The plate size for the host's box: its own proportions, held under PLATE_MAX on the longer side, so the
   *  plate maps onto the host one to one and draw never has to fit or offset it. */
  function plateSize(): [number, number] {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    const scale = Math.min(1, PLATE_MAX / Math.max(w, h));
    return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
  }

  /** Works the copy out and fills the plate. Runs when the image arrives, when the host's box changes size,
   *  and when a prop that changes what a pixel is changes, and at no other time. */
  function prepare(): void {
    const [w, h] = plateSize();
    plateW = w;
    plateH = h;
    ready = false;
    if (source && !failed) {
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols: w, rows: h, aspect: 1, n: 1, fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      const bits = photocopyBits(ink, w, h, props);
      const fg = parseColor(palette.colors.fg);
      picture.put(inkPixels(bits, w, h, fg));
      ready = true;
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
      if (ready) {
        // The plate holds one-bit dots: smoothing them on the way up would turn the copy into a grey wash.
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(picture.canvas, 0, 0, w, h);
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
        props.window !== before.window ||
        props.bias !== before.bias ||
        props.speckle !== before.speckle ||
        props.streaks !== before.streaks ||
        props.invert !== before.invert ||
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
