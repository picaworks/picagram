import { hostAttributes, layer } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface DragonFoldProps {
  /** Paper-fold iterations, from 1 to 14; each fold doubles the connected path's segments. */
  iterations: number;
  /** Length of each right-angle path segment in CSS pixels, from 2 to 32. */
  scale: number;
  /** Direction of the initial segment before folding; rotates the whole path in quarter turns. */
  orientation: "east" | "south" | "west" | "north";
  /** Opacity of the ink behind page-owned content, from 0 to 1. */
  opacity: number;
}

export const defaults: DragonFoldProps = {
  iterations: 12,
  scale: 8,
  orientation: "east",
  opacity: 0.32,
};

interface DragonFoldCurve {
  path: string;
  centerX: number;
  centerY: number;
}

function dragonFoldNumber(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

function dragonFoldIterations(value: number): number {
  return Math.round(dragonFoldNumber(value, 12, 1, 14));
}

function dragonFoldCurve(iterations: number): DragonFoldCurve {
  // Successive paper folds obey S(n+1) = S(n), right, reverse(invert(S(n))).
  // The sequence has 2^n - 1 turns and hence exactly 2^n equal-length segments.
  const turns: number[] = [];
  for (let fold = 0; fold < iterations; fold++) {
    const previousLength = turns.length;
    turns.push(1);
    for (let index = previousLength - 1; index >= 0; index--) turns.push(-(turns[index] as number));
  }
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]] as const;
  let direction = 0;
  let x = 1;
  let y = 0;
  let minX = 0, maxX = 1, minY = 0, maxY = 0;
  const commands = ["M0 0", "L1 0"];
  for (const turn of turns) {
    direction = (direction + turn + 4) % 4;
    const step = directions[direction] as readonly [number, number];
    x += step[0];
    y += step[1];
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    commands.push(`L${x} ${y}`);
  }
  return { path: commands.join(""), centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
}

function dragonFoldRotation(orientation: DragonFoldProps["orientation"]): number {
  switch (orientation) {
    case "south": return 90;
    case "west": return 180;
    case "north": return 270;
    default: return 0;
  }
}

export const mount: Mount<DragonFoldProps> = (host, initial = {}) => {
  let props: DragonFoldProps = { ...defaults, ...initial };
  let iterations = dragonFoldIterations(props.iterations);
  let curve = dragonFoldCurve(iterations);
  let alive = true;
  const attributes = hostAttributes(host);
  // Only the owned drawing is hidden. The host and all page-owned children retain
  // their semantics, their event handling, and their position in the document.
  const drawing = layer(host, "under");
  drawing.el.style.overflow = "hidden";
  const namespace = "http://www.w3.org/2000/svg";
  const graphic = document.createElementNS(namespace, "svg");
  graphic.setAttribute("data-pica", "");
  graphic.setAttribute("aria-hidden", "true");
  graphic.setAttribute("preserveAspectRatio", "none");
  graphic.style.cssText = "display:block;width:100%;height:100%;overflow:hidden";
  const path = document.createElementNS(namespace, "path");
  path.setAttribute("data-pica", "");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", cssVar("fg"));
  path.setAttribute("stroke-width", "0.85");
  path.setAttribute("stroke-linejoin", "miter");
  path.setAttribute("stroke-linecap", "square");
  path.setAttribute("vector-effect", "non-scaling-stroke");
  path.setAttribute("d", curve.path);
  graphic.append(path);
  drawing.el.append(graphic);

  function draw(): void {
    if (!alive) return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const scale = dragonFoldNumber(props.scale, 8, 2, 32);
    graphic.setAttribute("viewBox", `0 0 ${width} ${height}`);
    path.setAttribute("transform", `translate(${width / 2} ${height / 2}) rotate(${dragonFoldRotation(props.orientation)}) scale(${scale}) translate(${-curve.centerX} ${-curve.centerY})`);
    drawing.el.style.opacity = String(dragonFoldNumber(props.opacity, 0.32, 0, 1));
    attributes.set("data-pica-ready", "true");
  }

  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(draw) : null;
  resize?.observe(host);
  draw();

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      const nextIterations = dragonFoldIterations(props.iterations);
      if (nextIterations !== iterations) {
        iterations = nextIterations;
        curve = dragonFoldCurve(iterations);
        path.setAttribute("d", curve.path);
      }
      if (before.iterations !== props.iterations || before.scale !== props.scale || before.orientation !== props.orientation || before.opacity !== props.opacity) draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      resize?.disconnect();
      drawing.remove();
      attributes.restore();
    },
  };
};
