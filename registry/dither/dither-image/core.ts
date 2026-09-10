import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { diffuse, threshold } from "../../../lib/dither";
import { watchPalette } from "../../../lib/palette";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface DitherImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** How ink is placed: ordered Bayer at three matrix sizes, or error diffusion by Floyd-Steinberg or Atkinson. */
  algorithm: "bayer2" | "bayer4" | "bayer8" | "floyd-steinberg" | "atkinson";
  /** CSS pixels per dithered pixel. Higher values give a coarser, more graphic result. */
  scale: number;
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" inks the bright pixels; "dark-on-light" inks the dark ones. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
}

export const defaults: DitherImageProps = {
  src: "",
  alt: "",
  algorithm: "atkinson",
  scale: 3,
  contrast: 1.1,
  fit: "cover",
  tone: "auto",
};

/** Which pixels get ink, from ink values already in linear light. Returns 1 where ink goes. */
function toBits(ink: Float32Array, cols: number, rows: number, algorithm: DitherImageProps["algorithm"]): Uint8Array {
  if (algorithm === "floyd-steinberg" || algorithm === "atkinson") return diffuse(ink, cols, rows, algorithm);
  const size = algorithm === "bayer2" ? 2 : algorithm === "bayer4" ? 4 : 8;
  return threshold(ink, cols, rows, 0.5, size);
}

export const mount: Mount<DitherImageProps> = (host, initial = {}) => {
  let props: DitherImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  const sampler = createSampler();
  const surface = createCanvas(host, { autoSize: false, css: "image-rendering:pixelated", onResize: () => draw() });
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
    const cols = Math.max(1, Math.round(host.clientWidth / props.scale));
    const rows = Math.max(1, Math.round(host.clientHeight / props.scale));
    canvas.width = cols;
    canvas.height = rows;
    setNote(failed);
    if (ctx && source && !failed) {
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols, rows, aspect: 1, n: 1, fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      const bits = toBits(ink, cols, rows, props.algorithm);
      const [r, g, b, a] = parseColor(palette.colors.fg);
      const image = ctx.createImageData(cols, rows);
      for (let i = 0; i < bits.length; i++) {
        const j = i * 4;
        const on = bits[i] === 1;
        image.data[j] = r;
        image.data[j + 1] = g;
        image.data[j + 2] = b;
        image.data[j + 3] = on ? a : 0;
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
