import { layer, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface DiagonalStripesProps {
  /** Angle of the rules, in degrees. */
  angle: number;
  /** Distance from the start of one rule to the next, in pixels. */
  spacing: number;
  /** Thickness of each rule, in pixels. Never drawn thicker than half the spacing. */
  thickness: number;
  /** Opacity of the stripe layer, from quiet to full strength. */
  strength: number;
}

export const defaults: DiagonalStripesProps = {
  angle: 45,
  spacing: 14,
  thickness: 1,
  strength: 0.35,
};

export const mount: Mount<DiagonalStripesProps> = (host, initial = {}) => {
  let props: DiagonalStripesProps = { ...defaults, ...initial };
  const stripes = layer(host, "under");
  const sheet = scope(host);
  stripes.el.setAttribute("data-pica-diagonal-stripes", "");

  function draw(): void {
    sheet.setRules(rules(sheet.selector, props));
    host.dataset.picaReady = "true";
  }

  draw();

  return {
    update(next) {
      props = { ...props, ...next };
      draw();
    },
    destroy() {
      sheet.destroy();
      stripes.remove();
      delete host.dataset.picaReady;
    },
  };
};

function rules(selector: string, props: DiagonalStripesProps): string {
  const angle = Math.max(-75, Math.min(75, props.angle));
  const spacing = Math.max(6, Math.min(64, props.spacing));
  const thickness = Math.max(1, Math.min(6, props.thickness, spacing / 2));
  const strength = Math.max(0, Math.min(1, props.strength));
  const ink = cssVar("fg");
  const stripes = `repeating-linear-gradient(${angle}deg,${ink} 0,${ink} ${thickness}px,transparent ${thickness}px,transparent ${spacing}px)`;
  return `${selector}>[data-pica-diagonal-stripes]{background-image:${stripes};opacity:${strength}}`;
}
