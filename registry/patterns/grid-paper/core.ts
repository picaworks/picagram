import { layer, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface GridPaperProps {
  /** Width and height of each minor cell, in pixels. */
  spacing: number;
  /** Number of minor cells between major rules. */
  major: number;
  /** Opacity of the complete grid, from quiet to fully visible. */
  strength: number;
}

export const defaults: GridPaperProps = {
  spacing: 8,
  major: 5,
  strength: 0.4,
};

export const mount: Mount<GridPaperProps> = (host, initial = {}) => {
  let props: GridPaperProps = { ...defaults, ...initial };
  const grid = layer(host, "under");
  grid.el.setAttribute("data-pica-grid-paper", "");
  const sheet = scope(host);

  sheet.setRules(gridRules(sheet.selector, props));
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (
        props.spacing !== before.spacing ||
        props.major !== before.major ||
        props.strength !== before.strength
      ) {
        sheet.setRules(gridRules(sheet.selector, props));
      }
    },
    destroy() {
      sheet.destroy();
      grid.remove();
      delete host.dataset.picaReady;
    },
  };
};

function gridRules(selector: string, props: GridPaperProps): string {
  const spacing = Math.min(32, Math.max(4, props.spacing));
  const major = Math.min(10, Math.max(2, Math.round(props.major)));
  const period = spacing * major;
  const strength = Math.min(1, Math.max(0, props.strength));
  const minorInk = cssVar("muted");
  const majorInk = cssVar("fg");
  const minorVertical = `repeating-linear-gradient(to right,${minorInk} 0,${minorInk} 1px,transparent 1px,transparent ${spacing}px)`;
  const minorHorizontal = `repeating-linear-gradient(to bottom,${minorInk} 0,${minorInk} 1px,transparent 1px,transparent ${spacing}px)`;
  const majorVertical = `repeating-linear-gradient(to right,${majorInk} 0,${majorInk} 1px,transparent 1px,transparent ${period}px)`;
  const majorHorizontal = `repeating-linear-gradient(to bottom,${majorInk} 0,${majorInk} 1px,transparent 1px,transparent ${period}px)`;
  return `${selector} > [data-pica-grid-paper]{opacity:${strength};background-image:${majorVertical},${majorHorizontal},${minorVertical},${minorHorizontal}}`;
}
