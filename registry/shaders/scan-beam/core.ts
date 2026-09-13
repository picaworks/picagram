import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ScanBeamProps extends MotionProps {
  /** Seconds per full turn of the beam. */
  period: number;
  /** Range rings drawn as hairlines, counting the outer rim. */
  rings: number;
  /** Bearing spokes radiating from the centre. */
  spokes: number;
  /** Seeded echoes that light as the beam crosses them, then fade in steps. */
  echoes: number;
  /** How far around the circle a return keeps showing, from 0 (the beam alone) to 1 (the whole turn). */
  persistence: number;
  /** Tone steps the decay is dithered between: 2 is one-bit, 16 reads as nearly smooth. */
  levels: number;
  /** Size of one shader pixel, in CSS pixels. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: ScanBeamProps = {
  period: 8,
  rings: 4,
  spokes: 12,
  echoes: 7,
  persistence: 0.7,
  levels: 6,
  pixel: 1,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame held under reduced motion: the beam a sixth of the way round, its stepped trail behind it. */
const STILL = 1200;

/** A plan position indicator, after the IEEE radar definitions: range is distance from the centre and
 *  bearing is the angle around it, the antenna scans at a constant rate, and a return persists on the
 *  display and then decays.
 *
 *  Bearing zero sits at the top and the beam runs clockwise, so a bearing's lag, the fraction of a turn
 *  since the beam last crossed it, is the whole state of the phosphor. The trail is one minus lag over
 *  `persistence`, the beam head is the first sliver of that, and each seeded echo shares the decay of its
 *  own bearing, so nothing can light before the beam reaches it. pica_tone quantizes every tone into
 *  `levels` steps through the 8 by 8 Bayer matrix, which is what makes the sweep read as a printed
 *  sequence of bands rather than a glowing tail. Range rings are the distances to the nearest multiple of
 *  the ring spacing, and bearing spokes are the perpendicular distance to the nearest line through the
 *  centre, so neither needs a loop. fg carries the graticule and accent carries the beam and its echoes:
 *  two layers of pica_tone composited with over. */
const FRAGMENT = `${DITHER}${TONE}
  uniform float u_period;
  uniform float u_rings;
  uniform float u_spokes;
  uniform float u_echoes;
  uniform float u_persistence;
  uniform float u_levels;
  void main() {
    vec2 res = u_resolution;
    float unit = min(res.x, res.y);
    vec2 p = (gl_FragCoord.xy - 0.5 * res) / unit;
    float r = length(p);
    float turn = atan(p.y, p.x) * 0.15915494;
    float rim = 0.44;
    float w = 1.4 / unit;
    float inside = 1.0 - smoothstep(rim - w, rim + w, r);
    float turns = u_time / max(u_period, 0.5);
    float lag = fract(turns + turn - 0.25);
    float persist = max(u_persistence, 0.02);
    float trail = clamp(1.0 - lag / persist, 0.0, 1.0);
    float beam = 1.0 - smoothstep(0.0, 0.006, lag);
    float sweep = max(beam, trail * 0.82) * inside;
    int ne = int(u_echoes + 0.5);
    for (int i = 0; i < 24; i++) {
      if (i >= ne) break;
      float fi = float(i);
      float et = pica_random(vec2(fi * 1.71 + 0.31, 0.7)) - 0.5;
      float er = (0.16 + 0.74 * pica_random(vec2(fi * 2.37 + 0.11, 3.1))) * rim;
      float ew = mix(0.009, 0.017, pica_random(vec2(fi * 3.13 + 0.53, 5.9)));
      vec2 ep = vec2(cos(et * 6.2831853), sin(et * 6.2831853)) * er;
      float elag = fract(turns + et - 0.25);
      float decay = clamp(1.0 - elag / persist, 0.0, 1.0);
      float blip = 1.0 - smoothstep(ew - w, ew + w, length(p - ep));
      sweep = max(sweep, blip * sqrt(decay) * inside);
    }
    float gap = rim / max(u_rings, 1.0);
    float ri = floor(r / gap + 0.5);
    float ring = ri < 1.0 ? 0.0 : 1.0 - smoothstep(0.0, w * 1.5, abs(r - ri * gap));
    float sa = abs(fract(turn * max(u_spokes, 1.0) + 0.5) - 0.5) / max(u_spokes, 1.0);
    float spoke = 1.0 - smoothstep(0.0, w * 1.5, r * sin(sa * 6.2831853));
    float grid = max(ring, spoke) * (1.0 - smoothstep(rim, rim + w * 2.0, r));
    vec4 marks = pica_tone(grid * 0.55, u_fg, u_levels - 1.0);
    vec4 light = pica_tone(sweep, u_accent, u_levels - 1.0);
    float a = light.a + marks.a * (1.0 - light.a);
    pica_color = vec4((light.rgb * light.a + marks.rgb * marks.a * (1.0 - light.a)) / max(a, 0.0001), a);
  }
`;

/** What shows without WebGL2: concentric fg rings with one still accent wedge, in the palette's colors. */
const FALLBACK = [
  `conic-gradient(from 300deg at 50% 50%, color-mix(in srgb, ${cssVar("accent")} 55%, transparent) 0deg 44deg, transparent 44deg 360deg)`,
  `repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 42px, color-mix(in srgb, ${cssVar("fg")} 40%, transparent) 42px, color-mix(in srgb, ${cssVar("fg")} 40%, transparent) 43px, transparent 43px, transparent 84px)`,
].join(", ");

function uniforms(p: ScanBeamProps): Record<string, number> {
  return {
    u_seed: p.seed,
    u_period: p.period,
    u_rings: p.rings,
    u_spokes: p.spokes,
    u_echoes: p.echoes,
    u_persistence: p.persistence,
    u_levels: p.levels,
  };
}

export const mount: Mount<ScanBeamProps> = (host, initial = {}) => {
  let props: ScanBeamProps = { ...defaults, ...initial };

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
