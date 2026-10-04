import { labelHost } from "../../../lib/a11y";
import { leftEighth } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, styleHost } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface MeterProps {
  /** The current value shown by the meter. */
  value: number;
  /** The lower bound of the range. */
  min: number;
  /** The upper bound of the range. */
  max: number;
  /** The visible and accessible name of the meter. An empty label hides it. */
  label: string;
  /** A threshold marked on the track, or null for no marker. */
  marker: number | null;
  /** Text read by assistive technology instead of the raw value. */
  valueText: string;
  /** The width of the track in monospace cells. */
  width: number;
}

export const defaults: MeterProps = {
  value: 64,
  min: 0,
  max: 100,
  label: "Storage used",
  marker: 80,
  valueText: "",
  width: 24,
};

function meterClamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function meterRatio(value: number, min: number, max: number): number {
  if (max === min) return value > min ? 1 : 0;
  return meterClamp((value - min) / (max - min), 0, 1);
}

function meterNode(tag: "div" | "span", part: string): HTMLElement {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-pica-part", part);
  return node;
}

export const mount: Mount<MeterProps> = (host, initial = {}) => {
  let props: MeterProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  for (const name of ["role", "aria-label", "aria-hidden"]) attrs.set(name, host.getAttribute(name));
  const restoreHost = styleHost(host, { display: "inline-block", "vertical-align": "middle" });

  const root = meterNode("div", "root");
  const labelLine = meterNode("div", "label-line");
  const label = meterNode("span", "label");
  const value = meterNode("span", "value");
  const track = meterNode("div", "track");
  const full = meterNode("span", "full");
  const partial = meterNode("span", "partial");
  const empty = meterNode("span", "empty");
  const marker = meterNode("span", "marker");

  root.setAttribute("aria-hidden", "true");
  root.style.cssText = "display:inline-grid;gap:0.45em;max-width:100%";
  labelLine.style.cssText = "display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:1em;min-width:0;line-height:1.2";
  label.style.cssText = "min-width:0;overflow-wrap:anywhere";
  value.style.cssText = `font-family:${GRID_FONT};font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap`;
  track.style.cssText = `position:relative;display:block;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;line-height:1;letter-spacing:0;white-space:pre`;
  full.style.color = cssVar("fg");
  partial.style.color = cssVar("fg");
  empty.style.color = cssVar("muted");
  marker.style.cssText = `position:absolute;top:0;color:${cssVar("accent")};width:1ch;text-align:center`;
  marker.textContent = "│";

  labelLine.append(label, value);
  track.append(full, partial, empty, marker);
  root.append(labelLine, track);
  host.append(root);

  function applyMeter(): void {
    const width = meterClamp(Math.round(props.width), 8, 60);
    const units = meterRatio(props.value, props.min, props.max) * width;
    let fullCells = Math.floor(units);
    let eighths = Math.round((units - fullCells) * 8);
    if (eighths === 8) {
      fullCells += 1;
      eighths = 0;
    }
    const hasPartial = eighths > 0 && fullCells < width;
    const emptyCells = Math.max(0, width - fullCells - (hasPartial ? 1 : 0));

    labelHost(host, props.label, "meter");
    attrs.set("aria-valuemin", String(props.min));
    attrs.set("aria-valuemax", String(props.max));
    attrs.set("aria-valuenow", String(props.value));
    attrs.set("aria-valuetext", props.valueText ? props.valueText : null);
    root.hidden = !props.label;
    label.textContent = props.label;
    value.textContent = String(props.value);
    full.textContent = "█".repeat(fullCells);
    partial.textContent = hasPartial ? leftEighth(eighths) : "";
    empty.textContent = "░".repeat(emptyCells);
    marker.hidden = props.marker === null;
    if (props.marker !== null) {
      const markerCell = Math.min(width - 1, Math.floor(meterRatio(props.marker, props.min, props.max) * width));
      marker.style.left = `${markerCell}ch`;
    }
  }

  applyMeter();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      applyMeter();
    },
    destroy() {
      root.remove();
      attrs.restore();
      restoreHost();
      delete host.dataset.picaReady;
    },
  };
};
