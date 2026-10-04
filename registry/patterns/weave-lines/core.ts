import { layer, nextId } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface WeaveLinesProps {
  /** Distance between strand centers on both axes, in pixels. */
  pitch: number;
  /** How many crossings a strand passes over before it passes under. */
  float: number;
  /** Ribbon width as a fraction of the pitch. */
  ribbon: number;
  /** How far an under strand's edge lines stop short of the over strand, in pixels. */
  gap: number;
  /** Opacity of the weave from invisible to full ink. */
  strength: number;
}

export const defaults: WeaveLinesProps = {
  pitch: 24,
  float: 1,
  ribbon: 0.75,
  gap: 3,
  strength: 0.35,
};

const WEAVE_SVG_NS = "http://www.w3.org/2000/svg";

export const mount: Mount<WeaveLinesProps> = (host, initial = {}) => {
  let props: WeaveLinesProps = { ...defaults, ...initial };
  const field = layer(host, "under");
  const svg = document.createElementNS(WEAVE_SVG_NS, "svg");
  const defs = document.createElementNS(WEAVE_SVG_NS, "defs");
  const tile = document.createElementNS(WEAVE_SVG_NS, "pattern");
  const strokes = document.createElementNS(WEAVE_SVG_NS, "path");
  const fill = document.createElementNS(WEAVE_SVG_NS, "rect");
  const id = nextId("pica-weave");
  svg.setAttribute("data-pica", "");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "display:block;width:100%;height:100%";
  tile.setAttribute("data-pica", "");
  tile.setAttribute("id", id);
  tile.setAttribute("patternUnits", "userSpaceOnUse");
  strokes.setAttribute("data-pica", "");
  strokes.setAttribute("fill", "none");
  strokes.setAttribute("stroke", cssVar("fg"));
  strokes.setAttribute("stroke-width", "1");
  strokes.setAttribute("stroke-linecap", "butt");
  strokes.setAttribute("shape-rendering", "crispEdges");
  fill.setAttribute("data-pica", "");
  fill.setAttribute("width", "100%");
  fill.setAttribute("height", "100%");
  fill.setAttribute("fill", `url(#${id})`);
  tile.append(strokes);
  defs.append(tile);
  svg.append(defs, fill);
  field.el.append(svg);

  function build(): void {
    const size = weavePeriod(props);
    tile.setAttribute("width", String(size));
    tile.setAttribute("height", String(size));
    strokes.setAttribute("d", weavePath(props));
  }

  function opacity(): void {
    field.el.style.opacity = String(weaveClamp(props.strength, 0, 1));
  }

  build();
  opacity();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (
        props.pitch !== before.pitch ||
        props.float !== before.float ||
        props.ribbon !== before.ribbon ||
        props.gap !== before.gap
      ) {
        build();
      }
      if (props.strength !== before.strength) opacity();
    },
    destroy() {
      field.remove();
      delete host.dataset.picaReady;
    },
  };
};

function weavePitch(props: WeaveLinesProps): number {
  return Math.round(weaveClamp(props.pitch, 12, 48));
}

function weaveFloat(props: WeaveLinesProps): number {
  return Math.round(weaveClamp(props.float, 1, 3));
}

function weavePeriod(props: WeaveLinesProps): number {
  return 2 * weaveFloat(props) * weavePitch(props);
}

/** One tile of crossings, each cell holding the four edge lines of its two strands. Every coordinate is a whole
 *  pixel along a line and a half pixel across it, so each hairline lands on one pixel row or column. */
function weavePath(props: WeaveLinesProps): string {
  const pitch = weavePitch(props);
  const run = weaveFloat(props);
  const gap = Math.round(weaveClamp(props.gap, 1, 6));
  const half = (weaveClamp(props.ribbon, 0.5, 0.9) * pitch) / 2;
  const parts: string[] = [];
  const horizontal = (y: number, from: number, to: number): void => {
    if (to > from) parts.push(`M${from} ${y}H${to}`);
  };
  const vertical = (x: number, from: number, to: number): void => {
    if (to > from) parts.push(`M${x} ${from}V${to}`);
  };
  for (let j = 0; j < 2 * run; j += 1) {
    const top = j * pitch;
    const rowLow = Math.floor(top + pitch / 2 - half);
    const rowHigh = Math.floor(top + pitch / 2 + half);
    for (let i = 0; i < 2 * run; i += 1) {
      const left = i * pitch;
      const columnLow = Math.floor(left + pitch / 2 - half);
      const columnHigh = Math.floor(left + pitch / 2 + half);
      const over = (Math.floor(i / run) + Math.floor(j / run)) % 2 === 0;
      for (const row of [rowLow, rowHigh]) {
        if (over) horizontal(row + 0.5, left, left + pitch);
        else {
          horizontal(row + 0.5, left, columnLow - gap);
          horizontal(row + 0.5, columnHigh + 1 + gap, left + pitch);
        }
      }
      for (const column of [columnLow, columnHigh]) {
        if (!over) vertical(column + 0.5, top, top + pitch);
        else {
          vertical(column + 0.5, top, rowLow - gap);
          vertical(column + 0.5, rowHigh + 1 + gap, top + pitch);
        }
      }
    }
  }
  return parts.join("");
}

function weaveClamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
