import { layer, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface HexLatticeProps {
  /** Radius of each hexagon from its center to a vertex, in pixels. */
  size: number;
  /** Places either a flat edge or a vertex at the top of each hexagon. */
  orientation: "flat" | "pointy";
  /** Opacity of the lattice from invisible to full ink. */
  strength: number;
}

export const defaults: HexLatticeProps = {
  size: 20,
  orientation: "flat",
  strength: 0.35,
};

const HEX_LATTICE_LAYER = "data-pica-hex-lattice";

export const mount: Mount<HexLatticeProps> = (host, initial = {}) => {
  let props: HexLatticeProps = { ...defaults, ...initial };
  const pattern = layer(host, "under");
  pattern.el.setAttribute(HEX_LATTICE_LAYER, "");
  const sheet = scope(host);

  sheet.setRules(hexLatticeRules(sheet.selector, props));
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (
        props.size !== before.size ||
        props.orientation !== before.orientation ||
        props.strength !== before.strength
      ) {
        sheet.setRules(hexLatticeRules(sheet.selector, props));
      }
    },
    destroy() {
      sheet.destroy();
      pattern.remove();
      delete host.dataset.picaReady;
    },
  };
};

function hexLatticeRules(selector: string, props: HexLatticeProps): string {
  const radius = Math.min(64, Math.max(12, props.size));
  const long = Math.sqrt(3) * radius;
  const flat = props.orientation !== "pointy";
  const width = flat ? 3 * radius : long;
  const height = flat ? long : 3 * radius;
  const halfLong = long / 2;
  const value = (number: number): string => Number(number.toFixed(3)).toString();
  const path = flat
    ? `M${value(radius)} 0H${value(2 * radius)}M${value(radius)} 0L${value(radius / 2)} ${value(halfLong)}H0M${value(3 * radius)} ${value(halfLong)}H${value(2.5 * radius)}L${value(2 * radius)} 0M${value(radius / 2)} ${value(halfLong)}L${value(radius)} ${value(long)}H${value(2 * radius)}L${value(2.5 * radius)} ${value(halfLong)}`
    : `M0 ${value(radius)}V${value(2 * radius)}M0 ${value(radius)}L${value(halfLong)} ${value(radius / 2)}V0M${value(halfLong)} ${value(3 * radius)}V${value(2.5 * radius)}L0 ${value(2 * radius)}M${value(halfLong)} ${value(radius / 2)}L${value(long)} ${value(radius)}V${value(2 * radius)}L${value(halfLong)} ${value(2.5 * radius)}`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${value(width)} ${value(height)}'><path d='${path}' fill='none' stroke='currentColor' stroke-width='1' stroke-linejoin='miter'/></svg>`;
  const image = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  const strength = Math.min(1, Math.max(0, props.strength));
  return `${selector}>[${HEX_LATTICE_LAYER}]{background:${cssVar("fg")};opacity:${strength};-webkit-mask-image:${image};mask-image:${image};-webkit-mask-size:${value(width)}px ${value(height)}px;mask-size:${value(width)}px ${value(height)}px;-webkit-mask-repeat:repeat;mask-repeat:repeat}`;
}
