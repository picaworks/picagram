import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PorcelainReliefProps extends MotionProps {
  /** Number of concentric raised terraces, from 3 to 7. */
  rings: number;
  /** Height of the raised molding relative to its radius, from 0.2 to 0.7. */
  relief: number;
  /** Number of quiet radial flutes around the terraces, from 12 to 28. */
  flutes: number;
  /** Directional light sweep rate, from 0 to 2. */
  speed: number;
  /** Overall foreground ink coverage, from 0.3 to 0.75. */
  intensity: number;
}

export const defaults: PorcelainReliefProps = {
  rings: 5,
  relief: 0.45,
  flutes: 20,
  speed: 0.65,
  intensity: 0.5,
  paused: false,
  time: null,
  seed: 1,
};

const PORCELAIN_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_rings;
  uniform float u_relief;
  uniform float u_flutes;
  uniform float u_speed;
  uniform float u_intensity;

  vec2 porcelainRamp(float value, float width) {
    float t = clamp(value / max(0.01, width), 0.0, 1.0);
    return vec2(t * t * (3.0 - 2.0 * t), 6.0 * t * (1.0 - t) / max(0.01, width));
  }

  vec3 porcelainBoundary(vec2 q, float size) {
    vec2 d = abs(q) - size + 6.0;
    vec2 outside = max(d, 0.0);
    float distance = length(outside) + min(max(d.x, d.y), 0.0) - 6.0;
    vec2 gradient = length(outside) > 0.0001 ? outside / max(0.0001, length(outside)) * sign(q) : (d.x > d.y ? vec2(sign(q.x), 0.0) : vec2(0.0, sign(q.y)));
    return vec3(distance, gradient);
  }

  float porcelainRise(float size) { return size * (0.012 + u_relief * 0.055); }
  float porcelainLip(float size) { return max(1.9, size * 0.018); }

  vec3 porcelainTile(vec2 q, float size) {
    vec3 boundary = porcelainBoundary(q, size);
    float width = max(3.0, size * 0.028);
    float t = clamp(-boundary.x / width, 0.0, 1.0);
    float height = size * 0.025;
    vec2 slope = (t > 0.0 && t < 1.0) ? -boundary.yz * height / width : vec2(0.0);
    return vec3(height * t, slope);
  }

  // This height field is the upper envelope of the intersected beveled terrace solids.
  vec3 porcelainSurface(vec2 q, float size) {
    vec3 tile = porcelainTile(q, size);
    float radius = length(q);
    vec2 radial = q / max(0.001, radius);
    float lip = porcelainLip(size);
    float rise = porcelainRise(size);
    float height = tile.x;
    float radialSlope = 0.0;
    for (int i = 0; i < 7; i++) {
      if (float(i) >= u_rings) break;
      float ring = size * (0.78 - float(i) / max(1.0, u_rings - 1.0) * 0.5);
      float t = clamp((ring - radius) / lip, 0.0, 1.0);
      height += rise * t;
      if (t > 0.0 && t < 1.0) radialSlope -= rise / lip;
    }
    float core = size * 0.25;
    float dome = max(0.0, 1.0 - radius * radius / max(0.01, core * core));
    float cap = size * u_relief * 0.008;
    height += cap * dome * dome;
    radialSlope -= 4.0 * cap * radius / max(0.01, core * core) * dome;
    vec2 inner = porcelainRamp(radius - size * 0.27, size * 0.08);
    vec2 outer = porcelainRamp(size * 0.78 - radius, size * 0.08);
    float envelope = inner.x * outer.x;
    float envelopeSlope = inner.y * outer.x - inner.x * outer.y;
    float phase = pica_random(vec2(17.0, 73.0)) * 6.2831853;
    float theta = atan(q.y, q.x + 0.00001);
    float angle = theta * u_flutes + phase;
    float fan = 0.5 + 0.5 * cos(angle);
    float flute = size * u_relief * 0.004;
    height += flute * envelope * fan;
    radialSlope += flute * envelopeSlope * fan;
    float angularSlope = -flute * envelope * 0.5 * u_flutes * sin(angle) / max(0.01, radius);
    vec2 slope = tile.yz + radial * radialSlope + vec2(-radial.y, radial.x) * angularSlope;
    float a = q.x * 1.3 + phase;
    float b = q.y * 1.5 - phase;
    height += 0.012 * sin(a) * sin(b);
    slope += vec2(0.0156 * cos(a) * sin(b), 0.018 * sin(a) * cos(b));
    return vec3(height, slope);
  }

  // A ray is p + ray * z. Top planes and conical shoulders have analytic intersections.
  float porcelainDiscHit(vec2 p, vec2 ray, float radius, float base, float rise, float lip) {
    float top = base + rise;
    float visible = length(p + ray * top) <= radius - lip ? top : -1.0;
    float k = lip / max(0.01, rise);
    float c = radius + k * base;
    float a = dot(ray, ray) - k * k;
    float b = dot(p, ray) + c * k;
    float d = dot(p, p) - c * c;
    vec2 roots = vec2(-1000.0);
    if (abs(a) < 0.00001) {
      if (abs(b) > 0.00001) roots = vec2(-d / (2.0 * b));
    } else {
      float discriminant = b * b - a * d;
      if (discriminant >= 0.0) roots = (-b + vec2(-1.0, 1.0) * sqrt(max(0.0, discriminant))) / a;
    }
    for (int i = 0; i < 2; i++) {
      float z = i == 0 ? roots.x : roots.y;
      float r = length(p + ray * z);
      if (z >= base && z <= top && r >= radius - lip - 0.001 && r <= radius + 0.001) visible = max(visible, z);
    }
    return visible;
  }

  float porcelainReliefHit(vec2 p, vec2 ray, float size) {
    float visible = -1.0;
    float rise = porcelainRise(size);
    float lip = porcelainLip(size);
    for (int i = 0; i < 7; i++) {
      if (float(i) >= u_rings) break;
      float radius = size * (0.78 - float(i) / max(1.0, u_rings - 1.0) * 0.5);
      float base = size * 0.025 + float(i) * rise;
      visible = max(visible, porcelainDiscHit(p, ray, radius, base, rise, lip));
    }
    return visible;
  }

  void main() {
    vec2 screen = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    float angle = (pica_random(vec2(41.0, 29.0)) - 0.5) * 0.12;
    mat2 turn = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 p = turn * screen;
    float size = min(u_css_size.x, u_css_size.y) * 0.385;
    float aa = max(0.65, max(u_css_size.x / u_resolution.x, u_css_size.y / u_resolution.y));
    vec3 boundary = porcelainBoundary(p, size);
    float face = 1.0 - smoothstep(-aa, aa, boundary.x);
    if (boundary.x > aa) {
      pica_color = pica_tone(0.0, u_fg, 8.0);
      return;
    }
    vec2 view = vec2(0.48, -0.34);
    float low = 0.0;
    float high = size * 0.025;
    for (int i = 0; i < 8; i++) {
      float middle = (low + high) * 0.5;
      if (porcelainTile(p + view * middle, size).x > middle) low = middle;
      else high = middle;
    }
    float z = max((low + high) * 0.5, porcelainReliefHit(p, view, size));
    // Couple the quiet flutes, solid boss and ceramic grain to the same visible surface.
    for (int i = 0; i < 4; i++) {
      vec3 local = porcelainSurface(p + view * z, size);
      float denominator = max(0.12, 1.0 - dot(local.yz, view));
      z += clamp((local.x - z) / denominator, -0.7, 0.7);
    }
    vec2 q = p + view * z;
    vec3 surface = porcelainSurface(q, size);
    vec3 normal = normalize(vec3(-clamp(surface.yz, vec2(-6.0), vec2(6.0)), 1.0));
    float azimuth = -0.65 + sin(u_time * u_speed * 0.2 + 0.35) * 0.8;
    vec3 light = normalize(vec3(turn * vec2(cos(azimuth), sin(azimuth)), 0.8));
    vec2 lightRay = light.xy / max(0.2, light.z);
    float blocker = porcelainReliefHit(q - lightRay * z, lightRay, size);
    float shadow = step(z + 0.4, blocker);
    vec3 halfway = normalize(light + normalize(vec3(view, 1.0)));
    float diffuse = max(0.0, dot(normal, light)) * (1.0 - shadow * 0.72);
    float reflection = pow(clamp(dot(normal, halfway), 0.0, 1.0), 38.0) * (1.0 - shadow * 0.8);
    float lightInk = step(0.5, dot(u_fg.rgb, vec3(0.2126, 0.7152, 0.0722)));
    float shade = mix(1.0 - diffuse, diffuse, lightInk);
    float raised = clamp((surface.x - size * 0.025) / max(0.1, porcelainRise(size) * u_rings), 0.0, 1.0);
    float bevel = clamp(-porcelainBoundary(q, size).x / max(3.0, size * 0.028), 0.0, 1.0);
    float tone = u_intensity * (0.055 + shade * 0.18 + reflection * 0.12 + raised * 0.025 + (1.0 - bevel) * 0.12);
    pica_color = pica_tone(clamp(tone * face, 0.0, 0.7), u_fg, 8.0);
  }
