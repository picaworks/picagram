import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiBinaryTideProps extends MotionProps {
  /** Printable ASCII glyphs, sorted by measured ink; empty input falls back to 01. */
  chars: string;
  /** Maximum occupied-cell density, from 0 to 1. */
  density: number;
  /** Distance between wave crests in cell-width units. */
  wavelength: number;
  /** Wave travel speed in radians per second; negative values reverse the tide. */
  speed: number;
  /** Clear the central 64% by 46% rectangle for optional reading content. */
  readingZone: boolean;
  /** Accessible name for the tide and its optional content. */
  label: string;
  /** Glyph size in CSS pixels. */
  fontSize: number;
  /** Monospace font-family stack for the grid. */
  fontFamily: string;
  /** Cell height as a multiple of the glyph size. */
  lineHeight: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: AsciiBinaryTideProps = {
  chars: "01",
  density: 0.76,
  wavelength: 48,
  speed: 0.42,
  readingZone: false,
  label: "Binary tide",
  fontSize: 12,
  fontFamily: GRID_FONT,
  lineHeight: 1.35,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

const TIDE_TAU = Math.PI * 2;
const TIDE_STILL = 1200;
const TIDE_ORDER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

function tideNumber(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

function tideChars(value: string): string {
  return [...value].filter((glyph) => {
    const code = glyph.codePointAt(0) ?? 0;
    return code >= 33 && code <= 126;
  }).join("") || "01";
}

function tidePhases(seed: number): readonly [number, number] {
  const random = createRng(Number.isFinite(seed) ? seed : 1);
  return [random() * TIDE_TAU, random() * TIDE_TAU];
}

export const mount: Mount<AsciiBinaryTideProps> = (host, initial = {}) => {
  let props: AsciiBinaryTideProps = { ...defaults, ...initial };
  let phases = tidePhases(props.seed);
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  const restore = styleHost(host, {
    display: "grid",
    "place-items": "center",
    "background-color": cssVar("bg"),
  });
  const drawing = layer(host, "under");

  function accessibility(): void {
    attributes.set("role", "group");
    attributes.set("aria-label", props.label.trim() || null);
  }

  function options(): GridOptions {
    return {
      fontFamily: props.fontFamily || GRID_FONT,
      fontSize: tideNumber(props.fontSize, 12, 6, 32),
      columns: 0,
      lineHeight: tideNumber(props.lineHeight, 1.35, 0.8, 2),
      renderer: "auto",
      color: "",
    };
  }

  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());

  function frame(time: number): void {
    if (!alive) return;
    const density = tideNumber(props.density, 0.76, 0, 1);
    const wavelength = tideNumber(props.wavelength, 48, 8, 160);
    const travel = time / 1000 * tideNumber(props.speed, 0.42, -3, 3);
    const ramp = measureRamp(tideChars(props.chars), props.fontFamily || GRID_FONT, tideNumber(props.lineHeight, 1.35, 0.8, 2));
    const { cols, rows, aspect } = grid;
    const safeAspect = Math.max(0.1, aspect);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = (x + 0.5) / cols;
        const ny = (y + 0.5) / rows;
        if (props.readingZone && nx >= 0.18 && nx <= 0.82 && ny >= 0.27 && ny <= 0.73) {
          grid.set(x, y, " ");
          continue;
        }
        // Analytic contours define the tide; a stationary ordered weave samples
        // their coverage without random noise or moving cells off the grid.
        const bend = Math.sin(nx * TIDE_TAU + phases[1]) * wavelength * 0.12;
        const phase = (y / safeAspect + x * 0.36 + bend) / wavelength * TIDE_TAU - travel + phases[0];
        const crest = 0.5 + 0.5 * Math.cos(phase);
        const coverage = density * (0.05 + 0.95 * crest * crest);
        const threshold = ((TIDE_ORDER[(y % 4) * 4 + x % 4] ?? 0) + 0.5) / 16;
        const digitTone = 0.5 + 0.5 * Math.sin(phase * 0.5 + x * 0.16 + phases[1]);
        grid.set(x, y, coverage >= threshold ? pick(ramp, digitTone) : " ");
      }
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  accessibility();
  loop = createLoop({
    el: host,
    fps: tideNumber(props.fps, 24, 1, 30),
    paused: props.paused,
    time: props.time,
    still: TIDE_STILL,
    frame,
  });

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.seed !== props.seed) phases = tidePhases(props.seed);
      if (before.label !== props.label) accessibility();
      if (before.fontSize !== props.fontSize || before.fontFamily !== props.fontFamily || before.lineHeight !== props.lineHeight) {
        grid.update(options());
      }
      palette.refresh();
      loop?.update({ paused: props.paused, time: props.time, fps: tideNumber(props.fps, 24, 1, 30) });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      palette.destroy();
      grid.destroy();
      drawing.remove();
      restore();
      attributes.restore();
    },
  };
};
