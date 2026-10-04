import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPlate, inkPixels } from "../../../lib/pixels";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount, MotionProps } from "../../../lib/types";

export interface EngravedReliefImageProps extends MotionProps {
  /** Image URL or data URI. Empty uses a built-in sphere without a network request. */
  src: string;
  /** Engraving depth in working pixels, from 0 to 48. */
  depth: number;
  /** Starting azimuth of the grazing light, in degrees. */
  lightAngle: number;
  /** Light rotation speed in degrees per second; zero holds the light still. */
  speed: number;
}

export const defaults: EngravedReliefImageProps = {
  src: "",
  depth: 28,
  lightAngle: -38,
  speed: 7,
  paused: false,
  time: null,
  seed: 1,
};

const RELIEF_WORK_MAX = 320;

/** Luminance is carved once into a height field. Frames only shade its fixed normals. */
export const mount: Mount<EngravedReliefImageProps> = (host, initial = {}) => {
  let props: EngravedReliefImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let started = false;
  let destroyed = false;
  let failed = false;
  let workW = 0;
  let workH = 0;
  let heights = new Float32Array(0);
  let nx = new Float32Array(0);
  let ny = new Float32Array(0);
  let nz = new Float32Array(0);
  let ink = new Float32Array(0);
  let tones = new Float32Array(0);
  let output: ImageData | undefined;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  const priorReady = host.getAttribute("data-pica-ready");
  const sampler = createSampler();
  const relief = createPlate();
  const undercoat = createPlate();
  const surface = createCanvas(host, { onResize: () => resized() });
  const ctx = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => recolor());

  function finite(value: number, fallback: number): number {
    return Number.isFinite(value) ? value : fallback;
  }

  function dimensions(): [number, number] {
    const width = Math.max(1, surface.cssWidth);
    const height = Math.max(1, surface.cssHeight);
    const scale = Math.min(1, RELIEF_WORK_MAX / Math.max(width, height));
    return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
  }

  function setNote(on: boolean): void {
    if (on && !removeNote) removeNote = showNote(host, "image unavailable");
    if (!on && removeNote) {
      removeNote();
      removeNote = null;
    }
  }

  function recolor(): void {
    if (workW && workH && tones.length) {
      undercoat.put(inkPixels(tones, workW, workH, parseColor(palette.colors.muted)));
    }
    if (started && !destroyed) loop.redraw();
  }

  function normals(): void {
    const depth = Math.max(0, Math.min(48, finite(props.depth, defaults.depth)));
    for (let y = 0; y < workH; y++) {
      for (let x = 0; x < workW; x++) {
        const i = y * workW + x;
        const left = heights[y * workW + Math.max(0, x - 1)] ?? 0;
        const right = heights[y * workW + Math.min(workW - 1, x + 1)] ?? 0;
        const top = heights[Math.max(0, y - 1) * workW + x] ?? 0;
        const bottom = heights[Math.min(workH - 1, y + 1) * workW + x] ?? 0;
        const dx = (right - left) * depth * 0.5;
        const dy = (bottom - top) * depth * 0.5;
        const inverse = 1 / Math.sqrt(dx * dx + dy * dy + 1);
        nx[i] = -dx * inverse;
        ny[i] = -dy * inverse;
        nz[i] = inverse;
      }
    }
  }

  function prepare(): void {
    if (!source || destroyed) return;
    const [width, height] = dimensions();
    workW = width;
    workH = height;
    const values = sampler.sample(source.image, source.width, source.height, host, {
      cols: width, rows: height, aspect: 1, n: 1,
      fit: fitFor(source, "contain"), tone: "light-on-dark", contrast: 1, mirror: false,
    });
    const size = width * height;
    heights = new Float32Array(size);
    nx = new Float32Array(size);
    ny = new Float32Array(size);
    nz = new Float32Array(size);
    ink = new Float32Array(size);
    tones = new Float32Array(size);
    output = new ImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const value = Math.max(0, Math.min(1, values[i] ?? 0));
        ink[i] = value;
        // Curved tool cuts follow luminance contours. They are fixed geometry:
        // the moving light reveals the cuts without moving them.
        const cut = Math.pow(0.5 + 0.5 * Math.cos(y * 1.16 + value * 35 + x * 0.07 + finite(props.seed, defaults.seed) * 0.19), 8);
        heights[i] = -value * 0.82 - cut * value * 0.024;
        tones[i] = 0.08 + value * 0.42;
      }
    }
    normals();
    recolor();
  }

  function use(next: Source): void {
    if (destroyed) return;
    source = next;
    undoAspect();
    undoAspect = fitHostAspect(host, next.width, next.height);
    try {
      prepare();
    } catch {
      source = null;
      failed = true;
      if (started) loop.redraw();
    }
  }

  function load(): void {
    cancel();
    failed = false;
    source = null;
    cancel = loadSource(props.src, use, () => {
      failed = true;
      source = null;
      if (started) loop.redraw();
    });
    if (started) loop.redraw();
  }

  function resized(): void {
    const [width, height] = dimensions();
    if (width !== workW || height !== workH) prepare();
    else if (started && !destroyed) loop.redraw();
  }

  function draw(t: number): void {
    if (destroyed) return;
    const width = Math.max(1, surface.cssWidth);
    const height = Math.max(1, surface.cssHeight);
    setNote(failed);
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = palette.colors.bg;
      ctx.fillRect(0, 0, width, height);
      if (source && output) {
        const angle = (finite(props.lightAngle, defaults.lightAngle) + t * 0.001 * finite(props.speed, defaults.speed)) * Math.PI / 180;
        const lx = Math.cos(angle) * 0.978;
        const ly = Math.sin(angle) * 0.978;
        const lz = 0.208;
        const fg = parseColor(palette.colors.fg);
        const pixels = output.data;
        for (let i = 0; i < ink.length; i++) {
          const light = Math.max(0, (nx[i] ?? 0) * lx + (ny[i] ?? 0) * ly + (nz[i] ?? 0) * lz);
          const value = ink[i] ?? 0;
          // Recessed faces stay dim; the wall facing the grazing light catches it.
          // Image sampling and height preparation never run inside a frame.
          const coverage = Math.min(1, 0.04 + value * 0.10 + light * (0.34 + value * 0.62));
          const j = i * 4;
          pixels[j] = fg[0];
          pixels[j + 1] = fg[1];
          pixels[j + 2] = fg[2];
          pixels[j + 3] = Math.round(coverage * fg[3]);
        }
        relief.put(output);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(undercoat.canvas, 0, 0, width, height);
        ctx.drawImage(relief.canvas, 0, 0, width, height);
        // The plate's single registration mark is the only accent.
        const inset = Math.max(9, Math.min(width, height) * 0.045);
        ctx.fillStyle = palette.colors.accent;
        ctx.fillRect(inset, height - inset - 3, 14, 3);
      }
    }
    if (source || failed) host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  load();
  const loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 0, frame: draw });
  started = true;

  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (palette.refresh()) recolor();
      loop.update({ paused: props.paused, time: props.time, fps: 24, still: 0 });
      if (props.src !== before.src) load();
      else {
        if (props.seed !== before.seed) prepare();
        else if (props.depth !== before.depth) normals();
        loop.redraw();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      loop.destroy();
      cancel();
      setNote(false);
      palette.destroy();
      surface.destroy();
      undoAspect();
      unlabelHost(host);
      if (priorReady === null) delete host.dataset.picaReady;
      else host.setAttribute("data-pica-ready", priorReady);
    },
  };
};
