import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createShader, pointerUv, type Shader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface RippleFieldProps extends MotionProps {
  /** How fast the rings travel. 0 holds the surface still. */
  speed: number;
  /** How many drop points disturb the surface at once. */
  drops: number;
  /** Ring spacing, as a fraction of the host's shorter side. */
  wavelength: number;
  /** How quickly a ring system fades over its life, from 0 (lingers) to 1 (gone early). */
  decay: number;
  /** Whether the pointer raises one ring that follows it. */
  pointer: boolean;
  /** Tone steps the surface is dithered between: 2 is one-bit, 16 reads as nearly smooth. */
  levels: number;
  /** Size of one dither cell, in CSS pixels. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: RippleFieldProps = {
  speed: 0.18,
  drops: 4,
  wavelength: 0.09,
  decay: 0.5,
  pointer: true,
  levels: 5,
  pixel: 2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame held under reduced motion. */
const STILL = 1200;

/** A still surface as a sum of travelling waves, the way Tessendorf's ocean notes frame it. Each drop
 *  point, placed from the seed, radiates one wave packet on its own cycle: a ring front expands at the
 *  group speed, the packet widens with age, and the waves inside it chirp, longer at the front and shorter
 *  behind, because a long wave outruns a short one. Amplitude fades in at birth, decays through the drop's
 *  life, and thins as the front grows, so the field never empties, never fills, and the outermost ring is
 *  the faintest. The heights are signed and simply summed, so crossing packets reinforce and cancel.
 *  The pointer adds one more ring centred on the cursor. Crests carry the accent, and the sharpest
 *  crossings lean toward fg, the second tone. pica_tone quantizes through the 8 by 8 Bayer matrix, so the
 *  surface reads as printed grain rather than airbrushed rings. */
const FRAGMENT = `${DITHER}${TONE}
  uniform float u_speed;
  uniform float u_drops;
  uniform float u_wavelength;
  uniform float u_decay;
  uniform float u_levels;
  void main() {
    vec2 res = u_resolution;
    float mind = min(res.x, res.y);
    vec2 p = (gl_FragCoord.xy - 0.5 * res) / mind;
    float aspect = res.x / mind;
    float t = u_time * u_speed;
    float h = 0.0;
    int n = int(u_drops + 0.5);
    float rn = float(n);
    for (int i = 0; i < 8; i++) {
      if (i >= n) break;
      float fi = float(i);
      vec2 c = (vec2((fi + pica_random(vec2(fi, 4.0))) / rn, pica_random(vec2(fi, 9.0))) - 0.5) * vec2(aspect, 1.0) * 0.66;
      float life = mix(14.0, 24.0, pica_random(vec2(fi, 13.0)));
      float age = mod(t + pica_random(vec2(fi, 21.0)) * life, life);
      float lam = u_wavelength * mix(0.75, 1.3, pica_random(vec2(fi, 29.0)));
      float front = 0.05 * sqrt(lam / 0.09) * age;
      float s = length(p - c) - front;
      float width = lam * (0.8 + 1.3 * age / life);
      float env = exp(-s * s / (2.0 * width * width));
      env *= smoothstep(0.0, 0.08 * life, age);
      env *= pow(max(1.0 - age / life, 0.0), 0.35 + 1.9 * u_decay);
      env *= inversesqrt(1.0 + front * 3.0);
      env *= smoothstep(-0.6, -0.15, s / max(front, 3.0 * lam));
      float k = 6.2831853 / lam;
      h += env * cos(k * s * (1.0 - 0.3 * s / width));
    }
    if (u_pointer.x >= 0.0) {
      vec2 pc = (u_pointer - 0.5) * vec2(aspect, 1.0);
      float pAge = mod(t, 4.0);
      float ps = length(p - pc) - pAge * 0.11;
      float pw = u_wavelength * 0.7;
      float penv = exp(-ps * ps / (2.0 * pw * pw)) * (1.0 - pAge / 4.0) * smoothstep(0.0, 0.2, pAge);
      h += 0.8 * penv * cos(ps * 6.2831853 / u_wavelength);
    }
    float mag = abs(h);
    float tone = clamp(mag * 0.7, 0.0, 1.0);
    float mark = smoothstep(0.5, 0.95, mag);
    vec4 ink = vec4(mix(u_accent.rgb, u_fg.rgb, mark), mix(u_accent.a, u_fg.a, mark));
    pica_color = pica_tone(tone, ink, u_levels - 1.0);
  }
`;

/** What shows without WebGL2: still concentric rings in the palette's accent at low alpha. */
const FALLBACK = `repeating-radial-gradient(circle at 42% 46%, color-mix(in srgb, ${cssVar("accent")} 30%, transparent) 0px, color-mix(in srgb, ${cssVar("accent")} 30%, transparent) 2px, transparent 2px, transparent 26px)`;

function uniforms(p: RippleFieldProps): Record<string, number> {
  return { u_seed: p.seed, u_speed: p.speed, u_drops: p.drops, u_wavelength: p.wavelength, u_decay: p.decay, u_levels: p.levels };
}

export const mount: Mount<RippleFieldProps> = (host, initial = {}) => {
  let props: RippleFieldProps = { ...defaults, ...initial };

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

  /** Whether a live pointermove should be allowed to raise a ring: on, animating, and not reduced. */
  function live(): boolean {
    return props.pointer && !props.paused && props.time === null && !loop.reduced;
  }

  function onPointerMove(e: PointerEvent): void {
    if (!live()) return;
    // pointerUv flips y, so the ring follows the pointer instead of mirroring it across the middle.
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
