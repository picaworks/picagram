import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PixelPlasmaProps extends MotionProps {
  /** How fast the field drifts. 0 holds it still. */
  speed: number;
  /** Field size across the frame: lower values are broad lobes, higher values are busier. */
  scale: number;
  /** Sinusoids summed into the field. The last one rings out from a slowly moving centre. */
  waves: number;
  /** Tone steps the field is dithered between: 2 is one-bit, 16 reads as nearly smooth. */
  levels: number;
  /** Size of one drawn pixel, in CSS pixels. Coarseness is the point. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: PixelPlasmaProps = {
  speed: 0.2,
  scale: 1.4,
  waves: 4,
  levels: 5,
  pixel: 6,
  fps: 20,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame held under reduced motion. */
const STILL = 1200;

/** The demoscene plasma as a printed screen. The field is a sum of sinusoids, the way the effect has
 *  always been described: one wave rides each axis, any further ones take directions from the seed, and
 *  the last is a ring about a centre that wanders slowly on its own seeded path. The palette cycling the
 *  original is known for is dropped on purpose: hue carries nothing here, so tone carries the field alone.
 *  Each wave's direction, frequency, rate, and phase come from pica_random, so the seed reshapes the field
 *  while keeping the same grammar.
 *
 *  The field inks only where it climbs. Its lower reaches hold a whisper of screen over the ground, the
 *  lobes step up through the accent in a handful of Bayer-quantized tones, and the brightest ridges alone
 *  tip to fg, the second palette tone. The ramp runs over the field's practical range rather than its
 *  theoretical one, since a normalized sum of sines rarely nears one: below it the ground shows, at the
 *  top of it fg does. Nothing covers the frame edge to edge, so type set over it still reads. Each step
 *  is one coarse square pixel, so the softness reads as print rather than as a smooth gradient. No noise
 *  is sampled at all; a pixel costs a few sines. */
const FRAGMENT = `${DITHER}${TONE}
  uniform float u_speed;
  uniform float u_scale;
  uniform float u_waves;
  uniform float u_levels;
  void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y) * u_scale;
    float t = u_time * u_speed;
    int n = int(u_waves + 0.5);
    float field = 0.0;
    for (int i = 0; i < 5; i++) {
      if (i >= n - 1) break;
      float fi = float(i);
      float base = i < 2 ? fi * 1.5707963 : pica_random(vec2(fi, 5.0)) * 6.2831853;
      float ang = base + (pica_random(vec2(fi, 7.0)) - 0.5) * 0.6;
      vec2 dir = vec2(cos(ang), sin(ang));
      float freq = 6.2831853 * mix(0.5, 1.15, pica_random(vec2(fi, 11.0)));
      float rate = mix(0.2, 0.6, pica_random(vec2(fi, 13.0)));
      float phase = pica_random(vec2(fi, 17.0)) * 6.2831853;
      field += sin(dot(p, dir) * freq + t * rate + phase);
    }
    float ca = pica_random(vec2(9.0, 19.0)) * 6.2831853;
    float cb = pica_random(vec2(9.0, 23.0)) * 6.2831853;
    vec2 centre = 0.4 * vec2(sin(t * 0.21 + ca), cos(t * 0.17 + cb));
    float ring = 6.2831853 * mix(0.7, 1.4, pica_random(vec2(9.0, 29.0)));
    field += sin(length(p - centre) * ring - t * 0.35);
    field /= float(max(n, 1));
    float lit = smoothstep(0.1, 0.7, field);
    float tone = 0.04 + 0.92 * lit;
    float ridge = smoothstep(0.78, 1.0, lit);
    vec4 ink = vec4(mix(u_accent.rgb, u_fg.rgb, ridge), mix(u_accent.a, u_fg.a, ridge));
    pica_color = pica_tone(tone, ink, u_levels - 1.0);
  }
`;

/** What shows without WebGL2: a still lobe of accent at low alpha, in the palette's own colors. */
const FALLBACK = `radial-gradient(80% 70% at 42% 40%, color-mix(in srgb, ${cssVar("accent")} 30%, transparent), transparent 72%)`;

function uniforms(p: PixelPlasmaProps): Record<string, number> {
  return { u_seed: p.seed, u_speed: p.speed, u_scale: p.scale, u_waves: p.waves, u_levels: p.levels };
}

export const mount: Mount<PixelPlasmaProps> = (host, initial = {}) => {
  let props: PixelPlasmaProps = { ...defaults, ...initial };

  function build(): Shader {
    return createShader(host, {
      fragment: FRAGMENT,
      fallback: FALLBACK,
      uniforms: uniforms(props),
      // One drawn pixel per cell of `pixel` CSS pixels, scaled up square by CSS: a cell stays crisp, and a
      // bigger cell costs less to draw.
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
