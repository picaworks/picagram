import { labelHost, unlabelHost } from "../../../lib/a11y";
import { braille, brailleDot, leftEighth, SHADES } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiLoaderProps extends MotionProps {
  /** Which indicator to draw: a braille dot orbit, a progress bar, a shade pulse, or animated dots. */
  variant: "braille" | "bar" | "blocks" | "dots";
  /** Progress from 0 to 1, clamped. Null animates indeterminately; the bar variant fills to this value instead. */
  progress: number | null;
  /** Width of the bar variant, in character cells. The other variants ignore it. */
  width: number;
  /** Accessible label, read as the progress bar or status announcement. Empty hides the host from assistive technology. */
  label: string;
  /** Multiplies how fast the indeterminate animation plays. */
  speed: number;
  /** CSS font-family stack for the glyphs. Must be monospace; size and color are inherited from the host. */
  fontFamily: string;
  /** Frames drawn per second, at speed 1. */
  fps: number;
}

export const defaults: AsciiLoaderProps = {
  variant: "braille",
  progress: null,
  width: 24,
  label: "loading",
  speed: 1,
  fontFamily: GRID_FONT,
  fps: 12,
  paused: false,
  time: null,
  seed: 1,
};

/** Row and column, in the cell's 2 by 4 dot grid, that the lit dot visits, in order: clockwise from the top left. */
const BRAILLE_PATH: ReadonlyArray<readonly [row: number, col: number]> = [
  [0, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [3, 1],
  [3, 0],
  [2, 0],
  [1, 0],
];
/** Milliseconds the lit dot spends at each position, at speed 1. Chosen so a real three second check
 *  in scripts/verify/motion.ts lands on the position opposite the start, the largest visible change available
 *  to a single dot. */
const BRAILLE_STEP_MS = 150;

function brailleFrame(t: number, speed: number): string {
  const step = Math.floor((t * speed) / BRAILLE_STEP_MS);
  const at = BRAILLE_PATH[((step % BRAILLE_PATH.length) + BRAILLE_PATH.length) % BRAILLE_PATH.length];
  const [row, col] = at ?? [0, 0];
  return braille(brailleDot(row, col));
}

/** Light, medium, dark, and full shade, breathing in and back out so the loop has no seam. Indices into
 *  SHADES are offset by one to skip its blank at 0. */
const SHADE_PATH = [0, 1, 2, 3, 2, 1];
const SHADE_STEP_MS = 150;

function blocksFrame(t: number, speed: number): string {
  const step = Math.floor((t * speed) / SHADE_STEP_MS);
  const at = ((step % SHADE_PATH.length) + SHADE_PATH.length) % SHADE_PATH.length;
  const idx = SHADE_PATH[at] ?? 0;
  return SHADES[idx + 1] ?? "";
}

const DOTS_STEP_MS = 400;

function dotsFrame(t: number, speed: number): string {
  const step = Math.floor((t * speed) / DOTS_STEP_MS);
  const at = ((step % 3) + 3) % 3;
  return ".".repeat(at + 1);
}

const FULL_BLOCK = leftEighth(8);
const TRACK = SHADES[1] ?? "░";

/** A block filling n eighths of a cell from the left, n from 1 to 8, using the Unicode block elements. */
function eighthBlock(n: number): string {
  return n <= 0 ? TRACK : leftEighth(n);
}

/** A filled bar reading `progress`, in eighths of a cell. Depends only on data, so it holds still under
 *  reduced motion without special handling. */
function barDeterminate(progress: number, width: number): string {
  const clamped = Math.min(1, Math.max(0, progress));
  const totalEighths = width * 8;
  const filled = Math.round(clamped * totalEighths);
  const fullCells = Math.floor(filled / 8);
  const remainder = filled - fullCells * 8;
  let out = "";
  for (let i = 0; i < width; i++) {
    if (i < fullCells) out += FULL_BLOCK;
    else if (i === fullCells && remainder > 0) out += eighthBlock(remainder);
    else out += TRACK;
  }
  return out;
}

/** A short block sweeping back and forth across the track, for when no progress value is known. */
function barIndeterminate(t: number, speed: number, width: number): string {
  const segment = Math.min(6, Math.max(2, Math.round(width / 4)));
  const travel = Math.max(1, width - segment);
  const cellMs = 70;
  const period = travel * 2 * cellMs;
  const phase = ((t * speed) % period) / period;
  const triangle = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  const pos = Math.round(triangle * travel);
  let out = "";
  for (let i = 0; i < width; i++) out += i >= pos && i < pos + segment ? FULL_BLOCK : TRACK;
  return out;
}

function frameText(p: AsciiLoaderProps, t: number): string {
  if (p.variant === "bar") return p.progress === null ? barIndeterminate(t, p.speed, p.width) : barDeterminate(p.progress, p.width);
  if (p.variant === "blocks") return blocksFrame(t, p.speed);
  if (p.variant === "dots") return dotsFrame(t, p.speed);
  return brailleFrame(t, p.speed);
}

export const mount: Mount<AsciiLoaderProps> = (host, initial = {}) => {
  let props: AsciiLoaderProps = { ...defaults, ...initial };
  const glyphs = document.createElement("span");
  glyphs.setAttribute("data-pica", "");
  glyphs.setAttribute("aria-hidden", "true");
  glyphs.style.cssText = `white-space:nowrap;color:${cssVar("fg")}`;
  host.appendChild(glyphs);

  function applyA11y(): void {
    labelHost(host, props.label, props.progress === null ? "status" : "progressbar");
    if (props.progress === null) {
      host.removeAttribute("aria-valuemin");
      host.removeAttribute("aria-valuemax");
      host.removeAttribute("aria-valuenow");
    } else {
      host.setAttribute("aria-valuemin", "0");
      host.setAttribute("aria-valuemax", "100");
      host.setAttribute("aria-valuenow", String(Math.round(Math.min(1, Math.max(0, props.progress)) * 100)));
    }
  }

  function draw(t: number): void {
    glyphs.style.fontFamily = props.fontFamily;
    glyphs.textContent = frameText(props, t);
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    still: 0,
    frame: draw,
  });

  applyA11y();

  return {
    update(next) {
      props = { ...props, ...next };
      applyA11y();
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      unlabelHost(host);
      host.removeAttribute("aria-valuemin");
      host.removeAttribute("aria-valuemax");
      host.removeAttribute("aria-valuenow");
      glyphs.remove();
      delete host.dataset.picaReady;
    },
  };
};
