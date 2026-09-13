import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface TunnelGridProps extends MotionProps {
  /** How fast the flight runs, as rings per second of texture travel. 0 holds the tunnel still. */
  speed: number;
  /** Ring density along the tunnel: lower values space the depth out, higher values crowd it. */
  rings: number;
  /** Radial lines running the length of the tunnel. */
  spokes: number;
  /** Fraction of the radius around the vanishing point that stays empty, hiding where the mapping compresses past the pixel scale. */
  fade: number;
  /** How far the spokes spiral as they recede, from 0 (straight) to 1 (a deep wind). */
  twist: number;
  /** Tone steps the grid is dithered between: 2 is one-bit, 16 reads as nearly smooth. */
  levels: number;
  /** Size of one shader pixel, in CSS pixels. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: TunnelGridProps = {
  speed: 0.15,
  rings: 14,
  spokes: 24,
  fade: 0.12,
  twist: 0.15,
  levels: 4,
  pixel: 1,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame held under reduced motion. */
const STILL = 1200;

/** The classic tunnel, an inverse mapping in the sense of Heckbert's survey: the screen point is mapped
 *  back into texture space, where the angle around the centre becomes one coordinate and the reciprocal
 *  of the radius becomes the other. An ordinary grid in that texture reads on screen as rings receding to
 *  a vanishing point crossed by spokes running to the frame's edge, and advancing the second coordinate at
 *  a constant rate reads as flight down the bore.
 *
 *  Distances to the nearest line are measured in pixels rather than in texture cells, so a hairline stays a
 *  hairline however the mapping stretches: a spoke's gap is its arc length at this radius, and a ring's gap
 *  follows the local slope of the reciprocal. The angular coordinate is taken through a whole turn of
 *  fracted cycles, which keeps the branch cut of atan on a spoke boundary instead of smearing a seam down
 *  one side of the frame. Twist leans the spokes by an angle that grows with depth, so the far end winds.
 *
 *  Inside `fade` of the radius the grid is held at nothing, because that is where the reciprocal squeezes
 *  more rings into a pixel than the raster can hold; the mask also follows the local line spacing itself,
 *  so the fade lands where aliasing would begin however the counts are set. Past it the lines climb out of
 *  a dimmed zone to full tone, which reads as depth without glow. Every fifth ring carries the accent. Coverage is quantized and
 *  dithered through pica_tone and the 8 by 8 Bayer matrix, so the hairlines keep a printed grain. */
const FRAGMENT = `${DITHER}${TONE}
  uniform float u_speed;
  uniform float u_rings;
  uniform float u_spokes;
  uniform float u_fade;
  uniform float u_twist;
  uniform float u_levels;
  void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    float r = 2.0 * length(p);
    float px = 0.5 * min(u_resolution.x, u_resolution.y);
    float scale = u_rings * 0.0625;
    float depth = scale / max(r, 0.0001);
    float v = depth + u_time * u_speed * 0.3 + pica_random(vec2(5.0, 9.0));
    float a = atan(p.y, p.x) - u_twist * 0.5 * depth - pica_random(vec2(3.0, 7.0)) * 6.2831853;
    float su = abs(fract(a * u_spokes * 0.15915494 + 0.5) - 0.5);
    float spoke = 1.0 - smoothstep(0.35, 1.35, su * 6.2831853 / u_spokes * r * px);
    float rv = abs(fract(v + 0.5) - 0.5);
    float ring = 1.0 - smoothstep(0.35, 1.35, rv * r * r / max(scale, 0.0001) * px);
    float band = floor(v + 0.5);
    float accentRing = 1.0 - step(0.5, mod(band, 5.0));
    vec4 ink = mix(u_fg, u_accent, accentRing * clamp(ring - spoke, 0.0, 1.0));
    float edge = max(u_fade, 0.01);
    float gap = min(r * r / max(scale, 0.0001), r * 6.2831853 / u_spokes) * px;
    float mask = smoothstep(edge * 0.5, edge * 1.1, r) * smoothstep(2.0, 6.0, gap);
    float dim = mix(0.55, 1.0, smoothstep(edge, edge + 0.45, r));
    float tone = max(ring, spoke) * mask * dim;
    pica_color = pica_tone(tone, ink, u_levels - 1.0);
  }
`;

/** What shows without WebGL2: still concentric hairlines in the palette's fg, quiet enough for a ground. */
const FALLBACK = `repeating-radial-gradient(circle at 50% 50%, color-mix(in srgb, ${cssVar("fg")} 55%, transparent) 0 1px, transparent 1px 42px)`;

function uniforms(p: TunnelGridProps): Record<string, number> {
  return {
    u_seed: p.seed,
    u_speed: p.speed,
    u_rings: p.rings,
    u_spokes: p.spokes,
    u_fade: p.fade,
    u_twist: p.twist,
    u_levels: p.levels,
  };
}

export const mount: Mount<TunnelGridProps> = (host, initial = {}) => {
  let props: TunnelGridProps = { ...defaults, ...initial };

  function build(): Shader {
    return createShader(host, {
      fragment: FRAGMENT,
      fallback: FALLBACK,
      uniforms: uniforms(props),
      // One drawn pixel per shader cell, scaled up square by CSS: a cell stays crisp, and a bigger cell
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
