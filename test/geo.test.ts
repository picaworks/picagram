/** lib/geo.ts and the pipeline that fills it. Everything above the last block runs whether or not the land
 *  data is on disk. The last block needs sources/geo/ne_110m_land.shp and the lib/geo-land.ts that npm run
 *  geo writes from it, and it is skipped, by name, while either is missing. */
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { ROOT } from "../scripts/catalog";
import { GEO_EQUAL_EARTH_BOX, GEO_STEP, geoCut, geoDecode, geoEqualEarth, geoGraticule, geoSeam, geoTurn, geoVector } from "../lib/geo";
import { encodeRings, readShapefileRings, ringAreaKm2, simplifyLine, snapRing } from "../scripts/geo";

const run = promisify(execFile);
const RAD = Math.PI / 180;
const LAND_FILE = join(ROOT, "lib", "geo-land.ts");
const SOURCE_FILE = join(ROOT, "sources", "geo", "ne_110m_land.shp");
const land = existsSync(LAND_FILE) ? readFileSync(LAND_FILE, "utf8") : null;

describe("the ring encoding", () => {
  /** A ring that walks east from a corner, long enough for counts and deltas past one character. */
  const march = (points: number): number[] => {
    const ring: number[] = [];
    for (let p = 0; p < points; p++) ring.push(-180 + p * GEO_STEP, 45 - (p % 7) * GEO_STEP);
    return ring;
  };

  const rings = [
    [1, 2, 1.25, 2.5, 1.5, 2, 1, 2],
    [-0.25, -0.5, -1, -0.75, -0.5, -12.25, -0.25, -0.5],
    [179.75, -79.5, 180, -90, -180, -90, -179.75, -79.5, 179.75, -79.5],
    [-180, -90, 180, 90, -180, 90, -180, -90],
    march(400),
  ];

  it("round trips rings through the string a component reads", () => {
    const decoded = geoDecode(encodeRings(rings));
    expect(decoded.length).toBe(rings.length);
    rings.forEach((ring, i) => {
      expect(Array.from(decoded[i] ?? []), `ring ${i}`).toEqual(ring);
    });
  });

  it("writes only characters that need no escaping, and keeps every ring on one line", () => {
    const encoded = encodeRings(rings);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(JSON.stringify(encoded)).toBe(`"${encoded}"`);
  });

  it("spends one character on a short delta and more only when it has to", () => {
    // Three points a quarter degree apart: a count, two coordinates, and then four deltas of one step.
    expect(encodeRings([[0, 0, 0.25, 0, 0.25, 0.25, 0, 0]]).length).toBe(9);
    // A jump right across the world is 1440 steps, which needs three characters of five bits.
    expect(encodeRings([[-180, 0, 180, 0]]).length).toBe(1 + 3 + 1 + 3 + 1);
  });

  it("reads a truncated or empty string as the rings it can find, and never throws", () => {
    const encoded = encodeRings(rings);
    expect(geoDecode("")).toEqual([]);
    // The rings before the cut are whole, and the one across it is short rather than fatal.
    expect(Array.from(geoDecode(encoded.slice(0, 12))[0] ?? [])).toEqual(rings[0]);
    expect(() => geoDecode(encoded.slice(0, 3))).not.toThrow();
  });

  it("rounds onto the quarter degree grid, drops repeats, closes the ring, and refuses a sliver", () => {
    expect(snapRing([0, 0, 0.03, 0.02, 1.1, 0.4, 1.9, 1.6, 0, 0])).toEqual([0, 0, 1, 0.5, 2, 1.5, 0, 0]);
    // Four points that round onto two are not a ring at all.
    expect(snapRing([10, 10, 10.05, 10.05, 10.1, 10.02, 10, 10])).toBe(null);
    // An open ring is closed for the caller.
    const closed = snapRing([0, 0, 3, 0, 3, 3]) ?? [];
    expect(closed.slice(0, 2)).toEqual(closed.slice(-2));
    expect(closed.length).toBe(8);
  });
});

