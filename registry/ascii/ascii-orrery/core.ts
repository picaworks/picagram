import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiOrreryProps extends MotionProps {
  /** Circular rails sharing the central sun, from 3 to 6. */
  orbits: number;
  /** Inclination of the orbital plane in degrees, from 20 to 65. */
  tilt: number;
  /** Assembly size within the available margins, from 0.55 to 1. */
  spread: number;
  /** Planet travel rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 20. */
  fontSize: number;
}

export const defaults: AsciiOrreryProps = {
  orbits: 4,
  tilt: 50,
  spread: 0.85,
  speed: 0.75,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

type OrreryPoint = [number, number, number];
type OrreryOrbit = { radius: number; phase: number; bead: number; rate: number };

function orreryBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiOrreryProps> = (host, initial = {}) => {
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
    fontSize: orreryBound(props.fontSize, 16, 14, 20),
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
  let cosine = 1;
  let sine = 0;
  let squash = 1;
  let sun = 1;
  let rails = new Uint8Array(0);
  let ink = new Uint8Array(0);
  let orbits: OrreryOrbit[] = [];

  function dot(target: Uint8Array, x: number, y: number, erase = false): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= cols * 2 || y >= rows * 4) return;
    const index = Math.floor(y / 4) * cols + Math.floor(x / 2);
    const bit = brailleDot(y % 4, x % 2);
    target[index] = erase ? (target[index] ?? 0) & ~bit : (target[index] ?? 0) | bit;
  }

  function point(radius: number, angle: number): OrreryPoint {
    const x = Math.cos(angle) * radius;
    const depth = Math.sin(angle);
    const y = depth * radius * squash;
    return [cx + (x * cosine - y * sine) / dx, cy + (x * sine + y * cosine) / dy, depth];
  }

  function line(target: Uint8Array, a: OrreryPoint, b: OrreryPoint, faint: boolean): void {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(a[0] + (b[0] - a[0]) * t);
      const y = Math.round(a[1] + (b[1] - a[1]) * t);
      if (!faint || (x + y) % 2 === 0) dot(target, x, y);
    }
  }

  function disc(p: OrreryPoint, radius: number, erase: boolean): void {
    const rx = radius / dx;
    const ry = radius / dy;
    for (let y = Math.floor(p[1] - ry); y <= Math.ceil(p[1] + ry); y++) {
      for (let x = Math.floor(p[0] - rx); x <= Math.ceil(p[0] + rx); x++) {
        if (((x - p[0]) / rx) ** 2 + ((y - p[1]) / ry) ** 2 <= 1) dot(ink, x, y, erase);
      }
    }
  }

  function rebuild(): void {
    cols = grid.cols;
    rows = grid.rows;
    dx = grid.cellWidth / 2;
    dy = grid.cellHeight / 4;
    cx = (cols * 2 - 1) / 2;
    cy = (rows * 4 - 1) / 2;
    const random = createRng(Math.round(orreryBound(props.seed, 1, 1, 99)));
    const rotation = (random() - 0.5) * 0.65;
    cosine = Math.cos(rotation);
    sine = Math.sin(rotation);
    squash = Math.cos(orreryBound(props.tilt, 50, 20, 65) * Math.PI / 180);
    const extentX = Math.hypot(cosine, squash * sine);
    const extentY = Math.hypot(sine, squash * cosine);
    const radius = Math.max(1, Math.min(
      Math.max(1, cols - 7) * grid.cellWidth / (2 * extentX),
      Math.max(1, rows - 7) * grid.cellHeight / (2 * extentY),
    )) * orreryBound(props.spread, 0.85, 0.55, 1);
    sun = Math.min(Math.max(16, Math.min(20, grid.cellWidth * 1.9)), radius * squash * 0.48);
    rails = new Uint8Array(cols * rows);
    ink = new Uint8Array(cols * rows);
    const count = Math.round(orreryBound(props.orbits, 4, 3, 6));
    const smallestBead = Math.max(9, Math.min(14, grid.cellWidth * 0.85));
    // Screen-sized bodies keep their identity when the inclined plane narrows on phones.
    const inner = Math.min(radius * 0.94, Math.max(radius * 0.28, (sun + smallestBead + dx * 0.8) / squash));
    orbits = Array.from({ length: count }, (_, i) => ({
      radius: inner + (radius - inner) * i / (count - 1),
      phase: i * 2.39996 + random() * 0.55,
      bead: Math.max(9, Math.min(14, grid.cellWidth * (0.85 + i * 0.05))),
      rate: 0.00036 / (1 + i * 0.5),
    }));
    for (const orbit of orbits) {
      const samples = Math.max(160, Math.ceil(orbit.radius * 2));
      let previous = point(orbit.radius, 0);
      for (let i = 1; i <= samples; i++) {
        const next = point(orbit.radius, i / samples * Math.PI * 2);
        line(rails, previous, next, next[2] < 0);
        previous = next;
      }
    }
  }

  function frame(milliseconds: number): void {
    if (!alive) return;
    ink.set(rails);
    const speed = orreryBound(props.speed, 0.75, 0, 2);
    const bodies = orbits.map((orbit) => ({
      p: point(orbit.radius, orbit.phase + milliseconds * orbit.rate * speed),
      radius: orbit.bead,
    })).sort((a, b) => a.p[2] - b.p[2]);
    const center: OrreryPoint = [cx, cy, 0];
    for (const body of bodies) line(ink, center, body.p, body.p[2] < 0);
    for (const body of bodies) {
      disc(body.p, body.radius + dx * 0.8, true);
      disc(body.p, body.radius, false);
    }
    disc(center, sun + dx, true);
    disc(center, sun, false);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      dot(ink, cx + Math.cos(angle) * (sun + dx * 1.8) / dx, cy + Math.sin(angle) * (sun + dx * 1.8) / dy);
    }
    grid.clear();
    for (let i = 0; i < ink.length; i++) {
      const mask = ink[i] ?? 0;
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
      else if (before.orbits !== props.orbits || before.tilt !== props.tilt || before.spread !== props.spread || before.seed !== props.seed) rebuild();
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
