/** The world, for the components that draw it: the globe, the world map, and the orbit view. The coastlines
 *  themselves live in lib/geo-land.ts, which scripts/geo.ts generates from Natural Earth's public domain
 *  1:110m land theme, and a component decodes that string here. Nothing in this module reads the generated
 *  file, so the module compiles and its projections work before the data lands.
 *  Every name starts with geo or GEO_, because the single React file puts every lib module in one scope.
 *  Equal Earth follows the 2019 paper by Savric, Patterson and Jenny. The turn onto the screen and its
 *  horizon are Snyder's orthographic projection, Map Projections: A Working Manual, pages 145 to 153. */

/** Degrees between two coordinates the encoding can tell apart. Every coordinate geoDecode returns is a
 *  multiple of it, so a component can snap its own points onto the same grid. */
export const GEO_STEP = 0.25;

/** The alphabet the rings are written in: one URL safe character per five bits, the sixth bit saying that
 *  another character follows. scripts/geo.ts writes it and geoDecode reads it. */
export const GEO_DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Radians per degree. */
const GEO_RAD = Math.PI / 180;

/** How far from 180 degrees east or 90 degrees south a coordinate may sit and still count as on a seam. The
 *  data lands exactly on those lines, so this only absorbs arithmetic. */
const GEO_SEAM_SLACK = 0.05;

/** How far a graticule's meridian runs from the equator, in degrees. Short of the pole, where they all meet. */
const GEO_GRATICULE_LIMIT = 80;

/** Equal Earth's four coefficients, from the 2019 paper. */
const GEO_EE_A1 = 1.340264;
const GEO_EE_A2 = -0.081106;
const GEO_EE_A3 = 0.000893;
const GEO_EE_A4 = 0.003796;

/** The rings of an encoded land string, as flat longitude and latitude pairs in degrees. Each ring closes on
 *  its first point, and the set is drawn with the even-odd rule, so a ring inside another is a hole. */
export function geoDecode(encoded: string): Float32Array[] {
  const rings: Float32Array[] = [];
  let at = 0;
  /** The next zigzag varint. Returns 0 once the string runs out, so a truncated string cannot throw. */
  function pull(): number {
    let bits = 0;
    let place = 1;
    while (at < encoded.length) {
      const digit = GEO_DIGITS.indexOf(encoded.charAt(at++));
      if (digit < 0) return 0;
      bits += (digit % 32) * place;
      if (digit < 32) return bits % 2 === 0 ? bits / 2 : -(bits + 1) / 2;
      place *= 32;
    }
    return 0;
  }
  while (at < encoded.length) {
    const count = pull();
    if (count < 2) break;
    const ring = new Float32Array(count * 2);
    let lon = 0;
    let lat = 0;
    for (let p = 0; p < count; p++) {
      lon += pull();
      lat += pull();
      ring[p * 2] = lon * GEO_STEP;
      ring[p * 2 + 1] = lat * GEO_STEP;
    }
    rings.push(ring);
  }
  return rings;
}

/** The unit vector for a longitude and latitude in degrees: y through the north pole, z toward a viewer
 *  looking at longitude 0, x east of them. */
export function geoVector(lon: number, lat: number): [number, number, number] {
  const phi = lat * GEO_RAD;
  const lambda = lon * GEO_RAD;
  const ring = Math.cos(phi);
  return [ring * Math.sin(lambda), Math.sin(phi), ring * Math.cos(lambda)];
}

/** Spins a unit vector around the pole, then tilts the world around the horizontal axis. Returns the screen
 *  x, the screen y with north up, and the depth, which is the cosine of the point's angle to the viewer.
 *  Those are Snyder's orthographic x, y, and cos c, for a centre latitude of the tilt and a central longitude
 *  of minus the spin, so a point is on the near side while its depth is above the horizon. */
export function geoTurn(
  x: number,
  y: number,
  z: number,
  cosSpin: number,
  sinSpin: number,
  cosTilt: number,
  sinTilt: number,
): [number, number, number] {
  const east = x * cosSpin + z * sinSpin;
  const front = z * cosSpin - x * sinSpin;
  return [east, y * cosTilt - front * sinTilt, y * sinTilt + front * cosTilt];
}

/** Where a segment between two depths crosses the horizon, as a fraction from the first point to the second.
 *  `limit` is the depth the horizon sits at: 0 for an orthographic view, and 1 / P for a perspective one seen
 *  from P radii away. A segment that never crosses gives whichever end its crossing lies past, so a caller
 *  that clips with the fraction cannot draw a line through the far side of the world. */
export function geoCut(depth0: number, depth1: number, limit: number): number {
  const span = depth1 - depth0;
  return span === 0 ? 0 : Math.min(1, Math.max(0, (limit - depth0) / span));
}

/** Whether an edge is one of the artificial ones a ring is cut along rather than a coastline: the meridian at
 *  180 degrees, where a ring that wraps the world is split, and the parallel at 90 degrees south, where
 *  Antarctica is closed across the pole. A fill needs those edges and a stroke must skip them. */
