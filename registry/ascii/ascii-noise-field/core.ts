import { labelHost, unlabelHost } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { createLoop } from "../../../lib/loop";
import { createNoise } from "../../../lib/noise";
import { FALLBACK_RAMP, measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiNoiseFieldProps extends MotionProps {
  /** Spatial frequency of the noise. Smaller values stretch it into broad drifting shapes, larger values pack in fine grain. */
  scale: number;
  /** How fast the field drifts, in noise units per second. */
  speed: number;
  /** Layers of noise summed at doubling frequency and halving weight, for finer detail. */
  octaves: number;
  /** How sharply ink rises around `density`. 1 is a soft gradient; 3 pushes the field toward a threshold. */
  contrast: number;
  /** The noise level mapped to the middle of the glyph ramp. Raise it for a sparser field, lower it for a denser one. */
  density: number;
  /** Glyphs to draw with, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** Glyph size in CSS pixels. */
  fontSize: number;
  /** CSS font-family stack for the glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
  /** Frames per second ceiling for the animation. */
  fps: number;
}

export const defaults: AsciiNoiseFieldProps = {
  scale: 0.08,
  speed: 0.15,
  octaves: 2,
  contrast: 1.4,
  density: 0.45,
  glyphs: FALLBACK_RAMP,
  fontSize: 12,
  fontFamily: GRID_FONT,
  lineHeight: 1.2,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame shown under prefers-reduced-motion, and the one captures judge the component by. */
const STILL_TIME = 1200;

/** Amplitude kept from one octave to the next: each layer adds half the detail of the one before it. */
const OCTAVE_GAIN = 0.5;

/** Octaves beyond this add cost without a visible change at typical grid sizes. */
const MAX_OCTAVES = 3;

export const mount: Mount<AsciiNoiseFieldProps> = (host, initial = {}) => {
  let props: AsciiNoiseFieldProps = { ...defaults, ...initial };
  let noise = createNoise(props.seed);
  let ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
  // Reused every frame so drawing allocates nothing: one entry per octave.
  const freq = [1, 1, 1];
  const rowCoord = [0, 0, 0];
  const timeCoord = [0, 0, 0];

  function gridOptions(p: AsciiNoiseFieldProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  function draw(t: number): void {
    const { cols, rows, aspect } = grid;
    const octaves = Math.min(MAX_OCTAVES, Math.max(1, Math.round(props.octaves)));
    const scale = props.scale;
    const contrast = props.contrast;
    const density = props.density;
    const seconds = (t / 1000) * props.speed;
    let f = 1;
    for (let o = 0; o < octaves; o++) {
      freq[o] = f;
      timeCoord[o] = seconds * f;
      f *= 2;
    }
    for (let y = 0; y < rows; y++) {
      for (let o = 0; o < octaves; o++) rowCoord[o] = ((y * scale) / aspect) * (freq[o] ?? 1);
      for (let x = 0; x < cols; x++) {
        let sum = 0;
        let amp = 1;
        let norm = 0;
        for (let o = 0; o < octaves; o++) {
          sum += noise.noise3(x * scale * (freq[o] ?? 1), rowCoord[o] ?? 0, timeCoord[o] ?? 0) * amp;
          norm += amp;
          amp *= OCTAVE_GAIN;
        }
        const level = sum / norm / 2 + 0.5;
        // A soft curve around `density`: contrast stretches how quickly ink rises on either side
        // of the pivot, and the clamp only bites at the rare extremes the noise itself reaches.
        const shaped = Math.min(1, Math.max(0, (level - density) * contrast + 0.5));
        grid.set(x, y, pick(ramp, shaped));
      }
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  const grid = createGrid(host, gridOptions(props), () => {
    ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
    loop.redraw();
  });

  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    still: STILL_TIME,
    frame: draw,
  });

  labelHost(host, "");

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.seed !== before.seed) noise = createNoise(props.seed);
      if (props.glyphs !== before.glyphs || props.fontFamily !== before.fontFamily || props.lineHeight !== before.lineHeight) {
        ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
      }
      if (props.fontFamily !== before.fontFamily || props.fontSize !== before.fontSize || props.lineHeight !== before.lineHeight) {
        grid.update(gridOptions(props));
      }
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      loop.destroy();
      grid.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
