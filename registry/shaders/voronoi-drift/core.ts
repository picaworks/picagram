import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface VoronoiDriftProps extends MotionProps {
  /** How fast the sites drift. 0 holds them still. */
  speed: number;
  /** How finely the plane divides: a low value is a few large cells, a high value a dense mosaic. */
  cells: number;
  /** Width of the hairline between cells, in CSS pixels. 0 draws no border. */
  border: number;
  /** How far a site wanders from its lattice point, from 0 (a fixed square grid) to 1 (nearly the whole cell). */
  jitter: number;
  /** Tone steps a cell's fill is dithered between: 2 is one-bit, 16 reads as nearly smooth. */
  levels: number;
  /** Size of one drawn pixel, in CSS pixels. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: VoronoiDriftProps = {
  speed: 0.12,
  cells: 14,
  border: 1,
  jitter: 0.9,
  levels: 4,
  pixel: 2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame held under reduced motion. */
const STILL = 1200;

/** Worley's cellular basis: one site per lattice cell, jittered by the seed, and the distance to the
 *  nearest site (f1) with the gap to the second nearest (f2) as the field. The border is where f2 - f1
 *  vanishes, and dividing that gap by its screen-space derivative holds the hairline to an even width in
 *  pixels however large the cell, which is what keeps a big territory's border as thin as a small one's.
 *
 *  Each site wanders on a slow Lissajous path inside its own cell, with per-site phases and rates from
 *  pica_random, so the territories grow, shrink, and swap neighbours without churn. At the default speed a
 *  site needs the better part of a minute to cross its own cell, yet over ten seconds the borders around
 *  it have visibly shifted. Because a site never leaves its cell, the 3 by 3 search around the pixel's own
 *  lattice cell always holds the two nearest.
 *
 *  The winning site's home cell also picks the fill: cubing its draw keeps most cells near the ground and
 *  makes a stronger accent an occasional territory, each one a flat printed tone dithered through the 8 by
 *  8 Bayer matrix between the two steps it sits between. Borders are fg. No noise is sampled at all; a
 *  pixel costs about forty integer hashes. */
const FRAGMENT = `${DITHER}${TONE}
  uniform float u_speed;
  uniform float u_cells;
  uniform float u_border;
  uniform float u_jitter;
  uniform float u_levels;
  uniform float u_pixel;
  vec2 voro_site(ivec2 home, float t) {
    vec2 cell = vec2(home);
    vec4 seed = vec4(
      pica_random(cell + vec2(13.0, 41.0)),
      pica_random(cell + vec2(71.0, 7.0)),
      pica_random(cell + vec2(29.0, 97.0)),
      pica_random(cell + vec2(89.0, 53.0)));
    float rate = 0.7 * u_speed;
    vec2 angle = vec2(
      rate * (0.7 + 0.6 * seed.z) * t + seed.x * 6.2831853,
      rate * (0.7 + 0.6 * seed.w) * t + seed.y * 6.2831853);
    return cell + 0.5 + 0.45 * u_jitter * sin(angle);
  }
  void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y) * (u_cells / 3.0);
    ivec2 base = ivec2(floor(p));
    float f1 = 8.0;
    float f2 = 8.0;
    ivec2 near1 = base;
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        ivec2 home = base + ivec2(dx, dy);
        float d = length(p - voro_site(home, u_time));
        if (d < f1) {
          f2 = f1;
          f1 = d;
          near1 = home;
        } else if (d < f2) {
          f2 = d;
        }
      }
    }
    float edge = f2 - f1;
    float edge_px = edge / max(fwidth(edge), 0.0001);
    vec2 winner = vec2(near1);
    float pick = pica_random(winner + vec2(59.0, 23.0));
    float ratio = pica_random(winner + vec2(17.0, 79.0));
    float steps = max(1.0, u_levels);
    float level = floor(pick * pick * pick * steps);
    float tone = (level + 0.25 + 0.5 * ratio) / steps;
    vec4 fill = pica_tone(tone, u_accent, steps);
    float half_px = 0.5 * max(u_border / u_pixel, 1.0);
    float line = (1.0 - smoothstep(half_px - 0.3, half_px + 0.3, edge_px)) * step(0.01, u_border);
    pica_color = mix(fill, u_fg, line);
  }
`;

/** What shows without WebGL2: flat accent fields at a few low alphas under a fg hairline grid, still in
 *  the palette's own colors. */
const FALLBACK = [
  `repeating-linear-gradient(0deg, ${cssVar("fg")} 0, ${cssVar("fg")} 1px, transparent 1px, transparent 88px)`,
  `repeating-linear-gradient(90deg, ${cssVar("fg")} 0, ${cssVar("fg")} 1px, transparent 1px, transparent 88px)`,
  `linear-gradient(105deg, color-mix(in srgb, ${cssVar("accent")} 18%, transparent) 0 34%, color-mix(in srgb, ${cssVar("accent")} 8%, transparent) 34% 62%, color-mix(in srgb, ${cssVar("accent")} 24%, transparent) 62%)`,
].join(", ");

function uniforms(p: VoronoiDriftProps): Record<string, number> {
  return {
    u_seed: p.seed,
    u_speed: p.speed,
    u_cells: p.cells,
    u_border: p.border,
    u_jitter: p.jitter,
    u_levels: p.levels,
    u_pixel: p.pixel,
  };
}

export const mount: Mount<VoronoiDriftProps> = (host, initial = {}) => {
  let props: VoronoiDriftProps = { ...defaults, ...initial };

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
