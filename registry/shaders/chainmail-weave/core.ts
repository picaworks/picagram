import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ChainmailWeaveProps extends MotionProps {
  /** Ring pitches across the shorter view dimension, from 6 to 20. */
  rings: number;
  /** Wire radius relative to a ring pitch, from 0.055 to 0.15. */
  gauge: number;
  /** Alternating ring plane tilt in radians, from 0.2 to 0.8. */
  lean: number;
  /** Rate of the single moving light, from 0 to 2. */
  speed: number;
  /** Overall palette ink coverage, from 0.2 to 1. */
  intensity: number;
}

export const defaults: ChainmailWeaveProps = {
  rings: 12,
  gauge: 0.09,
  lean: 0.45,
  speed: 0.6,
  intensity: 0.65,
  paused: false,
  time: null,
  seed: 1,
};

const CHAINMAIL_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_rings;
  uniform float u_gauge;
  uniform float u_lean;
  uniform float u_speed;
  uniform float u_intensity;

  void main() {
    float shortSide = max(1.0, min(u_css_size.x, u_css_size.y));
    vec2 p = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size / shortSide * u_rings;
    vec2 cell = floor(vec2(p.x, p.y / 0.8));
    float radius = 0.58;
    float ry = radius * cos(u_lean);
    float front = -100.0;
    float rear = -100.0;
    float coverage = 0.0;
    vec3 normal = vec3(0.0, 0.0, 1.0);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 id = cell + vec2(float(i), float(j));
        float stagger = mod(id.y, 2.0) * 0.5;
        vec2 q = p - vec2(id.x + stagger, id.y * 0.8);
        float turn = mod(id.x + id.y, 2.0) < 1.0 ? 1.0 : -1.0;
        float angle = atan(q.y / ry, q.x / radius);
        // Bounded closest-point refinement on the same ellipse used for the ring.
        for (int k = 0; k < 3; k++) {
          vec2 e = vec2(radius * cos(angle), ry * sin(angle));
          vec2 tangent = vec2(-radius * sin(angle), ry * cos(angle));
          float denominator = dot(tangent, tangent) - dot(e - q, e);
          angle -= clamp(dot(e - q, tangent) / max(0.015, denominator), -0.4, 0.4);
        }
        vec2 e = vec2(radius * cos(angle), ry * sin(angle));
        vec2 tangent = vec2(-radius * sin(angle), ry * cos(angle));
        vec2 outward = normalize(vec2(cos(angle) / radius, sin(angle) / ry));
        float distance = dot(q - e, outward);
        if (abs(distance) >= u_gauge) continue;
        float cap = sqrt(max(0.000004, u_gauge * u_gauge - distance * distance));
        float centerZ = turn * radius * sin(u_lean) * sin(angle) + turn * 0.018;
        float z = centerZ + cap;
        if (z <= front) { rear = max(rear, z); continue; }
        rear = front;
        front = z;
        float derivative = turn * radius * sin(u_lean) * cos(angle);
        float denominator = max(0.015, dot(tangent, tangent) - dot(e - q, e));
        vec2 slope = derivative * tangent / denominator - distance / cap * outward;
        normal = normalize(vec3(-slope, 1.0));
        float aa = max(0.002, fwidth(distance));
        coverage = 1.0 - smoothstep(u_gauge - aa, u_gauge, abs(distance));
      }
    }
    if (front < -99.0) {
      pica_color = pica_tone(0.0, u_fg, 6.0);
      return;
    }
    float phase = pica_random(vec2(7.0, 2.0)) * 6.2831853 + u_time * u_speed * 0.18;
    vec3 light = normalize(vec3(cos(phase) * 0.85, sin(phase) * 0.85, 0.65));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float diffuse = max(0.0, dot(normal, light));
    float specular = pow(max(0.0, dot(normal, halfway)), 24.0);
    float contact = rear > -99.0 ? 0.82 + 0.18 * smoothstep(0.0, 0.16, front - rear) : 1.0;
    float tone = (0.085 + diffuse * 0.31 + specular * 0.28) * contact * coverage * u_intensity;
    pica_color = pica_tone(tone, u_fg, 6.0);
  }
`;

const CHAINMAIL_RING = (position: string): string => `radial-gradient(ellipse var(--cm-rx) var(--cm-ry) at ${position},transparent var(--cm-hole),color-mix(in srgb,${cssVar("fg")} var(--cm-ink),transparent) calc(var(--cm-hole) + 4%),color-mix(in srgb,${cssVar("fg")} 7%,transparent) 95%,transparent 100%)`;
const CHAINMAIL_FALLBACK = [
  `${CHAINMAIL_RING("50% 25%")} 0 0/var(--cm-pitch) var(--cm-rows)`,
  `${CHAINMAIL_RING("50% 75%")} calc(var(--cm-pitch) * .5) 0/var(--cm-pitch) var(--cm-rows)`,
  cssVar("bg"),
].join(",");

function chainmailBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<ChainmailWeaveProps> = (host, initial = {}) => {
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
      u_rings: Math.round(chainmailBound(props.rings, 12, 6, 20)),
      u_gauge: chainmailBound(props.gauge, 0.09, 0.055, 0.15),
      u_lean: chainmailBound(props.lean, 0.45, 0.2, 0.8),
      u_speed: chainmailBound(props.speed, 0.6, 0, 2),
      u_intensity: chainmailBound(props.intensity, 0.65, 0.2, 1),
      u_seed: Math.floor(chainmailBound(props.seed, 1, 0, 9999)),
    };
  }

  function fallback(): void {
    const pitch = Math.max(1, Math.min(host.clientWidth, host.clientHeight)) / Math.round(chainmailBound(props.rings, 12, 6, 20));
    const gauge = chainmailBound(props.gauge, 0.09, 0.055, 0.15);
    const radius = 0.58 + gauge;
    const values = {
      "--cm-pitch": `${pitch}px`,
      "--cm-rows": `${pitch * 1.6}px`,
      "--cm-rx": `${pitch * radius}px`,
      "--cm-ry": `${pitch * radius * Math.cos(chainmailBound(props.lean, 0.45, 0.2, 0.8))}px`,
      "--cm-hole": `${(0.58 - gauge) / radius * 100}%`,
      "--cm-ink": `${Math.round(chainmailBound(props.intensity, 0.65, 0.2, 1) * 50)}%`,
    };
    for (const [name, value] of Object.entries(values)) drawing.el.style.setProperty(name, value);
  }

  fallback();
  const shader = createShader(drawing.el, {
    fragment: CHAINMAIL_FRAGMENT,
    fallback: CHAINMAIL_FALLBACK,
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
