import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface FlutedShellProps extends MotionProps {
  /** Number of radial flute crests across the fan, from 6 to 24. */
  flutes: number;
  /** Depth of the shell bowl relative to its radius, from 0.25 to 1.5. */
  concavity: number;
  /** Full fan opening in degrees, from 80 to 140. */
  spread: number;
  /** Rate of the moving directional light, from 0 to 2. */
  speed: number;
  /** Overall palette ink coverage, from 0.2 to 1. */
  intensity: number;
}

export const defaults: FlutedShellProps = {
  flutes: 13,
  concavity: 1,
  spread: 110,
  speed: 0.6,
  intensity: 0.65,
  paused: false,
  time: null,
  seed: 1,
};

const SHELL_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_flutes;
  uniform float u_concavity;
  uniform float u_spread;
  uniform float u_speed;
  uniform float u_intensity;

  void main() {
    float shortSide = max(1.0, min(u_css_size.x, u_css_size.y));
    float pixel = 1.25 / shortSide;
    float halfAngle = radians(u_spread) * 0.5;
    float radius = min(0.68, 0.43 / sin(halfAngle));
    vec2 world = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size / shortSide;
    vec2 p = world - vec2(0.0, -radius * 0.48);
    float r = length(p);
    float theta = atan(p.x, p.y);
    float frequency = (u_flutes - 1.0) * 3.14159265 / halfAngle;
    float flute = (theta + halfAngle) * frequency;
    float outer = radius * (0.97 + 0.03 * cos(flute));
    float sector = 1.0 - smoothstep(halfAngle - pixel / max(r, 0.02), halfAngle + pixel / max(r, 0.02), abs(theta));
    float mask = sector * (1.0 - smoothstep(outer - pixel, outer + pixel, r));
    float rho = clamp(r / radius, 0.0, 1.0);
    float root = sqrt(rho);
    vec2 radial = p / max(r, 0.0001);
    vec2 tangent = vec2(radial.y, -radial.x);
    // Exact derivatives of z = concavity * .18 * rho squared + .018 * rho to 1.5 * cos(flute).
    float radialSlope = (u_concavity * 0.36 * rho + 0.027 * root * cos(flute)) / radius;
    float angularSlope = -0.018 * rho * root * sin(flute) * frequency / max(r, 0.0001);
    vec3 normal = normalize(vec3(-radial * radialSlope - tangent * angularSlope, 1.0));
    float phase = pica_random(vec2(8.0, 3.0)) * 1.2 + u_time * u_speed * 0.35;
    vec3 light = normalize(vec3(cos(phase - 0.8), sin(phase - 0.8), 0.8));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float diffuse = max(0.0, dot(normal, light));
    float specular = pow(max(0.0, dot(normal, halfway)), 26.0);
    float edgeSlope = -radius * 0.03 * sin(flute) * frequency;
    vec2 edgeNormal = normalize(radial - tangent * edgeSlope / max(r, 0.0001));
    float rim = 1.0 - smoothstep(pixel, pixel * 3.0, abs(r - outer));
    float edgeLight = max(0.0, dot(vec3(edgeNormal, 0.0), light));
    float grain = pica_random(floor(world * shortSide * 0.7));
    float surface = 0.065 + diffuse * 0.2 + specular * 0.12 + cos(flute) * 0.012 + grain * 0.018;
    surface += rim * (0.1 + edgeLight * 0.2);
    float hingeRadius = radius * 0.055;
    float hinge = 1.0 - smoothstep(hingeRadius - pixel, hingeRadius + pixel, r);
    vec3 hingeNormal = normalize(vec3(p / hingeRadius, 0.8));
    float hingeTone = 0.12 + max(0.0, dot(hingeNormal, light)) * 0.28;
    float tone = mix(surface * mask, hingeTone, hinge) * u_intensity;
    pica_color = pica_tone(tone, u_fg, 8.0);
  }
`;

const SHELL_FALLBACK = [
  `repeating-conic-gradient(from var(--fs-start) at var(--fs-x) var(--fs-y),color-mix(in srgb,${cssVar("fg")} var(--fs-ink),transparent) 0deg,color-mix(in srgb,${cssVar("fg")} 5%,transparent) calc(var(--fs-pitch) * .5),color-mix(in srgb,${cssVar("fg")} var(--fs-ink),transparent) var(--fs-pitch))`,
  `radial-gradient(ellipse at var(--fs-x) var(--fs-y),color-mix(in srgb,${cssVar("fg")} 5%,transparent),color-mix(in srgb,${cssVar("fg")} 12%,transparent))`,
  cssVar("bg"),
].join(",");

function shellBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<FlutedShellProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "over");
  const uniforms = (): Record<string, number | readonly number[]> => ({
    u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
    u_flutes: Math.round(shellBound(props.flutes, 13, 6, 24)),
    u_concavity: shellBound(props.concavity, 1, 0.25, 1.5),
    u_spread: shellBound(props.spread, 110, 80, 140),
    u_speed: shellBound(props.speed, 0.6, 0, 2),
    u_intensity: shellBound(props.intensity, 0.65, 0.2, 1),
    u_seed: Math.floor(shellBound(props.seed, 1, 1, 9999)),
  });
  function fallback(): void {
    const spread = shellBound(props.spread, 110, 80, 140);
    const flutes = Math.round(shellBound(props.flutes, 13, 6, 24));
    const half = spread * Math.PI / 360;
    const radius = Math.min(host.clientWidth, host.clientHeight) * Math.min(0.68, 0.43 / Math.sin(half));
    const x = host.clientWidth / 2;
    const y = host.clientHeight / 2 + radius * 0.48;
    drawing.el.style.setProperty("--fs-start", `${-spread / 2}deg`);
    drawing.el.style.setProperty("--fs-pitch", `${spread / (flutes - 1)}deg`);
    drawing.el.style.setProperty("--fs-x", `${x}px`);
    drawing.el.style.setProperty("--fs-y", `${y}px`);
    drawing.el.style.setProperty("--fs-ink", `${Math.round(shellBound(props.intensity, 0.65, 0.2, 1) * 45)}%`);
    if (!shader.ok) {
      const outline = [`${x}px ${y + radius * 0.04}px`];
      const samples = flutes * 4;
      for (let i = 0; i <= samples; i++) {
        const angle = -half + i / samples * half * 2;
        const edge = radius * (0.97 + 0.03 * Math.cos((angle + half) * (flutes - 1) * Math.PI / half));
        outline.push(`${x + Math.sin(angle) * edge}px ${y - Math.cos(angle) * edge}px`);
      }
      drawing.el.style.clipPath = `polygon(${outline.join(",")})`;
    } else drawing.el.style.removeProperty("clip-path");
  }
  const shader = createShader(drawing.el, {
    fragment: SHELL_FRAGMENT,
    fallback: SHELL_FALLBACK,
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
  fallback();
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
