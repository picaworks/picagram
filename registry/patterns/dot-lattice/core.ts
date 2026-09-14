import { layer, scope, styleHost } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface DotLatticeProps {
  /** Distance between neighboring lattice points, in pixels. */
  spacing: number;
  /** Rotation of the lattice, in degrees. */
  angle: number;
  /** Staggers alternate rows by half of the spacing. */
  offset: boolean;
  /** Radius of each lattice point, in pixels. */
  dot: number;
  /** Portion of the field that fades toward the edges. */
  fade: number;
  /** Opacity of the lattice layer. */
  strength: number;
}

export const defaults: DotLatticeProps = {
  spacing: 24,
  angle: 0,
  offset: false,
  dot: 1,
  fade: 0,
  strength: 0.35,
};

const SIZE_VAR = "--pica-dot-lattice-size";

export const mount: Mount<DotLatticeProps> = (host, initial = {}) => {
  let props: DotLatticeProps = { ...defaults, ...initial };
  const restoreHost = styleHost(host, { overflow: "hidden" });
  const dots = layer(host, "under");
  const sheet = scope(host);
  dots.el.style.removeProperty("inset");

  function sizeLayer(): void {
    const diagonal = Math.hypot(host.clientWidth, host.clientHeight);
    const side = Math.ceil(diagonal + props.spacing * 2);
    dots.el.style.setProperty(SIZE_VAR, `${side}px`);
  }

  sizeLayer();
  sheet.setRules(rules(sheet.selector, props));
  const resize = new ResizeObserver(sizeLayer);
  resize.observe(host);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      sizeLayer();
      sheet.setRules(rules(sheet.selector, props));
    },
    destroy() {
      resize.disconnect();
      sheet.destroy();
      dots.remove();
      restoreHost();
      delete host.dataset.picaReady;
    },
  };
};

/** The scoped rule draws one point per tile. A staggered field uses two tiles with the same period so its
 *  alternating rows stay on one lattice. */
function rules(selector: string, p: DotLatticeProps): string {
  const point = `radial-gradient(circle at center,${cssVar("fg")} 0 ${p.dot}px,transparent ${p.dot}px)`;
  const backgrounds = p.offset ? `${point},${point}` : point;
  const sizes = p.offset
    ? `${p.spacing}px ${p.spacing * 2}px,${p.spacing}px ${p.spacing * 2}px`
    : `${p.spacing}px ${p.spacing}px`;
  const positions = p.offset ? `0 0,${p.spacing / 2}px ${p.spacing}px` : "0 0";
  const declarations = [
    "inset:50% auto auto 50%",
    `width:var(${SIZE_VAR})`,
    `height:var(${SIZE_VAR})`,
    `transform:translate(-50%,-50%) rotate(${p.angle}deg)`,
    `background-image:${backgrounds}`,
    `background-size:${sizes}`,
    `background-position:${positions}`,
    "background-repeat:repeat",
    `opacity:${p.strength}`,
  ];
  if (p.fade > 0) {
    const solid = (1 - p.fade) * 100;
    const mask = `radial-gradient(ellipse at center,currentColor ${solid}%,transparent 100%)`;
    declarations.push(
      `-webkit-mask-image:${mask}`,
      `mask-image:${mask}`,
      "-webkit-mask-repeat:no-repeat",
      "mask-repeat:no-repeat",
      "-webkit-mask-size:100% 100%",
      "mask-size:100% 100%",
    );
  }
  return `${selector} > div[data-pica]{${declarations.join(";")}}`;
}
