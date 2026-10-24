import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface TerracedBlocksProps extends MotionProps {
  /** Number of finite plateau tiers around the reading opening, from 2 to 4. */
  tiers: number;
  /** Height of each terrace step relative to the shorter side, from 0.3 to 1.5. */
  depth: number;
  /** Alternating offset of neighboring rectangular plateaus, from 0 to 1. */
  stagger: number;
  /** Rate of the directional light orbit, from 0 to 2. */
  speed: number;
  /** Overall foreground ink coverage, from 0.2 to 1. */
  intensity: number;
}

export const defaults: TerracedBlocksProps = {
  tiers: 3,
  depth: 0.8,
  stagger: 0.6,
  speed: 0.65,
  intensity: 0.65,
  paused: false,
  time: null,
  seed: 1,
};

const TERRACE_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_tiers;
  uniform float u_depth;
  uniform float u_stagger;
  uniform float u_speed;
  uniform float u_intensity;

  void terraceClip(vec3 plane, float limit, vec2 p, vec2 ray, inout float low, inout float high, inout vec3 normal) {
    float direction = dot(plane, vec3(ray, 1.0));
    float remaining = limit - dot(plane.xy, p);
    if (abs(direction) < 0.00001) {
      if (remaining < 0.0) low = high + 1.0;
      return;
    }
    float z = remaining / direction;
    if (direction > 0.0 && z < high) {
      high = z;
      normal = plane;
    }
    if (direction < 0.0) low = max(low, z);
  }

  // Intersect a finite beveled solid with an ascending orthographic ray.
  vec4 terraceHit(vec2 p, vec2 ray, vec2 center, vec2 halfSize, float height) {
    p -= center;
    float bevel = min(3.0, max(1.0, height * 0.2));
    float low = 0.0;
    float high = height;
    vec3 normal = vec3(0.0, 0.0, 1.0);
    terraceClip(vec3(1.0, 0.0, 0.0), halfSize.x, p, ray, low, high, normal);
    terraceClip(vec3(-1.0, 0.0, 0.0), halfSize.x, p, ray, low, high, normal);
    terraceClip(vec3(0.0, 1.0, 0.0), halfSize.y, p, ray, low, high, normal);
    terraceClip(vec3(0.0, -1.0, 0.0), halfSize.y, p, ray, low, high, normal);
    terraceClip(vec3(1.0, 0.0, 1.0), halfSize.x + height - bevel, p, ray, low, high, normal);
    terraceClip(vec3(-1.0, 0.0, 1.0), halfSize.x + height - bevel, p, ray, low, high, normal);
    terraceClip(vec3(0.0, 1.0, 1.0), halfSize.y + height - bevel, p, ray, low, high, normal);
    terraceClip(vec3(0.0, -1.0, 1.0), halfSize.y + height - bevel, p, ray, low, high, normal);
    if (high < low || high < 0.0) return vec4(-1.0, 0.0, 0.0, 1.0);
    return vec4(high, normalize(normal));
  }

  void terraceBlock(int tier, int side, out vec2 center, out vec2 halfSize, out float height) {
    vec2 opening = u_css_size * vec2(0.19, 0.18);
    vec2 band = (u_css_size * 0.425 - opening) / u_tiers;
    vec2 middle = opening + band * (float(tier) + 0.5);
    float signSide = mod(float(side), 2.0) < 0.5 ? -1.0 : 1.0;
    float offset = (mod(float(tier), 2.0) - 0.5) * u_stagger * 0.7;
    if (side < 2) {
      center = vec2(offset * band.x * signSide, middle.y * signSide);
      halfSize = vec2(middle.x - band.x * 0.65, band.y * 0.38);
    } else {
      center = vec2(middle.x * signSide, -offset * band.y * signSide);
      halfSize = vec2(band.x * 0.38, middle.y - band.y * 0.65);
    }
    height = (float(tier) + 1.0) * u_depth * min(u_css_size.x, u_css_size.y) * 0.024;
  }

  void main() {
    vec2 p = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    vec2 view = vec2(0.3, -0.24);
    vec4 visible = vec4(0.0, 0.0, 0.0, 1.0);
    for (int tier = 0; tier < 4; tier++) {
      if (float(tier) >= u_tiers) break;
      for (int side = 0; side < 4; side++) {
        vec2 center;
        vec2 halfSize;
        float height;
        terraceBlock(tier, side, center, halfSize, height);
        vec4 hit = terraceHit(p, view, center, halfSize, height);
        if (hit.x > visible.x) visible = hit;
      }
    }
    vec2 surface = p + view * visible.x;
    float phase = pica_random(vec2(13.0, 41.0)) * 6.2831853;
    float azimuth = -0.6 + phase + u_time * u_speed * 0.18;
    vec2 lightRay = vec2(cos(azimuth), sin(azimuth)) * 0.75;
    vec3 light = normalize(vec3(lightRay, 1.0));
    float shadow = 0.0;
    for (int tier = 0; tier < 4; tier++) {
      if (float(tier) >= u_tiers) break;
      for (int side = 0; side < 4; side++) {
        vec2 center;
        vec2 halfSize;
        float height;
        terraceBlock(tier, side, center, halfSize, height);
        vec4 hit = terraceHit(surface - lightRay * visible.x, lightRay, center, halfSize, height);
        if (hit.x > visible.x + 0.35) shadow = 1.0;
      }
    }
    float lightInk = step(0.5, dot(u_fg.rgb, vec3(0.2126, 0.7152, 0.0722)));
    float diffuse = max(0.0, dot(visible.yzw, light)) * (1.0 - shadow * 0.75);
    float shade = mix(1.0 - diffuse, diffuse, lightInk);
    float shortSide = min(u_css_size.x, u_css_size.y);
    float level = visible.x / max(1.0, u_tiers * u_depth * shortSide * 0.024);
    float blockTone = 0.065 + shade * 0.22 + level * 0.035;
    float tone = visible.x > 0.0 ? blockTone : shadow * 0.14;
    pica_color = pica_tone(clamp(tone * u_intensity, 0.0, 0.75), u_fg, 8.0);
  }
