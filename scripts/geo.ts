/** Builds lib/geo-land.ts from Natural Earth's 1:110m land theme, which is in the public domain: "All
 *  versions of Natural Earth raster + vector map data found on this website are in the public domain." and
 *  "No permission is needed to use Natural Earth. Crediting the authors is unnecessary."
 *
 *  npm run geo             reads sources/geo/ne_110m_land.shp and writes lib/geo-land.ts
 *  npm run geo -- --check  rebuilds in memory and fails when the committed file differs from its source
 *  npm run geo -- --tune   prints what each simplification threshold would cost, and writes nothing
 *
 *  The shapefile is read here rather than converted by a tool: Natural Earth publishes no GeoJSON, every
 *  conversion of it lives on a code host this repository may not read, and a polygon shapefile is a header
 *  and then records of little endian doubles. The .shp file alone is enough; the attributes are not used.
 *  Nothing here reaches the network. See .pica/expansion/citations-data-geo.md and docs/plans. */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { ROOT } from "./catalog";
import { GEO_DIGITS, GEO_STEP, geoSeam } from "../lib/geo";

/** The one file the pipeline reads. It is committed, so the data can always be rebuilt from its source. */
const SOURCE = join(ROOT, "sources", "geo", "ne_110m_land.shp");
const OUT = join(ROOT, "lib", "geo-land.ts");

/** The SHA-256 of the bytes the committed data was built from. The pipeline refuses to run on anything else,
 *  so lib/geo-land.ts can always be traced to one file. Empty means the file has not arrived yet: the first
 *  run prints the digest of whatever is at SOURCE and stops, and a maintainer pastes it in here. */
const SOURCE_SHA256: string = "8689e6932b8e370e2ca4587cf3ba21e460b1235db37b6ed3c172c35b4a6088de";

/** Where the source came from, for the generated header and the message when it is missing. */
const SOURCE_URL = "https://naciscdn.org/naturalearth/110m/physical/ne_110m_land.zip";

/** Islands smaller than this, in square kilometres, are dropped. At 1:110m they are a few points each and
 *  they cost more than they show. */
const MIN_ISLAND_KM2 = 10_000;

/** The smallest triangle a point may sit on and survive Visvalingam, in square degrees weighted by the
 *  cosine of its latitude. It sets how much of the coastline survives, and so how large the string is.
 *  This value comes from a sweep over coastlines of the same vertex density as the source, because the
 *  source itself was not in hand when the pipeline was written. Run npm run geo -- --tune once against the
 *  pinned file and keep whichever threshold lands inside the target band. */
const SIMPLIFY_AREA = 0.5;

/** The most the encoded string may weigh, gzipped. The component budget is 8192 bytes for the whole
 *  component, so the data has to leave room for the code that draws it. AGENTS.md and scripts/config.ts. */
const MAX_GZIP = 2600;

/** Thresholds --tune measures, and the band a good one lands in. */
const TUNE_STEPS = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 1] as const;
const TARGET_LOW = 1800;
const TARGET_HIGH = 2400;

const EARTH_RADIUS_KM = 6371.0088;
const RAD = Math.PI / 180;

/** A ring as flat longitude and latitude pairs, in degrees. */
export type Ring = number[];

/** Every ring in a polygon shapefile. The file is a 100 byte header, then records of an 8 byte big endian
 *  header and a little endian body: the shape type, a bounding box, the part count, the point count, the
 *  index each part starts at, and then the points. Outer rings and holes come back together, in file order,
 *  because both are filled with the even-odd rule. ESRI Shapefile Technical Description, July 1998. */
