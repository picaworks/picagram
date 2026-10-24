import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface FlutedTunnelProps extends MotionProps {
  /** Number of continuous longitudinal wall flutes, from 8 to 32. */
  flutes: number;
  /** Axial chamber length beyond the near opening, from 2 to 6. */
  depth: number;
  /** Projected far aperture radius relative to the shorter view dimension, from 0.12 to 0.38. */
  aperture: number;
  /** Rate of the moving grazing light, from 0 to 2. */
  speed: number;
  /** Overall palette ink coverage, from 0.2 to 1. */
  intensity: number;
}

export const defaults: FlutedTunnelProps = {
  flutes: 18,
  depth: 3.5,
  aperture: 0.22,
  speed: 0.6,
  intensity: 0.65,
  paused: false,
  time: null,
  seed: 1,
};

const FLUTED_TUNNEL_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_flutes;
  uniform float u_depth;
  uniform float u_aperture;
  uniform float u_speed;
  uniform float u_intensity;

  // Shallow inward chamber joins are part of the same continuous radial wall.
  vec2 tunnelSection(float z, float nearZ, float intercept, float slope) {
    float frequency = 25.1327412 / u_depth;
    float angle = (z - nearZ) * frequency + 3.1415927;
    float base = 0.5 + 0.5 * cos(angle);
    float amplitude = min(0.02, u_depth * 0.004);
    float join = amplitude * pow(base, 6.0);
    float derivative = amplitude * 3.0 * pow(base, 5.0) * sin(angle) * frequency;
    return vec2(intercept + slope * z - join, slope + derivative);
  }

  void main() {
    float shortSide = max(1.0, min(u_css_size.x, u_css_size.y));
    vec2 q = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size / shortSide * 1.8;
    float radius = length(q);
    float theta = atan(q.y, q.x);
    float offset = pica_random(vec2(5.0, 3.0)) * 6.2831853;
    float fluteAngle = u_flutes * theta + offset;
    float flute = 1.0 + 0.045 * cos(fluteAngle);
    float derivative = -0.045 * u_flutes * sin(fluteAngle);
    float nearZ = 1.5;
    float nearRadius = 1.08;
    float farZ = nearZ + u_depth;
    float nearOpening = flute * nearRadius / nearZ;
    float outerOpening = flute * (nearRadius + 0.115) / nearZ;
    vec2 radial = q / max(radius, 0.0001);
    vec2 tangent = vec2(-radial.y, radial.x);
    float phase = offset * 0.17 + u_time * u_speed * 0.16;
    vec3 lamp = vec3(cos(phase) * 0.9, sin(phase) * 0.9, 0.3);

    if (radius > outerOpening || radius < flute * u_aperture) {
      pica_color = pica_tone(0.0, u_fg, 8.0);
      return;
    }
    if (radius >= nearOpening) {
      // A bounded annular face at the chamber entrance exposes its finite lip.
      vec3 point = vec3(q * nearZ, nearZ);
      float across = (radius - nearOpening) / max(0.001, outerOpening - nearOpening);
      vec3 normal = normalize(vec3(radial * (across - 0.5) * 0.6, -1.0));
      float diffuse = max(0.0, dot(normal, normalize(lamp - point)));
      float edge = exp(-min(across, 1.0 - across) * 18.0);
      pica_color = pica_tone((0.09 + diffuse * 0.22 + edge * 0.13) * u_intensity, u_fg, 8.0);
      return;
    }
    float slope = (u_aperture * farZ - nearRadius) / u_depth;
    float intercept = nearRadius - slope * nearZ;
    float z = flute * intercept / max(0.0001, radius - flute * slope);
    // Four bounded Newton corrections intersect the analytic joined wall.
    for (int iteration = 0; iteration < 4; iteration++) {
      vec2 section = tunnelSection(z, nearZ, intercept, slope);
      float residual = radius * z - flute * section.x;
      float rate = max(0.04, radius - flute * section.y);
      z -= clamp(residual / rate, -u_depth * 0.15, u_depth * 0.15);
      z = clamp(z, nearZ, farZ);
    }
    vec2 section = tunnelSection(z, nearZ, intercept, slope);
    // Both the flute tangent and the axial joins contribute exact wall slopes.
    vec3 normal = normalize(vec3(-radial + derivative / flute * tangent, flute * section.y));
    vec3 point = vec3(q * z, z);
    vec3 light = normalize(lamp - point);
    vec3 view = normalize(-point);
    vec3 halfway = normalize(light + view);
    float diffuse = max(0.0, dot(normal, light));
    float specular = pow(max(0.0, dot(normal, halfway)), 22.0);
    float recession = 0.28 + 0.72 * exp(-0.32 * (z - nearZ));
    float brightness = (0.055 + diffuse * 0.45 + specular * 0.08) * recession;
    float farLip = 1.0 - smoothstep(0.0, 0.05, farZ - z);
    pica_color = pica_tone(clamp((brightness + farLip * 0.09) * u_intensity, 0.0, 0.7), u_fg, 8.0);
  }
