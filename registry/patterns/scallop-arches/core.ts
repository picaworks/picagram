import { layer } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ScallopArchesProps {
  /** Radius of each scallop's outer ring, and half its width, in whole pixels. */
  radius: number;
  /** Number of concentric arches in each scallop, held to at most a quarter of the radius. */
  rings: number;
  /** Width of each stroke, in pixels. */
  thickness: number;
  /** Opacity of the arches. */
  strength: number;
}

export const defaults: ScallopArchesProps = {
  radius: 24,
  rings: 3,
  thickness: 1,
  strength: 0.3,
};

const SCALLOP_SVG_NS = "http://www.w3.org/2000/svg";
let scallopSerial = 0;

export const mount: Mount<ScallopArchesProps> = (host, initial = {}) => {
  let props: ScallopArchesProps = { ...defaults, ...initial };
  const id = `pica-scallop-${(scallopSerial += 1)}`;
  const field = layer(host, "under");
  const svg = document.createElementNS(SCALLOP_SVG_NS, "svg");
  const defs = document.createElementNS(SCALLOP_SVG_NS, "defs");
  const tile = document.createElementNS(SCALLOP_SVG_NS, "pattern");
  const strokes = document.createElementNS(SCALLOP_SVG_NS, "path");
  const fill = document.createElementNS(SCALLOP_SVG_NS, "rect");
  svg.setAttribute("data-pica", "");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.cssText = "display:block;overflow:hidden";
  tile.setAttribute("data-pica", "");
  tile.setAttribute("id", id);
  tile.setAttribute("patternUnits", "userSpaceOnUse");
  strokes.setAttribute("data-pica", "");
  strokes.setAttribute("fill", "none");
  strokes.setAttribute("stroke-linecap", "butt");
  fill.setAttribute("data-pica", "");
  fill.setAttribute("width", "100%");
  fill.setAttribute("height", "100%");
  fill.setAttribute("fill", `url(#${id})`);
  tile.append(strokes);
  defs.append(tile);
  svg.append(defs, fill);
  field.el.append(svg);

  function paint(): void {
    strokes.style.stroke = cssVar("fg");
    strokes.setAttribute("stroke-width", String(scallopClamp(props.thickness, 1, 2)));
    svg.style.opacity = String(scallopClamp(props.strength, 0, 1));
  }

  function rebuild(): void {
    const radius = scallopRadius(props);
    tile.setAttribute("width", String(2 * radius));
    tile.setAttribute("height", String(2 * radius));
    strokes.setAttribute("d", scallopPath(radius, scallopRings(props, radius)));
  }

  paint();
  rebuild();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.thickness !== before.thickness || props.strength !== before.strength) paint();
      if (props.radius !== before.radius || props.rings !== before.rings) rebuild();
    },
    destroy() {
      field.remove();
      delete host.dataset.picaReady;
    },
  };
};

function scallopRadius(props: ScallopArchesProps): number {
  return Math.round(scallopClamp(props.radius, 16, 48));
}

function scallopRings(props: ScallopArchesProps, radius: number): number {
  return Math.min(Math.floor(radius / 4), Math.round(scallopClamp(props.rings, 2, 5)));
}

/** One tile, twice the radius on a side: row 0 on its own centres, row 1 half a scallop over, and the
 *  outer ring of row 2 so that each apex on the bottom edge keeps both halves of its stroke. */
function scallopPath(radius: number, rings: number): string {
  const parts: string[] = [];
  const arch = (centre: number, baseline: number, ring: number): void => {
    const reach = (radius * ring) / rings;
    parts.push(`M${centre - reach} ${baseline}A${reach} ${reach} 0 0 1 ${centre + reach} ${baseline}`);
  };
  for (let ring = 1; ring <= rings; ring += 1) {
    arch(0, radius, ring);
    arch(2 * radius, radius, ring);
    arch(-radius, 2 * radius, ring);
    arch(radius, 2 * radius, ring);
    arch(3 * radius, 2 * radius, ring);
  }
  arch(0, 3 * radius, rings);
  arch(2 * radius, 3 * radius, rings);
  return parts.join("");
}

function scallopClamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
