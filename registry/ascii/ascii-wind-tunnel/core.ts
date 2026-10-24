import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiWindTunnelProps extends MotionProps {
  /** Fine uses braille subcell dots for smooth paths; ASCII uses directional line characters. */
  detail: "fine" | "ascii";
  /** Moving marker glyphs, sorted by measured ink in the active monospace font. */
  chars: string;
  /** Streamlines per shortest side, from 6 to 24. */
  streams: number;
  /** Occupied share of each traveling trace, from sparse dashes to continuous paths. */
  density: number;
  /** Flow travel rate; zero holds a fixed field. */
  speed: number;
  /** Place a fixed circular obstacle upstream of the wake. */
  obstacle: boolean;
  /** Obstacle radius as a fraction of the shortest side. */
  radius: number;
  /** Strength of the alternating wake curls, from 0 to 1. */
  wake: number;
  /** Leave the central reading rectangle completely unpainted. */
  readingZone: boolean;
  /** Accessible name for the stylized flow and its optional content. */
  label: string;
  /** Glyph size in CSS pixels; it stays fixed when the host narrows. */
  fontSize: number;
  /** Monospace font-family stack used for the glyph grid. */
  fontFamily: string;
  /** Cell height as a multiple of the glyph size. */
  lineHeight: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: AsciiWindTunnelProps = {
  detail: "fine",
  chars: "+.=:",
  streams: 10,
  density: 0.72,
  speed: 0.18,
  obstacle: true,
  radius: 0.13,
  wake: 0.5,
  readingZone: false,
  label: "ASCII wind tunnel, a stylized flow field",
  fontSize: 14,
  fontFamily: GRID_FONT,
  lineHeight: 1.3,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

const WIND_TAU = Math.PI * 2;

function windNumber(value: number, fallback: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

export const mount: Mount<AsciiWindTunnelProps> = (host, initial = {}) => {
  let props: AsciiWindTunnelProps = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  let phase = createRng(props.seed)();
  let dots = new Uint8Array(1);
  const attributes = hostAttributes(host);
  const restore = styleHost(host, { display: "grid", "place-items": "center", "background-color": cssVar("bg") });
  const drawing = layer(host, "under");

  function accessibility(): void {
    attributes.set("role", "group");
    attributes.set("aria-label", props.label.trim() || null);
  }

  function options(): GridOptions {
    return {
      fontFamily: props.fontFamily || GRID_FONT,
      fontSize: windNumber(props.fontSize, 14, 10, 24),
      columns: 0,
      lineHeight: windNumber(props.lineHeight, 1.3, 1, 1.8),
      renderer: "auto",
      color: "",
    };
  }

  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());

  function frame(time: number): void {
    if (!alive) return;
    const { cols, rows, cellWidth, cellHeight } = grid;
    const shortest = Math.max(1, Math.min(cols * cellWidth, rows * cellHeight));
    const width = cols * cellWidth / shortest;
    const height = rows * cellHeight / shortest;
    const radius = windNumber(props.radius, 0.13, 0.05, 0.2);
    const radius2 = radius * radius;
    const streams = windNumber(props.streams, 10, 6, 24);
    const density = windNumber(props.density, 0.72, 0.1, 1);
    const travel = time / 1000 * windNumber(props.speed, 0.18, 0, 1);
    const strength = windNumber(props.wake, 0.5, 0, 1);
    const centerX = width * 0.28;
    const chars = [...props.chars].filter((c) => { const n = c.codePointAt(0) ?? 0; return n >= 33 && n <= 126; }).join("") || defaults.chars;
    const ramp = measureRamp(chars, props.fontFamily || GRID_FONT, windNumber(props.lineHeight, 1.3, 1, 1.8));
    // An analytic stream function makes seeking independent of frame rate. The wake is a visual study,
    // not a fluid solver: alternating smooth eddies drift downstream and fade before they wrap upstream.
    const eddies = Array.from({ length: 4 }, (_, i) => {
      const age = ((travel * 0.13 + i / 4 + phase) % 1 + 1) % 1;
      const side = i % 2 === 0 ? -1 : 1;
      return {
        x: radius * 1.65 + age * (width - centerX + radius),
        y: side * radius * 0.78,
        ink: side * radius * 2.1 * strength * Math.sin(age * Math.PI) ** 2,
      };
    });
    const cell = cellWidth / shortest;
    const step = cell * (props.detail === "fine" ? 0.22 : 0.52);
    const fine = props.detail === "fine";
    if (dots.length !== cols * rows) dots = new Uint8Array(cols * rows);
    else dots.fill(0);
    const markers = new Map<number, string>();
    grid.clear();

    function dot(px: number, py: number): void {
      const x = Math.round((px + centerX) * shortest / cellWidth * 2);
      const y = Math.round((py + height * 0.5) * shortest / cellHeight * 4);
      if (x < 0 || y < 0 || x >= cols * 2 || y >= rows * 4) return;
      const index = (y >> 2) * cols + (x >> 1);
      dots[index] = (dots[index] ?? 0) | brailleDot(y & 3, x & 1);
    }

    function velocity(px: number, py: number): readonly [number, number] {
      const r2 = Math.max(radius2, px * px + py * py);
      let u = props.obstacle ? 1 - radius2 / r2 + 2 * radius2 * py * py / (r2 * r2) : 1;
      let v = props.obstacle ? -2 * radius2 * px * py / (r2 * r2) : 0;
      if (props.obstacle && px > radius) {
        const fade = Math.min(1, (px - radius) / radius);
        for (const eddy of eddies) {
          const dx = px - eddy.x;
          const dy = py - eddy.y;
          const spread = radius2 * 2.7;
          const ink = eddy.ink * Math.exp(-(dx * dx + dy * dy) / spread);
          u += fade * ink * -2 * dy / spread;
          v -= fade * ink * -2 * dx / spread + (px < 2 * radius ? ink / radius : 0);
        }
      }
      return [u, v];
    }

    function direction(u: number, v: number): string {
      const slope = v * cellWidth / cellHeight;
      if (Math.abs(slope) < Math.abs(u) * 0.12) return "-";
      if (Math.abs(u) < Math.abs(slope) * 0.12) return "|";
      return u * slope > 0 ? "\\" : "/";
    }

    function trace(startX: number, startY: number, steps: number): void {
      let px = startX;
      let py = startY;
      for (let i = 0; i < steps; i++) {
        if (px < -centerX - cell || px > width - centerX || Math.abs(py) > height * 0.5) break;
        const x = Math.floor((px + centerX) * shortest / cellWidth);
        const y = Math.floor((py + height * 0.5) * shortest / cellHeight);
        const nx = (x + 0.5) / cols;
        const ny = (y + 0.5) / rows;
        const inReading = props.readingZone && nx > 0.18 && nx < 0.82 && ny > 0.28 && ny < 0.72;
        const outside = !props.obstacle || px * px + py * py > radius2;
        const [u, v] = velocity(px, py);
        if (!inReading && outside && nx > 0.025 && nx < 0.975 && ny > 0.035 && ny < 0.965) {
          const pulse = 0.5 + 0.5 * Math.cos((px * 2.8 - travel + startY * 1.8 + phase) * WIND_TAU);
          if (pulse < density + 0.3) {
            // Direction chooses a line shape; the moving markers choose their ink by measurement.
            if (fine) {
              dot(px, py);
              if (pulse > 0.98) markers.set(y * cols + x, pick(ramp, (pulse - 0.98) / 0.02));
            } else {
              const glyph = pulse > 0.84 ? pick(ramp, (pulse - 0.84) / 0.16) : direction(u, v);
              grid.set(x, y, glyph);
            }
          }
        }
        const magnitude = Math.max(0.2, Math.hypot(u, v));
        const [midU, midV] = velocity(px + step * u / magnitude * 0.5, py + step * v / magnitude * 0.5);
        const midMagnitude = Math.max(0.2, Math.hypot(midU, midV));
        px += step * midU / midMagnitude;
        py += step * midV / midMagnitude;
      }
    }

    const count = Math.max(3, Math.round(streams * height));
    for (let i = 0; i < count; i++) trace(-centerX + cell * 0.5, (i + 0.5) / count * height - height * 0.5, cols * (fine ? 14 : 6));
    if (props.obstacle && strength > 0.1) {
      for (const eddy of eddies) trace(eddy.x, eddy.y + radius * 0.45, Math.min(fine ? 480 : 200, cols * (fine ? 7 : 3)));
    }
    if (props.obstacle) {
      const samples = Math.ceil(WIND_TAU * radius / step);
      for (let i = 0; i < samples; i++) {
        const angle = i / samples * WIND_TAU;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        const x = Math.floor((px + centerX) * shortest / cellWidth);
        const y = Math.floor((py + height * 0.5) * shortest / cellHeight);
        const inReading = props.readingZone && (x + 0.5) / cols > 0.18 && (x + 0.5) / cols < 0.82 && (y + 0.5) / rows > 0.28 && (y + 0.5) / rows < 0.72;
        if (!inReading) {
          if (fine) dot(px, py);
          else grid.set(x, y, direction(-py, px));
        }
      }
    }
    if (fine) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          grid.set(x, y, markers.get(i) ?? braille(dots[i] ?? 0));
        }
      }
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  accessibility();
  loop = createLoop({ el: host, fps: windNumber(props.fps, 24, 1, 30), paused: props.paused, time: props.time, still: 2400, frame });

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (props.seed !== before.seed) phase = createRng(props.seed)();
      if (props.label !== before.label) accessibility();
      if (props.fontSize !== before.fontSize || props.fontFamily !== before.fontFamily || props.lineHeight !== before.lineHeight) grid.update(options());
      palette.refresh();
      loop?.update({ paused: props.paused, time: props.time, fps: windNumber(props.fps, 24, 1, 30) });
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
