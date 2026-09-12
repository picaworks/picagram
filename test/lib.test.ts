/** Unit tests for the shared runtime pieces that do not need a browser. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { interfaceDocs } from "../scripts/catalog";
import { braille, BRAILLE_BASE, brailleDot, leftEighth, lowerEighth, quadrant } from "../lib/blocks";
import { createBraillePlot } from "../lib/braille-plot";
import { arcPath, areaPath, bandScale, extent, formatNumber, linearScale, linePath, niceTicks } from "../lib/chart";
import { polarPoint } from "../lib/chart-marks";
import { formatTime, parseTime, timeTicks } from "../lib/chart-time";
import { bayerAt, bayerMatrix, diffuse, threshold } from "../lib/dither";
import { blueNoiseMatrix, clusterMatrix, ditherLevels, maskAt, thresholdMask } from "../lib/dither-mask";
import { boxMean, sobelEdges } from "../lib/filter";
import { changed, sameJson } from "../lib/json";
import { createNoise } from "../lib/noise";
import { inkPixels } from "../lib/pixels";
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

describe("dither masks", () => {
  /** Distance between two cells of a tile that wraps, which is how a mask is read. */
  const wrapDistance = (ax: number, ay: number, bx: number, by: number, size: number): number => {
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    return Math.hypot(Math.min(dx, size - dx), Math.min(dy, size - dy));
  };

  /** The mean distance from every cell of a tile to the nearest cell a mask inks at `level`. Evenly spread
   *  ink leaves every cell close to a mark, so the lower this is the better the spread. */
  const inkReach = (at: (x: number, y: number) => number, size: number, level: number): number => {
    const marks: [number, number][] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) if (at(x, y) < level) marks.push([x, y]);
    }
    let total = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let nearest = Number.POSITIVE_INFINITY;
        for (const [mx, my] of marks) nearest = Math.min(nearest, wrapDistance(x, y, mx, my, size));
        total += nearest;
      }
    }
    return total / (size * size);
  };

  const mean = (values: readonly number[]): number => values.reduce((sum, v) => sum + v, 0) / values.length;
  const ink = (bits: Uint8Array): number => bits.reduce((sum, b) => sum + b, 0);

  it("ranks every pixel of a blue noise mask once, and hands back the same array", () => {
    for (const size of [16, 32, 64] as const) {
      const mask = blueNoiseMatrix(size);
      const n = size * size;
      expect(mask.length, `size ${size}`).toBe(n);
      // Every threshold appears exactly once, evenly spaced, so the mask holds tone like a Bayer matrix.
      expect([...mask].sort((a, b) => a - b), `size ${size}`).toEqual(Array.from({ length: n }, (_, i) => (i + 0.5) / n));
      expect(Math.min(...mask), `size ${size}`).toBeGreaterThan(0);
      expect(Math.max(...mask), `size ${size}`).toBeLessThan(1);
      expect(blueNoiseMatrix(size), `size ${size} is built once`).toBe(mask);
    }
  });

  it("spreads ink further from itself than a Bayer matrix does, which is what blue means", () => {
    const size = 16;
    const blue = blueNoiseMatrix(size);
    // The same thresholds in a shuffled order, to show the measure can tell an even spread from a scatter.
    const shuffle = createRng(11);
    const order = Array.from({ length: size * size }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(shuffle() * (i + 1));
      [order[i], order[j]] = [order[j] ?? 0, order[i] ?? 0];
    }
    const white = new Float32Array(size * size);
    order.forEach((index, r) => {
      white[index] = (r + 0.5) / (size * size);
    });
    for (const level of [0.05, 0.1, 0.2, 0.3, 0.4]) {
      const reach = inkReach((x, y) => maskAt(blue, size, x, y), size, level);
      expect(reach, `level ${level} against Bayer`).toBeLessThan(inkReach((x, y) => bayerAt(8, x, y), size, level));
      expect(reach, `level ${level} against a shuffle`).toBeLessThan(inkReach((x, y) => maskAt(white, size, x, y), size, level));
    }
  });

  it("grows a clustered dot screen out from two centres", () => {
    for (const size of [4, 8] as const) {
      const mask = clusterMatrix(size);
      const centres = [[0, 0], [size / 2, size / 2]] as const;
      const darkestFirst = [...mask.keys()].sort((a, b) => (mask[a] ?? 0) - (mask[b] ?? 0));
      const reach = darkestFirst.map((i) => {
        const x = i % size;
        return Math.min(...centres.map(([cx, cy]) => wrapDistance(x, (i - x) / size, cx, cy, size)));
      });
      // The first ink lands on the two dot centres, and the next on the cells touching them.
      expect(reach.slice(0, 2), `size ${size}`).toEqual([0, 0]);
      expect(Math.max(...reach.slice(0, size === 8 ? 10 : 6)), `size ${size}`).toBe(1);
      // From there each dot widens: twice the ink reaches further from its centre, and never scatters.
      for (let k = 2; k < (size * size) / 2; k *= 2) {
        expect(mean(reach.slice(0, k)), `size ${size} at ${k}`).toBeLessThan(mean(reach.slice(0, k * 2)));
      }
    }
  });

  it("tiles any mask over the plane, wrapping negative coordinates", () => {
    const mask = clusterMatrix(4);
    expect(maskAt(mask, 4, 5, 6)).toBe(mask[2 * 4 + 1]);
    expect(maskAt(mask, 4, -1, -1)).toBe(mask[3 * 4 + 3]);
    expect(maskAt(mask, 4, 0, 0)).toBe(maskAt(mask, 4, 8, -8));
  });

  it("cuts where lib/dither.ts cuts, and a shift crawls the grain under a steady tone", () => {
    const rng = createRng(5);
    const field = Float32Array.from({ length: 32 * 32 }, () => rng());
    const bayer = bayerMatrix(8);
    expect([...thresholdMask(field, 32, 32, bayer, 8, 0.5, 0)]).toEqual([...threshold(field, 32, 32, 0.5, 8)]);
    expect([...thresholdMask(field, 32, 32, bayer, 8, 0.3, 0)]).toEqual([...threshold(field, 32, 32, 0.3, 8)]);

    const flat = new Float32Array(32 * 32).fill(0.37);
    const still = thresholdMask(flat, 32, 32, bayer, 8, 0.5, 0);
    // A shift of whole steps permutes a tile's thresholds, so exactly as many pixels take ink.
    const stepped = thresholdMask(flat, 32, 32, bayer, 8, 0.5, 8 / 64);
    expect(ink(stepped)).toBe(ink(still));
    expect([...stepped]).not.toEqual([...still]);
    // Between steps the count can move by at most one pixel per tile, of which this field holds sixteen.
    const crawled = thresholdMask(flat, 32, 32, bayer, 8, 0.5, 0.618);
    expect(Math.abs(ink(crawled) - ink(still))).toBeLessThanOrEqual(16);
    expect([...crawled]).not.toEqual([...still]);
    // The shift wraps, so a whole turn is no shift at all and a negative one is its complement.
    expect([...thresholdMask(flat, 32, 32, bayer, 8, 0.5, 1)]).toEqual([...still]);
    expect([...thresholdMask(flat, 32, 32, bayer, 8, 0.5, -0.382)]).toEqual([...crawled]);
  });

  it("quantizes to bands inside the range asked for", () => {
    const mask = blueNoiseMatrix(16);
    const rng = createRng(9);
    // A field that runs past both ends, because a caller's values are not always clamped.
    const field = Float32Array.from({ length: 40 * 24 }, () => rng() * 1.4 - 0.2);
    const bands = ditherLevels(field, 40, 24, 6, mask, 16);
    expect(bands.length).toBe(40 * 24);
    expect(Math.min(...bands)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...bands)).toBeLessThanOrEqual(5);
    expect([...ditherLevels(new Float32Array(64), 8, 8, 4, mask, 16)].every((b) => b === 0)).toBe(true);
    expect([...ditherLevels(new Float32Array(64).fill(1), 8, 8, 4, mask, 16)].every((b) => b === 3)).toBe(true);
    // A tone a tenth of the way up uses the two bands around it and neither of the ones beyond.
    expect(new Set(ditherLevels(new Float32Array(1024).fill(0.1), 32, 32, 3, mask, 16))).toEqual(new Set([0, 1]));
  });
});

