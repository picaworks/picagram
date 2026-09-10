import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, NOISE } from "../../../lib/glsl";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface MeshGradientProps extends MotionProps {
  /** How fast the fields drift. 0 holds them still. */
  speed: number;
  /** Size of the color fields: lower values are broad and soft, higher values are busier. */
  scale: number;
  /** How far the fields fold into each other, from 0 (plain noise) to 1 (deep folds). */
  warp: number;
  /** How strongly the accent shows over the ground, from 0 to 1. */
  intensity: number;
  /** Tone steps the gradient is dithered between: 2 is one-bit, 16 reads as nearly smooth. */
  levels: number;
  /** Size of one dither cell, in CSS pixels. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: MeshGradientProps = {
  speed: 0.25,
  scale: 1.1,
  warp: 0.6,
  intensity: 0.9,
  levels: 6,
  pixel: 2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame held under reduced motion. */
const STILL = 1200;

/** Two noise fields fold a third (domain warping), which sets how much accent each cell carries. The tone
 *  is then dithered between a few steps with the 8 by 8 Bayer matrix, so the gradient keeps a printed
 *  grain instead of banding, and the ink leans halfway toward fg at the field's peaks, the second tone. */
const FRAGMENT = `${NOISE}${DITHER}
uniform float u_speed;
uniform float u_scale;
uniform float u_warp;
uniform float u_intensity;
uniform float u_levels;
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y) * u_scale;
  float t = u_time * u_speed;
  vec2 q = vec2(pica_fbm(p + vec2(0.0, 0.35 * t), 3), pica_fbm(p + vec2(5.2, 1.3) - 0.25 * t, 3));
  float field = pica_fbm(p + 2.0 * u_warp * q + vec2(0.1 * t, 0.0), 4);
  float steps = max(1.0, u_levels - 1.0);
  float tone = clamp(smoothstep(-0.3, 0.6, field) * u_intensity, 0.0, 1.0);
  tone = floor(tone * steps + pica_bayer8(ivec2(gl_FragCoord.xy))) / steps;
  vec3 ink = mix(u_accent.rgb, u_fg.rgb, smoothstep(0.3, 0.7, field) * 0.5);
  float ground = step(0.001, u_bg.a);
  pica_color = vec4(mix(ink, mix(u_bg.rgb, ink, tone), ground), max(tone * u_accent.a, u_bg.a));
}
`;

/** What shows without WebGL2: the same accent glow as a still gradient, still in the palette's colors. */
const FALLBACK = `radial-gradient(90% 70% at 30% 35%, color-mix(in srgb, ${cssVar("accent")} 70%, transparent), transparent 75%)`;

function uniforms(p: MeshGradientProps): Record<string, number> {
  return { u_seed: p.seed, u_speed: p.speed, u_scale: p.scale, u_warp: p.warp, u_intensity: p.intensity, u_levels: p.levels };
}

export const mount: Mount<MeshGradientProps> = (host, initial = {}) => {
  let props: MeshGradientProps = { ...defaults, ...initial };

  function build(): Shader {
    return createShader(host, {
      fragment: FRAGMENT,
      fallback: FALLBACK,
      uniforms: uniforms(props),
      // One drawn pixel per dither cell, scaled up square by CSS: a cell stays crisp, and a bigger cell
      // costs less to draw.
      maxDpr: 1 / Math.max(1, props.pixel),
      css: "image-rendering:pixelated",
      onInvalidate: () => loop.redraw(),
    });
  }

  let shader = build();

  function draw(t: number): void {
    shader.draw(t);
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL, frame: draw });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.pixel !== before.pixel) {
        shader.destroy();
        shader = build();
      } else {
        for (const [name, value] of Object.entries(uniforms(props))) shader.set(name, value);
      }
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      shader.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
