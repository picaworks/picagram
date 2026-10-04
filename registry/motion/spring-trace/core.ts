import { GRID_FONT } from "../../../lib/font";
import { createGrid } from "../../../lib/glyph-grid";
import { hostAttributes, styleHost } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface SpringTraceProps extends MotionProps {
  /** Target equilibrium value; retargeting preserves the current position and velocity. */
  target: number;
  /** Spring stiffness for unit mass, from 0.1 to 100; larger values respond faster. */
  stiffness: number;
  /** Viscous damping for unit mass, from 0.1 to 40; larger values suppress overshoot. */
  damping: number;
  /** Vertical plotting bounds; reversed bounds are reordered, and equal bounds expand by one. */
  range: [number, number];
  /** Initial position with zero velocity; changing it restarts the response. */
  from: number;
  /** Accessible name; an empty name hides the trace from assistive technology. */
  label: string;
}

export const defaults: SpringTraceProps = {
  target: 60,
  stiffness: 18,
  damping: 4.2,
  range: [0, 100],
  from: 0,
  label: "Damped spring response toward a target",
  paused: false,
  time: null,
  seed: 1,
};

type SpringTraceState = { position: number; velocity: number };
type SpringTraceResponse = { sample: (seconds: number) => SpringTraceState; settle: number; target: number; start: number };

function springTraceFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function springTraceNumber(value: number): string {
  return String(Number(value.toPrecision(4)));
}

function springTraceRange(range: readonly number[]): [number, number] {
  const a = springTraceFinite(range[0] ?? 0, 0);
  const b = springTraceFinite(range[1] ?? 100, 100);
  return a === b ? [a, a + 1] : [Math.min(a, b), Math.max(a, b)];
}

/** Exact solutions of x'' + damping*x' + stiffness*(x-target) = 0 for unit mass. */
function springTraceResponse(from: number, velocity: number, target: number, stiffness: number, damping: number, start: number): SpringTraceResponse {
  const k = Math.min(100, Math.max(0.1, springTraceFinite(stiffness, defaults.stiffness)));
  const c = Math.min(40, Math.max(0.1, springTraceFinite(damping, defaults.damping)));
  const alpha = c / 2;
  const natural = Math.sqrt(k);
  const displacement = from - target;
  const discriminant = alpha * alpha - k;
  let solve: (seconds: number) => SpringTraceState;
  let bound: (seconds: number) => number;
  let safeStart = 1;
  if (Math.abs(discriminant) < 1e-8 * k) {
    const b = velocity + alpha * displacement;
    solve = (t) => {
      const decay = Math.exp(-alpha * t);
      const a = displacement + b * t;
      return { position: target + a * decay, velocity: (b - alpha * a) * decay };
    };
    bound = (t) => Math.max(Math.abs(displacement) + Math.abs(b) * t, (Math.abs(b - alpha * displacement) + alpha * Math.abs(b) * t) / natural) * Math.exp(-alpha * t);
    safeStart = Math.max(1, 2 / alpha);
  } else if (discriminant < 0) {
    const omega = Math.sqrt(-discriminant);
    const b = (velocity + alpha * displacement) / omega;
    const amplitude = Math.hypot(displacement, b);
    solve = (t) => {
      const cosine = Math.cos(omega * t), sine = Math.sin(omega * t);
      const decay = Math.exp(-alpha * t);
      const a = displacement * cosine + b * sine;
      return { position: target + decay * a, velocity: decay * (omega * (-displacement * sine + b * cosine) - alpha * a) };
    };
    bound = (t) => amplitude * Math.exp(-alpha * t);
  } else {
    const root = Math.sqrt(discriminant);
    const slow = -k / (alpha + root);
    const fast = -alpha - root;
    const a = (velocity - fast * displacement) / (slow - fast);
    const b = displacement - a;
    solve = (t) => {
      const first = a * Math.exp(slow * t), second = b * Math.exp(fast * t);
      return { position: target + first + second, velocity: slow * first + fast * second };
    };
    bound = (t) => {
      const first = Math.abs(a) * Math.exp(slow * t), second = Math.abs(b) * Math.exp(fast * t);
      return Math.max(first + second, (Math.abs(slow) * first + Math.abs(fast) * second) / natural);
    };
  }
  const tolerance = Math.max(1, Math.abs(target - from), Math.abs(velocity) / natural) * 0.001;
  let settle = 0;
  if (bound(0) > tolerance) {
    let high = safeStart;
    while (bound(high) > tolerance && high < 1000000) high *= 2;
    let low = 0;
    for (let i = 0; i < 40; i++) {
      const middle = (low + high) / 2;
      if (bound(middle) > tolerance) low = middle;
      else high = middle;
    }
    settle = high;
  }
  return {
    target, start, settle,
    sample(seconds) {
      const t = Math.max(0, seconds);
      return t >= settle ? { position: target, velocity: 0 } : solve(t);
    },
  };
}

