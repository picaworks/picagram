import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface SatinRibbonProps extends MotionProps {
  /** Flat material width relative to the short host dimension, from 0.18 to 0.4. */
  width: number;
  /** Fraction of a half turn between the two cut ends, from 0.2 to 0.8. */
  twist: number;
  /** Spread of the directional fiber sheen, from 0.25 to 0.7. */
  roughness: number;
  /** Breathing and single light sweep rate, from 0 to 2. */
  speed: number;
  /** Foreground material ink coverage, from 0.3 to 0.75. */
  intensity: number;
}

export const defaults: SatinRibbonProps = {
  width: 0.3,
  twist: 0.5,
  roughness: 0.45,
  speed: 0.65,
  intensity: 0.55,
  paused: false,
  time: null,
  seed: 1,
};

const SATIN_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_width;
  uniform float u_twist;
  uniform float u_roughness;
  uniform float u_speed;
  uniform float u_intensity;

  float satinBoundary(vec2 p, float span, float bend) {
    float t = clamp(p.x / max(0.01, span), -1.0, 1.0);
    float tilt = u_twist * 1.5707963 * sin(t * 1.5707963);
    float center = bend * sin(t * 3.1415927);
    float projectedWidth = u_width * 0.5 * cos(tilt);
    return max(abs(p.x) - span, abs(p.y - center) - projectedWidth);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float shortSide = max(1.0, min(u_css_size.x, u_css_size.y));
    vec2 p = (uv - 0.5) * u_css_size / shortSide;
    if (u_css_size.x < u_css_size.y) p = vec2(p.y, -p.x);
    float span = 0.34 * max(u_css_size.x, u_css_size.y) / shortSide;
    float aa = 1.1 / max(1.0, min(u_resolution.x, u_resolution.y));
    float seeded = pica_random(vec2(31.0, 73.0)) * 6.2831853;
    float direction = seeded < 3.1415927 ? -1.0 : 1.0;
    float motion = u_time * u_speed;
    float bend = direction * (0.16 + 0.008 * sin(motion * 0.55 + seeded));
    float t = clamp(p.x / max(0.01, span), -1.0, 1.0);
    float halfWidth = u_width * 0.5;
    float tilt = u_twist * 1.5707963 * sin(t * 1.5707963);
    float tiltSlope = u_twist * 2.4674011 * cos(t * 1.5707963);
    float cosine = max(0.25, cos(tilt));
    float sine = sin(tilt);
    float centerY = bend * sin(t * 3.1415927);
    float v = clamp((p.y - centerY) / cosine, -halfWidth, halfWidth);
    float centerYSlope = bend * 3.1415927 * cos(t * 3.1415927);
    float fold = 0.12 + 0.006 * sin(motion * 0.45 + seeded);
    float centerZSlope = fold * 3.1415927 * cos(t * 3.1415927 - 0.6);
    float across = v / max(0.01, halfWidth);
    float bowT = -0.02 * halfWidth * 3.1415927 * sin(t * 1.5707963) * (1.0 - across * across);
    float bowV = -0.08 * across * cos(t * 1.5707963);
    float fiberPitch = 3.0 / shortSide;
    float fiberSlope = 0.0753982 * cos(v * 6.2831853 / fiberPitch + seeded);
    // These are the derivatives of the same ruled sheet and its lengthwise fiber relief.
    vec3 along = vec3(span, centerYSlope - v * sine * tiltSlope, centerZSlope + v * cosine * tiltSlope + bowT);
    vec3 acrossSheet = vec3(0.0, cosine, sine + bowV + fiberSlope);
    vec3 normal = normalize(cross(along, acrossSheet));
    vec3 tangent = normalize(along);
    vec3 bitangent = normalize(cross(normal, tangent));
    float azimuth = -0.7 + 0.75 * sin(motion * 0.28 + seeded);
    vec3 light = normalize(vec3(cos(azimuth), sin(azimuth), 1.05));
    vec3 view = normalize(vec3(-0.12, 0.1, 1.0));
    vec3 halfway = normalize(light + view);
    float nh = max(0.05, dot(normal, halfway));
    float ht = dot(halfway, tangent);
    float hb = dot(halfway, bitangent);
    float alongRoughness = 0.38 + u_roughness * 0.42;
    float acrossRoughness = 0.055 + u_roughness * 0.24;
    float ellipse = ht * ht / max(0.01, alongRoughness * alongRoughness) + hb * hb / max(0.002, acrossRoughness * acrossRoughness);
    float sheen = exp(-ellipse / max(0.04, nh * nh));
    float diffuse = max(0.0, dot(normal, light));
    float distance = satinBoundary(p, span, bend);
    float face = 1.0 - smoothstep(-aa, aa, distance);
    float side = (1.0 - smoothstep(-aa, aa, satinBoundary(p + vec2(0.0015, 0.0035), span, bend))) * (1.0 - face);
    float selvedge = smoothstep(halfWidth - aa * 2.4 / cosine, halfWidth - aa * 0.5 / cosine, abs(v));
    float tone = u_intensity * ((0.075 + diffuse * 0.16 + sheen * 0.38 + selvedge * 0.055) * face + side * 0.13);
    pica_color = pica_tone(clamp(tone, 0.0, 0.72), u_fg, 8.0);
  }
