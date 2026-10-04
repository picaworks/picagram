import { labelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { hostAttributes } from "../../../lib/host";
import { watchPalette } from "../../../lib/palette";
import { createPlate, inkPixels } from "../../../lib/pixels";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface EdgeFoldImageProps {
  /** Image URL or data URI; empty uses the built-in sphere without a network request. */
  src: string;
  /** Edge whose strip folds toward the viewer around its fixed crease. */
  edge: "left" | "right" | "top" | "bottom";
  /** Fold amount from 0 (flat) to 1 (a 76-degree rotation), changing projection and exposed area. */
  fold: number;
  /** Depth of the crease measured inward from the chosen edge, as a fraction from 0.04 to 0.46. */
  crease: number;
}

export const defaults: EdgeFoldImageProps = {
  src: "",
  edge: "right",
  fold: 0.68,
  crease: 0.32,
};

const EDGE_FOLD_MAX = 560;

function edgeFoldNumber(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<EdgeFoldImageProps> = (host, initial = {}) => {
  let props: EdgeFoldImageProps = { ...defaults, ...initial };
  let alive = true;
  let source: Source | null = null;
  let failed = false;
  let initialized = false;
  let workW = 0;
  let workH = 0;
  let values = new Float32Array(0);
  let coverage = new Float32Array(0);
  let cancel = (): void => undefined;
  let restoreAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  const attributes = hostAttributes(host);
  attributes.set("role", null);
  attributes.set("aria-label", null);
  attributes.set("aria-hidden", "true");
  labelHost(host, "");
  const sampler = createSampler();
  const plate = createPlate();
  const surface = createCanvas(host, { maxPixels: 2400000, onResize: () => {
    if (!initialized || !alive) return;
    prepare();
    draw();
  } });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => draw());

  function note(): void {
    if (failed && !removeNote) removeNote = showNote(host, "image unavailable");
    if (!failed && removeNote) { removeNote(); removeNote = null; }
  }

  function prepare(): void {
    if (!alive || !source) return;
    const width = Math.max(1, surface.cssWidth);
    const height = Math.max(1, surface.cssHeight);
    const scale = Math.min(1, EDGE_FOLD_MAX / Math.max(width, height));
    workW = Math.max(1, Math.round(width * scale));
    workH = Math.max(1, Math.round(height * scale));
    try {
      values = sampler.sample(source.image, source.width, source.height, host, {
        cols: workW, rows: workH, aspect: 1, n: 1,
        fit: fitFor(source, "cover"), tone: "light-on-dark", contrast: 1, mirror: false,
      }).slice();
      coverage = new Float32Array(workW * workH);
    } catch {
      source = null;
      values = new Float32Array(0);
      failed = true;
    }
  }

  function sample(x: number, y: number): number {
    const left = Math.max(0, Math.min(workW - 1, Math.floor(x)));
    const top = Math.max(0, Math.min(workH - 1, Math.floor(y)));
    const right = Math.min(workW - 1, left + 1);
    const bottom = Math.min(workH - 1, top + 1);
    const fx = Math.max(0, Math.min(1, x - left));
    const fy = Math.max(0, Math.min(1, y - top));
    const a = (values[top * workW + left] ?? 0) * (1 - fx) + (values[top * workW + right] ?? 0) * fx;
    const b = (values[bottom * workW + left] ?? 0) * (1 - fx) + (values[bottom * workW + right] ?? 0) * fx;
    return a * (1 - fy) + b * fy;
  }

  function draw(): void {
    if (!initialized || !alive) return;
    note();
    const width = Math.max(1, surface.cssWidth);
    const height = Math.max(1, surface.cssHeight);
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = palette.colors.bg;
      ctx.fillRect(0, 0, width, height);
      if (source && values.length) {
        const edge = ["left", "right", "top", "bottom"].includes(props.edge) ? props.edge : "right";
        const vertical = edge === "left" || edge === "right";
        const axis = vertical ? workW : workH;
        const cross = vertical ? workH : workW;
        const hinge = axis * edgeFoldNumber(props.crease, defaults.crease, 0.04, 0.46);
        const amount = edgeFoldNumber(props.fold, defaults.fold, 0, 1);
        const angle = amount * 76 * Math.PI / 180;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const camera = Math.max(axis, cross) * 2.8;
        const freeEdge = hinge - hinge * cosine * camera / (camera - hinge * sine);
        const shade = 0.46 + cosine * 0.54;
        coverage.fill(0);
        for (let y = 0; y < workH; y++) {
          for (let x = 0; x < workW; x++) {
            // Canonical coordinates always run inward from the selected edge.
            const u = edge === "left" ? x + 0.5 : edge === "right" ? workW - x - 0.5
              : edge === "top" ? y + 0.5 : workH - y - 0.5;
            const v = vertical ? y + 0.5 : x + 0.5;
            let sourceU = u;
            let sourceV = v;
            let lighting = 1;
            if (u < hinge) {
              if (u < freeEdge) continue;
              // Invert perspective for a rigid strip rotated about the hinge:
              // p = t*cos(angle)*camera/(camera-t*sin(angle)).
              // This changes scale along both axes, while the crease stays put.
              const p = hinge - u;
              const t = p * camera / (camera * cosine + p * sine);
              const perspective = camera / (camera - t * sine);
              sourceU = hinge - t;
              sourceV = cross / 2 + (v - cross / 2) / perspective;
              if (sourceU < 0 || sourceV < 0 || sourceV >= cross) continue;
              lighting = shade;
            }
            const sx = edge === "left" ? sourceU - 0.5 : edge === "right" ? workW - sourceU - 0.5 : sourceV - 0.5;
            const sy = edge === "top" ? sourceU - 0.5 : edge === "bottom" ? workH - sourceU - 0.5 : sourceV - 0.5;
            const imageInk = sample(sx, sy);
            // A faint sheet ground makes the exposed opening legible even when
            // the image has dark margins. The front remains a single palette ink.
            let value = (0.065 + imageInk * 0.9) * lighting;
            const seam = Math.max(0, 1 - Math.abs(u - hinge) / 1.25) * amount;
            value = Math.min(1, value + seam * 0.21);
            coverage[y * workW + x] = value;
          }
        }
        plate.put(inkPixels(coverage, workW, workH, parseColor(palette.colors.fg)));
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(plate.canvas, 0, 0, width, height);
      }
    }
    if (source || failed) attributes.set("data-pica-ready", "true");
  }

  function load(): void {
    cancel();
    failed = false;
    source = null;
    values = new Float32Array(0);
    attributes.set("data-pica-ready", null);
    restoreAspect();
    restoreAspect = (): void => undefined;
    cancel = loadSource(props.src, (next) => {
      if (!alive) return;
      source = next;
      restoreAspect = fitHostAspect(host, next.width, next.height);
      prepare();
      draw();
    }, () => {
      if (!alive) return;
      failed = true;
      draw();
    });
    draw();
  }

  initialized = true;
  load();
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const paletteChanged = palette.refresh();
      if (before.src !== props.src) load();
      else if (before.edge !== props.edge || before.fold !== props.fold || before.crease !== props.crease || paletteChanged) draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      cancel();
      removeNote?.();
      removeNote = null;
      palette.destroy();
      surface.destroy();
      restoreAspect();
      attributes.restore();
    },
  };
};
