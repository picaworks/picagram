import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiCatenaryNetProps extends MotionProps {
  /** Depth of the hanging cables relative to their span, from 0.2 to 0.6. */
  sag: number;
  /** Longitudinal cables joined by transverse ties, from 5 to 10. */
  strands: number;
  /** Amplitude of the travelling tension wave, from 0.05 to 0.2. */
  sway: number;
  /** Rate of the travelling wave, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 14 to 20. */
  fontSize: number;
}

export const defaults: AsciiCatenaryNetProps = {
  sag: 0.4,
  strands: 7,
  sway: 0.1,
  speed: 0.75,
  fontSize: 16,
  paused: false,
  time: null,
  seed: 1,
};

type NetPoint = [number, number, number, number, number];
type NetLayout = { cols: number; rows: number; masks: Uint8Array; fixed: Uint8Array; paths: NetPoint[][] };

function netBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

function netDot(masks: Uint8Array, cols: number, rows: number, x: number, y: number): void {
  const dx = Math.round(x);
  const dy = Math.round(y);
  if (dx < 0 || dy < 0 || dx >= cols * 2 || dy >= rows * 4) return;
  const index = Math.floor(dy / 4) * cols + Math.floor(dx / 2);
  masks[index] = (masks[index] ?? 0) | brailleDot(dy % 4, dx % 2);
}

function netLine(masks: Uint8Array, cols: number, rows: number, ax: number, ay: number, bx: number, by: number): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 1.4));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    netDot(masks, cols, rows, ax + (bx - ax) * t, ay + (by - ay) * t);
  }
}

export const mount: Mount<AsciiCatenaryNetProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  let layout: NetLayout | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "under");
  const options = (): GridOptions => ({
    fontFamily: GRID_FONT,
    fontSize: netBound(props.fontSize, 16, 14, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    fixedCells: true,
    color: "",
  });
  const grid = createGrid(drawing.el, options(), () => {
    layout = null;
    loop?.redraw();
  });

  function prepare(): NetLayout {
    const { cols, rows, cellWidth: cw, cellHeight: ch } = grid;
    const width = Math.max(1, (cols - 8) * cw);
    const height = Math.max(1, (rows - 7) * ch);
    const sag = netBound(props.sag, 0.4, 0.2, 0.6);
    const upright = 1 + Math.max(0, 1.5 - width / height) * 0.3;
    const extent = (sag + 0.143) * upright + 0.1;
    const span = Math.max(1, Math.min(width, height / extent));
    const top = ((rows - 1) * ch - span * extent) / 2;
    const cx = (cols - 1) / 2;
    const seed = Math.round(netBound(props.seed, 1, 1, 99));
    const slant = seed % 2 ? 1 : -1;
    const masks = new Uint8Array(cols * rows);
    const fixed = new Uint8Array(cols * rows);
    const paths: NetPoint[][] = [];
    const point = (s: number, v: number): NetPoint => {
      const envelope = Math.sin(Math.PI * s);
      const cable = (Math.cosh(1.15) - Math.cosh(2.3 * (s - 0.5))) / (Math.cosh(1.15) - 1);
      const x = (s - 0.5 + slant * v * 0.045 * envelope) * span;
      const y = (sag * cable + (v * 0.095 + 0.012 * (1 - v * v)) * envelope) * span * upright;
      const amplitude = envelope * envelope * (0.75 + 0.25 * (1 - v * v)) * span * upright * 0.18 * 4 / ch;
      return [(cx + x / cw) * 2, (top + y) * 4 / ch, Math.sin(s * Math.PI * 2), Math.cos(s * Math.PI * 2), amplitude];
    };
    const count = Math.round(netBound(props.strands, 7, 5, 10));
    const samples = Math.max(60, Math.ceil(span / cw * 4));
    for (let j = 0; j < count; j++) {
      const path: NetPoint[] = [];
      for (let i = 0; i <= samples; i++) path.push(point(i / samples, j / (count - 1) * 2 - 1));
      paths.push(path);
    }
    const ties = Math.max(8, Math.min(18, Math.round(span / cw / 3)));
    for (let i = 1; i < ties; i++) {
      const path: NetPoint[] = [];
      for (let j = 0; j <= 24; j++) path.push(point(i / ties, j / 12 - 1));
      paths.push(path);
    }
    for (const side of [-1, 1]) {
      const x = (cx + side * span / cw / 2) * 2;
      const y = top * 4 / ch;
      const bottom = (top + span * extent) * 4 / ch;
      for (const offset of [-0.5, 0.5]) netLine(fixed, cols, rows, x + offset, y + 3, x + offset, bottom);
      netLine(fixed, cols, rows, x - 3, bottom, x + 3, bottom);
      for (let i = 0; i <= 24; i++) {
        const angle = i / 24 * Math.PI * 2;
        netDot(fixed, cols, rows, x + Math.cos(angle) * 1.7, y + Math.sin(angle) * 2.6);
      }
    }
    return { cols, rows, masks, fixed, paths };
  }

  function frame(milliseconds: number): void {
    if (!alive) return;
    if (!layout || layout.cols !== grid.cols || layout.rows !== grid.rows) layout = prepare();
    const { cols, rows, masks, fixed, paths } = layout;
    masks.set(fixed);
    const seed = Math.round(netBound(props.seed, 1, 1, 99));
    const phase = seed * 2.39996 + milliseconds * 0.00065 * netBound(props.speed, 0.75, 0, 2);
    const sine = Math.sin(phase);
    const cosine = Math.cos(phase);
    const sway = netBound(props.sway, 0.1, 0.05, 0.2);
    for (const path of paths) {
      let ax = 0;
      let ay = 0;
      for (let i = 0; i < path.length; i++) {
        const p = path[i];
        if (!p) continue;
        const y = p[1] + (p[2] * cosine - p[3] * sine) * p[4] * sway;
        if (i) netLine(masks, cols, rows, ax, ay, p[0], y);
        ax = p[0];
        ay = y;
      }
    }
    grid.clear();
    for (let i = 0; i < masks.length; i++) {
      const mask = masks[i] ?? 0;
      if (mask) grid.set(i % cols, Math.floor(i / cols), braille(mask));
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.sag !== props.sag || before.strands !== props.strands || before.seed !== props.seed) layout = null;
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
