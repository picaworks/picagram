import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface DeckledPaperProps extends MotionProps {
  /** Strength of fine irregular paper fibers, from 0.2 to 1.5. */
  fiber: number;
  /** Shallow face bow relative to sheet size, from 0.2 to 1.5. */
  bow: number;
  /** Local deckle edge roughness in CSS pixels, from 1 to 10. */
  edge: number;
  /** Rate of the grazing directional light, from 0 to 2. */
  speed: number;
  /** Overall foreground ink coverage, from 0.2 to 1. */
  intensity: number;
}

export const defaults: DeckledPaperProps = {
  fiber: 0.75,
  bow: 0.9,
  edge: 4,
  speed: 0.7,
  intensity: 0.65,
  paused: false,
  time: null,
  seed: 1,
};

const PAPER_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_fiber;
  uniform float u_bow;
  uniform float u_edge;
  uniform float u_speed;
  uniform float u_intensity;

  float paperEdgeNoise(float coordinate, vec2 salt) {
    float cell = floor(coordinate);
    float f = fract(coordinate);
    float blend = f * f * (3.0 - 2.0 * f);
    return mix(pica_random(vec2(cell, 0.0) + salt), pica_random(vec2(cell + 1.0, 0.0) + salt), blend) - 0.5;
  }

  // Short recessed fibers and the bowed face contribute exact height derivatives.
  vec4 paperSurface(vec2 pixel, vec2 q, vec2 halfSize, float shortSide) {
    float height = u_bow * 0.06 * (1.0 - q.x * q.x) * (1.0 - q.y * q.y);
    vec2 slope = -0.12 * u_bow * vec2(q.x * (1.0 - q.y * q.y), q.y * (1.0 - q.x * q.x)) / halfSize;
    float fibers = 0.0;
    vec2 cell = floor(pixel / 18.0);
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 id = cell + vec2(float(x), float(y));
        float a = pica_random(id + vec2(19.0, 47.0));
        float b = pica_random(id + vec2(83.0, 13.0));
        float angle = (a - 0.5) * 2.4;
        mat2 turn = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        vec2 local = turn * (pixel - (id + vec2(a, b)) * 18.0);
        float length = 4.0 + b * 8.0;
        float width = 0.38 + a * 0.35;
        float along = local.x / length;
        float across = local.y / width;
        float strand = exp(-pow(abs(along), 8.0) - across * across);
        float amount = 0.00035 * u_fiber;
        height -= strand * amount;
        vec2 derivative = strand * vec2(8.0 * sign(along) * pow(abs(along), 7.0) / length, 2.0 * across / width);
        slope += transpose(turn) * derivative * amount * shortSide;
        fibers += strand;
      }
    }
    return vec4(height, slope, min(1.0, fibers));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float shortSide = max(1.0, min(u_css_size.x, u_css_size.y));
    vec2 p = (uv - 0.5) * u_css_size / shortSide;
    vec2 halfSize = u_css_size / shortSide * vec2(0.37, 0.38);
    vec2 pixel = uv * u_css_size;
    float rx = paperEdgeNoise(pixel.y / 11.0, vec2(3.0, 17.0)) + paperEdgeNoise(pixel.y / 3.0, vec2(41.0, 7.0)) * 0.28;
    float ry = paperEdgeNoise(pixel.x / 11.0, vec2(61.0, 9.0)) + paperEdgeNoise(pixel.x / 3.0, vec2(11.0, 53.0)) * 0.28;
    vec2 edgeDistance = abs(p) - halfSize + vec2(rx, ry) * u_edge / shortSide;
    float distance = max(edgeDistance.x, edgeDistance.y) * shortSide;
    float sheet = 1.0 - smoothstep(-0.75, 0.75, distance);
    vec2 q = clamp(p / halfSize, -1.0, 1.0);
    vec4 surface = paperSurface(pixel, q, halfSize, shortSide);
    vec3 normal = normalize(vec3(-surface.yz, 1.0));
    float phase = pica_random(vec2(5.0, 37.0)) * 6.2831853;
    float azimuth = -0.7 + phase + u_time * u_speed * 0.22;
    vec3 light = normalize(vec3(cos(azimuth), sin(azimuth), 0.22));
    float diffuse = max(0.0, dot(normal, light));
    float rim = exp(-abs(distance + 1.0) * 0.65);
    float tone = sheet * u_intensity * (0.045 + diffuse * 0.32 + surface.w * u_fiber * 0.16 + rim * 0.25);
    pica_color = pica_tone(clamp(tone, 0.0, 0.8), u_fg, 8.0);
  }
`;

const PAPER_FALLBACK = [
  `repeating-linear-gradient(7deg,transparent 0 7px,color-mix(in srgb,${cssVar("fg")} var(--dp-fiber),transparent) 7px 8px,transparent 8px 19px) center / 74% 76% no-repeat`,
  `repeating-linear-gradient(171deg,transparent 0 17px,color-mix(in srgb,${cssVar("fg")} 8%,transparent) 17px 18px,transparent 18px 31px) center / 74% 76% no-repeat`,
  `linear-gradient(135deg,color-mix(in srgb,${cssVar("fg")} 17%,transparent),color-mix(in srgb,${cssVar("fg")} 5%,transparent) 46%,color-mix(in srgb,${cssVar("fg")} 12%,transparent)) center / 74% 76% no-repeat`,
  cssVar("bg"),
].join(",");

function paperBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<DeckledPaperProps> = (host, initial = {}) => {
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
      u_fiber: paperBound(props.fiber, 0.75, 0.2, 1.5),
      u_bow: paperBound(props.bow, 0.9, 0.2, 1.5),
      u_edge: paperBound(props.edge, 4, 1, 10),
      u_speed: paperBound(props.speed, 0.7, 0, 2),
      u_intensity: paperBound(props.intensity, 0.65, 0.2, 1),
      u_seed: Math.floor(paperBound(props.seed, 1, 1, 99)),
    };
  }
  function fallback(): void {
    drawing.el.style.setProperty("--dp-fiber", `${Math.round((8 + paperBound(props.fiber, 0.75, 0.2, 1.5) * 12) * paperBound(props.intensity, 0.65, 0.2, 1))}%`);
  }
  fallback();
  const shader = createShader(drawing.el, {
    fragment: PAPER_FRAGMENT,
    fallback: PAPER_FALLBACK,
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
