import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiExpandingTrussProps extends MotionProps {
  /** Connected scissor units around the aperture, from 8 to 16. */
  segments: number;
  /** Mean deployment of the hinged ring, from 0.35 to 0.8. */
  opening: number;
  /** Full deployment excursion around the mean, from 0.1 to 0.3. */
  travel: number;
  /** Opening and closing rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 20. */
  fontSize: number;
}

export const defaults: AsciiExpandingTrussProps = {
  segments: 10,
  opening: 0.55,
  travel: 0.3,
  speed: 0.75,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

type TrussPoint = [number, number];
type TrussUnit = { inner: TrussPoint; outer: TrussPoint; pivot: TrussPoint };

function trussBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiExpandingTrussProps> = (host, initial = {}) => {
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
    fontSize: trussBound(props.fontSize, 16, 14, 20),
    columns: 0,
    lineHeight: 1.2,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => { rebuild(); loop?.redraw(); });
  let cols = 1;
  let rows = 1;
  let dx = 1;
  let dy = 1;
  let cx = 0;
  let cy = 0;
  let radius = 1;
  let barLength = 1;
  let slotStart = 0.2;
  let slotEnd = 0.6;
  let depth = 1;
  let halfAngle = 0;
  let directions: { end: TrussPoint; center: TrussPoint }[] = [];
  let masks = new Uint8Array(0);

  function rebuild(): void {
    cols = grid.cols;
    rows = grid.rows;
    dx = grid.cellWidth / 2;
    dy = grid.cellHeight / 4;
    cx = (cols * 2 - 1) / 2;
    cy = (rows * 4 - 1) / 2;
    radius = Math.max(1, Math.min(Math.max(1, cols - 7) * grid.cellWidth / 2, Math.max(1, rows - 7) * grid.cellHeight / 1.64));
    depth = grid.cellWidth * 1.1;
    const count = Math.round(trussBound(props.segments, 10, 8, 16));
    const seed = Math.round(trussBound(props.seed, 1, 1, 99));
    halfAngle = Math.PI / count;
    const opening = trussBound(props.opening, 0.55, 0.35, 0.8);
    const travel = trussBound(props.travel, 0.3, 0.1, 0.3);
    const low = 0.3 + 0.55 * (opening - travel / 2);
    const high = 0.3 + 0.55 * (opening + travel / 2);
    const cosine = Math.cos(halfAngle * 2);
    const closest = Math.min(high, Math.max(low, cosine));
    // The minimum denominator gives the largest outer radius anywhere in the cycle.
    barLength = radius * Math.sqrt(1 + closest * closest - 2 * closest * cosine);
    slotStart = low / (1 + low) - 0.1;
    slotEnd = high / (1 + high) + 0.1;
    const rotation = (seed - 1) * 2.39996 + halfAngle;
    directions = Array.from({ length: count }, (_, i) => {
      const angle = rotation + i * halfAngle * 2;
      return { end: [Math.cos(angle), Math.sin(angle)], center: [Math.cos(angle + halfAngle), Math.sin(angle + halfAngle)] };
    });
    masks = new Uint8Array(cols * rows);
  }

  function project(p: TrussPoint, z: number): TrussPoint {
    return [cx + p[0] / dx, cy + (p[1] * 0.82 - z * 0.57) / dy];
  }

  function dot(x: number, y: number, erase = false): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= cols * 2 || y >= rows * 4) return;
    const index = Math.floor(y / 4) * cols + Math.floor(x / 2);
    const bit = brailleDot(y % 4, x % 2);
    masks[index] = erase ? (masks[index] ?? 0) & ~bit : (masks[index] ?? 0) | bit;
  }

  function line(a: TrussPoint, b: TrussPoint): void {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 1.3));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      dot(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
    }
  }

  function band(a: TrussPoint, b: TrussPoint, width: number, erase = false): void {
    const r = width * grid.cellWidth / 2;
    const vx = (b[0] - a[0]) * dx;
    const vy = (b[1] - a[1]) * dy;
    const length = vx * vx + vy * vy || 1;
    for (let y = Math.floor(Math.min(a[1], b[1]) - r / dy); y <= Math.ceil(Math.max(a[1], b[1]) + r / dy); y++) {
      for (let x = Math.floor(Math.min(a[0], b[0]) - r / dx); x <= Math.ceil(Math.max(a[0], b[0]) + r / dx); x++) {
        const px = (x - a[0]) * dx;
        const py = (y - a[1]) * dy;
        const t = Math.max(0, Math.min(1, (px * vx + py * vy) / length));
        if (Math.hypot(px - t * vx, py - t * vy) <= r) dot(x, y, erase);
      }
    }
    if (!erase) line(a, b);
  }

  function bearing(p: TrussPoint, z: number, size: number, ring = false): void {
    const q = project(p, z);
    const r = grid.cellWidth * size;
    const edge = grid.cellWidth * 0.17;
    const outer = r + (ring ? edge : 0);
    for (let y = Math.floor(q[1] - outer / dy); y <= Math.ceil(q[1] + outer / dy); y++) {
      for (let x = Math.floor(q[0] - outer / dx); x <= Math.ceil(q[0] + outer / dx); x++) {
        const distance = Math.hypot((x - q[0]) * dx, (y - q[1]) * dy);
        if (distance > outer) continue;
        if (ring) dot(x, y, true);
        if (!ring || distance >= r - edge || distance <= edge * 0.7) dot(x, y);
      }
    }
  }

  function frame(milliseconds: number): void {
    if (!alive) return;
    const seed = Math.round(trussBound(props.seed, 1, 1, 99));
    const phase = milliseconds * 0.0004 * trussBound(props.speed, 0.75, 0, 2) + (seed - 1) * 0.47;
    const deployment = trussBound(props.opening, 0.55, 0.35, 0.8) + Math.sin(phase) * trussBound(props.travel, 0.3, 0.1, 0.3) / 2;
    const ratio = 0.3 + 0.55 * deployment;
    const outerRadius = barLength / Math.sqrt(1 + ratio * ratio - 2 * ratio * Math.cos(halfAngle * 2));
    const innerRadius = outerRadius * ratio;
    const pivotRadius = 2 * innerRadius * Math.cos(halfAngle) / (1 + ratio);
    // The crossing lies at ratio / (1 + ratio) along the inner-to-outer bar.
    const units: TrussUnit[] = directions.map(({ end, center }) => ({
      inner: [end[0] * innerRadius, end[1] * innerRadius],
      outer: [end[0] * outerRadius, end[1] * outerRadius],
      pivot: [center[0] * pivotRadius, center[1] * pivotRadius],
    }));
    masks.fill(0);
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const next = units[(i + 1) % units.length];
      if (!unit || !next) continue;
      band(project(unit.inner, -depth), project(next.outer, -depth), 0.3);
      band(project(unit.outer, -depth), project(next.inner, -depth), 0.3);
      for (const p of [unit.inner, unit.outer, unit.pivot]) line(project(p, -depth), project(p, depth));
      bearing(unit.pivot, -depth, 0.3);
    }
    // Each front bay contains two full crossed bars, with no perimeter path around a diamond.
    for (const erase of [true, false]) {
      for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        const next = units[(i + 1) % units.length];
        if (!unit || !next) continue;
        const width = erase ? 1.55 : 1;
        band(project(unit.inner, depth), project(next.outer, depth), width, erase);
        band(project(unit.outer, depth), project(next.inner, depth), width, erase);
      }
    }
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const next = units[(i + 1) % units.length];
      if (!unit || !next) continue;
      const slot = (t: number): TrussPoint => [
        unit.inner[0] + (next.outer[0] - unit.inner[0]) * t,
        unit.inner[1] + (next.outer[1] - unit.inner[1]) * t,
      ];
      // The slot stays at fixed distances along its rigid bar as the crossing pin slides.
      band(project(slot(slotStart), depth), project(slot(slotEnd), depth), 0.46, true);
    }
    for (const unit of units) {
      bearing(unit.inner, depth, 0.45, true);
      bearing(unit.outer, depth, 0.45, true);
      bearing(unit.pivot, depth, 0.58, true);
    }
    grid.clear();
    for (let i = 0; i < masks.length; i++) {
      const mask = masks[i] ?? 0;
      if (mask) grid.set(i % cols, Math.floor(i / cols), braille(mask));
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  rebuild();
  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.fontSize !== props.fontSize) grid.update(options());
      else if (before.segments !== props.segments || before.seed !== props.seed || before.opening !== props.opening || before.travel !== props.travel) rebuild();
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
