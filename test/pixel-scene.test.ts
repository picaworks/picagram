import { describe, expect, it, vi } from "vitest";
import { createPixelScene, pixelBox, pixelCone, pixelPrism, pixelRod, type PixelFace, type PixelPaint, type PixelPoint, type PixelView } from "../lib/pixel-scene";
import { parseColor } from "../lib/color";
import type { Colors } from "../lib/palette";

vi.mock("../lib/color", () => ({
  parseColor: vi.fn((color: string): [number, number, number, number] => {
    const values: Record<string, [number, number, number, number]> = {
      ink: [230, 230, 230, 255], paper: [12, 12, 12, 255], accent: [30, 140, 220, 255],
      muted: [140, 140, 140, 180], changed: [220, 50, 40, 255], transparent: [0, 0, 0, 0],
      half: [220, 80, 30, 128],
      dark: [12, 12, 12, 255], light: [245, 245, 245, 255],
    };
    return values[color] ?? [0, 0, 0, 0];
  }),
}));
const colors: Colors = { fg: "ink", bg: "paper", accent: "accent", muted: "muted" };
const topView: PixelView = { bounds: [[-4, -4, 0], [4, 4, 6]], elevation: 90, yaw: 0 };
function canvasFixture(width = 96, height = 96) {
  let pixels = new Uint8ClampedArray(width * height * 4);
  const context = {
    createImageData: vi.fn((w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4), colorSpace: "srgb" }) as ImageData),
    putImageData: vi.fn((frame: ImageData) => { pixels = new Uint8ClampedArray(frame.data); }),
  };
  const canvas = { width, height, getContext: () => context } as unknown as HTMLCanvasElement;
  return { canvas, context, scene: createPixelScene(canvas), pixels: () => pixels };
}
function box(min: PixelPoint, size: PixelPoint, paint: PixelPaint = {}): PixelFace[] {
  const result: PixelFace[] = [];
  pixelBox(result, min, size, paint);
  return result;
}
function sample(bytes: Uint8ClampedArray, x: number, y: number, width = 96): number[] {
  return Array.from(bytes.slice((y * width + x) * 4, (y * width + x) * 4 + 4));
}

