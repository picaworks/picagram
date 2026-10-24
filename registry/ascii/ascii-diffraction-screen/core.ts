import { GRID_FONT } from "../../../lib/font";
import { createGrid } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiDiffractionScreenProps extends MotionProps {
  /** Separation of the two openings in illustration units, from 0.3 to 0.9. */
  spacing: number;
  /** Fringe scale in illustration units, from 0.08 to 0.24; larger values make broader bands. */
  wavelength: number;
  /** Separation between bright bands and dark troughs, from 0.6 to 2.5. */
  contrast: number;
  /** Rate of gentle fringe breathing, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 12 to 22. */
  fontSize: number;
}

export const defaults: AsciiDiffractionScreenProps = {
  spacing: 0.72,
  wavelength: 0.12,
  contrast: 1.35,
  speed: 0.6,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

function fringeBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiDiffractionScreenProps> = (host, initial = {}) => {
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
    fontSize: fringeBound(props.fontSize, 16, 12, 22),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas" as const,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows } = grid;
    const colors = palette.colors;
    const ramp = measureRamp(" .:-=+*#%@", GRID_FONT, 1.2);
    const spacing = fringeBound(props.spacing, 0.72, 0.3, 0.9);
    const contrast = fringeBound(props.contrast, 1.35, 0.6, 2.5);
    const speed = fringeBound(props.speed, 0.6, 0, 2);
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const breathing = 1 + 0.055 * Math.sin(milliseconds * 0.00035 * speed + seed * 0.7);
    const wavelength = fringeBound(props.wavelength, 0.12, 0.08, 0.24) * breathing;
    const top = Math.max(0, Math.floor(rows * 0.13));
    const bottom = Math.min(rows - 1, Math.ceil(rows * 0.87) - 1);
    const center = (top + bottom) / 2;
    const halfHeight = Math.max(1, (bottom - top) / 2);
    const wall = Math.max(1, Math.floor(cols * 0.1));
    const start = wall + 2;
    const right = Math.max(start + 1, cols - 3);
    const openingA = Math.round(center - spacing * halfHeight / 2);
    const openingB = Math.round(center + spacing * halfHeight / 2);
    grid.clear();

    // Path difference produces stationary fringes rather than expanding wavefront rings.
    for (let y = top; y <= bottom; y++) {
      for (let x = start; x <= right; x++) {
        const u = (x - start) / Math.max(1, right - start);
        let intensity = 0;
        for (const offset of [-0.25, 0.25]) {
          const v = (y - center + offset) / halfHeight;
          const distance = 0.12 + u * 1.48;
          const pathA = Math.hypot(distance, v - spacing / 2);
          const pathB = Math.hypot(distance, v + spacing / 2);
          const interference = Math.cos(Math.PI * (pathA - pathB) / wavelength) ** 2;
          const envelope = Math.max(0, 1 - v * v) ** 0.45;
          intensity += interference ** contrast * envelope * (0.34 + 0.66 * Math.sqrt(u)) / 2;
        }
        const glyph = pick(ramp, intensity);
        if (glyph !== " ") grid.set(x, y, glyph, colors.fg);
      }
      if (y !== openingA && y !== openingB) grid.set(wall, y, "|", colors.muted);
    }
    for (const row of [openingA, openingB]) {
      grid.set(wall - 2, row, "-", colors.muted);
      grid.set(wall - 1, row, "-", colors.muted);
      grid.set(wall + 1, row, ">", colors.accent);
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
