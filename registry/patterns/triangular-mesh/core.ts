import { layer } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount } from "../../../lib/types";

export interface TriangularMeshProps {
  /** Distance between lattice nodes before they are displaced, in pixels. */
  cell: number;
  /** How far each node moves from its lattice position, as a fraction of the cell. */
  jitter: number;
  /** Draws a small dot at every node. */
  nodes: boolean;
  /** Percent of nodes drawn as larger accent dots. */
  marks: number;
  /** Opacity of the edges from invisible to full ink. */
  strength: number;
  /** Integer seed used to displace every node and to choose the marked ones. */
  seed: number;
}

export const defaults: TriangularMeshProps = {
  cell: 48,
  jitter: 0.35,
  nodes: true,
  marks: 1,
  strength: 0.3,
  seed: 1,
};

const MESH_SVG_NS = "http://www.w3.org/2000/svg";
const MESH_NODE_RADIUS = 1.5;
const MESH_MARK_RADIUS = 3;
const MESH_MARK_OPACITY = 0.9;
const MESH_MARK_INSET = 2;

type MeshPoint = readonly [number, number];

export const mount: Mount<TriangularMeshProps> = (host, initial = {}) => {
  let props: TriangularMeshProps = { ...defaults, ...initial };
  let width = -1;
  let height = -1;
  const field = layer(host, "under");
  const svg = document.createElementNS(MESH_SVG_NS, "svg");
  const edges = meshPath(svg);
  const dots = meshPath(svg);
  const marks = meshPath(svg);
  svg.setAttribute("data-pica", "");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "display:block;overflow:hidden";
  edges.setAttribute("fill", "none");
  edges.setAttribute("stroke-width", "1");
  edges.setAttribute("stroke-linejoin", "miter");
  field.el.append(svg);

  function paint(): void {
    const strength = meshClamp(props.strength, 0, 1);
    edges.setAttribute("stroke", cssVar("fg"));
    edges.setAttribute("opacity", String(strength));
    dots.setAttribute("fill", cssVar("fg"));
    dots.setAttribute("opacity", String(Math.min(1, strength + 0.3)));
    marks.setAttribute("fill", cssVar("accent"));
    marks.setAttribute("opacity", String(MESH_MARK_OPACITY));
  }

  function rebuild(force = false): void {
    const nextWidth = host.clientWidth;
    const nextHeight = host.clientHeight;
    if (!force && nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const mesh = meshPaths(width, height, props);
    edges.setAttribute("d", mesh.edges);
    dots.setAttribute("d", mesh.dots);
    marks.setAttribute("d", mesh.marks);
    host.dataset.picaReady = "true";
  }

  paint();
  rebuild(true);
  const observer = new ResizeObserver(() => rebuild());
  observer.observe(host);

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.strength !== before.strength) paint();
      if (
        props.cell !== before.cell ||
        props.jitter !== before.jitter ||
        props.nodes !== before.nodes ||
        props.marks !== before.marks ||
        props.seed !== before.seed
      ) {
        rebuild(true);
      }
    },
    destroy() {
      observer.disconnect();
      field.remove();
      delete host.dataset.picaReady;
    },
  };
};

function meshPath(svg: SVGSVGElement): SVGPathElement {
  const path = document.createElementNS(MESH_SVG_NS, "path");
  path.setAttribute("data-pica", "");
  svg.append(path);
  return path;
}

/** The node at lattice column and row: its position depends only on those two indices and the seed. */
function meshNode(props: TriangularMeshProps, cell: number, column: number, row: number): MeshPoint {
  const reach = (meshClamp(props.jitter, 0.1, 0.6) * cell) / 2;
  const next = createRng(hashSeed(props.seed, column, row));
  return [column * cell + (next() * 2 - 1) * reach, row * cell + (next() * 2 - 1) * reach];
}

/** Twice the signed area of a triangle. Positive means the same winding as a clockwise screen quad. */
function meshWinding(a: MeshPoint, b: MeshPoint, c: MeshPoint): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function meshLength(a: MeshPoint, b: MeshPoint): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function meshPaths(width: number, height: number, props: TriangularMeshProps): { edges: string; dots: string; marks: string } {
  const cell = meshClamp(props.cell, 24, 96);
  const percent = meshClamp(props.marks, 0, 12) / 100;
  const columns = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const stride = columns + 3;
  const points: MeshPoint[] = [];
  for (let row = -1; row <= rows + 1; row += 1) {
    for (let column = -1; column <= columns + 1; column += 1) points.push(meshNode(props, cell, column, row));
  }
  const at = (column: number, row: number): MeshPoint => points[(row + 1) * stride + column + 1] ?? [0, 0];
  const edges: string[] = [];
  const dots: string[] = [];
  const marks: string[] = [];
  const line = (a: MeshPoint, b: MeshPoint): void => {
    edges.push(`M${meshRound(a[0])} ${meshRound(a[1])}L${meshRound(b[0])} ${meshRound(b[1])}`);
  };
  for (let row = -1; row <= rows; row += 1) {
    for (let column = -1; column <= columns; column += 1) {
      const topLeft = at(column, row);
      const topRight = at(column + 1, row);
      const bottomLeft = at(column, row + 1);
      const bottomRight = at(column + 1, row + 1);
      line(topLeft, topRight);
      line(topLeft, bottomLeft);
      const main = meshWinding(topLeft, topRight, bottomRight) > 0 && meshWinding(topLeft, bottomRight, bottomLeft) > 0;
      const other = meshWinding(topLeft, topRight, bottomLeft) > 0 && meshWinding(topRight, bottomRight, bottomLeft) > 0;
      if (main && (!other || meshLength(topLeft, bottomRight) <= meshLength(topRight, bottomLeft))) line(topLeft, bottomRight);
      else if (other) line(topRight, bottomLeft);
      else line(topLeft, bottomRight);
    }
  }
  for (let row = -1; row <= rows + 1; row += 1) {
    for (let column = -1; column <= columns + 1; column += 1) {
      const [x, y] = at(column, row);
      const marked = createRng(hashSeed(hashSeed(props.seed, column, row), 1))() < percent;
      const radius = marked ? MESH_MARK_RADIUS : MESH_NODE_RADIUS;
      const inset = marked ? radius + MESH_MARK_INSET : radius;
      if (x < inset || y < inset || x > width - inset || y > height - inset) continue;
      if (marked) marks.push(meshDot(x, y, radius));
      else if (props.nodes) dots.push(meshDot(x, y, radius));
    }
  }
  return { edges: edges.join(""), dots: dots.join(""), marks: marks.join("") };
}

function meshDot(x: number, y: number, radius: number): string {
  return `M${meshRound(x - radius)} ${meshRound(y)}a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 ${-radius * 2} 0`;
}

function meshRound(value: number): number {
  return Math.round(value * 10) / 10;
}

function meshClamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
