import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, NOISE, TONE } from "../../../lib/glsl";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ContourFlowProps extends MotionProps {
  /** How fast the terrain drifts. 0 holds it still. */
  speed: number;
  /** Size of the terrain across the frame: lower values are broad hills, higher values are busier. */
  scale: number;
  /** How many contours the field is cut into, at a constant interval. */
  bands: number;
  /** Direction the light comes from, in degrees: 0 is the top, 90 the right, 315 the upper left. */
  light: number;
  /** How strongly the light changes a line's weight and tone, from 0 (every line alike) to 1. */
  relief: number;
  /** Every this many contours is drawn as an index contour in the accent. 0 draws none. */
  index: number;
  /** Width of a contour line in shader pixels before the relief thins or thickens it. */
  thickness: number;
  /** Tone steps the lines are dithered between: 2 is one-bit, 16 reads as nearly smooth. */
  levels: number;
  /** Size of one dither cell, in CSS pixels. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: ContourFlowProps = {
  speed: 0.12,
  scale: 1.8,
  bands: 16,
  light: 315,
  relief: 0.7,
  index: 5,
  thickness: 1,
  levels: 4,
  pixel: 1,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame held under reduced motion. */
const STILL = 1200;

/** Contour lines lit after Tanaka's relief method. A domain-warped noise field stands in for terrain and
 *  drifts slowly, and the field is cut at a constant interval into `bands` contours, every `index`-th one
 *  drawn as an index contour in the accent after Imhof's discipline of the interval. The screen-space
 *  derivative of the field does two jobs: its magnitude holds each line to a constant width in pixels on
 *  any slope, and its direction is the uphill, so the dot of the downhill with the light direction says
 *  whether the slope under a line faces the light. A line that does is drawn light and thin, and one that
 *  faces away is drawn dark and thick, so the relief reads from the lines alone. The tone is quantized
 *  and dithered through the 8 by 8 Bayer matrix, so the lines keep a printed grain. */
const FRAGMENT = `${NOISE}${DITHER}${TONE}
  uniform float u_speed;
  uniform float u_scale;
  uniform float u_bands;
  uniform float u_light;
  uniform float u_relief;
  uniform float u_index;
  uniform float u_thickness;
  uniform float u_levels;
  void main() {
    vec2 res = u_resolution;
    vec2 p = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y) * u_scale;
    float t = u_time * u_speed;
    vec2 q = vec2(pica_fbm(p + vec2(0.0, 0.31 * t), 3), pica_fbm(p + vec2(5.2, 1.3) - 0.23 * t, 3));
    float field = 0.48 * pica_fbm(p + 0.8 * q + vec2(0.07 * t, -0.03 * t), 3);
    vec2 grad = vec2(dFdx(field), dFdy(field));
    float rad = u_light * 0.017453292519943295;
    vec2 sun = vec2(sin(rad), cos(rad));
    float lit = clamp(dot(-grad, sun) / max(length(grad), 0.0001), -1.0, 1.0);
    float side = 0.5 - 0.5 * lit;
    float coord = field * u_bands;
    float dist = min(fract(coord), 1.0 - fract(coord));
    float aa = max(fwidth(coord), 0.0001);
    float band = floor(coord + 0.5);
    float isIndex = u_index > 0.5 ? 1.0 - step(0.5, mod(band, u_index)) : 0.0;
    float w = max(u_thickness * mix(1.0, mix(0.4, 2.3, side), u_relief) * (1.0 + 0.5 * isIndex), 0.3);
    float line = 1.0 - smoothstep(0.5 * w - 0.6, 0.5 * w + 0.6, dist / aa);
    float tone = line * mix(1.0, mix(0.18, 1.0, side), u_relief) * mix(0.92, 1.0, isIndex);
    vec4 ink = mix(u_fg, u_accent, isIndex);
    pica_color = pica_tone(tone, ink, u_levels - 1.0);
  }
`;

/** What shows without WebGL2: still fg hairlines at low alpha, in the palette's own color. */
const FALLBACK = `repeating-linear-gradient(115deg, color-mix(in srgb, ${cssVar("fg")} 30%, transparent) 0px, color-mix(in srgb, ${cssVar("fg")} 30%, transparent) 1px, transparent 1px, transparent 15px)`;

function uniforms(p: ContourFlowProps): Record<string, number> {
  return {
    u_seed: p.seed,
    u_speed: p.speed,
    u_scale: p.scale,
    u_bands: p.bands,
    u_light: p.light,
    u_relief: p.relief,
    u_index: p.index,
    u_thickness: p.thickness,
    u_levels: p.levels,
  };
}

export const mount: Mount<ContourFlowProps> = (host, initial = {}) => {
  let props: ContourFlowProps = { ...defaults, ...initial };

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
