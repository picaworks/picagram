import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface SandRipplesProps extends MotionProps {
  /** Typical wind ripple spacing in CSS pixels, from 25 to 70. */
  spacing: number;
  /** Height of the asymmetric ripple relief, from 0.2 to 0.7. */
  relief: number;
  /** Wind direction across the dune patch in degrees, from 10 to 60. */
  wind: number;
  /** Grazing light sweep and slight crest drift rate, from 0 to 2. */
  speed: number;
  /** Foreground sand ink coverage, from 0.3 to 0.75. */
  intensity: number;
}

export const defaults: SandRipplesProps = {
  spacing: 44,
  relief: 0.45,
  wind: 28,
  speed: 0.65,
  intensity: 0.5,
  paused: false,
  time: null,
  seed: 1,
};

const SAND_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_spacing;
  uniform float u_relief;
  uniform float u_wind;
  uniform float u_speed;
  uniform float u_intensity;

  float sandSize() {
    return min(u_css_size.x / 2.9, u_css_size.y / 2.4);
  }

  vec4 sandSurface(vec2 q) {
    float size = max(1.0, sandSize());
    vec2 halfSize = vec2(1.15, 0.85) * size;
    float mound = max(0.0, 1.0 - dot(q / halfSize, q / halfSize));
    vec2 moundSlope = -2.0 * q / (halfSize * halfSize);
    float angle = u_wind * 0.017453293;
    vec2 wind = vec2(cos(angle), sin(angle));
    vec2 along = vec2(-wind.y, wind.x);
    float d = dot(q, wind) / u_spacing;
    float a = dot(q, along) / u_spacing;
    float seeded = pica_random(vec2(37.0, 19.0)) * 6.2831853;
    float warpA = a * 0.82 + seeded;
    float warpB = a * 1.7 - d * 0.12;
    float phase = d + 0.15 * sin(warpA) + 0.05 * sin(warpB) - 0.025 * sin(u_time * u_speed * 0.35);
    vec2 phaseSlope = (wind * (1.0 - 0.006 * cos(warpB)) + along * (0.123 * cos(warpA) + 0.085 * cos(warpB))) / u_spacing;
    float position = fract(phase);
    float crest = 0.73;
    float fraction = position < crest ? position / crest : (position - crest) / (1.0 - crest);
    float rounded = fraction * fraction * (3.0 - 2.0 * fraction);
    float profile = position < crest ? rounded : 1.0 - rounded;
    float profileSlope = 6.0 * fraction * (1.0 - fraction) * (position < crest ? 1.0 / crest : -1.0 / (1.0 - crest));
    float variation = 0.88 + 0.12 * sin(a * 0.55 + seeded);
    vec2 variationSlope = along * (0.066 * cos(a * 0.55 + seeded) / u_spacing);
    float amplitude = u_spacing * u_relief * 0.21;
    float height = size * 0.055 + amplitude * variation * profile;
    vec2 slope = amplitude * (variation * profileSlope * phaseSlope + profile * variationSlope);
    // One compact grain scale contributes its height and slope, not a second noise field.
    vec2 grainId = floor(q / 2.2);
    vec2 grainLocal = fract(q / 2.2) - 0.5;
    float grain = max(0.0, 1.0 - 4.0 * dot(grainLocal, grainLocal));
    float grainHeight = (pica_random(grainId + vec2(11.0, 83.0)) - 0.3) * 0.065;
    height += grainHeight * grain * grain;
    slope -= 16.0 * grainHeight / 2.2 * grain * grainLocal;
    return vec4(height * mound * mound, slope * mound * mound + height * 2.0 * mound * moundSlope, 1.0 - profile);
  }

  float sandFootprint(vec2 q) {
    vec2 halfSize = vec2(1.15, 0.85) * max(1.0, sandSize());
    return (length(q / halfSize) - 1.0) * min(halfSize.x, halfSize.y);
  }

  void main() {
    vec2 screen = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    float angle = (pica_random(vec2(61.0, 43.0)) - 0.5) * 0.12;
    mat2 turn = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    screen = turn * screen;
    float qy = screen.y / 0.62;
    vec2 q = vec2(screen.x - 0.18 * qy, qy);
    // Four bounded projection corrections intersect the low height field.
    for (int i = 0; i < 4; i++) {
      vec4 surface = sandSurface(q);
      float error = q.y * 0.62 + surface.x * 0.55 - screen.y;
      float derivative = max(0.1, 0.62 + 0.55 * (surface.z - surface.y * 0.18));
      qy -= clamp(error / derivative, -u_spacing, u_spacing);
      q = vec2(screen.x - 0.18 * qy, qy);
    }
    vec4 surface = sandSurface(q);
    vec3 normal = normalize(vec3(-clamp(surface.yz, vec2(-3.0), vec2(3.0)), 1.0));
    float seeded = pica_random(vec2(37.0, 19.0)) * 6.2831853;
    float azimuth = u_wind * 0.017453293 - 0.7 + 0.55 * sin(u_time * u_speed * 0.3 + seeded);
    vec3 light = normalize(vec3(cos(azimuth), sin(azimuth), 0.3));
    float shelter = 0.0;
    for (int i = 1; i <= 2; i++) {
      float distance = u_spacing * float(i) * 0.28;
      float obstruction = sandSurface(q + light.xy * distance).x - surface.x - light.z * distance;
      shelter = max(shelter, clamp(obstruction / max(0.5, u_spacing * u_relief * 0.12), 0.0, 1.0));
    }
    float diffuse = max(0.0, dot(normal, light));
    float aa = max(0.7, max(u_css_size.x / u_resolution.x, u_css_size.y / u_resolution.y));
    float face = 1.0 - smoothstep(-aa, aa, sandFootprint(q));
    // Only raised faces turning toward the same grazing light receive stronger foreground ink.
    float litRidge = smoothstep(0.35, 0.68, 1.0 - surface.w) * smoothstep(light.z + 0.015, light.z + 0.1, diffuse);
    float tone = u_intensity * (0.075 + diffuse * 0.27 + litRidge * 0.55) * (1.0 - shelter * 0.6) * face;
    pica_color = pica_tone(clamp(tone, 0.0, 0.6), u_fg, 8.0);
  }
