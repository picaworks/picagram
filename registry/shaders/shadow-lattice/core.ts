import { labelHost } from "../../../lib/a11y";
import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import { createRng } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ShadowLatticeProps extends MotionProps {
  /** Distance between adjacent lattice ribs in CSS pixels, from 24 to 160. */
  pitch: number;
  /** Height of the shallow ribs in CSS pixels, from 0 to 32; higher ribs cast longer shadows. */
  depth: number;
  /** Starting azimuth of the grazing light in degrees. */
  lightAngle: number;
  /** Light rotation in degrees per second, from -12 to 12; zero keeps the light still. */
  speed: number;
}

export const defaults: ShadowLatticeProps = {
  pitch: 64,
  depth: 13,
  lightAngle: -32,
  speed: 6,
  paused: false,
  time: null,
  seed: 1,
};

const SHADOW_LATTICE_STILL = 1200;
const SHADOW_LATTICE_FRAGMENT = `${DITHER}${TONE}
uniform vec2 u_css_size;
uniform float u_pitch;
uniform float u_depth;
uniform float u_light_angle;
uniform float u_speed;

mat2 latticeTurn(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float latticeDistance(vec2 point) {
  vec2 local = abs(mod(point + 0.5 * u_pitch, u_pitch) - 0.5 * u_pitch);
  return min(local.x, local.y);
}

float latticeHeight(vec2 point) {
  float halfWidth = u_pitch * 0.041;
  return u_depth * (1.0 - smoothstep(halfWidth * 0.48, halfWidth, latticeDistance(point)));
}

// Each crossed rib is a shallow, continuous geometric occluder. Test the
// successive rib planes toward the light instead of marching through noise.
// A receiver and its shadow therefore remain attached to the same lattice.
float latticeBlocked(float coordinate, float direction, float receiver) {
  if (abs(direction) < 0.0001 || u_depth <= 0.0001) return 0.0;
  float signDirection = direction > 0.0 ? 1.0 : -1.0;
  float nextPlane = direction > 0.0 ? ceil(coordinate / u_pitch) : floor(coordinate / u_pitch);
  float blocked = 0.0;
  float halfWidth = u_pitch * 0.041;
  for (int i = 0; i < 7; i++) {
    float center = (nextPlane + float(i) * signDirection) * u_pitch;
    float travel = (center - coordinate) / direction;
    // The near wall of a finite-width rib intercepts a grazing ray before its
    // center plane. The fixed softness is a small penumbra, not an animated blur.
    travel = max(0.0, travel - halfWidth / abs(direction));
    float rayHeight = receiver + travel * 0.29;
    float clearance = u_depth - rayHeight;
    blocked = max(blocked, smoothstep(0.0, max(0.7, u_depth * 0.10), clearance));
  }
  return blocked;
}

void main() {
  float rotation = 0.17 + (pica_random(vec2(4.0, 9.0)) - 0.5) * 0.19;
  vec2 phase = vec2(pica_random(vec2(7.0, 3.0)), pica_random(vec2(2.0, 11.0))) * u_pitch;
  vec2 position = (gl_FragCoord.xy / u_resolution - 0.5) * u_css_size;
  vec2 p = latticeTurn(rotation) * position + phase;
  float angle = radians(u_light_angle + u_time * u_speed);
  vec2 direction = latticeTurn(rotation) * vec2(cos(angle), sin(angle));
  float height = latticeHeight(p);
  float receiver = height + 0.22;
  float shadow = max(latticeBlocked(p.x, direction.x, receiver), latticeBlocked(p.y, direction.y, receiver));
  float halfWidth = u_pitch * 0.041;
  float rib = 1.0 - smoothstep(halfWidth - 0.8, halfWidth + 0.8, latticeDistance(p));
  float dx = (latticeHeight(p + vec2(0.6, 0.0)) - latticeHeight(p - vec2(0.6, 0.0))) / 1.2;
  float dy = (latticeHeight(p + vec2(0.0, 0.6)) - latticeHeight(p - vec2(0.0, 0.6))) / 1.2;
  vec3 normal = normalize(vec3(-dx, -dy, 1.0));
  vec3 light = normalize(vec3(direction, 0.29));
  float diffuse = max(0.0, dot(normal, light));
  float ground = mix(0.27, 0.065, shadow);
  float face = 0.46 + diffuse * 0.44;
  float tone = mix(ground, face, rib);
  // Four measured coverage intervals use a stationary 8x8 threshold lattice.
  // Moving light changes geometry-derived tone, never the dither coordinates.
  pica_color = pica_tone(tone, u_fg, 4.0);
}
`;

