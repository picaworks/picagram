import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPlate, inkPixels } from "../../../lib/pixels";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount, MotionProps } from "../../../lib/types";

export interface SlitScanImageProps extends MotionProps {
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
  /** The sweep's direction: across a horizontal frame, or down a vertical one. */
  axis: "horizontal" | "vertical";
  /** The slit's width in pixels, and how far behind it a column still keeps its own place before it lags. */
  width: number;
  /** How far the sampled column lags the drawn one once it falls behind the slit: 0 for none, 1 for the most. */
  amount: number;
  /** How fast the slit sweeps across the frame, 0 for nearly still and 1 for fastest. */
  speed: number;
  /** Wraps the sweep back to the start instead of reversing direction. */
  wrap: boolean;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: SlitScanImageProps = {
  src: "",
  alt: "",
  fit: "cover",
  tone: "auto",
  contrast: 1.1,
  axis: "horizontal",
  width: 8,
  amount: 0.5,
  speed: 0.25,
  wrap: true,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** Longest side, in pixels, of the copy the plate is made at. The picture is worked out at this size once,
 *  so a frame only ever copies pixels from it and never reads or resamples the source again. */
const WORK_MAX = 480;

/** A full sweep takes this many milliseconds at speed 1, and longer as speed falls, so the default speed of
 *  0.25 sweeps once every 3.6 seconds and puts the slit a third of the way across at the 1200 ms capture. */
const SWEEP_BASE_MS = 900;

/** A floor under speed, so a speed of 0 sweeps very slowly instead of freezing the sweep's own math. */
const MIN_SPEED = 0.02;

export const mount: Mount<SlitScanImageProps> = (host, initial = {}) => {
  let props: SlitScanImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let ready = false;
  let plateW = 0;
  let plateH = 0;
  let started = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  // Reused every frame so the sweep never allocates in its hot path.
  let map = new Int32Array(0);

  const sampler = createSampler();
  // The picture worked out once, so every frame only ever draws from it, never rebuilds it.
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
   *  plate maps onto the host one to one on the short side and a frame never has to fit or offset it. */
  function plateSize(): [number, number] {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    const scale = Math.min(1, WORK_MAX / Math.max(w, h));
    return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
  }

  /** Works the picture out and fills the plate. It runs when the image arrives, when the host's size
   *  changes, and when a color, fit, tone, or contrast prop changes, and at no other time. */
  function prepare(): void {
    const [w, h] = plateSize();
    plateW = w;
    plateH = h;
    ready = false;
    if (source && !failed) {
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols: w, rows: h, aspect: 1, n: 1, fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      picture.put(inkPixels(ink, w, h, parseColor(palette.colors.fg)));
      ready = true;
    }
    if (started) loop.redraw();
  }

  function resized(): void {
    const [w, h] = plateSize();
    if (w !== plateW || h !== plateH) prepare();
    else if (started) loop.redraw();
  }

  /** Milliseconds one full sweep takes: shorter as speed rises, floored so a near-zero speed still finishes
   *  a sweep eventually instead of dividing by nothing. */
  function period(): number {
    return SWEEP_BASE_MS / Math.max(props.speed, MIN_SPEED);
  }

  /** The slit's position along the sweep axis, in plate pixels, at animation time t. With wrap it is a
   *  sawtooth that snaps back to the start; otherwise it is a triangle that reverses at each end. */
  function slitAt(t: number, length: number): number {
    const p = period();
    if (props.wrap) {
      const cycle = ((t % p) + p) % p;
      return (cycle / p) * length;
    }
    const span = p * 2;
    const cycle = ((t % span) + span) % span;
    const frac = cycle <= p ? cycle / p : 2 - cycle / p;
    return frac * length;
  }

  /** The frame reduced motion holds: the slit a third of the way through a sweep, matching the 1200 ms
   *  capture at the default speed, where the subject is recognisable on one side and streaked on the other. */
  function stillAt(): number {
    return period() / 3;
  }

  /** Fills `map` with the rounded source position for every drawn position along the sweep axis. Ahead of
   *  the slit a position draws its own place, unchanged. Behind it, the source lags further behind the
   *  longer the slit has been gone, eased in over `width` pixels so the slit's own edge draws no seam. */
  function remap(length: number, slit: number): void {
    const band = Math.max(1, props.width);
    const amount = Math.min(1, Math.max(0, props.amount));
    for (let p = 0; p < length; p++) {
      if (p >= slit) {
        map[p] = p;
        continue;
      }
      const age = slit - p;
      const eased = Math.min(age / band, 1);
      const src = p + eased * amount * age;
      map[p] = Math.min(length - 1, Math.max(0, Math.round(src)));
    }
  }

  function draw(t: number): void {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    setNote(failed);
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
    }
    if (ctx && ready && plateW > 0 && plateH > 0) {
      const horizontal = props.axis === "horizontal";
      const length = horizontal ? plateW : plateH;
      if (map.length !== length) map = new Int32Array(length);
      const slit = slitAt(t, length);
      remap(length, slit);
      // Plate pixels along the sweep axis onto CSS pixels: at least one to one, since the plate never
      // exceeds the host's own size.
      const destScale = (horizontal ? w : h) / length;
      ctx.imageSmoothingEnabled = false;
      let runStart = 0;
      let runOffset = (map[0] ?? 0) - 0;
      for (let p = 1; p <= length; p++) {
        const offset = p < length ? (map[p] ?? 0) - p : Number.NaN;
        if (p < length && offset === runOffset) continue;
        const from = runStart + runOffset;
        const dx0 = Math.round(runStart * destScale);
        const dx1 = Math.round(p * destScale);
        if (dx1 > dx0) {
          if (horizontal) ctx.drawImage(picture.canvas, from, 0, p - runStart, plateH, dx0, 0, dx1 - dx0, h);
          else ctx.drawImage(picture.canvas, 0, from, plateW, p - runStart, 0, dx0, w, dx1 - dx0);
        }
        runStart = p;
        runOffset = offset;
      }
    }
    if (source || failed) host.dataset.picaReady = "true";
  }

  labelHost(host, props.alt);
  load();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: stillAt(), frame: draw });
  started = true;

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const recolored = palette.refresh();
      labelHost(host, props.alt);
      loop.update({ paused: props.paused, time: props.time, fps: props.fps, still: stillAt() });
      if (props.src !== before.src) {
        load();
      } else if (
        recolored ||
        props.fit !== before.fit ||
        props.tone !== before.tone ||
        props.contrast !== before.contrast
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