`;

const SAND_FALLBACK = [
  `radial-gradient(circle,color-mix(in srgb,${cssVar("fg")} 10%,transparent) 0 .5px,transparent .8px) 0 0 / 3px 3px`,
  `repeating-linear-gradient(var(--sd-angle),transparent 0 calc(var(--sd-spacing) * .55),color-mix(in srgb,${cssVar("fg")} 23%,transparent) calc(var(--sd-spacing) * .72),color-mix(in srgb,${cssVar("fg")} 7%,transparent) calc(var(--sd-spacing) * .86),transparent var(--sd-spacing))`,
  `linear-gradient(color-mix(in srgb,${cssVar("fg")} 7%,transparent),color-mix(in srgb,${cssVar("fg")} 7%,transparent))`,
  cssVar("bg"),
].join(",");

function sandBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<SandRipplesProps> = (host, initial = {}) => {
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
      u_spacing: sandBound(props.spacing, 44, 25, 70),
      u_relief: sandBound(props.relief, 0.45, 0.2, 0.7),
      u_wind: sandBound(props.wind, 28, 10, 60),
      u_speed: sandBound(props.speed, 0.65, 0, 2),
      u_intensity: sandBound(props.intensity, 0.5, 0.3, 0.75),
      u_seed: Math.round(sandBound(props.seed, 1, 1, 99)),
    };
  }
  function fallback(noGl = false): void {
    drawing.el.style.setProperty("--sd-angle", `${90 + sandBound(props.wind, 28, 10, 60)}deg`);
    drawing.el.style.setProperty("--sd-spacing", `${sandBound(props.spacing, 44, 25, 70)}px`);
    if (!noGl) { drawing.el.style.removeProperty("clip-path"); return; }
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const size = Math.min(w / 2.9, h / 2.4);
    const points: string[] = [];
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * Math.PI * 2;
      const x = Math.cos(a) * size * 1.15;
      const y = Math.sin(a) * size * 0.85;
      points.push(`${50 + (x + y * 0.18) / w * 100}% ${50 + y * 0.62 / h * 100}%`);
    }
    drawing.el.style.clipPath = `polygon(${points.join(",")})`;
  }
  fallback();
  const shader = createShader(drawing.el, {
    fragment: SAND_FRAGMENT,
    fallback: SAND_FALLBACK,
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
