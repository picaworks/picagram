import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiHarmonicStackProps extends MotionProps {
  /** Number of overlapping signal profiles, from 3 to 10. */
  traces: number;
  /** Number of broad oscillations across each profile, from 0.5 to 6. */
  frequency: number;
  /** Profile height relative to the bank, from 0.2 to 1.3. */
  amplitude: number;
  /** Drift rate, from 0 to 2; 1 advances one phase in about 24 seconds. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 10 to 20. */
  fontSize: number;
}

export const defaults: AsciiHarmonicStackProps = {
  traces: 7,
  frequency: 2.4,
  amplitude: 0.85,
  speed: 0.6,
  fontSize: 12,
  paused: false,
  time: null,
  seed: 1,
};

function stackBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiHarmonicStackProps> = (host, initial = {}) => {
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
    fontSize: stackBound(props.fontSize, 12, 10, 20),
    lineHeight: 1.25,
    columns: 0,
    renderer: "canvas",
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows } = grid;
    const colors = palette.colors;
    const count = Math.round(stackBound(props.traces, 7, 3, 10));
    const frequency = stackBound(props.frequency, 2.4, 0.5, 6);
    const height = Math.max(1, rows * 0.27) * stackBound(props.amplitude, 0.85, 0.2, 1.3);
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const phase = milliseconds * stackBound(props.speed, 0.6, 0, 2) * Math.PI / 12000 + seed * 2.399;
    const ramp = measureRamp(" .:-=+*#%@", GRID_FONT, 1.25);
    const bits = new Uint8Array(cols * rows);
    grid.clear();
    // Sparse registration dots hold the field still as the profiles pass through it.
    for (let y = 2; y < rows - 2; y += 4) {
      for (let x = 3; x < cols - 3; x += 8) grid.set(x, y, ".", colors.muted);
    }
    for (let trace = 0; trace < count; trace++) {
      const depth = trace / (count - 1);
      const width = Math.max(2, Math.floor(cols * (0.64 + depth * 0.19)));
      const left = Math.floor((cols - width) / 2 + (0.5 - depth) * cols * 0.035);
      const baseline = Math.min(rows - 2, Math.round(rows * (0.34 + depth * 0.48)));
      const profile = (u: number): number => {
        const envelope = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.8);
        const theta = u * Math.PI * 2 * frequency - phase + trace * 0.42;
        const signal = 0.58 + Math.sin(theta) * 0.27 + Math.sin(theta * 1.93 + seed + depth) * 0.12;
        return baseline - height * (0.8 + depth * 0.2) * envelope * signal;
      };
      // Near silhouettes replace the far bank, including its ink, down to their baseline.
      for (let x = 0; x <= width; x++) {
        const top = profile(x / width);
        for (let y = Math.max(0, Math.ceil(top)); y <= baseline; y++) {
          const distance = (y - top) / Math.max(1, baseline - top);
          const tone = (1 - distance) * (0.16 + depth * 0.12);
          grid.set(left + x, y, pick(ramp, tone), colors.fg);
        }
      }
      bits.fill(0);
      let previous = Math.round(profile(0) * 4);
      for (let sx = 0; sx <= width * 2; sx++) {
        const next = Math.round(profile(sx / (width * 2)) * 4);
        const x = left + Math.floor(sx / 2);
        if (x >= 0 && x < cols) {
          for (let sy = Math.max(0, Math.min(previous, next)); sy <= Math.min(rows * 4 - 1, Math.max(previous, next)); sy++) {
            const index = Math.floor(sy / 4) * cols + x;
            bits[index] = (bits[index] ?? 0) | brailleDot(sy % 4, sx % 2);
          }
        }
        previous = next;
      }
      const ink = trace === count - 1 ? colors.accent : depth < 0.5 ? colors.muted : colors.fg;
      for (let i = 0; i < bits.length; i++) {
        const dots = bits[i] ?? 0;
        if (dots) grid.set(i % cols, Math.floor(i / cols), braille(dots), ink);
      }
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 4200, frame });
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
