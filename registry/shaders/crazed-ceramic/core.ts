import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface CrazedCeramicProps extends MotionProps {
  /** Typical glaze fracture spacing in CSS pixels, from 36 to 110. */
  cellSize: number;
  /** Half-width of a recessed crack groove in CSS pixels, from 0.4 to 2. */
  crackWidth: number;
  /** Glaze polish and reflection sharpness, from 0.25 to 0.8. */
  glaze: number;
  /** Grazing light sweep rate, from 0 to 2. */
  speed: number;
  /** Overall foreground ink coverage, from 0.3 to 0.75. */
  intensity: number;
}

export const defaults: CrazedCeramicProps = {
  cellSize: 70,
  crackWidth: 1,
  glaze: 0.55,
  speed: 0.65,
  intensity: 0.5,
  paused: false,
  time: null,
  seed: 1,
};

const CERAMIC_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_cell_size;
  uniform float u_crack_width;
  uniform float u_glaze;
  uniform float u_speed;
  uniform float u_intensity;

  vec2 ceramicJunction(vec2 id, float type) {
    vec2 jitter = vec2(pica_random(id + vec2(17.0 + type * 31.0, 61.0)), pica_random(id + vec2(83.0, 29.0 + type * 47.0)));
    return id + mix(vec2(0.23, 0.30), vec2(0.75, 0.72), type) + (jitter - 0.5) * 0.30;
  }

  vec4 ceramicSegment(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    float t = clamp(dot(p - a, ab) / max(0.0001, dot(ab, ab)), 0.0, 1.0);
    vec2 delta = p - a - ab * t;
    return vec4(delta, dot(delta, delta), (ab.x * delta.y - ab.y * delta.x) / max(0.0001, length(ab)));
  }

  // One cut combines unequal flanks, a recessed core and a raised glaze lip.
  vec3 ceramicGroove(vec4 nearest, float width, mat2 jacobian) {
    float radial = sqrt(max(0.0, nearest.z));
    float distance = radial * u_cell_size;
    float side = nearest.w < 0.0 ? -1.0 : 1.0;
    float signedDistance = distance * side;
    vec2 gradient = transpose(jacobian) * nearest.xy / max(0.0001, radial);
    float flankWidth = width * (side > 0.0 ? 1.4 : 0.85);
    float bowl = max(0.0, 1.0 - distance * distance / max(0.01, flankWidth * flankWidth));
    float depth = width * 0.66;
    float height = -depth * bowl * bowl;
    vec2 slope = 4.0 * depth * bowl * distance / max(0.01, flankWidth * flankWidth) * gradient;
    float coreWidth = width * 0.35;
    float core = max(0.0, 1.0 - distance * distance / max(0.01, coreWidth * coreWidth));
    height -= width * 0.26 * core * core;
    slope += 4.0 * width * 0.26 * core * distance / max(0.01, coreWidth * coreWidth) * gradient;
    float lipWidth = width * 0.65;
    float lipDistance = signedDistance - width * 0.95;
    float lip = max(0.0, 1.0 - lipDistance * lipDistance / max(0.01, lipWidth * lipWidth));
    float lipHeight = width * (0.1 + u_glaze * 0.12);
    height += lipHeight * lip * lip * lip;
    slope -= 6.0 * lipHeight * lip * lip * lipDistance / max(0.01, lipWidth * lipWidth) * gradient * side;
    return vec3(height, slope);
  }

  vec4 ceramicRelief(vec2 q) {
    vec2 p = q / u_cell_size;
    float seedPhase = pica_random(vec2(7.0, 53.0)) * 6.2831853;
    float ax = p.y * 1.7 + 0.4 * sin(p.x * 0.9 + seedPhase);
    float ay = p.x * 1.3 + 0.3 * sin(p.y * 1.1 - seedPhase);
    vec2 warped = p + vec2(sin(ax), sin(ay)) * 0.16;
    mat2 jacobian = mat2(
      1.0 + 0.0576 * cos(ax) * cos(p.x * 0.9 + seedPhase), 0.208 * cos(ay),
      0.272 * cos(ax), 1.0 + 0.0528 * cos(ay) * cos(p.y * 1.1 - seedPhase)
    );
    vec2 cell = floor(warped);
    vec4 nearest = vec4(0.0, 0.0, 1000.0, 0.0);
    vec4 junction = nearest;
    // Each three-way junction connects to the next staggered row, rather than outlining cells.
    for (int y = 0; y <= 1; y++) {
      for (int x = 0; x <= 1; x++) {
        vec2 id = cell + vec2(float(x), float(y));
        vec2 a = ceramicJunction(id, 0.0);
        vec4 d = ceramicSegment(warped, a, ceramicJunction(id, 1.0));
        if (d.z < nearest.z) nearest = d;
        d = ceramicSegment(warped, a, ceramicJunction(id - vec2(1.0, 0.0), 1.0));
        if (d.z < nearest.z) nearest = d;
        d = ceramicSegment(warped, a, ceramicJunction(id - vec2(0.0, 1.0), 1.0));
        if (d.z < nearest.z) nearest = d;
        vec2 delta = warped - a;
        if (pica_random(id + vec2(37.0, 97.0)) > 0.78 && dot(delta, delta) < junction.z) junction = vec4(delta, dot(delta, delta), delta.x);
      }
    }
    vec3 groove = ceramicGroove(nearest, u_crack_width, jacobian);
    vec3 wider = ceramicGroove(junction, u_crack_width * 1.65, jacobian);
    if (wider.x < min(0.0, groove.x)) groove = wider;
    float a = q.x * 0.027 + seedPhase;
    float b = q.y * 0.031 - seedPhase;
    float c = q.x * 0.061 - q.y * 0.047;
    float height = 3.8 * sin(a) * sin(b) + 0.65 * sin(c);
    vec2 slope = vec2(0.1026 * cos(a) * sin(b) + 0.03965 * cos(c), 0.1178 * sin(a) * cos(b) - 0.03055 * cos(c));
    return vec4(groove + vec3(height, slope), clamp(-groove.x / max(0.15, u_crack_width * 0.85), 0.0, 1.0));
  }

  vec3 ceramicBoundary(vec2 q, vec2 halfSize) {
    vec2 d = abs(q) - halfSize + 7.0;
    vec2 outside = max(d, 0.0);
    float distance = length(outside) + min(max(d.x, d.y), 0.0) - 7.0;
    vec2 gradient = length(outside) > 0.0001 ? outside / max(0.0001, length(outside)) * sign(q) : (d.x > d.y ? vec2(sign(q.x), 0.0) : vec2(0.0, sign(q.y)));
    return vec3(distance, gradient);
  }

  void main() {
    vec2 screen = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    float angle = (pica_random(vec2(13.0, 41.0)) - 0.5) * 0.16;
    mat2 turn = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 q = turn * screen;
    float size = min(u_css_size.x / 2.8, u_css_size.y / 2.4);
    vec2 halfSize = vec2(1.15, 0.82) * size;
    float aa = max(0.65, max(u_css_size.x / u_resolution.x, u_css_size.y / u_resolution.y));
    vec3 boundary = ceramicBoundary(q, halfSize);
    float motion = u_time * u_speed * 0.19;
    float azimuth = 0.55 + sin(motion + 0.4) * 0.65;
    vec3 light = normalize(vec3(turn * vec2(cos(azimuth), sin(azimuth)), 0.58));
    float face = 1.0 - smoothstep(-aa, aa, boundary.x);
    float side = 1.0 - smoothstep(-aa, aa, ceramicBoundary(q + vec2(0.0, 7.0), halfSize).x);
    float shadow = 1.0 - smoothstep(-aa, aa, ceramicBoundary(q + light.xy * 11.0 + vec2(0.0, 3.0), halfSize).x);
    if (boundary.x > aa) {
      pica_color = pica_tone(u_intensity * (side * 0.18 + shadow * (1.0 - side) * 0.05), u_fg, 8.0);
      return;
    }
    vec4 relief = ceramicRelief(q);
    float bevel = clamp(-boundary.x / 7.0, 0.0, 1.0);
    vec2 slope = relief.yz - boundary.yz * (3.2 * 6.0 * bevel * (1.0 - bevel) / 7.0);
    vec3 normal = normalize(vec3(-clamp(slope, vec2(-6.0), vec2(6.0)), 1.0));
    vec3 view = normalize(vec3(-0.48, -0.32, 1.4));
    vec3 halfway = normalize(light + view);
    float diffuse = max(0.0, dot(normal, light));
    float reflection = pow(max(0.0, dot(normal, halfway)), mix(14.0, 72.0, u_glaze));
    float cavity = relief.w;
    float body = 0.055 + diffuse * (0.15 - u_glaze * 0.04);
    float glazeReflection = reflection * (0.12 + u_glaze * 0.32) * (1.0 - cavity * 0.9);
    float tone = u_intensity * (body * (1.0 - cavity * 0.65) + glazeReflection + (1.0 - bevel) * 0.1);
    tone = mix(u_intensity * (side * 0.18 + shadow * (1.0 - side) * 0.05), tone, face);
    pica_color = pica_tone(clamp(tone, 0.0, 0.7), u_fg, 8.0);
  }
