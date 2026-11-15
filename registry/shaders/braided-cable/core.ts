import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface BraidedCableProps extends MotionProps {
  /** Cylindrical bundles around the cable core, from 3 to 5. */
  strands: number;
  /** Half twists along each finite bundle, from 4 to 9. */
  crossings: number;
  /** Overall cable diameter relative to the short host dimension, from 0.18 to 0.35. */
  width: number;
  /** Slow torsion and directional light sweep rate, from 0 to 2. */
  speed: number;
  /** Foreground material ink coverage, from 0.3 to 0.75. */
  intensity: number;
}

export const defaults: BraidedCableProps = {
  strands: 3,
  crossings: 6,
  width: 0.26,
  speed: 0.65,
  intensity: 0.55,
  paused: false,
  time: null,
  seed: 1,
};

const CABLE_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_strands;
  uniform float u_crossings;
  uniform float u_width;
  uniform float u_speed;
  uniform float u_intensity;

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float shortSide = max(1.0, min(u_css_size.x, u_css_size.y));
    vec2 p = (uv - 0.5) * u_css_size / shortSide;
    if (u_css_size.x < u_css_size.y) p = vec2(p.y, -p.x);
    float span = 0.34 * max(u_css_size.x, u_css_size.y) / shortSide;
    float t = clamp(p.x / max(0.01, span), -1.0, 1.0);
    float aa = 1.25 / max(1.0, min(u_resolution.x, u_resolution.y));
    float endMask = 1.0 - smoothstep(span - aa, span + aa, abs(p.x));
    float seeded = pica_random(vec2(23.0, 67.0)) * 6.2831853;
    float motion = u_time * u_speed;
    float turn = seeded + motion * 0.055;
    float bend = 0.12 * sin(t * 3.1415927);
    float bendSlope = 0.12 * 3.1415927 * cos(t * 3.1415927) / max(0.01, span);
    float orbit = u_width * 0.31;
    float radius = u_width * 0.19;
    float twist = u_crossings * 1.5707963;
    float best = -1000.0;
    float second = -1000.0;
    float coverage = 0.0;
    vec3 normal = vec3(0.0, 0.0, 1.0);
    for (int i = 0; i < 5; i++) {
      float phase = (t + 1.0) * twist + turn + float(i) * 6.2831853 / u_strands;
      float centerY = bend + orbit * cos(phase);
      float centerZ = orbit * sin(phase);
      float ySlope = bendSlope - orbit * twist * sin(phase) / max(0.01, span);
      float zSlope = orbit * twist * cos(phase) / max(0.01, span);
      float q = p.y - centerY;
      float crown = sqrt(max(radius * radius - q * q, radius * radius * 0.003));
      float around = asin(clamp(q / max(0.001, radius), -0.995, 0.995));
      float groovePhase = around * 7.0 + t * twist * 0.6;
      float groove = radius * 0.018 * cos(groovePhase);
      float grooveSlope = -radius * 0.018 * sin(groovePhase);
      float height = centerZ + crown + groove;
      float slopeY = -q / crown + grooveSlope * 7.0 / crown;
      float slopeX = zSlope + q * ySlope / crown + grooveSlope * (-7.0 * ySlope / crown + twist * 0.6 / max(0.01, span));
      vec3 bundleNormal = normalize(vec3(clamp(-slopeX, -16.0, 16.0), clamp(-slopeY, -16.0, 16.0), 1.0));
      float edge = 1.0 - smoothstep(radius - aa, radius + aa, abs(q));
      if (float(i) < u_strands && edge > 0.0) {
        if (height > best) {
          second = best;
          best = height;
          normal = bundleNormal;
          coverage = edge;
        } else {
          second = max(second, height);
        }
      }
    }
    float azimuth = -1.0 + sin(motion * 0.3 + seeded) * 0.8;
    vec3 light = normalize(vec3(cos(azimuth), sin(azimuth), 1.1));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float diffuse = max(0.0, dot(normal, light));
    float reflection = pow(max(0.0, dot(normal, halfway)), 14.0);
    float separation = max(0.0, best - second) / max(0.001, radius);
    float occlusion = mix(1.0, 0.58 + 0.42 * smoothstep(0.03, 0.9, separation), step(-900.0, second));
    float tone = u_intensity * (0.14 + diffuse * 0.31 + reflection * 0.12) * occlusion * coverage * endMask;
    pica_color = pica_tone(clamp(tone, 0.0, 0.7), u_fg, 8.0);
  }
`;

const CABLE_FALLBACK = [
  `repeating-linear-gradient(56deg,transparent 0 calc(var(--bc-step) * .38),color-mix(in srgb,${cssVar("fg")} 34%,transparent) calc(var(--bc-step) * .4) calc(var(--bc-step) * .62),transparent calc(var(--bc-step) * .65) var(--bc-step))`,
  `repeating-linear-gradient(-56deg,transparent 0 calc(var(--bc-step) * .38),color-mix(in srgb,${cssVar("fg")} 17%,transparent) calc(var(--bc-step) * .4) calc(var(--bc-step) * .62),transparent calc(var(--bc-step) * .65) var(--bc-step))`,
  `linear-gradient(color-mix(in srgb,${cssVar("fg")} 8%,transparent),color-mix(in srgb,${cssVar("fg")} 8%,transparent))`,
  cssVar("bg"),
].join(",");

function cableBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<BraidedCableProps> = (host, initial = {}) => {
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
      u_strands: Math.round(cableBound(props.strands, 3, 3, 5)),
      u_crossings: Math.round(cableBound(props.crossings, 6, 4, 9)),
      u_width: cableBound(props.width, 0.26, 0.18, 0.35),
      u_speed: cableBound(props.speed, 0.65, 0, 2),
      u_intensity: cableBound(props.intensity, 0.55, 0.3, 0.75),
      u_seed: Math.round(cableBound(props.seed, 1, 1, 99)),
    };
  }
  function fallback(noGl = false): void {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const short = Math.min(w, h);
    const portrait = w < h;
    drawing.el.style.setProperty("--bc-step", `${Math.max(w, h) * 0.68 / cableBound(props.crossings, 6, 4, 9)}px`);
    if (!noGl) { drawing.el.style.removeProperty("clip-path"); return; }
    const points: string[] = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i <= 24; i++) {
        const t = (side < 0 ? i : 24 - i) / 12 - 1;
        const transverse = (0.12 * Math.sin(t * Math.PI) + side * cableBound(props.width, 0.26, 0.18, 0.35) / 2) * short;
        const x = portrait ? w / 2 - transverse : w * (0.5 + 0.34 * t);
        const y = portrait ? h * (0.5 + 0.34 * t) : h / 2 + transverse;
        points.push(`${x / w * 100}% ${y / h * 100}%`);
      }
    }
    drawing.el.style.clipPath = `polygon(${points.join(",")})`;
  }
  fallback();
  const shader = createShader(drawing.el, {
    fragment: CABLE_FRAGMENT,
    fallback: CABLE_FALLBACK,
    uniforms: uniforms(),
    maxDpr: 1,
    css: "image-rendering:pixelated",
    onInvalidate: () => {
      if (!alive) return;
      fallback(!shader.ok);
      shader.set("u_css_size", [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)]);
      loop?.redraw();
    },
  });
  fallback(!shader.ok);
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
      fallback(!shader.ok);
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
