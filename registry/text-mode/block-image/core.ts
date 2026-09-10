import { labelHost, unlabelHost } from "../../../lib/a11y";
import { quadrant } from "../../../lib/blocks";
import { threshold } from "../../../lib/dither";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface BlockImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** Columns across the host. Each cell packs a 2 by 2 sample, so the image reads at double this resolution. Rows follow from the host's height, or from the image when the host has none. */
  columns: number;
  /** Ink level that turns a quadrant on. Lower fills more of the image; higher leaves more of it empty. */
  threshold: number;
  /** Jitters the threshold with a 4 by 4 Bayer matrix, so a flat tone reads as a pattern instead of a hard edge. */
  dither: boolean;
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" fills quadrants for bright pixels; "dark-on-light" does the reverse. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** CSS font-family stack for the blocks. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. 1 keeps blocks flush from row to row. */
  lineHeight: number;
}

export const defaults: BlockImageProps = {
  src: "",
  alt: "",
  columns: 64,
  threshold: 0.5,
  dither: true,
  contrast: 1.1,
  fit: "cover",
  tone: "auto",
  fontFamily: GRID_FONT,
  lineHeight: 1,
};

/** Sample points per cell side: each cell reads a 2 by 2 patch of the image, one sample per quadrant. */
const N = 2;

export const mount: Mount<BlockImageProps> = (host, initial = {}) => {
  let props: BlockImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  const sampler = createSampler();
  const grid = createGrid(host, gridOptions(props), draw);

  function gridOptions(p: BlockImageProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: p.columns, lineHeight: p.lineHeight, renderer: "canvas", color: "" };
  }

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
    grid.clear();
    setNote(failed);
    if (source && !failed) {
      const { cols, rows, aspect } = grid;
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols, rows, aspect, n: N, fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      const sw = cols * N;
      const sh = rows * N;
      // Ink goes where the value is at least threshold + bayer - 0.5, so dither jitters the cut evenly around it.
      const bits = threshold(ink, sw, sh, props.threshold, props.dither ? 4 : 0);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cx = x * N;
          const cy = y * N;
          const topLeft = bits[cy * sw + cx] ?? 0;
          const topRight = bits[cy * sw + cx + 1] ?? 0;
          const bottomLeft = bits[(cy + 1) * sw + cx] ?? 0;
          const bottomRight = bits[(cy + 1) * sw + cx + 1] ?? 0;
          grid.set(x, y, quadrant(topLeft === 1, topRight === 1, bottomLeft === 1, bottomRight === 1));
        }
      }
    }
    grid.flush();
    if (source || failed) host.dataset.picaReady = "true";
  }

  labelHost(host, props.alt);
  load();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      labelHost(host, props.alt);
      if (props.src !== before.src) load();
      if (props.columns !== before.columns || props.fontFamily !== before.fontFamily || props.lineHeight !== before.lineHeight) {
        grid.update(gridOptions(props));
      } else {
        draw();
      }
    },
    destroy() {
      cancel();
      setNote(false);
      grid.destroy();
      undoAspect();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
