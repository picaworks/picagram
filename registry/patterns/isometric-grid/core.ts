import { layer, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface IsometricGridProps {
  /** Perpendicular distance between parallel rules, in pixels. */
  spacing: number;
  /** Draws points at the lattice vertices instead of rules. */
  dots: boolean;
  /** Opacity of the pattern layer, from quiet to full ink. */
  strength: number;
}

export const defaults: IsometricGridProps = {
  spacing: 24,
  dots: false,
  strength: 0.35,
};

export const mount: Mount<IsometricGridProps> = (host, initial = {}) => {
  let props: IsometricGridProps = { ...defaults, ...initial };
  const pattern = layer(host, "under");
  const sheet = scope(host);

  sheet.setRules(rules(sheet.selector, props));
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.spacing !== before.spacing || props.dots !== before.dots || props.strength !== before.strength) {
        sheet.setRules(rules(sheet.selector, props));
      }
    },
    destroy() {
      sheet.destroy();
      pattern.remove();
      delete host.dataset.picaReady;
    },
  };
};

function rules(selector: string, props: IsometricGridProps): string {
  const spacing = Math.max(8, Math.min(64, props.spacing));
  const strength = Math.max(0, Math.min(1, props.strength));
  const ink = cssVar("fg");
  let background: string;
  if (props.dots) {
    const height = (2 * spacing) / Math.sqrt(3);
    const dot = `radial-gradient(circle,${ink} 0 1px,transparent 1px)`;
    background = `background-image:${dot},${dot};background-size:${2 * spacing}px ${height}px;background-position:0 0,${spacing}px ${height / 2}px`;
  } else {
    const stripe = (direction: number): string => {
      const cssAngle = (270 - direction) % 180;
      return `repeating-linear-gradient(${cssAngle}deg,${ink} 0,${ink} 1px,transparent 1px,transparent ${spacing}px)`;
    };
    background = `background-image:${stripe(0)},${stripe(60)},${stripe(120)}`;
  }
  return `${selector}>div[data-pica]{opacity:${strength};${background}}`;
}
