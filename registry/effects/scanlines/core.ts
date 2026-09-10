import { labelHost, unlabelHost } from "../../../lib/a11y";
import { createLoop } from "../../../lib/loop";
import type { Mount, MotionProps } from "../../../lib/types";

export interface ScanlinesProps extends MotionProps {
  /** Vertical gap from the top of one line to the top of the next, in pixels. */
  spacing: number;
  /** Thickness of each line, in pixels. Never drawn thicker than spacing. */
  thickness: number;
  /** Opacity of the whole overlay, from barely visible to strong. */
  opacity: number;
  /** Draws a soft, brighter band that drifts down the screen and loops. */
  roll: boolean;
  /** Seconds for the roll band to cross the full height once before it repeats. */
  rollSpeed: number;
  /** Frames drawn per second while the roll band moves. */
  fps: number;
}

export const defaults: ScanlinesProps = {
  spacing: 3,
  thickness: 1,
  opacity: 0.18,
  roll: true,
  rollSpeed: 9,
  fps: 30,
  paused: false,
  time: null,
  seed: 1,
};

/** Counts instances so each one gets its own class, never repeated while the page is open. */
let instances = 0;

/** The roll band as one tile the height of the host: transparent above and below a soft ink peak at its
 *  center. Tiled with repeat-y and slid down by lib/loop.ts, adjacent tiles meet at matching transparent
 *  edges, so the drift loops with no seam. */
const ROLL_BAND =
  "linear-gradient(to bottom, transparent 0%, transparent 38%, var(--pica-fg, currentColor) 50%, transparent 62%, transparent 100%)";

/** The custom property lib/loop.ts writes the roll band's vertical position into, read back by the
 *  scoped rule in `sheet`. Private to this component; not one of STYLE.md's shared tokens. */
const ROLL_VAR = "--pica-scanlines-roll";

export const mount: Mount<ScanlinesProps> = (host, initial = {}) => {
  let props: ScanlinesProps = { ...defaults, ...initial };
  const className = `pica-scanlines-${++instances}`;
  const reposition = getComputedStyle(host).position === "static";
  const styleEl = document.createElement("style");
  const layer = document.createElement("div");
  layer.className = className;
  layer.setAttribute("aria-hidden", "true");

  function draw(t: number): void {
    if (props.roll) {
      // Percentage background-position is a no-op once the image matches the box exactly (the offset
      // formula is (box - image) * percent, which is zero at equal sizes), so the shift is a pixel
      // value computed from the host's own height instead.
      const period = Math.max(1, props.rollSpeed) * 1000;
      const phase = ((t % period) + period) % period / period;
      const height = host.clientHeight;
      layer.style.setProperty(ROLL_VAR, `${(phase * height).toFixed(2)}px`);
    }
    host.dataset.picaReady = "true";
  }

  labelHost(host, "");
  if (reposition) host.style.position = "relative";
  styleEl.textContent = sheet(className, props);
  host.appendChild(styleEl);
  host.appendChild(layer);

  const loop = createLoop({
    el: host,
    fps: props.fps,
    paused: props.paused,
    time: props.time,
    still: 0,
    frame: draw,
  });

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (
        props.spacing !== before.spacing ||
        props.thickness !== before.thickness ||
        props.opacity !== before.opacity ||
        props.roll !== before.roll
      ) {
        styleEl.textContent = sheet(className, props);
      }
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      styleEl.remove();
      layer.remove();
      unlabelHost(host);
      if (reposition) host.style.removeProperty("position");
      delete host.dataset.picaReady;
    },
  };
};

/** The scoped rule for one instance: fine horizontal lines from a repeating gradient, plus an optional
 *  roll band whose position lib/loop.ts drives through one custom property. Both layers live in one
 *  element's background, so only one div is ever added. */
function sheet(className: string, p: ScanlinesProps): string {
  const thickness = Math.min(p.thickness, p.spacing);
  const lines =
    `repeating-linear-gradient(to bottom, var(--pica-fg, currentColor) 0, ` +
    `var(--pica-fg, currentColor) ${thickness}px, transparent ${thickness}px, transparent ${p.spacing}px)`;
  const rules = ["position:absolute", "inset:0", "pointer-events:none", `opacity:${p.opacity}`];
  if (p.roll) {
    rules.push(
      `background-image:${ROLL_BAND},${lines}`,
      `background-size:100% 100%,100% ${p.spacing}px`,
      "background-repeat:repeat-y,repeat-y",
      `background-position:0 var(${ROLL_VAR},0px),0 0`,
    );
  } else {
    rules.push(`background-image:${lines}`, `background-size:100% ${p.spacing}px`, "background-repeat:repeat-y");
  }
  return `.${className}{${rules.join(";")}}`;
}
