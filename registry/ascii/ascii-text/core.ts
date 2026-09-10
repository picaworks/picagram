import { labelHost, unlabelHost } from "../../../lib/a11y";
import { hostTone } from "../../../lib/color";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { FALLBACK_RAMP, matchShape, measureRamp, measureShapes, pick } from "../../../lib/ramp";
import { createSampler } from "../../../lib/sample";
import { fitHostAspect } from "../../../lib/source";
import { textSubject } from "../../../lib/subject";
import type { Mount } from "../../../lib/types";

export interface AsciiTextProps {
  /** The words to draw. This component always speaks them to assistive technology, so it is never decorative. */
  text: string;
  /** CSS font weight and family for the offscreen raster, with no size of its own. Must be a face the page has loaded. */
  font: string;
  /** Columns across the host. Rows follow from the host's height, or from the text's proportions when the host has none. */
  columns: number;
  /** Glyphs to draw with, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** Contrast around mid grey, applied before glyphs are chosen. 1 leaves the raster as it is. */
  contrast: number;
  /** "auto" reads the host's colors. "light-on-dark" maps bright pixels to dense glyphs; "dark-on-light" does the reverse. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** Where the text sits when the host is wider than the text needs. */
  align: "center" | "left";
  /** Match each cell's shape as well as its coverage: sharper letterforms, more work. */
  shape: boolean;
  /** CSS font-family stack for the glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
}

export const defaults: AsciiTextProps = {
  text: "PICA",
  font: '700 "Barlow Condensed", "Helvetica Neue", Arial, sans-serif',
  columns: 80,
  glyphs: FALLBACK_RAMP,
  contrast: 1.2,
  tone: "auto",
  align: "center",
  shape: true,
  fontFamily: GRID_FONT,
  lineHeight: 1.2,
};

/** Sub-cells per side when matching shape. */
const SHAPE_N = 3;

/** Text height, in pixels, of the offscreen raster. Large enough to sample cleanly at any column count. */
const RASTER_SIZE = 240;

export const mount: Mount<AsciiTextProps> = (host, initial = {}) => {
  let props: AsciiTextProps = { ...defaults, ...initial };
  // The raster textSubject draws into, kept for its lifetime and reused on every render.
  const raster = document.createElement("canvas");
  // Null while there is no text to sample, as when props.text is empty.
  let subject: HTMLCanvasElement | null = null;
  let undoAspect = (): void => undefined;
  const sampler = createSampler();
  const grid = createGrid(host, gridOptions(props), render);

  function gridOptions(p: AsciiTextProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: p.columns, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  function draw(): void {
    grid.clear();
    const { cols, rows, aspect } = grid;
    if (subject) {
      const n = props.shape ? SHAPE_N : 1;
      const ink = sampler.sample(subject, subject.width, subject.height, host, {
        cols,
        rows,
        aspect,
        n,
        fit: "contain",
        tone: props.tone,
        contrast: props.contrast,
        mirror: false,
        // Centered fit reads as flush left, since the raster is already cropped tight to its ink.
        alignX: props.align === "left" ? 0 : 0.5,
      });
      const sampleW = cols * n;
      const shapes = props.shape ? measureShapes(props.glyphs, props.fontFamily, props.lineHeight, SHAPE_N) : null;
      const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
      const cell = new Array<number>(SHAPE_N * SHAPE_N).fill(0);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (shapes) {
            for (let sy = 0; sy < SHAPE_N; sy++) {
              for (let sx = 0; sx < SHAPE_N; sx++) cell[sy * SHAPE_N + sx] = ink[(y * SHAPE_N + sy) * sampleW + x * SHAPE_N + sx] ?? 0;
            }
            grid.set(x, y, matchShape(shapes, cell));
          } else {
            grid.set(x, y, pick(ramp, ink[y * sampleW + x] ?? 0));
          }
        }
      }
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  // Rasters the text, then draws it. Runs on mount, on prop changes, and whenever the grid
  // relayouts (a resize, or a font finishing load, including the display face `font` rasters in).
  function render(): void {
    const tone = props.tone === "auto" ? hostTone(host) : props.tone;
    subject = textSubject(props.text, props.font, tone, RASTER_SIZE, raster);
    if (subject) {
      // A host with no height of its own takes the text's proportions, as ascii-image does with an image.
      undoAspect();
      undoAspect = fitHostAspect(host, subject.width, subject.height);
    }
    draw();
  }

  labelHost(host, props.text);
  render();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      labelHost(host, props.text);
      if (props.columns !== before.columns || props.fontFamily !== before.fontFamily || props.lineHeight !== before.lineHeight) {
        grid.update(gridOptions(props));
      } else {
        render();
      }
    },
    destroy() {
      grid.destroy();
      unlabelHost(host);
      undoAspect();
      delete host.dataset.picaReady;
    },
  };
};
