import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { blueNoiseMatrix, maskAt } from "../../../lib/dither-mask";
import { watchPalette } from "../../../lib/palette";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface DitherStippleImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" inks the bright pixels; "dark-on-light" inks the dark ones. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** Diameter of one dot, in CSS pixels. Every dot is the same size. */
  dotSize: number;
  /** Overall dot spacing. Above 1 packs dots closer together; below 1 spreads them further apart. */
  density: number;
  /** Gamma applied to tone before it meets the mask. Above 1 pulls dots toward the darkest areas; below 1 spreads them into midtones. */
  gamma: number;
  /** Side of the blue noise tile the mask reads from. A larger tile repeats less often, at more one-time setup cost. */
  maskSize: 16 | 32 | 64;
}

export const defaults: DitherStippleImageProps = {
  src: "",
  alt: "",
  fit: "cover",
  tone: "auto",
  contrast: 1.1,
  dotSize: 2,
  density: 1.2,
  gamma: 1,
  maskSize: 64,
};

export const mount: Mount<DitherStippleImageProps> = (host, initial = {}) => {
  let props: DitherStippleImageProps = { ...defaults, ...initial };
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

  /* Secord's weighted Voronoi stippling relaxes a point set until every point's spacing tracks local image
   * tone, with no crowding and no holes. A blue noise mask already holds that target without the relaxation:
   * any prefix of its rank order, meaning every site at or below some threshold, is itself an evenly spaced
   * point set at that prefix's own density, because void and cluster built the mask by growing exactly such a
   * set one site at a time. So the mask stands in for the relaxation: candidate sites are read off a lattice
   * many times finer than a dot, each site keyed by tone against the mask, and the pass below walks that
   * ranking in order, keeping a site the moment nothing already kept sits within one dot's width of it. That
   * places every surviving dot by its real distance to its neighbours rather than by a lattice cell, which is
   * what a plain jittered grid gets wrong: jitter still confines a dot to its own cell, and a dense field of
   * such cells reads back as rows no matter how it is nudged. This is the reason the result should pass
   * Secord's own test: a flat mid grey field of these dots shows no rows, no clumps, and no holes. */
  function draw(): void {
    const dpr = surface.dpr;
    const w = surface.width;
    const h = surface.height;
    setNote(failed);
    if (ctx) ctx.clearRect(0, 0, w, h);
    if (ctx && source && !failed) {
      // One coarse cell is roughly one dot's own territory, so the image only needs sampling at that
      // resolution. The candidate lattice below subdivides each coarse cell further, for where a dot sits.
      const minDist = Math.max(0.6, (props.dotSize * 1.8) / props.density) * dpr;
      const coarseCols = Math.min(220, Math.max(1, Math.round(w / minDist)));
      const coarseRows = Math.min(220, Math.max(1, Math.round(h / minDist)));
      const coarseW = w / coarseCols;
      const coarseH = h / coarseRows;
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols: coarseCols, rows: coarseRows, aspect: coarseW / coarseH, n: 1,
        fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      const size = props.maskSize;
      const mask = blueNoiseMatrix(size);
      const n = size * size;
      const target = new Float32Array(coarseCols * coarseRows);
      for (let i = 0; i < target.length; i++) target[i] = Math.min(1, Math.max(0, ink[i] ?? 0)) ** props.gamma;

      const subdiv = 4;
      const fineCols = coarseCols * subdiv;
      const fineRows = coarseRows * subdiv;
      const fineW = w / fineCols;
      const fineH = h / fineRows;

      // Bucket every candidate site by the mask's own rank there, ascending, so the pass further down visits
      // sites in the order void and cluster grew its pattern: the sites that need the least tone to fire,
      // first.
      const buckets: number[][] = [];
      for (let r = 0; r < n; r++) buckets.push([]);
      for (let fy = 0; fy < fineRows; fy++) {
        const cy = (fy / subdiv) | 0;
        for (let fx = 0; fx < fineCols; fx++) {
          const v = maskAt(mask, size, fx, fy);
          const cx = (fx / subdiv) | 0;
          if ((target[cy * coarseCols + cx] ?? 0) < v) continue;
          const rank = Math.min(n - 1, Math.max(0, Math.round(v * n - 0.5)));
          const bucket = buckets[rank];
          if (bucket) bucket.push(fy * fineCols + fx);
        }
      }

      // A flat spatial hash, one dot's width on a side, so keeping a site only ever checks its own and the
      // eight neighbouring cells for something already kept too close, never the whole picture.
      const gridCols = Math.max(1, Math.ceil(w / minDist)) + 2;
      const gridRows = Math.max(1, Math.ceil(h / minDist)) + 2;
      const spatial: (number[] | undefined)[] = new Array(gridCols * gridRows);
      const minDist2 = minDist * minDist;
      const dotsX: number[] = [];
      const dotsY: number[] = [];
      scan:
      for (let r = 0; r < n; r++) {
        const sites = buckets[r];
        if (!sites) continue;
        for (const site of sites) {
          if (dotsX.length >= 60000) break scan;
          const fx = site % fineCols;
          const fy = (site - fx) / fineCols;
          const px = (fx + 0.5) * fineW;
          const py = (fy + 0.5) * fineH;
          const gx = ((px / minDist) | 0) + 1;
          const gy = ((py / minDist) | 0) + 1;
          let close = false;
          for (let oy = -1; oy <= 1 && !close; oy++) {
            const row = (gy + oy) * gridCols;
            for (let ox = -1; ox <= 1 && !close; ox++) {
              const cell = spatial[row + gx + ox];
              if (!cell) continue;
              for (let k = 0; k < cell.length; k += 2) {
                const dx = (cell[k] ?? 0) - px;
                const dy = (cell[k + 1] ?? 0) - py;
                if (dx * dx + dy * dy < minDist2) {
                  close = true;
                  break;
                }
              }
            }
          }
          if (close) continue;
          dotsX.push(px);
          dotsY.push(py);
          const cellIndex = gy * gridCols + gx;
          const cell = spatial[cellIndex];
          if (cell) cell.push(px, py);
          else spatial[cellIndex] = [px, py];
        }
      }

      const radius = Math.max(0.35, (props.dotSize * dpr) / 2);
      ctx.fillStyle = palette.colors.fg;
      for (let i = 0; i < dotsX.length; i++) {
        ctx.beginPath();
        ctx.arc(dotsX[i] ?? 0, dotsY[i] ?? 0, radius, 0, Math.PI * 2);
        ctx.fill();
      }
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
