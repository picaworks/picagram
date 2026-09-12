import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, NOISE, TONE } from "../../../lib/glsl";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AuroraProps extends MotionProps {
  /** How fast the curtains drift and fold. 0 holds them still. */
  speed: number;
  /** Curtain layers, drawn from near to far. */
  curtains: number;
  /** How far each lower border bows toward the horizon at its ends, from 0 (level) to 1 (all the way down). */
  arc: number;
  /** How far the rays stand above the lower border, as a fraction of the host's height. */
  height: number;
  /** Where the horizon sits, measured down from the top. Nothing draws below it. */
  horizon: number;
  /** How far the curtains wander side to side, from 0 (straight) to 1 (a wide drift). */
  sway: number;
  /** How deep the pleats along a curtain run, from 0 (a plain arc) to 1 (deep folds). */
  folds: number;
  /** How strongly the vertical striations show, from 0 (a smooth sheet) to 1 (a rayed arc). */
  rays: number;
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
  curtains: 3,
  arc: 0.35,
  height: 0.7,
  horizon: 0.85,
  sway: 0.5,
  folds: 0.5,
  rays: 0.6,
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

/** A discrete aurora, the kind that reads as curtains rather than as a fuzzy patch, drawn the way the
 *  measurements describe it.
 *
 *  Each layer is a sheet standing on the ground, and the layers run from near to far: a farther one stands
 *  nearer the horizon, reaches less high, draws dimmer, and carries finer rays. Its lower border is a
 *  parabola that bows toward the horizon at the ends, because an arc runs over a thousand kilometres
 *  horizontally while standing twenty or thirty tall, so the bow is perspective rather than curvature. One
 *  slow noise, read across the host and never down it, both slides the sheet sideways and lifts or drops its
 *  foot, which is what a pleat does when it swings toward the viewer or away.
 *
 *  Emission stops where the precipitating electrons stop, and the air thickens steeply downward, so the
 *  lower border falls to a tenth of its peak within a couple of dither cells and the fade above it is long
 *  and asymmetric. Rays are field aligned, so the striations come from noise in the folded horizontal
 *  coordinate alone: they stay vertical, they travel with the fold, and the brightest of them reach highest.
 *  The same field serrates the border, which is the curl, the smallest of the distortions. The sheet is
 *  optically thin, so brightness is the emission gathered along the line of sight; where the fold steepens
 *  the sheet is turning edge on, the path lengthens, and it reads as a bright vertical streak. That gain
 *  reads the fold's own slope rather than the whole border's, because the perspective bow is distance, not a
 *  fold. Layers combine with max, so overlapping light never blooms, and nothing draws below the horizon.
 *
 *  Two tones only: the accent carries the sheet, and fg reaches only the lower border and the edge-on folds.
 *  pica_tone quantizes through the 8 by 8 Bayer matrix, so the softness is a printed grain, not a blur, and
 *  it hands back straight alpha over whatever ground the page has. */
const FRAGMENT = `${NOISE}${DITHER}${TONE}
  uniform float u_speed;
  uniform float u_curtains;
  uniform float u_arc;
  uniform float u_height;
  uniform float u_horizon;
  uniform float u_sway;
  uniform float u_folds;
  uniform float u_rays;
  uniform float u_intensity;
  uniform float u_levels;
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float vy = 1.0 - uv.y;
    float t = u_time * u_speed;
    float cell = 1.0 / u_resolution.y;
    float wide = u_resolution.x / u_resolution.y;
    // A narrow window shows less of the arc's thousand-kilometre run, so its bow and its folds cover less
    // sky. Without this a phone reads the same curve as a row of peaks.
    float persp = clamp(0.45 + 0.35 * wide, 0.45, 1.0);
    int n = int(u_curtains + 0.5);
    float span = max(1.0, float(n) - 1.0);
    float sheet = 0.0;
    float hem = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= n) break;
      float fi = float(i);
      float far = fi / span;
      float pa = pica_random(vec2(fi, 3.0)) * 24.0;
      float pb = pica_random(vec2(fi, 11.0)) * 24.0;
      float pc = pica_random(vec2(fi, 19.0));
      float drift = pica_noise(vec2(uv.x * 0.8 + pa, t * 0.3));
      float wave = pica_noise(vec2(uv.x * 3.4 + pb, t * 0.5 + pa));
      float xf = uv.x + u_sway * 0.2 * drift + u_folds * 0.07 * wave;
      float foot = u_horizon * mix(0.50, 0.94, sqrt(far));
      float depth = u_horizon * mix(0.26, 0.10, far) * persp;
      float bow = clamp(2.0 * (xf - 0.5 - (pc - 0.5) * 0.6), -1.6, 1.6);
      float curl = pica_fbm(vec2(xf * wide * mix(20.0, 34.0, far) + pb, pa), 2);
      float border = min(u_horizon, foot + u_arc * depth * bow * bow - depth * u_folds * (0.34 * wave + 0.05 * curl));
      float d = border - vy;
      float ray = smoothstep(0.1, 0.9, 0.5 + 0.75 * curl);
      float tall = max(0.04, u_height * mix(1.0, 0.32, far) * mix(1.0, 0.35 + 1.4 * ray, u_rays));
      float up = max(d, 0.0) / tall;
      float body = smoothstep(-cell, cell * 1.5, d) * (0.78 * exp(-up * 10.0) + 0.34 * exp(-up * 5.0) + 0.09 * ray * exp(-up * 1.2));
      float lit = body * mix(1.0, 0.25 + 0.85 * ray, u_rays);
      float steep = u_folds * smoothstep(2.5, 6.5, abs(dFdx(wave)) * u_resolution.x);
      float dim = mix(1.0, 0.36, far);
      sheet = max(sheet, dim * lit * (1.0 + 0.8 * steep));
      float rim = exp(-max(d, 0.0) / max(cell * 3.0, u_height * 0.03)) * mix(1.0, 0.55 + 0.55 * ray, u_rays);
      hem = max(hem, dim * max(rim * body, steep * lit * 1.3));
    }
    float tone = clamp(sheet * u_intensity, 0.0, 1.0);
    float mark = smoothstep(0.38, 0.88, hem);
    vec4 ink = vec4(mix(u_accent.rgb, u_fg.rgb, mark), mix(u_accent.a, u_fg.a, mark));
    pica_color = pica_tone(tone, ink, u_levels - 1.0);
  }
`;

/** What shows without WebGL2: two still arcs in the palette's own colors, the near one above the far one,
 *  each filled with accent that gathers toward a bright lower border and bows away at its ends. */
const ARCS: readonly string[] = [
  `radial-gradient(88% 50% at 46% -6%, transparent 52%, color-mix(in srgb, ${cssVar("accent")} 20%, transparent) 74%, color-mix(in srgb, ${cssVar("accent")} 72%, transparent) 88%, ${cssVar("fg")} 92%, transparent 93%)`,
  `radial-gradient(122% 78% at 57% -4%, transparent 68%, color-mix(in srgb, ${cssVar("accent")} 12%, transparent) 83%, color-mix(in srgb, ${cssVar("accent")} 42%, transparent) 93%, ${cssVar("fg")} 96%, transparent 97%)`,
];

const FALLBACK = ARCS.join(", ");

function uniforms(p: AuroraProps): Record<string, number> {
  return {
    u_seed: p.seed,
    u_speed: p.speed,
    u_curtains: p.curtains,
    u_arc: p.arc,
    u_height: p.height,
    u_horizon: p.horizon,
    u_sway: p.sway,
    u_folds: p.folds,
    u_rays: p.rays,
    u_intensity: p.intensity,
    u_levels: p.levels,
  };
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
