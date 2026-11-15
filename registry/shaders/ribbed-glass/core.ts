import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface RibbedGlassProps extends MotionProps {
  /** Number of broad vertical cylindrical ribs across the slab, from 6 to 18. */
  ribs: number;
  /** Cylindrical rib relief relative to its pitch, from 0.2 to 0.65. */
  depth: number;
  /** Refractive index above air, from 0.15 to 0.5. */
  refraction: number;
  /** Specular light sweep rate, from 0 to 2. */
  speed: number;
  /** Overall foreground ink coverage, from 0.3 to 0.75. */
  intensity: number;
}

export const defaults: RibbedGlassProps = {
  ribs: 10,
  depth: 0.45,
  refraction: 0.35,
  speed: 0.65,
  intensity: 0.5,
  paused: false,
  time: null,
  seed: 1,
};

const GLASS_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_ribs;
  uniform float u_depth;
  uniform float u_refraction;
  uniform float u_speed;
  uniform float u_intensity;

  vec3 glassBoundary(vec2 q, vec2 halfSize) {
    vec2 d = abs(q) - halfSize + 5.0;
    vec2 outside = max(d, 0.0);
    float distance = length(outside) + min(max(d.x, d.y), 0.0) - 5.0;
    vec2 gradient = length(outside) > 0.0001 ? outside / max(0.0001, length(outside)) * sign(q) : (d.x > d.y ? vec2(sign(q.x), 0.0) : vec2(0.0, sign(q.y)));
    return vec3(distance, gradient);
  }

  float glassPrint(vec2 p, float pitch, float aa) {
    mat2 turn = mat2(0.9659258, -0.258819, 0.258819, 0.9659258);
    vec2 offset = vec2(pica_random(vec2(17.0, 43.0)), pica_random(vec2(71.0, 29.0))) * pitch;
    vec2 local = turn * p + offset;
    vec2 distance = abs(fract(local / pitch + 0.5) - 0.5) * pitch;
    float thin = 1.0 - smoothstep(0.45, 0.45 + aa, min(distance.x, distance.y));
    vec2 major = abs(fract(local / (pitch * 4.0) + 0.5) - 0.5) * pitch * 4.0;
    float heavy = 1.0 - smoothstep(0.75, 0.75 + aa, min(major.x, major.y));
    return max(thin * 0.72, heavy);
  }

  // Height and slope describe the same circular arc, tapered into the slab's bevel.
  vec3 glassSurface(vec2 q, vec2 halfSize, vec3 boundary, float size) {
    float pitch = halfSize.x * 2.0 / u_ribs;
    float local = (fract((q.x + halfSize.x) / pitch) - 0.5) * pitch;
    float radius = pitch * 0.53;
    float cap = sqrt(max(0.0001, radius * radius - local * local));
    float edgeCap = sqrt(max(0.0001, radius * radius - pitch * pitch * 0.25));
    float rib = u_depth * (cap - edgeCap);
    float ribSlope = -u_depth * local / max(0.01, cap);
    float width = max(5.0, size * 0.035);
    float t = clamp(-boundary.x / width, 0.0, 1.0);
    float bevel = t * t * (3.0 - 2.0 * t);
    float derivative = 6.0 * t * (1.0 - t) / width;
    float base = size * 0.07;
    float height = base * bevel + rib * bevel * bevel;
    vec2 slope = vec2(ribSlope, 0.0) * bevel * bevel - boundary.yz * (base + rib * bevel * 2.0) * derivative;
    return vec3(height, slope);
  }

  void main() {
    vec2 screen = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    float angle = (pica_random(vec2(31.0, 59.0)) - 0.5) * 0.12;
    mat2 turn = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 q = turn * screen;
    float size = min(u_css_size.x / 2.9, u_css_size.y / 2.5);
    vec2 halfSize = vec2(1.13, 0.88) * size;
    float aa = max(0.7, max(u_css_size.x / u_resolution.x, u_css_size.y / u_resolution.y));
    vec3 boundary = glassBoundary(q, halfSize);
    float face = 1.0 - smoothstep(-aa, aa, boundary.x);
    vec2 viewSlope = vec2(-0.2, 0.13);
    float thickness = size * 0.045;
    float printGap = size * 0.08;
    float card = 1.0 - smoothstep(-aa, aa, glassBoundary(q, halfSize + size * 0.1).x);
    float pitch = max(30.0, size * 0.28);
    vec2 plainPoint = q - viewSlope * (thickness + printGap);
    float outside = glassPrint(plainPoint, pitch, aa) * card * u_intensity * 0.045;
    vec3 rearBoundary = glassBoundary(q - viewSlope * thickness, halfSize);
    float rear = (1.0 - smoothstep(-aa, aa, rearBoundary.x)) * (1.0 - face);
    float azimuth = 0.3 + sin(u_time * u_speed * 0.23 + 0.35) * 0.75;
    vec3 light = normalize(vec3(turn * vec2(cos(azimuth), sin(azimuth)), 0.85));
    vec3 sideNormal = normalize(vec3(rearBoundary.yz, 0.0));
    float sideLight = max(0.0, dot(sideNormal, light));
    float outsideTone = outside + rear * u_intensity * (0.1 + sideLight * 0.18);
    if (boundary.x > aa) {
      pica_color = pica_tone(outsideTone, u_fg, 8.0);
      return;
    }
    // Follow the oblique view through the same rounded front height field.
    vec2 surfacePoint = q;
    for (int i = 0; i < 3; i++) {
      vec3 localBoundary = glassBoundary(surfacePoint, halfSize);
      vec3 localSurface = glassSurface(surfacePoint, halfSize, localBoundary, size);
      surfacePoint = q + viewSlope * localSurface.x;
    }
    vec3 surfaceBoundary = glassBoundary(surfacePoint, halfSize);
    vec3 surface = glassSurface(surfacePoint, halfSize, surfaceBoundary, size);
    vec3 normal = normalize(vec3(-clamp(surface.yz, vec2(-6.0), vec2(6.0)), 1.0));
    vec3 incident = normalize(vec3(-viewSlope, -1.0));
    vec3 view = -incident;
    float index = 1.0 + u_refraction;
    vec3 inside = refract(incident, normal, 1.0 / index);
    float path = (surface.x + thickness) / max(0.12, -inside.z);
    vec2 exitPoint = surfacePoint + inside.xy * path;
    vec3 outgoing = refract(inside, vec3(0.0, 0.0, 1.0), index);
    float transmission = step(0.01, dot(outgoing, outgoing));
    vec2 printedPoint = exitPoint + outgoing.xy * (printGap / max(0.12, -outgoing.z));
    float through = glassPrint(printedPoint, pitch, aa) * transmission;
    vec3 halfway = normalize(light + view);
    float alignment = clamp(dot(normal, halfway), 0.0, 1.0);
    float broadReflection = pow(alignment, 7.0);
    float reflection = pow(alignment, 48.0);
    float diffuse = max(0.0, dot(normal, light));
    float f0 = (index - 1.0) / (index + 1.0);
    f0 *= f0;
    float grazing = 1.0 - clamp(dot(normal, view), 0.0, 1.0);
    float fresnel = f0 + (1.0 - f0) * pow(grazing, 5.0);
    float turning = 1.0 - clamp(normal.z, 0.0, 1.0);
    float valley = turning * turning * (0.3 + (1.0 - diffuse) * 0.7);
    float rim = 1.0 - smoothstep(0.0, max(5.0, size * 0.035), -surfaceBoundary.x);
    float body = 0.012 + broadReflection * 0.24 + reflection * 0.14 + valley * 0.13 + fresnel * 0.12;
    body += rim * 0.1 * (0.4 + diffuse * 0.6);
    float tone = u_intensity * (through * 0.07 * (1.0 - fresnel) + body);
    pica_color = pica_tone(clamp(mix(outsideTone, tone, face), 0.0, 0.6), u_fg, 8.0);
  }

