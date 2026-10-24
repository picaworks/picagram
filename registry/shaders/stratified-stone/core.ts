import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface StratifiedStoneProps extends MotionProps {
  /** Broad sediment layer count across the shorter host side, from 3 to 12. */
  strata: number;
  /** Height of the stepped stone relief, from 0.15 to 1.5. */
  relief: number;
  /** Throw of the fixed fault and angular bedding breaks, from 0 to 1.5. */
  fracture: number;
  /** Rate of the moving directional light, from 0 to 2. */
  speed: number;
  /** Overall palette ink coverage, from 0.25 to 0.85. */
  intensity: number;
}

export const defaults: StratifiedStoneProps = {
  strata: 6,
  relief: 0.85,
  fracture: 0.8,
  speed: 0.55,
  intensity: 0.6,
  paused: false,
  time: null,
  seed: 1,
};

const STONE_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_strata;
  uniform float u_relief;
  uniform float u_fracture;
  uniform float u_speed;
  uniform float u_intensity;

  // Sediment risers and their exact slopes follow the same displaced bedding.
  vec4 stoneRelief(vec2 p) {
    float a = -0.32 + pica_random(vec2(3.0, 1.0)) * 0.18;
    float b = 0.15 + pica_random(vec2(7.0, 2.0)) * 0.2;
    float tilt = -0.16 + pica_random(vec2(1.0, 4.0)) * 0.12;
    float bedding = p.y + tilt * p.x + u_fracture * (0.055 * abs(p.x - a) - 0.07 * abs(p.x - b));
    vec2 beddingGradient = vec2(tilt + u_fracture * (0.055 * sign(p.x - a) - 0.07 * sign(p.x - b)), 1.0);
    float faultCoordinate = p.x + 0.22 * p.y + u_fracture * (0.025 * abs(p.y + 0.16) - 0.018 * abs(p.y - 0.23)) - 0.07;
    vec2 faultDirection = vec2(1.0, 0.22 + u_fracture * (0.025 * sign(p.y + 0.16) - 0.018 * sign(p.y - 0.23)));
    float faultT = clamp((faultCoordinate + 0.024) / 0.048, 0.0, 1.0);
    float fault = faultT * faultT * (3.0 - 2.0 * faultT);
    vec2 faultGradient = faultDirection * (6.0 * faultT * (1.0 - faultT) / 0.048);
    bedding += u_fracture * 0.055 * fault;
    beddingGradient += u_fracture * 0.055 * faultGradient;
    float coordinate = bedding * u_strata;
    float band = floor(coordinate);
    float f = fract(coordinate);
    float current = pica_random(vec2(band, 11.0));
    float next = pica_random(vec2(band + 1.0, 11.0));
    float t = clamp((f - 0.7) / 0.28, 0.0, 1.0);
    float stepHeight = t * t * (3.0 - 2.0 * t);
    float stepSlope = 6.0 * t * (1.0 - t) / 0.28;
    float rise = 0.26 + (next - current) * 0.045;
    float height = (band * 0.26 + current * 0.045 + stepHeight * rise) / u_strata;
    height += f * (1.0 - f) * 0.018;
    float slope = stepSlope * rise + (1.0 - 2.0 * f) * 0.018 * u_strata;
    float mineral = mix(current, next, stepHeight);
    return vec4(height * u_relief, slope * beddingGradient * u_relief, mineral);
  }

  void main() {
    float shortSide = max(1.0, min(u_css_size.x, u_css_size.y));
    vec2 aspect = u_css_size / shortSide;
    vec2 p = (gl_FragCoord.xy / u_resolution - 0.5) * aspect;
    vec2 bounds = aspect * 0.44;
    vec2 sides = abs(p) - bounds;
    float edge = max(sides.x, sides.y);
    vec2 edgeDirection = sides.x > sides.y ? vec2(sign(p.x), 0.0) : vec2(0.0, sign(p.y));
    float corner = (abs(p.x) + abs(p.y) - bounds.x - bounds.y + 0.018) * 0.7071068;
    if (corner > edge) { edge = corner; edgeDirection = sign(p) * 0.7071068; }
    if (edge > 0.0) {
      pica_color = pica_tone(0.0, u_fg, 8.0);
      return;
    }
    vec4 material = stoneRelief(p);
    float bevelT = clamp((edge + 0.018) / 0.018, 0.0, 1.0);
    vec2 bevelSlope = -0.025 * u_relief * 6.0 * bevelT * (1.0 - bevelT) / 0.018 * edgeDirection;
    vec3 normal = normalize(vec3(-(material.yz + bevelSlope), 1.0));
    float phase = 0.95 + pica_random(vec2(8.0, 5.0)) * 0.3 + u_time * u_speed * 0.28;
    float elevation = 0.18 + 0.16 * cos(phase * 0.8);
    vec3 light = normalize(vec3(cos(phase), sin(phase), elevation));
    float diffuse = max(0.0, dot(normal, light));
    float grain = pica_random(floor(p * shortSide * 0.65));
    float tone = (0.065 + material.w * 0.17 + diffuse * 0.29 + grain * 0.025) * u_intensity;
    pica_color = pica_tone(tone, u_fg, 8.0);
  }
`;

const STONE_FALLBACK = [
  `repeating-linear-gradient(var(--ss-angle),color-mix(in srgb,${cssVar("fg")} 12%,transparent) 0 calc(var(--ss-pitch) * .66),color-mix(in srgb,${cssVar("fg")} var(--ss-ink),transparent) calc(var(--ss-pitch) * .72) calc(var(--ss-pitch) * .91),color-mix(in srgb,${cssVar("fg")} 6%,transparent) calc(var(--ss-pitch) * .96) var(--ss-pitch))`,
  `linear-gradient(105deg,transparent 43%,color-mix(in srgb,${cssVar("fg")} var(--ss-fault),transparent) 46%,transparent 49%)`,
  cssVar("bg"),
].join(",");

function stoneBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<StratifiedStoneProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "under");
  drawing.el.style.clipPath = "inset(6% round 2px)";
  const uniforms = (): Record<string, number | readonly number[]> => ({
    u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
    u_strata: Math.round(stoneBound(props.strata, 6, 3, 12)),
    u_relief: stoneBound(props.relief, 0.85, 0.15, 1.5),
    u_fracture: stoneBound(props.fracture, 0.8, 0, 1.5),
    u_speed: stoneBound(props.speed, 0.55, 0, 2),
    u_intensity: stoneBound(props.intensity, 0.6, 0.25, 0.85),
    u_seed: Math.floor(stoneBound(props.seed, 1, 1, 9999)),
  });
  function fallback(): void {
    const shortSide = Math.max(1, Math.min(host.clientWidth, host.clientHeight));
    drawing.el.style.setProperty("--ss-pitch", `${shortSide / Math.round(stoneBound(props.strata, 6, 3, 12))}px`);
    drawing.el.style.setProperty("--ss-angle", `${174 + stoneBound(props.fracture, 0.8, 0, 1.5) * 4}deg`);
    drawing.el.style.setProperty("--ss-fault", `${Math.round(stoneBound(props.fracture, 0.8, 0, 1.5) * 3)}%`);
    drawing.el.style.setProperty("--ss-ink", `${Math.round(stoneBound(props.intensity, 0.6, 0.25, 0.85) * (28 + stoneBound(props.relief, 0.85, 0.15, 1.5) * 16))}%`);
  }
  fallback();
  const shader = createShader(drawing.el, {
    fragment: STONE_FRAGMENT,
    fallback: STONE_FALLBACK,
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