export const mount: Mount<SpringTraceProps> = (host, initial = {}) => {
  let props: SpringTraceProps = { ...defaults, ...initial };
  let alive = true;
  let clock = 0;
  let autoStopped = false;
  let loop: Loop | null = null;
  let response = springTraceResponse(springTraceFinite(props.from, 0), 0, springTraceFinite(props.target, 60), props.stiffness, props.damping, 0);
  const attrs = hostAttributes(host);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const palette = watchPalette(host, () => loop?.redraw());
  const grid = createGrid(host, {
    fontFamily: GRID_FONT, fontSize: 12, columns: 0, lineHeight: 1.4, renderer: "canvas", color: "",
  }, () => loop?.redraw());

  function accessibility(): void {
    const label = props.label.trim();
    attrs.set("role", label ? "img" : null);
    attrs.set("aria-label", label || null);
    attrs.set("aria-hidden", label ? null : "true");
    attrs.set("aria-description", `Response from ${springTraceNumber(springTraceFinite(props.from, 0))} to ${springTraceNumber(response.target)}, stiffness ${springTraceNumber(props.stiffness)}, damping ${springTraceNumber(props.damping)}. The trace stops when settled.`);
  }

  function frame(time: number, reduced: boolean): void {
    if (!alive) return;
    clock = time;
    const elapsed = reduced ? response.settle : Math.max(0, time / 1000 - response.start);
    const current = response.sample(elapsed);
    const duration = Math.max(2, response.settle * 1.12);
    const [minimum, maximum] = springTraceRange(props.range);
    const colors = palette.colors;
    grid.clear();
    const left = 8, right = grid.cols - 3;
    const top = 4, bottom = grid.rows - 5;
    if (right <= left || bottom <= top) {
      grid.write(0, 0, `SPRING ${springTraceNumber(current.position)}`, colors.fg);
      grid.flush();
    } else {
      const rowFor = (position: number): number => Math.round(Math.max(top, Math.min(bottom, bottom - (position - minimum) / (maximum - minimum) * (bottom - top))));
      const colFor = (seconds: number): number => Math.round(left + Math.min(duration, Math.max(0, seconds)) / duration * (right - left));
      grid.write(1, 0, "SPRING RESPONSE", colors.muted);
      grid.write(1, 1, `x ${springTraceNumber(current.position)}  -> ${springTraceNumber(response.target)}`, colors.fg);
      grid.write(1, 2, `k ${springTraceNumber(props.stiffness)} / c ${springTraceNumber(props.damping)}`, colors.muted);
      grid.write(0, top, springTraceNumber(maximum).slice(0, 7), colors.muted);
      grid.write(0, bottom, springTraceNumber(minimum).slice(0, 7), colors.muted);
      for (let y = top; y <= bottom; y++) grid.set(left - 1, y, "│", colors.muted);
      for (let x = left; x <= right; x++) grid.set(x, bottom + 1, "─", colors.muted);
      if (response.target >= minimum && response.target <= maximum) {
        const y = rowFor(response.target);
        for (let x = left; x <= right; x++) if ((x - left) % 2 === 0) grid.set(x, y, "·", colors.muted);
      }
      let previousY = rowFor(response.sample(0).position);
      for (let x = left; x <= right; x++) {
        const seconds = (x - left) / (right - left) * duration;
        const state = response.sample(seconds);
        const y = rowFor(state.position);
        const foreground = seconds <= elapsed || reduced;
        const color = foreground ? colors.fg : colors.muted;
        const glyph = y === previousY ? "─" : y < previousY ? "╱" : "╲";
        const distance = Math.max(1, Math.abs(y - previousY));
        for (let step = 0; step <= distance; step++) grid.set(x, Math.round(previousY + (y - previousY) * step / distance), foreground ? glyph : "·", color);
        previousY = y;
      }
      const markerX = colFor(Math.min(elapsed, response.settle));
      const markerY = rowFor(current.position);
      grid.set(markerX, markerY, current.position > maximum ? "↑" : current.position < minimum ? "↓" : "●", colors.accent);
      grid.write(left, bottom + 2, "0s", colors.muted);
      const endLabel = `${springTraceNumber(duration)}s`;
      grid.write(Math.max(left, right - endLabel.length + 1), bottom + 2, endLabel, colors.muted);
      grid.write(1, grid.rows - 1, elapsed >= response.settle ? `SETTLED / ${springTraceNumber(response.settle)}s` : "TRACE / dotted = future", colors.fg);
      grid.flush();
    }
    attrs.set("data-pica-ready", "true");
    if (!reduced && props.time === null && elapsed >= response.settle && !autoStopped) {
      autoStopped = true;
      loop?.update({ paused: true });
    }
  }

  accessibility();
  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 0, frame });
  if (autoStopped) loop.update({ paused: true });

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const restart = before.from !== props.from;
      const retarget = before.target !== props.target || before.stiffness !== props.stiffness || before.damping !== props.damping;
      if (restart || retarget) {
        const state = response.sample(Math.max(0, clock / 1000 - response.start));
        response = springTraceResponse(restart ? springTraceFinite(props.from, 0) : state.position, restart ? 0 : state.velocity, springTraceFinite(props.target, 60), props.stiffness, props.damping, clock / 1000);
        autoStopped = false;
      }
      if (before.time !== props.time) autoStopped = false;
      if (before.label !== props.label || restart || retarget) accessibility();
      if (!sameJson(before.range, props.range)) grid.clear();
      palette.refresh();
      loop?.update({ paused: props.paused || autoStopped, time: props.time, fps: 24, still: 0 });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      palette.destroy();
      grid.destroy();
      restore();
      attrs.restore();
    },
  };
};