describe("the shapefile reader", () => {
  /** A polygon shapefile written field by field: a 100 byte header, then one record per polygon, each with a
   *  big endian record header and a little endian body. ESRI Shapefile Technical Description, July 1998. */
  const shapefile = (polygons: readonly (readonly number[])[][]): Buffer => {
    const records: Buffer[] = [];
    polygons.forEach((parts, index) => {
      const points = parts.reduce((sum, ring) => sum + ring.length / 2, 0);
      const body = Buffer.alloc(44 + parts.length * 4 + points * 16);
      const lons = parts.flatMap((ring) => ring.filter((_, i) => i % 2 === 0));
      const lats = parts.flatMap((ring) => ring.filter((_, i) => i % 2 === 1));
      body.writeInt32LE(5, 0);
      body.writeDoubleLE(Math.min(...lons), 4);
      body.writeDoubleLE(Math.min(...lats), 12);
      body.writeDoubleLE(Math.max(...lons), 20);
      body.writeDoubleLE(Math.max(...lats), 28);
      body.writeInt32LE(parts.length, 36);
      body.writeInt32LE(points, 40);
      let start = 0;
      let at = 44 + parts.length * 4;
      parts.forEach((ring, part) => {
        body.writeInt32LE(start, 44 + part * 4);
        start += ring.length / 2;
        for (const value of ring) {
          body.writeDoubleLE(value, at);
          at += 8;
        }
      });
      const head = Buffer.alloc(8);
      head.writeInt32BE(index + 1, 0);
      head.writeInt32BE(body.length / 2, 4);
      records.push(head, body);
    });
    const rest = Buffer.concat(records);
    const header = Buffer.alloc(100);
    header.writeInt32BE(9994, 0);
    header.writeInt32BE((100 + rest.length) / 2, 24);
    header.writeInt32LE(1000, 28);
    header.writeInt32LE(5, 32);
    header.writeDoubleLE(-180, 36);
    header.writeDoubleLE(-90, 44);
    header.writeDoubleLE(180, 52);
    header.writeDoubleLE(90, 60);
    return Buffer.concat([header, rest]);
  };

  // A square with a square hole, wound the way the format asks, and a triangle beside it.
  const square = [0, 0, 0, 10, 10, 10, 10, 0, 0, 0];
  const hole = [2, 2, 4, 2, 4, 4, 2, 4, 2, 2];
  const triangle = [20, 0, 20, 5, 25, 0, 20, 0];

  it("reads every part of every record, holes with their outlines", () => {
    const rings = readShapefileRings(shapefile([[square, hole], [triangle]]));
    expect(rings).toEqual([square, hole, triangle]);
  });

  it("skips a null shape and stops at the length in the header", () => {
    const file = shapefile([[square], [triangle]]);
    // Turn the first record into a null shape, which carries type 0 and no geometry.
    file.writeInt32LE(0, 108);
    expect(readShapefileRings(file)).toEqual([triangle]);
    // Trailing bytes past the length the header declares are not records.
    expect(readShapefileRings(Buffer.concat([file, Buffer.alloc(64, 7)]))).toEqual([triangle]);
  });

  it("says what is wrong with a file it cannot read", () => {
    expect(() => readShapefileRings(Buffer.alloc(20))).toThrow(/100 byte header/);
    const wrong = shapefile([[triangle]]);
    wrong.writeInt32BE(1234, 0);
    expect(() => readShapefileRings(wrong)).toThrow(/file code/);
    const points = shapefile([[triangle]]);
    points.writeInt32LE(1, 32);
    expect(() => readShapefileRings(points)).toThrow(/shape type 1/);
  });

  it("measures a ring's area on the sphere", () => {
    // A hemisphere is half of 4 pi r squared, and this ring runs along the equator.
    const equator: number[] = [];
    for (let lon = -180; lon <= 180; lon += 10) equator.push(lon, 0);
    const globe = 4 * Math.PI * 6371.0088 ** 2;
    expect(ringAreaKm2(equator) / globe).toBeCloseTo(0.5, 6);
    // A one degree box at the equator is about 111 km on a side.
    expect(ringAreaKm2([0, 0, 1, 0, 1, 1, 0, 1, 0, 0]) ** 0.5).toBeGreaterThan(110);
    expect(ringAreaKm2([0, 0, 1, 0, 1, 1, 0, 1, 0, 0]) ** 0.5).toBeLessThan(112);
    // The same box at 60 degrees north covers half as much ground.
    expect(ringAreaKm2([0, 60, 1, 60, 1, 61, 0, 61, 0, 60]) / ringAreaKm2([0, 0, 1, 0, 1, 1, 0, 1, 0, 0]))
      .toBeCloseTo(0.5, 1);
  });
});

