import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface EndGrainProps extends MotionProps {
  /** Growth periods per shorter view dimension, from 16 to 48. */
  rings: number;
  /** Fixed angular distortion and spacing variation, from 0.2 to 1. */
  irregularity: number;
  /** Depth of the growth cuts and medullary rays, from 0.15 to 1.2. */
  relief: number;
  /** Rate of the calm grazing light, from 0 to 2. */
  speed: number;
  /** Overall palette ink coverage, from 0.2 to 1. */
  intensity: number;
}

export const defaults: EndGrainProps = {
  rings: 30,
  irregularity: 0.7,
  relief: 0.75,
  speed: 0.6,
  intensity: 0.65,
  paused: false,
  time: null,
  seed: 1,
};

const END_GRAIN_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_rings;
  uniform float u_irregularity;
  uniform float u_relief;
  uniform float u_speed;
  uniform float u_intensity;

  vec4 endGrainMaterial(vec2 p, float seedPhase) {
    vec2 stretch = vec2(1.07, 0.92);
    vec2 w = p * stretch;
    float r = max(0.0002, length(w));
    float theta = atan(w.y, w.x);
    float a = theta * 3.0 + seedPhase;
    float b = theta * 7.0 - seedPhase * 0.7;
    float c = theta * 11.0 + seedPhase * 0.3;
    float shape = 1.0 + u_irregularity * (0.12 * sin(a) + 0.045 * sin(b) + 0.025 * sin(c));
    float angular = u_irregularity * (0.36 * cos(a) + 0.315 * cos(b) + 0.275 * cos(c));
    vec2 radial = w / r * stretch;
    vec2 around = vec2(-w.y, w.x) / (r * r) * stretch;
    float coordinate = r * shape;
    vec2 gradient = shape * radial + r * angular * around;
    float first = coordinate * 31.0 + seedPhase;
    float second = coordinate * 63.0 - seedPhase;
    float growth = coordinate * u_rings + u_irregularity * (0.23 * sin(first) + 0.11 * sin(second));
    gradient *= u_rings + u_irregularity * (7.13 * cos(first) + 6.93 * cos(second));
    float phase = growth * 6.2831853;
    float base = 0.5 + 0.5 * cos(phase);
    float cut = pow(max(0.0, base), 12.0);
    float height = -u_relief / u_rings * 0.04 * cut;
    vec2 slope = u_relief / u_rings * 1.5079645 * sin(phase) * pow(max(0.0, base), 11.0) * gradient;
    float marking = cut;
    // Compact radial ray cuts share their exact height derivatives with the light.
    for (int i = 0; i < 6; i++) {
      float jitter = pica_random(vec2(float(i) + 11.0, 8.0));
      float angle = float(i) * 2.3999632 + seedPhase + (jitter - 0.5) * 0.45;
      vec2 direction = vec2(cos(angle), sin(angle));
      vec2 across = vec2(-direction.y, direction.x);
      float along = dot(p, direction);
      if (along <= 0.0) continue;
      float width = 0.0015 + along * 0.004;
      float distance = dot(p, across);
      float t = distance / width;
      if (abs(t) >= 1.0) continue;
      float gatePosition = clamp(along / 0.12, 0.0, 1.0);
      float gate = gatePosition * gatePosition * (3.0 - 2.0 * gatePosition);
      float gateDerivative = 6.0 * gatePosition * (1.0 - gatePosition) / 0.12;
      float bump = 1.0 - t * t;
      float profile = bump * bump * bump;
      vec2 dt = across / width - direction * distance * 0.004 / (width * width);
      height -= u_relief * 0.0023 * profile * gate;
      slope += u_relief * (0.0138 * t * bump * bump * dt * gate - 0.0023 * profile * gateDerivative * direction);
      marking += profile * gate * 0.6;
    }
    return vec4(height, slope, marking);
  }

  void main() {
    float shortSide = max(1.0, min(u_css_size.x, u_css_size.y));
    vec2 p = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size / shortSide;
    float seedPhase = pica_random(vec2(3.0, 9.0)) * 6.2831853;
    vec2 pith = vec2(-0.18, 0.1) + vec2(cos(seedPhase), sin(seedPhase)) * 0.025;
    vec4 material = endGrainMaterial(p - pith, seedPhase);
    vec3 normal = normalize(vec3(-material.yz, 1.0));
    float angle = -0.7 + seedPhase * 0.15 + u_time * u_speed * 0.18;
    vec3 light = normalize(vec3(cos(angle), sin(angle), 0.32));
    float diffuse = max(0.0, dot(normal, light));
    float tone = (0.065 + min(1.4, material.w) * 0.11 + diffuse * 0.23) * u_intensity;
    pica_color = pica_tone(tone, u_fg, 6.0);
  }
`;

const END_GRAIN_FALLBACK = [
  `repeating-conic-gradient(from 14deg at 32% 42%,color-mix(in srgb,${cssVar("fg")} 12%,transparent) 0deg .35deg,transparent .6deg 58deg)`,
  `repeating-radial-gradient(ellipse at 32% 42%,transparent 0 calc(var(--eg-pitch) * .43),color-mix(in srgb,${cssVar("fg")} var(--eg-ink),transparent) calc(var(--eg-pitch) * .48) calc(var(--eg-pitch) * .56),transparent calc(var(--eg-pitch) * .63) calc(var(--eg-pitch) * 1.12),color-mix(in srgb,${cssVar("fg")} 14%,transparent) calc(var(--eg-pitch) * 1.17) calc(var(--eg-pitch) * 1.24),transparent calc(var(--eg-pitch) * 1.32) calc(var(--eg-pitch) * 2.1))`,
  cssVar("bg"),
].join(",");

function endGrainBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<EndGrainProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "under");

  function uniforms(): Record<string, number | readonly number[]> {
    return {
      u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
      u_rings: Math.round(endGrainBound(props.rings, 30, 16, 48)),
      u_irregularity: endGrainBound(props.irregularity, 0.7, 0.2, 1),
      u_relief: endGrainBound(props.relief, 0.75, 0.15, 1.2),
      u_speed: endGrainBound(props.speed, 0.6, 0, 2),
      u_intensity: endGrainBound(props.intensity, 0.65, 0.2, 1),
      u_seed: Math.floor(endGrainBound(props.seed, 1, 0, 9999)),
    };
  }

  function fallback(): void {
    const pitch = Math.max(1, Math.min(host.clientWidth, host.clientHeight)) / Math.round(endGrainBound(props.rings, 30, 16, 48));
    drawing.el.style.setProperty("--eg-pitch", `${pitch}px`);
    drawing.el.style.setProperty("--eg-ink", `${Math.round(endGrainBound(props.intensity, 0.65, 0.2, 1) * 45)}%`);
  }

  fallback();
  const shader = createShader(drawing.el, {
    fragment: END_GRAIN_FRAGMENT,
    fallback: END_GRAIN_FALLBACK,
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
      restore();
      attributes.restore();
    },
  };
};
