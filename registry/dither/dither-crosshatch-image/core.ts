import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { watchPalette } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount } from "../../../lib/types";

export interface DitherCrosshatchImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" hatches the bright pixels; "dark-on-light" hatches the dark ones. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** How many hatch layers can switch on, from a single wash to a dense mesh. */
  layers: number;
  /** Distance between the strokes of one layer, in CSS pixels. */
  spacing: number;
  /** Angle of each layer's strokes, in degrees, one entry per layer. */
  angles: readonly number[];
  /** Stroke thickness in CSS pixels. */
  weight: number;
  /** How far a stroke wanders from a straight line, 0 to 1. */
  jitter: number;
  /** Seed for the jitter, so the same seed always draws the same picture. */
  seed: number;
}

export const defaults: DitherCrosshatchImageProps = {
  src: "",
  alt: "",
  fit: "cover",
  tone: "auto",
  contrast: 1.1,
  layers: 3,
  spacing: 6,
  angles: [45, 135, 0, 90],
  weight: 1,
  jitter: 0.3,
  seed: 1,
};

export const mount: Mount<DitherCrosshatchImageProps> = (host, initial = {}) => {
  let props: DitherCrosshatchImageProps = { ...defaults, ...initial };
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

  function draw(): void {
    const w = surface.cssWidth;
    const h = surface.cssHeight;
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
    }
    setNote(failed);
    if (ctx && source && !failed) {
      const spacing = props.spacing > 0 ? props.spacing : 1;
      // One tone sample per half a stroke's spacing: fine enough that a threshold crossing falls where the
      // picture actually changes, coarse enough that the pass stays quick at any host size.
      const cell = Math.max(1, spacing / 2);
      const cols = Math.max(1, Math.round(w / cell));
      const rows = Math.max(1, Math.round(h / cell));
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols, rows, aspect: 1, n: 1, fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      // Bilinear tone at any point in the host, so a stroke can be tested part way between two samples
      // instead of snapping to the nearest one.
      const toneAt = (x: number, y: number): number => {
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
        return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
      };
      const count = Math.min(4, Math.max(1, Math.round(props.layers)));
      const angleList = props.angles.length > 0 ? props.angles : defaults.angles;
      const weight = props.weight > 0 ? props.weight : 1;
      const amount = Math.min(1, Math.max(0, props.jitter));
      // A step much smaller than the spacing, so a threshold edge and a jitter wobble both fall on a stroke
      // rather than between two tested points.
      const step = Math.max(1.5, spacing / 3);
      const corners: [number, number][] = [[0, 0], [w, 0], [0, h], [w, h]];
      ctx.strokeStyle = palette.colors.fg;
      ctx.lineWidth = weight;
      ctx.lineCap = "round";
      for (let i = 0; i < count; i++) {
        // Spread across the tone range, never at its ends, so no pixel switches on every layer at once and
        // the brightest ground never takes ink at all. Nesting comes for free: a tone that clears layer 3's
        // threshold also clears layers 0 through 2, so every lighter layer's strokes stay right where they were.
        const band = (i + 1) / (count + 1);
        const angle = ((angleList[i % angleList.length] ?? 0) * Math.PI) / 180;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        // This layer's own axes: u runs along a stroke, v crosses from one stroke to the next. Rotating the
        // host's own corners into that frame says how many strokes cross it and how long each one runs.
        let uMin = Infinity;
        let uMax = -Infinity;
        let vMin = Infinity;
        let vMax = -Infinity;
        for (const [cx, cy] of corners) {
          const pu = cx * cosA + cy * sinA;
          const pv = -cx * sinA + cy * cosA;
          if (pu < uMin) uMin = pu;
          if (pu > uMax) uMax = pu;
          if (pv < vMin) vMin = pv;
          if (pv > vMax) vMax = pv;
        }
        const kMin = Math.floor(vMin / spacing) - 1;
        const kMax = Math.ceil(vMax / spacing) + 1;
        ctx.beginPath();
        for (let k = kMin; k <= kMax; k++) {
          // Each stroke gets its own wobble, seeded from the layer and the stroke's own index, so neighboring
          // strokes never wander in lockstep.
          const rng = createRng(hashSeed(props.seed, i, k));
          const freq = 0.01 + rng() * 0.015;
          const phase = rng() * Math.PI * 2;
          const amp = amount * spacing * 0.3;
          const v = k * spacing;
          let drawing = false;
          for (let u = uMin; u <= uMax + step; u += step) {
            const wobble = amp > 0 ? Math.sin(u * freq + phase) * amp : 0;
            const vv = v + wobble;
            const x = u * cosA - vv * sinA;
            const y = u * sinA + vv * cosA;
            // The pen lifts wherever the tone falls short of this layer's threshold, so the mesh thins out
            // and stops on its own: no separate outline carries the subject's silhouette.
            const on = x >= 0 && x <= w && y >= 0 && y <= h && toneAt(x, y) >= band;
            if (on) {
              if (drawing) ctx.lineTo(x, y);
              else {
                ctx.moveTo(x, y);
                drawing = true;
              }
            } else {
              drawing = false;
            }
          }
        }
        ctx.stroke();
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
