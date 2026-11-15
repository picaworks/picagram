import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ChiseledSlateProps extends MotionProps {
  /** Number of finite angular tool cuts, from 5 to 12. */
  cuts: number;
  /** Carved depth relative to each cut width, from 0.2 to 0.8. */
  depth: number;
  /** Dominant chisel direction in degrees, from 15 to 70. */
  direction: number;
  /** Raking light sweep rate, from 0 to 2. */
  speed: number;
  /** Overall foreground ink coverage, from 0.3 to 0.75. */
  intensity: number;
}

export const defaults: ChiseledSlateProps = {
  cuts: 8,
  depth: 0.5,
  direction: 45,
  speed: 0.65,
  intensity: 0.5,
  paused: false,
  time: null,
  seed: 1,
};

const SLATE_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_cuts;
  uniform float u_cut_data[84];
  uniform float u_depth;
  uniform float u_speed;
  uniform float u_intensity;

  vec2 slateChip(float position, float edge) {
    float cell = floor(position / 24.0);
    float a = pica_random(vec2(cell, edge));
    float b = pica_random(vec2(cell + 1.0, edge));
    float ha = 1.0 + a * 2.2 + step(0.79, a) * 3.5;
    float hb = 1.0 + b * 2.2 + step(0.79, b) * 3.5;
    return vec2(mix(ha, hb, fract(position / 24.0)), (hb - ha) / 24.0);
  }

  vec3 slateBoundary(vec2 q, vec2 halfSize) {
    vec2 vertical = slateChip(q.y, 19.0 + sign(q.x) * 7.0);
    vec2 horizontal = slateChip(q.x, 53.0 + sign(q.y) * 11.0);
    vec3 a = vec3(abs(q.x) - halfSize.x + vertical.x, sign(q.x), vertical.y);
    vec3 b = vec3(abs(q.y) - halfSize.y + horizontal.x, horizontal.y, sign(q.y));
    vec3 boundary = a.x > b.x ? a : b;
    vec3 corner = vec3((abs(q.x) + abs(q.y) - halfSize.x - halfSize.y + 19.0) * 0.7071068, sign(q) * 0.7071068);
    return corner.x > boundary.x ? corner : boundary;
  }

  // Each pocket is the minimum of a flat floor and four planar cut walls.
  vec4 slateRelief(vec2 q, float size) {
    float height = 0.0;
    vec2 slope = vec2(0.0);
    for (int i = 0; i < 12; i++) {
      if (float(i) >= u_cuts) break;
      int index = i * 7;
      vec2 center = vec2(u_cut_data[index], u_cut_data[index + 1]) * size;
      vec2 along = vec2(u_cut_data[index + 2], u_cut_data[index + 3]);
      vec2 across = vec2(-along.y, along.x);
      vec2 local = vec2(dot(q - center, along), dot(q - center, across));
      float length = u_cut_data[index + 4] * size;
      float width = u_cut_data[index + 5] * size;
      vec3 plane = vec3(1.0, 0.0, 0.0);
      vec3 candidate = vec3((length + local.x) / max(1.0, length * 0.3), along / max(1.0, length * 0.3));
      if (candidate.x < plane.x) plane = candidate;
      candidate = vec3((length - local.x) / max(1.0, length * 0.22), -along / max(1.0, length * 0.22));
      if (candidate.x < plane.x) plane = candidate;
      candidate = vec3((width - local.y - local.x * 0.12) / max(1.0, width * 0.72), (-across - along * 0.12) / max(1.0, width * 0.72));
      if (candidate.x < plane.x) plane = candidate;
      candidate = vec3((width + local.y + local.x * 0.06) / max(1.0, width * 0.72), (across + along * 0.06) / max(1.0, width * 0.72));
      if (candidate.x < plane.x) plane = candidate;
      float depth = u_depth * width * u_cut_data[index + 6] * 0.75;
      float cut = -depth * max(0.0, plane.x);
      if (cut < height) {
        height = cut;
        slope = -depth * plane.yz;
      }
    }
    float cavity = clamp(-height / max(0.1, u_depth * size * 0.1), 0.0, 1.0);
    float phase = pica_random(vec2(47.0, 13.0)) * 6.2831853;
    float a = q.x * 0.94 + phase;
    float b = q.y * 1.17 - phase;
    float c = q.x * 0.63 - q.y * 1.41;
    height += 0.025 * sin(a) * sin(b) + 0.012 * sin(c);
    slope += vec2(0.0235 * cos(a) * sin(b) + 0.00756 * cos(c), 0.02925 * sin(a) * cos(b) - 0.01692 * cos(c));
    return vec4(height, slope, cavity);
  }

  // Three lightward height samples locate the actual cut mouth above a recessed floor.
  float slateObstruction(vec2 q, vec4 surface, float size, vec3 light) {
    float obstruction = 0.0;
    for (int i = 1; i <= 3; i++) {
      float distance = size * 0.025 * float(i);
      float rayHeight = surface.x + light.z * distance;
      float blocker = slateRelief(q + light.xy * distance, size).x;
      obstruction = max(obstruction, clamp((blocker - rayHeight - 0.08) / max(0.5, -surface.x * 0.5), 0.0, 1.0));
    }
    return obstruction;
  }

  void main() {
    vec2 screen = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    float angle = (pica_random(vec2(11.0, 83.0)) - 0.5) * 0.14;
    mat2 turn = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 q = turn * screen;
    float size = min(u_css_size.x / 2.9, u_css_size.y / 2.45);
    vec2 halfSize = vec2(1.13, 0.84) * size;
    float aa = max(0.65, max(u_css_size.x / u_resolution.x, u_css_size.y / u_resolution.y));
    vec3 boundary = slateBoundary(q, halfSize);
    float azimuth = -0.6 + sin(u_time * u_speed * 0.18 + 0.3) * 0.8;
    vec3 light = normalize(vec3(turn * vec2(cos(azimuth), sin(azimuth)), 0.44));
    float face = 1.0 - smoothstep(-aa, aa, boundary.x);
    float side = 1.0 - smoothstep(-aa, aa, slateBoundary(q + vec2(0.0, size * 0.09), halfSize).x);
    float shadow = 1.0 - smoothstep(-aa, aa, slateBoundary(q + light.xy * size * 0.1 + vec2(0.0, size * 0.05), halfSize).x);
    float outside = u_intensity * (side * 0.23 + shadow * (1.0 - side) * 0.045);
    if (boundary.x > aa) {
      pica_color = pica_tone(outside, u_fg, 8.0);
      return;
    }
    vec4 relief = slateRelief(q, size);
    float bevel = clamp(-boundary.x / 5.0, 0.0, 1.0);
    vec2 slope = relief.yz;
    if (boundary.x < 0.0 && boundary.x > -5.0) slope -= boundary.yz * 0.7;
    vec3 normal = normalize(vec3(-clamp(slope, vec2(-6.0), vec2(6.0)), 1.0));
    vec3 halfway = normalize(light + normalize(vec3(-0.3, -0.2, 1.5)));
    float diffuse = max(0.0, dot(normal, light));
    float reflection = pow(max(0.0, dot(normal, halfway)), 12.0);
    float obstruction = slateObstruction(q, relief, size, light);
    float cut = clamp(relief.w * 4.0, 0.0, 1.0);
    float wall = smoothstep(0.08, 0.35, length(relief.yz));
    float floor = relief.w * (1.0 - wall);
    float mouth = wall * (1.0 - smoothstep(0.5, 2.5, max(0.0, -relief.x)));
    float visibility = 1.0 - cut * obstruction * 0.52;
    visibility = mix(visibility, 1.0, mouth * diffuse * 0.5);
    float body = 0.055 + (1.0 - diffuse) * 0.21 + reflection * 0.04;
    float tone = u_intensity * (body * visibility * (1.0 - floor * 0.28) + (1.0 - bevel) * 0.18);
    pica_color = pica_tone(clamp(mix(outside, tone, face), 0.0, 0.7), u_fg, 8.0);
  }
