import { svg } from "../../../lib/chart";
import { hostAttributes, layer } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import { createRng } from "../../../lib/rng";
import type { Mount } from "../../../lib/types";

export interface PenroseTilesProps {
  /** Golden-ratio substitution rounds, from 1 to 8; more rounds extend the bounded patch. */
  depth: number;
  /** Final rhombus edge length in CSS pixels, from 12 to 120. */
  scale: number;
  /** Deterministic position and orientation of the complete quasiperiodic patch. */
  seed: number;
  /** Opacity of the whole background surface, from 0 to 1. */
  opacity: number;
}

export const defaults: PenroseTilesProps = {
  depth: 6,
  scale: 38,
  seed: 1,
  opacity: 0.26,
};

type PenrosePoint = { x: number; y: number };
type PenroseTriangle = { kind: 0 | 1; a: PenrosePoint; b: PenrosePoint; c: PenrosePoint };
type PenroseRhombus = { kind: 0 | 1; points: [PenrosePoint, PenrosePoint, PenrosePoint, PenrosePoint] };
const PENROSE_PHI = (1 + Math.sqrt(5)) / 2;

function penroseFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function penroseDepth(value: number): number {
  return Math.max(1, Math.min(8, Math.round(penroseFinite(value, defaults.depth))));
}

function penroseBetween(a: PenrosePoint, b: PenrosePoint): PenrosePoint {
  return { x: a.x + (b.x - a.x) / PENROSE_PHI, y: a.y + (b.y - a.y) / PENROSE_PHI };
}

function penrosePointKey(point: PenrosePoint): string {
  return `${Math.round(point.x * 1e9)},${Math.round(point.y * 1e9)}`;
}

