/** Unit tests for the shared runtime pieces that do not need a browser. */
import { describe, expect, it } from "vitest";
import { interfaceDocs } from "../scripts/catalog";
import { braille, brailleDot, leftEighth, lowerEighth, quadrant } from "../lib/blocks";
import { arcPath, areaPath, bandScale, extent, formatNumber, linearScale, linePath, niceTicks } from "../lib/chart";
import { bayerAt, bayerMatrix, diffuse, threshold } from "../lib/dither";
import { changed, sameJson } from "../lib/json";
import { createNoise } from "../lib/noise";
import { FALLBACK_RAMP, matchShape, measureRamp, pick, type Ramp, type Shapes } from "../lib/ramp";
import { createRng, hashSeed } from "../lib/rng";
import { fitRect } from "../lib/sample";
import { sizedFont } from "../lib/subject";

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

describe("ordered dither helpers", () => {
  it("reads the tiled matrix, wrapping negative coordinates", () => {
    const m = bayerMatrix(4);
    expect(bayerAt(4, 5, 6)).toBe(m[2 * 4 + 1]);
    expect(bayerAt(4, -1, -1)).toBe(m[3 * 4 + 3]);
  });

  it("cuts flat, or dithers a mid grey to exactly half ink", () => {
    expect(Array.from(threshold([0.2, 0.5, 0.8], 3, 1))).toEqual([0, 1, 1]);
    const bits = threshold(new Array<number>(64).fill(0.5), 8, 8, 0.5, 8);
    expect(bits.reduce((sum, b) => sum + b, 0)).toBe(32);
  });

  it("agrees with the bit formula lib/glsl.ts uses for pica_bayer8", () => {
    const m = bayerMatrix(8);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const a = x ^ y;
        const v = ((a & 1) << 5) | ((y & 1) << 4) | ((a & 2) << 2) | ((y & 2) << 1) | ((a & 4) >> 1) | ((y & 4) >> 2);
        expect((v + 0.5) / 64, `cell ${x}, ${y}`).toBeCloseTo(m[y * 8 + x] ?? -1, 6);
      }
    }
  });
});

describe("hashSeed", () => {
  it("repeats, stays unsigned, and gives neighbors unrelated seeds", () => {
    expect(hashSeed(1, 2, 3)).toBe(hashSeed(1, 2, 3));
    const seen = new Set<number>();
    for (let a = 0; a < 64; a++) {
      for (let b = 0; b < 64; b++) {
        const h = hashSeed(7, a, b);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(2 ** 32);
        seen.add(h);
      }
    }
    expect(seen.size).toBe(64 * 64);
    expect(hashSeed(1, 0)).not.toBe(hashSeed(2, 0));
    expect(createRng(hashSeed(1, 0))()).not.toBe(createRng(hashSeed(1, 1))());
  });
});