`;

const TERRACE_FALLBACK = [
  ...[0, 1, 2].flatMap((tier) => {
    const long = 48 + tier * 14;
    const offset = 25 - tier * 8;
    const fill = `linear-gradient(135deg,color-mix(in srgb,${cssVar("fg")} 22%,transparent),color-mix(in srgb,${cssVar("fg")} 9%,transparent))`;
    return [`${fill} 50% ${offset}% / ${long}% 6% no-repeat`, `${fill} 50% ${100 - offset}% / ${long}% 6% no-repeat`, `${fill} ${offset}% 50% / 6% ${long}% no-repeat`, `${fill} ${100 - offset}% 50% / 6% ${long}% no-repeat`];
  }),
  cssVar("bg"),
].join(",");

function terraceBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<TerracedBlocksProps> = (host, initial = {}) => {
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
      u_tiers: Math.round(terraceBound(props.tiers, 3, 2, 4)),
      u_depth: terraceBound(props.depth, 0.8, 0.3, 1.5),
      u_stagger: terraceBound(props.stagger, 0.6, 0, 1),
      u_speed: terraceBound(props.speed, 0.65, 0, 2),
      u_intensity: terraceBound(props.intensity, 0.65, 0.2, 1),
      u_seed: Math.floor(terraceBound(props.seed, 1, 1, 99)),
    };
  }
  const shader = createShader(drawing.el, {
    fragment: TERRACE_FRAGMENT,
    fallback: TERRACE_FALLBACK,
    uniforms: uniforms(),
    maxDpr: 0.75,
    css: "image-rendering:pixelated",
    onInvalidate: () => {
      if (!alive) return;
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
