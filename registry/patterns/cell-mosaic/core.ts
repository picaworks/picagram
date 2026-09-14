import { layer } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount } from "../../../lib/types";

export interface CellMosaicProps {
  /** Number of polygonal cells in the mosaic. */
  cells: number;
  /** Inset from each cell wall toward its centroid, in pixels. */
  gap: number;
  /** Opacity of the cell hairlines. */
  strength: number;
  /** Integer seed used to place every cell point. */
  seed: number;
}

export const defaults: CellMosaicProps = {
  cells: 48,
  gap: 0,
  strength: 0.4,
  seed: 1,
};

type CellPoint = readonly [number, number];

const CELL_SVG_NS = "http://www.w3.org/2000/svg";

function cellSeeds(width: number, height: number, count: number, seed: number): CellPoint[] {
  const rows = Math.max(1, Math.round(Math.sqrt((count * height) / width)));
  const shortRow = Math.floor(count / rows);
  const longRows = count % rows;
  const points: CellPoint[] = [];
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    const columns = shortRow + (row < longRows ? 1 : 0);
    for (let column = 0; column < columns; column += 1) {
      const random = createRng(hashSeed(seed, index));
      const x = ((column + 0.18 + random() * 0.64) / columns) * width;
      const y = ((row + 0.18 + random() * 0.64) / rows) * height;
      points.push([x, y]);
      index += 1;
    }
  }
  return points;
}

function clipCell(polygon: CellPoint[], point: CellPoint, other: CellPoint): CellPoint[] {
  if (polygon.length === 0) return polygon;
  const nx = other[0] - point[0];
  const ny = other[1] - point[1];
  const limit = (other[0] ** 2 + other[1] ** 2 - point[0] ** 2 - point[1] ** 2) / 2;
  const result: CellPoint[] = [];
  let previous = polygon[polygon.length - 1]!;
  let previousValue = previous[0] * nx + previous[1] * ny - limit;
  for (const current of polygon) {
    const currentValue = current[0] * nx + current[1] * ny - limit;
    if ((currentValue <= 0) !== (previousValue <= 0)) {
      const amount = previousValue / (previousValue - currentValue);
      result.push([
        previous[0] + (current[0] - previous[0]) * amount,
        previous[1] + (current[1] - previous[1]) * amount,
      ]);
    }
    if (currentValue <= 0) result.push(current);
    previous = current;
    previousValue = currentValue;
  }
  return result;
}

function cellCentroid(polygon: CellPoint[]): CellPoint {
  let area = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const point = polygon[index]!;
    const next = polygon[(index + 1) % polygon.length]!;
    const cross = point[0] * next[1] - next[0] * point[1];
    area += cross;
    x += (point[0] + next[0]) * cross;
    y += (point[1] + next[1]) * cross;
  }
  return Math.abs(area) > 0.001 ? [x / (3 * area), y / (3 * area)] : polygon[0]!;
}

function insetCell(polygon: CellPoint[], gap: number): CellPoint[] {
  if (gap === 0) return polygon;
  const center = cellCentroid(polygon);
  return polygon.map((point) => {
    const dx = center[0] - point[0];
    const dy = center[1] - point[1];
    const distance = Math.hypot(dx, dy);
    const amount = distance === 0 ? 0 : Math.min(gap / distance, 0.45);
    return [point[0] + dx * amount, point[1] + dy * amount];
  });
}

export const mount: Mount<CellMosaicProps> = (host, initial = {}) => {
  let props: CellMosaicProps = { ...defaults, ...initial };
  const under = layer(host, "under");
  const svg = document.createElementNS(CELL_SVG_NS, "svg");
  svg.setAttribute("data-pica", "");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = `display:block;width:100%;height:100%;fill:none;stroke:${cssVar("fg")};stroke-width:1;stroke-linejoin:miter;stroke-linecap:square`;
  under.el.append(svg);

  function draw(): void {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const count = Math.min(160, Math.max(8, Math.round(props.cells)));
    const gap = Math.min(6, Math.max(0, props.gap));
    const points = cellSeeds(width, height, count, Math.trunc(props.seed));
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index]!;
      let polygon: CellPoint[] = [
        [0, 0],
        [width, 0],
        [width, height],
        [0, height],
      ];
      for (let other = 0; other < points.length; other += 1) {
        if (other !== index) polygon = clipCell(polygon, point, points[other]!);
      }
      const shape = document.createElementNS(CELL_SVG_NS, "polygon");
      shape.setAttribute("data-pica", "");
      shape.setAttribute("points", insetCell(polygon, gap).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "));
      fragment.append(shape);
    }
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.style.opacity = String(Math.min(1, Math.max(0, props.strength)));
    svg.replaceChildren(fragment);
    host.dataset.picaReady = "true";
  }

  draw();
  const resize = new ResizeObserver(draw);
  resize.observe(host);

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.strength !== before.strength) {
        svg.style.opacity = String(Math.min(1, Math.max(0, props.strength)));
      }
      if (props.cells !== before.cells || props.gap !== before.gap || props.seed !== before.seed) draw();
    },
    destroy() {
      resize.disconnect();
      svg.remove();
      under.remove();
      delete host.dataset.picaReady;
    },
  };
};