const SHADOW_LATTICE_FALLBACK = [
  `repeating-linear-gradient(var(--sl-rotation),transparent 0 calc(var(--sl-pitch) - var(--sl-width) - var(--sl-tail)),color-mix(in srgb,${cssVar("fg")} 13%,transparent) calc(var(--sl-pitch) - var(--sl-width) - var(--sl-tail)) calc(var(--sl-pitch) - var(--sl-width)),color-mix(in srgb,${cssVar("fg")} 60%,transparent) calc(var(--sl-pitch) - var(--sl-width)) var(--sl-pitch))`,
  `repeating-linear-gradient(calc(var(--sl-rotation) + 90deg),transparent 0 calc(var(--sl-pitch) - var(--sl-width) - var(--sl-tail)),color-mix(in srgb,${cssVar("fg")} 13%,transparent) calc(var(--sl-pitch) - var(--sl-width) - var(--sl-tail)) calc(var(--sl-pitch) - var(--sl-width)),color-mix(in srgb,${cssVar("fg")} 60%,transparent) calc(var(--sl-pitch) - var(--sl-width)) var(--sl-pitch))`,
  `${cssVar("bg")}`,
].join(",");

function shadowLatticeNumber(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<ShadowLatticeProps> = (host, initial = {}) => {
  let props: ShadowLatticeProps = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("role", null);
  attributes.set("aria-label", null);
  attributes.set("aria-hidden", "true");
  labelHost(host, "");
  const drawing = layer(host, "over");

  function seed(): number {
    return Math.floor(shadowLatticeNumber(props.seed, 1, 0, 999999));
  }

  function uniforms(): Record<string, number | readonly number[]> {
    return {
      u_seed: seed(),
      u_pitch: shadowLatticeNumber(props.pitch, 64, 24, 160),
      u_depth: shadowLatticeNumber(props.depth, 13, 0, 32),
      u_light_angle: shadowLatticeNumber(props.lightAngle, -32, -3600, 3600),
      u_speed: shadowLatticeNumber(props.speed, 6, -12, 12),
      u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
    };
  }

  function fallback(): void {
    const pitch = shadowLatticeNumber(props.pitch, 64, 24, 160);
    const depth = shadowLatticeNumber(props.depth, 13, 0, 32);
    const random = createRng(seed());
    drawing.el.style.setProperty("--sl-pitch", `${pitch}px`);
    drawing.el.style.setProperty("--sl-width", `${pitch * 0.082}px`);
    drawing.el.style.setProperty("--sl-tail", `${Math.min(pitch * 0.45, depth / 0.29)}px`);
    drawing.el.style.setProperty("--sl-rotation", `${9.7 + (random() - 0.5) * 11}deg`);
  }

  fallback();
  const shader = createShader(drawing.el, {
    fragment: SHADOW_LATTICE_FRAGMENT,
    fallback: SHADOW_LATTICE_FALLBACK,
    uniforms: uniforms(),
    maxDpr: 0.5,
    css: "image-rendering:pixelated",
    onInvalidate: () => {
      if (!alive) return;
      shader.set("u_css_size", [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)]);
      loop?.redraw();
    },
  });

  function draw(time: number): void {
    if (!alive) return;
    shader.draw(time);
    attributes.set("data-pica-ready", "true");
  }

  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: SHADOW_LATTICE_STILL, frame: draw });
  return {
    update(next) {
      if (!alive) return;
      props = { ...props, ...next };
      fallback();
      for (const [name, value] of Object.entries(uniforms())) shader.set(name, value);
      loop?.update({ paused: props.paused, time: props.time, fps: 24, still: SHADOW_LATTICE_STILL });
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
