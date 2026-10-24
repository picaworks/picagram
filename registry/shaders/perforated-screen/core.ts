import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PerforatedScreenProps extends MotionProps {
  /** Staggered hole spacing in CSS pixels, from 36 to 120. */
  pitch: number;
  /** Hole diameter as a fraction of spacing, from 0.3 to 0.7. */
  aperture: number;
  /** Metal sheet thickness in CSS pixels, from 2 to 14. */
  thickness: number;
  /** Rate of the single directional light orbit, from 0 to 2. */
  speed: number;
  /** Overall foreground ink coverage, from 0.2 to 1. */
  intensity: number;
}

export const defaults: PerforatedScreenProps = {
  pitch: 64,
  aperture: 0.55,
  thickness: 6,
  speed: 0.65,
  intensity: 0.65,
  paused: false,
  time: null,
  seed: 1,
};

const SCREEN_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_pitch;
  uniform float u_aperture;
  uniform float u_thickness;
  uniform float u_speed;
  uniform float u_intensity;

  vec2 screenHole(vec2 p) {
    float rowHeight = u_pitch * 0.8660254;
    float row = floor(p.y / rowHeight + 0.5);
    float shift = mod(row, 2.0) * u_pitch * 0.5;
    float column = floor((p.x - shift) / u_pitch + 0.5);
    return p - vec2(column * u_pitch + shift, row * rowHeight);
  }

  float screenRectangle(vec2 p, vec2 halfSize) {
    float d = max(abs(p.x) - halfSize.x, abs(p.y) - halfSize.y);
    return 1.0 - smoothstep(-0.7, 0.7, d);
  }

  float screenOpening(vec2 local, float radius) {
    return 1.0 - smoothstep(radius - 0.7, radius + 0.7, length(local));
  }

  void main() {
    vec2 p = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    vec2 sheetSize = u_css_size * vec2(0.34, 0.34);
    vec2 receiverSize = u_css_size * vec2(0.405, 0.405);
    vec2 viewSlope = vec2(0.35, -0.22);
    float gap = u_pitch * 0.24 + u_thickness * 0.8;
    float topHeight = gap + u_thickness;
    vec2 top = p + viewSlope * topHeight;
    vec2 bottom = p + viewSlope * gap;
    float radius = u_pitch * u_aperture * 0.5;
    vec2 topLocal = screenHole(top);
    vec2 bottomLocal = topLocal - viewSlope * u_thickness;
    float topOpen = screenOpening(topLocal, radius);
    float bottomOpen = screenOpening(bottomLocal, radius);
    float sheet = screenRectangle(top, sheetSize);
    float receiver = screenRectangle(p, receiverSize);
    float phase = pica_random(vec2(7.0, 31.0)) * 6.2831853;
    float azimuth = -0.8 + phase + u_time * u_speed * 0.2;
    vec2 lightSlope = vec2(cos(azimuth), sin(azimuth)) * 0.4;
    vec3 light = normalize(vec3(lightSlope, 1.0));

    // A receiving point is lit only if the same ray clears both slab faces.
    vec2 lightTop = p + lightSlope * topHeight;
    vec2 lightBottom = p + lightSlope * gap;
    vec2 lightLocal = screenHole(lightTop);
    float lightTopOpen = screenOpening(lightLocal, radius);
    float lightBottomOpen = screenOpening(lightLocal - lightSlope * u_thickness, radius);
    float blockedTop = screenRectangle(lightTop, sheetSize) * (1.0 - lightTopOpen);
    float blockedBottom = screenRectangle(lightBottom, sheetSize) * (1.0 - lightBottomOpen);
    float shadow = max(blockedTop, blockedBottom);
    float lightInk = step(0.5, dot(u_fg.rgb, vec3(0.2126, 0.7152, 0.0722)));
    float receiverTone = mix(0.045, 0.24, mix(shadow, 1.0 - shadow, lightInk));
    float receiverEdge = max(abs(p.x) - receiverSize.x, abs(p.y) - receiverSize.y);
    receiverTone += exp(-abs(receiverEdge + 1.0)) * 0.13;

    // The positive quadratic root is the cylindrical wall hit below the opening.
    float a = dot(viewSlope, viewSlope);
    float b = -2.0 * dot(topLocal, viewSlope);
    float c = dot(topLocal, topLocal) - radius * radius;
    float hit = clamp((-b + sqrt(max(0.0, b * b - 4.0 * a * c))) / (2.0 * a), 0.0, u_thickness);
    vec2 wallPoint = topLocal - viewSlope * hit;
    vec3 wallNormal = normalize(vec3(-wallPoint / max(1.0, radius), 0.0));
    float wallLight = max(0.0, dot(wallNormal, light));
    float wallTone = 0.17 + mix(1.0 - wallLight, wallLight, lightInk) * 0.22;
    float rim = exp(-abs(length(topLocal) - radius) * 0.9);
    float metalTone = 0.11 + rim * (0.08 + 0.08 * dot(normalize(topLocal + vec2(0.001)), normalize(lightSlope)));
    float face = sheet * (1.0 - topOpen);
    float wall = sheet * topOpen * (1.0 - bottomOpen);
    float seePlane = 1.0 - face - wall;
    float tone = face * metalTone + wall * wallTone + seePlane * receiver * receiverTone;
    pica_color = pica_tone(clamp(tone * u_intensity, 0.0, 0.8), u_fg, 8.0);
  }
`;

const SCREEN_FALLBACK = [
  ...[25, 50, 75].flatMap((y, row) => [20, 40, 60, 80].map((x) => `radial-gradient(circle at ${x + (row % 2 ? 4 : 0)}% ${y}%,${cssVar("bg")} 0 var(--ps-radius),color-mix(in srgb,${cssVar("fg")} 25%,transparent) calc(var(--ps-radius) + 1px) calc(var(--ps-radius) + 3px),transparent calc(var(--ps-radius) + 4px)) center / 68% 68% no-repeat`)),
  `linear-gradient(130deg,color-mix(in srgb,${cssVar("fg")} 15%,transparent),color-mix(in srgb,${cssVar("fg")} 8%,transparent)) center / 68% 68% no-repeat`,
  `linear-gradient(color-mix(in srgb,${cssVar("fg")} 7%,transparent),color-mix(in srgb,${cssVar("fg")} 7%,transparent)) 54% 56% / 81% 81% no-repeat`,
  cssVar("bg"),
].join(",");

function screenBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<PerforatedScreenProps> = (host, initial = {}) => {
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
      u_pitch: screenBound(props.pitch, 64, 36, 120),
      u_aperture: screenBound(props.aperture, 0.55, 0.3, 0.7),
      u_thickness: screenBound(props.thickness, 6, 2, 14),
      u_speed: screenBound(props.speed, 0.65, 0, 2),
      u_intensity: screenBound(props.intensity, 0.65, 0.2, 1),
      u_seed: Math.floor(screenBound(props.seed, 1, 1, 99)),
    };
  }
  function fallback(): void {
    const radius = screenBound(props.pitch, 64, 36, 120) * screenBound(props.aperture, 0.55, 0.3, 0.7) * 0.4;
    drawing.el.style.setProperty("--ps-radius", `${radius}px`);
  }
  fallback();
  const shader = createShader(drawing.el, {
    fragment: SCREEN_FRAGMENT,
    fallback: SCREEN_FALLBACK,
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
