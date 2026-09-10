import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { createLoop } from "../../../lib/loop";
import { FALLBACK_RAMP, measureRamp, pick } from "../../../lib/ramp";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiWavesProps extends MotionProps {
  /** Number of circular wave sources that interfere with each other. */
  sources: number;
  /** Spatial frequency of each wave, in cycles per cell. */
  frequency: number;
  /** Angular speed the interference pattern advances at, in radians per second. */
  speed: number;
  /** Contrast around the midpoint, sharpening the rings into bands. */
  contrast: number;
  /** How far each source wanders from its resting point, as a share of the grid. 0 holds them still. */
  drift: number;
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

export const defaults: AsciiWavesProps = {
  sources: 3,
  frequency: 0.12,
  speed: 1.2,
  contrast: 1.3,
  drift: 0.3,
  glyphs: FALLBACK_RAMP,
  fontSize: 12,
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  lineHeight: 1.2,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame shown under prefers-reduced-motion, in milliseconds of animation time. */
const STILL_TIME = 1200;
/** Sources are generated up to this many, then the `sources` prop slices how many draw. */
const MAX_SOURCES = 5;
/** Radians in a full turn. */
const TAU = Math.PI * 2;

/** One wave source, placed and drifting deterministically from the seed. */
interface Source {
  /** Resting x position, as a share of the drawable width. */
  x: number;
  /** Resting y position, as a share of the drawable height. */
  y: number;
  /** Interference phase offset, in radians. */
  phase: number;
  /** Drift orbit radius, as a share of the drawable box's shorter side. */
  radius: number;
  /** Drift angular speed, in radians per second. */
  rate: number;
  /** Drift angle at animation time zero, in radians. */
  heading: number;
}

/** A source's position at one instant, in the grid's cell-unit space. */
interface Orbit {
  x: number;
  y: number;
  phase: number;
}

/** Places sources deterministically from `seed`, so the same seed always draws the same field.
 *  Drift stays slow, well inside STYLE.md's restraint principle. */
function makeSources(seed: number): Source[] {
  const random = createRng(seed);
  const list: Source[] = [];
  for (let i = 0; i < MAX_SOURCES; i++) {
    list.push({
      x: 0.2 + random() * 0.6,
      y: 0.2 + random() * 0.6,
      phase: random() * TAU,
      radius: 0.1 + random() * 0.2,
      rate: 0.05 + random() * 0.15,
      heading: random() * TAU,
    });
  }
  return list;
}

export const mount: Mount<AsciiWavesProps> = (host, initial = {}) => {
  let props: AsciiWavesProps = { ...defaults, ...initial };
  let sources = makeSources(props.seed);

  function gridOptions(p: AsciiWavesProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  function frame(t: number): void {
    const { cols, rows, aspect } = grid;
    const count = Math.max(1, Math.min(MAX_SOURCES, Math.round(props.sources)));
    const boxW = cols * aspect;
    const boxH = rows;
    const short = Math.min(boxW, boxH);
    const seconds = t / 1000;
    const orbit: Orbit[] = [];
    for (let i = 0; i < count; i++) {
      const s = sources[i];
      if (!s) continue;
      const angle = s.heading + seconds * s.rate;
      orbit.push({
        x: s.x * boxW + props.drift * s.radius * short * Math.cos(angle),
        y: s.y * boxH + props.drift * s.radius * short * Math.sin(angle),
        phase: s.phase,
      });
    }
    const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
    const angularFreq = TAU * props.frequency;
    const tShift = seconds * props.speed;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = x * aspect;
        let sum = 0;
        for (const o of orbit) {
          const dx = cx - o.x;
          const dy = y - o.y;
          sum += Math.cos(Math.sqrt(dx * dx + dy * dy) * angularFreq - tShift + o.phase);
        }
        const base = 0.5 + 0.5 * (sum / orbit.length);
        const ink = Math.min(1, Math.max(0, (base - 0.5) * props.contrast + 0.5));
        grid.set(x, y, pick(ramp, ink));
      }
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  function onLayout(): void {
    loop.redraw();
  }

  const grid = createGrid(host, gridOptions(props), onLayout);
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_TIME, frame });

  labelHost(host, "");

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.seed !== before.seed) sources = makeSources(props.seed);
      if (props.fontSize !== before.fontSize || props.fontFamily !== before.fontFamily || props.lineHeight !== before.lineHeight) {
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
