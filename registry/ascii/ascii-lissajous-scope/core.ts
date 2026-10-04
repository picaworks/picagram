import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiLissajousScopeProps extends MotionProps {
  /** Whole-number X oscillator harmonic, from 1 to 9; the two harmonics define the ratio. */
  frequencyX: number;
  /** Whole-number Y oscillator harmonic, from 1 to 9; the two harmonics define the ratio. */
  frequencyY: number;
  /** X input phase offset in degrees; positive values lead the Y input. */
  phase: number;
  /** Length of the bright measured trail in seconds, from 0 to 12. */
  persistence: number;
  /** Accessible scope name; an empty label hides the scope from assistive technology. */
  label: string;
  /** Monospace glyph size in CSS pixels. */
  fontSize: number;
  /** Monospace font-family stack used for trace and measurements. */
  fontFamily: string;
  /** Cell height as a multiple of the glyph size. */
  lineHeight: number;
  /** Animation frame-rate ceiling, from 1 to 30. */
  fps: number;
}

export const defaults: AsciiLissajousScopeProps = {
  frequencyX: 3,
  frequencyY: 2,
  phase: 90,
  persistence: 4.5,
  label: "Lissajous signal scope",
  fontSize: 12,
  fontFamily: GRID_FONT,
  lineHeight: 1.35,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

const SCOPE_TAU = Math.PI * 2;
const SCOPE_PERIOD = 12;
const SCOPE_STILL = 2400;

function scopeClamp(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

function scopeHarmonic(value: number, fallback: number): number {
  return Math.round(scopeClamp(value, fallback, 1, 9));
}

function scopeGcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

function scopePhase(value: number): number {
  const phase = Number.isFinite(value) ? value : defaults.phase;
  return ((phase % 360) + 540) % 360 - 180;
}

export const mount: Mount<AsciiLissajousScopeProps> = (host, initial = {}) => {
  let props: AsciiLissajousScopeProps = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  let reference = new Float32Array(0);
  let trail = new Float32Array(0);
  let referenceKey = "";
  const attributes = hostAttributes(host);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "under");

  function accessible(): void {
    const label = props.label.trim();
    attributes.set("role", label ? "img" : null);
    attributes.set("aria-hidden", label ? null : "true");
    attributes.set("aria-label", label ? `${label}. X to Y ratio ${scopeHarmonic(props.frequencyX, 3)} to ${scopeHarmonic(props.frequencyY, 2)}, X phase ${scopePhase(props.phase)} degrees. A, B, C and D mark X input phases 0, 90, 180 and 270 degrees. Bright trail spans ${scopeClamp(props.persistence, 4.5, 0, 12)} seconds.` : null);
  }

  function options(): GridOptions {
    return {
      fontFamily: props.fontFamily || GRID_FONT,
      fontSize: scopeClamp(props.fontSize, 12, 6, 28),
      lineHeight: scopeClamp(props.lineHeight, 1.35, 1, 2),
      columns: 0,
      renderer: "canvas",
      color: "",
    };
  }

  const grid = createGrid(drawing.el, options(), () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows, aspect } = grid;
    const fx = scopeHarmonic(props.frequencyX, 3);
    const fy = scopeHarmonic(props.frequencyY, 2);
    const phaseDegrees = scopePhase(props.phase);
    const phase = phaseDegrees * Math.PI / 180;
    const persistence = scopeClamp(props.persistence, 4.5, 0, 12);
    const colors = palette.colors;
    const ramp = measureRamp(" .:-=+*#%@", props.fontFamily || GRID_FONT, scopeClamp(props.lineHeight, 1.35, 1, 2));
    const centerX = (cols - 1) / 2;
    const centerY = (rows - 1) / 2;
    // Equal physical scales make the phase geometry comparable in every host.
    const radiusY = Math.max(0.5, Math.min((rows - 8) / 2, (cols - 10) * Math.max(0.1, aspect) / 2));
    const radiusX = radiusY / Math.max(0.1, aspect);
    const left = Math.max(0, Math.round(centerX - radiusX));
    const right = Math.min(cols - 1, Math.round(centerX + radiusX));
    const top = Math.max(0, Math.round(centerY - radiusY));
    const bottom = Math.min(rows - 1, Math.round(centerY + radiusY));
    const middleX = Math.round(centerX);
    const middleY = Math.round(centerY);
    const size = cols * rows;
    const key = `${cols}:${rows}:${aspect}:${fx}:${fy}:${phaseDegrees}`;
    const point = (theta: number): [number, number] => [
      centerX + Math.sin(fx * theta + phase) * radiusX,
      centerY - Math.sin(fy * theta) * radiusY,
    ];
    // Sub-cell splats measure coverage, avoiding broken diagonal traces.
    function deposit(buffer: Float32Array, x: number, y: number, strength: number): void {
      const baseX = Math.floor(x);
      const baseY = Math.floor(y);
      for (let iy = baseY; iy <= baseY + 1; iy++) {
        for (let ix = baseX; ix <= baseX + 1; ix++) {
          if (ix < 0 || iy < 0 || ix >= cols || iy >= rows) continue;
          const weight = (1 - Math.abs(ix - x)) * (1 - Math.abs(iy - y));
          const index = iy * cols + ix;
          buffer[index] = Math.max(buffer[index] ?? 0, Math.sqrt(Math.max(0, weight)) * strength);
        }
      }
    }
    const cycle = SCOPE_TAU / scopeGcd(fx, fy);
    const samples = Math.min(18000, Math.max(480, Math.ceil((radiusX + radiusY) * Math.max(fx, fy) * cycle * 5)));
    if (referenceKey !== key) {
      referenceKey = key;
      reference = new Float32Array(size);
      trail = new Float32Array(size);
      for (let i = 0; i <= samples; i++) {
        const [x, y] = point(i / samples * cycle);
        deposit(reference, x, y, 1);
      }
    }
    trail.fill(0);
    const seconds = milliseconds / 1000;
    const theta = seconds / SCOPE_PERIOD * SCOPE_TAU;
    const tailAngle = persistence / SCOPE_PERIOD * SCOPE_TAU;
    if (tailAngle > 0) {
      const tailSamples = Math.max(2, Math.ceil(samples * tailAngle / cycle));
      for (let i = 0; i <= tailSamples; i++) {
        const age = i / tailSamples;
        const [x, y] = point(theta - age * tailAngle);
        deposit(trail, x, y, Math.pow(1 - age, 0.65));
      }
    }
    grid.clear();
    // A quiet graticule, with explicit normalized amplitude rulers.
    for (let x = left; x <= right; x++) {
      if ((x - middleX) % 4 === 0) {
        grid.set(x, top, ".", colors.muted);
        grid.set(x, bottom, ".", colors.muted);
        grid.set(x, middleY, "-", colors.muted);
      }
    }
    for (let y = top; y <= bottom; y++) {
      if ((y - middleY) % 2 === 0) {
        grid.set(left, y, ".", colors.muted);
        grid.set(right, y, ".", colors.muted);
        grid.set(middleX, y, ":", colors.muted);
      }
    }
    for (let i = 0; i < size; i++) {
      const base = reference[i] ?? 0;
      const recent = trail[i] ?? 0;
      if (base < 0.12 && recent < 0.12) continue;
      const tone = Math.max(base * 0.44, recent * 0.94);
      const glyph = pick(ramp, tone);
      if (glyph !== " ") grid.set(i % cols, Math.floor(i / cols), glyph, colors.fg);
    }
    grid.set(middleX, middleY, "+", colors.muted);
    if (cols >= 24 && rows >= 12) {
      grid.write(Math.max(0, left - 4), top, "+1", colors.fg);
      grid.write(Math.max(0, left - 4), middleY, " 0", colors.fg);
      grid.write(Math.max(0, left - 4), bottom, "-1", colors.fg);
      grid.write(Math.max(0, left - 1), bottom + 1, "-1", colors.fg);
      grid.write(middleX, bottom + 1, "0", colors.fg);
      grid.write(Math.min(cols - 2, right - 1), bottom + 1, "+1", colors.fg);
      // Landmarks are fixed to X phase, rather than arbitrary curve quarters.
      const occupied = new Set<string>();
      for (let k = 0; k < 4; k++) {
        const [px, py] = point((k * Math.PI / 2 - phase) / fx);
        const x = Math.round(px);
        const y = Math.round(py);
        const candidates = [[x + 1, y], [x - 1, y], [x, y - 1], [x, y + 1], [x + 2, y]];
        const location = candidates.find(([lx, ly]) => lx !== undefined && ly !== undefined && lx >= left && lx <= right && ly >= top && ly <= bottom && !occupied.has(`${lx}:${ly}`));
        if (location) {
          const [lx, ly] = location;
          if (lx !== undefined && ly !== undefined) {
            occupied.add(`${lx}:${ly}`);
            grid.set(lx, ly, "ABCD"[k] ?? "A", colors.fg);
          }
        }
      }
    }
    const [cursorX, cursorY] = point(theta);
    grid.set(Math.round(cursorX), Math.round(cursorY), "*", colors.accent);
    function centered(row: number, text: string): void {
      if (row < 0 || row >= rows) return;
      const clipped = text.slice(0, cols);
      grid.write(Math.max(0, Math.floor((cols - clipped.length) / 2)), row, clipped, colors.fg);
    }
    const phaseText = `${phaseDegrees >= 0 ? "+" : ""}${Math.round(phaseDegrees * 10) / 10}`;
    if (rows >= 12) {
      centered(Math.max(0, top - 3), cols >= 32 ? `X ${fx} : Y ${fy}   PHASE ${phaseText}deg` : `${fx}:${fy}  PH ${phaseText}deg`);
      centered(Math.min(rows - 2, bottom + 3), cols >= 34 ? "X PHASE  A:0  B:90  C:180  D:270" : "A:0 B:90 C:180 D:270");
      centered(Math.min(rows - 1, bottom + 4), `TAIL ${persistence.toFixed(1)}s  CYCLE ${(SCOPE_PERIOD / scopeGcd(fx, fy)).toFixed(1)}s`);
    } else {
      centered(0, `${fx}:${fy} PH ${phaseText}deg`);
    }
    grid.flush();
    attributes.set("data-pica-ready", "true");
  }

  accessible();
  loop = createLoop({
    el: host,
    fps: scopeClamp(props.fps, 24, 1, 30),
    paused: props.paused,
    time: props.time,
    still: SCOPE_STILL,
    frame,
  });

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.label !== props.label || before.frequencyX !== props.frequencyX || before.frequencyY !== props.frequencyY || before.phase !== props.phase || before.persistence !== props.persistence) accessible();
      if (before.fontSize !== props.fontSize || before.fontFamily !== props.fontFamily || before.lineHeight !== props.lineHeight) grid.update(options());
      palette.refresh();
      loop?.update({ paused: props.paused, time: props.time, fps: scopeClamp(props.fps, 24, 1, 30) });
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