describe("pixel scene rasterization", () => {
  it("keeps the nearer solid regardless of face insertion order", () => {
    const far = box([-1, -1, 0], [2, 2, 1]);
    const near = box([-1, -1, 2], [2, 2, 1], { ink: "accent" });
    const a = canvasFixture(), b = canvasFixture(), only = canvasFixture();
    a.scene.draw([...far, ...near], [], colors, topView);
    b.scene.draw([...near, ...far].reverse(), [], colors, topView);
    only.scene.draw(near, [], colors, topView);
    expect(a.pixels()).toEqual(b.pixels());
    expect(a.pixels()).toEqual(only.pixels());
    expect(sample(a.pixels(), 48, 48)[2]).toBeGreaterThan(sample(a.pixels(), 48, 48)[0]!);
  });
  it("supports both windings and safely ignores degeneracy and distant geometry", () => {
    const face: PixelFace = { points: [[-2, -2, 1], [2, -2, 1], [2, 2, 1], [-2, 2, 1]], edge: true };
    const a = canvasFixture(), b = canvasFixture();
    a.scene.draw([face], [], colors, topView);
    b.scene.draw([{ ...face, points: [...face.points].reverse() }, { points: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] }, { points: [[1e8, 1e8, 1], [1e8 + 1, 1e8, 1], [1e8, 1e8 + 1, 1]], edge: true }], [], colors, topView);
    expect(b.pixels()).toEqual(a.pixels());
  });
  it("is deterministic, does not mutate callers, and reuses its image at a fixed size", () => {
    const fixture = canvasFixture();
    const faces = box([-1, -1, 1], [2, 2, 2], { edge: true });
    const before = JSON.stringify({ faces, colors, topView });
    fixture.scene.draw(faces, [], colors, topView);
    const first = fixture.pixels();
    fixture.scene.draw(faces, [], colors, topView);
    expect(fixture.pixels()).toEqual(first);
    expect(fixture.context.createImageData).toHaveBeenCalledTimes(1);
    expect(fixture.context.putImageData.mock.calls[0]?.[0]).toBe(fixture.context.putImageData.mock.calls[1]?.[0]);
    expect(JSON.stringify({ faces, colors, topView })).toBe(before);
  });
  it("invalidates cached ink on palette updates and parses only when palette strings change", () => {
    const fixture = canvasFixture(), faces = box([-1, -1, 1], [2, 2, 2]);
    fixture.scene.draw(faces, [], colors, topView);
    const first = fixture.pixels(), calls = vi.mocked(parseColor).mock.calls.length;
    fixture.scene.draw(faces, [], { ...colors }, topView);
    expect(vi.mocked(parseColor).mock.calls.length).toBe(calls);
    fixture.scene.draw(faces, [], { ...colors, fg: "changed" }, topView);
    expect(fixture.pixels()).not.toEqual(first);
    expect(sample(fixture.pixels(), 48, 48)[0]).toBeGreaterThan(sample(fixture.pixels(), 48, 48)[2]!);
  });
  it("restores the static cache so moving objects leave no old pixels", () => {
    const fixture = canvasFixture(), fresh = canvasFixture();
    const ground: PixelFace[] = [{ points: [[-3, -3, 0], [3, -3, 0], [3, 3, 0], [-3, 3, 0]], ink: "muted" }];
    fixture.scene.draw(ground, box([-2, -1, 1], [1, 1, 1], { ink: "accent" }), colors, topView);
    const moved = box([1, -1, 1], [1, 1, 1], { ink: "accent" });
    fixture.scene.draw(ground, moved, colors, topView);
    fresh.scene.draw(ground, moved, colors, topView);
    expect(fixture.pixels()).toEqual(fresh.pixels());
    fixture.scene.draw(ground, [], colors, topView);
    fresh.scene.draw(ground, [], colors, topView);
    expect(fixture.pixels()).toEqual(fresh.pixels());
  });
  it("invalidates static geometry references, camera values, and dimensions", () => {
    const fixture = canvasFixture(), fresh = canvasFixture();
    fixture.scene.draw(box([-2, -2, 1], [1, 1, 1]), [], colors, topView);
    const changed = box([1, 1, 1], [1, 1, 1]);
    const view: PixelView = { ...topView, yaw: 30, bounds: [[-5, -4, 0], [5, 4, 6]] };
    fixture.scene.draw(changed, [], colors, view);
    fresh.scene.draw(changed, [], colors, view);
    expect(fixture.pixels()).toEqual(fresh.pixels());
    fixture.canvas.width = 64;
    fixture.scene.draw(changed, [], colors, view);
    expect(fixture.pixels()).toHaveLength(64 * 96 * 4);
    expect(fixture.context.createImageData).toHaveBeenCalledTimes(2);
  });
  it("does not reread static geometry on a cache hit", () => {
    const fixture = canvasFixture();
    let reads = 0;
    const face: PixelFace = { get points(): readonly PixelPoint[] { reads++; return [[-1, -1, 1], [1, -1, 1], [0, 1, 1]]; } };
    const faces = [face];
    fixture.scene.draw(faces, [], colors, topView);
    const firstReads = reads;
    fixture.scene.draw(faces, [], colors, topView);
    expect(reads).toBe(firstReads);
    expect(firstReads).toBeGreaterThan(0);
  });
  it("occludes rear geometry with printed nearest-surface coverage", () => {
    const near: PixelFace = { points: [[-1, -1, 3], [1, -1, 3], [1, 1, 3], [-1, 1, 3]], tone: 0.5 };
    const far: PixelFace = { points: near.points.map(([x, y]): PixelPoint => [x, y, 2]), ink: "accent" };
    const palette = { ...colors, fg: "half", bg: "transparent" };
    const a = canvasFixture(), b = canvasFixture(), only = canvasFixture();
    a.scene.draw([near, far], [], palette, topView);
    b.scene.draw([far, near], [], palette, topView);
    only.scene.draw([near], [], palette, topView);
    expect(a.pixels()).toEqual(only.pixels());
    expect(b.pixels()).toEqual(only.pixels());
    a.scene.draw([near], [far], palette, topView);
    expect(a.pixels()).toEqual(only.pixels());
  });
  it("preserves transparent background and source alpha", () => {
    const fixture = canvasFixture();
    fixture.scene.draw([{ points: [[-1, -1, 2], [1, -1, 2], [1, 1, 2], [-1, 1, 2]] }], [], { ...colors, fg: "half", bg: "transparent" }, topView);
    expect(sample(fixture.pixels(), 0, 0)).toEqual([0, 0, 0, 0]);
    const center = sample(fixture.pixels(), 48, 48);
    expect(center.slice(0, 3)).toEqual([220, 80, 30]);
    expect(center[3]).toBeGreaterThan(0);
    expect(center[3]).toBeLessThanOrEqual(128);
  });
  it("maps lit face coverage to inherited light or dark ink over a transparent host", () => {
    const face: PixelFace = { points: [[-1, -1, 2], [1, -1, 2], [1, 1, 2], [-1, 1, 2]] };
    const bright = canvasFixture(), dark = canvasFixture();
    bright.scene.draw([face], [], { ...colors, bg: "transparent" }, topView);
    dark.scene.draw([face], [], { ...colors, fg: "dark", bg: "transparent" }, topView);
    expect(sample(bright.pixels(), 48, 48)[3]).toBeGreaterThan(sample(dark.pixels(), 48, 48)[3]!);
  });
  it("casts a bounded shadow onto the configured receiving plane", () => {
    const floor: PixelFace = { points: [[-3, -3, 1], [3, -3, 1], [3, 3, 1], [-3, 3, 1]], ink: "muted" };
    const raised: PixelFace = { points: [[0, 0, 3], [0.8, 0, 3], [0.8, 0.8, 3], [0, 0.8, 3]], ink: "accent", shadow: true };
    const shadow = canvasFixture(), clear = canvasFixture(), moving = canvasFixture();
    const view = { ...topView, ground: 1 };
    shadow.scene.draw([floor, raised], [], colors, view);
    clear.scene.draw([floor, { ...raised, shadow: false }], [], colors, view);
    moving.scene.draw([floor], [raised], colors, view);
    expect(sample(shadow.pixels(), 66, 45)).not.toEqual(sample(clear.pixels(), 66, 45));
    expect(sample(shadow.pixels(), 73, 41)).toEqual(sample(clear.pixels(), 73, 41));
    expect(sample(shadow.pixels(), 0, 0)).toEqual(sample(clear.pixels(), 0, 0));
    expect(moving.pixels()).toEqual(shadow.pixels());
    for (const palette of [colors, { ...colors, fg: "dark", bg: "light" }]) {
      shadow.scene.draw([floor, raised], [], palette, view);
      clear.scene.draw([floor, { ...raised, shadow: false }], [], palette, view);
      const darkened = sample(shadow.pixels(), 66, 45).slice(0, 3).reduce((sum, value) => sum + value, 0);
      const unshadowed = sample(clear.pixels(), 66, 45).slice(0, 3).reduce((sum, value) => sum + value, 0);
      expect(darkened).toBeLessThan(unshadowed);
    }
  });
  it("keeps static and moving ground shadows at a low oblique elevation", () => {
    const floor: PixelFace = { points: [[-3,-3,1],[3,-3,1],[3,3,1],[-3,3,1]], ink: "muted" };
    const raised: PixelFace = { points: [[-1,-1,3],[1,-1,3],[1,1,3],[-1,1,3]], ink: "accent", shadow: true };
    for (const elevation of [10, 30]) {
      const shadow = canvasFixture(), clear = canvasFixture(), moving = canvasFixture();
      const view = { ...topView, ground: 1, elevation };
      shadow.scene.draw([floor, raised], [], colors, view);
      clear.scene.draw([floor, { ...raised, shadow: false }], [], colors, view);
      moving.scene.draw([floor], [raised], colors, view);
      expect(shadow.pixels(), `shadow at ${elevation} degrees`).not.toEqual(clear.pixels());
      expect(moving.pixels()).toEqual(shadow.pixels());
      expect(sample(shadow.pixels(), 0, 0)).toEqual(sample(clear.pixels(), 0, 0));
    }
  });
});

