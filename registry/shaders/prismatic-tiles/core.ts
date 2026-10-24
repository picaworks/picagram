import { createShader, type Shader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface PrismaticTilesProps extends MotionProps {
  /** Rhombic lattice repeats along the shorter host dimension, from 3 to 12. */
  tiles: number;
  /** Height of each tile bevel relative to its pitch, from 0.05 to 0.7. */
  bevel: number;
  /** Rotation of the complete rhombic field in degrees, from -90 to 90. */
  angle: number;
  /** Speed multiplier for the single moving light, from 0 to 2. */
  speed: number;
  /** Overall printed ink coverage multiplier, from 0.25 to 1.3. */
  intensity: number;
}

export const defaults: PrismaticTilesProps = {
  tiles: 6,
  bevel: 0.32,
  angle: -10,
  speed: 0.45,
  intensity: 1,
  paused: false,
  time: null,
  seed: 1,
};

const PRISMATIC_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_tiles;
  uniform float u_bevel;
  uniform float u_angle;
  uniform float u_speed;
  uniform float u_intensity;

  void main() {
    vec2 pixel = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
    float pitch = max(1.0, min(u_css_size.x, u_css_size.y) / u_tiles);
    float turn = radians(u_angle);
    float c = cos(turn);
    float s = sin(turn);
    vec2 p = vec2(c * pixel.x + s * pixel.y, -s * pixel.x + c * pixel.y) / pitch;
    vec2 offset = vec2(pica_random(vec2(2.0, 7.0)), pica_random(vec2(11.0, 3.0))) * 0.35;
    vec2 lattice = vec2(p.x * 0.577350 + p.y, p.y - p.x * 0.577350) + offset;
    vec2 cell = floor(lattice);
    vec2 local = fract(lattice) - 0.5;
    float edge = 0.5 - max(abs(local.x), abs(local.y));
    // The height is 2.2 * bevel * min(edge, 0.32). Its exact planar slopes
    // supply the four facet normals, including the small flat crown.
    vec2 gradient = abs(local.x) > abs(local.y) ? vec2(-sign(local.x), 0.0) : vec2(0.0, -sign(local.y));
    if (edge > 0.32) gradient = vec2(0.0);
    vec2 slope = vec2((gradient.x - gradient.y) * 0.577350, gradient.x + gradient.y) * u_bevel * 2.2;
    vec3 normal = normalize(vec3(-slope, 1.0));
    float lightAngle = 0.65 + u_time * u_speed * 0.14 - turn;
    vec3 light = normalize(vec3(cos(lightAngle), sin(lightAngle), 0.62));
    float diffuse = max(0.0, dot(normal, light));
    vec3 halfLight = normalize(light + vec3(0.0, 0.0, 1.0));
    float shine = pow(max(0.0, dot(normal, halfLight)), 22.0);
    float joint = smoothstep(0.004, 0.013, edge);
    float printed = (pica_random(floor(pixel * 0.5)) - 0.5) * 0.036;
    float tone = mix(0.10, 0.14 + diffuse * 0.65 + shine * 0.12 + printed, joint) * u_intensity;
    vec4 ink = u_fg;
    float central = 1.0 - step(0.1, abs(cell.x) + abs(cell.y));
    float accent = central * step(abs(local.y), local.x) * joint * 0.42;
    ink = mix(ink, u_accent, accent);
    pica_color = pica_tone(tone * 0.86, ink, 6.0);
  }
`;

const PRISMATIC_FALLBACK = [
  `radial-gradient(ellipse at 53% 47%,color-mix(in srgb,${cssVar("accent")} 13%,transparent),transparent 17%)`,
  `repeating-linear-gradient(calc(var(--pt-angle) + 60deg),color-mix(in srgb,${cssVar("fg")} var(--pt-light),transparent) 0 calc(var(--pt-pitch) * 0.48),transparent calc(var(--pt-pitch) * 0.48) var(--pt-pitch))`,
  `repeating-linear-gradient(calc(var(--pt-angle) - 60deg),color-mix(in srgb,${cssVar("fg")} var(--pt-shade),transparent) 0 calc(var(--pt-pitch) * 0.5),color-mix(in srgb,${cssVar("fg")} var(--pt-mid),transparent) calc(var(--pt-pitch) * 0.5) var(--pt-pitch))`,
  cssVar("bg"),
].join(",");

function prismaticBound(value: number, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<PrismaticTilesProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  let shader: Shader | null = null;
  const attributes = hostAttributes(host);
  attributes.set("role", null);
  attributes.set("aria-label", null);
  attributes.set("aria-hidden", "true");
  const drawing = layer(host, "under");

  function uniforms(): Record<string, number | readonly number[]> {
    return {
      u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
      u_seed: Math.floor(prismaticBound(props.seed, 1, 0, 999999)),
      u_tiles: prismaticBound(props.tiles, 6, 3, 12),
      u_bevel: prismaticBound(props.bevel, 0.32, 0.05, 0.7),
      u_angle: prismaticBound(props.angle, -10, -90, 90),
      u_speed: prismaticBound(props.speed, 0.45, 0, 2),
      u_intensity: prismaticBound(props.intensity, 1, 0.25, 1.3),
    };
  }

  function fallback(): void {
    const intensity = prismaticBound(props.intensity, 1, 0.25, 1.3);
    const bevel = prismaticBound(props.bevel, 0.32, 0.05, 0.7);
    const pitch = Math.max(1, Math.min(host.clientWidth, host.clientHeight)) / prismaticBound(props.tiles, 6, 3, 12);
    drawing.el.style.setProperty("--pt-pitch", `${pitch}px`);
    drawing.el.style.setProperty("--pt-angle", `${-prismaticBound(props.angle, -10, -90, 90)}deg`);
    drawing.el.style.setProperty("--pt-light", `${Math.min(95, intensity * (32 + bevel * 42))}%`);
    drawing.el.style.setProperty("--pt-shade", `${intensity * 23}%`);
    drawing.el.style.setProperty("--pt-mid", `${intensity * 35}%`);
  }

  fallback();
  shader = createShader(drawing.el, {
    fragment: PRISMATIC_FRAGMENT,
    fallback: PRISMATIC_FALLBACK,
    uniforms: uniforms(),
    maxDpr: 1,
    onInvalidate: () => {
      if (!alive) return;
      fallback();
      shader?.set("u_css_size", [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)]);
      loop?.redraw();
    },
  });
  loop = createLoop({
    el: host,
    fps: 24,
    paused: props.paused,
    time: props.time,
    still: 2400,
    frame(time) {
      if (!alive) return;
      shader?.draw(time);
      attributes.set("data-pica-ready", "true");
    },
  });
  return {
    update(next) {
      if (!alive) return;
      props = { ...props, ...next };
      fallback();
      for (const [name, value] of Object.entries(uniforms())) shader?.set(name, value);
      loop?.update({ paused: props.paused, time: props.time });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      shader?.destroy();
      drawing.remove();
      attributes.restore();
    },
  };
};
