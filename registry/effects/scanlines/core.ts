import { layer, scope } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
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

/** The roll band as one tile the height of the host: transparent above and below a soft ink peak at its
 *  center. Tiled with repeat-y and slid down by lib/loop.ts, adjacent tiles meet at matching transparent
 *  edges, so the drift loops with no seam. */
const ROLL_BAND = `linear-gradient(to bottom, transparent 0%, transparent 38%, ${cssVar("fg")} 50%, transparent 62%, transparent 100%)`;

/** The custom property lib/loop.ts writes the roll band's vertical position into, read back by the
 *  scoped rule. Private to this component; not one of STYLE.md's shared tokens. */
const ROLL_VAR = "--pica-scanlines-roll";

export const mount: Mount<ScanlinesProps> = (host, initial = {}) => {
  let props: ScanlinesProps = { ...defaults, ...initial };
  // The lines sit over the content in a layer of their own, hidden from assistive technology. The host
  // and the content inside it stay readable and clickable, exactly as they were.
  const lines = layer(host, "over");
  const sheet = scope(host);

  function draw(t: number): void {
    if (props.roll) {
      // Percentage background-position is a no-op once the image matches the box exactly (the offset
      // formula is (box - image) * percent, which is zero at equal sizes), so the shift is a pixel
      // value computed from the host's own height instead.
      const period = Math.max(1, props.rollSpeed) * 1000;
      const phase = (((t % period) + period) % period) / period;
      lines.el.style.setProperty(ROLL_VAR, `${(phase * host.clientHeight).toFixed(2)}px`);
    }
    host.dataset.picaReady = "true";
  }

  sheet.setRules(rules(sheet.selector, props));
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
        sheet.setRules(rules(sheet.selector, props));
      }
      loop.update({ paused: props.paused, time: props.time, fps: props.fps });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      sheet.destroy();
      lines.remove();
      delete host.dataset.picaReady;
    },
  };
};

/** The scoped rule for this host's layer: fine horizontal lines from a repeating gradient, plus an optional
 *  roll band whose position lib/loop.ts drives through one custom property. Both live in the layer's
 *  background, so the overlay is a single node. */
function rules(selector: string, p: ScanlinesProps): string {
  const thickness = Math.min(p.thickness, p.spacing);
  const ink = cssVar("fg");
  const stripes = `repeating-linear-gradient(to bottom, ${ink} 0, ${ink} ${thickness}px, transparent ${thickness}px, transparent ${p.spacing}px)`;
  const declarations = [`opacity:${p.opacity}`];
  if (p.roll) {
    declarations.push(
      `background-image:${ROLL_BAND},${stripes}`,
      `background-size:100% 100%,100% ${p.spacing}px`,
      "background-repeat:repeat-y,repeat-y",
      `background-position:0 var(${ROLL_VAR},0px),0 0`,
    );
  } else {
    declarations.push(`background-image:${stripes}`, `background-size:100% ${p.spacing}px`, "background-repeat:repeat-y");
  }
  return `${selector} > div[data-pica]{${declarations.join(";")}}`;
}
