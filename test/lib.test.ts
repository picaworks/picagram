/** Unit tests for the shared runtime pieces that do not need a browser. */
import { describe, expect, it } from "vitest";
import { interfaceDocs } from "../scripts/catalog";
import { bayerMatrix, diffuse } from "../lib/dither";
import { createNoise } from "../lib/noise";
import { FALLBACK_RAMP, matchShape, measureRamp, pick, type Ramp, type Shapes } from "../lib/ramp";
import { createRng } from "../lib/rng";

describe("rng", () => {
  it("repeats for the same seed and stays in [0, 1)", () => {
    const a = createRng(7);
    const b = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("differs across seeds", () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
});

describe("noise", () => {
  it("is deterministic per seed and bounded", () => {
    const a = createNoise(3);
    const b = createNoise(3);
    for (let i = 0; i < 500; i++) {
      const x = i * 0.37;
      const y = i * 0.11;
      const v = a.noise3(x, y, i * 0.05);
      expect(v).toBe(b.noise3(x, y, i * 0.05));
      expect(Math.abs(v)).toBeLessThanOrEqual(1);
      expect(Math.abs(a.noise2(x, y))).toBeLessThanOrEqual(1);
    }
  });

  it("changes with the seed", () => {
    expect(createNoise(1).noise2(0.5, 0.5)).not.toBe(createNoise(2).noise2(0.5, 0.5));
  });
});

describe("ramp", () => {
  const ramp: Ramp = { glyphs: [" ", ".", "#"], levels: [0, 0.2, 1] };

  it("picks the glyph with the nearest measured ink", () => {
    expect(pick(ramp, -1)).toBe(" ");
    expect(pick(ramp, 0.15)).toBe(".");
    expect(pick(ramp, 0.7)).toBe("#");
    expect(pick(ramp, 2)).toBe("#");
  });

  it("keeps the given order, evenly spaced, where no canvas exists", () => {
    const measured = measureRamp("ab" + "a", "monospace");
    expect(measured.glyphs).toEqual(["a", "b"]);
    expect(measured.levels).toEqual([0, 1]);
    expect(measureRamp("", "monospace").glyphs.join("")).toBe(FALLBACK_RAMP);
  });

  it("matches a sample to the glyph with the closest shape", () => {
    const shapes: Shapes = { glyphs: ["-", "|"], n: 2, cells: [[0, 0, 1, 1], [1, 0, 1, 0]] };
    expect(matchShape(shapes, [0.1, 0, 0.9, 0.8])).toBe("-");
    expect(matchShape(shapes, [0.9, 0, 0.8, 0.1])).toBe("|");
  });
});

describe("dither", () => {
  it("builds the standard Bayer matrices", () => {
    expect(Array.from(bayerMatrix(2))).toEqual([0.125, 0.625, 0.875, 0.375]);
    const eight = Array.from(bayerMatrix(8));
    expect(new Set(eight).size).toBe(64);
    expect(Math.min(...eight)).toBeGreaterThan(0);
    expect(Math.max(...eight)).toBeLessThan(1);
  });

  it("keeps average tone through Floyd-Steinberg, and Atkinson lightens light greys by design", () => {
    const grey = new Array<number>(64 * 64).fill(0.25);
    const mean = (bits: Uint8Array): number => bits.reduce((sum, b) => sum + b, 0) / bits.length;
    expect(Math.abs(mean(diffuse(grey, 64, 64, "floyd-steinberg")) - 0.25)).toBeLessThan(0.02);
    // Atkinson spreads only three quarters of the error, so a light grey comes out lighter, never darker.
    const atkinson = mean(diffuse(grey, 64, 64, "atkinson"));
    expect(atkinson).toBeGreaterThan(0.1);
    expect(atkinson).toBeLessThan(0.25);
    expect(grey[0]).toBe(0.25);
  });
});

describe("catalog", () => {
  it("reads the JSDoc on each field of a props interface", () => {
    const source = [
      "export interface DemoProps {",
      "  /** First line",
      "   *  continues here. */",
      "  speed: number;",
      "  /** Optional field. */",
      "  label?: string;",
      "}",
    ].join("\n");
    expect(interfaceDocs(source, "DemoProps")).toEqual({ speed: "First line continues here.", label: "Optional field." });
  });
});
