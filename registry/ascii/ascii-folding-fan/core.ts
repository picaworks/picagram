import { labelHost } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { createGrid } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiFoldingFanProps extends MotionProps {
  /** Number of alternating pleated faces, from 6 to 24. */
  leaves: number;
  /** Resting opening angle in degrees, from 70 to 150. */
  aperture: number;
  /** Crease relief and face contrast, from 0.2 to 1. */
  depth: number;
  /** Rate of the small opening cycle, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 11 to 20. */
  fontSize: number;
}

export const defaults: AsciiFoldingFanProps = {
  leaves: 14,
  aperture: 126,
  depth: 0.75,
  speed: 0.65,
  fontSize: 13,
  paused: false,
  time: null,
  seed: 1,
};

function fanClamp(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiFoldingFanProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  for (const name of ["role", "aria-label", "aria-hidden"]) attributes.set(name, host.getAttribute(name));
  labelHost(host, "");
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "under");
  const grid = createGrid(drawing.el, {
    fontFamily: GRID_FONT,
    fontSize: fanClamp(props.fontSize, 13, 11, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    color: "",
  }, () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows, cellWidth, cellHeight } = grid;
    const leaves = Math.round(fanClamp(props.leaves, 14, 6, 24));
    const depth = fanClamp(props.depth, 0.75, 0.2, 1);
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const clock = milliseconds / 1000 * fanClamp(props.speed, 0.65, 0, 2);
    const aperture = (fanClamp(props.aperture, 126, 70, 150) + Math.sin(clock * 0.32 + (seed - 1) * 0.73) * 4) * Math.PI / 180;
    const step = aperture / leaves;
    // These anchors depend only on layout, so the hinge never follows the opening.
    const hingeX = Math.round((cols - 1) / 2);
    const hingeY = Math.round((rows - 1) * 0.79);
    const radius = Math.max(1, Math.min((cols - 5) * cellWidth * 0.44, (rows - 5) * cellHeight * 0.64));
    const ramp = measureRamp(" .:-=+*#%@", GRID_FONT, 1.2);
    const points: [number, number][] = [];
    const lengths: number[] = [];
    for (let crease = 0; crease <= leaves; crease++) {
      const angle = -aperture / 2 + crease * step;
      const length = radius * (1 - (crease % 2) * depth * 0.07);
      lengths.push(length);
      points.push([hingeX + Math.sin(angle) * length / cellWidth, hingeY - Math.cos(angle) * length / cellHeight]);
    }
    grid.clear();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = (x - hingeX) * cellWidth;
        const py = (hingeY - y) * cellHeight;
        if (py < 0) continue;
        const angle = Math.atan2(px, py) + aperture / 2;
        if (angle < 0 || angle >= aperture) continue;
        const face = Math.min(leaves - 1, Math.floor(angle / step));
        const local = angle - face * step;
        const first = lengths[face] ?? radius;
        const second = lengths[face + 1] ?? radius;
        const edge = first * second * Math.sin(step) / (second * Math.sin(step - local) + first * Math.sin(local));
        const distance = Math.hypot(px, py);
        if (distance < radius * 0.18 || distance > edge) continue;
        const radial = distance / radius;
        const lit = face % 2 === 0;
        const relief = lit ? 0.5 + depth * 0.28 : 0.5 - depth * 0.32;
        const grain = Math.sin(face * 2.7 + seed) * 0.025;
        const tone = relief * (0.8 + radial * 0.2) + grain;
        grid.set(x, y, pick(ramp, tone), palette.colors.fg);
      }
    }
    function line(ax: number, ay: number, bx: number, by: number): void {
      const dx = (bx - ax) * cellWidth;
      const dy = (by - ay) * cellHeight;
      const slope = Math.abs(dy) / Math.max(0.01, Math.abs(dx));
      const glyph = slope > 2.2 ? "|" : slope < 0.42 ? "-" : dx * dy < 0 ? "/" : "\\";
      const samples = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2));
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        grid.set(Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t), glyph, palette.colors.fg);
      }
    }
    for (let crease = 0; crease < points.length; crease++) {
      const point = points[crease];
      if (!point) continue;
      const [x, y] = point;
      line(hingeX, hingeY, x, y);
      const next = points[crease + 1];
      if (next) line(x, y, next[0], next[1]);
    }
    grid.set(hingeX, hingeY + 1, "|", palette.colors.fg);
    grid.set(hingeX, hingeY, "o", palette.colors.accent);
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 20, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.fontSize !== props.fontSize) grid.update({ fontSize: fanClamp(props.fontSize, 13, 11, 20) });
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
