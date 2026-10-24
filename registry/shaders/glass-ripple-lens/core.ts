import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface GlassRippleLensProps extends MotionProps {
  /** Lens radius as a fraction of the host's shorter edge, from 0.15 to 0.36. */
  radius: number;
  /** Lens curvature and refraction strength, from 0.15 to 1.5. */
  bend: number;
  /** Number of shallow radial ripples inside the lens, from 0 to 5. */
  rings: number;
  /** Speed of the internal ripple phase, from 0 to 2. */
  speed: number;
  /** Overall ink coverage, from 0.1 to 1. */
  intensity: number;
}

export const defaults: GlassRippleLensProps = {
  radius: 0.3,
  bend: 0.95,
  rings: 2,
  speed: 0.45,
  intensity: 0.75,
  paused: false,
  time: null,
  seed: 1,
};

const GLASS_RIPPLE_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_radius;
  uniform float u_bend;
  uniform float u_rings;
  uniform float u_speed;
  uniform float u_intensity;

  float glassRuled(vec2 p, float pitch) {
    float coordinate = p.y + p.x * 0.16;
    float distanceToLine = abs(mod(coordinate + pitch * 0.5, pitch) - pitch * 0.5);
    float aa = max(fwidth(coordinate) * 0.65, 0.45);
    return 1.0 - smoothstep(0.8 - aa, 0.8 + aa, distanceToLine);
  }

  void main() {
    float shortSide = min(u_css_size.x, u_css_size.y);
    float radius = shortSide * u_radius;
    vec2 p = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    float seedPhase = pica_random(vec2(5.0, 13.0));
    vec2 center = shortSide * vec2(0.10 + seedPhase * 0.02, 0.025);
    vec2 local = p - center;
    float distanceFromCenter = length(local);
    float r = distanceFromCenter / radius;
    vec2 direction = local / max(distanceFromCenter, 0.001);
    float inside = 1.0 - smoothstep(radius - 0.8, radius + 0.8, distanceFromCenter);
    float q = clamp(r, 0.0, 1.0);
    float envelope = 1.0 - q * q;
    float waveAngle = q * u_rings * 6.28318530718 - u_time * u_speed * 0.22 + seedPhase * 6.28318530718;
    float rippleAmount = 0.13 * step(0.01, u_rings);
    float wave = rippleAmount * q * q * sin(waveAngle);
    float waveDerivative = rippleAmount * (2.0 * q * sin(waveAngle) + q * q * u_rings * 6.28318530718 * cos(waveAngle));
    // Differentiate the single bounded cap used for the lens and its ripples.
    float slope = u_bend * 0.12 * (-4.0 * q * envelope * (1.0 + wave) + envelope * envelope * waveDerivative);
    vec3 normal = normalize(vec3(-direction * slope, 1.0));
    vec2 refracted = p - normal.xy * radius * 1.05 * inside;
    float pitch = max(18.0, shortSide / 18.0);
    float lines = glassRuled(refracted, pitch);
    vec3 light = normalize(vec3(-0.65, 0.55, 0.7));
    float diffuse = max(0.0, dot(normal, light));
    float rimWidth = max(1.1, radius * 0.006);
    float rim = (1.0 - smoothstep(rimWidth * 0.5, rimWidth + 0.8, abs(distanceFromCenter - radius))) * inside;
    float glint = rim * pow(max(0.0, dot(direction, normalize(light.xy))), 8.0);
    float coverage = u_intensity * (lines * mix(0.12, 0.68, inside) + inside * diffuse * 0.025 + rim * 0.3 + glint * 0.22);
    vec4 ink = u_fg;
    ink = mix(ink, u_accent, glint * 0.85);
    pica_color = pica_tone(coverage, ink, 8.0);
  }
`;

const GLASS_RIPPLE_FALLBACK = [
  `radial-gradient(circle var(--grl-radius) at var(--grl-x) 47.5%,transparent 0 var(--grl-edge),color-mix(in srgb,${cssVar("accent")} var(--grl-rim),transparent) var(--grl-edge) var(--grl-radius),transparent var(--grl-outside))`,
  `radial-gradient(circle var(--grl-radius) at var(--grl-x) 47.5%,color-mix(in srgb,${cssVar("fg")} var(--grl-face),transparent) 0 98%,transparent 100%)`,
  `repeating-linear-gradient(99deg,transparent 0 var(--grl-rule-gap),color-mix(in srgb,${cssVar("fg")} var(--grl-rule),transparent) var(--grl-rule-gap) var(--grl-pitch))`,
  cssVar("bg"),
].join(",");

function glassRippleBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<GlassRippleLensProps> = (host, initial = {}) => {
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
      u_radius: glassRippleBound(props.radius, 0.3, 0.15, 0.36),
      u_bend: glassRippleBound(props.bend, 0.95, 0.15, 1.5),
      u_rings: glassRippleBound(props.rings, 2, 0, 5),
      u_speed: glassRippleBound(props.speed, 0.45, 0, 2),
      u_intensity: glassRippleBound(props.intensity, 0.75, 0.1, 1),
      u_seed: Math.floor(glassRippleBound(props.seed, 1, 0, 999999)),
    };
  }

  function fallback(): void {
    const shortSide = Math.max(1, Math.min(host.clientWidth, host.clientHeight));
    const radius = shortSide * glassRippleBound(props.radius, 0.3, 0.15, 0.36);
    const pitch = Math.max(18, shortSide / 18);
    const intensity = glassRippleBound(props.intensity, 0.75, 0.1, 1);
    const values: Record<string, string> = {
      "--grl-radius": `${radius}px`,
      "--grl-edge": `${Math.max(0, radius - 1.8)}px`,
      "--grl-outside": `${radius + 1}px`,
      "--grl-x": `${host.clientWidth * 0.5 + shortSide * 0.11}px`,
      "--grl-pitch": `${pitch}px`,
      "--grl-rule-gap": `${pitch - 1.5}px`,
      "--grl-rule": `${intensity * 24}%`,
      "--grl-face": `${intensity * 5}%`,
      "--grl-rim": `${intensity * 65}%`,
    };
    for (const [name, value] of Object.entries(values)) drawing.el.style.setProperty(name, value);
  }

  fallback();
  shader = createShader(drawing.el, {
    fragment: GLASS_RIPPLE_FRAGMENT,
    fallback: GLASS_RIPPLE_FALLBACK,
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
  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 4200, frame });
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