describe("simplification", () => {
  // A flat run with a barely visible kink in it, then a tall spike, then flat again.
  const spike = [0, 0, 1, 0.01, 2, 0, 3, 0, 4, 2, 5, 0, 6, 0];

  it("drops the points that carry no shape and keeps the spike", () => {
    expect(simplifyLine(spike, 0.5)).toEqual([0, 0, 3, 0, 4, 2, 5, 0, 6, 0]);
    // A larger threshold eats into the spike's feet next, and never its apex.
    expect(simplifyLine(spike, 1.5)).toEqual([0, 0, 3, 0, 4, 2, 6, 0]);
    // The ends are the caller's, so a threshold past everything leaves them.
    expect(simplifyLine(spike, 1000)).toEqual([0, 0, 6, 0]);
    expect(simplifyLine(spike, 0)).toEqual(spike);
  });

  it("weighs a triangle by the cosine of its latitude, so the far north simplifies sooner", () => {
    const equator = [0, 0, 1, 0.4, 2, 0];
    const north = [0, 60, 1, 60.4, 2, 60];
    expect(simplifyLine(equator, 0.3)).toEqual(equator);
    expect(simplifyLine(north, 0.3)).toEqual([0, 60, 2, 60]);
  });

  it("keeps the corners of a seam, which a fill is built out of", () => {
    // The two points at the pole sit on a straight line, and a plain measure would drop them first.
    const antarctic = [180, -70, 180, -90, -180, -90, -180, -70];
    expect(simplifyLine(antarctic, 1000)).toEqual(antarctic);
  });
});