`;

const FLUTED_TUNNEL_FALLBACK = [
  `radial-gradient(circle at center,transparent var(--ft-near),color-mix(in srgb,${cssVar("fg")} 24%,transparent) calc(var(--ft-near) + 2px) calc(var(--ft-outer) - 2px),color-mix(in srgb,${cssVar("fg")} 35%,transparent) var(--ft-outer),transparent calc(var(--ft-outer) + 1px))`,
  ...[0, 1, 2, 3].map((i) => `radial-gradient(circle at center,transparent var(--ft-join-${i}),color-mix(in srgb,${cssVar("fg")} 22%,transparent) calc(var(--ft-join-${i}) + 1px),transparent calc(var(--ft-join-${i}) + 3px))`),
  `repeating-conic-gradient(from var(--ft-phase),color-mix(in srgb,${cssVar("fg")} 5%,transparent) 0deg,color-mix(in srgb,${cssVar("fg")} var(--ft-ink),transparent) calc(var(--ft-pitch) * .4),color-mix(in srgb,${cssVar("fg")} 7%,transparent) var(--ft-pitch))`,
  cssVar("bg"),
].join(",");

function flutedTunnelBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<FlutedTunnelProps> = (host, initial = {}) => {
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
      u_flutes: Math.round(flutedTunnelBound(props.flutes, 18, 8, 32)),
      u_depth: flutedTunnelBound(props.depth, 3.5, 2, 6),
      u_aperture: flutedTunnelBound(props.aperture, 0.22, 0.12, 0.38),
      u_speed: flutedTunnelBound(props.speed, 0.6, 0, 2),
      u_intensity: flutedTunnelBound(props.intensity, 0.65, 0.2, 1),
      u_seed: Math.floor(flutedTunnelBound(props.seed, 1, 0, 9999)),
    };
  }

  function fallback(): void {
    const shortSide = Math.max(1, Math.min(host.clientWidth, host.clientHeight));
    const aperture = flutedTunnelBound(props.aperture, 0.22, 0.12, 0.38);
    const depth = flutedTunnelBound(props.depth, 3.5, 2, 6);
    const throat = shortSide * aperture / 1.8;
    const outer = shortSide * 0.465;
    drawing.el.style.maskImage = `radial-gradient(circle at center,transparent ${throat * 0.9}px,${cssVar("fg")} ${throat * 0.91}px,${cssVar("fg")} ${outer}px,transparent ${outer + 1}px)`;
    drawing.el.style.setProperty("--ft-near", `${shortSide * 0.4}px`);
    drawing.el.style.setProperty("--ft-outer", `${shortSide * 0.443}px`);
    const slope = (aperture * (1.5 + depth) - 1.08) / depth;
    for (let i = 0; i < 4; i++) {
      const z = 1.5 + depth * (i + 0.5) / 4;
      const radius = (1.08 + slope * (z - 1.5)) / z * shortSide / 1.8;
      drawing.el.style.setProperty(`--ft-join-${i}`, `${radius}px`);
    }
    drawing.el.style.setProperty("--ft-phase", `${flutedTunnelBound(props.seed, 1, 0, 9999) * 17}deg`);
    drawing.el.style.setProperty("--ft-pitch", `${360 / Math.round(flutedTunnelBound(props.flutes, 18, 8, 32))}deg`);
    drawing.el.style.setProperty("--ft-ink", `${Math.round(flutedTunnelBound(props.intensity, 0.65, 0.2, 1) * 30)}%`);
  }

  fallback();
  const shader = createShader(drawing.el, {
    fragment: FLUTED_TUNNEL_FRAGMENT,
    fallback: FLUTED_TUNNEL_FALLBACK,
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