export function geoSeam(lon0: number, lat0: number, lon1: number, lat1: number): boolean {
  const meridian = 180 - GEO_SEAM_SLACK;
  const pole = GEO_SEAM_SLACK - 90;
  return (Math.abs(lon0) >= meridian && Math.abs(lon1) >= meridian) || (lat0 <= pole && lat1 <= pole);
}

/** The Equal Earth projection of a longitude and latitude in degrees, about the prime meridian, in projection
 *  units with y increasing north. Fit it to a box with GEO_EQUAL_EARTH_BOX. */
export function geoEqualEarth(lon: number, lat: number): [number, number] {
  const theta = Math.asin((Math.sqrt(3) / 2) * Math.sin(lat * GEO_RAD));
  const t2 = theta * theta;
  const t3 = t2 * theta;
  const t6 = t3 * t3;
  const slope = 9 * GEO_EE_A4 * t6 * t2 + 7 * GEO_EE_A3 * t6 + 3 * GEO_EE_A2 * t2 + GEO_EE_A1;
  const x = (2 * Math.sqrt(3) * lon * GEO_RAD * Math.cos(theta)) / (3 * slope);
  const y = GEO_EE_A4 * t6 * t3 + GEO_EE_A3 * t6 * theta + GEO_EE_A2 * t3 + GEO_EE_A1 * theta;
  return [x, y];
}

/** Half the projection's width and height, measured from the formula rather than written down twice. */
const GEO_EE_EDGE = [geoEqualEarth(180, 0)[0], geoEqualEarth(0, 90)[1]] as const;

/** Everything Equal Earth draws, in the units geoEqualEarth returns, with y increasing north. A point lands
 *  in a rectangle at ((x - box.x) / box.width, 1 - (y - box.y) / box.height), which is the whole map fitted
 *  with the top left at 0, 0. Its aspect, width over height, is a little over two to one. */
export const GEO_EQUAL_EARTH_BOX = {
  x: -GEO_EE_EDGE[0],
  y: -GEO_EE_EDGE[1],
  width: 2 * GEO_EE_EDGE[0],
  height: 2 * GEO_EE_EDGE[1],
};

/** The meridians and then the parallels of a graticule, `step` degrees apart, as flat longitude and latitude
 *  pairs. A meridian runs to 80 degrees north and south rather than to the poles, where every meridian would
 *  meet, and a parallel runs the whole way round. `sample` is the spacing of the points along a line, which
 *  is what keeps a line curved once it is projected. */
export function geoGraticule(step: number, sample = 5): Float32Array[] {
  const gap = Math.min(180, Math.max(1, step));
  const fine = Math.min(gap, Math.max(0.5, sample));
  const out: Float32Array[] = [];
  const down = Math.max(1, Math.round((2 * GEO_GRATICULE_LIMIT) / fine));
  for (let m = 0; m < Math.ceil(360 / gap - 1e-9); m++) {
    const line = new Float32Array((down + 1) * 2);
    for (let i = 0; i <= down; i++) {
      line[i * 2] = -180 + m * gap;
      line[i * 2 + 1] = -GEO_GRATICULE_LIMIT + (2 * GEO_GRATICULE_LIMIT * i) / down;
    }
    out.push(line);
  }
  const across = Math.max(1, Math.round(360 / fine));
  const rows = Math.floor(GEO_GRATICULE_LIMIT / gap + 1e-9);
  for (let r = -rows; r <= rows; r++) {
    const line = new Float32Array((across + 1) * 2);
    for (let i = 0; i <= across; i++) {
      line[i * 2] = -180 + (360 * i) / across;
      line[i * 2 + 1] = r * gap;
    }
    out.push(line);
  }
  return out;
}

/** A land mask, one byte per cell and 1 where land covers it, `width` cells across and `height` down. The
 *  rings are filled once with the even-odd rule, so an inner ring is a hole, and the pixels are read back
 *  once. `project` maps a longitude and latitude to the picture, x from 0 at the left to 1 at the right and y
 *  from 0 at the top to 1 at the bottom. The default is equirectangular. */
export function geoRaster(
  rings: readonly Float32Array[],
  width: number,
  height: number,
  project?: (lon: number, lat: number) => [number, number],
): Uint8Array {
  const cols = Math.max(0, Math.floor(width));
  const rows = Math.max(0, Math.floor(height));
  const mask = new Uint8Array(cols * rows);
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = cols > 0 && rows > 0 ? canvas.getContext("2d", { willReadFrequently: true }) : null;
  if (!ctx) return mask;
  // The default fill is opaque black, so coverage reads straight off the alpha channel.
  ctx.beginPath();
  for (const ring of rings) {
    for (let p = 0; p + 1 < ring.length; p += 2) {
      const lon = ring[p] ?? 0;
      const lat = ring[p + 1] ?? 0;
      const [ux, uy] = project ? project(lon, lat) : [(lon + 180) / 360, (90 - lat) / 180];
      if (p === 0) ctx.moveTo(ux * cols, uy * rows);
      else ctx.lineTo(ux * cols, uy * rows);
    }
    ctx.closePath();
  }
  ctx.fill("evenodd");
  const pixels = ctx.getImageData(0, 0, cols, rows).data;
  for (let i = 0; i < mask.length; i++) mask[i] = (pixels[i * 4 + 3] ?? 0) > 127 ? 1 : 0;
  return mask;
}
