import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createShader, pointerUv, type Shader } from "../../../lib/gl";
import { DITHER, NOISE } from "../../../lib/glsl";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ShaderFlowProps extends MotionProps {
  /** How fast the field advects. 0 holds it still. */
  speed: number;
  /** Size of the noise field: lower values are broad and slow, higher values are busier. */
  scale: number;
  /** How many contour bands the field is cut into. */
  bands: number;
  /** How bold each line reads on screen, from a fine hairline to a bold rule. */
  thickness: number;
  /** How far the field folds into itself, from 0 (plain noise) to 1 (deep folds). */
  warp: number;
  /** Whether the flow bends gently around the pointer. */
  pointer: boolean;
  /** Tone steps the lines are dithered between: 2 is one-bit, 16 reads as nearly smooth. */
  levels: number;
  /** Size of one dither cell, in CSS pixels. */
  pixel: number;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: ShaderFlowProps = {
  speed: 0.2,
  scale: 1.5,
  bands: 14,
  thickness: 0.08,
  warp: 0.7,
  pointer: true,
  levels: 4,
  pixel: 2,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** The frame held under reduced motion. */
const STILL = 1200;

/** A domain-warped noise field (Quilez) is cut into contour bands (fract of the field times `bands`), and
 *  only the thin line at each band's edge keeps its ink, so the field reads as hairline current lines rather
 *  than a filled gradient. Where the lines pack tightly, the screen-space derivative of the field is large,
 *  and the line leans from accent toward fg there. The pointer, when on, turns the sample point gently around
 *  itself near the cursor, so the current parts around it. The tone is dithered between a few steps with the
 *  8 by 8 Bayer matrix, and fades toward the edges so a page's own type stays in front of it. */
const FRAGMENT = `${NOISE}${DITHER}
uniform float u_speed;
uniform float u_scale;
uniform float u_bands;
uniform float u_thickness;
uniform float u_warp;
uniform float u_levels;
void main() {
  vec2 res = u_resolution;
  vec2 uv = gl_FragCoord.xy / res;
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y) * u_scale;
  float t = u_time * u_speed;
  vec2 pointerP = (u_pointer - 0.5) * (res / min(res.x, res.y)) * u_scale;
  vec2 rel = p - pointerP;
  float bend = step(0.0, u_pointer.x) * exp(-dot(rel, rel) * 4.0);
  p += vec2(-rel.y, rel.x) * bend * 0.5;
  vec2 q = vec2(pica_fbm(p + vec2(0.0, 0.3) * t, 3), pica_fbm(p + vec2(4.7, 1.9) - 0.24 * t, 3));
  float field = pica_fbm(p + 2.0 * u_warp * q + vec2(0.14 * t, -0.06 * t), 4);
  float coord = field * u_bands;
  float cell = fract(coord);
  float dist = min(cell, 1.0 - cell);
  // fwidth taken before the fract keeps the derivative continuous, and normalizing the line's width by it
  // holds the line to a steady width on screen instead of flooding flat stretches of the field with ink.
  float aa = max(fwidth(coord), 0.0001);
  float line = 1.0 - smoothstep(0.0, aa * (0.5 + u_thickness * 15.0), dist);
  float density = clamp(aa * 2.2, 0.0, 1.0);
  float fadeX = smoothstep(0.0, 0.22, min(uv.x, 1.0 - uv.x));
  float fadeY = smoothstep(0.0, 0.22, min(uv.y, 1.0 - uv.y));
  float steps = max(1.0, u_levels - 1.0);
  float tone = line * fadeX * fadeY;
  tone = floor(tone * steps + pica_bayer8(ivec2(gl_FragCoord.xy))) / steps;
  vec3 ink = mix(u_accent.rgb, u_fg.rgb, density);
  float ground = step(0.001, u_bg.a);
  pica_color = vec4(mix(ink, mix(u_bg.rgb, ink, tone), ground), max(tone * u_accent.a, u_bg.a));
}
`;

/** What shows without WebGL2: hairline accent rules at low opacity, still in the palette's own color. */
const FALLBACK = `repeating-linear-gradient(100deg, color-mix(in srgb, ${cssVar("accent")} 35%, transparent) 0, color-mix(in srgb, ${cssVar("accent")} 35%, transparent) 1px, transparent 1px, transparent 15px)`;

function uniforms(p: ShaderFlowProps): Record<string, number> {
  return { u_seed: p.seed, u_speed: p.speed, u_scale: p.scale, u_bands: p.bands, u_thickness: p.thickness, u_warp: p.warp, u_levels: p.levels };
}

export const mount: Mount<ShaderFlowProps> = (host, initial = {}) => {
  let props: ShaderFlowProps = { ...defaults, ...initial };

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

  /** Whether a live pointermove should be allowed to bend the flow: on, animating, and not reduced. */
  function live(): boolean {
    return props.pointer && !props.paused && props.time === null && !loop.reduced;
  }

  function onPointerMove(e: PointerEvent): void {
    if (!live()) return;
    // pointerUv flips y, so the bend follows the pointer instead of mirroring it across the middle.
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