function penroseEdgeKey(a: PenrosePoint, b: PenrosePoint): string {
  const left = penrosePointKey(a), right = penrosePointKey(b);
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

/** Alternating Robinson triangles form the tenfold sun seed. The two exact deflation rules preserve
 *  matching edges; pairing equal bases removes the internal triangle diagonals to expose P3 rhombi. */
function penrosePatch(depth: number): PenroseRhombus[] {
  let triangles: PenroseTriangle[] = [];
  for (let i = 0; i < 10; i++) {
    const left = (2 * i - 1) * Math.PI / 10;
    const right = (2 * i + 1) * Math.PI / 10;
    let b = { x: Math.cos(left), y: Math.sin(left) };
    let c = { x: Math.cos(right), y: Math.sin(right) };
    if (i % 2 === 0) [b, c] = [c, b];
    triangles.push({ kind: 0, a: { x: 0, y: 0 }, b, c });
  }
  for (let round = 0; round < depth; round++) {
    const next: PenroseTriangle[] = [];
    for (const { kind, a, b, c } of triangles) {
      if (kind === 0) {
        const p = penroseBetween(a, b);
        next.push({ kind: 0, a: c, b: p, c: b }, { kind: 1, a: p, b: c, c: a });
      } else {
        const q = penroseBetween(b, a);
        const r = penroseBetween(b, c);
        next.push({ kind: 1, a: r, b: c, c: a }, { kind: 1, a: q, b: r, c: b }, { kind: 0, a: r, b: q, c: a });
      }
    }
    triangles = next;
  }
  const bases = new Map<string, PenroseTriangle>();
  const rhombi: PenroseRhombus[] = [];
  for (const triangle of triangles) {
    const key = `${triangle.kind}:${penroseEdgeKey(triangle.b, triangle.c)}`;
    const partner = bases.get(key);
    if (!partner) { bases.set(key, triangle); continue; }
    bases.delete(key);
    rhombi.push({ kind: triangle.kind, points: [triangle.a, triangle.b, partner.a, triangle.c] });
  }
  // Unpaired half-rhombi occur only along the finite patch's perimeter; do not invent boundary tiles.
  return rhombi;
}

/** A finite Penrose rhombus patch behind page-owned children, with no periodic texture repetition. */
export const mount: Mount<PenroseTilesProps> = (host, initial = {}) => {
  let props: PenroseTilesProps = { ...defaults, ...initial };
  let depth = penroseDepth(props.depth);
  let rhombi = penrosePatch(depth);
  let alive = true;
  let graphic: SVGSVGElement | null = null;
  const attrs = hostAttributes(host);
  const surface = layer(host, "under");
  surface.el.style.overflow = "hidden";

  function opacity(): void {
    surface.el.style.opacity = String(Math.max(0, Math.min(1, penroseFinite(props.opacity, defaults.opacity))));
  }

  function draw(): void {
    if (!alive) return;
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    const edge = Math.max(12, Math.min(120, penroseFinite(props.scale, defaults.scale)));
    const radius = edge * PENROSE_PHI ** depth;
    const rng = createRng(penroseFinite(props.seed, defaults.seed));
    // Seed varies one coherent patch. Every tile retains its substitution-derived neighbors.
    const angle = rng() * Math.PI * 2;
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    const available = Math.max(0, radius * 0.85 - Math.hypot(width, height) / 2);
    const offsetX = (rng() - 0.5) * Math.min(radius * 0.34, available);
    const offsetY = (rng() - 0.5) * Math.min(radius * 0.34, available);
    const cx = width / 2 + offsetX, cy = height / 2 + offsetY;
    const transform = (point: PenrosePoint): PenrosePoint => ({
      x: cx + radius * (point.x * cosine - point.y * sine),
      y: cy + radius * (point.x * sine + point.y * cosine),
    });
    const coordinate = (point: PenrosePoint): string => `${point.x.toFixed(3)} ${point.y.toFixed(3)}`;
    const fills: [string[], string[]] = [[], []];
    const edges = new Map<string, [PenrosePoint, PenrosePoint]>();
    for (const rhombus of rhombi) {
      const points = rhombus.points.map(transform);
      if (Math.max(...points.map((p) => p.x)) < -2 || Math.min(...points.map((p) => p.x)) > width + 2 || Math.max(...points.map((p) => p.y)) < -2 || Math.min(...points.map((p) => p.y)) > height + 2) continue;
      fills[rhombus.kind].push(points.map((p, i) => `${i ? "L" : "M"}${coordinate(p)}`).join("") + "Z");
      for (let i = 0; i < 4; i++) {
        const a = rhombus.points[i], b = rhombus.points[(i + 1) % 4];
        const p = points[i], q = points[(i + 1) % 4];
        if (a && b && p && q) edges.set(penroseEdgeKey(a, b), [p, q]);
      }
    }
    const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: "none" });
    root.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
    for (const kind of [0, 1] as const) {
      root.appendChild(svg("path", { "data-pica": "", d: fills[kind].join(""), fill: cssVar("fg"), "fill-opacity": kind ? 0.035 : 0.09, stroke: "none" }));
    }
    const edgePath = Array.from(edges.values()).map(([a, b]) => `M${coordinate(a)}L${coordinate(b)}`).join("");
    root.appendChild(svg("path", { "data-pica": "", d: edgePath, fill: "none", stroke: cssVar("fg"), "stroke-opacity": 0.72, "stroke-width": 0.8, "stroke-linecap": "round", "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke" }));
    graphic?.remove();
    graphic = root;
    surface.el.appendChild(root);
    attrs.set("data-pica-ready", "true");
  }

  opacity();
  draw();
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
  observer?.observe(host);

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const nextDepth = penroseDepth(props.depth);
      if (nextDepth !== depth) {
        depth = nextDepth;
        rhombi = penrosePatch(depth);
      }
      if (props.opacity !== before.opacity) opacity();
      if (props.depth !== before.depth || props.scale !== before.scale || props.seed !== before.seed) draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      observer?.disconnect();
      surface.remove();
      graphic = null;
      attrs.restore();
    },
  };
};
