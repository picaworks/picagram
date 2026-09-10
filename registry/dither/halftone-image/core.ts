import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { watchPalette } from "../../../lib/palette";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface HalftoneImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** Grid spacing in CSS pixels: the distance between dot centers. */
  cell: number;
  /** Rotation of the dot grid, in degrees. 45 gives the classic printing screen angle. */
  angle: number;
  /** Dot shape. "circle" and "square" sit on the grid; "line" draws a rotated line screen for an engraving look. */
  shape: "circle" | "square" | "line";
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" screens the bright pixels; "dark-on-light" screens the dark ones. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
}

export const defaults: HalftoneImageProps = {
  src: "",
  alt: "",
  cell: 10,
  angle: 45,
  shape: "circle",
  contrast: 1.1,
  fit: "cover",
  tone: "auto",
};

/** Circle radius at full ink, as a share of `cell`. High enough that neighboring dots overlap and
 *  shadows read as nearly solid, without needing a second pass to merge them. */
const MAX_CIRCLE = 0.56;

export const mount: Mount<HalftoneImageProps> = (host, initial = {}) => {
  let props: HalftoneImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  const sampler = createSampler();
  const surface = createCanvas(host, { onResize: () => draw() });
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

  /** Adds a rectangle centered at (cx, cy) to the current path, `halfU` and `halfV` out along the
   *  grid's own rotated axes, so squares and lines turn with the screen angle. */
  function addQuad(cx: number, cy: number, halfU: number, halfV: number, cosA: number, sinA: number): void {
    if (!ctx) return;
    const ux = halfU * cosA;
    const uy = halfU * sinA;
    const vx = -halfV * sinA;
    const vy = halfV * cosA;
    ctx.moveTo(cx - ux - vx, cy - uy - vy);
    ctx.lineTo(cx + ux - vx, cy + uy - vy);
    ctx.lineTo(cx + ux + vx, cy + uy + vy);
    ctx.lineTo(cx - ux + vx, cy - uy + vy);
    ctx.closePath();
  }

  function draw(): void {
    const w = surface.cssWidth;
    const h = surface.cssHeight;
    if (ctx) ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
    setNote(failed);
    if (ctx && source && !failed) {
      const cell = props.cell > 0 ? props.cell : 1;
      const cols = Math.max(1, Math.round(w / cell));
      const rows = Math.max(1, Math.round(h / cell));
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols, rows, aspect: 1, n: 1, fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      // The dot grid is a rotated lattice: u and v are its two axes, each `cell` long.
      const angleRad = (props.angle * Math.PI) / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      const corners: [number, number][] = [[0, 0], [w, 0], [0, h], [w, h]];
      let iMin = Infinity;
      let iMax = -Infinity;
      let jMin = Infinity;
      let jMax = -Infinity;
      for (const [cx, cy] of corners) {
        const gi = (cx * cosA + cy * sinA) / cell;
        const gj = (-cx * sinA + cy * cosA) / cell;
        if (gi < iMin) iMin = gi;
        if (gi > iMax) iMax = gi;
        if (gj < jMin) jMin = gj;
        if (gj > jMax) jMax = gj;
      }
      iMin = Math.floor(iMin) - 1;
      iMax = Math.ceil(iMax) + 1;
      jMin = Math.floor(jMin) - 1;
      jMax = Math.ceil(jMax) + 1;
      ctx.fillStyle = palette.colors.fg;
      ctx.beginPath();
      for (let i = iMin; i <= iMax; i++) {
        for (let j = jMin; j <= jMax; j++) {
          const x = i * cell * cosA - j * cell * sinA;
          const y = i * cell * sinA + j * cell * cosA;
          if (x < -cell || x > w + cell || y < -cell || y > h + cell) continue;
          // Bilinear lookup: the ink buffer has one sample per cell, laid out on the host's own axes.
          const bx = Math.min(cols - 1, Math.max(0, x / cell));
          const by = Math.min(rows - 1, Math.max(0, y / cell));
          const x0 = Math.floor(bx);
          const y0 = Math.floor(by);
          const x1 = Math.min(cols - 1, x0 + 1);
          const y1 = Math.min(rows - 1, y0 + 1);
          const tx = bx - x0;
          const ty = by - y0;
          const v00 = ink[y0 * cols + x0] ?? 0;
          const v10 = ink[y0 * cols + x1] ?? 0;
          const v01 = ink[y1 * cols + x0] ?? 0;
          const v11 = ink[y1 * cols + x1] ?? 0;
          const raw = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
          const v = Math.min(1, Math.max(0, raw));
          if (v <= 0.004) continue;
          // Area, not radius, carries the tone: the covered area grows in step with ink, so a mid
          // grey covers about half of each cell instead of a quarter of it.
          if (props.shape === "circle") {
            const r = cell * MAX_CIRCLE * Math.sqrt(v);
            if (r < 0.15) continue;
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, Math.PI * 2);
          } else if (props.shape === "square") {
            const half = (cell * Math.sqrt(v)) / 2;
            if (half < 0.1) continue;
            addQuad(x, y, half, half, cosA, sinA);
          } else {
            const halfV = (cell * v) / 2;
            if (halfV < 0.1) continue;
            addQuad(x, y, cell / 2, halfV, cosA, sinA);
          }
        }
      }
      ctx.fill();
    } else if (ctx) {
      ctx.clearRect(0, 0, w, h);
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
