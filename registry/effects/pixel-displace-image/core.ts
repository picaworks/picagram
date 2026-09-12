import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { createLoop } from "../../../lib/loop";
import { createNoise } from "../../../lib/noise";
import { watchPalette } from "../../../lib/palette";
import { createPlate, inkPixels } from "../../../lib/pixels";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PixelDisplaceImageProps extends MotionProps {
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
  /** Horizontal bands the picture is cut into. */
  strips: number;
  /** Sideways reach of the widest shear, as a share of the picture's width. */
  amount: number;
  /** How quickly the noise field varies down the picture. Higher reads as more, smaller waves. */
  scale: number;
  /** How fast the shear breathes through its cycle. 0 holds the picture at rest. */
  speed: number;
  /** Share of every cycle the picture spends at rest, with no shear at all. */
  settle: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: PixelDisplaceImageProps = {
  src: "",
  alt: "",
  fit: "cover",
  tone: "auto",
  contrast: 1.1,
  strips: 90,
  amount: 0.06,
  scale: 1,
  speed: 0.2,
  settle: 0.5,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** Longest side, in pixels, of the copy the plate is made at. The picture is worked out at this size once,
 *  so a frame only ever draws bands from it and never reads a pixel back. */
const WORK_MAX = 480;
/** Animation time reduced motion holds. It is also where every cycle rests, so the frame is the picture
 *  fully aligned, the calmest and most legible state it ever has. */
const STILL_TIME = 0;
/** Bands a plate is ever cut into. Matches the strips control's own ceiling, so a scratch buffer sized to
 *  it never has to grow. */
const MAX_STRIPS = 200;
/** Noise cycles the field spans down the whole picture at scale 1, low enough that neighbouring bands move
 *  together and the shear reads as one wave rather than many. */
const FIELD_CYCLES = 1.5;
/** Noise z-units one field-second of time advances, so the wave's shape keeps slowly changing from one
 *  cycle to the next instead of repeating the same shear every time. */
const DRIFT_RATE = 0.3;
/** Field-seconds one rest-shear-rest cycle takes at speed 1. */
const CYCLE_S = 0.5;
/** Band position, measured from the top, that stays put through every cycle, as if the sheet were gripped
 *  there, leaving only the middle free to bow. The bottom mirrors it. */
const ANCHOR = 0.28;
/** Band-position width of the smoothed transition out of the anchored edge and into the free middle. */
const ANCHOR_SOFTEN = 0.16;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** A smooth 0 to 1 ramp between two band positions, flat outside them. */
function edgeRamp(from: number, to: number, bandT: number): number {
  const t = clamp01((bandT - from) / (to - from));
  return t * t * (3 - 2 * t);
}

/** How free a band at `bandT` (0 at the top, 1 at the bottom) is to move: 0 inside the anchored edges, 1
 *  through the free middle, with a smoothed transition between them. */
function verticalWindow(bandT: number): number {
  const rise = edgeRamp(ANCHOR, ANCHOR + ANCHOR_SOFTEN, bandT);
  const fall = 1 - edgeRamp(1 - ANCHOR - ANCHOR_SOFTEN, 1 - ANCHOR, bandT);
  return Math.min(rise, fall);
}

/** The shear's amplitude at `pos`, 0 to 1 through one cycle: held at 0 through a `settle` share of it,
 *  split evenly across the seam so the picture is always at rest there, and a raised-cosine hump through
 *  the rest, so the shear eases in and out with no sudden start or stop. */
function cycleEnvelope(pos: number, settle: number): number {
  const rest = clamp01(settle) / 2;
  const span = 1 - rest * 2;
  if (span <= 0 || pos < rest || pos > 1 - rest) return 0;
  const u = (pos - rest) / span;
  return (1 - Math.cos(u * Math.PI * 2)) / 2;
}

export const mount: Mount<PixelDisplaceImageProps> = (host, initial = {}) => {
  let props: PixelDisplaceImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let ready = false;
  let plateW = 0;
  let plateH = 0;
  let started = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  let cachedSeed = props.seed;
  let noise = createNoise(props.seed);

  const sampler = createSampler();
  // The finished picture, worked out once in ink so a frame only ever draws bands from it.
  const picture = createPlate();
  // Each band's windowed noise value for the current frame, reused every frame so reading the field never
  // allocates in the hot path.
  const field = new Float32Array(MAX_STRIPS);
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

  /** The plate size for the host's box: its own proportions, held under WORK_MAX on the longer side, so a
   *  plate maps onto the host with a single scale factor and a frame never has to fit or offset it. */
  function plateSize(): [number, number] {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    const scale = Math.min(1, WORK_MAX / Math.max(w, h));
    return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
  }

  /** Works the picture out and fills the plate. Runs when the image arrives, when the host's size changes,
   *  and when a color, fit, tone, or contrast prop changes, and at no other time. */
  function prepare(): void {
    const [w, h] = plateSize();
    plateW = w;
    plateH = h;
    ready = false;
    if (source && !failed) {
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols: w, rows: h, aspect: 1, n: 1, fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      const fg = parseColor(palette.colors.fg);
      picture.put(inkPixels(ink, w, h, fg));
      ready = true;
    }
    if (started) loop.redraw();
  }

  function resized(): void {
    const [w, h] = plateSize();
    if (w !== plateW || h !== plateH) prepare();
    else if (started) loop.redraw();
  }

  function draw(t: number): void {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    setNote(failed);
    if (!ctx) {
      if (source || failed) host.dataset.picaReady = "true";
      return;
    }
    ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (ready) {
      if (props.seed !== cachedSeed) {
        cachedSeed = props.seed;
        noise = createNoise(cachedSeed);
      }
      const strips = Math.min(MAX_STRIPS, Math.max(1, Math.round(props.strips)));
      const amountPx = Math.max(0, props.amount) * w;
      const freq = FIELD_CYCLES * Math.max(0.0001, props.scale);
      const timeS = t * 0.001 * Math.max(0, props.speed);
      const nz = timeS * DRIFT_RATE;
      const cyclePos = ((timeS / CYCLE_S) % 1 + 1) % 1;
      const envelope = cycleEnvelope(cyclePos, props.settle);
      // The field is read once per band, windowed, and its own reach for this frame noted. Simplex rarely
      // nears its own extremes, and the exact reach wanders with the seed and the moment, so scaling every
      // band against it, rather than against a fixed gain, is what keeps the widest band always meeting
      // `amount` at full envelope, whatever the field happens to be doing right now.
      let peak = 1e-4;
      for (let i = 0; i < strips; i++) {
        const center = (i + 0.5) / strips;
        const v = noise.noise2(center * freq, nz) * verticalWindow(center);
        field[i] = v;
        if (Math.abs(v) > peak) peak = Math.abs(v);
      }
      const gain = (envelope * amountPx) / peak;
      // Each band is one bounded drawImage call from the prepared plate: nothing here reads a pixel back.
      for (let i = 0; i < strips; i++) {
        const t0 = i / strips;
        const t1 = (i + 1) / strips;
        const shift = Math.round((field[i] ?? 0) * gain);
        const srcY = Math.round(t0 * plateH);
        const srcH = Math.max(1, Math.round(t1 * plateH) - srcY);
        const destY = Math.round(t0 * h);
        const destH = Math.max(1, Math.round(t1 * h) - destY);
        ctx.drawImage(picture.canvas, 0, srcY, plateW, srcH, shift, destY, w, destH);
      }
    }
    if (source || failed) host.dataset.picaReady = "true";
  }

  labelHost(host, props.alt);
  load();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame: draw });
  started = true;

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const recolored = palette.refresh();
      labelHost(host, props.alt);
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      if (props.src !== before.src) {
        load();
      } else if (recolored || props.fit !== before.fit || props.tone !== before.tone || props.contrast !== before.contrast) {
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