export function readShapefileRings(bytes: Buffer): Ring[] {
  if (bytes.length < 100) throw new Error("this file is shorter than a shapefile's 100 byte header");
  if (bytes.readInt32BE(0) !== 9994) throw new Error("this is not a shapefile: its file code is not 9994");
  const type = bytes.readInt32LE(32);
  if (type !== 5) throw new Error(`this shapefile holds shape type ${type}, and the land theme is polygons, type 5`);
  const end = Math.min(bytes.length, bytes.readInt32BE(24) * 2);
  const rings: Ring[] = [];
  let at = 100;
  while (at + 8 <= end) {
    const content = at + 8;
    at = content + bytes.readInt32BE(at + 4) * 2;
    if (at > end || content + 44 > end) break;
    // A null shape carries type 0 and no geometry.
    if (bytes.readInt32LE(content) !== 5) continue;
    const parts = bytes.readInt32LE(content + 36);
    const points = bytes.readInt32LE(content + 40);
    const index = content + 44;
    const coords = index + parts * 4;
    if (coords + points * 16 > end) break;
    for (let part = 0; part < parts; part++) {
      const start = bytes.readInt32LE(index + part * 4);
      const stop = part + 1 < parts ? bytes.readInt32LE(index + (part + 1) * 4) : points;
      const ring: Ring = [];
      for (let p = start; p < stop; p++) {
        ring.push(bytes.readDoubleLE(coords + p * 16), bytes.readDoubleLE(coords + p * 16 + 8));
      }
      // Three points and the repeat that closes them is the smallest ring with an inside.
      if (ring.length >= 8) rings.push(ring);
    }
  }
  return rings;
}

/** The area a ring encloses on the sphere, in square kilometres. Each edge contributes the wedge under it,
 *  which is Chamberlain and Duquette's formula for a polygon on a sphere. The sign says which way the ring
 *  winds, and only the size is wanted here. */
