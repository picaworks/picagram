import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface HammeredFoilProps extends MotionProps {
  /** Typical hammer depression spacing in CSS pixels, from 36 to 140. */
  dentSize: number;
  /** Depression depth relative to its spacing, from 0.1 to 0.65. */
  depth: number;
  /** Broadness and irregularity of the metallic reflection, from 0.2 to 1. */
  roughness: number;
  /** Rate of the broad directional light sweep, from 0 to 2. */
  speed: number;
  /** Overall foreground ink coverage, from 0.2 to 1. */
  intensity: number;
}

export const defaults: HammeredFoilProps = {
  dentSize: 76,
  depth: 0.3,
  roughness: 0.65,
  speed: 0.65,
  intensity: 0.6,
  paused: false,
  time: null,
  seed: 1,
};

const FOIL_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_dent_size;
  uniform float u_depth;
  uniform float u_roughness;
  uniform float u_speed;
  uniform float u_intensity;

  // Each compact bowl contributes its height and the exact same height's slope.
  vec3 foilSurface(vec2 p) {
    vec2 cell = floor(p);
    float height = 0.0;
    vec2 slope = vec2(0.0);
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 id = cell + vec2(float(x), float(y));
        float a = pica_random(id + vec2(17.0, 43.0));
        float b = pica_random(id + vec2(71.0, 11.0));
        float c = pica_random(id + vec2(29.0, 83.0));
        vec2 center = id + 0.5 + (vec2(a, b) - 0.5) * 0.48;
        float radius = 0.66 + c * 0.16;
        float angle = a * 6.2831853;
        mat2 turn = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        vec2 axis = vec2(1.0 + (b - 0.5) * 0.3, 1.0 - (b - 0.5) * 0.3);
        vec2 local = turn * (p - center);
        vec2 metric = axis * axis / (radius * radius);
        float squared = dot(local * local, metric);
        float bowl = max(0.0, 1.0 - squared);
        float dent = u_depth * (0.75 + c * 0.25);
        height -= dent * bowl * bowl * bowl;
        vec2 localSlope = 6.0 * dent * bowl * bowl * local * metric;
        slope += transpose(turn) * localSlope;
      }
    }
    return vec3(height, slope);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 p = uv * u_css_size / u_dent_size;
    vec3 surface = foilSurface(p);
    vec3 normal = normalize(vec3(-surface.yz, 1.0));
    float phase = pica_random(vec2(5.0, 19.0)) * 6.2831853;
    float motion = u_time * u_speed * 0.15;
    float azimuth = -1.1 + sin(motion + phase) * 0.7;
    vec3 light = normalize(vec3(cos(azimuth), sin(azimuth), 0.65));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float diffuse = max(0.0, dot(normal, light));
    float reflection = pow(max(0.0, dot(normal, halfway)), mix(42.0, 9.0, u_roughness));
    float sweep = sin(motion + phase * 0.3) * 0.55;
    float coordinate = (uv.x - 0.5) + (uv.y - 0.5) * 0.3;
    float bandDistance = (coordinate - sweep) / (0.24 + u_roughness * 0.22);
    float band = exp(-bandDistance * bandDistance);
    float cavity = clamp(-surface.x / max(0.01, u_depth), 0.0, 1.0);
    float tone = u_intensity * (0.045 + diffuse * 0.12 + reflection * band * 0.46 + cavity * 0.045);
    pica_color = pica_tone(clamp(tone, 0.0, 0.8), u_fg, 8.0);
  }
`;

const FOIL_FALLBACK = [
  `radial-gradient(ellipse at 42% 38%,transparent 25%,color-mix(in srgb,${cssVar("fg")} var(--hf-shade),transparent) 45%,transparent 65%) 0 0 / var(--hf-size) var(--hf-size)`,
  `radial-gradient(ellipse at 65% 56%,transparent 28%,color-mix(in srgb,${cssVar("fg")} 9%,transparent) 48%,transparent 67%) calc(var(--hf-size) * .46) calc(var(--hf-size) * .31) / calc(var(--hf-size) * 1.19) calc(var(--hf-size) * .93)`,
  `linear-gradient(120deg,transparent 18%,color-mix(in srgb,${cssVar("fg")} 12%,transparent) 48%,transparent 78%)`,
  cssVar("bg"),
].join(",");

function foilBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<HammeredFoilProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const drawing = layer(host, "under");
  function uniforms(): Record<string, number | readonly number[]> {
    return {
      u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
      u_dent_size: foilBound(props.dentSize, 76, 36, 140),
      u_depth: foilBound(props.depth, 0.3, 0.1, 0.65),
      u_roughness: foilBound(props.roughness, 0.65, 0.2, 1),
      u_speed: foilBound(props.speed, 0.65, 0, 2),
      u_intensity: foilBound(props.intensity, 0.6, 0.2, 1),
      u_seed: Math.floor(foilBound(props.seed, 1, 1, 99)),
    };
  }
  function fallback(): void {
    drawing.el.style.setProperty("--hf-size", `${foilBound(props.dentSize, 76, 36, 140)}px`);
    drawing.el.style.setProperty("--hf-shade", `${Math.round((12 + foilBound(props.depth, 0.3, 0.1, 0.65) * 30) * foilBound(props.intensity, 0.6, 0.2, 1))}%`);
  }
  fallback();
  const shader = createShader(drawing.el, {
    fragment: FOIL_FRAGMENT,
    fallback: FOIL_FALLBACK,
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
