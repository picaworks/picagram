import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { hostAttributes } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPlate, inkPixels } from "../../../lib/pixels";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PixelWeftImageProps extends MotionProps {
  /** Image URL or data URI; empty uses the built-in sphere without a network request. */
  src: string;
  /** Square crossing size in CSS pixels, from 8 to 64. */
  cellSize: number;
  /** Starting reveal fraction, from 0 to 1; set speed to zero to hold this position. */
  progress: number;
  /** Reveal fraction per second, from -0.15 to 0.15; stops advancing at either endpoint. */
  speed: number;
}

export const defaults: PixelWeftImageProps = {
  src: "",
  cellSize: 20,
  progress: 0.74,
  speed: 0.025,
  paused: false,
  time: null,
  seed: 1,
};

const WEFT_WORK_MAX = 512;

function weftFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function weftUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** The image is sampled once; animation only reveals registered horizontal and vertical strips. */
export const mount: Mount<PixelWeftImageProps> = (host, initial = {}) => {
  let props: PixelWeftImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let alive = true;
  let failed = false;
  let loop: Loop | null = null;
  let workW = 0;
  let workH = 0;
  let tones = new Float32Array(0);
  let lastProgress = -1;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  const attributes = hostAttributes(host);
  const sampler = createSampler();
  const over = createPlate();
  const under = createPlate();
  const surface = createCanvas(host, { maxPixels: 2400000, onResize: () => resized() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => recolor());

  function note(): void {
    if (failed && !removeNote) removeNote = showNote(host, "image unavailable");
    if (!failed && removeNote) {
      removeNote();
      removeNote = null;
    }
  }

  function dimensions(): [number, number] {
    const width = Math.max(1, surface.cssWidth);
    const height = Math.max(1, surface.cssHeight);
    const scale = Math.min(1, WEFT_WORK_MAX / Math.max(width, height));
    return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
  }

  function recolor(): void {
    if (!alive) return;
    if (tones.length) {
      over.put(inkPixels(tones, workW, workH, parseColor(palette.colors.fg)));
      under.put(inkPixels(tones, workW, workH, parseColor(palette.colors.muted)));
    }
    lastProgress = -1;
    loop?.redraw();
  }

  function prepare(): void {
    if (!source || !alive) return;
    [workW, workH] = dimensions();
    try {
      const sampled = sampler.sample(source.image, source.width, source.height, host, {
        cols: workW, rows: workH, aspect: 1, n: 1,
        fit: fitFor(source, "cover"), tone: "light-on-dark", contrast: 1, mirror: false,
      });
      tones = new Float32Array(workW * workH);
      for (let i = 0; i < tones.length; i++) tones[i] = weftUnit(sampled[i] ?? 0);
      recolor();
    } catch {
      source = null;
      tones = new Float32Array(0);
      failed = true;
      lastProgress = -1;
      loop?.redraw();
    }
  }

  function load(): void {
    cancel();
    source = null;
    tones = new Float32Array(0);
    failed = false;
    lastProgress = -1;
    attributes.set("data-pica-ready", null);
    undoAspect();
    undoAspect = (): void => undefined;
    cancel = loadSource(props.src, (next) => {
      if (!alive) return;
      source = next;
      undoAspect();
      undoAspect = fitHostAspect(host, next.width, next.height);
      prepare();
      loop?.redraw();
    }, () => {
      if (!alive) return;
      failed = true;
      lastProgress = -1;
      loop?.redraw();
    });
    loop?.redraw();
  }

  function resized(): void {
    if (!alive) return;
    const [width, height] = dimensions();
    lastProgress = -1;
    if (source && (width !== workW || height !== workH)) prepare();
    loop?.redraw();
  }

  function frame(time: number, reduced: boolean): void {
    if (!alive) return;
    note();
    const progress = weftUnit(weftFinite(props.progress, defaults.progress)
      + (reduced ? 0 : time / 1000 * Math.min(0.15, Math.max(-0.15, weftFinite(props.speed, defaults.speed)))));
    if (progress === lastProgress) return;
    lastProgress = progress;
    const width = Math.max(1, surface.cssWidth);
    const height = Math.max(1, surface.cssHeight);
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = palette.colors.bg;
      ctx.fillRect(0, 0, width, height);
      if (source && tones.length) {
        // Limits keep huge surfaces from creating unbounded numbers of crossings.
        const cell = Math.max(Math.min(64, Math.max(8, weftFinite(props.cellSize, defaults.cellSize))), width / 120, height / 120);
        const cols = Math.ceil(width / cell);
        const rows = Math.ceil(height / cell);
        const ribbon = cell * 0.78;
        const inset = (cell - ribbon) / 2;
        const seed = Math.round(weftFinite(props.seed, defaults.seed));
        const offset = ((seed % 2) + 2) % 2;
        const scaleX = workW / width;
        const scaleY = workH / height;
        ctx.imageSmoothingEnabled = true;

        function strip(horizontal: boolean, x: number, y: number, row: number, col: number, upper: boolean): void {
          if (!ctx) return;
          const lane = horizontal ? row : col;
          const delay = (Math.sin(lane * 1.73 + seed * 0.37) + 1) * 0.075;
          const arrival = weftUnit((progress - delay) / 0.85);
          const extent = horizontal ? width : height;
          const reverse = (lane + offset) % 2 !== 0;
          const start = reverse ? extent * (1 - arrival) : 0;
          const end = reverse ? extent : extent * arrival;
          let left = x + (horizontal ? 0 : inset);
          let top = y + (horizontal ? inset : 0);
          let right = Math.min(width, left + (horizontal ? cell : ribbon));
          let bottom = Math.min(height, top + (horizontal ? ribbon : cell));
          if (horizontal) {
            left = Math.max(left, start);
            right = Math.min(right, end);
          } else {
            top = Math.max(top, start);
            bottom = Math.min(bottom, end);
          }
          const w = right - left;
          const h = bottom - top;
          if (w <= 0 || h <= 0) return;
          const plate = upper ? over : under;
          ctx.drawImage(plate.canvas, left * scaleX, top * scaleY, w * scaleX, h * scaleY, left, top, w, h);
        }

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = col * cell;
            const y = row * cell;
            const horizontalOver = (row + col + offset) % 2 === 0;
            // Checkerboard over/under ordering changes at every crossing in both axes.
            // Both strips read the same image coordinates: this is interlacing, not rotation.
            strip(!horizontalOver, x, y, row, col, false);
            strip(horizontalOver, x, y, row, col, true);
          }
        }
      }
    }
    if (source || failed) attributes.set("data-pica-ready", "true");
  }

  labelHost(host, "");
  load();
  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 0, frame });

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (palette.refresh()) recolor();
      lastProgress = -1;
      loop?.update({ paused: props.paused, time: props.time, fps: 24, still: 0 });
      if (before.src !== props.src) load();
      else loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      cancel();
      removeNote?.();
      palette.destroy();
      surface.destroy();
      undoAspect();
      unlabelHost(host);
      attributes.restore();
    },
  };
};
