import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface FrostedBlockProps extends MotionProps {
  /** Slab width relative to the shorter host side, from 0.45 to 0.8. */
  width: number;
  /** Bevel width relative to the shorter host side, from 0.015 to 0.09. */
  bevel: number;
  /** Geometric displacement of the line field through the slab, from 0 to 1.5. */
  refraction: number;
  /** Drift and directional light rate, from 0 to 2. */
  speed: number;
  /** Overall palette ink coverage, from 0.2 to 1. */
  intensity: number;
}

export const defaults: FrostedBlockProps = {
  width: 0.75,
  bevel: 0.04,
  refraction: 0.8,
  speed: 0.6,
  intensity: 0.65,
  paused: false,
  time: null,
  seed: 1,
};

const FROSTED_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_width;
  uniform float u_bevel;
  uniform float u_refraction;
  uniform float u_speed;
  uniform float u_intensity;

  // Distance and outward gradient describe one rounded rectangular slab.
  vec3 frostedBoundary(vec2 p, vec2 size) {
    vec2 q = abs(p) - size + 0.014;
    vec2 outside = max(q, 0.0);
    float distance = length(outside) + min(max(q.x, q.y), 0.0) - 0.014;
    vec2 direction = length(outside) > 0.00001
      ? normalize(outside) : (q.x > q.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
    return vec3(distance, direction * sign(p));
  }

  float frostedLines(vec2 p, float phase) {
    float coordinate = (p.x + p.y * 0.24) * 18.0 + phase;
    float distance = abs(fract(coordinate) - 0.5);
    float line = 1.0 - smoothstep(0.018, 0.018 + fwidth(coordinate), distance);
    float crossCoordinate = (p.y - p.x * 0.06) * 12.0;
    float crossDistance = abs(fract(crossCoordinate) - 0.5);
    return max(line, (1.0 - smoothstep(0.012, 0.012 + fwidth(crossCoordinate), crossDistance)) * 0.35);
  }

  void main() {
    float shortSide = max(1.0, min(u_css_size.x, u_css_size.y));
    float pixel = 1.5 / shortSide;
    vec2 world = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size / shortSide;
    float rotation = -0.14 + (pica_random(vec2(4.0, 2.0)) - 0.5) * 0.035;
    float c = cos(rotation);
    float s = sin(rotation);
    mat2 turn = mat2(c, -s, s, c);
    vec2 p = turn * (world - vec2(0.02, -0.025));
    vec2 size = vec2(u_width * 0.5, u_width * 0.34);
    vec3 boundary = frostedBoundary(p, size);
    float mask = 1.0 - smoothstep(-pixel, pixel, boundary.x);
    float bevel = min(u_bevel, size.y * 0.4);
    float t = clamp(-boundary.x / bevel, 0.0, 1.0);
    float height = t * t * (3.0 - 2.0 * t);
    float slope = 0.038 * 6.0 * t * (1.0 - t) / bevel;
    vec2 outward = transpose(turn) * boundary.yz;
    vec3 normal = normalize(vec3(outward * slope, 1.0));
    float phase = u_time * u_speed;
    vec3 light = normalize(vec3(-0.55 + 0.18 * cos(phase * 0.4), 0.65 + 0.12 * sin(phase * 0.4), 0.75));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float specular = pow(max(0.0, dot(normal, halfway)), 32.0);
    float edge = (1.0 - height) * max(0.0, dot(normal, light));
    float grain = pica_random(floor(p * shortSide * 0.6));
    vec2 refracted = world + u_refraction * (normal.xy * 0.065 + vec2(0.03, -0.022) * height);
    refracted += (grain - 0.5) * u_refraction * 0.002 * height;
    float plainLines = frostedLines(world, phase * 0.08);
    float bentLines = frostedLines(refracted, phase * 0.08);
    float plate = 0.055 + grain * 0.045 + bentLines * 0.24 + edge * 0.3 + specular * 0.15;
    float rearDistance = frostedBoundary(p + vec2(0.014, 0.018), size).x;
    float rear = (1.0 - smoothstep(-pixel, pixel, rearDistance)) * (1.0 - mask);
    float tone = mix(plainLines * 0.15 + rear * 0.12, plate, mask) * u_intensity;
    pica_color = pica_tone(tone, u_fg, 8.0);
  }
`;

const FROSTED_FALLBACK = [
  `linear-gradient(145deg,color-mix(in srgb,${cssVar("fg")} var(--fb-edge),transparent),color-mix(in srgb,${cssVar("fg")} 5%,transparent) var(--fb-bevel) 85%,color-mix(in srgb,${cssVar("fg")} 20%,transparent)) 53% 54% / var(--fb-width) var(--fb-height) no-repeat`,
  `repeating-linear-gradient(104deg,transparent 0 14px,color-mix(in srgb,${cssVar("fg")} 20%,transparent) 14px 15px,transparent 15px 31px) 53% 54% / var(--fb-width) var(--fb-height) no-repeat`,
  `repeating-linear-gradient(104deg,transparent 0 18px,color-mix(in srgb,${cssVar("fg")} 10%,transparent) 18px 19px,transparent 19px 34px)`,
  cssVar("bg"),
].join(",");

function frostedBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<FrostedBlockProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const drawing = layer(host, "over");
  const uniforms = (): Record<string, number | readonly number[]> => ({
    u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
    u_width: frostedBound(props.width, 0.75, 0.45, 0.8),
    u_bevel: frostedBound(props.bevel, 0.04, 0.015, 0.09),
    u_refraction: frostedBound(props.refraction, 0.8, 0, 1.5),
    u_speed: frostedBound(props.speed, 0.6, 0, 2),
    u_intensity: frostedBound(props.intensity, 0.65, 0.2, 1),
    u_seed: Math.floor(frostedBound(props.seed, 1, 1, 9999)),
  });
  function fallback(): void {
    const width = Math.min(host.clientWidth, host.clientHeight) * frostedBound(props.width, 0.75, 0.45, 0.8);
    drawing.el.style.setProperty("--fb-width", `${width}px`);
    drawing.el.style.setProperty("--fb-height", `${width * 0.68}px`);
    drawing.el.style.setProperty("--fb-bevel", `${frostedBound(props.bevel, 0.04, 0.015, 0.09) * 200}%`);
    drawing.el.style.setProperty("--fb-edge", `${Math.round(frostedBound(props.intensity, 0.65, 0.2, 1) * 45)}%`);
  }
  fallback();
  const shader = createShader(drawing.el, {
    fragment: FROSTED_FRAGMENT,
    fallback: FROSTED_FALLBACK,
    uniforms: uniforms(),
    maxDpr: 1,
    css: "image-rendering:pixelated",
    onInvalidate: () => {
      if (!alive) return;
      fallback();
      shader.set("u_css_size", [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)]);
      loop?.redraw();
    },
  });
  function frame(time: number): void {
    if (!alive) return;
    shader.draw(time);
    attributes.set("data-pica-ready", "true");
  }
  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      props = { ...props, ...next };
      fallback();
      for (const [name, value] of Object.entries(uniforms())) shader.set(name, value);
      loop?.update({ paused: props.paused, time: props.time });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      shader.destroy();
      drawing.remove();
      attributes.restore();
    },
  };
};
