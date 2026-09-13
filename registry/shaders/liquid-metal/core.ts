import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createShader, pointerUv, type Shader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface LiquidMetalProps extends MotionProps {
  /** How fast the blobs drift. 0 holds them still. */
  speed: number;
  /** How many centres contribute to the field. */
  blobs: number;
  /** Size of each drop, as a fraction of the host's short side. */
  size: number;
  /** Field sum that counts as surface: lower values fatten every blob and merge them sooner. */
  threshold: number;
  /** Where the horizon sits in the reflected environment, from 0 (all ground) to 1 (all sky). */
  horizon: number;
  /** Whether the nearest blob leans toward the pointer. */
  pointer: boolean;
  /** Tone steps the metal is dithered between: 2 is one-bit, 16 reads as nearly smooth. */
  levels: number;
  /** Size of one dither cell, in CSS pixels. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: LiquidMetalProps = {
  speed: 0.12,
  blobs: 3,
  size: 0.16,
  threshold: 0.5,
  horizon: 0.55,
  pointer: true,
  levels: 6,
  pixel: 2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame held under reduced motion. */
const STILL = 1200;

/** Mercury drops on a table, after Blinn's algebraic surfaces for the shape and Blinn and Newell's
 *  reflection mapping for the shading.
 *
 *  Each centre adds a Gaussian bump, and the surface is the contour where the sum of bumps reaches the
 *  threshold, so two centres merge through a smooth neck rather than popping. The centres stay small and
 *  close to their seeded homes, which is what keeps the field reading as separate drops instead of one
 *  mass: drop zero sits near the middle, drop one is homed a hair over a diameter away so the pair keeps
 *  growing a neck and letting it go, and the rest hold seeded points on a loose ring. The surface normal
 *  is then read the way a sphere's would be: the summed gradient gives the outward direction in the
 *  plane, and the field's depth past the threshold gives the elevation, from flat at the rim to straight
 *  at the viewer on the crown. Reflecting the eye ray off that normal picks a direction in a two band
 *  environment, fg above the horizon and the page's own ground below, which is all the metal is: a mirror
 *  with no light. The mirror holds mid-tones, so the drops sit quiet under type, and the accent sits in
 *  the thin band where the horizon itself reflects, showing as one bent line across each drop.
 *
 *  The pointer, when on, pulls the nearest centre a fifth of the way toward the cursor. The tone runs
 *  through pica_tone and the 8 by 8 Bayer matrix, so every edge is a printed step rather than a blur, and
 *  there is no specular term anywhere, because a highlight would be glow by another name. */
const FRAGMENT = `${DITHER}${TONE}
  uniform float u_speed;
  uniform float u_blobs;
  uniform float u_size;
  uniform float u_threshold;
  uniform float u_horizon;
  uniform float u_levels;
  // Drop zero's seeded home near the middle; drop one keys off it so the two stay near enough to merge.
  vec2 firstHome() {
    float a = pica_random(vec2(0.0, 3.0)) * 6.2831853;
    return vec2(cos(a), sin(a)) * mix(0.05, 0.14, pica_random(vec2(0.0, 5.0)));
  }
  vec3 centre(int i, float t, vec2 lim) {
    float fi = float(i);
    float z = mix(0.4, 0.65, pica_random(vec2(fi, 17.0)));
    vec2 home;
    if (i == 0) {
      home = firstHome();
    } else if (i == 1) {
      // A companion: homed just over one merge distance from drop zero, so the still frame catches the
      // pair mid-neck and the slow drift below keeps parting and rejoining them.
      float d = pica_random(vec2(1.0, 7.0)) * 6.2831853;
      float gap = mix(3.1, 3.6, pica_random(vec2(1.0, 11.0))) * u_size * 0.52;
      home = firstHome() + vec2(cos(d), sin(d)) * gap;
    } else {
      float a = fi * 6.2831853 / max(u_blobs, 1.0) + (pica_random(vec2(fi, 3.0)) - 0.5) * 0.9;
      home = vec2(cos(a), sin(a)) * mix(0.18, 0.34, pica_random(vec2(fi, 5.0)));
    }
    float f1 = mix(0.25, 0.5, pica_random(vec2(fi, 29.0)));
    float f2 = mix(0.2, 0.45, pica_random(vec2(fi, 33.0)));
    float ph1 = pica_random(vec2(fi, 13.0)) * 6.2831853;
    float ph2 = pica_random(vec2(fi, 21.0)) * 6.2831853;
    float amp = mix(0.025, 0.06, pica_random(vec2(fi, 37.0)));
    vec2 c = home + amp * vec2(sin(t * f1 + ph1), cos(t * f2 + ph2));
    return vec3(clamp(c, -lim, lim), z);
  }
  void main() {
    vec2 res = u_resolution;
    float mn = min(res.x, res.y);
    vec2 p = (gl_FragCoord.xy - 0.5 * res) / mn;
    float t = u_time * u_speed;
    int n = int(u_blobs + 0.5);
    vec2 pointerP = (u_pointer - 0.5) * res / mn;
    vec2 lim = max(0.5 * res / mn - 0.16, vec2(0.02));
    vec3 cs[6];
    int near = 0;
    float nd = 1e9;
    for (int i = 0; i < 6; i++) {
      if (i >= n) break;
      cs[i] = centre(i, t, lim);
      vec2 rel = cs[i].xy - pointerP;
      float dd = dot(rel, rel);
      if (dd < nd) { nd = dd; near = i; }
    }
    float field = 0.0;
    vec2 grad = vec2(0.0);
    for (int i = 0; i < 6; i++) {
      if (i >= n) break;
      vec3 cb = cs[i];
      if (i == near) cb.xy += (pointerP - cb.xy) * 0.2 * step(0.0, u_pointer.x);
      float s = u_size * cb.z;
      vec2 d = p - cb.xy;
      float q = exp(-dot(d, d) / (2.0 * s * s));
      field += q;
      grad -= d * q / (s * s);
    }
    float aa = max(fwidth(field), 0.02);
    float inside = smoothstep(u_threshold - aa, u_threshold + aa, field);
    // Field strength stands in for depth into the drop: rho runs 1 at the rim to 0 where the summed field
    // reaches a centre's own peak of 1, so each crown reflects the horizon like a sphere's pole does.
    float rho = clamp(u_threshold * (1.0 - field) / (field * (1.0 - u_threshold)), 0.0, 1.0);
    vec2 outw = -grad / max(length(grad), 0.0001);
    vec3 nrm = vec3(outw * rho, sqrt(max(0.0, 1.0 - rho * rho)));
    float ry = 2.0 * nrm.z * nrm.y;
    float hline = 1.0 - 2.0 * u_horizon;
    float band = 1.0 - smoothstep(0.015, 0.06, abs(ry - hline));
    // Mid-tones only: the sky band tops out near two thirds of fg and the ground band keeps a whisper, so
    // the bent horizon line is the loudest thing on each drop and nothing reaches near-full ink.
    float skyT = mix(0.3, 0.6, smoothstep(hline, 1.0, ry));
    float gndT = mix(0.18, 0.07, smoothstep(-1.0, hline, ry));
    float tone = max(ry > hline ? skyT : gndT, band * 0.85);
    vec4 ink = vec4(mix(u_fg.rgb, u_accent.rgb, band), mix(u_fg.a, u_accent.a, band));
    pica_color = pica_tone(tone * inside, ink, u_levels - 1.0);
  }
`;

/** What shows without WebGL2: the same two bands split at the horizon, fg and accent at low alpha. */
const FALLBACK = `linear-gradient(to bottom, transparent 30%, color-mix(in srgb, ${cssVar("fg")} 20%, transparent) 46%, color-mix(in srgb, ${cssVar("accent")} 45%, transparent) 55%, color-mix(in srgb, ${cssVar("fg")} 14%, transparent) 63%, transparent 78%)`;

function uniforms(p: LiquidMetalProps): Record<string, number> {
  return {
    u_seed: p.seed,
    u_speed: p.speed,
    u_blobs: p.blobs,
    u_size: p.size,
    u_threshold: p.threshold,
    u_horizon: p.horizon,
    u_levels: p.levels,
  };
}

export const mount: Mount<LiquidMetalProps> = (host, initial = {}) => {
  let props: LiquidMetalProps = { ...defaults, ...initial };

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

  /** Whether a live pointermove should be allowed to pull a blob: on, animating, and not reduced. */
  function live(): boolean {
    return props.pointer && !props.paused && props.time === null && !loop.reduced;
  }

  function onPointerMove(e: PointerEvent): void {
    if (!live()) return;
    // pointerUv flips y, so the lean follows the pointer instead of mirroring it across the middle.
    shader.set("u_pointer", pointerUv(host, e));
    loop.redraw();
  }

  function onPointerLeave(): void {
    if (!props.pointer) return;
    shader.set("u_pointer", [-1, -1]);
    loop.redraw();
  }

  labelHost(host, "");
  const loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: STILL, frame: draw });
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerleave", onPointerLeave);

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
      if (!props.pointer && before.pointer) shader.set("u_pointer", [-1, -1]);
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      loop.destroy();
      shader.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
