import { labelHost, unlabelHost } from "../../../lib/a11y";
import { hostTone } from "../../../lib/color";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { createLoop } from "../../../lib/loop";
import { FALLBACK_RAMP, measureRamp, pick } from "../../../lib/ramp";
import { createRng } from "../../../lib/rng";
import { createSampler } from "../../../lib/sample";
import { litSphere, textSubject } from "../../../lib/subject";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiMorphProps extends MotionProps {
  /** Text for the first subject. Empty draws the built-in lit sphere. */
  from: string;
  /** Text for the second subject. Empty draws the built-in lit sphere. */
  to: string;
  /** Milliseconds each subject holds fully resolved before the next transition starts. */
  hold: number;
  /** Milliseconds one transition between subjects takes. */
  transition: number;
  /** Columns across the host. Rows follow from the host's height. */
  columns: number;
  /** Glyphs to draw with, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** CSS font used to draw a text subject before it is sampled. Unused while a subject is the sphere. */
  font: string;
  /** CSS font-family stack for the glyph grid. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: AsciiMorphProps = {
  from: "PICA",
  to: "",
  hold: 1400,
  transition: 1600,
  columns: 80,
  glyphs: FALLBACK_RAMP,
  font: '700 "Barlow Condensed", "Helvetica Neue", Arial, sans-serif',
  fontFamily: GRID_FONT,
  lineHeight: 1.2,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** Share of the transition each cell spends fading, centered on its place in the reveal order. */
const BAND = 0.18;

type Tone = "light-on-dark" | "dark-on-light";

function easeInOut(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/** Where in the hold and transition cycle animation time `t` falls: 0 when the first subject is
 *  fully resolved, 1 when the second is, and an eased fraction between while a transition runs. */
function phaseAt(t: number, hold: number, transition: number): number {
  const cycle = 2 * hold + 2 * transition;
  if (cycle <= 0) return 0;
  const pos = ((t % cycle) + cycle) % cycle;
  if (pos < hold) return 0;
  if (pos < hold + transition) return easeInOut((pos - hold) / transition);
  if (pos < 2 * hold + transition) return 1;
  return 1 - easeInOut((pos - (2 * hold + transition)) / transition);
}

/** Cell indices ordered by how much ink changes between `a` and `b`, as each cell's place in that
 *  order, scaled to leave room for its own fade band. Cells unchanged in both subjects keep the
 *  earliest place, since holding at either end of the fade looks the same when there is no delta.
 *  Ties among cells that do change are broken by a seeded draw so they do not resolve in a raster
 *  sweep. Deltas at or below 0.015 count as unchanged, since most cells sit outside both subjects,
 *  at zero in both, and leaving them out of the order keeps the reveal spent on cells that move. */
function reorder(a: Float32Array, b: Float32Array, seed: number): Float32Array {
  const n = a.length;
  const rng = createRng(seed);
  const jitter = new Float32Array(n);
  const delta = new Float32Array(n);
  const moving: number[] = [];
  for (let i = 0; i < n; i++) {
    jitter[i] = rng();
    delta[i] = Math.abs((b[i] ?? 0) - (a[i] ?? 0));
    if ((delta[i] ?? 0) > 0.015) moving.push(i);
  }
  moving.sort((x, y) => {
    const dx = delta[x] ?? 0;
    const dy = delta[y] ?? 0;
    return dx !== dy ? dy - dx : (jitter[x] ?? 0) - (jitter[y] ?? 0);
  });
  const start = new Float32Array(n);
  const span = Math.max(1, moving.length - 1);
  for (let rank = 0; rank < moving.length; rank++) start[moving[rank] ?? 0] = (rank / span) * (1 - BAND);
  return start;
}

export const mount: Mount<AsciiMorphProps> = (host, initial = {}) => {
  let props: AsciiMorphProps = { ...defaults, ...initial };
  let inkFrom: Float32Array = new Float32Array(0);
  let inkTo: Float32Array = new Float32Array(0);
  let start: Float32Array = new Float32Array(0);
  let setAspect = false;
  let started = false;
  const sampler = createSampler();
  // Reused for both subjects: each is fully sampled into ink before the next is drawn into it.
  const raster = document.createElement("canvas");

  function gridOptions(p: AsciiMorphProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: p.columns, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  // The sphere (256px) when `text` is empty (or the rare host with no 2D canvas context), otherwise
  // `text` rastered at 124px and cropped tight to its ink. `raster` is reused between the two
  // subjects: sample() copies its own ink out with .slice() before the next subject is drawn into it.
  function sampleSubject(text: string, font: string, tone: Tone): Float32Array {
    const source = textSubject(text, font, tone, 124, raster) ?? litSphere(256);
    const { cols, rows, aspect } = grid;
    return sampler.sample(source, source.width, source.height, host, {
      cols, rows, aspect, n: 1, fit: "contain", tone, contrast: 1.1, mirror: false,
    }).slice();
  }

  function rebuild(): void {
    if (!setAspect && host.clientHeight < 2) {
      // 2, the aspect ratio the host takes when it has no height of its own.
      host.style.aspectRatio = "2";
      setAspect = true;
      grid.update(gridOptions(props));
      return;
    }
    const tone = hostTone(host);
    inkFrom = sampleSubject(props.from, props.font, tone);
    inkTo = sampleSubject(props.to, props.font, tone);
    start = reorder(inkFrom, inkTo, props.seed);
  }

  function renderFrame(t: number): void {
    const { cols, rows } = grid;
    const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
    const p = phaseAt(t, props.hold, props.transition);
    const n = Math.min(cols * rows, inkFrom.length, inkTo.length, start.length);
    for (let i = 0; i < n; i++) {
      const s = start[i] ?? 0;
      // Inlined smoothstep(s, s + BAND, p): a per-cell fade band that starts at its place in the
      // reveal order. BAND is never 0, so the edge0 === edge1 case a general smoothstep guards
      // against cannot happen here.
      const e = s + BAND;
      const localT = e === s ? (p < s ? 0 : 1) : easeInOut((p - s) / (e - s));
      const a = inkFrom[i] ?? 0;
      const b = inkTo[i] ?? 0;
      grid.set(i % cols, (i / cols) | 0, pick(ramp, a + (b - a) * localT));
    }
    grid.flush();
  }

  function onLayout(): void {
    rebuild();
    if (started) loop.redraw();
  }

  labelHost(host, "");
  const grid = createGrid(host, gridOptions(props), onLayout);
  rebuild();
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: 0, frame: renderFrame });
  started = true;
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const relayout = props.columns !== before.columns || props.fontFamily !== before.fontFamily || props.lineHeight !== before.lineHeight;
      const subjectChanged = props.from !== before.from || props.to !== before.to || props.font !== before.font;
      const seedChanged = props.seed !== before.seed;
      const motionChanged = props.paused !== before.paused || props.time !== before.time || props.fps !== before.fps;
      if (motionChanged) loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      if (relayout) {
        grid.update(gridOptions(props));
      } else {
        if (subjectChanged) rebuild();
        else if (seedChanged) start = reorder(inkFrom, inkTo, props.seed);
        loop.redraw();
      }
    },
    destroy() {
      loop.destroy();
      grid.destroy();
      unlabelHost(host);
      if (setAspect) host.style.removeProperty("aspect-ratio");
      delete host.dataset.picaReady;
    },
  };
};
