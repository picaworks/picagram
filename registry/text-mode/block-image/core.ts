import { labelHost, unlabelHost } from "../../../lib/a11y";
import { bayerMatrix } from "../../../lib/dither";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { createSampler } from "../../../lib/sample";
import { litSphere } from "../../../lib/subject";
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
  fit: "contain",
  tone: "auto",
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  lineHeight: 1,
};

/** Sample points per cell side: each cell reads a 2 by 2 patch of the image, one sample per quadrant. */
const N = 2;

/** Bayer matrix side. Wider than a cell, so neighboring cells dither differently instead of repeating one pattern. */
const BAYER_SIZE = 4;
const BAYER = bayerMatrix(BAYER_SIZE);

/** The sixteen quadrant block glyphs, indexed by 8 * topLeft + 4 * topRight + 2 * bottomLeft + bottomRight. */
const BLOCKS = [
  " ", // 0000
  "▗", // 0001 bottom right
  "▖", // 0010 bottom left
  "▄", // 0011 bottom half
  "▝", // 0100 top right
  "▐", // 0101 right half
  "▞", // 0110 top right and bottom left
  "▟", // 0111 top right, bottom left and bottom right
  "▘", // 1000 top left
  "▚", // 1001 top left and bottom right
  "▌", // 1010 left half
  "▙", // 1011 top left, bottom left and bottom right
  "▀", // 1100 top half
  "▜", // 1101 top left, top right and bottom right
  "▛", // 1110 top left, top right and bottom left
  "█", // 1111 full block
];

export const mount: Mount<BlockImageProps> = (host, initial = {}) => {
  let props: BlockImageProps = { ...defaults, ...initial };
  let source: CanvasImageSource | null = null;
  let sourceW = 0;
  let sourceH = 0;
  let failed = false;
  let request = 0;
  let setAspect = false;
  const sampler = createSampler();
  const grid = createGrid(host, gridOptions(props), draw);

  function gridOptions(p: BlockImageProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: p.columns, lineHeight: p.lineHeight, renderer: "canvas", color: "" };
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

  /** Whether the sample at (x, y) clears the threshold, after any dithering. */
  function bit(ink: Float32Array, sw: number, x: number, y: number): number {
    const value = ink[y * sw + x] ?? 0;
    const jitter = props.dither ? (BAYER[(y % BAYER_SIZE) * BAYER_SIZE + (x % BAYER_SIZE)] ?? 0.5) - 0.5 : 0;
    return value + jitter >= props.threshold ? 1 : 0;
  }

  function draw(): void {
    grid.clear();
    const { cols, rows, aspect } = grid;
    if (failed) {
      const note = "image unavailable";
      grid.write(Math.max(0, Math.floor((cols - note.length) / 2)), Math.floor(rows / 2), note);
    } else if (source) {
      const ink = sampler.sample(source, sourceW, sourceH, host, {
        cols, rows, aspect, n: N, fit: props.fit, tone: props.tone, contrast: props.contrast, mirror: false,
      });
      const sw = cols * N;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cx = x * N;
          const cy = y * N;
          const topLeft = bit(ink, sw, cx, cy);
          const topRight = bit(ink, sw, cx + 1, cy);
          const bottomLeft = bit(ink, sw, cx, cy + 1);
          const bottomRight = bit(ink, sw, cx + 1, cy + 1);
          grid.set(x, y, BLOCKS[topLeft * 8 + topRight * 4 + bottomLeft * 2 + bottomRight] ?? " ");
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
