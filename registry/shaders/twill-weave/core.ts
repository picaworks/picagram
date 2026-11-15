import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer, styleHost } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface TwillWeaveProps extends MotionProps {
  /** Width of each flat fiber bundle in CSS pixels, from 14 to 40. */
  bundleSize: number;
  /** Bundle crown and overpass height, from 0.2 to 0.65. */
  loft: number;
  /** Fabric orientation in degrees, from 15 to 60. */
  angle: number;
  /** Single anisotropic light sweep rate, from 0 to 2. */
  speed: number;
  /** Foreground textile ink coverage, from 0.3 to 0.75. */
  intensity: number;
}

export const defaults: TwillWeaveProps = {
  bundleSize: 24,
  loft: 0.4,
  angle: 32,
  speed: 0.65,
  intensity: 0.5,
  paused: false,
  time: null,
  seed: 1,
};

const TWILL_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_size;
  uniform float u_bundle_size;
  uniform float u_loft;
  uniform float u_angle;
  uniform float u_speed;
  uniform float u_intensity;

  vec4 twillBundle(vec2 q, bool warp) {
    vec2 p = q / u_bundle_size;
    float lane = floor(warp ? p.x : p.y);
    float local = fract(warp ? p.x : p.y) - 0.5;
    float across = clamp(local / 0.44, -1.0, 1.0);
    float squared = across * across;
    float fourth = squared * squared;
    float phase = (warp ? p.y - lane - 1.0 : lane - p.x) * 1.5707963;
    float blend = clamp(cos(phase) * 2.0 + 0.5, 0.0, 1.0);
    float eased = blend * blend * (3.0 - 2.0 * blend);
    float lift = warp ? eased : 1.0 - eased;
    float liftSlope = -12.0 * blend * (1.0 - blend) * sin(phase) * 1.5707963 / u_bundle_size;
    float height = u_bundle_size * u_loft * (0.04 + 0.24 * lift + 0.12 * (1.0 - fourth * squared));
    float crossSlope = -u_loft * 0.72 * fourth * across / 0.44;
    float alongSlope = u_bundle_size * u_loft * 0.24 * liftSlope;
    float fiber = (warp ? q.x : q.y) * 2.0943951 + pica_random(vec2(lane, 41.0)) * 6.2831853;
    height += 0.022 * cos(fiber);
    crossSlope -= 0.0460767 * sin(fiber);
    return vec4(height, warp ? vec2(crossSlope, alongSlope) : vec2(alongSlope, crossSlope), lift);
  }

  void main() {
    vec2 screen = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    float angle = u_angle * 0.017453293;
    vec2 plane = vec2(cos(angle) * screen.x + sin(angle) * screen.y, -sin(angle) * screen.x + cos(angle) * screen.y);
    vec2 q = vec2(plane.x - plane.y * 0.18 / 0.78, plane.y / 0.78);
    vec2 halfSize = vec2(1.1, 0.82) * u_size;
    float aa = max(0.7, max(u_css_size.x / u_resolution.x, u_css_size.y / u_resolution.y));
    vec2 inside = 1.0 - smoothstep(halfSize - aa, halfSize + aa, abs(q));
    vec2 cells = q / u_bundle_size;
    vec2 stripe = 1.0 - smoothstep(vec2(0.44 - aa / u_bundle_size), vec2(0.44 + aa / u_bundle_size), abs(fract(cells) - 0.5));
    vec2 fiberId = floor(q / 2.8);
    vec2 fiberLocal = abs((fract(q / 2.8) - 0.5) * 2.8);
    vec2 fiberLine = 1.0 - smoothstep(vec2(0.25), vec2(0.72), fiberLocal);
    float warpEnd = 2.0 + 6.0 * pica_random(vec2(fiberId.x, 17.0 + sign(q.y)));
    float weftEnd = 2.0 + 6.0 * pica_random(vec2(fiberId.y, 67.0 + sign(q.x)));
    float warpFray = fiberLine.x * (1.0 - smoothstep(halfSize.y + warpEnd - aa, halfSize.y + warpEnd + aa, abs(q.y)));
    float weftFray = fiberLine.y * (1.0 - smoothstep(halfSize.x + weftEnd - aa, halfSize.x + weftEnd + aa, abs(q.x)));
    float warpCoverage = stripe.x * inside.x * max(inside.y, warpFray);
    float weftCoverage = stripe.y * inside.y * max(inside.x, weftFray);
    vec4 warp = twillBundle(q, true);
    vec4 weft = twillBundle(q, false);
    bool warpAbove = warpCoverage > 0.0 && (weftCoverage <= 0.0 || warp.x > weft.x);
    vec4 surface = warpAbove ? warp : weft;
    vec3 normal = normalize(vec3(-clamp(surface.yz, vec2(-6.0), vec2(6.0)), 1.0));
    vec3 tangent = normalize(warpAbove ? vec3(0.0, 1.0, surface.z) : vec3(1.0, 0.0, surface.y));
    vec3 bitangent = normalize(cross(normal, tangent));
    float seeded = pica_random(vec2(13.0, 79.0)) * 6.2831853;
    float azimuth = -0.45 + 0.8 * sin(u_time * u_speed * 0.24 + seeded);
    vec3 light = normalize(vec3(cos(azimuth), sin(azimuth), 0.65));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float nh = max(0.05, dot(normal, halfway));
    float along = dot(tangent, halfway);
    float across = dot(bitangent, halfway);
    float sheen = exp(-(along * along / 0.4 + across * across / 0.045) / max(0.04, nh * nh));
    float diffuse = max(0.0, dot(normal, light));
    float recess = 0.64 + 0.36 * surface.w;
    float coverage = max(warpCoverage, weftCoverage);
    float tone = u_intensity * (0.075 + diffuse * 0.19 + sheen * 0.24) * recess * coverage;
    pica_color = pica_tone(clamp(tone, 0.0, 0.65), u_fg, 8.0);
  }