`;

const SATIN_FALLBACK = [
  `repeating-linear-gradient(var(--sr-angle),color-mix(in srgb,${cssVar("fg")} 5%,transparent) 0 1px,transparent 1px 3px)`,
  `linear-gradient(112deg,color-mix(in srgb,${cssVar("fg")} 7%,transparent) 5%,color-mix(in srgb,${cssVar("fg")} 30%,transparent) 32%,color-mix(in srgb,${cssVar("fg")} 10%,transparent) 52%,color-mix(in srgb,${cssVar("fg")} 24%,transparent) 75%,color-mix(in srgb,${cssVar("fg")} 7%,transparent) 95%)`,
  cssVar("bg"),
].join(",");

function satinBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<SatinRibbonProps> = (host, initial = {}) => {
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
      u_width: satinBound(props.width, 0.3, 0.18, 0.4),
      u_twist: satinBound(props.twist, 0.5, 0.2, 0.8),
      u_roughness: satinBound(props.roughness, 0.45, 0.25, 0.7),
      u_speed: satinBound(props.speed, 0.65, 0, 2),
      u_intensity: satinBound(props.intensity, 0.55, 0.3, 0.75),
      u_seed: Math.round(satinBound(props.seed, 1, 1, 99)),
    };
  }
  function fallback(noGl = false): void {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const short = Math.min(w, h);
    const portrait = w < h;
    drawing.el.style.setProperty("--sr-angle", portrait ? "90deg" : "0deg");
    if (!noGl) { drawing.el.style.removeProperty("clip-path"); return; }
    const width = satinBound(props.width, 0.3, 0.18, 0.4);
    const twist = satinBound(props.twist, 0.5, 0.2, 0.8);
    const points: string[] = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i <= 32; i++) {
        const t = (side < 0 ? i : 32 - i) / 16 - 1;
        const transverse = (0.16 * Math.sin(t * Math.PI) + side * width / 2 * Math.cos(twist * Math.PI / 2 * Math.sin(t * Math.PI / 2))) * short;
        const x = portrait ? w / 2 - transverse : w * (0.5 + 0.34 * t);
        const y = portrait ? h * (0.5 + 0.34 * t) : h / 2 + transverse;
        points.push(`${x / w * 100}% ${y / h * 100}%`);
      }
    }
    drawing.el.style.clipPath = `polygon(${points.join(",")})`;
  }
  fallback();
  const shader = createShader(drawing.el, {
    fragment: SATIN_FRAGMENT,
    fallback: SATIN_FALLBACK,
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
