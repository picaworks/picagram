import { labelHost, unlabelHost } from "../../../lib/a11y";
import { hostTone } from "../../../lib/color";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { FALLBACK_RAMP, matchShape, measureRamp, measureShapes, pick } from "../../../lib/ramp";
import { createSampler } from "../../../lib/sample";
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
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  lineHeight: 1.2,
};

/** Sub-cells per side when matching shape. */
const SHAPE_N = 3;

/** Text height, in pixels, of the offscreen raster. Large enough to sample cleanly at any column count. */
const RASTER_SIZE = 240;

/** Style, variant, and weight keywords that may lead a font shorthand which carries no size of its own. */
const FONT_PREFIX_WORDS = new Set([
  "normal", "italic", "oblique", "small-caps", "bold", "bolder", "lighter",
  "ultra-condensed", "extra-condensed", "condensed", "semi-condensed",
  "semi-expanded", "expanded", "extra-expanded", "ultra-expanded",
]);

/** Inserts a pixel size into a font shorthand that has none, ahead of its family list. */
function rasterFont(spec: string, px: number): string {
  const words = spec.trim().split(/\s+/);
  let i = 0;
  while (i < words.length && (FONT_PREFIX_WORDS.has((words[i] ?? "").toLowerCase()) || /^[1-9]00$/.test(words[i] ?? ""))) i++;
  const prefix = words.slice(0, i).join(" ");
  const family = words.slice(i).join(" ") || "sans-serif";
  return prefix ? `${prefix} ${px}px ${family}` : `${px}px ${family}`;
}

export const mount: Mount<AsciiTextProps> = (host, initial = {}) => {
  let props: AsciiTextProps = { ...defaults, ...initial };
  let setAspect = false;
  const sampler = createSampler();
  const raster = document.createElement("canvas");
  const rasterCtx = raster.getContext("2d");
  const stage = document.createElement("canvas");
  const stageCtx = stage.getContext("2d");
  const grid = createGrid(host, gridOptions(props), render);

  function gridOptions(p: AsciiTextProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: p.columns, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  // Draws `text` into `raster` at a fixed pixel size, cropped tight to its ink.
  function rasterize(): void {
    if (!rasterCtx) return;
    if (!props.text) {
      raster.width = 0;
      raster.height = 0;
      return;
    }
    rasterCtx.font = rasterFont(props.font, RASTER_SIZE);
    const measured = rasterCtx.measureText(props.text);
    // The advance width includes side bearing, which is rarely symmetric, so the tight ink box
    // (left plus right, ascent plus descent) is what makes a canvas sized to fit the glyphs exactly.
    const left = measured.actualBoundingBoxLeft || 0;
    const right = measured.actualBoundingBoxRight || measured.width;
    const ascent = measured.actualBoundingBoxAscent || RASTER_SIZE * 0.75;
    const descent = measured.actualBoundingBoxDescent || RASTER_SIZE * 0.25;
    // Resizing a canvas clears it and resets its context, so the font is set again after.
    raster.width = Math.max(1, Math.ceil(left + right));
    raster.height = Math.max(1, Math.ceil(ascent + descent));
    rasterCtx.font = rasterFont(props.font, RASTER_SIZE);
    // lib/sample.ts reads ink from luma, not alpha, so the fill must already read as the "foreground"
    // brightness the resolved tone expects: light text for a light-on-dark host, dark for the reverse.
    rasterCtx.fillStyle = (props.tone === "auto" ? hostTone(host) : props.tone) === "light-on-dark" ? "#fff" : "#000";
    rasterCtx.textBaseline = "alphabetic";
    rasterCtx.fillText(props.text, left, ascent);
  }

  function draw(): void {
    grid.clear();
    const { cols, rows, aspect } = grid;
    if (raster.width > 0 && raster.height > 0) {
      let source: CanvasImageSource = raster;
      let sw = raster.width;
      let sh = raster.height;
      // lib/sample.ts always centers a "contain" fit. Left align is done here, by padding the
      // raster on the right until its aspect matches the box, so centering that reads as flush left.
      if (props.align === "left" && stageCtx) {
        const boxAspect = (cols * aspect) / rows;
        const textAspect = raster.width / raster.height;
        if (boxAspect > textAspect) {
          sw = Math.max(1, Math.ceil(raster.height * boxAspect));
          sh = raster.height;
          stage.width = sw;
          stage.height = sh;
          stageCtx.clearRect(0, 0, sw, sh);
          stageCtx.drawImage(raster, 0, 0);
          source = stage;
        }
      }
      const n = props.shape ? SHAPE_N : 1;
      const ink = sampler.sample(source, sw, sh, host, {
        cols, rows, aspect, n, fit: "contain", tone: props.tone, contrast: props.contrast, mirror: false,
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
    rasterize();
    if (host.clientHeight < 2 && raster.width > 0 && raster.height > 0) {
      // A host with no height of its own takes the text's proportions, as ascii-image does with an image.
      host.style.aspectRatio = `${raster.width} / ${raster.height}`;
      setAspect = true;
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
      if (setAspect) host.style.removeProperty("aspect-ratio");
      delete host.dataset.picaReady;
    },
  };
};
