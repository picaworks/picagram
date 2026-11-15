import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface KnurledDrumProps extends MotionProps {
  /** Typical diamond spacing in CSS pixels, from 16 to 48. */
  pitch: number;
  /** Raised facet depth relative to the diamond spacing, from 0.15 to 0.6. */
  relief: number;
  /** Crossing groove angle along the cylinder in degrees, from 10 to 55. */
  angle: number;
  /** Rotation rate around the drum axis, from 0 to 2. */
  speed: number;
  /** Overall foreground ink coverage, from 0.3 to 0.75. */
  intensity: number;
}

export const defaults: KnurledDrumProps = {
  pitch: 28,
  relief: 0.4,
  angle: 35,
  speed: 0.7,
  intensity: 0.55,
  paused: false,
  time: null,
  seed: 1,
};

const DRUM_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_pitch;
  uniform float u_relief;
  uniform float u_angle;
  uniform float u_speed;
  uniform float u_intensity;

  vec2 drumRoots(vec3 ro, vec3 rd, float radius) {
    float a = max(dot(rd.yz, rd.yz), 0.001);
    float b = dot(ro.yz, rd.yz);
    float d = b * b - a * (dot(ro.yz, ro.yz) - radius * radius);
    if (d < 0.0) return vec2(100.0);
    float root = sqrt(max(0.0, d));
    return vec2(-b - root, -b + root) / a;
  }

  // Four planar faces meet at each diamond peak. Circumferential periods are integral.
  vec3 drumRelief(vec3 p, vec2 frequency, float rotation) {
    float arc = atan(p.y, p.z) * 0.64 - rotation;
    vec2 cell = vec2(p.x * frequency.x + arc * frequency.y, p.x * frequency.x - arc * frequency.y);
    vec2 saw = fract(cell) * 2.0 - 1.0;
    vec2 height = 1.0 - abs(saw);
    bool first = height.x < height.y;
    float slope = -2.0 * (first ? sign(saw.x) : sign(saw.y));
    return vec3(min(height.x, height.y), slope * frequency.x, slope * frequency.y * (first ? 1.0 : -1.0));
  }

  vec3 drumNormal(vec3 p, vec3 relief, float amplitude) {
    float radius = max(length(p.yz), 0.01);
    float square = max(dot(p.yz, p.yz), 0.0001);
    vec2 tangent = vec2(p.z, -p.y) * 0.64 / square;
    vec2 radial = p.yz / radius - amplitude * relief.z * tangent;
    return normalize(vec3(-amplitude * relief.y, radial));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_css_size.x / max(1.0, u_css_size.y);
    float roll = 0.25 + 0.7 * (1.0 - smoothstep(0.8, 1.3, aspect));
    float yaw = 0.55;
    vec3 axis = vec3(cos(roll) * cos(yaw), sin(roll) * cos(yaw), sin(yaw));
    vec3 up = vec3(-sin(roll), cos(roll), 0.0);
    vec3 front = cross(axis, up);
    mat3 basis = mat3(axis, up, front);
    vec2 bounds = 1.4 * abs(axis.xy) + 0.72 * sqrt(max(vec2(0.0), vec2(1.0) - axis.xy * axis.xy));
    float scale = min(u_css_size.x / (bounds.x * 2.0 + 0.45), u_css_size.y / (bounds.y * 2.0 + 0.45));
    vec2 screen = (uv - 0.5) * u_css_size / max(scale, 1.0);
    if (any(greaterThan(abs(screen), bounds + 0.015))) {
      pica_color = pica_tone(0.0, u_fg, 8.0);
      return;
    }
    vec3 ro = transpose(basis) * vec3(screen, 5.0);
    vec3 rd = transpose(basis) * vec3(0.0, 0.0, -1.0);
    float pitch = u_pitch / max(scale, 1.0);
    float circum = max(4.0, floor(6.2831853 * 0.64 * cos(radians(u_angle)) / max(pitch, 0.025) + 0.5));
    float around = circum / (6.2831853 * 0.64);
    vec2 frequency = vec2(around * tan(radians(u_angle)), around);
    float amplitude = min(0.055, u_relief * pitch * 0.38);
    float rotation = u_time * u_speed * 0.12 + u_seed * 0.193;
    float nearest = 100.0;
    vec3 normal = vec3(0.0, 0.0, 1.0);
    float height = 0.0;
    float material = 0.0;

    vec2 body = drumRoots(ro, rd, 0.64 + amplitude);
    if (body.x < 90.0) {
      float t = max(0.0, body.x);
      for (int i = 0; i < 6; i++) {
        vec3 p = ro + rd * t;
        vec3 relief = drumRelief(p, frequency, rotation);
        vec3 gradient = drumNormal(p, relief, amplitude);
        float error = length(p.yz) - 0.64 - amplitude * relief.x;
        float denominator = -max(0.12, abs(dot(gradient, rd)));
        t -= clamp(error / denominator, -0.12, 0.12);
      }
      vec3 p = ro + rd * t;
      vec3 relief = drumRelief(p, frequency, rotation);
      float error = abs(length(p.yz) - 0.64 - amplitude * relief.x);
      if (t > 0.0 && t <= body.y && abs(p.x) <= 1.12 && error < 0.009) {
        nearest = t;
        normal = drumNormal(p, relief, amplitude);
        height = relief.x;
      }
    }

    vec2 rings = drumRoots(ro, rd, 0.72);
    for (int i = 0; i < 2; i++) {
      float t = i == 0 ? rings.x : rings.y;
      vec3 p = ro + rd * t;
      if (t > 0.0 && t < nearest && abs(p.x) >= 1.12 && abs(p.x) <= 1.4) {
        nearest = t;
        normal = normalize(vec3(0.0, p.yz));
        material = 1.0;
      }
    }
    for (int i = 0; i < 4; i++) {
      float side = i < 2 ? -1.0 : 1.0;
      float edge = (i % 2 == 0) ? 1.12 : 1.4;
      float t = (side * edge - ro.x) / min(-0.01, rd.x);
      vec3 p = ro + rd * t;
      float radial = length(p.yz);
      bool shoulder = edge < 1.3;
      if (t > 0.0 && t < nearest && radial <= 0.72 && (!shoulder || radial >= 0.64 + amplitude)) {
        nearest = t;
        float bevel = smoothstep(0.67, 0.72, radial) * 0.45;
        normal = normalize(vec3(side * (1.0 - bevel), p.yz / max(radial, 0.01) * bevel));
        material = 2.0;
      }
    }
    if (nearest > 90.0) {
      pica_color = pica_tone(0.0, u_fg, 8.0);
      return;
    }
    vec3 p = ro + rd * nearest;
    vec3 worldNormal = normalize(basis * normal);
    vec3 light = normalize(vec3(-0.65 + sin(u_time * u_speed * 0.08) * 0.1, 0.8, 0.45));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float diffuse = max(0.0, dot(worldNormal, light));
    float specular = pow(clamp(dot(worldNormal, halfway), 0.0, 1.0), material > 0.5 ? 34.0 : 24.0);
    float occlusion = material < 0.5 ? 0.7 + 0.3 * height : 1.0;
    float tone = u_intensity * (0.07 + diffuse * 0.25 + specular * 0.42) * occlusion;
    if (material > 0.5 && material < 1.5) {
      float seam = 1.0 - smoothstep(0.0, 0.018, abs(abs(p.x) - 1.14));
      tone *= 1.0 - seam * 0.4;
    }
    pica_color = pica_tone(clamp(tone, 0.0, 0.7), u_fg, 8.0);
  }
