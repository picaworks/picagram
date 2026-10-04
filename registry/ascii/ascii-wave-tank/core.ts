import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface WaveTankObstacle {
  /** Left edge as a fraction of the tank's interior width. */
  x: number;
  /** Top edge as a fraction of the tank's interior height. */
  y: number;
  /** Width as a fraction of the tank's interior width. */
  width: number;
  /** Height as a fraction of the tank's interior height. */
  height: number;
}

export interface WaveTankImpulse {
  /** Horizontal center as a fraction of the tank's interior width. */
  x: number;
  /** Vertical center as a fraction of the tank's interior height. */
  y: number;
  /** Signed initial water displacement, from -2 to 2. */
  amplitude: number;
  /** Radius as a fraction of the tank's interior width. */
  radius: number;
  /** First excitation time in milliseconds. */
  time: number;
  /** Repeat interval in milliseconds; zero emits only once. */
  repeat: number;
}

export interface AsciiWaveTankProps extends MotionProps {
  /** Solid rectangular barriers in normalized interior coordinates. */
  obstacles: WaveTankObstacle[];
  /** Gaussian disturbances; impulses inside a solid barrier are ignored. */
  impulses: WaveTankImpulse[];
  /** Velocity damping per second, from 0 to 4; lower values preserve reflections. */
  damping: number;
  /** Wave speed in tank widths per second, from 0.03 to 0.4. */
  speed: number;
  /** Printable ASCII glyphs ordered by their measured ink coverage. */
  chars: string;
  /** Accessible description of the wave field; empty hides it from assistive technology. */
  label: string;
  /** Glyph size in CSS pixels. */
  fontSize: number;
  /** Monospace font-family stack for the grid. */
  fontFamily: string;
  /** Cell height as a multiple of glyph size. */
  lineHeight: number;
  /** Frame rate ceiling, from 1 to 30. */
  fps: number;
}

