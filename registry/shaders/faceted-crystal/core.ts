import { createShader } from "../../../lib/gl";
import { DITHER, TONE } from "../../../lib/glsl";
import { hostAttributes, layer } from "../../../lib/host";
import { createLoop, type Loop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface FacetedCrystalProps extends MotionProps {
  /** Symmetric facets around each cut ring, either 6, 8, 10 or 12. */
  facets: number;
  /** Crown cut and girdle width, from 0.1 to 0.3. */
  bevel: number;
  /** Refraction strength through the solid, from 0.15 to 0.5. */
  refraction: number;
  /** Gentle solid rotation rate, from 0 to 2. */
  speed: number;
  /** Overall foreground ink coverage, from 0.3 to 0.75. */
  intensity: number;
}

export const defaults: FacetedCrystalProps = {
  facets: 8,
  bevel: 0.2,
  refraction: 0.3,
  speed: 0.7,
  intensity: 0.55,
  paused: false,
  time: null,
  seed: 1,
};

const CRYSTAL_FRAGMENT = `${DITHER}${TONE}
  uniform vec2 u_css_size;
  uniform float u_facets;
  uniform float u_bevel;
  uniform float u_refraction;
  uniform float u_speed;
  uniform float u_intensity;

  bool crystalInterval(vec3 ro, vec3 rd, out vec2 span, out vec3 entry, out vec3 exitNormal, out float edgeGap) {
    span = vec2(-100.0, 100.0);
    entry = vec3(0.0, 0.0, 1.0);
    exitNormal = -entry;
    float runner = -100.0;
    float girdle = 0.04 + u_bevel * 0.22;
    float crown = (0.18 + u_bevel * 0.9) / 0.34;
    float pavilion = 0.8 / max(0.1, 0.85 - girdle);
    for (int plane = 0; plane < 38; plane++) {
      vec3 raw;
      float bound;
      if (plane < 36) {
        int group = plane / 12;
        int side = plane - group * 12;
        if (float(side) >= u_facets) continue;
        float angle = (float(side) + 0.5) * 6.2831853 / u_facets;
        float slope = group == 0 ? 0.0 : (group == 1 ? crown : -pavilion);
        raw = vec3(cos(angle) / 0.8, sin(angle) / 1.25, slope);
        bound = group == 2 ? 0.9 + pavilion * girdle : 0.9;
      } else {
        raw = vec3(0.0, 0.0, plane == 36 ? 1.0 : -1.0);
        bound = plane == 36 ? 0.34 : 0.85;
      }
      float denominator = dot(raw, rd);
      float numerator = bound - dot(raw, ro);
      if (abs(denominator) < 0.00001) {
        if (numerator < 0.0) return false;
        continue;
      }
      float t = numerator / denominator;
      if (denominator < 0.0) {
        if (t > span.x) { runner = span.x; span.x = t; entry = normalize(raw); }
        else runner = max(runner, t);
      } else if (t < span.y) { span.y = t; exitNormal = normalize(raw); }
      if (span.x > span.y) return false;
    }
    edgeGap = max(0.0, span.x - runner);
    return span.y > 0.0;
  }

  float crystalRules(vec2 p, float pixel) {
    float row = p.y - p.x * 0.08;
    float distance = min(abs(row), min(abs(row - 0.46), abs(row + 0.46)));
    float horizontal = 1.0 - smoothstep(pixel * 0.65, pixel * 1.55, distance);
    horizontal *= 1.0 - smoothstep(1.0, 1.06, abs(p.x));
    float vertical = 1.0 - smoothstep(pixel * 0.65, pixel * 1.55, abs(p.x + p.y * 0.12 - 0.06));
    vertical *= 1.0 - smoothstep(1.25, 1.32, abs(p.y));
    return max(horizontal, vertical * 0.72);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float scale = min(u_css_size.x / 3.3, u_css_size.y / 3.9) * 0.88;
    vec2 screen = (uv - 0.5) * u_css_size / max(scale, 1.0);
    float motion = u_time * u_speed * 0.12 + u_seed * 0.23;
    float yaw = 0.38 + sin(motion) * 0.2;
    float pitch = 0.23 + cos(motion) * 0.12;
    float roll = -0.15 + sin(u_seed * 0.61) * 0.1;
    mat3 turnY = mat3(cos(yaw), 0.0, -sin(yaw), 0.0, 1.0, 0.0, sin(yaw), 0.0, cos(yaw));
    mat3 turnX = mat3(1.0, 0.0, 0.0, 0.0, cos(pitch), sin(pitch), 0.0, -sin(pitch), cos(pitch));
    mat3 turnZ = mat3(cos(roll), sin(roll), 0.0, -sin(roll), cos(roll), 0.0, 0.0, 0.0, 1.0);
    mat3 basis = turnZ * turnX * turnY;
    vec3 ro = transpose(basis) * vec3(screen, 5.0);
    vec3 rd = transpose(basis) * vec3(0.0, 0.0, -1.0);
    float pixel = 1.0 / max(scale, 1.0);
    float underlay = crystalRules(screen, pixel) * u_intensity * 0.14;
    vec2 span;
    vec3 normal, farNormal;
    float edgeGap;
    if (!crystalInterval(ro, rd, span, normal, farNormal, edgeGap)) {
      pica_color = pica_tone(underlay, u_fg, 8.0);
      return;
    }
    vec3 hit = ro + rd * max(0.0, span.x);
    float eta = 1.2 + u_refraction * 0.8;
    vec3 inside = refract(rd, normal, 1.0 / eta);
    vec2 innerSpan;
    vec3 innerEntry, innerExit;
    float unusedGap;
    float transmitted = 0.0;
    float behind = 0.0;
    float interiorPath = 0.0;
    vec3 pavilionNormal = farNormal;
    if (length(inside) > 0.01) {
      vec3 cursor = hit + inside * 0.001;
      vec3 ray = inside;
      // One bounded internal reflection lets the rear cut remain a physical interface.
      for (int bounce = 0; bounce < 2; bounce++) {
        if (!crystalInterval(cursor, ray, innerSpan, innerEntry, innerExit, unusedGap)) break;
        float distance = max(0.0, innerSpan.y);
        interiorPath += distance;
        if (bounce == 0) pavilionNormal = innerExit;
        vec3 exitPoint = cursor + ray * distance;
        vec3 outside = refract(ray, -innerExit, eta);
        vec3 worldExit = basis * exitPoint;
        vec3 worldRay = basis * outside;
        if (length(outside) > 0.01) {
          if (worldRay.z < -0.03) {
            float travel = (-1.5 - worldExit.z) / min(-0.03, worldRay.z);
            vec2 samplePoint = (worldExit + worldRay * max(0.0, travel)).xy;
            transmitted = exp(-interiorPath * 0.18);
            behind = crystalRules(samplePoint, pixel * 1.15) * transmitted;
          }
          break;
        }
        ray = reflect(ray, innerExit);
        cursor = exitPoint + ray * 0.001;
      }
    }

    vec3 worldNormal = normalize(basis * normal);
    vec3 light = normalize(vec3(-0.65, 0.85, 0.7));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float diffuse = max(0.0, dot(worldNormal, light));
    float facing = clamp(abs(dot(normal, -rd)), 0.0, 1.0);
    float fresnel = 0.06 + 0.94 * pow(1.0 - facing, 5.0);
    float reflection = pow(clamp(dot(worldNormal, halfway), 0.0, 1.0), 28.0);
    float edges = 1.0 - smoothstep(pixel * 0.6, pixel * 2.0, edgeGap);
    float surface = u_intensity * (0.045 + diffuse * 0.11 + fresnel * 0.2 + reflection * 0.26 + edges * 0.075);
    vec3 interiorLight = refract(transpose(basis) * -light, normal, 1.0 / eta);
    float rearDiffuse = max(0.0, dot(pavilionNormal, interiorLight));
    float thickness = 1.0 - exp(-interiorPath * 0.65);
    float rearFacet = u_intensity * thickness * (0.035 + rearDiffuse * 0.14);
    // The central table is an entry plane, not an opening between crown facets.
    float tableEntry = step(0.9999, normal.z);
    float rearFacing = clamp(abs(dot(pavilionNormal, inside)), 0.0, 1.0);
    float rearFresnel = 0.04 + 0.96 * pow(1.0 - rearFacing, 5.0);
    float pathTransmission = exp(-interiorPath * (0.16 + u_refraction * 0.3));
    float tableRear = u_intensity * (1.0 - fresnel) * pathTransmission
      * (rearDiffuse * 0.27 + rearFacing * 0.095 + rearFresnel * 0.12);
    rearFacet = mix(rearFacet, tableRear, tableEntry);
    float tone = surface + rearFacet + behind * u_intensity * 0.28;
    pica_color = pica_tone(clamp(tone, 0.0, 0.55), u_fg, 8.0);
  }
`;

function crystalBound(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

export const mount: Mount<FacetedCrystalProps> = (host, initial = {}) => {
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
  fallback.style.cssText = "position:absolute;left:50%;top:50%;width:min(62%,320px);height:min(68%,430px);transform:translate(-50%,-50%) rotate(-9deg);pointer-events:none";
  const table = document.createElement("div");
  table.setAttribute("data-pica", "");
  table.style.cssText = "position:absolute;inset:20%";
  fallback.append(table);
  const facetCount = (): number => Math.round(crystalBound(props.facets, 8, 6, 12) / 2) * 2;
  function uniforms(): Record<string, number | readonly number[]> {
    return {
      u_css_size: [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)],
      u_facets: facetCount(), u_bevel: crystalBound(props.bevel, 0.2, 0.1, 0.3),
      u_refraction: crystalBound(props.refraction, 0.3, 0.15, 0.5),
      u_speed: crystalBound(props.speed, 0.7, 0, 2), u_intensity: crystalBound(props.intensity, 0.55, 0.3, 0.75),
      u_seed: Math.round(crystalBound(props.seed, 1, 1, 99)),
    };
  }
  function refreshFallback(): void {
    const count = facetCount();
    const points = Array.from({ length: count }, (_, i) => {
      const angle = i / count * Math.PI * 2 - Math.PI / 2;
      return `${50 + Math.cos(angle) * 48}% ${50 + Math.sin(angle) * 49}%`;
    });
    const clip = `polygon(${points.join(",")})`;
    fallback.style.clipPath = clip;
    table.style.clipPath = clip;
    const pale = `color-mix(in srgb,${cssVar("fg")} 8%,transparent)`;
    const bright = `color-mix(in srgb,${cssVar("fg")} 27%,transparent)`;
    const rule = `color-mix(in srgb,${cssVar("fg")} 21%,transparent)`;
    fallback.style.background = `linear-gradient(7deg,transparent 0 32%,${pale} 32% 33%,transparent 33% 65%,${pale} 65% 66%,transparent 66%),conic-gradient(from 20deg,${pale},${bright},${pale},${bright},${pale})`;
    table.style.background = `linear-gradient(7deg,transparent 0 37%,${rule} 37% 38%,transparent 38% 70%,${rule} 70% 71%,transparent 71%),conic-gradient(from -40deg,${pale},color-mix(in srgb,${cssVar("fg")} 3%,transparent),${pale},color-mix(in srgb,${cssVar("fg")} 4%,transparent),${pale}),color-mix(in srgb,${cssVar("fg")} 6%,${cssVar("bg")})`;
    fallback.style.display = shader.ok ? "none" : "block";
  }
  const shader = createShader(drawing.el, {
    fragment: CRYSTAL_FRAGMENT, fallback: cssVar("bg"), uniforms: uniforms(), maxDpr: 1, css: "image-rendering:pixelated",
    onInvalidate: () => {
      if (!alive) return;
      shader.set("u_css_size", [Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)]);
      refreshFallback(); loop?.redraw();
    },
  });
  drawing.el.append(fallback);
  refreshFallback();
  function frame(time: number): void {
    if (!alive) return;
    shader.draw(time); attributes.set("data-pica-ready", "true");
  }
  loop = createLoop({ el: host, fps: 24, paused: props.paused, time: props.time, still: 1200, frame });
  return {
    update(next) {
      if (!alive) return;
      props = { ...props, ...next };
      for (const [name, value] of Object.entries(uniforms())) shader.set(name, value);
      refreshFallback(); loop?.update({ paused: props.paused, time: props.time }); loop?.redraw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      loop?.destroy(); shader.destroy(); fallback.remove(); drawing.remove(); attributes.restore();
    },
  };
};
