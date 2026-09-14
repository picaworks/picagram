import { layer, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount } from "../../../lib/types";

export interface CircuitTracesProps {
  /** Distance between grid points, from 8 to 48 pixels. */
  pitch: number;
  /** Number of routed traces, from 4 to 60. */
  traces: number;
  /** Adds open accent rings at a seeded selection of bends. */
  vias: boolean;
  /** Opacity of the complete pattern, from 0 to 1. */
  strength: number;
  /** Integer seed that determines every route and mark. */
  seed: number;
}

export const defaults: CircuitTracesProps = {
  pitch: 16,
  traces: 28,
  vias: true,
  strength: 0.4,
  seed: 1,
};

const SVG_NS = "http://www.w3.org/2000/svg";

export const mount: Mount<CircuitTracesProps> = (host, initial = {}) => {
  let props: CircuitTracesProps = { ...defaults, ...initial };
  let width = -1;
  let height = -1;
  const board = layer(host, "under");
  const sheet = scope(host);
  const svg = document.createElementNS(SVG_NS, "svg");
  const runs = document.createElementNS(SVG_NS, "path");
  const pads = document.createElementNS(SVG_NS, "path");
  const rings = document.createElementNS(SVG_NS, "path");

  for (const node of [svg, runs, pads, rings]) node.setAttribute("data-pica", "");
  svg.style.cssText = "display:block;overflow:hidden";
  sheet.setRules(rules(sheet.selector));
  svg.append(runs, pads, rings);
  board.el.append(svg);

  function draw(force = false): void {
    const nextWidth = Math.max(1, host.clientWidth);
    const nextHeight = Math.max(1, host.clientHeight);
    if (!force && nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;

    const pitch = Math.round(limit(props.pitch, 8, 48));
    const count = Math.round(limit(props.traces, 4, 60));
    const columns = Math.max(2, Math.floor((width - pitch * 2) / pitch) + 1);
    const rows = Math.max(2, Math.floor((height - pitch * 2) / pitch) + 1);
    const offsetX = Math.floor((width - (columns - 1) * pitch) / 2) + 0.5;
    const offsetY = Math.floor((height - (rows - 1) * pitch) / 2) + 0.5;
    const runParts: string[] = [];
    const padParts: string[] = [];
    const ringParts: string[] = [];

    for (let n = 0; n < count; n += 1) {
      const random = createRng(hashSeed(Math.trunc(props.seed), n));
      const startColumn = Math.floor(random() * columns);
      const startRow = Math.floor(random() * rows);
      const endColumn = routeEnd(startColumn, columns, random(), random());
      const endRow = routeEnd(startRow, rows, random(), random());
      const startX = offsetX + startColumn * pitch;
      const startY = offsetY + startRow * pitch;
      const endX = offsetX + endColumn * pitch;
      const endY = offsetY + endRow * pitch;
      const bends: [number, number][] = [];
      runParts.push(`M${startX} ${startY}`);

      if (random() < 0.62) {
        const horizontalFirst = random() < 0.5;
        const bend: [number, number] = horizontalFirst ? [endX, startY] : [startX, endY];
        runParts.push(`L${bend[0]} ${bend[1]}L${endX} ${endY}`);
        bends.push(bend);
      } else if (random() < 0.5) {
        const middleColumn = between(startColumn, endColumn, random());
        const middleX = offsetX + middleColumn * pitch;
        runParts.push(`L${middleX} ${startY}L${middleX} ${endY}L${endX} ${endY}`);
        bends.push([middleX, startY], [middleX, endY]);
      } else {
        const middleRow = between(startRow, endRow, random());
        const middleY = offsetY + middleRow * pitch;
        runParts.push(`L${startX} ${middleY}L${endX} ${middleY}L${endX} ${endY}`);
        bends.push([startX, middleY], [endX, middleY]);
      }

      padParts.push(square(startX, startY, 3), square(endX, endY, 3));
      if (props.vias) {
        for (const [x, y] of bends) {
          if (random() < 0.32) ringParts.push(circle(x, y, 4));
        }
      }
    }

    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    runs.setAttribute("d", runParts.join(""));
    pads.setAttribute("d", padParts.join(""));
    rings.setAttribute("d", ringParts.join(""));
    const strength = limit(props.strength, 0, 1);
    runs.style.opacity = String(strength);
    pads.style.opacity = String(Math.min(1, strength * 2.5));
    rings.style.opacity = String(Math.min(1, strength * 2.5));
    host.dataset.picaReady = "true";
  }

  draw(true);
  const observer = new ResizeObserver(() => draw());
  observer.observe(host);

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (
        props.pitch !== before.pitch ||
        props.traces !== before.traces ||
        props.vias !== before.vias ||
        props.strength !== before.strength ||
        props.seed !== before.seed
      ) {
        draw(true);
      }
    },
    destroy() {
      observer.disconnect();
      sheet.destroy();
      board.remove();
      delete host.dataset.picaReady;
    },
  };
};

function rules(selector: string): string {
  const path = `${selector}>div[data-pica]>svg[data-pica]>path[data-pica]`;
  return [
    `${path}:nth-child(1){fill:none;stroke:${cssVar("fg")};stroke-width:1;vector-effect:non-scaling-stroke}`,
    `${path}:nth-child(2){fill:${cssVar("accent")}}`,
    `${path}:nth-child(3){fill:none;stroke:${cssVar("accent")};stroke-width:1;vector-effect:non-scaling-stroke}`,
  ].join("");
}

function limit(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function routeEnd(start: number, cells: number, side: number, distance: number): number {
  const span = Math.min(6, cells - 1);
  const length = Math.min(cells - 1, 2 + Math.floor(distance * Math.max(1, span - 1)));
  const direction = side < 0.5 ? -1 : 1;
  if (start + direction * length >= 0 && start + direction * length < cells) return start + direction * length;
  if (start - direction * length >= 0 && start - direction * length < cells) return start - direction * length;
  return direction < 0 ? 0 : cells - 1;
}

function between(start: number, end: number, value: number): number {
  const low = Math.min(start, end) + 1;
  const high = Math.max(start, end) - 1;
  return low + Math.floor(value * Math.max(1, high - low + 1));
}

function square(x: number, y: number, size: number): string {
  const edge = size / 2;
  return `M${x - edge} ${y - edge}h${size}v${size}h-${size}Z`;
}

function circle(x: number, y: number, radius: number): string {
  return `M${x - radius} ${y}a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 -${radius * 2} 0`;
}
