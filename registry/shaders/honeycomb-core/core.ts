import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface HoneycombCoreProps extends MotionProps {
  /** Approximate width across each hexagonal cell in CSS pixels, from 30 to 80. */
  cellSize: number;
  /** Open cell depth relative to its radius, from 0.2 to 0.7. */
  depth: number;
  /** Front web thickness relative to the cell radius, from 0.08 to 0.2. */
  wall: number;
  /** Rate of the directional light sweep, from 0 to 2. */
  speed: number;
  /** Overall foreground ink coverage, from 0.3 to 0.75. */
  intensity: number;
}

export const defaults: HoneycombCoreProps = {
  cellSize: 54,
  depth: 0.5,
  wall: 0.12,
  speed: 0.65,
  intensity: 0.55,
  paused: false,
  time: null,
  seed: 1,
};

const CORE_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform vec2 u_center;
  uniform vec2 u_offset;
  uniform vec2 u_cells;
  uniform vec3 u_axis;
  uniform vec3 u_up;
  uniform vec3 u_front;
  uniform float u_scale;
  uniform float u_depth;
  uniform float u_wall;
  uniform float u_speed;
  uniform float u_intensity;

  vec2 coreCell(vec2 p) {
    vec2 axial = vec2(p.x / 1.7320508 - p.y / 3.0, p.y / 1.5);
    vec3 cube = vec3(axial.x, -axial.x - axial.y, axial.y);
    vec3 rounded = floor(cube + 0.5);
    vec3 error = abs(cube - rounded);
    if (error.x > error.y && error.x > error.z) rounded.x = -rounded.y - rounded.z;
    else if (error.y > error.z) rounded.y = -rounded.x - rounded.z;
    else rounded.z = -rounded.x - rounded.y;
    return rounded.xz;
  }

  bool corePrism(vec3 ro, vec3 rd, float apothem, out vec2 span, out vec3 entry, out vec3 exitNormal) {
    span = vec2(-1000.0, 1000.0);
    entry = vec3(0.0, 0.0, 1.0);
    exitNormal = -entry;
    for (int edge = 0; edge < 8; edge++) {
      float angle = float(edge) * 1.04719755;
      vec3 normal = edge < 6 ? vec3(cos(angle), sin(angle), 0.0) : vec3(0.0, 0.0, edge == 6 ? 1.0 : -1.0);
      float bound = edge < 6 ? apothem : (edge == 6 ? 0.0 : u_depth);
      float numerator = bound - dot(normal, ro);
      float denominator = dot(normal, rd);
      if (abs(denominator) < 0.00001) {
        if (numerator < 0.0) return false;
        continue;
      }
      float t = numerator / denominator;
      if (denominator < 0.0 && t > span.x) { span.x = t; entry = normal; }
      if (denominator > 0.0 && t < span.y) { span.y = t; exitNormal = normal; }
      if (span.x > span.y) return false;
    }
    return span.y > 0.0;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 screen = (uv - 0.5) * u_css_size / max(1.0, u_scale) + u_center;
    mat3 basis = mat3(u_axis, u_up, u_front);
    vec3 ro = transpose(basis) * vec3(screen, 64.0);
    ro.xy += u_offset;
    vec3 rd = transpose(basis) * vec3(0.0, 0.0, -1.0);
    float topTime = -ro.z / min(-0.01, rd.z);
    vec2 topPoint = (ro + rd * topTime).xy;
    vec2 origin = coreCell(topPoint);
    float nearest = 1000.0;
    vec3 normal = vec3(0.0, 0.0, 1.0);
    float material = 0.0;
    // The oblique ray moves less than one cell through the full allowed depth.
    for (int row = -1; row <= 1; row++) {
      for (int column = -1; column <= 1; column++) {
        vec2 cell = origin + vec2(float(column), float(row));
        float col = cell.x + floor(cell.y * 0.5);
        if (cell.y < 0.0 || cell.y >= u_cells.y || col < 0.0 || col >= u_cells.x) continue;
        vec2 center = vec2(1.7320508 * (cell.x + cell.y * 0.5), cell.y * 1.5);
        vec3 localOrigin = ro - vec3(center, 0.0);
        vec2 outerSpan, innerSpan;
        vec3 outerEntry, outerExit, innerEntry, innerExit;
        if (!corePrism(localOrigin, rd, 0.8660254, outerSpan, outerEntry, outerExit)) continue;
        float t = max(0.0, outerSpan.x);
        vec3 candidateNormal = outerEntry;
        float kind = abs(candidateNormal.z) > 0.5 ? 0.0 : 2.0;
        bool hole = corePrism(localOrigin, rd, 0.8660254 - u_wall, innerSpan, innerEntry, innerExit);
        if (hole && innerSpan.x <= t + 0.0001 && innerSpan.y > t) {
          t = innerSpan.y;
          if (t >= outerSpan.y - 0.0001) continue;
          candidateNormal = -innerExit;
          kind = 1.0;
        }
        if (t > 0.0 && t < nearest) { nearest = t; normal = candidateNormal; material = kind; }
      }
    }
    if (nearest > 900.0) {
      pica_color = pica_tone(0.0, u_fg, 8.0);
      return;
    }
    vec3 point = ro + rd * nearest;
    vec3 worldNormal = normalize(basis * normal);
    float motion = u_time * u_speed * 0.24 + u_seed * 0.23;
    vec3 light = normalize(vec3(-0.6 + sin(motion) * 0.8, 0.7, 0.9));
    float diffuse = max(0.0, dot(worldNormal, light));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float reflection = pow(clamp(dot(worldNormal, halfway), 0.0, 1.0), 18.0);
    float recess = clamp(-point.z / max(u_depth, 0.01), 0.0, 1.0);
    float occlusion = material > 0.5 && material < 1.5 ? 0.48 + (1.0 - recess) * 0.52 : 1.0;
    float tone = u_intensity * (0.11 + diffuse * 0.32 + reflection * 0.08) * occlusion;
    pica_color = pica_tone(clamp(tone, 0.0, 0.65), u_fg, 8.0);
  }
