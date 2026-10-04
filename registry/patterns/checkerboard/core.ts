import { layer, scope, styleHost } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface CheckerboardProps {
  /** Width and height of each square, in pixels. */
  size: number;
  /** Clockwise tilt of the board, in degrees. */
  angle: number;
  /** Opacity of the inked squares. */
  strength: number;
}

export const defaults: CheckerboardProps = {
  size: 32,
  angle: 0,
  strength: 0.08,
};

export const mount: Mount<CheckerboardProps> = (host, initial = {}) => {
  let props: CheckerboardProps = { ...defaults, ...initial };
  let destroyed = false;
  const board = layer(host, "under");
  const restoreHost = styleHost(host, { overflow: "hidden", color: cssVar("fg") });
  const sheet = scope(host);
  board.el.style.inset = "auto";
  board.el.style.left = "50%";
  board.el.style.top = "50%";

  function resize(): void {
    if (destroyed) return;
    const cell = Math.max(8, Math.min(96, props.size));
    const span = Math.ceil(Math.hypot(host.clientWidth, host.clientHeight) + cell * 2);
    board.el.style.width = `${span}px`;
    board.el.style.height = `${span}px`;
  }

  function draw(): void {
    const angle = Math.max(0, Math.min(45, props.angle));
    const cell = Math.max(8, Math.min(96, props.size));
    const strength = Math.max(0, Math.min(1, props.strength));
    board.el.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
    sheet.setRules(rules(sheet.selector, cell, strength));
    resize();
    host.dataset.picaReady = "true";
  }

  const observer = new ResizeObserver(resize);
  draw();
  observer.observe(host);

  return {
    update(next) {
      props = { ...props, ...next };
      draw();
    },
    destroy() {
      destroyed = true;
      observer.disconnect();
      sheet.destroy();
      restoreHost();
      board.remove();
      delete host.dataset.picaReady;
    },
  };
};

function rules(selector: string, cell: number, strength: number): string {
  const ink = cssVar("fg");
  const tile = cell * 2;
  return `${selector}>div[data-pica]{color:${ink};background-image:repeating-conic-gradient(currentColor 0 25%,transparent 0 50%);background-size:${tile}px ${tile}px;opacity:${strength}}`;
}