export const defaults: AsciiWaveTankProps = {
  obstacles: [
    { x: 0.55, y: 0.32, width: 0.055, height: 0.34 },
    { x: 0.2, y: 0.73, width: 0.24, height: 0.045 },
  ],
  impulses: [
    { x: 0.17, y: 0.32, amplitude: 1.1, radius: 0.036, time: 0, repeat: 4800 },
    { x: 0.83, y: 0.65, amplitude: -0.85, radius: 0.03, time: 620, repeat: 6100 },
  ],
  damping: 0.48,
  speed: 0.26,
  chars: " .:-=+*#%@",
  label: "Shallow water waves reflecting from a bounded tank and solid barriers",
  fontSize: 12,
  fontFamily: GRID_FONT,
  lineHeight: 1.25,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

const TANK_HZ = 180;
const TANK_STILL = 1800;

function tankNumber(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

function tankGlyphs(chars: string): string {
  return [...chars].filter((char) => {
    const code = char.codePointAt(0) ?? 0;
    return code >= 32 && code <= 126;
  }).join("") || " .:-=+*#%@";
}

export const mount: Mount<AsciiWaveTankProps> = (host, initial = {}) => {
  let props: AsciiWaveTankProps = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  const restore = styleHost(host, {
    display: "grid",
    "place-items": "center",
    "background-color": cssVar("bg"),
  });
  const drawing = layer(host, "under");

  function accessibility(): void {
    const label = props.label.trim();
    attributes.set("role", label ? "img" : null);
    attributes.set("aria-label", label || null);
    attributes.set("aria-hidden", label ? null : "true");
  }

  function options(): GridOptions {
    return {
      fontFamily: props.fontFamily || GRID_FONT,
      fontSize: tankNumber(props.fontSize, 12, 6, 32),
      lineHeight: tankNumber(props.lineHeight, 1.25, 0.8, 2),
      columns: 0,
      renderer: "auto",
      color: "",
    };
  }

  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());
  let width = 0;
  let height = 0;
  let physicalHeight = 1;
  let current = new Float64Array(0);
  let previous = new Float64Array(0);
  let next = new Float64Array(0);
  let solid = new Uint8Array(0);
  let step = -1;
  let strengths: number[] = [];

  function reset(): void {
    width = Math.max(8, Math.min(96, grid.cols - 2));
    height = Math.max(8, Math.min(60, grid.rows - 2));
    physicalHeight = Math.max(0.1, (grid.rows - 2) / Math.max(1, (grid.cols - 2) * grid.aspect));
    current = new Float64Array(width * height);
    previous = new Float64Array(width * height);
    next = new Float64Array(width * height);
    solid = new Uint8Array(width * height);
    step = -1;
    const random = createRng(Number.isFinite(props.seed) ? props.seed : 1);
    strengths = props.impulses.map(() => 0.82 + random() * 0.36);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / (width - 1);
        const ny = y / (height - 1);
        solid[y * width + x] = props.obstacles.some((obstacle) => {
          const ox = tankNumber(obstacle.x, 0.5, 0, 1);
          const oy = tankNumber(obstacle.y, 0.5, 0, 1);
          return nx >= ox && nx <= ox + tankNumber(obstacle.width, 0, 0, 1)
            && ny >= oy && ny <= oy + tankNumber(obstacle.height, 0, 0, 1)
            && obstacle.width > 0 && obstacle.height > 0;
        }) ? 1 : 0;
      }
    }
  }

  function excite(atStep: number): void {
    props.impulses.forEach((impulse, index) => {
      const first = Math.round(tankNumber(impulse.time, 0, 0, 3600000) * TANK_HZ / 1000);
      const period = Math.round(tankNumber(impulse.repeat, 0, 0, 3600000) * TANK_HZ / 1000);
      if (atStep < first || (atStep !== first && (period === 0 || (atStep - first) % period !== 0))) return;
      const cx = tankNumber(impulse.x, 0.5, 0, 1);
      const cy = tankNumber(impulse.y, 0.5, 0, 1);
      if (solid[Math.round(cy * (height - 1)) * width + Math.round(cx * (width - 1))]) return;
      const radius = tankNumber(impulse.radius, 0.035, 0.008, 0.2);
      const strength = tankNumber(impulse.amplitude, 1, -2, 2) * (strengths[index] ?? 1);
      for (let y = 0; y < height; y++) {
        const dy = (y / (height - 1) - cy) * physicalHeight;
        for (let x = 0; x < width; x++) {
          const i = y * width + x;
          if (solid[i]) continue;
          const dx = x / (width - 1) - cx;
          const distance = (dx * dx + dy * dy) / (radius * radius);
          if (distance > 18) continue;
          const displacement = strength * Math.exp(-distance / 2);
          current[i] = (current[i] ?? 0) + displacement;
          previous[i] = (previous[i] ?? 0) + displacement;
        }
      }
    });
  }

  function evolve(): void {
    const dx = 1 / (width - 1);
    const dy = physicalHeight / (height - 1);
    const requestedSpeed = tankNumber(props.speed, 0.26, 0.03, 0.4);
    // Respect the two-dimensional CFL limit even in a very shallow host.
    const velocity = Math.min(requestedSpeed, 0.68 * TANK_HZ / Math.sqrt(1 / (dx * dx) + 1 / (dy * dy)));
    const horizontal = (velocity / TANK_HZ / dx) ** 2;
    const vertical = (velocity / TANK_HZ / dy) ** 2;
    const retention = Math.exp(-tankNumber(props.damping, 0.48, 0, 4) / TANK_HZ);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (solid[i]) { next[i] = 0; continue; }
        const u = current[i] ?? 0;
        // No-flux (Neumann) walls: a solid or out-of-bounds neighbor mirrors
        // this cell. These walls generate the reflected wavefronts.
        const left = x > 0 && !solid[i - 1] ? (current[i - 1] ?? u) : u;
        const right = x < width - 1 && !solid[i + 1] ? (current[i + 1] ?? u) : u;
        const top = y > 0 && !solid[i - width] ? (current[i - width] ?? u) : u;
        const bottom = y < height - 1 && !solid[i + width] ? (current[i + width] ?? u) : u;
        next[i] = u + (u - (previous[i] ?? 0)) * retention
          + (left + right - 2 * u) * horizontal + (top + bottom - 2 * u) * vertical;
      }
    }
    const spare = previous;
    previous = current;
    current = next;
    next = spare;
  }

  function frame(time: number): void {
    if (!alive) return;
    const target = Math.floor(Math.max(0, Number.isFinite(time) ? time : 0) * TANK_HZ / 1000);
    const expectedWidth = Math.max(8, Math.min(96, grid.cols - 2));
    const expectedHeight = Math.max(8, Math.min(60, grid.rows - 2));
    const expectedAspect = Math.max(0.1, (grid.rows - 2) / Math.max(1, (grid.cols - 2) * grid.aspect));
    if (width !== expectedWidth || height !== expectedHeight || physicalHeight !== expectedAspect || target < step) reset();
    // Fixed timesteps make a seek and an uninterrupted animation identical.
    while (step < target) {
      if (step >= 0) evolve();
      step++;
      excite(step);
    }
    let sum = 0;
    let wetCells = 0;
    for (let i = 0; i < current.length; i++) {
      if (!solid[i]) { sum += current[i] ?? 0; wetCells++; }
    }
    const equilibrium = wetCells ? sum / wetCells : 0;
    const ramp = measureRamp(tankGlyphs(props.chars), props.fontFamily || GRID_FONT, tankNumber(props.lineHeight, 1.25, 0.8, 2));
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const edgeX = x === 0 || x === grid.cols - 1;
        const edgeY = y === 0 || y === grid.rows - 1;
        if (edgeX || edgeY) {
          grid.set(x, y, edgeX && edgeY ? "+" : edgeX ? "|" : "-");
          continue;
        }
        const sx = Math.round((x - 1) / Math.max(1, grid.cols - 3) * (width - 1));
        const sy = Math.round((y - 1) / Math.max(1, grid.rows - 3) * (height - 1));
        const i = sy * width + sx;
        if (solid[i]) { grid.set(x, y, "#"); continue; }
        const displacement = Math.abs((current[i] ?? 0) - equilibrium);
        const coverage = Math.min(1, displacement * 5.2);
        grid.set(x, y, coverage < 0.045 ? " " : pick(ramp, coverage));
      }
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  accessibility();
  loop = createLoop({
    el: host,
    fps: tankNumber(props.fps, 24, 1, 30),
    paused: props.paused,
    time: props.time,
    still: TANK_STILL,
    frame,
  });

  return {
    update(partial) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...partial };
      if (before.label !== props.label) accessibility();
      if (before.fontSize !== props.fontSize || before.fontFamily !== props.fontFamily || before.lineHeight !== props.lineHeight) grid.update(options());
      if (!sameJson(before.obstacles, props.obstacles) || !sameJson(before.impulses, props.impulses)
        || before.speed !== props.speed || before.damping !== props.damping || before.seed !== props.seed) reset();
      palette.refresh();
      loop?.update({ paused: props.paused, time: props.time, fps: tankNumber(props.fps, 24, 1, 30) });
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