`;

function drumBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<KnurledDrumProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const drawing = layer(host, "under");
  const fallback = document.createElement("div");
  fallback.setAttribute("data-pica", "");
  fallback.setAttribute("aria-hidden", "true");
  fallback.style.cssText = "position:absolute;left:17%;top:30%;width:66%;height:40%;border-radius:12% / 50%;transform:rotate(-16deg);pointer-events:none";
  for (const side of ["left", "right"]) {
    const ring = document.createElement("div");
    ring.setAttribute("data-pica", "");
    ring.style.cssText = `position:absolute;top:0;${side}:0;width:${side === "right" ? 20 : 12}%;height:100%;border-radius:50%;border:1px solid color-mix(in srgb,${cssVar("fg")} 38%,transparent);background:linear-gradient(90deg,color-mix(in srgb,${cssVar("fg")} 7%,${cssVar("bg")}),color-mix(in srgb,${cssVar("fg")} 22%,${cssVar("bg")}))`;
    fallback.append(ring);
  }
  function uniforms(): Record<string, number | readonly number[]> {
    return {
      u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
      u_pitch: drumBound(props.pitch, 28, 16, 48),
      u_relief: drumBound(props.relief, 0.4, 0.15, 0.6),
      u_angle: drumBound(props.angle, 35, 10, 55),
      u_speed: drumBound(props.speed, 0.7, 0, 2),
      u_intensity: drumBound(props.intensity, 0.55, 0.3, 0.75),
      u_seed: Math.round(drumBound(props.seed, 1, 1, 99)),
    };
  }
  function refreshFallback(): void {
    const pitch = drumBound(props.pitch, 28, 16, 48);
    const angle = drumBound(props.angle, 35, 10, 55);
    const ink = `color-mix(in srgb,${cssVar("fg")} 22%,transparent)`;
    fallback.style.background = `repeating-linear-gradient(${angle}deg,transparent 0 ${pitch - 1}px,${ink} ${pitch - 1}px ${pitch}px),repeating-linear-gradient(${-angle}deg,transparent 0 ${pitch - 1}px,${ink} ${pitch - 1}px ${pitch}px),linear-gradient(0deg,color-mix(in srgb,${cssVar("fg")} 4%,${cssVar("bg")}),color-mix(in srgb,${cssVar("fg")} 22%,${cssVar("bg")}) 48%,color-mix(in srgb,${cssVar("fg")} 6%,${cssVar("bg")}))`;
    fallback.style.display = shader.ok ? "none" : "block";
  }
  const shader = createShader(drawing.el, {
    fragment: DRUM_FRAGMENT,
    fallback: cssVar("bg"),
    uniforms: uniforms(),
    maxDpr: 1,
    css: "image-rendering:pixelated",
    onInvalidate: () => {
      if (!alive) return;
      refreshFallback();
      shader.set("u_css_size", [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)]);
      loop?.redraw();
    },
  });
  drawing.el.append(fallback);
  refreshFallback();
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
      for (const [name, value] of Object.entries(uniforms())) shader.set(name, value);
      refreshFallback();
      loop?.update({ paused: props.paused, time: props.time });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      shader.destroy();
      fallback.remove();
      drawing.remove();
      attributes.restore();
    },
  };
};