describe("pixels", () => {
  /** An ImageData to write into, because Node has no canvas to make one with. */
  const blankImage = (width: number, height: number): ImageData =>
    ({ width, height, data: new Uint8ClampedArray(width * height * 4), colorSpace: "srgb" }) as ImageData;

  it("writes coverage as one color's alpha and leaves the color alone", () => {
    const image = inkPixels([0, 0.5, 1, -1], 4, 1, [10, 20, 30, 200], blankImage(4, 1));
    expect([...image.data.slice(0, 4)]).toEqual([10, 20, 30, 0]);
    expect([...image.data.slice(4, 8)]).toEqual([10, 20, 30, 100]);
    expect([...image.data.slice(8, 12)]).toEqual([10, 20, 30, 200]);
    expect([...image.data.slice(12, 16)]).toEqual([10, 20, 30, 0]);
  });

  it("writes into the image it is handed, which is how a frame avoids allocating one", () => {
    const image = blankImage(2, 1);
    expect(inkPixels([1, 1], 2, 1, [1, 2, 3, 255], image)).toBe(image);
    inkPixels([0, 0.25], 2, 1, [1, 2, 3, 255], image);
    expect([...image.data]).toEqual([1, 2, 3, 0, 1, 2, 3, 64]);
  });
});

describe("filter", () => {
  const WIDTH = 13;
  const HEIGHT = 9;
  const field = ((): Float32Array => {
    const rng = createRng(21);
    return Float32Array.from({ length: WIDTH * HEIGHT }, () => rng());
  })();
  /** The field with samples outside it repeating its edge, as both measurements read it. */
  const at = (x: number, y: number): number =>
    field[Math.min(HEIGHT - 1, Math.max(0, y)) * WIDTH + Math.min(WIDTH - 1, Math.max(0, x))] ?? 0;

  it("measures the Sobel gradient, against the kernels applied one tap at a time", () => {
    const edges = sobelEdges(field, WIDTH, HEIGHT);
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        let gx = 0;
        let gy = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const v = at(x + dx, y + dy);
            gx += v * dx * (dy === 0 ? 2 : 1);
            gy += v * dy * (dx === 0 ? 2 : 1);
          }
        }
        expect(edges[y * WIDTH + x], `${x}, ${y}`).toBeCloseTo(Math.min(1, Math.hypot(gx, gy) / (4 * Math.SQRT2)), 5);
      }
    }
    // A flat field has no edges, and a straight step reads at the fraction of the diagonal peak it is.
    expect([...sobelEdges(new Float32Array(9).fill(0.4), 3, 3)].every((v) => v === 0)).toBe(true);
    expect(sobelEdges([0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1], 4, 4)[5]).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it("measures a local mean over the pixels a clipped square covers", () => {
    for (const radius of [0, 1, 3]) {
      const means = boxMean(field, WIDTH, HEIGHT, radius);
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          let total = 0;
          let count = 0;
          for (let ny = Math.max(0, y - radius); ny <= Math.min(HEIGHT - 1, y + radius); ny++) {
            for (let nx = Math.max(0, x - radius); nx <= Math.min(WIDTH - 1, x + radius); nx++) {
              total += field[ny * WIDTH + nx] ?? 0;
              count++;
            }
          }
          expect(means[y * WIDTH + x], `radius ${radius} at ${x}, ${y}`).toBeCloseTo(total / count, 6);
        }
      }
    }
    // A radius past every edge is the whole field's mean, wherever it is read.
    const whole = field.reduce((sum, v) => sum + v, 0) / field.length;
    for (const v of boxMean(field, WIDTH, HEIGHT, 40)) expect(v).toBeCloseTo(whole, 6);
  });
});

