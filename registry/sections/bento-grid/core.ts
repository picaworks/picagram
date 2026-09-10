import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface BentoGridProps {
  /** How tiles are sized by position: one large tile then small ones, alternating wide and tall tiles, or equal tiles throughout. */
  pattern: "feature" | "mosaic" | "columns";
  /** Number of columns in the grid before any tile spans more than one. */
  columns: number;
  /** Space between tiles, in rem. */
  gap: number;
  /** Draws box-drawing corner marks on each tile, in mono. */
  corners: boolean;
  /** Narrowest a column may get, in pixels, before the grid collapses to one column. */
  minTile: number;
}

export const defaults: BentoGridProps = {
  pattern: "feature",
  columns: 4,
  gap: 0.75,
  corners: true,
  minTile: 220,
};

/** Every host child but the ones the core adds itself, such as its own scoped stylesheet. Written into an
 *  nth-child "of" selector so position counts only real children, never the core's own nodes. */
const TILE = ":not([data-pica])";

/** The scoped rules for one host: a CSS grid whose tiles are sized by position, following `pattern`, with
 *  one-pixel lines and square corners on every tile. Below `minTile` per column, `data-pica-collapsed`
 *  (set by a ResizeObserver in mount) forces one column and clears every span. */
function rules(s: string, p: BentoGridProps): string {
  const fg = cssVar("fg");
  const columns = Math.max(1, Math.round(p.columns));
  const out = [
    `${s}{display:grid;align-content:start;grid-auto-flow:dense;grid-template-columns:repeat(${columns},1fr);grid-auto-rows:minmax(${Math.max(1, p.minTile)}px,auto);gap:${Math.max(0, p.gap)}rem}`,
    `${s} > ${TILE}{box-sizing:border-box;position:relative;border:1px solid ${fg};border-radius:0;padding:1.25rem}`,
  ];
  if (p.pattern === "feature") {
    out.push(`${s} > :nth-child(1 of ${TILE}){grid-column:span 2;grid-row:span 2}`);
  } else if (p.pattern === "mosaic") {
    out.push(`${s} > :nth-child(odd of ${TILE}){grid-column:span 2}`, `${s} > :nth-child(even of ${TILE}){grid-row:span 2}`);
  }
  if (p.corners) {
    const corner = `position:absolute;line-height:1;font-family:${GRID_FONT};color:${fg};pointer-events:none`;
    out.push(
      `${s} > ${TILE}::before{content:"┌";${corner};top:0.1em;left:0.2em}`,
      `${s} > ${TILE}::after{content:"┘";${corner};bottom:0.1em;right:0.2em}`,
    );
  }
  out.push(`${s}[data-pica-collapsed]{grid-template-columns:1fr}`, `${s}[data-pica-collapsed] > ${TILE}{grid-column:span 1;grid-row:span 1}`);
  return out.join("\n");
}

export const mount: Mount<BentoGridProps> = (host, initial = {}) => {
  let props: BentoGridProps = { ...defaults, ...initial };
  // The host and its children keep their own attributes and roles; only this tracker's own change (the
  // collapse flag below) is ever applied, and it is undone on destroy.
  const attrs = hostAttributes(host);
  const sheet = scope(host);

  /** Below `minTile` per column, the grid reads as one narrow column instead of squeezed ones. */
  function measure(): void {
    const perColumn = host.clientWidth / Math.max(1, Math.round(props.columns));
    attrs.set("data-pica-collapsed", perColumn < props.minTile ? "" : null);
  }

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
  observer?.observe(host);

  sheet.setRules(rules(sheet.selector, props));
  measure();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (
        props.pattern !== before.pattern ||
        props.columns !== before.columns ||
        props.gap !== before.gap ||
        props.corners !== before.corners ||
        props.minTile !== before.minTile
      ) {
        sheet.setRules(rules(sheet.selector, props));
      }
      measure();
    },
    destroy() {
      observer?.disconnect();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
