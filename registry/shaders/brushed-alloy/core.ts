import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface BrushedAlloyProps extends MotionProps {
  /** Strength of the fine, continuous directional grooves, from 0 to 1. */
  grain: number;
  /** Brushing direction in degrees, from -180 to 180. Zero runs horizontally. */
  direction: number;
  /** Surface roughness, from 0.05 to 0.95; higher values broaden the light bands. */
  roughness: number;
  /** Slow reflection movement multiplier, from 0 to 2. */
  speed: number;
  /** Overall material ink coverage multiplier, from 0.2 to 1.3. */
  intensity: number;
}

export const defaults: BrushedAlloyProps = {
  grain: 0.65,
  direction: -12,
  roughness: 0.42,
  speed: 0.45,
  intensity: 1,
  paused: false,
  time: null,
  seed: 1,
};

const ALLOY_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_grain;
  uniform float u_direction;
  uniform float u_roughness;
  uniform float u_speed;
  uniform float u_intensity;

  float alloyHeight(vec2 p, float extent, float phase) {
    float crown = 0.28 * p.x * p.x / extent;
    float groove = sin(p.y * 0.87 + phase);
    groove += 0.43 * sin(p.y * 1.61 + 0.19 * sin(p.x * 0.012 + phase));
    groove += 0.21 * sin(p.y * 2.53 + 0.13 * cos(p.x * 0.031 - phase));
    return crown + u_grain * 0.10 * groove;
  }

  void main() {
    float angle = radians(u_direction);
    vec2 tangent = vec2(cos(angle), sin(angle));
    vec2 across = vec2(-tangent.y, tangent.x);
    vec2 pixel = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    vec2 p = vec2(dot(pixel, tangent), dot(pixel, across));
    float extent = max(1.0, dot(abs(tangent), u_css_size));
    float phase = pica_random(vec2(7.0, 13.0)) * 6.283185;
    float dx = (alloyHeight(p + vec2(0.4, 0.0), extent, phase) - alloyHeight(p - vec2(0.4, 0.0), extent, phase)) / 0.8;
    float dy = (alloyHeight(p + vec2(0.0, 0.4), extent, phase) - alloyHeight(p - vec2(0.0, 0.4), extent, phase)) / 0.8;
    vec3 normal = normalize(vec3(-dx, -dy, 1.0));
    vec3 reflection = reflect(vec3(0.0, 0.0, -1.0), normal);
    float travel = sin(u_time * 0.18 * u_speed + phase) * 0.065;
    float width = 0.07 + u_roughness * 0.17;
    float first = exp(-pow((reflection.x + 0.23 - travel) / width, 2.0));
    float second = exp(-pow((reflection.x - 0.25 - travel * 0.7) / (width * 1.15), 2.0));
    float grainResponse = 1.0 / (1.0 + reflection.y * reflection.y * (18.0 - u_roughness * 12.0));
    float light = (first * 0.56 + second * 0.38) * grainResponse;
    float tone = (0.15 + light + 0.055 * normal.z) * u_intensity;
    pica_color = pica_tone(tone * 0.82, u_fg, 8.0);
  }
`;

const ALLOY_FALLBACK = [
  `repeating-linear-gradient(var(--ba-grain-angle),color-mix(in srgb,${cssVar("fg")} var(--ba-grain-ink),transparent) 0 1px,transparent 1px var(--ba-gap))`,
  `linear-gradient(var(--ba-light-angle),color-mix(in srgb,${cssVar("fg")} var(--ba-base),transparent) 0%,color-mix(in srgb,${cssVar("fg")} var(--ba-light),transparent) 25%,color-mix(in srgb,${cssVar("fg")} var(--ba-base),transparent) 48%,color-mix(in srgb,${cssVar("fg")} var(--ba-light),transparent) 75%,color-mix(in srgb,${cssVar("fg")} var(--ba-base),transparent) 100%)`,
  cssVar("bg"),
].join(",");

function alloyBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<BrushedAlloyProps> = (host, initial = {}) => {
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
      u_seed: Math.floor(alloyBound(props.seed, 1, 0, 999999)),
      u_grain: alloyBound(props.grain, 0.65, 0, 1),
      u_direction: alloyBound(props.direction, -12, -180, 180),
      u_roughness: alloyBound(props.roughness, 0.42, 0.05, 0.95),
      u_speed: alloyBound(props.speed, 0.45, 0, 2),
      u_intensity: alloyBound(props.intensity, 1, 0.2, 1.3),
    };
  }

  function fallback(): void {
    const direction = alloyBound(props.direction, -12, -180, 180);
    const grain = alloyBound(props.grain, 0.65, 0, 1);
    const intensity = alloyBound(props.intensity, 1, 0.2, 1.3);
    drawing.el.style.setProperty("--ba-grain-angle", `${-direction}deg`);
    drawing.el.style.setProperty("--ba-light-angle", `${90 - direction}deg`);
    drawing.el.style.setProperty("--ba-gap", `${3.2 + alloyBound(props.roughness, 0.42, 0.05, 0.95) * 2}px`);
    drawing.el.style.setProperty("--ba-grain-ink", `${grain * 17}%`);
    drawing.el.style.setProperty("--ba-light", `${Math.min(95, intensity * 76)}%`);
    drawing.el.style.setProperty("--ba-base", `${intensity * 24}%`);
  }

  fallback();
  shader = createShader(drawing.el, {
    fragment: ALLOY_FRAGMENT,
    fallback: ALLOY_FALLBACK,
    uniforms: uniforms(),
    maxDpr: 1,
    onInvalidate: () => {
      if (!alive) return;
      shader?.set("u_css_size", [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)]);
      loop?.redraw();
    },
  });
  loop = createLoop({
    el: host,
    fps: 24,
    paused: props.paused,
    time: props.time,
    still: 2400,
    frame(time) {
      if (!alive) return;
      shader?.draw(time);
      attributes.set("data-pica-ready", "true");
    },
  });
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