describe("chart marks", () => {
  it("puts a polar point where arcPath draws one, clockwise from twelve o'clock", () => {
    expect(polarPoint(10, 10, 5, 0)).toEqual([10, 5]);
    for (const angle of [0, 0.4, Math.PI / 2, 2, Math.PI, 4.5, Math.PI * 1.75]) {
      const [x, y] = polarPoint(40, 30, 12, angle);
      // A pie slice moves to its centre, then lines out to the point at its start angle.
      const start = /L(-?[\d.]+) (-?[\d.]+)/.exec(arcPath(40, 30, 0, 12, angle, angle + 0.3));
      expect(start?.[1], `angle ${angle}`).toBe(String(Math.round(x * 100) / 100));
      expect(start?.[2], `angle ${angle}`).toBe(String(Math.round(y * 100) / 100));
    }
  });
});

describe("chart time", () => {
  const zone = process.env.TZ;
  // Fourteen hours ahead of UTC, so a label read in the machine's own zone would name another day.
  beforeAll(() => {
    process.env.TZ = "Pacific/Kiritimati";
  });
  afterAll(() => {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  });

  it("reads ISO 8601 and milliseconds, and nothing else", () => {
    expect(parseTime("2024-03-01")).toBe(Date.UTC(2024, 2, 1));
    expect(parseTime("2024-03-01T12:30")).toBe(Date.UTC(2024, 2, 1, 12, 30));
    expect(parseTime("2024-03-01 12:30:15")).toBe(Date.UTC(2024, 2, 1, 12, 30, 15));
    expect(parseTime("2024-03-01T12:30:00Z")).toBe(Date.UTC(2024, 2, 1, 12, 30));
    expect(parseTime("2024-03-01T12:30:00+05:00")).toBe(Date.UTC(2024, 2, 1, 7, 30));
    expect(parseTime("2024")).toBe(Date.UTC(2024, 0, 1));
    expect(parseTime(1_709_294_400_000)).toBe(1_709_294_400_000);
    expect(parseTime("1709294400000")).toBe(1_709_294_400_000);
    expect(parseTime(-5000)).toBe(-5000);
    expect(parseTime("banana")).toBeNaN();
    expect(parseTime("")).toBeNaN();
    expect(parseTime(Number.NaN)).toBeNaN();
    expect(parseTime(Number.POSITIVE_INFINITY)).toBeNaN();
  });

  it("steps an axis by round calendar amounts, from an hour to ten years", () => {
    const spans = {
      hour: timeTicks(Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 1, 1)),
      day: timeTicks(Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 2)),
      week: timeTicks(Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 8)),
      year: timeTicks(Date.UTC(2024, 0, 1), Date.UTC(2025, 0, 1)),
      decade: timeTicks(Date.UTC(2015, 0, 1), Date.UTC(2025, 0, 1)),
      century: timeTicks(Date.UTC(1925, 0, 1), Date.UTC(2025, 0, 1)),
    };
    expect(spans.hour.unit).toBe("hour");
    expect(spans.hour.times).toEqual([Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 1, 1)]);
    expect(spans.day.unit).toBe("hour");
    expect(spans.day.times.length).toBe(5);
    expect(spans.week.unit).toBe("day");
    expect(spans.year.unit).toBe("month");
    expect(spans.year.times).toEqual([0, 3, 6, 9, 12].map((month) => Date.UTC(2024, month, 1)));
    expect(spans.decade.unit).toBe("year");
    expect(spans.century.unit).toBe("year");
    expect(spans.century.times.every((t) => new Date(t).getUTCFullYear() % 10 === 0)).toBe(true);
    for (const [name, { times }] of Object.entries(spans)) {
      expect(times.length, `${name} tick count`).toBeGreaterThan(1);
      expect(times.length, `${name} tick count`).toBeLessThan(12);
      expect([...times].sort((a, b) => a - b), `${name} runs in order`).toEqual(times);
    }
    // A range shorter than an hour, and one with no width at all, still get ticks to draw.
    expect(timeTicks(Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 1, 0, 10)).unit).toBe("hour");
    expect(timeTicks(Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 1)).times.length).toBeGreaterThan(0);
    expect(timeTicks(Number.NaN, 1).times).toEqual([]);
  });

  it("prints a tick in UTC, whatever zone the machine keeps", () => {
    const instant = Date.UTC(2024, 2, 1, 15, 4);
    expect(formatTime(instant, "hour", "en-US")).toContain("3:04");
    expect(formatTime(instant, "day", "en-US")).toBe("Mar 1");
    expect(formatTime(instant, "month", "en-US")).toBe("Mar 2024");
    expect(formatTime(instant, "year", "en-US")).toBe("2024");
    // The same instant read in the zone this block sets falls on the next day, so those labels can only
    // have come from a formatter pinned to UTC.
    const local = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "Pacific/Kiritimati" });
    expect(local.format(instant)).toBe("Mar 2");
  });
});

