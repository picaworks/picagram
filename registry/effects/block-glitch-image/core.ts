import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { parseColor } from "../../../lib/color";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPlate, inkPixels } from "../../../lib/pixels";
import { createRng, hashSeed } from "../../../lib/rng";
import { createSampler } from "../../../lib/sample";
import { fitFor, fitHostAspect, loadSource, showNote, type Source } from "../../../lib/source";
import type { Mount, MotionProps } from "../../../lib/types";

export interface BlockGlitchImageProps extends MotionProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" inks the bright pixels; "dark-on-light" inks the dark ones. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** The fixed grid's cell size, in prepared-picture pixels. A displaced block is one cell, or smaller at an edge. */
  block: number;
  /** How many cells move in one burst. */
  blocks: number;
  /** How far a moved cell's content can be sourced from, as a share of the picture's width. */
  shift: number;
  /** Milliseconds one burst lasts. */
  burst: number;
  /** Milliseconds of quiet between one burst and the next. */
  rest: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: BlockGlitchImageProps = {
  src: "",
  alt: "",
  fit: "cover",
  tone: "auto",
  contrast: 1.1,
  block: 24,
  blocks: 12,
  shift: 0.12,
  burst: 220,
  rest: 1400,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

/** Longest side, in pixels, of the copy the picture is prepared at. Worked out once, so every frame costs
 *  only whole-block copies from it and a final blit, never a fresh read of the source. */
const WORK_MAX = 480;

/** One fixed-grid cell, by column and row. */
interface Cell {
  col: number;
  row: number;
}

/** One burst's layout: which cells are displaced, and which cell each one's content is copied from. */
interface BurstPlan {
  moves: { dest: Cell; src: Cell }[];
}

/** Which burst, if any, `t` falls inside. The first burst is centered on 1200 ms, whatever `burst` is set
 *  to, so the frame reviewers see first is always mid-burst with an even margin on both sides; every burst
 *  after it follows exactly `burst` + `rest` ms after the one before. A pure function of `t`, `burst`, and
 *  `rest`, so the schedule never depends on how fast the machine draws frames. */
function burstAt(t: number, burst: number, rest: number): { active: boolean; index: number } {
  const duration = Math.max(1, burst);
  const period = duration + Math.max(0, rest);
  const phase = Math.max(0, 1200 - duration / 2);
  if (t < phase) return { active: false, index: -1 };
  const index = Math.floor((t - phase) / period);
  const local = t - phase - index * period;
  return { active: local < duration, index };
}

/** Builds burst `index`: which grid cells move and where each one's content comes from. A pure function of
 *  the seed, the index, and the props that shape a burst, so the same burst always draws the same pixels,
 *  and no two bursts glitch the same way. */
function buildBurst(index: number, cols: number, rows: number, plateWidth: number, props: BlockGlitchImageProps): BurstPlan {
  const rng = createRng(hashSeed(props.seed, index));
  // Destinations stay in the upper half of the grid, so a burst reads as a break near the top of the frame,
  // the way a stalled decode corrupts what arrives first, and leaves the rest of the picture untouched.
  const destRows = Math.max(1, Math.ceil(rows / 2));
  const destCells = cols * destRows;
  const count = Math.max(1, Math.min(props.blocks, destCells));
  // A partial shuffle of every candidate cell picks `count` distinct destinations, so no block glitches twice.
  const order = Array.from({ length: destCells }, (_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (destCells - i));
    const a = order[i] ?? i;
    const b = order[j] ?? j;
    order[i] = b;
    order[j] = a;
  }
  const maxShiftCells = Math.max(1, Math.round((Math.max(0, props.shift) * plateWidth) / Math.max(1, props.block)));
  const moves = order.slice(0, count).map((cellIndex) => {
    const destCol = cellIndex % cols;
    const destRow = Math.floor(cellIndex / cols);
    // A magnitude of at least one cell and a random direction: with mag >= 1, rounding cos and sin of the
    // same angle can never both land on zero, so the source cell always differs from the destination.
    const angle = rng() * Math.PI * 2;
    const mag = 1 + rng() * (maxShiftCells - 1);
    const srcCol = (((destCol + Math.round(Math.cos(angle) * mag)) % cols) + cols) % cols;
    const srcRow = (((destRow + Math.round(Math.sin(angle) * mag)) % rows) + rows) % rows;
    return { dest: { col: destCol, row: destRow }, src: { col: srcCol, row: srcRow } };
  });
  return { moves };
}

export const mount: Mount<BlockGlitchImageProps> = (host, initial = {}) => {
  let props: BlockGlitchImageProps = { ...defaults, ...initial };
  let source: Source | null = null;
  let failed = false;
  let ready = false;
  let plateW = 0;
  let plateH = 0;
  let cols = 1;
  let rows = 1;
  let started = false;
  let cancel = (): void => undefined;
  let undoAspect = (): void => undefined;
  let removeNote: (() => void) | null = null;
  // The current burst's layout, cached by index so a run of frames inside one burst does not rebuild it.
  let planIndex = -1;
  let plan: BurstPlan = { moves: [] };

  const sampler = createSampler();
  // The picture, worked out once: never read back inside a frame, only copied from. `glitch` is a same-size
  // scratch a burst composites into, so the host canvas always gets exactly one final blit.
  const picture = createPlate();
  const glitch = document.createElement("canvas");
  const glitchCtx = glitch.getContext("2d");
  const surface = createCanvas(host, { onResize: () => resized() });
  const canvas = surface.canvas;
  const ctx = canvas.getContext("2d");
  const palette = watchPalette(host, () => prepare());

  function load(): void {
    cancel();
    failed = false;
    cancel = loadSource(props.src, use, () => {
      source = null;
      ready = false;
      failed = true;
      if (started) loop.redraw();
    });
  }

  function use(next: Source): void {
    source = next;
    // A host with no height of its own takes the image's proportions.
    undoAspect();
    undoAspect = fitHostAspect(host, next.width, next.height);
    prepare();
  }

  function setNote(on: boolean): void {
    if (on && !removeNote) removeNote = showNote(host, "image unavailable");
    if (!on && removeNote) {
      removeNote();
      removeNote = null;
    }
  }

  /** The plate size for the host's box: its own proportions, held under WORK_MAX on the longer side, so a
   *  plate maps onto the host one to one and a frame never has to fit or offset it. */
  function plateSize(): [number, number] {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    const scale = Math.min(1, WORK_MAX / Math.max(w, h));
    return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
  }

  /** Recomputes the fixed grid from the plate's own size and `block`, and drops the cached burst, since a
   *  burst built for the old grid no longer lines up with this one. */
  function updateGrid(): void {
    cols = Math.max(1, Math.ceil(plateW / Math.max(1, props.block)));
    rows = Math.max(1, Math.ceil(plateH / Math.max(1, props.block)));
    planIndex = -1;
  }

  /** Works the picture out and fills the plate. Runs when the image arrives, when the host's size changes,
   *  and when a color or a tone prop changes, and at no other time. */
  function prepare(): void {
    const [w, h] = plateSize();
    plateW = w;
    plateH = h;
    ready = false;
    if (source && !failed) {
      const ink = sampler.sample(source.image, source.width, source.height, host, {
        cols: w, rows: h, aspect: 1, n: 1, fit: fitFor(source, props.fit), tone: props.tone, contrast: props.contrast, mirror: false,
      });
      const fg = parseColor(palette.colors.fg);
      picture.put(inkPixels(ink, w, h, fg));
      if (glitch.width !== w) glitch.width = w;
      if (glitch.height !== h) glitch.height = h;
      ready = true;
    }
    updateGrid();
    if (started) loop.redraw();
  }

  function resized(): void {
    const [w, h] = plateSize();
    if (w !== plateW || h !== plateH) prepare();
    else if (started) loop.redraw();
  }

  function currentPlan(index: number): BurstPlan {
    if (index !== planIndex) {
      plan = buildBurst(index, cols, rows, plateW, props);
      planIndex = index;
    }
    return plan;
  }

  function draw(t: number): void {
    const w = Math.max(1, surface.cssWidth);
    const h = Math.max(1, surface.cssHeight);
    setNote(failed);
    if (ctx) {
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
    }
    if (ctx && ready) {
      const slot = burstAt(t, props.burst, props.rest);
      if (slot.active && glitchCtx) {
        const { moves } = currentPlan(slot.index);
        const block = Math.max(1, props.block);
        // Clearing each rectangle before drawing into it replaces it whole, alpha included, with no blend
        // against what was there: the base picture first, over a blanked scratch so an earlier burst's
        // blocks never linger, then each moved block over its own freshly cleared cell.
        glitchCtx.clearRect(0, 0, plateW, plateH);
        glitchCtx.drawImage(picture.canvas, 0, 0);
        for (const move of moves) {
          const cw = Math.min(block, plateW - move.dest.col * block, plateW - move.src.col * block);
          const ch = Math.min(block, plateH - move.dest.row * block, plateH - move.src.row * block);
          if (cw <= 0 || ch <= 0) continue;
          const destX = move.dest.col * block;
          const destY = move.dest.row * block;
          glitchCtx.clearRect(destX, destY, cw, ch);
          glitchCtx.drawImage(picture.canvas, move.src.col * block, move.src.row * block, cw, ch, destX, destY, cw, ch);
        }
        ctx.drawImage(glitch, 0, 0, w, h);
      } else {
        ctx.drawImage(picture.canvas, 0, 0, w, h);
      }
    }
    if (source || failed) host.dataset.picaReady = "true";
  }

  labelHost(host, props.alt);
  load();
  // The still frame under reduced motion is 0 ms, always before the first burst, so it shows the intact
  // picture rather than freezing mid-glitch.
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: 0, frame: draw });
  started = true;

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const recolored = palette.refresh();
      labelHost(host, props.alt);
      loop.update({ paused: props.paused, time: props.time, fps: props.fps, still: 0 });
      if (props.src !== before.src) {
        load();
      } else if (recolored || props.fit !== before.fit || props.tone !== before.tone || props.contrast !== before.contrast) {
        prepare();
      } else {
        if (props.block !== before.block) updateGrid();
        else if (
          props.blocks !== before.blocks ||
          props.shift !== before.shift ||
          props.seed !== before.seed ||
          props.burst !== before.burst ||
          props.rest !== before.rest
        ) {
          planIndex = -1;
        }
        loop.redraw();
      }
    },
    destroy() {
      loop.destroy();
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
