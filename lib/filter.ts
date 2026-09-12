/** Two measurements over a field of values from 0 to 1, row-major: where its edges run, and what its
 *  neighbourhood averages. Both answer a question a component then draws something else from. Neither is a
 *  picture: a local mean is read, never shown, because STYLE.md rules blur out. */

/** The largest gradient magnitude the Sobel kernels can return for values in 0 to 1, at a diagonal step. */
const SOBEL_PEAK = Math.SQRT2 * 4;

/** Gradient magnitude at every pixel, through the two 3 by 3 Sobel kernels, divided by the largest magnitude
 *  those kernels can return. Values land in 0 to 1 on a scale that holds from frame to frame, so a threshold
 *  on an edge means the same thing in every frame. Samples outside the field repeat its edge pixel. */
export function sobelEdges(values: ArrayLike<number>, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  const at = (x: number, y: number): number =>
    values[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))] ?? 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tl = at(x - 1, y - 1);
      const tr = at(x + 1, y - 1);
      const bl = at(x - 1, y + 1);
      const br = at(x + 1, y + 1);
      const gx = tr + 2 * at(x + 1, y) + br - tl - 2 * at(x - 1, y) - bl;
      const gy = bl + 2 * at(x, y + 1) + br - tl - 2 * at(x, y - 1) - tr;
      out[y * width + x] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / SOBEL_PEAK);
    }
  }
  return out;
}

/** The mean of the square of side 2 * radius + 1 around every pixel, in the same time per pixel whatever the
 *  radius, through a summed area table (Crow 1984). A square near an edge is clipped to the field and
 *  divided by the pixels it actually covers. It feeds adaptive thresholds and shading decisions, where the
 *  question is how a pixel compares with its neighbourhood. */
export function boxMean(values: ArrayLike<number>, width: number, height: number, radius: number): Float32Array {
  const r = Math.max(0, Math.floor(radius));
  const stride = width + 1;
  // Doubles, so a wide field's running total keeps every value the float array would round away.
  const sums = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += values[y * width + x] ?? 0;
      sums[(y + 1) * stride + x + 1] = (sums[y * stride + x + 1] ?? 0) + row;
    }
  }
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(height, y + r + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(width, x + r + 1);
      const total = (sums[y1 * stride + x1] ?? 0) - (sums[y0 * stride + x1] ?? 0) - (sums[y1 * stride + x0] ?? 0) + (sums[y0 * stride + x0] ?? 0);
      out[y * width + x] = total / ((y1 - y0) * (x1 - x0));
    }
  }
  return out;
}