`;

function coreBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<HoneycombCoreProps> = (host, initial = {}) => {
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
  fallback.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-10deg) skewY(-8deg);pointer-events:none";
  const hole = "polygon(evenodd,50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%,50% 0%,50% 14%,14% 32%,14% 68%,50% 86%,86% 68%,86% 32%,50% 14%)";
  const fallbackCells: HTMLElement[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      for (const back of [true, false]) {
        const cell = document.createElement("div");
        cell.setAttribute("data-pica", "");
        cell.style.cssText = `position:absolute;left:${(col + row % 2 * 0.5) / 4.5 * 100}%;top:${row / 3 * 75}%;width:22.23%;height:50%;clip-path:${hole};background:color-mix(in srgb,${cssVar("fg")} ${back ? 12 : 30}%,transparent);transform:translate(${back ? 5 : 0}px,${back ? 7 : 0}px)`;
        fallback.append(cell);
        fallbackCells.push(cell);
      }
    }
  }
  function uniforms(): Record<string, number | readonly number[]> {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const size = coreBound(props.cellSize, 54, 30, 80);
    const cols = Math.max(3, Math.min(28, Math.floor(width * 0.76 / size)));
    const rows = Math.max(3, Math.min(20, Math.floor(height * 0.65 / (size * 0.8660254))));
    const depth = coreBound(props.depth, 0.5, 0.2, 0.7) * 2;
    const seed = Math.round(coreBound(props.seed, 1, 1, 99));
    const roll = -0.12 + (width < height ? 0.27 : 0) + Math.sin(seed * 0.41) * 0.06;
    const pitch = 0.46;
    const yaw = -0.32;
    const rotate = (x: number, y: number, z: number): [number, number, number] => {
      const u = x * Math.cos(yaw) + z * Math.sin(yaw);
      const w = -x * Math.sin(yaw) + z * Math.cos(yaw);
      const v = y * Math.cos(pitch) - w * Math.sin(pitch);
      return [u * Math.cos(roll) - v * Math.sin(roll), u * Math.sin(roll) + v * Math.cos(roll), y * Math.sin(pitch) + w * Math.cos(pitch)];
    };
    const offset: [number, number] = [1.7320508 * ((cols - 1) / 2 + 0.25), (rows - 1) * 0.75];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let row = 0; row < rows; row++) {
      for (const col of [0, cols - 1]) {
        for (let edge = 0; edge < 6; edge++) {
          for (const z of [0, -depth]) {
            const a = Math.PI / 6 + edge * Math.PI / 3;
            const p = rotate(1.7320508 * (col + row % 2 * 0.5) + Math.cos(a) - offset[0], row * 1.5 + Math.sin(a) - offset[1], z);
            minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
            minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
          }
        }
      }
    }
    return {
      u_css_size: [width, height], u_center: [(minX + maxX) / 2, (minY + maxY) / 2],
      u_offset: offset, u_cells: [cols, rows],
      u_axis: rotate(1, 0, 0), u_up: rotate(0, 1, 0), u_front: rotate(0, 0, 1),
      u_scale: Math.min(size / 1.7320508, width * 0.84 / Math.max(0.1, maxX - minX), height * 0.84 / Math.max(0.1, maxY - minY)),
      u_depth: depth, u_wall: coreBound(props.wall, 0.12, 0.08, 0.2),
      u_speed: coreBound(props.speed, 0.65, 0, 2), u_intensity: coreBound(props.intensity, 0.55, 0.3, 0.75), u_seed: seed,
    };
  }
  function refreshFallback(): void {
    const size = Math.min(coreBound(props.cellSize, 54, 30, 80), host.clientWidth / 6, host.clientHeight / 5);
    fallback.style.width = `${size * 4.5}px`;
    fallback.style.height = `${size * 3}px`;
    fallback.style.display = shader.ok ? "none" : "block";
  }
  const shader = createShader(drawing.el, {
    fragment: CORE_FRAGMENT, fallback: cssVar("bg"), uniforms: uniforms(), maxDpr: 1, css: "image-rendering:pixelated",
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
      loop?.update({ paused: props.paused, time: props.time }); loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy(); shader.destroy(); fallback.remove(); drawing.remove(); attributes.restore();
    },
  };
};