`;

const SLATE_FALLBACK = [
  `linear-gradient(var(--sl-angle),transparent 23%,color-mix(in srgb,${cssVar("fg")} 9%,transparent) 23% 42%,color-mix(in srgb,${cssVar("fg")} 23%,transparent) 42% 54%,transparent 54%) 39% 42% / calc(var(--sl-width) * .68) calc(var(--sl-height) * .7) no-repeat`,
  `linear-gradient(calc(var(--sl-angle) + 17deg),transparent 30%,color-mix(in srgb,${cssVar("fg")} 21%,transparent) 30% 48%,color-mix(in srgb,${cssVar("fg")} 8%,transparent) 48% 62%,transparent 62%) 59% 59% / calc(var(--sl-width) * .64) calc(var(--sl-height) * .74) no-repeat`,
  `linear-gradient(color-mix(in srgb,${cssVar("fg")} var(--sl-fill),${cssVar("bg")}),color-mix(in srgb,${cssVar("fg")} var(--sl-fill),${cssVar("bg")})) center / var(--sl-width) var(--sl-height) no-repeat`,
  `linear-gradient(color-mix(in srgb,${cssVar("fg")} 16%,transparent),color-mix(in srgb,${cssVar("fg")} 16%,transparent)) 50% calc(50% + 10px) / var(--sl-width) var(--sl-height) no-repeat`,
  cssVar("bg"),
].join(",");

function slateBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<ChiseledSlateProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const drawing = layer(host, "under");
  function uniforms(): Record<string, number | readonly number[]> {
    const seed = Math.round(slateBound(props.seed, 1, 1, 99));
    const random = createRng(seed);
    const data: number[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (slateBound(props.direction, 45, 15, 70) + (random() - 0.5) * 42) * Math.PI / 180;
      data.push(((i * 5) % 4 - 1.5) * 0.45 + (random() - 0.5) * 0.16, ((i * 7) % 3 - 1) * 0.48 + (random() - 0.5) * 0.16, Math.cos(angle), Math.sin(angle), 0.28 + random() * 0.22, 0.07 + random() * 0.095, 0.45 + random() * 0.55);
    }
    return {
      u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
      u_cuts: Math.round(slateBound(props.cuts, 8, 5, 12)),
      u_cut_data: data,
      u_depth: slateBound(props.depth, 0.5, 0.2, 0.8),
      u_speed: slateBound(props.speed, 0.65, 0, 2),
      u_intensity: slateBound(props.intensity, 0.5, 0.3, 0.75),
      u_seed: seed,
    };
  }
  function fallback(): void {
    const size = Math.min(Math.max(1, host.clientWidth) / 2.9, Math.max(1, host.clientHeight) / 2.45);
    drawing.el.style.setProperty("--sl-width", `${size * 2.26}px`);
    drawing.el.style.setProperty("--sl-height", `${size * 1.68}px`);
    drawing.el.style.setProperty("--sl-angle", `${slateBound(props.direction, 45, 15, 70)}deg`);
    drawing.el.style.setProperty("--sl-fill", `${slateBound(props.intensity, 0.5, 0.3, 0.75) * 21}%`);
  }
  fallback();
  const shader = createShader(drawing.el, {
    fragment: SLATE_FRAGMENT,
    fallback: SLATE_FALLBACK,
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
