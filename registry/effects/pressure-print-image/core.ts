import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { hostTone, parseColor } from "../../../lib/color";
import { hostAttributes, styleHost } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar, watchPalette } from "../../../lib/palette";
import { createPlate } from "../../../lib/pixels";
import { fitRect } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface PressurePrintImageProps {
  /** Image URL or data URI; empty input uses a built-in sphere without a network request. */
  src: string;
  /** Contact pressure from 0 to 1; stronger pressure increases footprint and ink density. */
  pressure: number;
  /** Base contact radius as a fraction of the host's shorter side, from 0.05 to 1.5. */
  radius: number;
  /** Contact center as [x, y] host fractions from 0 to 1; y increases downward. */
  position: [number, number];
  /** Contain keeps the complete image visible; cover fills the host and crops its edges. */
  fit: "contain" | "cover";
}

export const defaults: PressurePrintImageProps = {
  src: "",
  pressure: 0.78,
  radius: 0.48,
  position: [0.48, 0.52],
  fit: "contain",
};

const PRESSURE_WORK_MAX = 480;
const PRESSURE_ORDER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

function pressureNumber(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

/** Source tones are prepared once; an analytic contact field deposits a stable halftone. */
export const mount: Mount<PressurePrintImageProps> = (host, initial = {}) => {
  let props: PressurePrintImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let destroyed = false;
  let started = false;
  let failed = false;
  let generation = 0;
  let workW = 0;
  let workH = 0;
  let luminance = new Float32Array(0);
  let alpha = new Float32Array(0);
  let output: ImageData | null = null;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  const attributes = hostAttributes(host);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const input = document.createElement("canvas");
  input.setAttribute("data-pica", "");
  const inputContext = input.getContext("2d", { willReadFrequently: true });
  const plate = createPlate();
  const surface = createCanvas(host, { maxPixels: 2500000, onResize: () => resized() });
  const context = surface.canvas.getContext("2d");
  const palette = watchPalette(host, () => { if (started && !destroyed) draw(); });

  function note(on: boolean): void {
    if (on && !removeNote) removeNote = showNote(host, "image unavailable");
    if (!on && removeNote) {
      removeNote();
      removeNote = null;
    }
  }

  function dimensions(): [number, number] {
    const width = Math.max(1, surface.cssWidth);
    const height = Math.max(1, surface.cssHeight);
    const scale = Math.min(1, PRESSURE_WORK_MAX / Math.max(width, height));
    return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
  }

  function prepare(): void {
    if (!source || destroyed) return;
    if (!inputContext || !context) throw new Error("Canvas unavailable");
    const [width, height] = dimensions();
    input.width = width;
    input.height = height;
    inputContext.clearRect(0, 0, width, height);
    const box = fitRect(source.width, source.height, width, height, fitFor(source, props.fit === "cover" ? "cover" : "contain"));
    inputContext.drawImage(source.image, box.x, box.y, box.w, box.h);
    const pixels = inputContext.getImageData(0, 0, width, height).data;
    workW = width;
    workH = height;
    luminance = new Float32Array(width * height);
    alpha = new Float32Array(width * height);
    output = new ImageData(width, height);
    for (let i = 0; i < luminance.length; i++) {
      const offset = i * 4;
      const luma = (0.2126 * (pixels[offset] ?? 0) + 0.7152 * (pixels[offset + 1] ?? 0) + 0.0722 * (pixels[offset + 2] ?? 0)) / 255;
      luminance[i] = luma ** 2.2;
      alpha[i] = (pixels[offset + 3] ?? 0) / 255;
    }
  }

  function fail(): void {
    if (destroyed) return;
    source = null;
    output = null;
    failed = true;
    draw();
  }

  function resized(): void {
    if (!started || destroyed) return;
    const [width, height] = dimensions();
    if (source && (width !== workW || height !== workH)) {
      try { prepare(); } catch { fail(); return; }
    }
    draw();
  }

  function draw(): void {
    if (destroyed) return;
    const width = Math.max(1, surface.cssWidth);
    const height = Math.max(1, surface.cssHeight);
    note(failed);
    if (context) {
      context.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = palette.colors.bg;
      context.fillRect(0, 0, width, height);
      if (source && output) {
        const pressure = pressureNumber(props.pressure, defaults.pressure, 0, 1);
        const radius = pressureNumber(props.radius, defaults.radius, 0.05, 1.5);
        const position = Array.isArray(props.position) ? props.position : defaults.position;
        const centerX = pressureNumber(position[0] ?? defaults.position[0], defaults.position[0], 0, 1) * workW;
        const centerY = pressureNumber(position[1] ?? defaults.position[1], defaults.position[1], 0, 1) * workH;
        // Compression expands the contact patch while leaving its center fixed.
        // The same physical radius on both axes keeps the footprint circular.
        const contactRadius = Math.max(0.001, radius * Math.min(workW, workH) * (0.5 + 0.5 * Math.sqrt(pressure)));
        const inverseRadiusSquared = 1 / (contactRadius * contactRadius);
        const fg = parseColor(palette.colors.fg);
        const lightOnDark = hostTone(host) === "light-on-dark";
        const pixels = output.data;
        for (let y = 0; y < workH; y++) {
          for (let x = 0; x < workW; x++) {
            const i = y * workW + x;
            const dx = x + 0.5 - centerX;
            const dy = y + 0.5 - centerY;
            const contact = Math.max(0, 1 - (dx * dx + dy * dy) * inverseRadiusSquared);
            const localPressure = pressure * contact * contact * (3 - 2 * contact);
            const value = luminance[i] ?? 0;
            const tone = lightOnDark ? value : 1 - value;
            // More pressure fills more stationary ink sites; no random frame noise.
            const density = Math.pow(Math.max(0, tone), 0.75) * Math.min(1, localPressure * 1.65);
            const threshold = ((PRESSURE_ORDER[(y % 4) * 4 + x % 4] ?? 0) + 0.5) / 16;
            const printed = pressure > 0 && density >= threshold;
            const offset = i * 4;
            pixels[offset] = fg[0];
            pixels[offset + 1] = fg[1];
            pixels[offset + 2] = fg[2];
            pixels[offset + 3] = printed ? Math.round((alpha[i] ?? 0) * fg[3]) : 0;
          }
        }
        plate.put(output);
        context.imageSmoothingEnabled = false;
        context.drawImage(plate.canvas, 0, 0, width, height);
      }
    }
    if ((source && output) || failed) attributes.set("data-pica-ready", "true");
  }

  function load(): void {
    cancel();
    const current = ++generation;
    source = null;
    output = null;
    failed = false;
    note(false);
    undoAspect();
    undoAspect = (): void => undefined;
    attributes.set("data-pica-ready", null);
    draw();
    cancel = loadSource(props.src, (next) => {
      if (destroyed || current !== generation) return;
      source = next;
      undoAspect = fitHostAspect(host, next.width, next.height);
      try { prepare(); } catch { fail(); return; }
      draw();
    }, () => { if (!destroyed && current === generation) fail(); });
  }

  labelHost(host, "");
  started = true;
  load();

  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      const paletteChanged = palette.refresh();
      if (before.src !== props.src) load();
      else {
        if (before.fit !== props.fit && source) {
          try { prepare(); } catch { fail(); return; }
          draw();
        } else if (paletteChanged || before.pressure !== props.pressure || before.radius !== props.radius || !sameJson(before.position, props.position)) draw();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      generation++;
      cancel();
      note(false);
      palette.destroy();
      undoAspect();
      surface.destroy();
      restore();
      unlabelHost(host);
      attributes.restore();
      source = null;
      output = null;
      luminance = new Float32Array(0);
      alpha = new Float32Array(0);
    },
  };
};
