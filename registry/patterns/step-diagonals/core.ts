import { layer, nextId } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface StepDiagonalsProps {
  /** Height of each riser in pixels, and the unit of every other length. */
  step: number;
  /** Treads per riser. One gives equal treads and risers, and more gives a shallower stair. */
  run: number;
  /** Risers between neighbouring staircases, measured vertically. */
  spacing: number;
  /** Climbs to the right when rising, and mirrors that when falling. */
  direction: "rising" | "falling";
  /** Opacity of the staircase layer, from invisible to full ink. */
  strength: number;
}

export const defaults: StepDiagonalsProps = {
  step: 12,
  run: 1,
  spacing: 4,
  direction: "rising",
  strength: 0.3,
};

const STEP_DIAGONALS_NS = "http://www.w3.org/2000/svg";

export const mount: Mount<StepDiagonalsProps> = (host, initial = {}) => {
  let props: StepDiagonalsProps = { ...defaults, ...initial };
  const field = layer(host, "under");
  const svg = document.createElementNS(STEP_DIAGONALS_NS, "svg");
  const defs = document.createElementNS(STEP_DIAGONALS_NS, "defs");
  const tile = document.createElementNS(STEP_DIAGONALS_NS, "pattern");
  const stairs = document.createElementNS(STEP_DIAGONALS_NS, "path");
  const fill = document.createElementNS(STEP_DIAGONALS_NS, "rect");
  const id = nextId("pica-step-diagonals");
  for (const node of [svg, defs, tile, stairs, fill]) node.setAttribute("data-pica", "");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.cssText = "display:block";
  tile.setAttribute("id", id);
  tile.setAttribute("patternUnits", "userSpaceOnUse");
  stairs.setAttribute("fill", "none");
  stairs.setAttribute("stroke-width", "1");
  stairs.setAttribute("stroke-linejoin", "miter");
  stairs.setAttribute("stroke-linecap", "square");
  stairs.setAttribute("shape-rendering", "crispEdges");
  stairs.style.stroke = cssVar("fg");
  fill.setAttribute("width", "100%");
  fill.setAttribute("height", "100%");
  fill.setAttribute("fill", `url(#${id})`);
  tile.append(stairs);
  defs.append(tile);
  svg.append(defs, fill);
  field.el.append(svg);

  function draw(): void {
    const { step, run, spacing } = stepDiagonalsUnits(props);
    const width = run * step * spacing;
    const height = step * spacing;
    tile.setAttribute("width", String(width));
    tile.setAttribute("height", String(height));
    stairs.setAttribute("d", stepDiagonalsPath(step, run, spacing));
    if (props.direction === "falling") stairs.setAttribute("transform", `translate(${width} 0) scale(-1 1)`);
    else stairs.removeAttribute("transform");
    field.el.style.opacity = String(Math.min(1, Math.max(0, props.strength)));
  }

  draw();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      draw();
    },
    destroy() {
      field.remove();
      delete host.dataset.picaReady;
    },
  };
};

function stepDiagonalsUnits(props: StepDiagonalsProps): { step: number; run: number; spacing: number } {
  const whole = (value: number, minimum: number, maximum: number): number =>
    Math.min(maximum, Math.max(minimum, Math.round(value)));
  return { step: whole(props.step, 8, 40), run: whole(props.run, 1, 4), spacing: whole(props.spacing, 2, 8) };
}

/** One continuous staircase, carried a tread past each side of the tile so its corners are whole at the seams.
 *  Every coordinate sits on a half pixel, so each one pixel line fills exactly one row or column. */
function stepDiagonalsPath(step: number, run: number, spacing: number): string {
  const tread = run * step;
  let x = 0.5 - tread;
  let y = spacing * step + 0.5;
  let d = `M${x} ${y}`;
  for (let index = -1; index <= spacing; index += 1) {
    x += tread;
    y -= step;
    d += `H${x}V${y}`;
  }
  // The staircase one tile above wraps through the top left corner, so its corner is drawn here as well.
  return `${d}M${0.5 - tread} 0.5H0.5V${0.5 - step}`;
}