`;

const TWILL_FALLBACK = [
  `repeating-linear-gradient(calc(var(--tw-angle) + 90deg),transparent 0 calc(var(--tw-bundle) * .78),color-mix(in srgb,${cssVar("fg")} 14%,transparent) calc(var(--tw-bundle) * .8) var(--tw-bundle))`,
  `repeating-linear-gradient(var(--tw-angle),transparent 0 calc(var(--tw-bundle) * .78),color-mix(in srgb,${cssVar("fg")} 12%,transparent) calc(var(--tw-bundle) * .8) var(--tw-bundle))`,
  `repeating-linear-gradient(calc(var(--tw-angle) + 45deg),color-mix(in srgb,${cssVar("fg")} 15%,transparent) 0 calc(var(--tw-bundle) * 1.4),color-mix(in srgb,${cssVar("fg")} 5%,transparent) calc(var(--tw-bundle) * 1.4) calc(var(--tw-bundle) * 2.8))`,
  cssVar("bg"),
].join(",");

function twillBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<TwillWeaveProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const restore = styleHost(host, { "background-color": cssVar("bg") });
  const drawing = layer(host, "under");
  function layout(): { w: number; h: number; size: number; cosine: number; sine: number } {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const a = twillBound(props.angle, 32, 15, 60) * Math.PI / 180;
    const cosine = Math.cos(a);
    const sine = Math.sin(a);
    const extentX = Math.abs(cosine) * 1.1 + Math.abs(cosine * 0.18 - sine * 0.78) * 0.82;
    const extentY = Math.abs(sine) * 1.1 + Math.abs(sine * 0.18 + cosine * 0.78) * 0.82;
    return { w, h, size: Math.max(1, Math.min(Math.max(1, w - 76) / (extentX * 2), Math.max(1, h - 76) / (extentY * 2))), cosine, sine };
  }
  function uniforms(): Record<string, number | readonly number[]> {
    const box = layout();
    return {
      u_css_size: [box.w, box.h],
      u_size: box.size,
      u_bundle_size: twillBound(props.bundleSize, 24, 14, 40),
      u_loft: twillBound(props.loft, 0.4, 0.2, 0.65),
      u_angle: twillBound(props.angle, 32, 15, 60),
      u_speed: twillBound(props.speed, 0.65, 0, 2),
      u_intensity: twillBound(props.intensity, 0.5, 0.3, 0.75),
      u_seed: Math.round(twillBound(props.seed, 1, 1, 99)),
    };
  }
  function fallback(noGl = false): void {
    drawing.el.style.setProperty("--tw-angle", `${-twillBound(props.angle, 32, 15, 60)}deg`);
    drawing.el.style.setProperty("--tw-bundle", `${twillBound(props.bundleSize, 24, 14, 40)}px`);
    if (!noGl) { drawing.el.style.removeProperty("clip-path"); return; }
    const { w, h, size, cosine, sine } = layout();
    const points = [[-1.1, -0.82], [1.1, -0.82], [1.1, 0.82], [-1.1, 0.82]].map(([a = 0, b = 0]) => {
      const x = (a + b * 0.18) * size;
      const y = b * 0.78 * size;
      return `${50 + (x * cosine - y * sine) / w * 100}% ${50 - (x * sine + y * cosine) / h * 100}%`;
    });
    drawing.el.style.clipPath = `polygon(${points.join(",")})`;
  }
  fallback();
  const shader = createShader(drawing.el, {
    fragment: TWILL_FRAGMENT,
    fallback: TWILL_FALLBACK,
    uniforms: uniforms(),
    maxDpr: 1,
    css: "image-rendering:pixelated",
    onInvalidate: () => {
      if (!alive) return;
      fallback(!shader.ok);
      const box = layout();
      shader.set("u_css_size", [box.w, box.h]);
      shader.set("u_size", box.size);
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
