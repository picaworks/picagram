import { parseColor } from "./color";
import { bayerAt } from "./dither";
import type { Colors } from "./palette";

export type PixelPoint = readonly [number, number, number];
export interface PixelPaint { ink?: "fg" | "accent" | "muted"; tone?: number; edge?: boolean; shadow?: boolean; }
export interface PixelFace extends PixelPaint { points: readonly PixelPoint[]; }
export interface PixelView {
  /** Fixed world-coordinate motion envelope, with z as height. */
  bounds: readonly [PixelPoint, PixelPoint];
  /** World height of the receiving ground plane. */
  ground?: number;
  /** Camera azimuth in degrees, default45. */
  yaw?: number;
  /** Camera elevation in degrees, default30. */
  elevation?: number;
}
export interface PixelScene {
  draw(staticFaces: readonly PixelFace[], movingFaces: readonly PixelFace[], colors: Colors, view: PixelView): void;
}
type PixelColor = readonly [number, number, number, number];
type PixelProjected = readonly [number, number, number];
const pixelSceneLight: PixelPoint = [-0.65, 0.35, 1];
const pixelSceneClamp = (n: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, n));
const pixelSceneFinite = (p: PixelPoint): boolean => p.every(Number.isFinite);
const pixelSceneCross = (a: PixelPoint, b: PixelPoint): PixelPoint => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const pixelSceneSub = (a: PixelPoint, b: PixelPoint): PixelPoint => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const pixelSceneUnit = (p: PixelPoint): PixelPoint => {
  const length = Math.hypot(...p) || 1;
  return [p[0] / length, p[1] / length, p[2] / length];
};
const pixelSceneSides = (sides: number): number => Math.round(pixelSceneClamp(Number.isFinite(sides) ? sides : 8, 6, 12));

