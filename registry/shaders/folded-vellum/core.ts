import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface FoldedVellumProps extends MotionProps {
  /** Connected accordion panels, either 4, 6 or 8. */
  panels: number;
  /** Fixed fold depth along the connected sheet, from 0.2 to 0.65. */
  fold: number;
  /** Transmission through each thin panel, from 0.3 to 0.8. */
  translucency: number;
  /** Rate of the single diffuse light sweep, from 0 to 2. */
  speed: number;
  /** Overall foreground ink coverage, from 0.3 to 0.75. */
  intensity: number;
}

export const defaults: FoldedVellumProps = {
  panels: 6,
  fold: 0.45,
  translucency: 0.65,
  speed: 0.65,
  intensity: 0.55,
  paused: false,
  time: null,
  seed: 1,
};

const VELLUM_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform vec2 u_center;
  uniform vec3 u_axis;
  uniform vec3 u_up;
  uniform vec3 u_front;
  uniform float u_scale;
  uniform float u_panels;
  uniform float u_fold;
  uniform float u_translucency;
  uniform float u_speed;
  uniform float u_intensity;

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 screen = (uv - 0.5) * u_css_size / max(u_scale, 1.0) + u_center;
    mat3 basis = mat3(u_axis, u_up, u_front);
    vec3 ro = transpose(basis) * vec3(screen, 5.0);
    vec3 rd = transpose(basis) * vec3(0.0, 0.0, -1.0);
    float angle = 0.35 + u_fold * 1.55;
    float width = 0.7;
    float advance = width * cos(angle);
    float rise = width * sin(angle);
    float pixel = 1.0 / max(u_scale, 1.0);
    float motion = u_time * u_speed * 0.22 + u_seed * 0.19;
    vec3 light = normalize(vec3(-0.55 + sin(motion) * 0.55, 0.8, 0.7));
    vec4 layers[8];
    for (int i = 0; i < 8; i++) {
      layers[i] = vec4(100.0, 0.0, 0.0, 0.0);
      if (float(i) >= u_panels) continue;
      float odd = mod(float(i), 2.0);
      float direction = odd < 0.5 ? 1.0 : -1.0;
      vec3 start = vec3((float(i) - u_panels * 0.5) * advance, 0.0, (odd - 0.5) * rise);
      vec3 along = vec3(cos(angle), 0.0, direction * sin(angle));
      vec3 normal = vec3(-direction * sin(angle), 0.0, cos(angle));
      float denominator = dot(rd, normal);
      if (abs(denominator) < 0.0001) continue;
      float t = dot(start - ro, normal) / denominator;
      vec3 point = ro + rd * t;
      float u = dot(point - start, along);
      if (t <= 0.0 || u < 0.0 || u > width || abs(point.y) > 1.08) continue;
      vec3 worldNormal = normalize(basis * normal);
      float front = worldNormal.z < 0.0 ? -1.0 : 1.0;
      worldNormal *= front;
      float diffuse = max(0.0, dot(worldNormal, light));
      float through = max(0.0, dot(-worldNormal, light));
      float view = clamp(abs(dot(normal, -rd)), 0.08, 1.0);
      float opacity = clamp((0.12 + (1.0 - u_translucency) * 0.75) / (0.45 + view * 0.55), 0.1, 0.7);
      float paper = u_intensity * (0.22 + diffuse * 0.25 + through * u_translucency * 0.08);
      float crease = 1.0 - smoothstep(pixel * 0.4, pixel * 1.7, min(u, width - u));
      float border = 1.0 - smoothstep(pixel * 0.4, pixel * 1.5, 1.08 - abs(point.y));
      float rulesDistance = abs(fract((point.y + 0.95) / 0.24 + 0.5) - 0.5) * 0.24;
      float rules = 1.0 - smoothstep(pixel * 0.35, pixel * 0.85, rulesDistance);
      rules *= smoothstep(0.0, 0.12, 1.08 - abs(point.y));
      float printInk = u_intensity * (rules * 0.05 + max(crease, border) * 0.11);
      if (front < 0.0) printInk *= 0.7;
      layers[i] = vec4(t, paper, opacity, printInk);
    }
    // Far panels are transmitted through nearer sheets in their actual depth order.
    for (int pass = 0; pass < 8; pass++) {
      for (int i = 0; i < 7; i++) {
        if (layers[i].x < layers[i + 1].x) {
          vec4 swapLayer = layers[i];
          layers[i] = layers[i + 1];
          layers[i + 1] = swapLayer;
        }
      }
    }
    float tone = 0.0;
    for (int i = 0; i < 8; i++) {
      if (layers[i].x > 90.0) continue;
      tone = mix(tone, layers[i].y, layers[i].z);
      tone += (1.0 - tone) * layers[i].w;
    }
    pica_color = pica_tone(clamp(tone, 0.0, 0.65), u_fg, 8.0);
  }
