import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, NOISE, TONE } from "../../../lib/glsl";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface CausticFieldProps extends MotionProps {
  /** How fast the net drifts. 0 holds it still. */
  speed: number;
  /** Scale of the surface the light passes through: lower is a broader net, higher is a denser one. */
  scale: number;
  /** How many wave trains displace the surface, from 2 to 5. */
  waves: number;
  /** How far the surface bends the light, from 0 (a flat surface, no caustics) to 1 (a tight net). */
  depth: number;
  /** How sharply the filaments fall off, from 0 (a wider net) to 1 (hairlines). */
  sharpness: number;
  /** Tone steps the field is dithered between: 2 is one-bit, 16 reads as nearly smooth. */
  levels: number;
  /** Size of one dither cell, in CSS pixels. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: CausticFieldProps = {
  speed: 0.15,
  scale: 2,
  waves: 3,
  depth: 0.5,
  sharpness: 0.7,
  levels: 5,
  pixel: 2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame held under reduced motion. */
const STILL = 1200;

/** The caustic net on a pool floor, after Nishita and Nakamae's model and Berry and Upstill's
 *  concentration rule. The surface is a sum of slow wave trains, each a slice through seeded noise
 *  along its own direction. A ray crossing the surface at p is bent by the slope, so it reaches the
 *  floor at p + d.grad(h), and a small patch of surface concentrates its light into a small patch of
 *  floor wherever the Jacobian of that map collapses. The Jacobian is I + d.H, so only the Hessian of
 *  the height is needed: each train is sampled three times across a finite step, which gives its
 *  curvature and, since its Hessian is dir times dir transposed, its whole contribution.
 *
 *  A filament is drawn only where the map truly folds, which is where det J crosses zero: the pixel
 *  distance to a fold is det over its own screen gradient, and the `fold` mask asks that the sign
 *  change lies within the line's own width, so a mere dip toward zero, which is most of the field,
 *  leaves the floor dark. The line is a hairline in fg, dimmer than the knots it joins. A knot takes
 *  the accent where the determinant stays near zero across the pixel, which is where folds cross or
 *  cusp, and there the concentration is extreme. Inside a fold the floor takes a faint extra share of
 *  light. Tone is quantized through pica_tone and the Bayer matrix. */
const FRAGMENT = `${NOISE}${DITHER}${TONE}
  uniform float u_speed;
  uniform float u_scale;
  uniform float u_waves;
  uniform float u_depth;
  uniform float u_sharpness;
  uniform float u_levels;
  void main() {
    vec2 res = u_resolution;
    vec2 p = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y) * u_scale;
    float t = u_time * u_speed;
    int n = int(u_waves + 0.5);
    float rn = float(n);
    float e = 0.045;
    vec3 curv = vec3(0.0);
    for (int i = 0; i < 5; i++) {
      if (i >= n) break;
      float fi = float(i);
      float ang = 3.1415927 * (fi + 0.5) / rn + (pica_random(vec2(fi, 3.0)) - 0.5) * 0.7;
      vec2 dir = vec2(cos(ang), sin(ang));
      float freq = mix(1.2, 2.1, pica_random(vec2(fi, 7.0)));
      float drift = mix(0.6, 1.0, pica_random(vec2(fi, 11.0))) * sign(pica_random(vec2(fi, 17.0)) - 0.5);
      float u = freq * dot(p, dir) + drift * t * 0.15;
      float lane = fi * 5.31 + 1.7;
      float n0 = pica_noise(vec2(u - e, lane));
      float n1 = pica_noise(vec2(u, lane));
      float n2 = pica_noise(vec2(u + e, lane));
      float bend = (n2 - 2.0 * n1 + n0) / (e * e * rn);
      curv += bend * freq * freq * vec3(dir.x * dir.x, dir.x * dir.y, dir.y * dir.y);
    }
    float d = u_depth * 1.5;
    float det = (1.0 + d * curv.x) * (1.0 + d * curv.z) - d * d * curv.y * curv.y;
    float grad = max(fwidth(det), 0.004);
    float gs = grad / max(d, 0.05);
    float w = mix(1.8, 0.5, u_sharpness);
    float fold = step(det, grad * (w + 0.5));
    float fil = (1.0 - smoothstep(w - 0.35, w + 0.35, abs(det) / grad)) * fold;
    float knot = smoothstep(0.4, 0.85, fil) * (1.0 - smoothstep(0.14, 0.73, gs));
    float inside = step(det, 0.0) * step(-det, grad * 6.0);
    float tone = max(fil * 0.65, knot);
    tone = max(tone, inside * 0.02);
    vec4 ink = mix(u_fg, u_accent, knot);
    pica_color = pica_tone(tone, ink, u_levels - 1.0);
  }
`;

/** What shows without WebGL2: two crossed nets of hairlines in the accent at low alpha. */
const FALLBACK = [
  `repeating-linear-gradient(38deg, transparent 0, transparent 30px, color-mix(in srgb, ${cssVar("accent")} 26%, transparent) 30px, color-mix(in srgb, ${cssVar("accent")} 26%, transparent) 32px)`,
  `repeating-linear-gradient(-52deg, transparent 0, transparent 44px, color-mix(in srgb, ${cssVar("accent")} 20%, transparent) 44px, color-mix(in srgb, ${cssVar("accent")} 20%, transparent) 46px)`,
].join(", ");

function uniforms(p: CausticFieldProps): Record<string, number> {
  return {
    u_seed: p.seed,
    u_speed: p.speed,
    u_scale: p.scale,
    u_waves: p.waves,
    u_depth: p.depth,
    u_sharpness: p.sharpness,
    u_levels: p.levels,
  };
}

export const mount: Mount<CausticFieldProps> = (host, initial = {}) => {
  let props: CausticFieldProps = { ...defaults, ...initial };

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
