import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface StippledSilkProps extends MotionProps {
  /** Broad fold count across the sheet, from 2 to 7. */
  folds: number;
  /** Fine woven thread spacing in CSS pixels, from 2 to 7. */
  weave: number;
  /** Depth and bow of the hanging folds, from 0.1 to 1.5. */
  drape: number;
  /** Rate of the slow grazing light movement, from 0 to 2. */
  speed: number;
  /** Material ink coverage multiplier, from 0.25 to 1.3. */
  intensity: number;
}

export const defaults: StippledSilkProps = {
  folds: 3.5,
  weave: 3.5,
  drape: 0.8,
  speed: 0.45,
  intensity: 1,
  paused: false,
  time: null,
  seed: 1,
};

const SILK_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_folds;
  uniform float u_weave;
  uniform float u_drape;
  uniform float u_speed;
  uniform float u_intensity;

  vec2 silkMaterial(vec2 p, float phase) {
    float bow = u_drape * (0.10 * p.y * p.y + 0.08 * sin(p.y * 3.2 + phase * 0.2));
    return vec2(p.x + bow, p.y);
  }

  float silkHeight(vec2 p, float phase) {
    vec2 q = silkMaterial(p, phase);
    float angle = q.x * u_folds * 6.283185 + phase;
    float fold = sin(angle) + 0.18 * sin(angle * 2.0 + 0.3);
    return u_drape * (0.045 * fold - 0.12 * q.y * q.y);
  }

  void main() {
    vec2 p = gl_FragCoord.xy / u_resolution - 0.5;
    float phase = pica_random(vec2(3.0, 17.0)) * 6.283185;
    vec2 q = silkMaterial(p, phase);
    float k = u_folds * 6.283185;
    float angle = q.x * k + phase;
    float dx = (silkHeight(p + vec2(0.0007, 0.0), phase) - silkHeight(p - vec2(0.0007, 0.0), phase)) / 0.0014;
    float dy = (silkHeight(p + vec2(0.0, 0.0007), phase) - silkHeight(p - vec2(0.0, 0.0007), phase)) / 0.0014;
    vec3 normal = normalize(vec3(-dx, -dy * u_css_size.x / max(1.0, u_css_size.y), 1.0));
    float time = u_time * u_speed;
    vec3 light = normalize(vec3(-0.48 + 0.18 * sin(time * 0.17), 0.38 + 0.10 * cos(time * 0.13), 0.85));
    float diffuse = max(0.0, dot(normal, light));
    vec3 halfLight = normalize(light + vec3(0.0, 0.0, 1.0));
    float sheen = pow(max(0.0, dot(normal, halfLight)), 20.0);
    // An arc-length approximation packs threads into the steeper fold faces.
    float slope = 0.045 * u_drape * k;
    float arc = q.x * (1.0 + slope * slope * 0.25) + slope * slope * sin(angle * 2.0) / (8.0 * k);
    vec2 threads = vec2(arc * u_css_size.x, q.y * u_css_size.y) / u_weave;
    float warp = 0.5 + 0.5 * cos(threads.x * 6.283185);
    float weft = 0.5 + 0.5 * cos(threads.y * 6.283185);
    float over = mod(floor(threads.x) + floor(threads.y), 2.0);
    float fiber = mix(warp, weft, over);
    float trough = 0.82 + 0.18 * (0.5 + 0.5 * sin(angle));
    float tone = (0.13 + diffuse * 0.46 + sheen * 0.24) * (0.82 + fiber * 0.18) * trough * u_intensity;
    pica_color = pica_tone(tone * 0.86, u_fg, 6.0);
  }
`;

const SILK_FALLBACK = [
  `repeating-linear-gradient(99deg,color-mix(in srgb,${cssVar("fg")} 9%,transparent) 0 1px,transparent 1px var(--ss-weave))`,
  `repeating-linear-gradient(9deg,color-mix(in srgb,${cssVar("fg")} 12%,transparent) 0 1px,transparent 1px var(--ss-weave))`,
  `radial-gradient(ellipse at 43% 35%,color-mix(in srgb,${cssVar("fg")} 9%,transparent),transparent 24%)`,
  `repeating-linear-gradient(var(--ss-bow),color-mix(in srgb,${cssVar("fg")} var(--ss-low),transparent) 0,color-mix(in srgb,${cssVar("fg")} var(--ss-high),transparent) calc(var(--ss-pitch) * 0.36),color-mix(in srgb,${cssVar("fg")} var(--ss-low),transparent) var(--ss-pitch))`,
  cssVar("bg"),
].join(",");

function silkBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<StippledSilkProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  let shader: Shader | null = null;
  const attributes = hostAttributes(host);
  attributes.set("role", null);
  attributes.set("aria-label", null);
  attributes.set("aria-hidden", "true");
  const drawing = layer(host, "under");

  function uniforms(): Record<string, number | readonly number[]> {
    return {
      u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
      u_seed: Math.floor(silkBound(props.seed, 1, 0, 999999)),
      u_folds: silkBound(props.folds, 3.5, 2, 7),
      u_weave: silkBound(props.weave, 3.5, 2, 7),
      u_drape: silkBound(props.drape, 0.8, 0.1, 1.5),
      u_speed: silkBound(props.speed, 0.45, 0, 2),
      u_intensity: silkBound(props.intensity, 1, 0.25, 1.3),
    };
  }

  function fallback(): void {
    const intensity = silkBound(props.intensity, 1, 0.25, 1.3);
    drawing.el.style.setProperty("--ss-weave", `${silkBound(props.weave, 3.5, 2, 7)}px`);
    drawing.el.style.setProperty("--ss-pitch", `${100 / silkBound(props.folds, 3.5, 2, 7)}%`);
    drawing.el.style.setProperty("--ss-bow", `${90 + silkBound(props.drape, 0.8, 0.1, 1.5) * 12}deg`);
    drawing.el.style.setProperty("--ss-low", `${intensity * 16}%`);
    drawing.el.style.setProperty("--ss-high", `${Math.min(95, intensity * 72)}%`);
  }

  fallback();
  shader = createShader(drawing.el, {
    fragment: SILK_FRAGMENT,
    fallback: SILK_FALLBACK,
    uniforms: uniforms(),
    maxDpr: 1,
    onInvalidate: () => {
      if (!alive) return;
      shader?.set("u_css_size", [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)]);
      loop?.redraw();
    },
  });
  loop = createLoop({
    el: host,
    fps: 24,
    paused: props.paused,
    time: props.time,
    still: 2400,
    frame(time) {
      if (!alive) return;
      shader?.draw(time);
      attributes.set("data-pica-ready", "true");
    },
  });
  return {
    update(next) {
      if (!alive) return;
      props = { ...props, ...next };
      fallback();
      for (const [name, value] of Object.entries(uniforms())) shader?.set(name, value);
      loop?.update({ paused: props.paused, time: props.time });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      shader?.destroy();
      drawing.remove();
      attributes.restore();
    },
  };
};
