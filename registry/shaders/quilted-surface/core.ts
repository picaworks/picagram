import { labelHost } from "../../../lib/a11y";
import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface QuiltedSurfaceProps extends MotionProps {
  /** Diamond cell count along the shorter host dimension, from 3 to 16. */
  cells: number;
  /** Cushion height as a fraction of the cell width, from 0.03 to 0.4. */
  depth: number;
  /** Width of the recessed seams in CSS pixels, from 0.5 to 3. */
  seam: number;
  /** Grazing light rotation rate, from 0 to 2. */
  speed: number;
  /** Overall palette ink coverage, from 0.2 to 1. */
  intensity: number;
}

export const defaults: QuiltedSurfaceProps = {
  cells: 7,
  depth: 0.18,
  seam: 1.2,
  speed: 0.65,
  intensity: 0.85,
  paused: false,
  time: null,
  seed: 1,
};

const QUILT_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_cells;
  uniform float u_depth;
  uniform float u_seam;
  uniform float u_speed;
  uniform float u_intensity;

  // Height and its two analytic derivatives share one padded cell construction.
  vec3 quiltPad(vec2 local, float inset, float depth) {
    float halfSpan = max(0.35, 0.5 - inset);
    vec2 q = local / halfSpan;
    vec2 sides = max(vec2(0.0), vec2(1.0) - q * q);
    float product = sides.x * sides.y;
    float height = depth * pow(product, 0.72);
    float factor = -1.44 * depth * pow(max(product, 0.003), -0.28) / (halfSpan * halfSpan);
    vec2 slope = factor * local * sides.yx;
    if (abs(local.x) >= halfSpan || abs(local.y) >= halfSpan) slope = vec2(0.0);
    return vec3(height, slope);
  }

  void main() {
    float pitch = max(12.0, min(u_css_size.x, u_css_size.y) / u_cells);
    mat2 turn = mat2(0.70710678, -0.70710678, 0.70710678, 0.70710678);
    vec2 world = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    vec2 phase = vec2(pica_random(vec2(3.0, 7.0)), pica_random(vec2(11.0, 2.0)));
    vec2 p = turn * world / pitch + phase;
    vec2 local = fract(p) - 0.5;
    float depth = u_depth * (0.94 + pica_random(floor(p)) * 0.12);
    vec3 pad = quiltPad(local, u_seam * 0.5 / pitch, depth);
    vec3 normal = normalize(vec3(-pad.yz, 1.0));
    float azimuth = -0.65 + u_time * u_speed * 0.12;
    vec3 light = normalize(vec3(turn * vec2(cos(azimuth), sin(azimuth)), 0.34));
    float diffuse = max(0.0, dot(normal, light));
    float relief = pad.x / max(0.001, depth);
    float edge = (0.5 - max(abs(local.x), abs(local.y))) * pitch;
    float face = smoothstep(u_seam * 0.42, u_seam * 0.5 + 0.8, edge);
    float brightness = mix(0.105, 0.22 + diffuse * 0.62 + relief * 0.12, face);
    // A light ink lights the cushion; a dark ink describes the same shaded relief.
    float lightInk = step(0.5, dot(u_fg.rgb, vec3(0.2126, 0.7152, 0.0722)));
    float tone = mix(1.0 - brightness, brightness, lightInk) * u_intensity;
    pica_color = pica_tone(tone, u_fg, 6.0);
  }
`;

const QUILT_FALLBACK = [
  `repeating-linear-gradient(45deg,color-mix(in srgb,${cssVar("fg")} 8%,transparent) 0,color-mix(in srgb,${cssVar("fg")} 27%,transparent) calc(var(--qs-pitch) * .46),color-mix(in srgb,${cssVar("fg")} 8%,transparent) calc(var(--qs-pitch) - var(--qs-seam)),color-mix(in srgb,${cssVar("fg")} 52%,transparent) calc(var(--qs-pitch) - var(--qs-seam)) var(--qs-pitch))`,
  `repeating-linear-gradient(135deg,color-mix(in srgb,${cssVar("fg")} 5%,transparent) 0,color-mix(in srgb,${cssVar("fg")} 23%,transparent) calc(var(--qs-pitch) * .48),color-mix(in srgb,${cssVar("fg")} 5%,transparent) calc(var(--qs-pitch) - var(--qs-seam)),color-mix(in srgb,${cssVar("fg")} 42%,transparent) calc(var(--qs-pitch) - var(--qs-seam)) var(--qs-pitch))`,
  cssVar("bg"),
].join(",");

function quiltClamp(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<QuiltedSurfaceProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  for (const name of ["role", "aria-label", "aria-hidden"]) attributes.set(name, host.getAttribute(name));
  labelHost(host, "");
  const drawing = layer(host, "over");

  function uniforms(): Record<string, number | readonly number[]> {
    return {
      u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
      u_cells: quiltClamp(props.cells, 7, 3, 16),
      u_depth: quiltClamp(props.depth, 0.18, 0.03, 0.4),
      u_seam: quiltClamp(props.seam, 1.2, 0.5, 3),
      u_speed: quiltClamp(props.speed, 0.65, 0, 2),
      u_intensity: quiltClamp(props.intensity, 0.85, 0.2, 1),
      u_seed: Math.floor(quiltClamp(props.seed, 1, 0, 999999)),
    };
  }

  function fallback(): void {
    const pitch = Math.max(12, Math.min(host.clientWidth, host.clientHeight) / quiltClamp(props.cells, 7, 3, 16));
    drawing.el.style.setProperty("--qs-pitch", `${pitch}px`);
    drawing.el.style.setProperty("--qs-seam", `${quiltClamp(props.seam, 1.2, 0.5, 3)}px`);
  }

  fallback();
  const shader = createShader(drawing.el, {
    fragment: QUILT_FRAGMENT,
    fallback: QUILT_FALLBACK,
    uniforms: uniforms(),
    maxDpr: 0.75,
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
