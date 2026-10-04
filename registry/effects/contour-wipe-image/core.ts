import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { hostTone, parseColor } from "../../../lib/color";
import { hostAttributes, styleHost } from "../../../lib/host";
import { cssVar, watchPalette } from "../../../lib/palette";
import { createPlate } from "../../../lib/pixels";
import { fitRect } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface ContourWipeImageProps {
  /** Image URL or data URI; empty input uses the built-in sphere without a network request. */
  src: string;
  /** Reveal progress from 0 (empty) to 1 (the complete monochrome image). */
  progress: number;
  /** Number of ordered luminance contour bands, from 2 to 32. */
  bands: number;
  /** Reveal dark contours first instead of bright contours; the final image stays the same. */
  invert: boolean;
  /** Cover crops to the host; contain keeps the whole supplied image visible. */
  fit: "cover" | "contain";
}

export const defaults: ContourWipeImageProps = {
  src: "",
  progress: 0.62,
  bands: 12,
  invert: false,
  fit: "contain",
};

const CONTOUR_WORK_MAX = 512;

function contourNumber(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

/** A monotone image reveal: each luminance band is reached once, in source order. */
export const mount: Mount<ContourWipeImageProps> = (host, initial = {}) => {
  let props: ContourWipeImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let started = false;
  let destroyed = false;
  let failed = false;
  let generation = 0;
  let workW = 0;
  let workH = 0;
  let luma = new Float32Array(0);
  let alpha = new Float32Array(0);
  let output: ImageData | null = null;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  const attributes = hostAttributes(host);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const input = document.createElement("canvas");
  input.setAttribute("data-pica", "");
  const inputContext = input.getContext("2d", { willReadFrequently: true });
  const plate = createPlate();
  const surface = createCanvas(host, { maxPixels: 2500000, onResize: () => resized() });
  const context = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => { if (started && !destroyed) draw(); });

  function note(on: boolean): void {
    if (on && !removeNote) removeNote = showNote(host, "image unavailable");
    if (!on && removeNote) {
      removeNote();
      removeNote = null;
    }
  }

  function dimensions(): [number, number] {
    const width = Math.max(1, surface.cssWidth);
    const height = Math.max(1, surface.cssHeight);
    const scale = Math.min(1, CONTOUR_WORK_MAX / Math.max(width, height));
    return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
  }

  function prepare(): void {
    if (!source || destroyed) return;
    if (!inputContext || !context) throw new Error("Canvas unavailable");
    const [width, height] = dimensions();
    input.width = width;
    input.height = height;
    inputContext.clearRect(0, 0, width, height);
    const box = fitRect(source.width, source.height, width, height, fitFor(source, props.fit === "cover" ? "cover" : "contain"));
    inputContext.drawImage(source.image, box.x, box.y, box.w, box.h);
    const pixels = inputContext.getImageData(0, 0, width, height).data;
    workW = width;
    workH = height;
    luma = new Float32Array(width * height);
    alpha = new Float32Array(width * height);
    output = new ImageData(width, height);
    for (let i = 0; i < luma.length; i++) {
      const offset = i * 4;
      luma[i] = (0.2126 * (pixels[offset] ?? 0) + 0.7152 * (pixels[offset + 1] ?? 0) + 0.0722 * (pixels[offset + 2] ?? 0)) / 255;
      alpha[i] = (pixels[offset + 3] ?? 0) / 255;
    }
  }

  function fail(): void {
    if (destroyed) return;
    source = null;
    output = null;
    failed = true;
    draw();
  }

  function resized(): void {
    if (!started || destroyed) return;
    const [width, height] = dimensions();
    if (source && (width !== workW || height !== workH)) {
      try { prepare(); } catch { fail(); return; }
    }
    draw();
  }

  function draw(): void {
    if (destroyed) return;
    const width = Math.max(1, surface.cssWidth);
    const height = Math.max(1, surface.cssHeight);
    note(failed);
    if (context) {
      context.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = palette.colors.bg;
      context.fillRect(0, 0, width, height);
      if (source && output) {
        const progress = contourNumber(props.progress, defaults.progress, 0, 1);
        const bands = Math.round(contourNumber(props.bands, defaults.bands, 2, 32));
        const fg = parseColor(palette.colors.fg);
        const accent = parseColor(palette.colors.accent);
        const lightOnDark = hostTone(host) === "light-on-dark";
        const cutoff = props.invert ? progress : 1 - progress;
        const pixels = output.data;
        for (let y = 0; y < workH; y++) {
          for (let x = 0; x < workW; x++) {
            const i = y * workW + x;
            const value = luma[i] ?? 0;
            const opacity = alpha[i] ?? 0;
            const level = Math.min(bands - 1, Math.floor(value * bands));
            const order = props.invert ? level : bands - 1 - level;
            // The active band fades continuously; completed bands never recede.
            // Explicit endpoints preserve every source pixel, including flat images.
            const reveal = progress <= 0 ? 0 : progress >= 1 ? 1 : Math.max(0, Math.min(1, progress * bands - order));
            const tone = lightOnDark ? value ** 2.2 : 1 - value ** 2.2;
            let edge = false;
            if (progress > 0 && progress < 1 && opacity > 0) {
              const side = value >= cutoff;
              const neighbors = [
                y * workW + Math.max(0, x - 1),
                y * workW + Math.min(workW - 1, x + 1),
                Math.max(0, y - 1) * workW + x,
                Math.min(workH - 1, y + 1) * workW + x,
              ];
              edge = neighbors.some((neighbor) => (alpha[neighbor] ?? 0) > 0 && ((luma[neighbor] ?? 0) >= cutoff) !== side);
            }
            const color = edge ? accent : fg;
            const coverage = edge ? opacity * 0.9 : opacity * tone * reveal;
            const offset = i * 4;
            pixels[offset] = color[0];
            pixels[offset + 1] = color[1];
            pixels[offset + 2] = color[2];
            pixels[offset + 3] = Math.round(coverage * color[3]);
          }
        }
        plate.put(output);
        context.imageSmoothingEnabled = true;
        context.drawImage(plate.canvas, 0, 0, width, height);
      }
    }
    if ((source && output) || failed) attributes.set("data-pica-ready", "true");
  }

  function load(): void {
    cancel();
    const current = ++generation;
    source = null;
    output = null;
    failed = false;
    note(false);
    undoAspect();
    undoAspect = (): void => undefined;
    attributes.set("data-pica-ready", null);
    draw();
    cancel = loadSource(props.src, (next) => {
      if (destroyed || current !== generation) return;
      source = next;
      undoAspect = fitHostAspect(host, next.width, next.height);
      try { prepare(); } catch { fail(); return; }
      draw();
    }, () => { if (!destroyed && current === generation) fail(); });
  }

  labelHost(host, "");
  started = true;
  load();

  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      palette.refresh();
      if (before.src !== props.src) load();
      else {
        if (before.fit !== props.fit && source) {
          try { prepare(); } catch { fail(); return; }
        }
        draw();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      generation++;
      cancel();
      note(false);
      palette.destroy();
      undoAspect();
      surface.destroy();
      restore();
      unlabelHost(host);
      attributes.restore();
      source = null;
      output = null;
      luma = new Float32Array(0);
      alpha = new Float32Array(0);
    },
  };
};
