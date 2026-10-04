import { labelHost, unlabelHost } from "../../../lib/a11y";
import { SHADES } from "../../../lib/blocks";
import { bayerAt } from "../../../lib/dither";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { scope } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface SkeletonProps extends MotionProps {
  /** Draws a square placeholder before the text bands. */
  avatar: boolean;
  /** Draws a wider heading band above the text lines. */
  heading: boolean;
  /** Number of text lines, from 0 to 8. The final line runs short. */
  lines: number;
  /** Pace of the grain breathing, from 0.25 to 2. */
  speed: number;
  /** Accessible name for the loading state. An empty label hides the placeholder from assistive technology. */
  label: string;
  /** Frames per second ceiling for the animation. */
  fps: number;
}

export const defaults: SkeletonProps = {
  avatar: true,
  heading: true,
  lines: 3,
  speed: 0.5,
  label: "Loading",
  fps: 8,
  paused: false,
  time: null,
  seed: 1,
};

/** Rows in the default avatar square. */
const AVATAR_ROWS = 4;
/** Cell rows left between adjacent text bands. */
const BAND_STEP = 2;
/** One slow breathing cycle at speed 1. */
const CYCLE_MS = 4000;
/** The even frame held under reduced motion. */
const STILL_TIME = 1200;
const LIGHT_SHADE = SHADES.charAt(1);
const MEDIUM_SHADE = SHADES.charAt(2);
const TAU = Math.PI * 2;

function lineCount(lines: number): number {
  return Math.max(0, Math.min(8, Math.round(lines)));
}

function layoutRows(p: SkeletonProps): number {
  const count = lineCount(p.lines);
  const bodyStart = p.heading ? BAND_STEP : 0;
  const bodyEnd = count > 0 ? bodyStart + (count - 1) * BAND_STEP + 1 : 0;
  return Math.max(1, p.avatar ? AVATAR_ROWS : 0, p.heading ? 1 : 0, bodyEnd);
}

function rules(selector: string, p: SkeletonProps): string {
  return `:where(${selector}){display:block;box-sizing:border-box;min-height:${layoutRows(p) * 1.2}em}`;
}

function gridOptions(host: HTMLElement): GridOptions {
  const fontSize = Number.parseFloat(getComputedStyle(host).fontSize) || 16;
  return {
    fontFamily: GRID_FONT,
    fontSize,
    columns: 0,
    lineHeight: 1.2,
    renderer: "dom",
    color: cssVar("muted"),
  };
}

export const mount: Mount<SkeletonProps> = (host, initial = {}) => {
  let props: SkeletonProps = { ...defaults, ...initial };
  labelHost(host, props.label);

  const sheet = scope(host);
  sheet.setRules(rules(sheet.selector, props));

  function onLayout(): void {
    loop.redraw();
  }

  const grid = createGrid(host, gridOptions(host), onLayout);

  function glyphAt(x: number, y: number, t: number, reduced: boolean): string {
    const seed = Math.round(props.seed);
    const sx = seed * 3;
    const sy = seed * 5;
    const threshold = bayerAt(8, x + sx, y + sy);
    if (reduced) return threshold < 0.5 ? MEDIUM_SHADE : LIGHT_SHADE;
    const localPhase = bayerAt(8, x * 3 + sy, y * 5 + sx) * TAU;
    const speed = Math.max(0.25, Math.min(2, props.speed));
    const breath = 0.5 + 0.5 * Math.sin((t * speed * TAU) / CYCLE_MS + localPhase);
    return breath >= 0.32 + threshold * 0.36 ? MEDIUM_SHADE : LIGHT_SHADE;
  }

  function fillBand(x: number, y: number, width: number, height: number, t: number, reduced: boolean): void {
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) grid.set(x + col, y + row, glyphAt(x + col, y + row, t, reduced));
    }
  }

  function frame(t: number, reduced: boolean): void {
    grid.clear();
    const rows = layoutRows(props);
    const top = Math.max(0, Math.floor((grid.rows - rows) / 2));
    const pad = Math.max(1, Math.floor(grid.cols * 0.07));
    const inner = Math.max(1, grid.cols - pad * 2);
    const avatarWidth = Math.min(8, Math.max(3, Math.floor(inner * 0.22)));
    const avatarHeight = Math.max(2, Math.round(avatarWidth * grid.aspect));
    const textX = props.avatar ? pad + avatarWidth + 3 : pad;
    const available = Math.max(1, grid.cols - pad - textX);

    if (props.avatar) fillBand(pad, top, avatarWidth, avatarHeight, t, reduced);
    if (props.heading) fillBand(textX, top, Math.max(1, Math.round(available * 0.66)), 1, t, reduced);

    const count = lineCount(props.lines);
    const firstRow = top + (props.heading ? BAND_STEP : 0);
    for (let line = 0; line < count; line++) {
      const ratio = line === count - 1 ? 0.58 : line % 2 === 0 ? 0.94 : 0.82;
      fillBand(textX, firstRow + line * BAND_STEP, Math.max(1, Math.round(available * ratio)), 1, t, reduced);
    }

    grid.flush();
    host.dataset.picaReady = "true";
  }

  const loop = createLoop({
    el: host,
    fps: Math.max(1, Math.min(30, props.fps)),
    paused: props.paused,
    time: props.time,
    still: STILL_TIME,
    frame,
  });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      labelHost(host, props.label);
      if (props.avatar !== before.avatar || props.heading !== before.heading || props.lines !== before.lines) {
        sheet.setRules(rules(sheet.selector, props));
        grid.update({});
      }
      loop.update({
        paused: props.paused,
        time: props.time,
        fps: Math.max(1, Math.min(30, props.fps)),
      });
    },
    destroy() {
      loop.destroy();
      grid.destroy();
      sheet.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
