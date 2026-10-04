import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { sameJson } from "../../../lib/json";
import { watchPalette } from "../../../lib/palette";
import { createPlate } from "../../../lib/pixels";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface LenticularImageProps {
  /** Two image URLs or data URIs, registered in the same frame; empty entries use the built-in sphere. */
  sources: [string, string];
  /** Viewing position from 0 (first image) to 1 (second image). */
  position: number;
  /** Width of one lenticular strip in CSS pixels, from 4 to 64. */
  pitch: number;
  /** Direction of the parallel lens strips. */
  axis: "vertical" | "horizontal";
}

const lenticularSvg = (drawing: string): string =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="currentColor">${drawing}</svg>`)}`;

export const defaults: LenticularImageProps = {
  sources: [
    lenticularSvg('<circle cx="400" cy="292" r="182" opacity=".12"/><path d="M400 110a182 182 0 1 0 0 364a182 182 0 0 0 0-364Zm0 45a137 137 0 1 1 0 274a137 137 0 0 1 0-274Z" fill-rule="evenodd"/><circle cx="400" cy="292" r="63"/><path d="M150 506h500v4H150Z" opacity=".45"/>'),
    lenticularSvg('<path d="M138 443L326 137l111 168 56-86 169 224Z" opacity=".22"/><path d="M138 443L326 137l111 168-57 88-53-161-128 211Z"/><path d="m380 393 113-174 169 224H538L493 315l-67 128H199Z" opacity=".65"/><path d="M150 506h500v4H150Z" opacity=".45"/>'),
  ],
  position: 0.42,
  pitch: 12,
  axis: "vertical",
};

const LENTICULAR_MAX = 768;

/** Fixed image coordinates are interlaced behind a position-dependent strip aperture. */
export const mount: Mount<LenticularImageProps> = (host, initial = {}) => {
  let props: LenticularImageProps = { ...defaults, ...initial };
  let destroyed = false;
  let started = false;
  let workW = 0;
  let workH = 0;
  let output: ImageData | null = null;
  const images: (Source | null)[] = [null, null];
  const ink: Float32Array[] = [new Float32Array(0), new Float32Array(0)];
  const settled = [false, false];
  const failed = [false, false];
  const cancellations: (() => void)[] = [() => undefined, () => undefined];
  const generations = [0, 0];
  let removeNote: (() => void) | null = null;
  const priorReady = host.getAttribute("data-pica-ready");
  labelHost(host, "");
  const undoAspect = fitHostAspect(host, 800, 600);
  const plate = createPlate();
  const sampler = createSampler();
  const surface = createCanvas(host, { maxPixels: 4000000, onResize: () => prepare() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => { if (started) draw(); });

  function finite(value: number, fallback: number): number {
    return Number.isFinite(value) ? value : fallback;
  }

  function prepareImage(index: number): void {
    const source = images[index];
    ink[index] = new Float32Array(0);
    if (!source || !workW || !workH) return;
    try {
      // The sampler reuses its buffer: each image owns a copied plate.
      ink[index] = sampler.sample(source.image, source.width, source.height, host, {
        cols: workW, rows: workH, aspect: 1, n: 1,
        fit: fitFor(source, "cover"), tone: source.builtIn ? "light-on-dark" : "dark-on-light",
        contrast: 1, mirror: false,
      }).slice();
    } catch {
      images[index] = null;
      failed[index] = true;
    }
  }

  function prepare(): void {
    if (destroyed) return;
    const width = Math.max(1, surface.cssWidth);
    const height = Math.max(1, surface.cssHeight);
    const scale = Math.min(1, LENTICULAR_MAX / Math.max(width, height));
    const nextW = Math.max(1, Math.round(width * scale));
    const nextH = Math.max(1, Math.round(height * scale));
    if (nextW !== workW || nextH !== workH) {
      workW = nextW;
      workH = nextH;
      output = new ImageData(workW, workH);
      prepareImage(0);
      prepareImage(1);
    }
    if (started) draw();
  }

  function draw(): void {
    if (destroyed) return;
    const unavailable = failed.some(Boolean) || !ctx;
    if (unavailable && !removeNote) removeNote = showNote(host, "image unavailable");
    if (!unavailable && removeNote) {
      removeNote();
      removeNote = null;
    }
    if (ctx && output) {
      const width = Math.max(1, surface.cssWidth);
      const height = Math.max(1, surface.cssHeight);
      const vertical = props.axis !== "horizontal";
      const pitch = Math.max(4, Math.min(64, finite(props.pitch, defaults.pitch)));
      const position = Math.max(0, Math.min(1, finite(props.position, defaults.position)));
      const pixels = output.data;
      const fg = parseColor(palette.colors.fg);
      const scale = vertical ? width / workW : height / workH;
      const feather = Math.min(0.12, scale / pitch * 0.55);
      for (let y = 0; y < workH; y++) {
        for (let x = 0; x < workW; x++) {
          const index = y * workW + x;
          const coordinate = (vertical ? x + 0.5 : y + 0.5) * scale;
          const phase = (coordinate / pitch) % 1;
          // The aperture changes within every strip, never the source coordinate.
          let second = position === 0 ? 0 : position === 1 ? 1 :
            Math.max(0, Math.min(1, (position - phase) / feather + 0.5));
          second = second * second * (3 - 2 * second);
          const firstInk = ink[0]?.[index] ?? 0;
          const secondInk = ink[1]?.[index] ?? 0;
          const coverage = firstInk * (1 - second) + secondInk * second;
          const ridge = 0.91 + 0.09 * Math.sin(Math.PI * phase);
          const j = index * 4;
          pixels[j] = fg[0];
          pixels[j + 1] = fg[1];
          pixels[j + 2] = fg[2];
          pixels[j + 3] = Math.round(Math.max(0, Math.min(1, coverage * ridge)) * fg[3]);
        }
      }
      plate.put(output);
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = palette.colors.bg;
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(plate.canvas, 0, 0, width, height);
    }
    if (settled[0] && settled[1]) host.dataset.picaReady = "true";
  }

  function load(index: number): void {
    cancellations[index]?.();
    const generation = (generations[index] ?? 0) + 1;
    generations[index] = generation;
    settled[index] = false;
    failed[index] = false;
    images[index] = null;
    ink[index] = new Float32Array(0);
    const src = props.sources?.[index];
    cancellations[index] = loadSource(typeof src === "string" ? src : defaults.sources[index] ?? "", (source) => {
      if (destroyed || generations[index] !== generation) return;
      images[index] = source;
      settled[index] = true;
      prepareImage(index);
      if (started) draw();
    }, () => {
      if (destroyed || generations[index] !== generation) return;
      failed[index] = true;
      settled[index] = true;
      if (started) draw();
    });
  }

  prepare();
  load(0);
  load(1);
  started = true;
  draw();

  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (!sameJson(before.sources, props.sources)) {
        for (let index = 0; index < 2; index++) {
          if (before.sources?.[index] !== props.sources?.[index]) load(index);
        }
      }
      palette.refresh();
      draw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancellations.forEach((cancel) => cancel());
      removeNote?.();
      removeNote = null;
      palette.destroy();
      surface.destroy();
      undoAspect();
      unlabelHost(host);
      if (priorReady === null) delete host.dataset.picaReady;
      else host.setAttribute("data-pica-ready", priorReady);
    },
  };
};