/** Closed geometry. Helpers append new faces and retain no caller-owned arrays. */
export function pixelBox(out: PixelFace[], min: PixelPoint, size: PixelPoint, paint: PixelPaint = {}): void {
  if (!pixelSceneFinite(min) || !pixelSceneFinite(size) || size.some((n) => n <= 0)) return;
  const p: PixelPoint[] = [];
  for (const [x, y, z] of [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]) {
    p.push([min[0] + (x ?? 0) * size[0], min[1] + (y ?? 0) * size[1], min[2] + (z ?? 0) * size[2]]);
  }
  for (const ring of [[3, 2, 1, 0], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) {
    out.push({ ...paint, points: ring.map((i) => p[i]!) });
  }
}
export function pixelPrism(out: PixelFace[], footprint: readonly (readonly [number, number])[], bottom: number, height: number, paint: PixelPaint = {}): void {
  if (footprint.length < 3 || !Number.isFinite(bottom) || !Number.isFinite(height) || height <= 0 || footprint.some((p) => !p.every(Number.isFinite))) return;
  const low: PixelPoint[] = footprint.map(([x, y]) => [x, y, bottom]);
  const high: PixelPoint[] = footprint.map(([x, y]) => [x, y, bottom + height]);
  out.push({ ...paint, points: [...low].reverse() }, { ...paint, points: high });
  for (let i = 0; i < low.length; i++) {
    const j = (i + 1) % low.length;
    out.push({ ...paint, points: [low[i]!, low[j]!, high[j]!, high[i]!] });
  }
}
export function pixelCone(out: PixelFace[], base: PixelPoint, radius: number, height: number, paint: PixelPaint = {}, sides = 8): void {
  if (!pixelSceneFinite(base) || !Number.isFinite(radius) || !Number.isFinite(height) || radius <= 0 || height <= 0) return;
  const count = pixelSceneSides(sides);
  const ring: PixelPoint[] = Array.from({ length: count }, (_, i) => {
    const angle = i / count * Math.PI * 2;
    return [base[0] + Math.cos(angle) * radius, base[1] + Math.sin(angle) * radius, base[2]];
  });
  const apex: PixelPoint = [base[0], base[1], base[2] + height];
  out.push({ ...paint, points: [...ring].reverse() });
  for (let i = 0; i < count; i++) out.push({ ...paint, points: [ring[i]!, ring[(i + 1) % count]!, apex] });
}
export function pixelRod(out: PixelFace[], from: PixelPoint, to: PixelPoint, radius: number, paint: PixelPaint = {}, sides = 8): void {
  if (!pixelSceneFinite(from) || !pixelSceneFinite(to) || !Number.isFinite(radius) || radius <= 0 || Math.hypot(...pixelSceneSub(to, from)) < 1e-10) return;
  const axis = pixelSceneUnit(pixelSceneSub(to, from));
  const u = pixelSceneUnit(pixelSceneCross(axis, Math.abs(axis[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0]));
  const v = pixelSceneCross(axis, u);
  const count = pixelSceneSides(sides);
  const rings = [from, to].map((center) => Array.from({ length: count }, (_, i): PixelPoint => {
    const angle = i / count * Math.PI * 2;
    return [0, 1, 2].map((j) => center[j]! + radius * (u[j]! * Math.cos(angle) + v[j]! * Math.sin(angle))) as [number, number, number];
  }));
  const low = rings[0]!, high = rings[1]!;
  out.push({ ...paint, points: [...low].reverse() }, { ...paint, points: high });
  for (let i = 0; i < count; i++) out.push({ ...paint, points: [low[i]!, low[(i + 1) % count]!, high[(i + 1) % count]!, high[i]!] });
}

/** Orthographic software rasterizer. Canvas dimensions are already logical pixels. */
export function createPixelScene(canvas: HTMLCanvasElement): PixelScene {
  const context = canvas.getContext("2d");
  if (!context) return { draw() {} };
  let width = 0, height = 0, image: ImageData;
  let depth = new Float64Array(0), baseDepth = new Float64Array(0);
  let basePixels = new Uint8ClampedArray(0);
  let cachedFaces: readonly PixelFace[] | undefined, cachedView = "", paletteKey = "";
  let inks: Record<"fg" | "bg" | "accent" | "muted", PixelColor>;
  let yawCos = 1, yawSin = 0, elevCos = 1, elevSin = 0, scale = 1, offsetX = 0, offsetY = 0;
  let center: PixelPoint = [0, 0, 0], ground = 0, epsilon = 1e-5, receiverTolerance = 4e-5, lightInk = true;

  function project(p: PixelPoint): PixelProjected {
    const x = p[0] - center[0], y = p[1] - center[1], z = p[2] - center[2];
    const along = x * yawSin + y * yawCos;
    return [(x * yawCos - y * yawSin) * scale + offsetX, (along * elevSin - z * elevCos) * scale + offsetY, along * elevCos + z * elevSin];
  }
  function put(x: number, y: number, z: number, ink: PixelColor, amount: number, shadow = false, edge = false): void {
    if (x < 0 || y < 0 || x >= width || y >= height || !Number.isFinite(z)) return;
    const index = y * width + x, previous = depth[index]!;
    if (z < previous - 1e-9 || (!edge && z <= previous + 1e-9)) return;
    if (shadow && (!Number.isFinite(previous) || Math.abs(z - previous) > receiverTolerance)) return;
    const data = image.data, i = index * 4;
    if (shadow) {
      const priorAlpha = data[i + 3]! / 255;
      const source = lightInk ? inks.bg : inks.fg;
      const weight = lightInk ? 0.38 : 0.18;
      const sourceAlpha = source[3] / 255;
      const alpha = lightInk ? priorAlpha * (1 - weight) + sourceAlpha * weight : sourceAlpha * weight + priorAlpha * (1 - sourceAlpha * weight);
      for (let channel = 0; channel < 3; channel++) {
        const priorWeight = lightInk ? priorAlpha * (1 - weight) : priorAlpha * (1 - sourceAlpha * weight);
        data[i + channel] = alpha ? (data[i + channel]! * priorWeight + source[channel]! * sourceAlpha * weight) / alpha : 0;
      }
      data[i + 3] = alpha * 255;
      depth[index] = z;
      return;
    }
    const quantized = pixelSceneClamp((Math.floor(amount * 16) + (bayerAt(2, x, y) < amount * 16 % 1 ? 1 : 0)) / 16);
    // Ink coverage belongs to this winning surface. Rear faces never contribute.
    const bg = inks.bg, alpha = ink[3] / 255 * quantized, backgroundAlpha = bg[3] / 255;
    const resultAlpha = alpha + backgroundAlpha * (1 - alpha);
    for (let channel = 0; channel < 3; channel++) {
      data[i + channel] = resultAlpha ? (ink[channel]! * alpha + bg[channel]! * backgroundAlpha * (1 - alpha)) / resultAlpha : 0;
    }
    data[i + 3] = resultAlpha * 255;
    depth[index] = Math.max(z, previous);
  }
  function triangle(a: PixelProjected, b: PixelProjected, c: PixelProjected, ink: PixelColor, amount: number, shadow: boolean): void {
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (!Number.isFinite(area) || Math.abs(area) < 1e-9) return;
    const left = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const right = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const top = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const bottom = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
      const px = x + 0.5, py = y + 0.5;
      const wa = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area;
      const wb = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area;
      const wc = 1 - wa - wb;
      if (wa >= -1e-9 && wb >= -1e-9 && wc >= -1e-9) put(x, y, wa * a[2] + wb * b[2] + wc * c[2], ink, amount, shadow);
    }
  }
  function perimeter(a: PixelProjected, b: PixelProjected, ink: PixelColor, tone: number): void {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    let low = 0, high = 1;
    for (const [p, q] of [[-dx, a[0]], [dx, width - 1 - a[0]], [-dy, a[1]], [dy, height - 1 - a[1]]]) {
      if (p === 0) { if (q! < 0) return; }
      else if (p! < 0) low = Math.max(low, q! / p!);
      else high = Math.min(high, q! / p!);
    }
    if (low > high) return;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * (high - low)));
    for (let i = 0; i <= steps; i++) {
      const t = low + (high - low) * i / steps;
      put(Math.round(a[0] + dx * t), Math.round(a[1] + dy * t), a[2] + (b[2] - a[2]) * t, ink, tone, false, true);
    }
  }
  function faces(input: readonly PixelFace[], shadow = false, floorOnly = false): void {
    for (const face of input) {
      if (face.points.length < 3 || face.points.some((p) => !pixelSceneFinite(p))) continue;
      if (shadow && (!face.shadow || !face.points.some((p) => p[2] > ground + epsilon))) continue;
      const floor = face.points.every((p) => Math.abs(p[2] - ground) < epsilon);
      if (floorOnly && !floor) continue;
      const points = face.points.map((p) => project(shadow ? [p[0] - pixelSceneLight[0] * Math.max(0, p[2] - ground), p[1] - pixelSceneLight[1] * Math.max(0, p[2] - ground), ground + epsilon] : p));
      if (points.some((p) => !pixelSceneFinite(p))) continue;
      let normal: PixelPoint = [0, 0, 0];
      for (let i = 1; i < face.points.length - 1 && Math.hypot(...normal) < 1e-10; i++) normal = pixelSceneCross(pixelSceneSub(face.points[i]!, face.points[0]!), pixelSceneSub(face.points[i + 1]!, face.points[0]!));
      normal = pixelSceneUnit(normal);
      const facing = normal[0] * yawSin * elevCos + normal[1] * yawCos * elevCos + normal[2] * elevSin;
      const light = pixelSceneClamp((normal[0] * pixelSceneLight[0] + normal[1] * pixelSceneLight[1] + normal[2]) * (facing < 0 ? -1 : 1) / Math.hypot(...pixelSceneLight));
      const tone = pixelSceneClamp(Number.isFinite(face.tone ?? 1) ? face.tone ?? 1 : 1);
      const amount = shadow ? 0 : tone * (lightInk ? 0.72 + light * 0.24 : 0.94 - light * 0.2) * (floor ? 0.58 : 1);
      const ink = shadow ? inks.fg : inks[face.ink ?? "fg"];
      for (let i = 1; i < points.length - 1; i++) triangle(points[0]!, points[i]!, points[i + 1]!, ink, amount, shadow);
      if (!shadow && !floorOnly && face.edge) for (let i = 0; i < points.length; i++) perimeter(points[i]!, points[(i + 1) % points.length]!, ink, tone);
    }
  }
  return {
    draw(staticFaces, movingFaces, colors, view) {
      const nextWidth = canvas.width, nextHeight = canvas.height;
      if (nextWidth < 1 || nextHeight < 1) return;
      if (width !== nextWidth || height !== nextHeight) {
        width = nextWidth; height = nextHeight;
        image = context.createImageData(width, height);
        depth = new Float64Array(width * height); baseDepth = new Float64Array(width * height);
        basePixels = new Uint8ClampedArray(width * height * 4);
        cachedFaces = undefined;
      }
      const nextPalette = JSON.stringify([colors.fg, colors.bg, colors.accent, colors.muted]);
      if (paletteKey !== nextPalette) {
        paletteKey = nextPalette;
        inks = { fg: parseColor(colors.fg), bg: parseColor(colors.bg), accent: parseColor(colors.accent), muted: parseColor(colors.muted) };
        const groundLuminance = inks.bg[3] ? inks.bg[0] * 0.2126 + inks.bg[1] * 0.7152 + inks.bg[2] * 0.0722 : 127.5;
        lightInk = inks.fg[0] * 0.2126 + inks.fg[1] * 0.7152 + inks.fg[2] * 0.0722 >= groundLuminance;
        cachedFaces = undefined;
      }
      const viewKey = JSON.stringify([view.bounds, view.ground ?? 0, view.yaw ?? 45, view.elevation ?? 30]);
      if (cachedFaces !== staticFaces || cachedView !== viewKey) {
        cachedView = viewKey;
        const yaw = (view.yaw ?? 45) * Math.PI / 180, elevation = (view.elevation ?? 30) * Math.PI / 180;
        yawCos = Math.cos(yaw); yawSin = Math.sin(yaw); elevCos = Math.cos(elevation); elevSin = Math.sin(elevation);
        center = [0, 1, 2].map((i) => (view.bounds[0][i]! + view.bounds[1][i]!) / 2) as [number, number, number];
        ground = view.ground ?? 0;
        epsilon = Math.max(1e-6, Math.hypot(...pixelSceneSub(view.bounds[1], view.bounds[0])) * 1e-5);
        // A raised parallel plane differs in ray depth by height / sin(elevation).
        receiverTolerance = epsilon * 4 / Math.max(0.001, Math.abs(elevSin));
        scale = 1; offsetX = 0; offsetY = 0;
        const corners: PixelProjected[] = [];
        for (let i = 0; i < 8; i++) corners.push(project([view.bounds[i & 1 ? 1 : 0][0], view.bounds[i & 2 ? 1 : 0][1], view.bounds[i & 4 ? 1 : 0][2]]));
        const left = Math.min(...corners.map((p) => p[0])), right = Math.max(...corners.map((p) => p[0]));
        const top = Math.min(...corners.map((p) => p[1])), bottom = Math.max(...corners.map((p) => p[1]));
        scale = Math.min(width * 0.88 / Math.max(1e-8, right - left), height * 0.88 / Math.max(1e-8, bottom - top));
        offsetX = width / 2 - (left + right) * scale / 2; offsetY = height / 2 - (top + bottom) * scale / 2;
        const data = image.data;
        for (let i = 0; i < data.length; i += 4) { data[i] = inks.bg[0]; data[i + 1] = inks.bg[1]; data[i + 2] = inks.bg[2]; data[i + 3] = inks.bg[3]; }
        depth.fill(-Infinity);
        faces(staticFaces, false, true);
        faces(staticFaces, true);
        faces(staticFaces);
        basePixels.set(data); baseDepth.set(depth);
        cachedFaces = staticFaces;
      }
      image.data.set(basePixels); depth.set(baseDepth);
      faces(movingFaces, true);
      faces(movingFaces);
      context.putImageData(image, 0, 0);
    },
  };
}