export function ringAreaKm2(ring: readonly number[]): number {
  const n = Math.floor(ring.length / 2);
  let total = 0;
  for (let p = 0; p < n; p++) {
    const q = (p + 1) % n;
    let step = ((ring[q * 2] ?? 0) - (ring[p * 2] ?? 0)) * RAD;
    if (step > Math.PI) step -= 2 * Math.PI;
    else if (step < -Math.PI) step += 2 * Math.PI;
    total += step * (2 + Math.sin((ring[p * 2 + 1] ?? 0) * RAD) + Math.sin((ring[q * 2 + 1] ?? 0) * RAD));
  }
  return (Math.abs(total) * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2;
}

/** Visvalingam and Whyatt: drop the point whose triangle with its neighbours is smallest, again and again,
 *  until the smallest one left reaches the threshold. A triangle is measured in square degrees and then
 *  weighted by the cosine of its middle point's latitude, so a degree of longitude counts for what it is
 *  worth that far north. The first and last points always stay, which keeps a closed ring closed, and so
 *  does a point on a seam, because the fill is built out of those corners. */
export function simplifyLine(ring: readonly number[], threshold: number): Ring {
  const n = Math.floor(ring.length / 2);
  const out = ring.slice(0, n * 2);
  if (n < 3) return out;
  const prev = Array.from({ length: n }, (_, i) => i - 1);
  const next = Array.from({ length: n }, (_, i) => i + 1);
  const alive = new Array<boolean>(n).fill(true);
  const areas = new Float64Array(n);
  const at = (i: number): [number, number] => [out[i * 2] ?? 0, out[i * 2 + 1] ?? 0];
  /** The effective area of one point, or infinity for a point that may never be dropped. */
  const effective = (i: number): number => {
    if (i <= 0 || i >= n - 1) return Number.POSITIVE_INFINITY;
    const [lon, lat] = at(i);
    if (geoSeam(lon, lat, lon, lat)) return Number.POSITIVE_INFINITY;
    const [lon0, lat0] = at(prev[i] ?? 0);
    const [lon1, lat1] = at(next[i] ?? 0);
    const cross = (lon - lon0) * (lat1 - lat0) - (lon1 - lon0) * (lat - lat0);
    return (Math.abs(cross) / 2) * Math.cos(lat * RAD);
  };
  for (let i = 0; i < n; i++) areas[i] = effective(i);
  for (;;) {
    let worst = -1;
    let least = Number.POSITIVE_INFINITY;
    for (let i = 1; i < n - 1; i++) {
      if (alive[i] && (areas[i] ?? 0) < least) {
        least = areas[i] ?? 0;
        worst = i;
      }
    }
    if (worst < 0 || least >= threshold) break;
    alive[worst] = false;
    const before = prev[worst] ?? 0;
    const after = next[worst] ?? 0;
    next[before] = after;
    prev[after] = before;
    areas[before] = effective(before);
    areas[after] = effective(after);
  }
  const kept: Ring = [];
  for (let i = 0; i < n; i++) if (alive[i]) kept.push(...at(i));
  return kept;
}

/** Rounds a ring onto the quarter degree grid, drops each point that lands on the one before it, closes the
 *  ring again, and returns null when fewer than four points are left, counting the repeat that closes it. */
export function snapRing(ring: readonly number[]): Ring | null {
  const out: Ring = [];
  for (let p = 0; p + 1 < ring.length; p += 2) {
    const lon = Math.round((ring[p] ?? 0) / GEO_STEP) * GEO_STEP;
    const lat = Math.round((ring[p + 1] ?? 0) / GEO_STEP) * GEO_STEP;
    if (out.length >= 2 && out[out.length - 2] === lon && out[out.length - 1] === lat) continue;
    out.push(lon, lat);
  }
  if (out.length >= 4 && (out[0] !== out[out.length - 2] || out[1] !== out[out.length - 1])) {
    out.push(out[0] ?? 0, out[1] ?? 0);
  }
  return out.length >= 8 ? out : null;
}

/** The rings as one string: a count, an absolute first point, and then deltas, every number a zigzag varint
 *  in the URL safe alphabet lib/geo.ts decodes. Coordinates are read on the quarter degree grid, so a ring
 *  that has not been through snapRing is rounded onto it here. */
export function encodeRings(rings: readonly (readonly number[])[]): string {
  const out: string[] = [];
  /** One zigzag varint: five bits per character, the sixth bit saying another character follows. */
  const push = (value: number): void => {
    let bits = value < 0 ? -value * 2 - 1 : value * 2;
    for (;;) {
      const digit = bits % 32;
      bits = (bits - digit) / 32;
      out.push(GEO_DIGITS.charAt(digit + (bits > 0 ? 32 : 0)));
      if (bits === 0) return;
    }
  };
  for (const ring of rings) {
    const count = Math.floor(ring.length / 2);
    if (count < 2) continue;
    push(count);
    let lon = 0;
    let lat = 0;
    for (let p = 0; p < count; p++) {
      const gx = Math.round((ring[p * 2] ?? 0) / GEO_STEP);
      const gy = Math.round((ring[p * 2 + 1] ?? 0) / GEO_STEP);
      push(gx - lon);
      push(gy - lat);
      lon = gx;
      lat = gy;
    }
  }
  return out.join("");
}

interface Land {
  /** Rings kept, and rings the island filter dropped. */
  rings: number;
  dropped: number;
  points: number;
  encoded: string;
  gzipBytes: number;
}

/** The whole reduction: drop the small islands, simplify, quantize, and encode. */
export function reduceLand(raw: readonly Ring[], threshold: number): Land {
  const kept: Ring[] = [];
  let dropped = 0;
  for (const ring of raw) {
    if (ringAreaKm2(ring) < MIN_ISLAND_KM2) {
      dropped++;
      continue;
    }
    const snapped = snapRing(simplifyLine(ring, threshold));
    if (snapped) kept.push(snapped);
    else dropped++;
  }
  const encoded = encodeRings(kept);
  return {
    rings: kept.length,
    dropped,
    points: kept.reduce((sum, ring) => sum + ring.length / 2, 0),
    encoded,
    gzipBytes: gzipSync(Buffer.from(encoded)).length,
  };
}

/** The generated module, header and all. Its numbers are counts rather than measurements, so the file reads
 *  the same wherever it is built and --check can compare it byte for byte. */
export function landModule(digest: string, threshold: number, land: Land): string {
  return `${[
    "/** The world's coastlines, reduced to fit inside a component's byte budget.",
    " *  Generated by npm run geo. Never edited by hand.",
    " *  Source: Natural Earth 1:110m land, version 4.1.0, public domain, from sources/geo/ne_110m_land.shp",
    ` *  and originally ${SOURCE_URL}`,
    ` *  SHA-256: ${digest}`,
    ` *  Parameters: islands under ${MIN_ISLAND_KM2} square kilometres dropped, simplified by Visvalingam and`,
    ` *  Whyatt to ${threshold} square degrees weighted by the cosine of latitude, then quantized to`,
    ` *  ${GEO_STEP} degrees.`,
    ` *  Rings: ${land.rings}. Points: ${land.points}. Encoded: ${land.encoded.length} characters.`,
    " *  Decode it with geoDecode from lib/geo.ts. */",
    `export const GEO_LAND = "${land.encoded}";`,
  ].join("\n")}\n`;
}

/** What to do when the source is not there. The download needs a person, because a script here never fetches. */
function missingSource(): string {
  return [
    "Missing sources/geo/ne_110m_land.shp, so there is nothing to build lib/geo-land.ts from.",
    "Natural Earth's 1:110m land theme is in the public domain, and this pipeline reads the .shp file alone.",
    `  1. Download ${SOURCE_URL} (69,700 bytes).`,
    "  2. Unzip it and put ne_110m_land.shp at",
    `     ${SOURCE}`,
    "  3. Run npm run geo again. It prints the file's SHA-256, which is pinned in scripts/geo.ts.",
  ].join("\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const bytes = await readFile(SOURCE).catch(() => null);
  if (!bytes) {
    console.error(missingSource());
    process.exitCode = 1;
    return;
  }
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (SOURCE_SHA256 === "") {
    console.error(
      [
        "sources/geo/ne_110m_land.shp is not pinned yet, so the data it would produce could not be traced back.",
        "Its SHA-256 is:",
        `  ${digest}`,
        "Paste that into SOURCE_SHA256 in scripts/geo.ts. Then run npm run geo -- --tune, keep the threshold",
        "that lands inside the target band as SIMPLIFY_AREA, and run npm run geo to write lib/geo-land.ts.",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }
  if (digest !== SOURCE_SHA256) {
    console.error(
      [
        "sources/geo/ne_110m_land.shp is not the file this pipeline is pinned to, so it refuses to run.",
        `  expected ${SOURCE_SHA256}`,
        `  found    ${digest}`,
        `Restore the pinned file from ${SOURCE_URL}, or change SOURCE_SHA256 in scripts/geo.ts on purpose.`,
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  const raw = readShapefileRings(bytes);
  if (args.includes("--tune")) {
    console.log(`${raw.length} rings in the source. Threshold, rings, points, characters, gzipped bytes:`);
    for (const threshold of TUNE_STEPS) {
      const land = reduceLand(raw, threshold);
      const inside = land.gzipBytes >= TARGET_LOW && land.gzipBytes <= TARGET_HIGH ? "  in the target band" : "";
      console.log(
        `  ${threshold.toFixed(2)}  ${land.rings}  ${land.points}  ${land.encoded.length}  ${land.gzipBytes}${inside}`,
      );
    }
    console.log(`The target band is ${TARGET_LOW} to ${TARGET_HIGH} bytes gzipped, and the ceiling is ${MAX_GZIP}.`);
    console.log("Set SIMPLIFY_AREA in scripts/geo.ts to the threshold you keep, then run npm run geo.");
    return;
  }

  const land = reduceLand(raw, SIMPLIFY_AREA);
  if (land.gzipBytes > MAX_GZIP) {
    console.error(
      [
        `The reduced land is ${land.gzipBytes} bytes gzipped, over the ${MAX_GZIP} byte ceiling.`,
        "Run npm run geo -- --tune and raise SIMPLIFY_AREA to a threshold inside the band. Nothing was written.",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }
  const text = landModule(digest, SIMPLIFY_AREA, land);
  const summary = `${land.rings} rings, ${land.points} points, ${land.encoded.length} characters, ${land.gzipBytes} bytes gzipped`;

  if (args.includes("--check")) {
    const committed = await readFile(OUT, "utf8").catch(() => null);
    if (committed === null) {
      console.error("lib/geo-land.ts is missing. Run npm run geo to write it from sources/geo/ne_110m_land.shp.");
      process.exitCode = 1;
      return;
    }
    if (committed !== text) {
      const lines = committed.split("\n");
      const rebuilt = text.split("\n");
      const differs = rebuilt.findIndex((line, i) => line !== lines[i]);
      const first = differs >= 0 ? differs + 1 : Math.min(rebuilt.length, lines.length) + 1;
      console.error(
        [
          "lib/geo-land.ts does not match what its source and the parameters in scripts/geo.ts produce.",
          `  rebuilt ${summary}`,
          `  the two files first differ at line ${first}`,
          "Run npm run geo and commit the result.",
        ].join("\n"),
      );
      process.exitCode = 1;
      return;
    }
    console.log(`lib/geo-land.ts matches its source: ${summary}.`);
    return;
  }

  await writeFile(OUT, text);
  console.log(`Wrote lib/geo-land.ts: ${summary}. ${land.dropped} rings dropped as too small.`);
}

// Importable for the tests, and a pipeline when it is the thing being run. A failure prints its reason and
// nothing else, because a stack trace here would say less than the message does.
const invoked = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
