import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { watchPalette } from "../../../lib/palette";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface DuotoneImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** Flat tone bands the image's ink is quantized into. */
  levels: number;
  /** Draws the band with the most ink in --pica-accent instead of the host's ink color. */
  accent: boolean;
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" inks the bright pixels; "dark-on-light" inks the dark ones. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
}

export const defaults: DuotoneImageProps = {
  src: "",
  alt: "",
  levels: 4,
  accent: false,
  contrast: 1.1,
  fit: "cover",
  tone: "auto",
};

export const mount: Mount<DuotoneImageProps> = (host, initial = {}) => {
  let props: DuotoneImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  const sampler = createSampler();
  // Native pixel resolution, capped, so posterized edges stay crisp rather than a blurred upscale.
  const surface = createCanvas(host, { onResize: () => draw() });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const palette = watchPalette(host, () => draw());

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
    draw();
  }

  function setNote(on: boolean): void {
    if (on && !removeNote) removeNote = showNote(host, "image unavailable");
    if (!on && removeNote) {
      removeNote();
      removeNote = null;
    }
  }

  function draw(): void {
    const cols = surface.width;
    const rows = surface.height;
    setNote(failed);
    if (ctx && source && !failed) {
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols, rows, aspect: 1, n: 1, fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      // The top band is the one with the most ink: fully opaque, and the accent band when accent is on.
      const maxBand = Math.max(1, props.levels - 1);
      const [r, g, b, a] = parseColor(palette.colors.fg);
      const [ar, ag, ab] = props.accent ? parseColor(palette.colors.accent) : [r, g, b];
      const image = ctx.createImageData(cols, rows);
      for (let i = 0; i < ink.length; i++) {
        const band = Math.min(maxBand, Math.floor((ink[i] ?? 0) * props.levels));
        const brightest = props.accent && band === maxBand;
        const j = i * 4;
        image.data[j] = brightest ? ar : r;
        image.data[j + 1] = brightest ? ag : g;
        image.data[j + 2] = brightest ? ab : b;
        image.data[j + 3] = Math.round((band / maxBand) * a);
      }
      ctx.putImageData(image, 0, 0);
    } else if (ctx) {
      ctx.clearRect(0, 0, cols, rows);
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
      if (props.src !== before.src) load();
      else draw();
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