describe("json", () => {
  it("compares by content, not identity", () => {
    expect(sameJson({ a: [1, { b: "x" }], c: null }, { c: null, a: [1, { b: "x" }] })).toBe(true);
    expect(sameJson([1, 2], [1, 2, 3])).toBe(false);
    expect(sameJson({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(sameJson([1], { 0: 1 })).toBe(false);
    expect(sameJson(null, {})).toBe(false);
  });

  it("reports whether the named props changed", () => {
    const before = { tiers: [{ name: "a" }], label: "x" };
    expect(changed(before, { ...before, tiers: [{ name: "a" }] }, ["tiers"])).toBe(false);
    expect(changed(before, { ...before, label: "y" }, ["tiers"])).toBe(false);
    expect(changed(before, { ...before, label: "y" }, ["label"])).toBe(true);
  });
});

describe("chart", () => {
  it("picks round ticks that enclose the data", () => {
    expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceTicks(0.1, 0.9, 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(niceTicks(-3, 7, 5)).toEqual([-4, -2, 0, 2, 4, 6, 8]);
    const flat = niceTicks(5, 5);
    expect(flat.length).toBeGreaterThan(1);
    expect(flat[0]).toBeLessThanOrEqual(5);
    expect(flat[flat.length - 1]).toBeGreaterThanOrEqual(5);
    expect(niceTicks(Number.NaN, 1)).toEqual([0, 1]);
  });

  it("maps values and bands", () => {
    expect(linearScale([0, 10], [0, 100])(5)).toBe(50);
    expect(linearScale([3, 3], [10, 20])(99)).toBe(10);
    const bands = bandScale(4, [0, 100], 0.2);
    expect(bands.step).toBe(25);
    expect(bands.bandwidth).toBe(20);
    expect(bands.at(3)).toBe(77.5);
    expect(extent([3, Number.NaN, -1, 8])).toEqual([-1, 8]);
    expect(extent([])).toEqual([0, 0]);
  });

  it("formats labels and builds paths", () => {
    expect(formatNumber(1234.5, { locale: "en-US" })).toBe("1,234.5");
    expect(formatNumber(12500, { locale: "en-US" })).toBe("12.5K");
    expect(formatNumber(12500, { compact: false, locale: "en-US" })).toBe("12,500");
    expect(linePath([[0, 0], [10, 5.555]])).toBe("M0 0L10 5.56");
    expect(areaPath([[0, 1], [2, 3]], 10)).toBe("M0 1L2 3L2 10L0 10Z");
    expect(areaPath([], 10)).toBe("");
    expect(arcPath(0, 0, 0, 10, 0, Math.PI / 2)).toBe("M0 0L0 -10A10 10 0 0 1 10 0Z");
    expect(arcPath(0, 0, 5, 10, 0, Math.PI * 2).match(/A/g)?.length).toBe(4);
  });
});

describe("blocks", () => {
  it("places braille dots and block glyphs", () => {
    expect([0, 1, 2, 3].map((row) => brailleDot(row, 0))).toEqual([1, 2, 4, 64]);
    expect([0, 1, 2, 3].map((row) => brailleDot(row, 1))).toEqual([8, 16, 32, 128]);
    expect(braille(0).codePointAt(0)).toBe(0x2800);
    expect(braille(0xff).codePointAt(0)).toBe(0x28ff);
    expect(quadrant(false, false, false, false)).toBe(" ");
    expect(quadrant(true, false, false, true).codePointAt(0)).toBe(0x259a);
    expect(quadrant(true, true, true, true).codePointAt(0)).toBe(0x2588);
    expect(lowerEighth(4).codePointAt(0)).toBe(0x2584);
    expect(leftEighth(1).codePointAt(0)).toBe(0x258f);
    expect(lowerEighth(-3)).toBe(" ");
    expect(leftEighth(12).codePointAt(0)).toBe(0x2588);
  });
});

describe("fonts and fitting", () => {
  it("sets the size in a font shorthand, adding one when it has none", () => {
    expect(sizedFont('700 "Barlow Condensed", "Helvetica Neue", Arial, sans-serif', 240)).toBe(
      '700 240px "Barlow Condensed", "Helvetica Neue", Arial, sans-serif',
    );
    expect(sizedFont("italic bold 12px/1.4 Georgia, serif", 30)).toBe("italic bold 30px Georgia, serif");
    expect(sizedFont("Condensed 400 monospace", 10)).toBe("Condensed 400 10px monospace");
    expect(sizedFont("", 10)).toBe("10px sans-serif");
  });

  it("fits a source into a box", () => {
    expect(fitRect(100, 50, 200, 200, "contain")).toEqual({ x: 0, y: 50, w: 200, h: 100 });
    expect(fitRect(100, 50, 200, 200, "cover")).toEqual({ x: -100, y: 0, w: 400, h: 200 });
    expect(Math.abs(fitRect(100, 50, 200, 200, "cover", 0).x)).toBe(0);
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
