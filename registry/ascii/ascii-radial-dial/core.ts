import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiRadialDialProps extends MotionProps {
  /** Number of concentric broken rings, from 2 to 6. */
  rings: number;
  /** Number of separate arc segments per ring, from 3 to 12. */
  segments: number;
  /** Clear center radius as a fraction of the outer radius, from 0.2 to 0.65. */
  opening: number;
  /** Slow rotation rate multiplier, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 12 to 22. */
  fontSize: number;
}

export const defaults: AsciiRadialDialProps = {
  rings: 4,
  segments: 5,
  opening: 0.36,
  speed: 0.55,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

function dialBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiRadialDialProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("role", null);
  attributes.set("aria-label", null);
  attributes.set("aria-hidden", "true");
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "under");
  const options = () => ({
    fontFamily: GRID_FONT,
    fontSize: dialBound(props.fontSize, 16, 12, 22),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas" as const,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());
  let masks = new Uint8Array(0);
  let tints = new Uint8Array(0);

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows, cellWidth, cellHeight } = grid;
    const size = cols * rows;
    if (masks.length !== size) {
      masks = new Uint8Array(size);
      tints = new Uint8Array(size);
    }
    masks.fill(0);
    tints.fill(0);
    grid.clear();
    const count = Math.round(dialBound(props.rings, 4, 2, 6));
    const segments = Math.round(dialBound(props.segments, 5, 3, 12));
    const opening = dialBound(props.opening, 0.36, 0.2, 0.65);
    const speed = dialBound(props.speed, 0.55, 0, 2);
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const radius = Math.max(1, Math.min(cols * cellWidth, rows * cellHeight) * 0.39);
    const cx = (cols * 2 - 1) / 2;
    const cy = (rows * 4 - 1) / 2;
    const step = Math.PI * 2 / segments;
    for (let ring = 0; ring < count; ring++) {
      const r = radius * (opening + (1 - opening) * ring / (count - 1));
      const direction = ring % 2 ? -1 : 1;
      const phase = ring * 0.81 + Math.sin(seed * 1.71 + ring * 2.4) * 1.7 + direction * milliseconds * 0.00012 * speed / (1 + ring * 0.31);
      const length = step * (0.66 + Math.sin(ring * 1.9) * 0.06);
      const samples = Math.max(8, Math.ceil(length * r * 4 / Math.min(cellWidth, cellHeight)));
      for (let segment = 0; segment < segments; segment++) {
        const tint = ring === 1 && segment === 0 ? 3 : ring % 2 ? 1 : 2;
        const start = phase + segment * step;
        for (let i = 0; i <= samples; i++) {
          const angle = start + i / samples * length;
          const sx = Math.round(cx + Math.cos(angle) * r * 2 / cellWidth);
          const sy = Math.round(cy + Math.sin(angle) * r * 4 / cellHeight);
          const x = Math.floor(sx / 2);
          const y = Math.floor(sy / 4);
          if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
          const index = y * cols + x;
          masks[index] = (masks[index] ?? 0) | brailleDot(sy % 4, sx % 2);
          tints[index] = Math.max(tints[index] ?? 0, tint);
        }
      }
    }
    const colors = palette.colors;
    for (let i = 0; i < size; i++) {
      const mask = masks[i] ?? 0;
      if (!mask) continue;
      const tint = tints[i];
      grid.set(i % cols, Math.floor(i / cols), braille(mask), tint === 3 ? colors.accent : tint === 2 ? colors.fg : colors.muted);
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 2400, frame });
  return {
    update(next) {
      if (!alive) return;
      const fontSize = props.fontSize;
      props = { ...props, ...next };
      if (fontSize !== props.fontSize) grid.update(options());
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
