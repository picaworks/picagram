import { labelHost, unlabelHost } from "../../../lib/a11y";
import { hostTone } from "../../../lib/color";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { createLoop } from "../../../lib/loop";
import { FALLBACK_RAMP, measureRamp, pick } from "../../../lib/ramp";
import { createRng } from "../../../lib/rng";
import { createSampler } from "../../../lib/sample";
import { litSphere } from "../../../lib/subject";
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
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  lineHeight: 1.2,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** Aspect ratio the host takes when it has no height of its own. */
const DEFAULT_ASPECT = 2;
/** Side of the built-in sphere subject, in pixels. */
const SPHERE_SIZE = 256;
/** Height of the canvas a text subject is drawn into. Width follows the measured text. */
const TEXT_CANVAS_H = 200;
/** Contrast applied when a subject is sampled into ink. */
const INK_CONTRAST = 1.1;
/** Share of the transition each cell spends fading, centered on its place in the reveal order. */
const BAND = 0.18;

type Tone = "light-on-dark" | "dark-on-light";

interface Subject {
  source: CanvasImageSource;
  w: number;
  h: number;
}

function easeInOut(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  return easeInOut((x - edge0) / (edge1 - edge0));
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

/** Inserts a pixel size into a CSS font stack, after any leading style, variant, or weight keywords. */
function sizedFont(stack: string, px: number): string {
  const keyword = /^(normal|italic|oblique|small-caps|bold|bolder|lighter|[1-9]00)$/;
  const trimmed = stack.trim();
  const tokens = trimmed.split(/\s+/);
  let i = 0;
  while (i < tokens.length && keyword.test(tokens[i] ?? "")) i++;
  const prefix = tokens.slice(0, i).join(" ");
  const rest = trimmed.slice(prefix.length).trim();
  return prefix ? `${prefix} ${px}px ${rest}` : `${px}px ${rest}`;
}

/** Draws `text` into a canvas sized to it, in one flat fill color. */
function rasterizeText(text: string, font: string, fill: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.height = TEXT_CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const fontPx = Math.round(TEXT_CANVAS_H * 0.62);
  ctx.font = sizedFont(font, fontPx);
  const pad = fontPx * 0.3;
  canvas.width = Math.max(1, Math.ceil(ctx.measureText(text).width + pad * 2));
  ctx.font = sizedFont(font, fontPx);
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = fill;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return canvas;
}

/** The sphere when `text` is empty, otherwise `text` drawn in `font`. The fill is chosen so the
 *  shape samples as full ink after `sampleInk`, on either a light-on-dark or dark-on-light host. */
function subjectOf(text: string, font: string, tone: Tone): Subject {
  if (!text) return { source: litSphere(SPHERE_SIZE), w: SPHERE_SIZE, h: SPHERE_SIZE };
  const canvas = rasterizeText(text, font, tone === "light-on-dark" ? "#fff" : "#000");
  return { source: canvas, w: canvas.width, h: canvas.height };
}

/** Ink deltas at or below this count as unchanged. Most cells sit outside both subjects, at zero
 *  in both, so leaving them out of the order keeps the reveal's timing spent on cells that move. */
const STILL = 0.015;

/** Cell indices ordered by how much ink changes between `a` and `b`, as each cell's place in that
 *  order, scaled to leave room for its own fade band. Cells unchanged in both subjects keep the
 *  earliest place, since holding at either end of the fade looks the same when there is no delta.
 *  Ties among cells that do change are broken by a seeded draw so they do not resolve in a raster
 *  sweep. */
function reorder(a: Float32Array, b: Float32Array, seed: number): Float32Array {
  const n = a.length;
  const rng = createRng(seed);
  const jitter = new Float32Array(n);
  const delta = new Float32Array(n);
  const moving: number[] = [];
  for (let i = 0; i < n; i++) {
    jitter[i] = rng();
    delta[i] = Math.abs((b[i] ?? 0) - (a[i] ?? 0));
    if ((delta[i] ?? 0) > STILL) moving.push(i);
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

  function gridOptions(p: AsciiMorphProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: p.columns, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  function sampleInk(subject: Subject, tone: Tone): Float32Array {
    const { cols, rows, aspect } = grid;
    return sampler.sample(subject.source, subject.w, subject.h, host, {
      cols, rows, aspect, n: 1, fit: "contain", tone, contrast: INK_CONTRAST, mirror: false,
    }).slice();
  }

  function rebuild(): void {
    if (!setAspect && host.clientHeight < 2) {
      host.style.aspectRatio = String(DEFAULT_ASPECT);
      setAspect = true;
      grid.update(gridOptions(props));
      return;
    }
    const tone = hostTone(host);
    inkFrom = sampleInk(subjectOf(props.from, props.font, tone), tone);
    inkTo = sampleInk(subjectOf(props.to, props.font, tone), tone);
    start = reorder(inkFrom, inkTo, props.seed);
  }

  function renderFrame(t: number): void {
    const { cols, rows } = grid;
    const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
    const p = phaseAt(t, props.hold, props.transition);
    const n = Math.min(cols * rows, inkFrom.length, inkTo.length, start.length);
    for (let i = 0; i < n; i++) {
      const s = start[i] ?? 0;
      const localT = smoothstep(s, s + BAND, p);
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
