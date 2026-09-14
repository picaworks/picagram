import { layer } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount } from "../../../lib/types";

export interface TruchetTilesProps {
  /** Width and height of each square tile, in pixels. */
  cell: number;
  /** Geometry drawn in each tile. */
  tile: "arcs" | "diagonals";
  /** Width of each stroke, in pixels. */
  thickness: number;
  /** Opacity of the strokes. */
  strength: number;
  /** Integer seed used to choose every tile orientation. */
  seed: number;
}

export const defaults: TruchetTilesProps = {
  cell: 32,
  tile: "arcs",
  thickness: 1.5,
  strength: 0.4,
  seed: 1,
};

const TRUCHET_SVG_NS = "http://www.w3.org/2000/svg";

export const mount: Mount<TruchetTilesProps> = (host, initial = {}) => {
  let props: TruchetTilesProps = { ...defaults, ...initial };
  let width = -1;
  let height = -1;
  const field = layer(host, "under");
  const svg = document.createElementNS(TRUCHET_SVG_NS, "svg");
  const strokes = document.createElementNS(TRUCHET_SVG_NS, "path");
  svg.setAttribute("data-pica", "");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "display:block;overflow:hidden";
  strokes.setAttribute("data-pica", "");
  strokes.setAttribute("fill", "none");
  strokes.setAttribute("stroke-linecap", "butt");
  strokes.setAttribute("stroke-linejoin", "miter");
  svg.append(strokes);
  field.el.append(svg);

  function paint(): void {
    strokes.setAttribute("stroke", cssVar("fg"));
    strokes.setAttribute("stroke-width", String(truchetClamp(props.thickness, 1, 3)));
    strokes.setAttribute("opacity", String(truchetClamp(props.strength, 0, 1)));
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
    strokes.setAttribute("d", truchetPath(width, height, props));
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
      if (props.thickness !== before.thickness || props.strength !== before.strength) paint();
      if (props.cell !== before.cell || props.tile !== before.tile || props.seed !== before.seed) rebuild(true);
    },
    destroy() {
      observer.disconnect();
      field.remove();
      delete host.dataset.picaReady;
    },
  };
};

function truchetPath(width: number, height: number, props: TruchetTilesProps): string {
  const cell = truchetClamp(props.cell, 16, 64);
  const half = cell / 2;
  const columns = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const parts: string[] = [];
  for (let row = 0; row < rows; row += 1) {
    const y = row * cell;
    for (let column = 0; column < columns; column += 1) {
      const x = column * cell;
      const alternate = createRng(hashSeed(props.seed, column, row))() >= 0.5;
      if (props.tile === "diagonals") {
        parts.push(alternate ? `M${x} ${y}L${x + cell} ${y + cell}` : `M${x + cell} ${y}L${x} ${y + cell}`);
      } else if (alternate) {
        parts.push(
          `M${x + half} ${y}A${half} ${half} 0 0 1 ${x + cell} ${y + half}`,
          `M${x + half} ${y + cell}A${half} ${half} 0 0 1 ${x} ${y + half}`,
        );
      } else {
        parts.push(
          `M${x} ${y + half}A${half} ${half} 0 0 1 ${x + half} ${y}`,
          `M${x + cell} ${y + half}A${half} ${half} 0 0 1 ${x + half} ${y + cell}`,
        );
      }
    }
  }
  return parts.join("");
}

function truchetClamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