describe("projections", () => {
  it("puts Equal Earth's origin, edge, and pole where the paper does", () => {
    expect(geoEqualEarth(0, 0)).toEqual([0, 0]);
    expect(geoEqualEarth(180, 0)[0]).toBeCloseTo(2.7066, 4);
    expect(geoEqualEarth(0, 90)[1]).toBeCloseTo(1.3174, 4);
    expect(geoEqualEarth(-180, 0)[0]).toBeCloseTo(-2.7066, 4);
    expect(geoEqualEarth(0, -90)[1]).toBeCloseTo(-1.3174, 4);
    // Longitude is linear at any one latitude, and the map is the same on both sides of the equator.
    expect(geoEqualEarth(90, 40)[0]).toBeCloseTo(geoEqualEarth(180, 40)[0] / 2, 10);
    expect(geoEqualEarth(60, 25)[1]).toBeCloseTo(-geoEqualEarth(60, -25)[1], 10);
  });

  it("hands back a box the whole map fits in", () => {
    expect(GEO_EQUAL_EARTH_BOX.width).toBeCloseTo(2 * 2.7066, 3);
    expect(GEO_EQUAL_EARTH_BOX.height).toBeCloseTo(2 * 1.3174, 3);
    expect(GEO_EQUAL_EARTH_BOX.x).toBeCloseTo(-GEO_EQUAL_EARTH_BOX.width / 2, 10);
    expect(GEO_EQUAL_EARTH_BOX.y).toBeCloseTo(-GEO_EQUAL_EARTH_BOX.height / 2, 10);
    for (const [lon, lat] of [[-180, -90], [180, 90], [0, 0], [-45, 71], [151, -34]] as const) {
      const [x, y] = geoEqualEarth(lon, lat);
      expect((x - GEO_EQUAL_EARTH_BOX.x) / GEO_EQUAL_EARTH_BOX.width, `${lon}, ${lat}`).toBeGreaterThanOrEqual(0);
      expect((x - GEO_EQUAL_EARTH_BOX.x) / GEO_EQUAL_EARTH_BOX.width, `${lon}, ${lat}`).toBeLessThanOrEqual(1);
      expect((y - GEO_EQUAL_EARTH_BOX.y) / GEO_EQUAL_EARTH_BOX.height, `${lon}, ${lat}`).toBeGreaterThanOrEqual(0);
      expect((y - GEO_EQUAL_EARTH_BOX.y) / GEO_EQUAL_EARTH_BOX.height, `${lon}, ${lat}`).toBeLessThanOrEqual(1);
    }
  });

  it("puts a longitude and latitude on the unit sphere with north up", () => {
    expect(geoVector(0, 0)).toEqual([0, 0, 1]);
    expect(geoVector(90, 0)[0]).toBeCloseTo(1, 12);
    expect(geoVector(0, 90)[1]).toBeCloseTo(1, 12);
    expect(geoVector(0, -90)[1]).toBeCloseTo(-1, 12);
    for (const [lon, lat] of [[0, 0], [37, -12], [-155, 64], [180, -89]] as const) {
      expect(Math.hypot(...geoVector(lon, lat)), `${lon}, ${lat}`).toBeCloseTo(1, 12);
    }
  });

  it("agrees with the orthographic formulas at a spin and a tilt", () => {
    for (const spin of [0, 35, -120]) {
      for (const tilt of [0, 20, -55]) {
        const cs = Math.cos(spin * RAD);
        const ss = Math.sin(spin * RAD);
        const ct = Math.cos(tilt * RAD);
        const st = Math.sin(tilt * RAD);
        for (const [lon, lat] of [[0, 0], [12, 48], [-122, 37], [140, -34], [0, 90], [175, -89]] as const) {
          const [x, y, z] = geoVector(lon, lat);
          const [sx, sy, depth] = geoTurn(x, y, z, cs, ss, ct, st);
          // Snyder's spherical orthographic, for a centre latitude of the tilt and a central longitude of
          // minus the spin: x is cos(phi) sin(dl), y is cos(phi1) sin(phi) minus sin(phi1) cos(phi) cos(dl),
          // and the depth is cos(c), the cosine of the angle from the centre of the view.
          const dl = (lon + spin) * RAD;
          const where = `${lon}, ${lat} at spin ${spin} tilt ${tilt}`;
          expect(sx, where).toBeCloseTo(Math.cos(lat * RAD) * Math.sin(dl), 12);
          expect(sy, where).toBeCloseTo(ct * Math.sin(lat * RAD) - st * Math.cos(lat * RAD) * Math.cos(dl), 12);
          // The same depth, read a second way: the dot product with the vector the viewer looks along.
          const centre = geoVector(-spin, tilt);
          expect(depth, where).toBeCloseTo(x * centre[0] + y * centre[1] + z * centre[2], 12);
        }
      }
    }
  });

  it("hides the far side, and cuts a segment where it crosses the horizon", () => {
    const spin = 35;
    const tilt = 20;
    const cs = Math.cos(spin * RAD);
    const ss = Math.sin(spin * RAD);
    const ct = Math.cos(tilt * RAD);
    const st = Math.sin(tilt * RAD);
    const depthOf = (lon: number, lat: number): number => geoTurn(...geoVector(lon, lat), cs, ss, ct, st)[2];
    // The centre of the view faces the viewer, and its antipode is exactly behind the world.
    expect(depthOf(-spin, tilt)).toBeCloseTo(1, 12);
    expect(depthOf(180 - spin, -tilt)).toBeCloseTo(-1, 12);
    // A quarter turn away, along the equator or down the meridian, lands on the horizon itself.
    expect(depthOf(90 - spin, 0)).toBeCloseTo(0, 12);
    expect(depthOf(-spin, tilt - 90)).toBeCloseTo(0, 12);
    expect(depthOf(-spin, tilt + 40)).toBeGreaterThan(0);
    expect(depthOf(150 - spin, tilt)).toBeLessThan(0);

    expect(geoCut(1, -1, 0)).toBeCloseTo(0.5, 12);
    expect(geoCut(-1, 1, 0)).toBeCloseTo(0.5, 12);
    expect(geoCut(0.5, -0.5, 0.25)).toBeCloseTo(0.25, 12);
    // A perspective view from four radii away hides everything below a quarter.
    expect(geoCut(1, 0, 1 / 4)).toBeCloseTo(0.75, 12);
    // A segment that never crosses, and one with no length, still give a fraction a caller can use.
    expect(geoCut(0.8, 0.9, 0)).toBe(0);
    expect(geoCut(-1, -0.5, 0)).toBe(1);
    expect(geoCut(0.5, 0.5, 0)).toBe(0);
  });

  it("knows the seams a stroke must skip from the coastlines it must not", () => {
    expect(geoSeam(180, -70, 180, -85)).toBe(true);
    expect(geoSeam(180, -60, -180, -60)).toBe(true);
    expect(geoSeam(180, -90, -180, -90)).toBe(true);
    expect(geoSeam(-14.5, -90, 27.25, -90)).toBe(true);
    expect(geoSeam(179.75, -70, 179.5, -71)).toBe(false);
    expect(geoSeam(180, -70, 178, -71)).toBe(false);
    expect(geoSeam(12, -89, 13, -88)).toBe(false);
    expect(geoSeam(0, 0, 1, 1)).toBe(false);
  });

  it("draws a graticule that stops short of the poles", () => {
    const lines = geoGraticule(30);
    const constant = (line: Float32Array, offset: number): boolean =>
      line.every((value, i) => i % 2 !== offset || value === line[offset]);
    const meridians = lines.filter((line) => constant(line, 0));
    const parallels = lines.filter((line) => constant(line, 1));
    expect(meridians.length).toBe(12);
    expect(parallels.length).toBe(5);
    expect(meridians.map((line) => line[0])).toEqual([-180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150]);
    expect(parallels.map((line) => line[1])).toEqual([-60, -30, 0, 30, 60]);
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(8);
      for (let p = 0; p < line.length; p += 2) {
        expect(Math.abs(line[p] ?? 0)).toBeLessThanOrEqual(180);
        expect(Math.abs(line[p + 1] ?? 0), "a line touches a pole").toBeLessThan(90);
      }
    }
    // A parallel runs the whole way round, and the sampling is what keeps it curved once projected.
    expect(parallels[0]?.[0]).toBe(-180);
    expect(parallels[0]?.[(parallels[0]?.length ?? 2) - 2]).toBe(180);
    expect(geoGraticule(30, 2)[0]?.length).toBeGreaterThan(geoGraticule(30, 20)[0]?.length ?? 0);
  });
});

