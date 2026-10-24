import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface LenticularRidgesProps extends MotionProps {
  /** Number of ridges across the host's shorter edge, from 5 to 28. */
  ridges: number;
  /** Ridge curvature and optical displacement, from 0 to 1.5. */
  bend: number;
  /** Ridge lean from vertical in degrees, from -80 to 80. */
  angle: number;
  /** Rate of the grazing light cycle, from 0 to 2. */
  speed: number;
  /** Overall ink coverage, from 0.1 to 1. */
  intensity: number;
}

export const defaults: LenticularRidgesProps = {
  ridges: 14,
  bend: 0.85,
  angle: -18,
  speed: 0.55,
  intensity: 0.6,
  paused: false,
  time: null,
  seed: 1,
};

const LENTICULAR_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_ridges;
  uniform float u_bend;
  uniform float u_angle;
  uniform float u_speed;
  uniform float u_intensity;

  void main() {
    float shortSide = min(u_css_size.x, u_css_size.y);
    float pitch = shortSide / u_ridges;
    float angle = radians(u_angle);
    vec2 across = vec2(cos(angle), sin(angle));
    vec2 along = vec2(-sin(angle), cos(angle));
    vec2 position = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    vec2 p = vec2(dot(position, across), dot(position, along));
    float seedPhase = pica_random(vec2(3.0, 7.0));
    p.x += seedPhase * pitch;
    float theta = p.x / pitch * 6.28318530718;
    float height = pitch * 0.11 * u_bend * (0.5 + 0.5 * cos(theta));
    float slope = -0.11 * u_bend * 3.14159265359 * sin(theta);
    vec3 normal = normalize(vec3(-slope, 0.0, 1.0));
    float lightAngle = 0.55 + 0.42 * sin(u_time * u_speed * 0.13 + seedPhase * 6.28318530718);
    vec3 light = normalize(vec3(cos(lightAngle), sin(lightAngle), 0.35));
    float diffuse = max(0.0, dot(normal, light));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float specular = pow(max(0.0, dot(normal, halfway)), 18.0);
    // The sinusoidal ridge's own normal displaces the line field beneath it.
    vec2 refracted = p + normal.xy * pitch * u_bend * vec2(1.7, 0.55);
    refracted.y += height * 0.5;
    float coordinate = (refracted.y + refracted.x * 0.55) / (pitch * 1.4) + seedPhase;
    float distanceToLine = abs(fract(coordinate + 0.5) - 0.5);
    float aa = max(fwidth(coordinate), 0.004);
    float lines = 1.0 - smoothstep(0.021 - aa, 0.021 + aa, distanceToLine);
    float grazingBand = exp(-pow((p.y / shortSide - 0.07) / 0.3, 2.0));
    float glint = specular * grazingBand;
    float coverage = u_intensity * (0.065 + diffuse * 0.17 + lines * 0.26 + glint * 0.13);
    pica_color = pica_tone(coverage * 0.7, u_fg, 6.0);
  }
`;

const LENTICULAR_FALLBACK = [
  `linear-gradient(12deg,transparent 30%,color-mix(in srgb,${cssVar("fg")} var(--lr-glint),transparent) 49%,transparent 67%)`,
  `repeating-linear-gradient(var(--lr-angle),color-mix(in srgb,${cssVar("fg")} var(--lr-low),transparent) 0,color-mix(in srgb,${cssVar("fg")} var(--lr-face),transparent) var(--lr-quarter),transparent var(--lr-half) var(--lr-pitch))`,
  `repeating-linear-gradient(calc(var(--lr-angle) + 62deg),transparent 0 var(--lr-line-gap),color-mix(in srgb,${cssVar("fg")} var(--lr-face),transparent) var(--lr-line-gap) var(--lr-line-pitch))`,
  cssVar("bg"),
].join(",");

function lenticularBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<LenticularRidgesProps> = (host, initial = {}) => {
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
      u_ridges: lenticularBound(props.ridges, 14, 5, 28),
      u_bend: lenticularBound(props.bend, 0.85, 0, 1.5),
      u_angle: lenticularBound(props.angle, -18, -80, 80),
      u_speed: lenticularBound(props.speed, 0.55, 0, 2),
      u_intensity: lenticularBound(props.intensity, 0.6, 0.1, 1),
      u_seed: Math.floor(lenticularBound(props.seed, 1, 0, 999999)),
    };
  }

  function fallback(): void {
    const pitch = Math.max(1, Math.min(host.clientWidth, host.clientHeight)) / lenticularBound(props.ridges, 14, 5, 28);
    const intensity = lenticularBound(props.intensity, 0.6, 0.1, 1);
    const bend = lenticularBound(props.bend, 0.85, 0, 1.5);
    const values: Record<string, string> = {
      "--lr-angle": `${90 - lenticularBound(props.angle, -18, -80, 80)}deg`,
      "--lr-pitch": `${pitch}px`,
      "--lr-quarter": `${pitch * 0.25}px`,
      "--lr-half": `${pitch * 0.5}px`,
      "--lr-line-gap": `${Math.max(0.1, pitch * 1.4 - 2)}px`,
      "--lr-line-pitch": `${pitch * 1.4}px`,
      "--lr-low": `${intensity * 10}%`,
      "--lr-face": `${intensity * (20 + bend * 14)}%`,
      "--lr-glint": `${intensity * bend * 12}%`,
    };
    for (const [name, value] of Object.entries(values)) drawing.el.style.setProperty(name, value);
  }

  fallback();
  shader = createShader(drawing.el, {
    fragment: LENTICULAR_FRAGMENT,
    fallback: LENTICULAR_FALLBACK,
    uniforms: uniforms(),
    maxDpr: 0.75,
    css: "image-rendering:pixelated",
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
