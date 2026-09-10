import { labelHost, unlabelHost } from "../../../lib/a11y";
import { bayerMatrix } from "../../../lib/dither";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { createSampler } from "../../../lib/sample";
import { litSphere } from "../../../lib/subject";
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
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  lineHeight: 1.2,
};

/** Dot bit for each row of a cell's left column, top to bottom. */
const LEFT_BITS = [1, 2, 4, 64];
/** Dot bit for each row of a cell's right column, top to bottom. */
const RIGHT_BITS = [8, 16, 32, 128];
/** First codepoint of the Braille Patterns block: the cell with every dot off. */
const BRAILLE_BASE = 0x2800;
/** Dot samples per cell: two columns by four rows. */
const DOTS_X = 2;
const DOTS_Y = 4;

export const mount: Mount<BrailleImageProps> = (host, initial = {}) => {
  let props: BrailleImageProps = { ...defaults, ...initial };
  let source: CanvasImageSource | null = null;
  let sourceW = 0;
  let sourceH = 0;
  let failed = false;
  let request = 0;
  let setAspect = false;
  const sampler = createSampler();
  const bayer = bayerMatrix(4);
  const grid = createGrid(host, gridOptions(props), draw);

  function gridOptions(p: BrailleImageProps): GridOptions {
    // Braille glyphs need a font that has them, and text laid out by the browser can fall back to a
    // different font per glyph. The canvas renderer places every glyph at its cell's x itself, so a
    // fallback glyph still lands on its cell instead of drifting the row out of alignment.
    return { fontFamily: p.fontFamily, fontSize: 12, columns: p.columns, lineHeight: p.lineHeight, renderer: "canvas", color: "" };
  }

  /** Whether one dot is on: ordered dithering by default, or a flat cut at `threshold`. */
  function dotOn(ink: Float32Array, sw: number, sx: number, sy: number): boolean {
    const v = ink[sy * sw + sx] ?? 0;
    if (!props.dither) return v >= props.threshold;
    const cell = bayer[(sy % 4) * 4 + (sx % 4)] ?? 0.5;
    return v >= cell + props.threshold - 0.5;
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
      const ink = sampler.sample(source, sourceW, sourceH, host, {
        cols, rows, aspect, n: DOTS_X, ny: DOTS_Y, fit: props.fit, tone: props.tone, contrast: props.contrast, mirror: false,
      });
      const sw = cols * DOTS_X;
      for (let y = 0; y < rows; y++) {
        const sy0 = y * DOTS_Y;
        for (let x = 0; x < cols; x++) {
          const sx0 = x * DOTS_X;
          let bits = 0;
          for (let r = 0; r < DOTS_Y; r++) {
            if (dotOn(ink, sw, sx0, sy0 + r)) bits |= LEFT_BITS[r] ?? 0;
            if (dotOn(ink, sw, sx0 + 1, sy0 + r)) bits |= RIGHT_BITS[r] ?? 0;
          }
          grid.set(x, y, String.fromCodePoint(BRAILLE_BASE + bits));
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
