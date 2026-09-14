import { layer, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface HatchLinesProps {
  /** Angle of the first line family, from 0 to 90 degrees. */
  angle: number;
  /** Number of crossing line families, from one to three. */
  density: number;
  /** Distance between parallel lines in each family, in pixels. */
  spacing: number;
  /** Opacity of the complete hatch layer, from quiet to strong. */
  strength: number;
}

export const defaults: HatchLinesProps = {
  angle: 45,
  density: 2,
  spacing: 10,
  strength: 0.3,
};

export const mount: Mount<HatchLinesProps> = (host, initial = {}) => {
  let props: HatchLinesProps = { ...defaults, ...initial };
  const hatch = layer(host, "under");
  const sheet = scope(host);

  sheet.setRules(hatchRules(sheet.selector, props));
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (
        props.angle !== before.angle ||
        props.density !== before.density ||
        props.spacing !== before.spacing ||
        props.strength !== before.strength
      ) {
        sheet.setRules(hatchRules(sheet.selector, props));
      }
    },
    destroy() {
      sheet.destroy();
      hatch.remove();
      delete host.dataset.picaReady;
    },
  };
};

function hatchRules(selector: string, props: HatchLinesProps): string {
  const angle = hatchClamp(props.angle, 0, 90);
  const density = Math.round(hatchClamp(props.density, 1, 3));
  const spacing = hatchClamp(props.spacing, 4, 32);
  const strength = hatchClamp(props.strength, 0, 1);
  const ink = cssVar("fg");
  const angles = [angle, angle + 90, angle + 45];
  const families = angles
    .slice(0, density)
    .map(
      (degrees) =>
        `repeating-linear-gradient(${degrees}deg,${ink} 0,${ink} 1px,transparent 1px,transparent ${spacing}px)`,
    );
  return `${selector} > div[data-pica]{background-image:${families.join(",")};opacity:${strength}}`;
}

function hatchClamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
