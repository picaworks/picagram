import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface OrbitingHalftoneProps extends MotionProps {
  /** Number of fixed screen cells across the shorter host edge, from 18 to 90. */
  dots: number;
  /** Maximum orbit radius relative to the shorter host edge, from 0 to 0.08. */
  orbit: number;
  /** Disc overlap, from 0 for an open arrangement to 1 for a tight stack. */
  overlap: number;
  /** Center drift rate, from 0 to 2. */
  speed: number;
  /** Printed tone strength, from 0.1 to 1. */
  intensity: number;
}

export const defaults: OrbitingHalftoneProps = {
  dots: 42,
  orbit: 0.035,
  overlap: 0.6,
  speed: 0.55,
  intensity: 0.75,
  paused: false,
  time: null,
  seed: 1,
};

const ORBITING_HALFTONE_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_dots;
  uniform float u_orbit;
  uniform float u_overlap;
  uniform float u_speed;
  uniform float u_intensity;

  void main() {
    float shortSide = min(u_css_size.x, u_css_size.y);
    float pitch = shortSide / u_dots;
    vec2 p = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    float screenAngle = 0.3926990817;
    float c = cos(screenAngle);
    float s = sin(screenAngle);
    mat2 turn = mat2(c, -s, s, c);
    vec2 screen = turn * p;
    vec2 screenCenter = (floor(screen / pitch) + 0.5) * pitch;
    vec2 receiver = transpose(turn) * screenCenter;
    float seedPhase = pica_random(vec2(3.0, 11.0)) * 6.28318530718;
    float separation = mix(0.23, 0.07, u_overlap) * shortSide;
    float unprinted = 1.0;
    float thirdPlate = 0.0;
    float firstPlate = 0.0;
    // The three circular printing plates move; the receiving screen does not.
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float anchor = fi * 2.09439510239 + 0.45;
      float phase = seedPhase + fi * 1.7 + u_time * u_speed * (0.12 + fi * 0.023);
      vec2 center = separation * vec2(cos(anchor), sin(anchor));
      center += shortSide * u_orbit * vec2(cos(phase) * (1.0 - fi * 0.12), sin(phase * (1.0 + fi * 0.08)) * 0.68);
      float radius = shortSide * (0.23 - fi * 0.008);
      float edge = length(receiver - center) - radius;
      float plate = 1.0 - smoothstep(-pitch * 0.65, pitch * 0.65, edge);
      float density = 0.32 + fi * 0.13;
      unprinted *= 1.0 - plate * density;
      if (i == 0) firstPlate = plate;
      if (i == 2) thirdPlate = plate;
    }
    float tone = clamp((1.0 - unprinted) * u_intensity, 0.0, 0.76);
    // Coverage changes the radius of each centered dot, preserving the lattice.
    float dotRadius = pitch * sqrt(tone / 3.14159265359);
    float distanceToDot = length(screen - screenCenter);
    float aa = max(length(fwidth(screen)) * 0.55, 0.45);
    float printed = 1.0 - smoothstep(max(0.0, dotRadius - aa), dotRadius + aa, distanceToDot);
    printed *= step(0.0001, tone);
    vec4 ink = mix(u_fg, u_muted, firstPlate * (1.0 - thirdPlate) * 0.55);
    ink = mix(ink, u_accent, thirdPlate * 0.28);
    pica_color = pica_tone(printed, ink, 8.0);
  }
`;

const ORBITING_HALFTONE_FALLBACK = [
  `radial-gradient(circle var(--oh-r3) at var(--oh-x3) var(--oh-y3),color-mix(in srgb,${cssVar("accent")} var(--oh-third),transparent) 0 98%,transparent 100%)`,
  `radial-gradient(circle var(--oh-r2) at var(--oh-x2) var(--oh-y2),color-mix(in srgb,${cssVar("fg")} var(--oh-second),transparent) 0 98%,transparent 100%)`,
  `radial-gradient(circle var(--oh-r1) at var(--oh-x1) var(--oh-y1),color-mix(in srgb,${cssVar("muted")} var(--oh-first),transparent) 0 98%,transparent 100%)`,
  cssVar("bg"),
].join(",");

function halftoneBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<OrbitingHalftoneProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  let shader: Shader | null = null;
  const attributes = hostAttributes(host);
  attributes.set("role", null);
  attributes.set("aria-label", null);
  attributes.set("aria-hidden", "true");
  const drawing = layer(host, "under");

  function uniforms(): Record<string, number | readonly number[]> {
    return {
      u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
      u_dots: halftoneBound(props.dots, 42, 18, 90),
      u_orbit: halftoneBound(props.orbit, 0.035, 0, 0.08),
      u_overlap: halftoneBound(props.overlap, 0.6, 0, 1),
      u_speed: halftoneBound(props.speed, 0.55, 0, 2),
      u_intensity: halftoneBound(props.intensity, 0.75, 0.1, 1),
      u_seed: Math.floor(halftoneBound(props.seed, 1, 0, 999999)),
    };
  }

  function fallback(): void {
    const shortSide = Math.max(1, Math.min(host.clientWidth, host.clientHeight));
    const separation = (0.23 - halftoneBound(props.overlap, 0.6, 0, 1) * 0.16) * shortSide;
    const intensity = halftoneBound(props.intensity, 0.75, 0.1, 1);
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3 + 0.45;
      drawing.el.style.setProperty(`--oh-x${i + 1}`, `${host.clientWidth / 2 + Math.cos(angle) * separation}px`);
      drawing.el.style.setProperty(`--oh-y${i + 1}`, `${host.clientHeight / 2 - Math.sin(angle) * separation}px`);
      drawing.el.style.setProperty(`--oh-r${i + 1}`, `${shortSide * (0.23 - i * 0.008)}px`);
    }
    drawing.el.style.setProperty("--oh-first", `${intensity * 32}%`);
    drawing.el.style.setProperty("--oh-second", `${intensity * 45}%`);
    drawing.el.style.setProperty("--oh-third", `${intensity * 48}%`);
  }

  fallback();
  shader = createShader(drawing.el, {
    fragment: ORBITING_HALFTONE_FRAGMENT,
    fallback: ORBITING_HALFTONE_FALLBACK,
    uniforms: uniforms(),
    maxDpr: 1,
    onInvalidate: () => {
      if (!alive) return;
      fallback();
      shader?.set("u_css_size", [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)]);
      loop?.redraw();
    },
  });
  function frame(milliseconds: number): void {
    if (!alive) return;
    shader?.draw(milliseconds);
    attributes.set("data-pica-ready", "true");
  }
  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 4800, frame });
  return {
    update(next) {
      if (!alive) return;
      props = { ...props, ...next };
      fallback();
      for (const [name, value] of Object.entries(uniforms())) shader?.set(name, value);
      loop?.update({ paused: props.paused, time: props.time });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      shader?.destroy();
      drawing.remove();
      attributes.restore();
    },
  };
};
