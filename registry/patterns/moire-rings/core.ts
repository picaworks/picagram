import { layer, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface MoireRingsProps {
  /** Distance from one ring to the next in the first field, in pixels. */
  spacing: number;
  /** Period of the second field as a fraction of the first field. */
  step: number;
  /** Width of each ring, in pixels. */
  thickness: number;
  /** Opacity of the complete ring field. */
  strength: number;
}

export const defaults: MoireRingsProps = {
  spacing: 7,
  step: 1.07,
  thickness: 1,
  strength: 0.3,
};

export const mount: Mount<MoireRingsProps> = (host, initial = {}) => {
  let props: MoireRingsProps = { ...defaults, ...initial };
  const rings = layer(host, "under");
  const sheet = scope(host);

  sheet.setRules(moireRules(sheet.selector, props));
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (
        props.spacing !== before.spacing ||
        props.step !== before.step ||
        props.thickness !== before.thickness ||
        props.strength !== before.strength
      ) {
        sheet.setRules(moireRules(sheet.selector, props));
      }
    },
    destroy() {
      sheet.destroy();
      rings.remove();
      delete host.dataset.picaReady;
    },
  };
};

/** Builds two concentric hairline fields with close but unequal periods. */
function moireRules(selector: string, props: MoireRingsProps): string {
  const spacing = Math.min(16, Math.max(4, props.spacing));
  const step = Math.min(1.25, Math.max(1.02, props.step));
  const thickness = Math.min(2, Math.max(1, props.thickness));
  const strength = Math.min(1, Math.max(0, props.strength));
  const secondSpacing = spacing * step;
  const ink = `color-mix(in srgb, ${cssVar("fg")} 50%, transparent)`;
  const first = `repeating-radial-gradient(circle at center,${ink} 0 ${thickness}px,transparent ${thickness}px ${spacing}px)`;
  const second = `repeating-radial-gradient(circle at center,${ink} 0 ${thickness}px,transparent ${thickness}px ${secondSpacing}px)`;
  return `${selector} > div[data-pica]{opacity:${strength};background-image:${first},${second};background-blend-mode:plus-lighter}`;
}
