import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiSpiralCurrentProps extends MotionProps {
  /** Number of interleaved spiral ribbons, from 1 to 3. */
  arms: number;
  /** Complete windings in each ribbon, from 0.5 to 2.25. */
  turns: number;
  /** Separation control, from 0.35 to 1.5; larger values narrow the ribbons. */
  spacing: number;
  /** Clockwise drift rate, from 0 to 2; 1 rotates in about 79 seconds. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 10 to 20. */
  fontSize: number;
}

export const defaults: AsciiSpiralCurrentProps = {
  arms: 2,
  turns: 1.2,
  spacing: 0.7,
  speed: 0.6,
  fontSize: 12,
  paused: false,
  time: null,
  seed: 1,
};

function currentBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiSpiralCurrentProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "under");
  const options = (): GridOptions => ({
    fontFamily: GRID_FONT,
    fontSize: currentBound(props.fontSize, 12, 10, 20),
    lineHeight: 1.25,
    columns: 0,
    renderer: "canvas",
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows, cellWidth, cellHeight } = grid;
    const arms = Math.round(currentBound(props.arms, 2, 1, 3));
    const turns = currentBound(props.turns, 1.2, 0.5, 2.25);
    const spacing = currentBound(props.spacing, 0.7, 0.35, 1.5);
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const tau = Math.PI * 2;
    const phase = seed * 2.399 + milliseconds * 0.00008 * currentBound(props.speed, 0.6, 0, 2);
    const radius = Math.max(cellHeight, Math.min(Math.max(1, cols - 5) * cellWidth, Math.max(1, rows - 4) * cellHeight) / 2);
    const inner = radius * 0.28;
    const span = radius - inner;
    const slope = span / (turns * tau);
    const lane = span / (turns * arms);
    const halfWidth = Math.max(cellHeight * 0.32, Math.min(radius * 0.11, (lane - spacing * cellHeight) * 0.36));
    const soften = cellHeight * 0.35;
    const colors = palette.colors;
    const ramp = measureRamp(" .:-=+*#%@", GRID_FONT, 1.25);
    const starts = Array.from({ length: arms }, (_, arm) => phase + arm * tau / arms);
    const ends = starts.map((angle) => angle + turns * tau);
    const endpoints = starts.map((angle, arm) => [
      Math.cos(angle) * inner, Math.sin(angle) * inner,
      Math.cos(ends[arm] ?? angle) * radius, Math.sin(ends[arm] ?? angle) * radius,
    ]);
    grid.clear();
    for (let y = 0; y < rows; y++) {
      const py = (y - (rows - 1) / 2) * cellHeight;
      for (let x = 0; x < cols; x++) {
        const px = (x - (cols - 1) / 2) * cellWidth;
        const radial = Math.hypot(px, py);
        // The aperture is independent of phase, so winding arms never knot at the center.
        if (radial < inner - halfWidth - soften || radial > radius + halfWidth + soften) continue;
        const angle = Math.atan2(py, px);
        let nearest = Infinity;
        let chosen = 0;
        let position = 0;
        for (let arm = 0; arm < arms; arm++) {
          const start = starts[arm] ?? 0;
          const wrapped = ((angle - start) % tau + tau) % tau;
          for (let winding = 0; winding <= Math.ceil(turns); winding++) {
            const t = (wrapped + winding * tau) / (turns * tau);
            if (t > 1) continue;
            // Convert radial separation into distance normal to the spiral's tangent.
            const distance = Math.abs(radial - inner - span * t) / Math.sqrt(1 + (slope / Math.max(inner, radial)) ** 2);
            if (distance < nearest) { nearest = distance; chosen = arm; position = t; }
          }
          const endpoint = endpoints[arm];
          if (!endpoint) continue;
          const startDistance = Math.hypot(px - (endpoint[0] ?? 0), py - (endpoint[1] ?? 0));
          const endDistance = Math.hypot(px - (endpoint[2] ?? 0), py - (endpoint[3] ?? 0));
          if (startDistance < nearest) { nearest = startDistance; chosen = arm; position = 0; }
          if (endDistance < nearest) { nearest = endDistance; chosen = arm; position = 1; }
        }
        const coverage = Math.max(0, Math.min(1, (halfWidth + soften - nearest) / (halfWidth + soften)));
        if (coverage <= 0) continue;
        const tone = Math.pow(coverage, 0.62) * 0.88;
        const glyph = pick(ramp, tone);
        if (glyph === " ") continue;
        const ink = chosen === 0 && position > 0.89 ? colors.accent : chosen % 2 ? colors.muted : colors.fg;
        grid.set(x, y, glyph, ink);
      }
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 3600, frame });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.fontSize !== props.fontSize) grid.update(options());
      palette.refresh();
      loop?.update({ paused: props.paused, time: props.time });
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
