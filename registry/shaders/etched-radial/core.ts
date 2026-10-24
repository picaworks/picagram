import { labelHost } from "../../../lib/a11y";
import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface EtchedRadialProps extends MotionProps {
  /** Concentric groove count per shorter host dimension, from 24 to 100. */
  grooves: number;
  /** Offset of the machining center from the host midpoint, from 0 to 1. */
  eccentricity: number;
  /** Width and softness of the anisotropic material highlight, from 0.15 to 0.8. */
  roughness: number;
  /** Rotation rate of the directional light, from 0 to 2. */
  speed: number;
  /** Overall palette ink coverage, from 0.2 to 1. */
  intensity: number;
}

export const defaults: EtchedRadialProps = {
  grooves: 64,
  eccentricity: 0.7,
  roughness: 0.42,
  speed: 0.65,
  intensity: 0.85,
  paused: false,
  time: null,
  seed: 1,
};

const ETCHED_RADIAL_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_grooves;
  uniform float u_eccentricity;
  uniform float u_roughness;
  uniform float u_speed;
  uniform float u_intensity;

  // The shallow dish and concentric cuts provide both height and radial slope.
  vec3 radialCut(float radius, float grooves, float phase) {
    float angle = radius * grooves * 6.2831853 + phase;
    float height = 0.02 * radius * radius + 0.05 / grooves * cos(angle);
    float slope = 0.04 * radius - 0.314159265 * sin(angle);
    return vec3(height, slope, 0.5 + 0.5 * cos(angle));
  }

  void main() {
    float shortSide = max(1.0, min(u_css_size.x, u_css_size.y));
    float grooves = max(1.0, min(u_grooves, shortSide / 6.5));
    float seedPhase = pica_random(vec2(5.0, 11.0)) * 6.2831853;
    vec2 offset = vec2(-0.24, 0.18) * u_eccentricity;
    offset += (pica_random(vec2(9.0, 2.0)) - 0.5) * vec2(0.035, -0.025) * u_eccentricity;
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 p = (uv - vec2(0.5) - offset) * u_css_size / shortSide;
    float radius = length(p);
    vec2 radial = radius > 0.0001 ? p / radius : vec2(1.0, 0.0);
    vec3 cut = radialCut(radius, grooves, seedPhase);
    vec3 normal = normalize(vec3(-cut.y * radial, 1.0));
    vec3 tangent = vec3(-radial.y, radial.x, 0.0);
    vec3 across = normalize(cross(normal, tangent));
    float angle = -0.55 + u_time * u_speed * 0.085;
    vec3 light = normalize(vec3(cos(angle), sin(angle), 0.55));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float alongWidth = 0.08 + u_roughness * 0.14;
    float acrossWidth = 0.3 + u_roughness * 0.6;
    float ht = dot(halfway, tangent) / alongWidth;
    float hb = dot(halfway, across) / acrossWidth;
    float hn = max(0.05, dot(halfway, normal));
    float sheen = exp(-(ht * ht + hb * hb) / (hn * hn));
    float diffuse = max(0.0, dot(normal, light));
    float brightness = clamp(0.2 + diffuse * 0.38 + sheen * 0.4 - cut.z * 0.035 + cut.x * 0.02, 0.08, 0.94);
    float lightInk = step(0.5, dot(u_fg.rgb, vec3(0.2126, 0.7152, 0.0722)));
    float tone = mix(1.0 - brightness, brightness, lightInk) * u_intensity;
    pica_color = pica_tone(tone, u_fg, 6.0);
  }
`;

const ETCHED_RADIAL_FALLBACK = [
  `conic-gradient(from -35deg at var(--er-x) var(--er-y),color-mix(in srgb,${cssVar("fg")} 5%,transparent),color-mix(in srgb,${cssVar("fg")} 34%,transparent) 45deg,color-mix(in srgb,${cssVar("fg")} 5%,transparent) 90deg,color-mix(in srgb,${cssVar("fg")} 5%,transparent) 180deg,color-mix(in srgb,${cssVar("fg")} 34%,transparent) 225deg,color-mix(in srgb,${cssVar("fg")} 5%,transparent) 270deg,color-mix(in srgb,${cssVar("fg")} 5%,transparent))`,
  `repeating-radial-gradient(circle at var(--er-x) var(--er-y),color-mix(in srgb,${cssVar("fg")} 14%,transparent) 0 calc(var(--er-pitch) * .6),color-mix(in srgb,${cssVar("fg")} 48%,transparent) calc(var(--er-pitch) * .77),color-mix(in srgb,${cssVar("fg")} 14%,transparent) calc(var(--er-pitch) * .92) var(--er-pitch))`,
  cssVar("bg"),
].join(",");

function etchedRadialClamp(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<EtchedRadialProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  for (const name of ["role", "aria-label", "aria-hidden"]) attributes.set(name, host.getAttribute(name));
  labelHost(host, "");
  const drawing = layer(host, "over");

  function uniforms(): Record<string, number | readonly number[]> {
    return {
      u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
      u_grooves: etchedRadialClamp(props.grooves, 64, 24, 100),
      u_eccentricity: etchedRadialClamp(props.eccentricity, 0.7, 0, 1),
      u_roughness: etchedRadialClamp(props.roughness, 0.42, 0.15, 0.8),
      u_speed: etchedRadialClamp(props.speed, 0.65, 0, 2),
      u_intensity: etchedRadialClamp(props.intensity, 0.85, 0.2, 1),
      u_seed: Math.floor(etchedRadialClamp(props.seed, 1, 0, 999999)),
    };
  }

  function fallback(): void {
    const eccentricity = etchedRadialClamp(props.eccentricity, 0.7, 0, 1);
    const pitch = Math.max(6.5, Math.min(host.clientWidth, host.clientHeight) / etchedRadialClamp(props.grooves, 64, 24, 100));
    drawing.el.style.setProperty("--er-pitch", `${pitch}px`);
    drawing.el.style.setProperty("--er-x", `${50 - eccentricity * 24}%`);
    drawing.el.style.setProperty("--er-y", `${50 - eccentricity * 18}%`);
  }

  fallback();
  const shader = createShader(drawing.el, {
    fragment: ETCHED_RADIAL_FRAGMENT,
    fallback: ETCHED_RADIAL_FALLBACK,
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
