import { labelHost, unlabelHost } from "../../../lib/a11y";
import { braille, brailleDot } from "../../../lib/blocks";
import { threshold } from "../../../lib/dither";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface BrailleImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** Columns across the host. Rows follow from the host's height, or from the image when the host has none. */
  columns: number;
  /** Ink level a dot must reach to turn on. Raising it thins the image out; lowering it fills it in. */
  threshold: number;
  /** Spread the threshold over a 4 by 4 Bayer matrix, so mid-tones become dot patterns instead of a hard edge. */
  dither: boolean;
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" maps bright pixels to more dots; "dark-on-light" does the reverse. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** CSS font-family stack for the glyphs. Needs a font covering Braille Patterns, U+2800 to U+28FF. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
}

export const defaults: BrailleImageProps = {
  src: "",
  alt: "",
  columns: 96,
  threshold: 0.5,
  dither: true,
  contrast: 1.1,
  fit: "cover",
  tone: "auto",
  fontFamily: GRID_FONT,
  lineHeight: 1.2,
};

/** Dot samples per cell: two columns by four rows. */
const DOTS_X = 2;
const DOTS_Y = 4;

export const mount: Mount<BrailleImageProps> = (host, initial = {}) => {
  let props: BrailleImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  const sampler = createSampler();
  const grid = createGrid(host, gridOptions(props), draw);

  function gridOptions(p: BrailleImageProps): GridOptions {
    // Braille glyphs need a font that has them, and text laid out by the browser can fall back to a
    // different font per glyph. The canvas renderer places every glyph at its cell's x itself, so a
    // fallback glyph still lands on its cell instead of drifting the row out of alignment.
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
        cols, rows, aspect, n: DOTS_X, ny: DOTS_Y, fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      const sw = cols * DOTS_X;
      const sh = rows * DOTS_Y;
      const dots = threshold(ink, sw, sh, props.threshold, props.dither ? 4 : 0);
      for (let y = 0; y < rows; y++) {
        const sy0 = y * DOTS_Y;
        for (let x = 0; x < cols; x++) {
          const sx0 = x * DOTS_X;
          let bits = 0;
          for (let r = 0; r < DOTS_Y; r++) {
            if (dots[(sy0 + r) * sw + sx0]) bits |= brailleDot(r, 0);
            if (dots[(sy0 + r) * sw + sx0 + 1]) bits |= brailleDot(r, 1);
          }
          grid.set(x, y, braille(bits));
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
