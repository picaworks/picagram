import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { createLoop } from "../../../lib/loop";
import { createNoise } from "../../../lib/noise";
import { watchPalette } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface TerrainFieldProps extends MotionProps {
  /** Profile lines in the stack, from a flat hairline at the horizon to the nearest ridge. */
  rows: number;
  /** Points sampled along each profile line. More columns draw a smoother ridge. */
  columns: number;
  /** Horizontal frequency of the height field: how many landforms fit across the frame. */
  scale: number;
  /** The most a ridge may rise, as a fraction of the frame's height. */
  height: number;
  /** How strongly the rows crowd toward the horizon and grow toward the viewer. */
  perspective: number;
  /** How fast the rows drift toward the viewer. 0 holds the terrain still. */
  speed: number;
  /** Stroke width of each profile line, in CSS pixels. */
  weight: number;
  /** How much the far rows dim toward the muted color. 0 draws every row at full strength. */
  fade: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: TerrainFieldProps = {
  rows: 40,
  columns: 160,
  scale: 1.8,
  height: 0.5,
  perspective: 0.5,
  speed: 0.15,
  weight: 1,
  fade: 0.6,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame held under reduced motion, and the time captures use. */
const STILL = 1200;
/** Where the farthest rows converge, as a fraction of the frame's height from the top. */
const HORIZON_AT = 0.16;
/** Rows that cross the field per second at speed 1. */
const ROW_RATE = 5;
/** Depth between two adjacent rows in the noise field, so neighboring profiles stay related. */
const ROW_DEPTH = 0.85;
/** The most a ridge rises at the nearest row at height 1, as a fraction of the frame's height. */
const AMP_TOP = 0.5;
/** Row spacing exponent added by perspective: at 0 rows sit evenly, at 1 they crowd the horizon. */
const SPACE_CURVE = 2.5;
/** Amplitude exponent: a row's relief grows with this power of its approach, so a new row rises out of the
 *  horizon instead of popping into existence. */
const RISE_CURVE = 1.3;
/** Extra amplitude exponent at perspective 1, which flattens the far rows further. */
const RISE_GAIN = 0.8;
/** Detail octave's frequency ratio and weight against the broad octave. */
const DETAIL_FREQ = 2.31;
const DETAIL_AMP = 0.3;
/** Sample offset for the detail octave, so its features never line up with the broad one's. */
const DETAIL_BIAS = 19.7;
/** The floating horizon starts above anything a profile can reach. */
const FAR = 1e9;

const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value));

export const mount: Mount<TerrainFieldProps> = (host, initial = {}) => {
  let props: TerrainFieldProps = { ...defaults, ...initial };
  let noise = createNoise(props.seed);
  let horizon = new Float32Array(0);
  let samples = new Float32Array(0);
  let fgInk = [0, 0, 0, 255] as [number, number, number, number];
  let mutedInk = [0, 0, 0, 255] as [number, number, number, number];

  const surface = createCanvas(host, { onResize: () => loop.redraw() });
  const ctx = surface.canvas.getContext("2d");

  function syncInk(): void {
    fgInk = parseColor(palette.colors.fg);
    mutedInk = parseColor(palette.colors.muted);
  }

  const palette = watchPalette(host, () => {
    syncInk();
    loop.redraw();
  });
  syncInk();

  function draw(t: number): void {
    const { width, height, dpr, cssWidth, cssHeight } = surface;
    if (ctx && width > 0 && height > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const lineWidth = clamp(props.weight, 0.5, 2);
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      const W = cssWidth;
      const H = cssHeight;
      const pxW = Math.max(1, Math.round(W));
      if (horizon.length !== pxW) horizon = new Float32Array(pxW);
      horizon.fill(FAR);

      const count = Math.round(clamp(props.rows, 12, 80));
      const cols = Math.round(clamp(props.columns, 40, 400));
      if (samples.length !== cols) samples = new Float32Array(cols);
      const horizonY = H * HORIZON_AT;
      const ampTop = clamp(props.height, 0, 1) * H * AMP_TOP;
      const exitY = H + ampTop * 1.4 + lineWidth * 2 + 2;
      const band = exitY - horizonY;
      const perspective = clamp(props.perspective, 0, 1);
      const spacePow = 1 + perspective * SPACE_CURVE;
      const risePow = RISE_CURVE + perspective * RISE_GAIN;
      const sc = clamp(props.scale, 0.5, 6);
      const fade = clamp(props.fade, 0, 1);
      const phase = (t / 1000) * clamp(props.speed, 0, 1) * ROW_RATE;
      const wrap = Math.ceil(phase);
      const span = cols - 1;
      const step = span / Math.max(1, pxW - 1);

      // Wright's two-space solution: rows draw nearest first, and a running upper envelope per pixel column
      // keeps the highest line drawn so far. A row's segment shows only where it rises above that envelope,
      // which is what lets a ridge hide the rows behind it without any fill.
      for (let j = 0; j < count; j++) {
        const m = j + wrap - phase;
        const u = 1 - m / count;
        const baseY = horizonY + band * Math.pow(u, spacePow);
        const amp = ampTop * Math.pow(u, risePow);
        const depth = m * ROW_DEPTH;
        for (let c = 0; c < cols; c++) {
          const x = c / span;
          const n =
            noise.noise2(x * sc, depth) +
            DETAIL_AMP * noise.noise2(x * sc * DETAIL_FREQ + DETAIL_BIAS, depth * DETAIL_FREQ);
          samples[c] = baseY - n * amp;
        }

        const ink = 1 - fade * (1 - u);
        const r = Math.round(mutedInk[0] + (fgInk[0] - mutedInk[0]) * ink);
        const g = Math.round(mutedInk[1] + (fgInk[1] - mutedInk[1]) * ink);
        const b = Math.round(mutedInk[2] + (fgInk[2] - mutedInk[2]) * ink);
        const a = Math.round(mutedInk[3] + (fgInk[3] - mutedInk[3]) * ink) / 255;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;

        ctx.beginPath();
        let pen = false;
        let any = false;
        for (let px = 0; px < pxW; px++) {
          const s = px * step;
          const c0 = Math.min(span - 1, Math.floor(s));
          const f = s - c0;
          const near = samples[c0] ?? 0;
          const y = near + ((samples[c0 + 1] ?? near) - near) * f;
          const cap = horizon[px] ?? FAR;
          if (y < cap) {
            horizon[px] = y;
            if (pen) ctx.lineTo(px, y);
            else ctx.moveTo(px, y);
            pen = true;
            any = true;
          } else {
            pen = false;
          }
        }
        if (any) ctx.stroke();
      }
    }
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.seed !== before.seed) noise = createNoise(props.seed);
      palette.refresh();
      syncInk();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      surface.destroy();
      palette.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
