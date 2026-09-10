import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { createLoop, type LoopState } from "../../../lib/loop";
import { measureRamp, pick } from "../../../lib/ramp";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiRainProps extends MotionProps {
  /** Share of columns that fall. The rest stay empty. */
  density: number;
  /** Base fall speed, in rows per second. Each column varies around it by a seeded amount. */
  speed: number;
  /** Length of the fading trail behind the head, in rows. */
  trail: number;
  /** Chance a trail glyph swaps for another glyph on a given frame, for flicker. */
  change: number;
  /** Glyphs to fall with, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** Glyph size in CSS pixels. */
  fontSize: number;
  /** CSS font-family stack for the glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: AsciiRainProps = {
  density: 0.5,
  speed: 14,
  trail: 16,
  change: 0.06,
  glyphs: "0123456789:;+=*#%",
  fontSize: 12,
  fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  lineHeight: 1.2,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** The animation time shown under reduced motion, fixed so every capture agrees. */
const STILL_MS = 1200;

/** Mixes two integers into one 32-bit seed, so every column and every flicker draws its own reproducible stream. */
function hash(a: number, b: number): number {
  let h = (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ b) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Wraps `a` into [0, span), so a column's fall repeats without a jump once its whole trail is off screen. */
function wrap(a: number, span: number): number {
  return ((a % span) + span) % span;
}

export const mount: Mount<AsciiRainProps> = (host, initial = {}) => {
  let props: AsciiRainProps = { ...defaults, ...initial };
  const grid = createGrid(host, gridOptions(props), onLayout);

  function gridOptions(p: AsciiRainProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: p.fontSize, columns: 0, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  function onLayout(): void {
    loop.redraw();
  }

  // Every frame is a pure function of props.seed and the animation time t: a column's speed, its
  // starting offset, and whether a trail glyph flickers all come from hashing the seed, so scrubbing
  // to any t redraws the same pixels without replaying the frames before it.
  function draw(t: number): void {
    const { cols, rows } = grid;
    grid.clear();
    if (cols > 0 && rows > 0 && props.density > 0) {
      const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
      const headGlyph = ramp.glyphs[ramp.glyphs.length - 1] ?? " ";
      const trailRows = Math.max(1, props.trail);
      const span = rows + trailRows * 2;
      const frameMs = 1000 / Math.max(1, props.fps);
      const epoch = Math.floor(t / frameMs);
      for (let x = 0; x < cols; x++) {
        const base = createRng(hash(props.seed, x));
        if (base() >= props.density) continue;
        const speedMult = 0.6 + base() * 0.9;
        const phase = base() * span;
        const headRow = wrap((t / 1000) * props.speed * speedMult + phase, span) - trailRows;
        const headFloor = Math.floor(headRow);
        const flicker = props.change > 0 ? createRng(hash(hash(props.seed, x), epoch + 1)) : null;
        for (let r = 0; r < rows; r++) {
          const d = headRow - r;
          if (d < 0 || d > trailRows) continue;
          if (r === headFloor) {
            grid.set(x, r, headGlyph);
            continue;
          }
          let glyph = pick(ramp, 1 - d / trailRows);
          if (flicker && flicker() < props.change) glyph = ramp.glyphs[Math.floor(flicker() * ramp.glyphs.length)] ?? glyph;
          grid.set(x, r, glyph);
        }
      }
    }
    grid.flush();
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL_MS, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const layoutChanged =
        props.fontFamily !== before.fontFamily || props.fontSize !== before.fontSize || props.lineHeight !== before.lineHeight;
      if (layoutChanged) {
        grid.update(gridOptions(props));
      } else if (
        props.density !== before.density ||
        props.speed !== before.speed ||
        props.trail !== before.trail ||
        props.change !== before.change ||
        props.glyphs !== before.glyphs ||
        props.seed !== before.seed
      ) {
        loop.redraw();
      }
      const motion: Partial<LoopState> = {};
      if (props.paused !== before.paused) motion.paused = props.paused;
      if (props.time !== before.time) motion.time = props.time;
      if (props.fps !== before.fps) motion.fps = props.fps;
      if (Object.keys(motion).length > 0) loop.update(motion);
    },
    destroy() {
      loop.destroy();
      grid.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
