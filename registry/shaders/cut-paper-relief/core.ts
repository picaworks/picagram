import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface CutPaperReliefProps extends MotionProps {
  /** Number of nested cut paper sheets, from 2 to 7. */
  layers: number;
  /** Height of each sheet above the next in CSS pixels, from 0.5 to 10. */
  depth: number;
  /** Contour exponent, from 1.6 to 4.5; higher values make squarer rounded cuts. */
  curve: number;
  /** Rate of the single slow light movement, from 0 to 2. */
  speed: number;
  /** Paper ink coverage multiplier, from 0.25 to 1.3. */
  intensity: number;
}

export const defaults: CutPaperReliefProps = {
  layers: 5,
  depth: 3.5,
  curve: 2.6,
  speed: 0.45,
  intensity: 1,
  paused: false,
  time: null,
  seed: 1,
};

const PAPER_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_layers;
  uniform float u_depth;
  uniform float u_curve;
  uniform float u_speed;
  uniform float u_intensity;

  float paperContour(vec2 p, vec2 center) {
    vec2 q = abs((p - center) / vec2(0.56, 0.50));
    return pow(pow(q.x, u_curve) + pow(q.y, u_curve), 1.0 / u_curve);
  }

  float paperHeight(vec2 p, vec2 center) {
    float pitch = 0.50 / u_layers;
    float z = (paperContour(p, center) - 0.66) / pitch;
    float bevel = 1.5 / max(1.0, min(u_css_size.x * 0.56, u_css_size.y * 0.50));
    float rise = smoothstep(0.0, bevel, fract(z) * pitch);
    return clamp(floor(z) + rise, 0.0, u_layers) * u_depth;
  }

  void main() {
    vec2 p = gl_FragCoord.xy / u_resolution;
    vec2 center = vec2(0.66, 0.60) + vec2(pica_random(vec2(3.0, 2.0)) - 0.5, pica_random(vec2(7.0, 9.0)) - 0.5) * 0.025;
    vec2 pixel = 1.0 / max(u_css_size, vec2(1.0));
    float contour = paperContour(p, center);
    float height = paperHeight(p, center);
    float dx = (paperHeight(p + vec2(pixel.x, 0.0), center) - paperHeight(p - vec2(pixel.x, 0.0), center)) * 0.5;
    float dy = (paperHeight(p + vec2(0.0, pixel.y), center) - paperHeight(p - vec2(0.0, pixel.y), center)) * 0.5;
    vec3 normal = normalize(vec3(-dx, -dy, 1.0));
    float angle = 2.3 + u_time * u_speed * 0.10;
    vec2 towardLight = vec2(cos(angle), sin(angle));
    vec3 light = normalize(vec3(towardLight, 0.50));
    float shadow = 0.0;
    // The ray tests the very same cut sheet stack used for the edge normals.
    for (int i = 1; i <= 6; i++) {
      float travel = float(i) * max(0.8, u_depth * 0.9);
      float blocker = paperHeight(p + towardLight * pixel * travel, center);
      float clearance = blocker - height - 0.2 - travel * 0.50;
      shadow = max(shadow, smoothstep(0.0, 0.9, clearance));
    }
    float edgeWidth = 1.2 / max(1.0, min(u_css_size.x * 0.56, u_css_size.y * 0.50));
    float sheet = smoothstep(0.66 - edgeWidth, 0.66 + edgeWidth, contour);
    float diffuse = max(0.0, dot(normal, light));
    float stack = height / max(0.5, u_depth * u_layers);
    float fiber = (pica_random(floor(p * u_css_size * 0.5)) - 0.5) * 0.022;
    float face = (0.18 + diffuse * 0.27 + stack * 0.10 + fiber) * (1.0 - shadow * 0.62);
    float tone = (sheet * face + (1.0 - sheet) * shadow * 0.10) * u_intensity;
    pica_color = pica_tone(tone * 0.86, u_fg, 6.0);
  }
`;

const PAPER_FALLBACK = `var(--cpr-paper),${cssVar("bg")}`;

function paperBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<CutPaperReliefProps> = (host, initial = {}) => {
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
      u_seed: Math.floor(paperBound(props.seed, 1, 0, 999999)),
      u_layers: Math.round(paperBound(props.layers, 5, 2, 7)),
      u_depth: paperBound(props.depth, 3.5, 0.5, 10),
      u_curve: paperBound(props.curve, 2.6, 1.6, 4.5),
      u_speed: paperBound(props.speed, 0.45, 0, 2),
      u_intensity: paperBound(props.intensity, 1, 0.25, 1.3),
    };
  }

  function fallback(): void {
    const layers = Math.round(paperBound(props.layers, 5, 2, 7));
    const intensity = paperBound(props.intensity, 1, 0.25, 1.3);
    const rim = 0.5 + paperBound(props.depth, 3.5, 0.5, 10) * 0.15;
    const stops = ["transparent 0 66%"];
    for (let i = 0; i < layers; i++) {
      const start = 66 + i * 50 / layers;
      const end = 66 + (i + 1) * 50 / layers;
      const ink = cssVar("fg");
      stops.push(`color-mix(in srgb,${ink} ${Math.min(90, intensity * 58)}%,transparent) ${start}% ${start + rim}%`);
      stops.push(`color-mix(in srgb,${cssVar("fg")} ${intensity * (28 + i * 4)}%,transparent) ${start + rim}% ${end}%`);
    }
    const width = 56 + (paperBound(props.curve, 2.6, 1.6, 4.5) - 2.6) * 1.5;
    drawing.el.style.setProperty("--cpr-paper", `radial-gradient(ellipse ${width}% 50% at 66% 40%,${stops.join(",")})`);
  }

  fallback();
  shader = createShader(drawing.el, {
    fragment: PAPER_FRAGMENT,
    fallback: PAPER_FALLBACK,
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
