import { labelHost } from "../../../lib/a11y";
import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiLoopKnotProps extends MotionProps {
  /** Number of crossings in the closed loop, rounded to 3, 5 or 7. */
  winding: number;
  /** Breadth of the interlaced lobes, from 0.65 to 1.3. */
  spread: number;
  /** Slow rotation rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 11 to 20. */
  fontSize: number;
}

export const defaults: AsciiLoopKnotProps = {
  winding: 3,
  spread: 1.05,
  speed: 0.65,
  fontSize: 13,
  paused: false,
  time: null,
  seed: 1,
};

function knotClamp(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiLoopKnotProps> = (host, initial = {}) => {
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
    fontSize: knotClamp(props.fontSize, 13, 11, 20),
    lineHeight: 1.15,
    columns: 0,
    renderer: "dom",
    color: "",
  }, () => loop?.redraw());

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows, cellWidth, cellHeight } = grid;
    const width = cols * 2;
    const height = rows * 4;
    const size = width * height;
    const winding = 3 + 2 * Math.round((knotClamp(props.winding, 3, 3, 7) - 3) / 2);
    const spread = knotClamp(props.spread, 1.05, 0.65, 1.3);
    const seed = Number.isFinite(props.seed) ? props.seed : 1;
    const clock = milliseconds / 1000 * knotClamp(props.speed, 0.65, 0, 2);
    const spin = clock * 0.07 + (seed - 1) * 2.39996323 + 0.12;
    const tilt = 0.46 + Math.sin(clock * 0.09) * 0.18;
    const yaw = Math.sin(clock * 0.06 + 0.4) * 0.28;
    const extent = 1.7 + spread;
    const scale = Math.max(0.1, Math.min(cols * cellWidth, rows * cellHeight) * 0.42 / extent);
    const dx = cellWidth / 2;
    const dy = cellHeight / 4;
    const radius = cellWidth * 0.65;
    const halo = radius + cellWidth * 0.55;
    const samples = Math.min(2400, Math.max(800, Math.ceil(scale * winding * 9)));
    const points: [number, number, number][] = [];
    for (let i = 0; i < samples; i++) {
      const t = i / samples * Math.PI * 2;
      const ring = 1.7 + spread * Math.cos(winding * t);
      const x = ring * Math.cos(2 * t);
      const y = ring * Math.sin(2 * t);
      const z = spread * Math.sin(winding * t);
      const ty = y * Math.cos(tilt) - z * Math.sin(tilt);
      const tz = y * Math.sin(tilt) + z * Math.cos(tilt);
      const tx = x * Math.cos(yaw) + tz * Math.sin(yaw);
      const depth = -x * Math.sin(yaw) + tz * Math.cos(yaw);
      points.push([
        cols * cellWidth / 2 + (tx * Math.cos(spin) - ty * Math.sin(spin)) * scale,
        rows * cellHeight / 2 + (tx * Math.sin(spin) + ty * Math.cos(spin)) * scale,
        depth * scale,
      ]);
    }
    const nearest = new Float32Array(size).fill(Infinity);
    const depths = new Float32Array(size);
    const owners = new Int32Array(size).fill(-1);
    const hidden = new Uint8Array(size);
    const masks = new Uint8Array(cols * rows);
    function separated(a: number, b: number): boolean {
      const distance = Math.abs(a - b);
      return Math.min(distance, samples - distance) > samples * 0.04;
    }
    // Resolve tube coverage first, so the front strand stays solid at crossings.
    function raster(erase: boolean): void {
      const reach = erase ? halo : radius;
      for (let i = 0; i < samples; i++) {
        const point = points[i];
        if (!point) continue;
        const [px, py, z] = point;
        const left = Math.max(0, Math.floor((px - reach) / dx));
        const right = Math.min(width - 1, Math.ceil((px + reach) / dx));
        const top = Math.max(0, Math.floor((py - reach) / dy));
        const bottom = Math.min(height - 1, Math.ceil((py + reach) / dy));
        for (let y = top; y <= bottom; y++) {
          for (let x = left; x <= right; x++) {
            const distance = ((x + 0.5) * dx - px) ** 2 + ((y + 0.5) * dy - py) ** 2;
            if (distance > reach * reach) continue;
            const index = y * width + x;
            const owner = owners[index] ?? -1;
            const depth = depths[index] ?? 0;
            const apart = owner >= 0 && separated(i, owner);
            if (erase) {
              if (apart && z > depth + scale * 0.15) hidden[index] = 1;
            } else if (owner < 0 || (apart
              ? z > depth + scale * 0.15 || (Math.abs(z - depth) <= scale * 0.15 && distance < (nearest[index] ?? Infinity))
              : distance < (nearest[index] ?? Infinity))) {
              nearest[index] = distance;
              depths[index] = z;
              owners[index] = i;
            }
          }
        }
      }
    }
    raster(false);
    // A narrow clear margin lets each lower strand visibly pass beneath the upper one.
    raster(true);
    for (let i = 0; i < size; i++) {
      if ((owners[i] ?? -1) < 0 || hidden[i]) continue;
      const x = i % width;
      const y = Math.floor(i / width);
      const cell = Math.floor(y / 4) * cols + Math.floor(x / 2);
      masks[cell] = (masks[cell] ?? 0) | brailleDot(y % 4, x % 2);
    }
    grid.clear();
    for (let i = 0; i < masks.length; i++) {
      const bits = masks[i] ?? 0;
      if (bits) grid.set(i % cols, Math.floor(i / cols), braille(bits));
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 20, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.fontSize !== props.fontSize) grid.update({ fontSize: knotClamp(props.fontSize, 13, 11, 20) });
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