describe("braille plot", () => {
  /** Reads a plot back through the glyphs it paints, which is the only way its dots leave it. */
  const painted = (plot: ReturnType<typeof createBraillePlot>): ((x: number, y: number) => boolean) => {
    const cells = new Map<string, string>();
    plot.paint({ set: (x, y, glyph) => cells.set(`${x},${y}`, glyph) }, 0, 0);
    return (x, y) => {
      const bits = (cells.get(`${x >> 1},${y >> 2}`)?.codePointAt(0) ?? 0) - BRAILLE_BASE;
      return (bits & brailleDot(y & 3, x & 1)) !== 0;
    };
  };

  it("counts two dots across and four down for every cell", () => {
    const plot = createBraillePlot(6, 3);
    expect([plot.width, plot.height]).toEqual([12, 12]);
    plot.dot(0, 0);
    plot.dot(11, 11);
    plot.dot(-1, 4);
    plot.dot(12, 4);
    const dots = painted(plot);
    expect(dots(0, 0)).toBe(true);
    expect(dots(11, 11)).toBe(true);
    // A point outside the plot is dropped rather than wrapped onto the other side.
    expect(dots(0, 4)).toBe(false);
    expect(dots(11, 4)).toBe(false);
    plot.clear();
    expect(painted(plot)(0, 0)).toBe(false);
  });

  it("draws a line whose ends land where they were asked for", () => {
    for (const [x0, y0, x1, y1] of [[1, 2, 10, 9], [10, 9, 1, 2], [0, 0, 11, 0], [3, 11, 3, 0], [5, 5, 5, 5]]) {
      const plot = createBraillePlot(6, 3);
      plot.line(x0 ?? 0, y0 ?? 0, x1 ?? 0, y1 ?? 0);
      const dots = painted(plot);
      const ends = `${x0}, ${y0} to ${x1}, ${y1}`;
      expect(dots(x0 ?? 0, y0 ?? 0), `${ends} starts`).toBe(true);
      expect(dots(x1 ?? 0, y1 ?? 0), `${ends} ends`).toBe(true);
      let raised = 0;
      for (let y = 0; y < plot.height; y++) {
        for (let x = 0; x < plot.width; x++) {
          if (!dots(x, y)) continue;
          raised++;
          // Every dot the line raises lies inside the box its ends make.
          expect(x >= Math.min(x0 ?? 0, x1 ?? 0) && x <= Math.max(x0 ?? 0, x1 ?? 0), `${ends} holds ${x}, ${y}`).toBe(true);
          expect(y >= Math.min(y0 ?? 0, y1 ?? 0) && y <= Math.max(y0 ?? 0, y1 ?? 0), `${ends} holds ${x}, ${y}`).toBe(true);
        }
      }
      // One dot per step along the longer side, and no gaps.
      expect(raised, `${ends} raises`).toBe(Math.max(Math.abs((x1 ?? 0) - (x0 ?? 0)), Math.abs((y1 ?? 0) - (y0 ?? 0))) + 1);
    }
  });

  it("paints the whole rectangle, blanks included, at the cell it is given", () => {
    const plot = createBraillePlot(2, 1);
    plot.dot(0, 0);
    const written = new Map<string, string>();
    plot.paint({ set: (x, y, glyph) => written.set(`${x},${y}`, glyph) }, 3, 2);
    expect([...written.keys()]).toEqual(["3,2", "4,2"]);
    expect(written.get("3,2")?.codePointAt(0)).toBe(BRAILLE_BASE + brailleDot(0, 0));
    expect(written.get("4,2")).toBe(braille(0));
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