`;

const GLASS_FALLBACK = [
  `repeating-linear-gradient(90deg,color-mix(in srgb,${cssVar("fg")} 4%,transparent) 0,color-mix(in srgb,${cssVar("fg")} 23%,transparent) calc(var(--rg-pitch) * .34),color-mix(in srgb,${cssVar("fg")} 8%,transparent) calc(var(--rg-pitch) * .68),transparent calc(var(--rg-pitch) * .94) var(--rg-pitch)) center / var(--rg-width) var(--rg-height) no-repeat`,
  `linear-gradient(90deg,color-mix(in srgb,${cssVar("fg")} 25%,transparent) 0 3px,transparent 3px calc(100% - 3px),color-mix(in srgb,${cssVar("fg")} 25%,transparent) calc(100% - 3px) 100%) center / var(--rg-width) var(--rg-height) no-repeat`,
  `linear-gradient(0deg,color-mix(in srgb,${cssVar("fg")} 25%,transparent) 0 3px,transparent 3px calc(100% - 3px),color-mix(in srgb,${cssVar("fg")} 25%,transparent) calc(100% - 3px) 100%) center / var(--rg-width) var(--rg-height) no-repeat`,
  `repeating-linear-gradient(105deg,transparent 0 calc(var(--rg-grid) - 1px),color-mix(in srgb,${cssVar("fg")} 4%,transparent) calc(var(--rg-grid) - 1px) var(--rg-grid)) center / var(--rg-card-width) var(--rg-card-height) no-repeat`,
  `repeating-linear-gradient(15deg,transparent 0 calc(var(--rg-grid) - 1px),color-mix(in srgb,${cssVar("fg")} 4%,transparent) calc(var(--rg-grid) - 1px) var(--rg-grid)) center / var(--rg-card-width) var(--rg-card-height) no-repeat`,
  cssVar("bg"),
].join(",");

function glassBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<RibbedGlassProps> = (host, initial = {}) => {
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
      u_ribs: Math.round(glassBound(props.ribs, 10, 6, 18)),
      u_depth: glassBound(props.depth, 0.45, 0.2, 0.65),
      u_refraction: glassBound(props.refraction, 0.35, 0.15, 0.5),
      u_speed: glassBound(props.speed, 0.65, 0, 2),
      u_intensity: glassBound(props.intensity, 0.5, 0.3, 0.75),
      u_seed: Math.round(glassBound(props.seed, 1, 1, 99)),
    };
  }
  function fallback(): void {
    const size = Math.min(Math.max(1, host.clientWidth) / 2.9, Math.max(1, host.clientHeight) / 2.5);
    drawing.el.style.setProperty("--rg-width", `${size * 2.26}px`);
    drawing.el.style.setProperty("--rg-height", `${size * 1.76}px`);
    drawing.el.style.setProperty("--rg-card-width", `${size * 2.46}px`);
    drawing.el.style.setProperty("--rg-card-height", `${size * 1.96}px`);
    drawing.el.style.setProperty("--rg-pitch", `${size * 2.26 / Math.round(glassBound(props.ribs, 10, 6, 18))}px`);
    drawing.el.style.setProperty("--rg-grid", `${Math.max(30, size * 0.28)}px`);
  }
  fallback();
  const shader = createShader(drawing.el, {
    fragment: GLASS_FRAGMENT,
    fallback: GLASS_FALLBACK,
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