function expectClosed(faces: PixelFace[]) {
  expect(faces.length).toBeGreaterThan(3);
  const edges = new Map<string, number>();
  for (const face of faces) {
    expect(face.points.length).toBeGreaterThanOrEqual(3);
    for (const point of face.points) expect(point.every(Number.isFinite)).toBe(true);
    const [a, b, c] = face.points as [PixelPoint, PixelPoint, PixelPoint, ...PixelPoint[]];
    const u = b.map((n, i) => n - a[i]!), v = c.map((n, i) => n - a[i]!);
    expect(Math.hypot(u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!)).toBeGreaterThan(1e-9);
    for (let i = 0; i < face.points.length; i++) {
      const key = [face.points[i]!.join(","), face.points[(i + 1) % face.points.length]!.join(",")].sort().join("|");
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  expect([...edges.values()].every((count) => count === 2)).toBe(true);
}
describe("pixel scene primitives", () => {
  it("emits closed nondegenerate solids and copies every paint property", () => {
    const paint: PixelPaint = { ink: "accent", tone: 0.6, edge: true, shadow: true };
    const shapes: PixelFace[][] = [[], [], []];
    pixelBox(shapes[0]!, [1, 2, 3], [2, 3, 4], paint);
    pixelPrism(shapes[1]!, [[0, 0], [3, 0], [2, 2], [0, 2]], 1, 2, paint);
    pixelCone(shapes[2]!, [0, 0, 1], 2, 3, paint, 9);
    for (const faces of shapes) {
      expectClosed(faces);
      for (const face of faces) expect({ ink: face.ink, tone: face.tone, edge: face.edge, shadow: face.shadow }).toEqual(paint);
    }
  });
  it("supports arbitrary rod axes and handles zero length without invalid faces", () => {
    for (const to of [[3, 0, 0], [0, 3, 0], [0, 0, 3], [2, -3, 4], [0.00001, 0, 4]] as const) {
      const faces: PixelFace[] = [];
      pixelRod(faces, [0, 0, 0], to, 0.4, {}, 7);
      expectClosed(faces);
    }
    const empty: PixelFace[] = [];
    pixelRod(empty, [1, 1, 1], [1, 1, 1], 1);
    expect(empty).toEqual([]);
  });
});
