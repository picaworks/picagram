import { labelHost, unlabelHost } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { createLoop } from "../../../lib/loop";
import { createNoise, type Noise } from "../../../lib/noise";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiTopoProps extends MotionProps {
  /** Noise frequency. Higher values pack the contour lines closer together. */
  scale: number;
  /** Number of evenly spaced contour levels sampled across the height field. */
  levels: number;
  /** How fast the height field drifts, in noise units per second. Zero holds it still. */
  speed: number;
  /** Draws with the plain characters - | / and a backslash instead of box-drawing glyphs. */
  ascii: boolean;
  /** Glyph size in CSS pixels. */
  fontSize: number;
  /** CSS font-family stack for the glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
  /** Frames per second ceiling for the drift. */
  fps: number;
}

export const defaults: AsciiTopoProps = {
  scale: 0.06,
  levels: 10,
  speed: 0.05,
  ascii: false,
  fontSize: 12,
  fontFamily: GRID_FONT,
  lineHeight: 1.2,
  fps: 15,
  paused: false,
  time: null,
  seed: 1,
};

/** Octaves of noise summed into one fractal height value, each adding finer, quieter detail. */
const OCTAVES = 3;
/** How much quieter each octave is than the last. Low, so the fine octaves stay a texture
 *  and never add enough of their own ink to crowd the lines the base octave already drew. */
const PERSISTENCE = 0.35;
/** How much finer each octave is than the last. */
const LACUNARITY = 2;
/** Extra damping under `scale`, so a hill spans many cells instead of a handful. */
const FIELD_SCALE = 0.2;
/** The animation time shown under reduced motion, and the frame reviewers see first. */
const STILL_TIME = 1200;

/** Fractal Brownian motion: several octaves of the same noise, normalized to [-1, 1]. */
function fbm(noise: Noise, x: number, y: number): number {
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let total = 0;
  for (let o = 0; o < OCTAVES; o++) {
    sum += amplitude * noise.noise2(x * frequency, y * frequency);
    total += amplitude;
    amplitude *= PERSISTENCE;
    frequency *= LACUNARITY;
  }
  return sum / total;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

type ContourKind = "h" | "v" | "d1" | "d2";

/** The glyph for one crossing. "d1" reads bottom-left to top-right, "d2" the other diagonal.
 *  Box drawing has no heavy diagonal, so `heavy` only changes the horizontal and vertical glyphs. */
function glyphFor(kind: ContourKind, heavy: boolean, ascii: boolean): string {
  if (ascii) {
    if (kind === "h") return "-";
    if (kind === "v") return "|";
    if (kind === "d1") return "/";
    return "\\";
  }
  if (kind === "h") return heavy ? "━" : "─";
  if (kind === "v") return heavy ? "┃" : "│";
  if (kind === "d1") return "╱";
  return "╲";
}

/** Marching squares for one cell, corners named clockwise from top-left. Which corners sit
 *  above the level decides where the contour crosses: two adjacent corners give a straight
 *  line, one corner on its own gives a diagonal that cuts it off. A saddle, where the two
 *  raised corners sit opposite each other, is drawn as the diagonal that isolated corner
 *  would draw on its own, which keeps every one of the sixteen cases to a single glyph. */
function contourGlyph(tl: boolean, tr: boolean, br: boolean, bl: boolean, heavy: boolean, ascii: boolean): string {
  const above = (tl ? 1 : 0) + (tr ? 1 : 0) + (br ? 1 : 0) + (bl ? 1 : 0);
  if (above === 0 || above === 4) return "";
  if (above === 2) {
    if (tl === tr) return glyphFor("h", heavy, ascii);
    if (tl === bl) return glyphFor("v", heavy, ascii);
    return glyphFor(tl ? "d1" : "d2", heavy, ascii);
  }
  const risen = above === 1;
  const odd = tl === risen ? "tl" : tr === risen ? "tr" : br === risen ? "br" : "bl";
  return glyphFor(odd === "tl" || odd === "br" ? "d1" : "d2", heavy, ascii);
}

export const mount: Mount<AsciiTopoProps> = (host, initial = {}) => {
  let props: AsciiTopoProps = { ...defaults, ...initial };
  let noise = createNoise(props.seed);
  let heights = new Float32Array(0);

  function gridOptions(p: AsciiTopoProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  function onLayout(): void {
    loop.redraw();
  }

  const grid = createGrid(host, gridOptions(props), onLayout);

  /** Height at every corner of the cell grid, one fractal noise sample each, drifting with time. */
  function computeHeights(t: number): void {
    const cc = grid.cols + 1;
    const cr = grid.rows + 1;
    const need = cc * cr;
    if (heights.length !== need) heights = new Float32Array(need);
    const driftX = (t / 1000) * props.speed;
    const driftY = driftX * 0.6;
    const f = props.scale * FIELD_SCALE;
    for (let y = 0; y < cr; y++) {
      for (let x = 0; x < cc; x++) {
        const raw = fbm(noise, x * f + driftX, y * f + driftY);
        heights[y * cc + x] = clamp01((raw + 1) / 2);
      }
    }
  }

  function draw(t: number): void {
    computeHeights(t);
    grid.clear();
    const cols = grid.cols;
    const rows = grid.rows;
    const cc = cols + 1;
    const span = props.levels + 1;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tl = heights[y * cc + x] ?? 0;
        const tr = heights[y * cc + x + 1] ?? 0;
        const bl = heights[(y + 1) * cc + x] ?? 0;
        const br = heights[(y + 1) * cc + x + 1] ?? 0;
        // Only the levels between this cell's lowest and highest corner can possibly cross it.
        const lo = Math.max(1, Math.ceil(Math.min(tl, tr, br, bl) * span));
        const hi = Math.min(props.levels, Math.floor(Math.max(tl, tr, br, bl) * span));
        let glyph = "";
        let indexed = false;
        for (let k = lo; k <= hi; k++) {
          if (glyph && indexed) break;
          const isIndex = k % 5 === 0;
          const level = k / span;
          const g = contourGlyph(tl >= level, tr >= level, br >= level, bl >= level, isIndex, props.ascii);
          if (g && (!glyph || isIndex)) {
            glyph = g;
            indexed = isIndex;
          }
        }
        if (glyph) grid.set(x, y, glyph);
      }
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");

  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    still: STILL_TIME,
    frame: draw,
  });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.seed !== before.seed) noise = createNoise(props.seed);
      if (props.fontFamily !== before.fontFamily || props.fontSize !== before.fontSize || props.lineHeight !== before.lineHeight) {
        grid.update(gridOptions(props));
      } else {
        loop.redraw();
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
