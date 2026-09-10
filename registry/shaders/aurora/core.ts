import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, NOISE } from "../../../lib/glsl";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AuroraProps extends MotionProps {
  /** How fast the curtains drift and ripple. 0 holds them still. */
  speed: number;
  /** Number of vertical light curtains. */
  curtains: number;
  /** How far down the host the curtains reach before they fade out, as a fraction of its height. */
  height: number;
  /** How far the curtains wander side to side, from 0 (straight) to 1 (a wide drift). */
  sway: number;
  /** How strongly the curtains show over the ground, from 0 to 1. */
  intensity: number;
  /** Tone steps the curtains are dithered between: 2 is one-bit, 16 reads as nearly smooth. */
  levels: number;
  /** Size of one dither cell, in CSS pixels. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: AuroraProps = {
  speed: 0.15,
  curtains: 4,
  height: 0.7,
  sway: 0.5,
  intensity: 0.8,
  levels: 6,
  pixel: 2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame held under reduced motion. */
const STILL = 1200;

/** Each curtain is a fixed vertical band, solid from the top so it reads as hanging rather than floating,
 *  whose centerline bends with low-frequency noise along its height. A separate, stricter noise picks out
 *  its brightest folds. The tallest curtain at each point on screen wins, so bands read as separate rather
 *  than adding into a bloom, and a fixed envelope fades every curtain out by `height`. The combined field is
 *  dithered between a few tone steps with the 8 by 8 Bayer matrix, so the softness is a printed grain rather
 *  than a blur, and the ink only reaches fg at those folds, the second tone. */
const FRAGMENT = `${NOISE}${DITHER}
uniform float u_speed;
uniform float u_curtains;
uniform float u_height;
uniform float u_sway;
uniform float u_intensity;
uniform float u_levels;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float vy = 1.0 - uv.y;
  float t = u_time * u_speed;
  float envelope = 1.0 - smoothstep(u_height * 0.33, u_height, vy);
  int n = int(u_curtains + 0.5);
  float nf = float(n);
  float field = 0.0;
  float fold = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= n) break;
    float fi = float(i);
    float baseX = (fi + 0.5) / nf + (pica_random(vec2(fi, 4.0)) - 0.5) * 0.12;
    float phaseA = pica_random(vec2(fi, 9.0)) * 40.0;
    float phaseB = pica_random(vec2(fi, 17.0)) * 40.0;
    float wander = u_sway * 0.16 * pica_noise(vec2(vy * 1.7 + phaseA, t * 0.5 + phaseB));
    float dx = abs(uv.x - baseX - wander);
    float presence = (1.0 - smoothstep(0.026, 0.07, dx)) * envelope;
    float ripple = 0.5 + 0.5 * pica_noise(vec2(vy * 4.5 + phaseB, t * 0.8 + phaseA));
    field = max(field, presence * mix(0.65, 1.0, ripple));
    fold = max(fold, presence * ripple);
  }
  float steps = max(1.0, u_levels - 1.0);
  float tone = clamp(field * u_intensity, 0.0, 1.0);
  tone = floor(tone * steps + pica_bayer8(ivec2(gl_FragCoord.xy))) / steps;
  vec3 ink = mix(u_accent.rgb, u_fg.rgb, smoothstep(0.6, 0.82, fold));
  float ground = step(0.001, u_bg.a);
  pica_color = vec4(mix(ink, mix(u_bg.rgb, ink, tone), ground), max(tone * u_accent.a, u_bg.a));
}
`;

/** What shows without WebGL2: the same top-down fade, still in the palette's own accent. */
const FALLBACK = `linear-gradient(to bottom, color-mix(in srgb, ${cssVar("accent")} 35%, transparent), transparent 70%)`;

function uniforms(p: AuroraProps): Record<string, number> {
  return { u_seed: p.seed, u_speed: p.speed, u_curtains: p.curtains, u_height: p.height, u_sway: p.sway, u_intensity: p.intensity, u_levels: p.levels };
}

export const mount: Mount<AuroraProps> = (host, initial = {}) => {
  let props: AuroraProps = { ...defaults, ...initial };

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
