import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiStringModesProps extends MotionProps {
  /** First harmonic of three consecutive standing modes, from 1 to 4. */
  harmonic: number;
  /** Displacement as a fraction of the separation between strings, from 0.1 to 0.4. */
  amplitude: number;
  /** Fraction of the available height spanned by the three baselines, from 0.5 to 0.8. */
  spacing: number;
  /** Rate of the analytic standing oscillation, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 12 to 20. */
  fontSize: number;
}

export const defaults: AsciiStringModesProps = {
  harmonic: 1,
  amplitude: 0.3,
  spacing: 0.65,
  speed: 0.6,
  fontSize: 14,
  paused: false,
  time: null,
  seed: 1,
};

function stringModesBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiStringModesProps> = (host, initial = {}) => {
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
    fontSize: stringModesBound(props.fontSize, 14, 12, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  let dots = new Uint8Array(0);

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows } = grid;
    if (dots.length !== cols * rows) dots = new Uint8Array(cols * rows);
    dots.fill(0);
    const harmonic = Math.round(stringModesBound(props.harmonic, 1, 1, 4));
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const phase = seed * 0.23 + milliseconds * 0.0007 * stringModesBound(props.speed, 0.6, 0, 2);
    const separation = Math.max(2, (rows - 5) * stringModesBound(props.spacing, 0.65, 0.5, 0.8) / 2);
    const amplitude = separation * stringModesBound(props.amplitude, 0.3, 0.1, 0.4) * 4;
    const left = Math.max(2, Math.min(5, Math.floor(cols * 0.12))) * 2;
    const right = Math.max(left + 2, (cols - 4) * 2);
    const centers = [0, 1, 2].map((i) => Math.round((rows - 1) / 2 + (i - 1) * separation));
    function dot(x: number, y: number): void {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= cols * 2 || y >= rows * 4) return;
      const index = Math.floor(y / 4) * cols + Math.floor(x / 2);
      dots[index] = (dots[index] ?? 0) | brailleDot(y % 4, x % 2);
    }
    function line(x0: number, y0: number, x1: number, y1: number): void {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 1.5));
      for (let i = 0; i <= steps; i++) dot(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps);
    }
    for (let row = 0; row < 3; row++) {
      const n = harmonic + row;
      const center = (centers[row] ?? 0) * 4 + 2;
      const displacement = Math.cos(phase * n);
      const trace = Math.cos(phase * n - 0.3);
      for (let x = left; x <= right; x += 6) dot(x, center);
      for (let x = left + 2; x < right - 1; x += 4) {
        const u = (x - left) / (right - left);
        dot(x, center + Math.sin(u * Math.PI * n) * amplitude * trace);
      }
      let previous = center;
      for (let x = left; x <= right; x++) {
        const u = (x - left) / (right - left);
        const current = center + Math.sin(u * Math.PI * n) * amplitude * displacement;
        if (x > left) line(x - 1, previous, x, current);
        previous = current;
      }
      for (let node = 1; node < n; node++) {
        const x = left + (right - left) * node / n;
        dot(x - 1, center);
        dot(x + 1, center);
        dot(x, center - 1);
        dot(x, center + 1);
      }
      for (const x of [left, right]) {
        line(x, center - 3, x, center + 3);
        dot(x - 1, center - 3);
        dot(x + 1, center + 3);
      }
    }
    grid.clear();
    for (let i = 0; i < dots.length; i++) {
      const mask = dots[i] ?? 0;
      if (mask) grid.set(i % cols, Math.floor(i / cols), braille(mask));
    }
    for (let row = 0; row < 3; row++) grid.write(1, centers[row] ?? 0, String(harmonic + row));
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.fontSize !== props.fontSize) grid.update(options());
      loop?.update({ paused: props.paused, time: props.time });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      grid.destroy();
      drawing.remove();
      restore();
      attributes.restore();
    },
  };
};
