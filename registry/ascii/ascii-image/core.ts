import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { FALLBACK_RAMP, matchShape, measureRamp, measureShapes, pick } from "../../../lib/ramp";
import { createSampler } from "../../../lib/sample";
import { litSphere } from "../../../lib/subject";
import type { Mount } from "../../../lib/types";

export interface AsciiImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** Columns across the host. Rows follow from the host's height, or from the image when the host has none. */
  columns: number;
  /** Glyphs to draw with, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" maps bright pixels to dense glyphs; "dark-on-light" does the reverse. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** Match each cell's shape as well as its brightness: sharper edges, more work. */
  shape: boolean;
  /** CSS font-family stack for the glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
}

export const defaults: AsciiImageProps = {
  src: "",
  alt: "",
  columns: 96,
  glyphs: FALLBACK_RAMP,
  contrast: 1.1,
  fit: "cover",
  tone: "auto",
  shape: false,
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  lineHeight: 1.2,
};

/** Sub-cells per side when matching shape. */
const SHAPE_N = 3;

export const mount: Mount<AsciiImageProps> = (host, initial = {}) => {
  let props: AsciiImageProps = { ...defaults, ...initial };
  let source: CanvasImageSource | null = null;
  let sourceW = 0;
  let sourceH = 0;
  let failed = false;
  let request = 0;
  let setAspect = false;
  const sampler = createSampler();
  const grid = createGrid(host, gridOptions(props), draw);

  function gridOptions(p: AsciiImageProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: p.columns, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  function load(): void {
    const mine = ++request;
    failed = false;
    if (!props.src) {
      use(litSphere(), 256, 256);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      if (mine === request) use(img, img.naturalWidth, img.naturalHeight);
    };
    img.onerror = () => {
      if (mine !== request) return;
      source = null;
      failed = true;
      draw();
    };
    img.src = props.src;
  }

  function use(next: CanvasImageSource, w: number, h: number): void {
    source = next;
    sourceW = w;
    sourceH = h;
    // A host with no height of its own takes the image's proportions.
    if (host.clientHeight < 2 && w > 0 && h > 0) {
      host.style.aspectRatio = `${w} / ${h}`;
      setAspect = true;
    }
    draw();
  }

  function draw(): void {
    grid.clear();
    const { cols, rows, aspect } = grid;
    if (failed) {
      const note = "image unavailable";
      grid.write(Math.max(0, Math.floor((cols - note.length) / 2)), Math.floor(rows / 2), note);
    } else if (source) {
      const n = props.shape ? SHAPE_N : 1;
      const ink = sampler.sample(source, sourceW, sourceH, host, {
        cols, rows, aspect, n, fit: props.fit, tone: props.tone, contrast: props.contrast, mirror: false,
      });
      const sw = cols * n;
      const shapes = props.shape ? measureShapes(props.glyphs, props.fontFamily, props.lineHeight, SHAPE_N) : null;
      const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
      const cell = new Array<number>(SHAPE_N * SHAPE_N).fill(0);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (shapes) {
            for (let sy = 0; sy < SHAPE_N; sy++) {
              for (let sx = 0; sx < SHAPE_N; sx++) cell[sy * SHAPE_N + sx] = ink[(y * SHAPE_N + sy) * sw + x * SHAPE_N + sx] ?? 0;
            }
            grid.set(x, y, matchShape(shapes, cell));
          } else {
            grid.set(x, y, pick(ramp, ink[y * sw + x] ?? 0));
          }
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
      request++;
      grid.destroy();
      unlabelHost(host);
      if (setAspect) host.style.removeProperty("aspect-ratio");
      delete host.dataset.picaReady;
    },
  };
};
