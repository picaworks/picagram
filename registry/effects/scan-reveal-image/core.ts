import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { bayerAt } from "../../../lib/dither";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPlate, inkPixels } from "../../../lib/pixels";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ScanRevealImageProps extends MotionProps {
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
  /** Milliseconds one sweep takes, from the top edge to the bottom. */
  duration: number;
  /** Milliseconds the finished picture holds at the end of a sweep, before the next one starts. */
  hold: number;
  /** The scan bar's thickness in pixels. The bar is the one mark drawn in the accent. */
  bar: number;
  /** How much ink the sparse dither keeps where the scan has not reached yet, 0 to 1. */
  preview: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: ScanRevealImageProps = {
  src: "",
  alt: "",
  fit: "cover",
  tone: "auto",
  contrast: 1.1,
  duration: 5000,
  hold: 2000,
  bar: 2,
  preview: 0.25,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** Longest side, in pixels, of the copy the plates are made at. The picture is worked out at this size once,
 *  which keeps the one-time pass short and every frame down to two drawImage calls and a fill. */
const WORK_MAX = 480;

export const mount: Mount<ScanRevealImageProps> = (host, initial = {}) => {
  let props: ScanRevealImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let ready = false;
  let plateW = 0;
  let plateH = 0;
  let started = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;

  const sampler = createSampler();
  // The two states the sweep moves between, each worked out once and then only drawn from. The picture is the
  // finished image in ink; the preview is the same image as sparse dither, at the share of the ink `preview`
  // asks for. Nothing reads a pixel back per frame, which is what holds a frame inside its budget.
  const picture = createPlate();
  const preview = createPlate();
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
   *  plate maps onto the host one to one and a frame never has to fit or offset it. */
  function plateSize(): [number, number] {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    const scale = Math.min(1, WORK_MAX / Math.max(w, h));
    return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
  }

  /** Works the picture out and fills both plates. It runs when the image arrives, when the host's size
   *  changes, and when a color or a tone prop changes, and at no other time. */
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
      // Ordered dither of the same ink, held down to the share `preview` keeps, so the sparse state reads as
      // the picture with most of its ink missing rather than as noise over it.
      const dots = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          dots[i] = (ink[i] ?? 0) * props.preview >= bayerAt(8, x, y) ? 1 : 0;
        }
      }
      preview.put(inkPixels(dots, w, h, fg));
      ready = true;
    }
    if (started) loop.redraw();
  }

  function resized(): void {
    const [w, h] = plateSize();
    if (w !== plateW || h !== plateH) prepare();
    else if (started) loop.redraw();
  }

  /** The frame reduced motion holds: half way through the hold, where the whole picture is finished and no
   *  bar shows. With no hold at all, the last moment of the sweep, which is the nearest frame to it. */
  function stillAt(p: ScanRevealImageProps): number {
    const duration = Math.max(1, p.duration);
    const hold = Math.max(0, p.hold);
    return hold > 0 ? duration + hold / 2 : duration - 1;
  }

  function draw(t: number): void {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    setNote(failed);
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
    }
    if (ctx && ready) {
      const duration = Math.max(1, props.duration);
      const cycle = duration + Math.max(0, props.hold);
      const pos = ((t % cycle) + cycle) % cycle;
      const sweeping = pos < duration;
      // Where the scan has reached, rounded to a whole pixel so the two states meet on one line.
      const cut = sweeping ? Math.round((pos / duration) * h) : h;
      // Behind the bar, the finished picture.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, cut);
      ctx.clip();
      ctx.drawImage(picture.canvas, 0, 0, w, h);
      ctx.restore();
      if (sweeping) {
        // Ahead of it, the same picture as sparse dither, the way a page reads part way through a fax. The
        // dots stay hard, because smoothing them would turn the fax screen into a grey wash.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, cut, w, h - cut);
        ctx.clip();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(preview.canvas, 0, 0, w, h);
        ctx.restore();
        const thick = Math.max(1, Math.min(props.bar, h));
        ctx.fillStyle = palette.colors.accent;
        ctx.fillRect(0, Math.min(cut, h - thick), w, thick);
      }
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
        props.preview !== before.preview
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