describe.skipIf(land === null)("the generated land, skipped until npm run geo writes lib/geo-land.ts", () => {
  const encoded = /GEO_LAND = "([A-Za-z0-9_-]*)"/.exec(land ?? "")?.[1] ?? "";
  const rings = geoDecode(encoded);
  const header = /Rings: (\d+)\. Points: (\d+)\. Encoded: (\d+) characters\./.exec(land ?? "");

  /** Whether a place is on land, by the even-odd rule over every ring, which is how the data is drawn. */
  const onLand = (lon: number, lat: number): boolean => {
    let inside = false;
    for (const ring of rings) {
      for (let p = 0, q = ring.length - 2; p < ring.length; q = p, p += 2) {
        const lat0 = ring[p + 1] ?? 0;
        const lat1 = ring[q + 1] ?? 0;
        if (lat0 > lat === lat1 > lat) continue;
        const lon0 = ring[p] ?? 0;
        const lon1 = ring[q] ?? 0;
        if (lon < lon0 + ((lat - lat0) / (lat1 - lat0)) * (lon1 - lon0)) inside = !inside;
      }
    }
    return inside;
  };

  it("says where it came from, and that nobody should edit it", () => {
    expect(land).toMatch(/Generated by npm run geo\. Never edited by hand\./);
    expect(land).toMatch(/Natural Earth 1:110m land/);
    expect(land).toMatch(/SHA-256: [0-9a-f]{64}/);
    expect(land).toMatch(/^export const GEO_LAND = "[A-Za-z0-9_-]+";$/m);
  });

  it("decodes to closed rings on the grid, in the counts its header states", () => {
    expect(rings.length).toBeGreaterThan(0);
    expect(Number(header?.[1])).toBe(rings.length);
    expect(Number(header?.[2])).toBe(rings.reduce((sum, ring) => sum + ring.length / 2, 0));
    expect(Number(header?.[3])).toBe(encoded.length);
    rings.forEach((ring, i) => {
      expect(ring.length, `ring ${i}`).toBeGreaterThanOrEqual(8);
      expect([ring[0], ring[1]], `ring ${i} closes`).toEqual([ring[ring.length - 2], ring[ring.length - 1]]);
      for (let p = 0; p < ring.length; p += 2) {
        expect(Math.abs(ring[p] ?? 0), `ring ${i} longitude`).toBeLessThanOrEqual(180);
        expect(Math.abs(ring[p + 1] ?? 0), `ring ${i} latitude`).toBeLessThanOrEqual(90);
        expect(Math.abs((ring[p] ?? 0) % GEO_STEP), `ring ${i} sits on the grid`).toBe(0);
        expect(Math.abs((ring[p + 1] ?? 0) % GEO_STEP), `ring ${i} sits on the grid`).toBe(0);
      }
    });
  });

  it("finds land where there is land and water where there is water", () => {
    const places: readonly (readonly [string, number, number, boolean])[] = [
      ["Paris", 2.35, 48.85, true],
      ["Tokyo", 139.69, 35.68, true],
      ["Madagascar", 47.5, -18.9, true],
      ["the Amazon", -60, -3.1, true],
      ["central Australia", 133, -25, true],
      ["the mid Atlantic", -40, 30, false],
      ["the mid Pacific", -140, 0, false],
      ["the southern Indian Ocean", 80, -45, false],
      ["the Ionian Sea", 18.5, 37.5, false],
    ];
    for (const [name, lon, lat, wanted] of places) expect(onLand(lon, lat), name).toBe(wanted);
  });

  it("fits inside the room a component has for it", () => {
    expect(gzipSync(Buffer.from(encoded)).length).toBeLessThanOrEqual(2600);
  });

  it.skipIf(!existsSync(SOURCE_FILE))("matches its source, which npm run geo -- --check proves", async () => {
    const { stdout } = await run(join(ROOT, "node_modules", ".bin", "tsx"), [join(ROOT, "scripts", "geo.ts"), "--check"], {
      cwd: ROOT,
    });
    expect(stdout).toMatch(/matches its source/);
  });
});
