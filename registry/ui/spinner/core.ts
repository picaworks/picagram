import { labelHost, unlabelHost } from "../../../lib/a11y";
import { braille, brailleDot } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { scope } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { cssVar } from "../../../lib/palette";
import type { MotionProps, Mount } from "../../../lib/types";

export interface SpinnerProps extends MotionProps {
  /** Cells along each side of the indicator. */
  size: number;
  /** Revolutions per two seconds. */
  speed: number;
  /** The accessible name. An empty label hides the indicator from assistive technology. */
  label: string;
  /** Frames per second ceiling. */
  fps: number;
}

export const defaults: SpinnerProps = {
  size: 4,
  speed: 1,
  label: "Loading",
  fps: 15,
  paused: false,
  time: null,
  seed: 1,
};

interface SpinnerPoint {
  x: number;
  y: number;
  glyph: string;
}

const spinnerClamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));

/** A braille line that follows every edge meeting at one perimeter cell. */
function spinnerEdgeGlyph(x: number, y: number, size: number): string {
  let bits = 0;
  if (y === 0) bits |= brailleDot(0, 0) | brailleDot(0, 1);
  if (x === size - 1) for (let row = 0; row < 4; row++) bits |= brailleDot(row, 1);
  if (y === size - 1) bits |= brailleDot(3, 0) | brailleDot(3, 1);
  if (x === 0) for (let row = 0; row < 4; row++) bits |= brailleDot(row, 0);
  return braille(bits);
}

/** Unique perimeter cells in clockwise order, starting at the top left. */
function spinnerPath(size: number): SpinnerPoint[] {
  const points: SpinnerPoint[] = [];
  const add = (x: number, y: number): void => {
    points.push({ x, y, glyph: spinnerEdgeGlyph(x, y, size) });
  };
  for (let x = 0; x < size; x++) add(x, 0);
  for (let y = 1; y < size; y++) add(size - 1, y);
  for (let x = size - 2; x >= 0; x--) add(x, size - 1);
  for (let y = size - 2; y > 0; y--) add(0, y);
  return points;
}

function spinnerRules(selector: string, size: number): string {
  return [
    `${selector}{display:inline-block;width:${size}ch;height:${size}em;overflow:visible;vertical-align:-0.15em;font-family:${GRID_FONT};line-height:1}`,
    `${selector}>[data-pica-spinner]{display:grid;grid-template-columns:repeat(${size},1ch);grid-template-rows:repeat(${size},1em);width:max-content;height:max-content;pointer-events:none;user-select:none;white-space:pre;font-kerning:none;font-variant-ligatures:none}`,
    `${selector}>[data-pica-spinner]>span{display:block;width:1ch;height:1em;line-height:1;text-align:center}`,
  ].join("\n");
}

export const mount: Mount<SpinnerProps> = (host, initial = {}) => {
  let props: SpinnerProps = { ...defaults, ...initial };
  let size = Math.round(spinnerClamp(props.size, 3, 9));
  let path: SpinnerPoint[] = [];
  let cells: HTMLSpanElement[] = [];
  const sheet = scope(host);
  const view = document.createElement("span");
  view.setAttribute("data-pica", "");
  view.setAttribute("data-pica-spinner", "");
  view.setAttribute("aria-hidden", "true");
  host.appendChild(view);

  function build(): void {
    path = spinnerPath(size);
    cells = [];
    view.replaceChildren();
    for (let i = 0; i < size * size; i++) {
      const cell = document.createElement("span");
      cell.setAttribute("data-pica", "");
      view.appendChild(cell);
      cells.push(cell);
    }
    sheet.setRules(spinnerRules(sheet.selector, size));
  }

  function draw(t: number): void {
    for (const cell of cells) cell.textContent = "";
    const speed = spinnerClamp(props.speed, 0.25, 3);
    const lead = Math.floor((t * speed * path.length) / 2000) % path.length;
    const colors = [cssVar("accent"), cssVar("fg"), cssVar("muted")];
    for (let tail = 0; tail < colors.length; tail++) {
      const point = path[(lead - tail + path.length) % path.length];
      if (!point) continue;
      const cell = cells[point.y * size + point.x];
      if (!cell) continue;
      cell.textContent = point.glyph;
      cell.style.color = colors[tail] ?? cssVar("muted");
    }
  }

  labelHost(host, props.label, "status");
  build();
  const loop = createLoop({
    el: host,
    fps: spinnerClamp(props.fps, 1, 30),
    paused: props.paused,
    time: props.time,
    still: 1200,
    frame: draw,
  });
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const previousSize = size;
      props = { ...props, ...next };
      size = Math.round(spinnerClamp(props.size, 3, 9));
      labelHost(host, props.label, "status");
      if (size !== previousSize) build();
      loop.update({
        paused: props.paused,
        time: props.time,
        fps: spinnerClamp(props.fps, 1, 30),
      });
      loop.redraw();
    },
    destroy() {
      loop.destroy();
      view.remove();
      sheet.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
