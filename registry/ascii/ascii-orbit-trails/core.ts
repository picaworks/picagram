import { labelHost } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { createGrid } from "../../../lib/glyph-grid";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar, watchPalette } from "../../../lib/palette";
import { measureRamp, pick } from "../../../lib/ramp";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiOrbitTrailsProps extends MotionProps {
  /** Number of independently moving markers, from 1 to 7. */
  orbits: number;
  /** Duration of each fading trail in seconds, from 0.5 to 9. */
  trail: number;
  /** Spread of the ellipse tilts in degrees, from 0 to 85. */
  inclination: number;
  /** Motion rate, from 0 to 2. */
  speed: number;
  /** Fixed monospace glyph size in CSS pixels, from 11 to 20. */
  fontSize: number;
}

export const defaults: AsciiOrbitTrailsProps = {
  orbits: 4,
  trail: 4.8,
  inclination: 55,
  speed: 0.65,
  fontSize: 13,
  paused: false,
  time: null,
  seed: 1,
};

function orbitClamp(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<AsciiOrbitTrailsProps> = (host, initial = {}) => {
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
    fontSize: orbitClamp(props.fontSize, 13, 11, 20),
    lineHeight: 1.2,
    columns: 0,
    renderer: "canvas",
    color: "",
  }, () => loop?.redraw());
  const palette = watchPalette(host, () => loop?.redraw());

  function frame(milliseconds: number): void {
    if (!alive) return;
    const { cols, rows } = grid;
    const count = Math.round(orbitClamp(props.orbits, 4, 1, 7));
    const duration = orbitClamp(props.trail, 4.8, 0.5, 9);
    const inclination = orbitClamp(props.inclination, 55, 0, 85) * Math.PI / 180;
    const speed = orbitClamp(props.speed, 0.65, 0, 2);
    const seconds = milliseconds / 1000 * speed;
    const random = createRng(Number.isFinite(props.seed) ? props.seed : 1);
    const ramp = measureRamp(" .:-=+*#", GRID_FONT, 1.2);
    const ink = new Float32Array(cols * rows);
    const markers: [number, number][] = [];
    const scaleX = Math.max(0.5, (cols - 5) * 0.46);
    const scaleY = Math.max(0.5, (rows - 4) * 0.46);
    const centerX = (cols - 1) / 2;
    const centerY = (rows - 1) / 2;
    function deposit(x: number, y: number, strength: number): void {
      const left = Math.floor(x);
      const top = Math.floor(y);
      for (let iy = top; iy <= top + 1; iy++) {
        for (let ix = left; ix <= left + 1; ix++) {
          if (ix < 0 || iy < 0 || ix >= cols || iy >= rows) continue;
          const weight = Math.sqrt(Math.max(0, (1 - Math.abs(ix - x)) * (1 - Math.abs(iy - y))));
          const index = iy * cols + ix;
          ink[index] = Math.max(ink[index] ?? 0, strength * weight);
        }
      }
    }
    for (let orbit = 0; orbit < count; orbit++) {
      const rank = count > 1 ? orbit / (count - 1) : 0.5;
      const phase = orbit * 2.39996323 + random() * 0.55;
      const angle = (rank * 2 - 1) * inclination;
      const radiusX = 0.62 + rank * 0.19;
      const radiusY = 0.3 + (orbit % 3) * 0.075;
      const offsetX = Math.cos(orbit * 2.39996323 + 0.6) * 0.14;
      const offsetY = Math.sin(orbit * 2.39996323 + 0.6) * 0.16;
      const rate = (0.19 + orbit * 0.035) * (orbit % 2 ? -1 : 1);
      const head = phase + seconds * rate;
      const arc = Math.min(Math.PI * 0.8, duration * Math.abs(rate) * Math.max(0.35, speed));
      function point(t: number): [number, number] {
        const x = Math.cos(t) * radiusX;
        const y = Math.sin(t) * radiusY;
        return [
          centerX + (offsetX + x * Math.cos(angle) - y * Math.sin(angle)) * scaleX,
          centerY + (offsetY + x * Math.sin(angle) + y * Math.cos(angle)) * scaleY,
        ];
      }
      const samples = Math.max(32, Math.ceil(arc * Math.max(scaleX, scaleY) * 4));
      for (let sample = samples; sample >= 0; sample--) {
        const age = sample / samples;
        const [x, y] = point(head - Math.sign(rate) * arc * age);
        deposit(x, y, 0.78 * Math.pow(1 - age, 0.85));
      }
      markers.push(point(head));
    }
    grid.clear();
    for (let index = 0; index < ink.length; index++) {
      const value = ink[index] ?? 0;
      if (value < 0.045) continue;
      const glyph = pick(ramp, value);
      if (glyph !== " ") grid.set(index % cols, Math.floor(index / cols), glyph, palette.colors.fg);
    }
    // A single accent identifies the lead marker without coloring the trails.
    for (let index = markers.length - 1; index >= 0; index--) {
      const marker = markers[index];
      if (!marker) continue;
      const [x, y] = marker;
      grid.set(Math.round(x), Math.round(y), "*ox+"[index % 4] ?? "*", index === 0 ? palette.colors.accent : palette.colors.fg);
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
      if (before.fontSize !== props.fontSize) grid.update({ fontSize: orbitClamp(props.fontSize, 13, 11, 20) });
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