`;

function vellumBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<FoldedVellumProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  let alive = true;
  let loop: Loop | null = null;
  const attributes = hostAttributes(host);
  attributes.set("aria-hidden", "true");
  attributes.set("role", null);
  attributes.set("aria-label", null);
  const drawing = layer(host, "under");
  const fallback = document.createElement("div");
  fallback.setAttribute("data-pica", "");
  fallback.setAttribute("aria-hidden", "true");
  fallback.style.cssText = "position:absolute;left:12%;top:24%;width:76%;height:52%;transform:rotate(-12deg);pointer-events:none";
  const panelCount = (): number => Math.round(vellumBound(props.panels, 6, 4, 8) / 2) * 2;

  function uniforms(): Record<string, number | readonly number[]> {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const seed = Math.round(vellumBound(props.seed, 1, 1, 99));
    const panels = panelCount();
    const fold = vellumBound(props.fold, 0.45, 0.2, 0.65);
    const angle = 0.35 + fold * 1.55;
    const roll = -0.18 + Math.max(0, Math.min(1, (1.2 - width / height) / 0.5)) * 0.65 + Math.sin(seed * 0.73) * 0.07;
    const yaw = 0.68;
    const pitch = 0.28;
    const rotate = (x: number, y: number, z: number): [number, number, number] => {
      const u = x * Math.cos(yaw) + z * Math.sin(yaw);
      const w = -x * Math.sin(yaw) + z * Math.cos(yaw);
      const v = y * Math.cos(pitch) - w * Math.sin(pitch);
      return [u * Math.cos(roll) - v * Math.sin(roll), u * Math.sin(roll) + v * Math.cos(roll), y * Math.sin(pitch) + w * Math.cos(pitch)];
    };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i <= panels; i++) {
      for (const y of [-1.08, 1.08]) {
        const point = rotate((i - panels / 2) * 0.7 * Math.cos(angle), y, ((i % 2) - 0.5) * 0.7 * Math.sin(angle));
        minX = Math.min(minX, point[0]);
        maxX = Math.max(maxX, point[0]);
        minY = Math.min(minY, point[1]);
        maxY = Math.max(maxY, point[1]);
      }
    }
    return {
      u_css_size: [width, height],
      u_axis: rotate(1, 0, 0),
      u_up: rotate(0, 1, 0),
      u_front: rotate(0, 0, 1),
      u_center: [(minX + maxX) / 2, (minY + maxY) / 2],
      u_scale: Math.min(width / Math.max(0.1, maxX - minX), height / Math.max(0.1, maxY - minY)) * 0.84,
      u_panels: panels,
      u_fold: fold,
      u_translucency: vellumBound(props.translucency, 0.65, 0.3, 0.8),
      u_speed: vellumBound(props.speed, 0.65, 0, 2),
      u_intensity: vellumBound(props.intensity, 0.55, 0.3, 0.75),
      u_seed: seed,
    };
  }

  function refreshFallback(): void {
    const count = panelCount();
    const depth = vellumBound(props.fold, 0.45, 0.2, 0.65) * 20;
    const points: string[] = [];
    for (let i = 0; i <= count; i++) points.push(`${i / count * 100}% ${i % 2 === 0 ? depth : 0}%`);
    for (let i = count; i >= 0; i--) points.push(`${i / count * 100}% ${i % 2 === 0 ? 100 : 100 - depth}%`);
    fallback.style.clipPath = `polygon(${points.join(",")})`;
    const faint = `color-mix(in srgb,${cssVar("fg")} 8%,transparent)`;
    fallback.style.background = `repeating-linear-gradient(0deg,transparent 0 25px,${faint} 25px 26px),repeating-linear-gradient(90deg,color-mix(in srgb,${cssVar("fg")} 10%,transparent) 0 ${100 / count}%,color-mix(in srgb,${cssVar("fg")} 23%,transparent) ${100 / count}% ${200 / count}%)`;
    fallback.style.display = shader.ok ? "none" : "block";
  }
  const shader = createShader(drawing.el, {
    fragment: VELLUM_FRAGMENT,
    fallback: cssVar("bg"),
    uniforms: uniforms(),
    maxDpr: 1,
    css: "image-rendering:pixelated",
    onInvalidate: () => {
      if (!alive) return;
      for (const [name, value] of Object.entries(uniforms())) shader.set(name, value);
      refreshFallback();
      loop?.redraw();
    },
  });
  drawing.el.append(fallback);
  refreshFallback();
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
      for (const [name, value] of Object.entries(uniforms())) shader.set(name, value);
      refreshFallback();
      loop?.update({ paused: props.paused, time: props.time });
      loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy();
      shader.destroy();
      fallback.remove();
      drawing.remove();
      attributes.restore();
    },
  };
};