`;

const PORCELAIN_FALLBACK = [
  `var(--pr-medallion) center / var(--pr-square) var(--pr-square) no-repeat`,
  `linear-gradient(135deg,color-mix(in srgb,${cssVar("fg")} 6%,${cssVar("bg")}),color-mix(in srgb,${cssVar("fg")} 9%,${cssVar("bg")})) center / var(--pr-square) var(--pr-square) no-repeat`,
  `linear-gradient(color-mix(in srgb,${cssVar("fg")} 14%,transparent),color-mix(in srgb,${cssVar("fg")} 14%,transparent)) 50% calc(50% + 6px) / var(--pr-square) var(--pr-square) no-repeat`,
  cssVar("bg"),
].join(",");

function porcelainBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<PorcelainReliefProps> = (host, initial = {}) => {
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
      u_rings: Math.round(porcelainBound(props.rings, 5, 3, 7)),
      u_relief: porcelainBound(props.relief, 0.45, 0.2, 0.7),
      u_flutes: Math.round(porcelainBound(props.flutes, 20, 12, 28)),
      u_speed: porcelainBound(props.speed, 0.65, 0, 2),
      u_intensity: porcelainBound(props.intensity, 0.5, 0.3, 0.75),
      u_seed: Math.round(porcelainBound(props.seed, 1, 1, 99)),
    };
  }
  function fallback(): void {
    const size = Math.min(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)) * 0.385;
    const count = Math.round(porcelainBound(props.rings, 5, 3, 7));
    const shade = 9 + porcelainBound(props.relief, 0.45, 0.2, 0.7) * 12;
    const low = `color-mix(in srgb,${cssVar("fg")} ${shade}%,transparent)`;
    const high = `color-mix(in srgb,${cssVar("fg")} ${shade + 8}%,transparent)`;
    const stops = [`${low} 0px`];
    for (let i = 0; i < count; i++) {
      const radius = size * (0.28 + i / (count - 1) * 0.5);
      const shoulder = Math.max(2, size * 0.018);
      stops.push(`${low} ${Math.max(0, radius - shoulder)}px`, `${high} ${radius}px`, `${low} ${radius + shoulder}px`);
    }
    stops.push(`transparent ${size * 0.8}px`);
    drawing.el.style.setProperty("--pr-square", `${size * 2}px`);
    drawing.el.style.setProperty("--pr-medallion", `radial-gradient(circle,${stops.join(",")})`);
  }
  fallback();
  const shader = createShader(drawing.el, {
    fragment: PORCELAIN_FRAGMENT,
    fallback: PORCELAIN_FALLBACK,
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
