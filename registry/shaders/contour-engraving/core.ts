import { labelHost } from "../../../lib/a11y";
import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ContourEngravingProps extends MotionProps {
  /** Groove count across the shorter host dimension, from 16 to 72. */
  grooves: number;
  /** Engraving depth as a fraction of groove spacing, from 0.04 to 0.5. */
  depth: number;
  /** Amount of the broad plate folds, from 0 to 1.5. */
  bend: number;
  /** Directional light rotation rate, from 0 to 2. */
  speed: number;
  /** Overall palette ink coverage, from 0.2 to 1. */
  intensity: number;
}

export const defaults: ContourEngravingProps = {
  grooves: 48,
  depth: 0.2,
  bend: 0.8,
  speed: 0.6,
  intensity: 0.85,
  paused: false,
  time: null,
  seed: 1,
};

const ENGRAVING_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_grooves;
  uniform float u_depth;
  uniform float u_bend;
  uniform float u_speed;
  uniform float u_intensity;

  // The broad fold and the recessed cut share exact derivatives in plate space.
  vec4 engravingPlate(vec2 p, float phase, float grooves) {
    float a = p.x * 2.4 + phase;
    float b = p.y * 1.7 + p.x * 0.6 + phase * 0.3;
    float plate = u_bend * (0.14 * cos(a) + 0.045 * sin(b));
    vec2 slope = u_bend * vec2(-0.336 * sin(a) + 0.027 * cos(b), 0.0765 * cos(b));
    float coordinate = p.y + u_bend * 0.13 * sin(a);
    vec2 direction = vec2(u_bend * 0.312 * cos(a), 1.0);
    float angle = coordinate * grooves * 6.2831853;
    float base = 0.5 + 0.5 * cos(angle);
    float cut = pow(base, 10.0);
    float height = plate - u_depth / grooves * cut;
    float cutSlope = u_depth * 31.4159265 * sin(angle) * pow(base, 9.0);
    slope += cutSlope * direction;
    return vec4(height, slope, cut);
  }

  void main() {
    float shortSide = max(1.0, min(u_css_size.x, u_css_size.y));
    float grooves = min(u_grooves, shortSide / 7.5);
    float phase = pica_random(vec2(2.0, 9.0)) * 6.2831853;
    float rotation = -0.24 + (pica_random(vec2(7.0, 3.0)) - 0.5) * 0.12;
    float c = cos(rotation);
    float s = sin(rotation);
    mat2 turn = mat2(c, -s, s, c);
    vec2 world = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size / shortSide;
    vec2 p = turn * world;
    vec4 plate = engravingPlate(p, phase, grooves);
    vec3 normal = normalize(vec3(-plate.yz, 1.0));
    float azimuth = -0.9 + u_time * u_speed * 0.1;
    vec3 light = normalize(vec3(turn * vec2(cos(azimuth), sin(azimuth)), 0.38));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float diffuse = max(0.0, dot(normal, light));
    float specular = pow(max(0.0, dot(normal, halfway)), 28.0);
    float fold = plate.x / max(0.02, u_bend);
    float brightness = clamp(0.22 + diffuse * 0.52 + specular * 0.2 - plate.w * 0.09 + fold * 0.16, 0.07, 0.94);
    float lightInk = step(0.5, dot(u_fg.rgb, vec3(0.2126, 0.7152, 0.0722)));
    float tone = mix(1.0 - brightness, brightness, lightInk) * u_intensity;
    pica_color = pica_tone(tone, u_fg, 6.0);
  }
`;

const ENGRAVING_FALLBACK = [
  `repeating-linear-gradient(var(--ce-angle),color-mix(in srgb,${cssVar("fg")} 8%,transparent) 0 calc(var(--ce-pitch) * .68),color-mix(in srgb,${cssVar("fg")} var(--ce-cut),transparent) calc(var(--ce-pitch) * .8),color-mix(in srgb,${cssVar("fg")} 14%,transparent) calc(var(--ce-pitch) * .91) var(--ce-pitch))`,
  `linear-gradient(130deg,color-mix(in srgb,${cssVar("fg")} 24%,transparent),transparent 36%,color-mix(in srgb,${cssVar("fg")} 30%,transparent) 64%,transparent)`,
  cssVar("bg"),
].join(",");

function engravingClamp(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<ContourEngravingProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  for (const name of ["role", "aria-label", "aria-hidden"]) attributes.set(name, host.getAttribute(name));
  labelHost(host, "");
  const drawing = layer(host, "over");

  function uniforms(): Record<string, number | readonly number[]> {
    return {
      u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
      u_grooves: engravingClamp(props.grooves, 48, 16, 72),
      u_depth: engravingClamp(props.depth, 0.2, 0.04, 0.5),
      u_bend: engravingClamp(props.bend, 0.8, 0, 1.5),
      u_speed: engravingClamp(props.speed, 0.6, 0, 2),
      u_intensity: engravingClamp(props.intensity, 0.85, 0.2, 1),
      u_seed: Math.floor(engravingClamp(props.seed, 1, 0, 999999)),
    };
  }

  function fallback(): void {
    const pitch = Math.max(7.5, Math.min(host.clientWidth, host.clientHeight) / engravingClamp(props.grooves, 48, 16, 72));
    drawing.el.style.setProperty("--ce-pitch", `${pitch}px`);
    drawing.el.style.setProperty("--ce-angle", `${103 + engravingClamp(props.bend, 0.8, 0, 1.5) * 5}deg`);
    drawing.el.style.setProperty("--ce-cut", `${Math.round(28 + engravingClamp(props.depth, 0.2, 0.04, 0.5) * 70)}%`);
  }

  fallback();
  const shader = createShader(drawing.el, {
    fragment: ENGRAVING_FRAGMENT,
    fallback: ENGRAVING_FALLBACK,
    uniforms: uniforms(),
    maxDpr: 1,
    css: "image-rendering:pixelated",
    onInvalidate: () => {
      if (!alive) return;
      fallback();
      shader.set("u_css_size", [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)]);
      loop?.redraw();
    },
  });

  function frame(time: number): void {
    if (!alive) return;
    shader.draw(time);
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      props = { ...props, ...next };
      fallback();
      for (const [name, value] of Object.entries(uniforms())) shader.set(name, value);
      loop?.update({ paused: props.paused, time: props.time });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      shader.destroy();
      drawing.remove();
      attributes.restore();
    },
  };
};