`;

const CERAMIC_FALLBACK = [
  `repeating-linear-gradient(74deg,transparent 0 calc(var(--cc-cell) - 1px),color-mix(in srgb,${cssVar("fg")} 20%,transparent) calc(var(--cc-cell) - 1px) var(--cc-cell)) center / var(--cc-width) var(--cc-height) no-repeat`,
  `repeating-linear-gradient(148deg,transparent 0 calc(var(--cc-cell) * 1.3 - 1px),color-mix(in srgb,${cssVar("fg")} 14%,transparent) calc(var(--cc-cell) * 1.3 - 1px) calc(var(--cc-cell) * 1.3)) center / var(--cc-width) var(--cc-height) no-repeat`,
  `linear-gradient(138deg,color-mix(in srgb,${cssVar("fg")} var(--cc-fill),${cssVar("bg")}),color-mix(in srgb,${cssVar("fg")} 7%,${cssVar("bg")})) center / var(--cc-width) var(--cc-height) no-repeat`,
  `linear-gradient(color-mix(in srgb,${cssVar("fg")} 14%,transparent),color-mix(in srgb,${cssVar("fg")} 14%,transparent)) calc(50% + 3px) calc(50% + 6px) / var(--cc-width) var(--cc-height) no-repeat`,
  cssVar("bg"),
].join(",");

function ceramicBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<CrazedCeramicProps> = (host, initial = {}) => {
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
      u_cell_size: ceramicBound(props.cellSize, 70, 36, 110),
      u_crack_width: ceramicBound(props.crackWidth, 1, 0.4, 2),
      u_glaze: ceramicBound(props.glaze, 0.55, 0.25, 0.8),
      u_speed: ceramicBound(props.speed, 0.65, 0, 2),
      u_intensity: ceramicBound(props.intensity, 0.5, 0.3, 0.75),
      u_seed: Math.round(ceramicBound(props.seed, 1, 1, 99)),
    };
  }
  function fallback(): void {
    const size = Math.min(Math.max(1, host.clientWidth) / 2.8, Math.max(1, host.clientHeight) / 2.4);
    drawing.el.style.setProperty("--cc-width", `${size * 2.3}px`);
    drawing.el.style.setProperty("--cc-height", `${size * 1.64}px`);
    drawing.el.style.setProperty("--cc-cell", `${ceramicBound(props.cellSize, 70, 36, 110)}px`);
    drawing.el.style.setProperty("--cc-fill", `${ceramicBound(props.intensity, 0.5, 0.3, 0.75) * 26}%`);
  }
  fallback();
  const shader = createShader(drawing.el, {
    fragment: CERAMIC_FRAGMENT,
    fallback: CERAMIC_FALLBACK,
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
