import { labelHost, unlabelHost } from "../../../lib/a11y";
import type { Mount } from "../../../lib/types";

export interface HalftoneCssProps {
  /** Spacing between dots, in pixels. */
  size: number;
  /** Dot radius, as a fraction of size. At 0.5 dots in the same layer touch their neighbors. */
  dot: number;
  /** How the dots fade across the host. "none" keeps their strength uniform. */
  fade: "radial" | "linear" | "none";
  /** Direction of the linear fade, in degrees. Used only when fade is "linear". */
  angle: number;
  /** How strongly the dots show, from faint to fully inked. */
  strength: number;
}

export const defaults: HalftoneCssProps = {
  size: 14,
  dot: 0.28,
  fade: "radial",
  angle: 45,
  strength: 0.6,
};

/** Counts instances so each one gets its own class, never repeated while the page is open. */
let instances = 0;

export const mount: Mount<HalftoneCssProps> = (host, initial = {}) => {
  let props: HalftoneCssProps = { ...defaults, ...initial };
  const className = `pica-halftone-css-${++instances}`;
  const reposition = getComputedStyle(host).position === "static";
  const style = document.createElement("style");
  const layer = document.createElement("div");
  layer.className = className;

  labelHost(host, "");
  if (reposition) host.style.position = "relative";
  style.textContent = sheet(className, props);
  host.appendChild(style);
  host.appendChild(layer);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      style.textContent = sheet(className, props);
    },
    destroy() {
      style.remove();
      layer.remove();
      unlabelHost(host);
      if (reposition) host.style.removeProperty("position");
      delete host.dataset.picaReady;
    },
  };
};

/** The scoped rule for one instance: a dot grid plus a second layer offset by half a cell, masked by an
 *  optional fade. Both layers live in one element's background-image, so only one div is ever added. */
function sheet(className: string, p: HalftoneCssProps): string {
  const radius = p.size * p.dot;
  const half = p.size / 2;
  const dot = `radial-gradient(circle at center, var(--pica-fg, currentColor) ${radius}px, transparent ${radius}px)`;
  const mask = maskImage(p.fade, p.angle);
  const rules = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    `background-image:${dot},${dot}`,
    `background-size:${p.size}px ${p.size}px,${p.size}px ${p.size}px`,
    `background-position:0 0,${half}px ${half}px`,
    `opacity:${p.strength}`,
  ];
  if (mask) {
    rules.push(
      `-webkit-mask-image:${mask}`,
      `mask-image:${mask}`,
      "-webkit-mask-repeat:no-repeat",
      "mask-repeat:no-repeat",
      "-webkit-mask-size:100% 100%",
      "mask-size:100% 100%",
    );
  }
  return `.${className}{${rules.join(";")}}`;
}

/** The mask-image value for one fade mode, or an empty string when the pattern should stay uniform. */
function maskImage(fade: HalftoneCssProps["fade"], angle: number): string {
  if (fade === "radial") return "radial-gradient(circle at center, #000 0%, transparent 100%)";
  if (fade === "linear") return `linear-gradient(${angle}deg, #000 0%, transparent 100%)`;
  return "";
}
