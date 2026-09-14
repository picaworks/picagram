import { leftEighth, shade } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ProgressProps {
  /** The current amount, clamped between min and max. */
  value: number;
  /** The lowest value in the range. */
  min: number;
  /** The highest value in the range. */
  max: number;
  /** The visible and accessible name of the progress bar. */
  label: string;
  /** Shows the completed percentage at the end of the label line. */
  showValue: boolean;
  /** The number of cells in the track, from 8 to 80. */
  width: number;
}

export const defaults: ProgressProps = {
  value: 62,
  min: 0,
  max: 100,
  label: "Upload",
  showValue: true,
  width: 40,
};

interface ProgressRange {
  min: number;
  max: number;
  value: number;
  ratio: number;
}

function finiteProgress(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function progressRange(props: ProgressProps): ProgressRange {
  const min = finiteProgress(props.min, defaults.min);
  const requestedMax = finiteProgress(props.max, defaults.max);
  const max = requestedMax > min ? requestedMax : min + 1;
  const requestedValue = finiteProgress(props.value, min);
  const value = Math.max(min, Math.min(max, requestedValue));
  return { min, max, value, ratio: (value - min) / (max - min) };
}

function progressWidth(value: number): number {
  return Math.max(8, Math.min(80, Math.round(finiteProgress(value, defaults.width))));
}

function progressRules(selector: string, width: number): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const fittedSize = (145 / width).toFixed(4);
  return [
    `${selector}{display:grid;place-items:center;box-sizing:border-box;padding:1em;color:${fg};container-type:inline-size}`,
    `${selector} [data-pica-progress="frame"]{display:inline-grid;gap:0.55em;max-inline-size:100%}`,
    `${selector} [data-pica-progress="label"]{display:flex;align-items:baseline;justify-content:space-between;gap:2em;font:inherit;line-height:1.2;color:${fg}}`,
    `${selector} [data-pica-progress="value"]{font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;text-align:right}`,
    `${selector} [data-pica-progress="track"]{display:flex;inline-size:max-content;max-inline-size:100%;overflow:visible;font-family:${GRID_FONT};font-size:min(1em,${fittedSize}cqi);font-variant-ligatures:none;line-height:1;letter-spacing:0;white-space:pre}`,
    `${selector} [data-pica-progress="fill"]{color:${accent}}`,
    `${selector} [data-pica-progress="rest"]{color:${muted}}`,
  ].join("\n");
}

function progressNode(tag: "div" | "span", part: string): HTMLElement {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-pica-progress", part);
  return node;
}

export const mount: Mount<ProgressProps> = (host, initial = {}) => {
  let props: ProgressProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const frame = progressNode("div", "frame");
  const labelLine = progressNode("div", "label");
  const label = progressNode("span", "label-text");
  const value = progressNode("span", "value");
  const track = progressNode("div", "track");
  const fill = progressNode("span", "fill");
  const rest = progressNode("span", "rest");
  const labelId = nextId("pica-progress-label");

  label.id = labelId;
  labelLine.append(label, value);
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-labelledby", labelId);
  track.append(fill, rest);
  frame.append(labelLine, track);
  host.append(frame);

  function draw(): void {
    const range = progressRange(props);
    const width = progressWidth(props.width);
    const eighths = Math.round(range.ratio * width * 8);
    const fullCells = Math.floor(eighths / 8);
    const partial = eighths % 8;
    const partialCells = partial > 0 ? 1 : 0;

    label.textContent = props.label;
    value.textContent = `${Math.round(range.ratio * 100)}%`;
    value.hidden = !props.showValue;
    fill.textContent = `${leftEighth(8).repeat(fullCells)}${partial > 0 ? leftEighth(partial) : ""}`;
    rest.textContent = shade(1).repeat(width - fullCells - partialCells);
    track.setAttribute("aria-valuemin", String(range.min));
    track.setAttribute("aria-valuemax", String(range.max));
    track.setAttribute("aria-valuenow", String(range.value));
    sheet.setRules(progressRules(sheet.selector, width));
  }

  draw();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      draw();
    },
    destroy() {
      frame.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
