import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface RangeBrushProps {
  /** The lowest selectable value. */
  min: number;
  /** The highest selectable value. */
  max: number;
  /** The positive increment between selectable values. */
  step: number;
  /** The current ordered interval, or null for internal state. */
  value: [number, number] | null;
  /** The initial interval, read once at mount. */
  defaultValue: [number, number];
  /** The visible and accessible name of the interval. */
  label: string;
}
export interface RangeBrushEvents {
  /** The ordered interval requested by keyboard or pointer input. */
  valueChange: [number, number];
}
export const defaults: RangeBrushProps = {
  min: 0, max: 100, step: 1, value: null, defaultValue: [25, 75], label: "Selected window",
};
function rangeBrushLimits(p: RangeBrushProps): [number, number] {
  const min = Number.isFinite(p.min) ? p.min : 0;
  return [min, Number.isFinite(p.max) ? Math.max(min, p.max) : min];
}
function rangeBrushStep(p: RangeBrushProps): number {
  return Number.isFinite(p.step) && p.step > 0 ? p.step : 1;
}
function rangeBrushSnap(raw: number, p: RangeBrushProps): number {
  const [min, max] = rangeBrushLimits(p);
  const step = rangeBrushStep(p);
  const bounded = Math.min(max, Math.max(min, Number.isFinite(raw) ? raw : min));
  return Number(Math.min(max, Math.max(min, min + Math.round((bounded - min) / step) * step)).toFixed(10));
}
function rangeBrushPair(value: [number, number], p: RangeBrushProps): [number, number] {
  const a = rangeBrushSnap(value[0], p);
  const b = rangeBrushSnap(value[1], p);
  return a <= b ? [a, b] : [b, a];
}
function rangeBrushRules(s: string): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  return [
    `${s}{display:inline-block;color:${fg};vertical-align:middle}`,
    `${s} [data-part="root"]{box-sizing:border-box;width:min(28rem,80vw);padding:1.4em;background:${bg};border:1px solid ${muted};font-family:${GRID_FONT};font-size:0.875em}`,
    `${s} [data-part="head"]{display:flex;align-items:baseline;justify-content:space-between;gap:1em;line-height:1.5}`,
    `${s} [data-part="label"]{font-size:0.8em;text-transform:uppercase;letter-spacing:0.04em}`,
    `${s} [data-part="value"]{font-variant-numeric:tabular-nums;white-space:nowrap}`,
    `${s} [data-part="track"]{position:relative;height:3.5em;margin:0.5em 0;touch-action:none;user-select:none;cursor:pointer}`,
    `${s} [data-part="rail"]{position:absolute;left:0.75em;right:0.75em;top:50%;height:2px;background:${muted}}`,
    `${s} [data-part="fill"]{position:absolute;top:-2px;height:6px;left:var(--brush-start);width:var(--brush-width);background:${accent}}`,
    `${s} input{appearance:none;-webkit-appearance:none;position:absolute;left:0;top:0;width:100%;height:100%;margin:0;border:0;border-radius:0;background:transparent;pointer-events:none;color:${fg};outline:none;font:inherit}`,
    `${s} input::-webkit-slider-runnable-track{height:2px;background:transparent}`,
    `${s} input::-moz-range-track{height:2px;background:transparent}`,
    `${s} input::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;box-sizing:border-box;width:1.5em;height:2em;margin-top:calc(-1em + 1px);border:2px solid ${fg};border-radius:0;background:${bg};pointer-events:auto;cursor:grab}`,
    `${s} input::-moz-range-thumb{box-sizing:border-box;width:1.5em;height:2em;border:2px solid ${fg};border-radius:0;background:${bg};pointer-events:auto;cursor:grab}`,
    `${s} input:hover::-webkit-slider-thumb,${s} input:focus-visible::-webkit-slider-thumb{background:${accent}}`,
    `${s} input:hover::-moz-range-thumb,${s} input:focus-visible::-moz-range-thumb{background:${accent}}`,
    `${s} input:focus-visible::-webkit-slider-thumb{outline:2px solid ${fg};outline-offset:3px}`,
    `${s} input:focus-visible::-moz-range-thumb{outline:2px solid ${fg};outline-offset:3px}`,
    `${s} [data-part="scale"]{display:flex;justify-content:space-between;color:${muted};font-size:0.8em;font-variant-numeric:tabular-nums}`,
  ].join("\n");
}
export const mount: Mount<RangeBrushProps> = (host, initial = {}) => {
  let props: RangeBrushProps = { ...defaults, ...initial };
  let current = rangeBrushPair(props.value ?? props.defaultValue, props);
  let destroyed = false;
  let active: 0 | 1 = 0;
  let pointerId: number | null = null;
  const emit = emitter<RangeBrushEvents>(host);
  const attributes = hostAttributes(host);
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  const sheet = scope(host);
  const labelId = nextId("pica-range-brush");
  const root = document.createElement("div");
  const head = document.createElement("div");
  const label = document.createElement("span");
  const value = document.createElement("span");
  const track = document.createElement("div");
  const rail = document.createElement("div");
  const fill = document.createElement("div");
  const lower = document.createElement("input");
  const upper = document.createElement("input");
  const scale = document.createElement("div");
  const minLabel = document.createElement("span");
  const maxLabel = document.createElement("span");
  const handles = [lower, upper] as const;
  for (const [node, part] of [
    [root, "root"], [head, "head"], [label, "label"], [value, "value"],
    [track, "track"], [rail, "rail"], [fill, "fill"], [lower, "lower"],
    [upper, "upper"], [scale, "scale"], [minLabel, "minimum"], [maxLabel, "maximum"],
  ] as const) {
    node.setAttribute("data-pica", "");
    node.setAttribute("data-part", part);
  }
  root.setAttribute("role", "group");
  root.setAttribute("aria-labelledby", labelId);
  label.id = labelId;
  rail.setAttribute("aria-hidden", "true");
  scale.setAttribute("aria-hidden", "true");
  value.setAttribute("aria-hidden", "true");
  lower.type = upper.type = "range";
  lower.setAttribute("aria-orientation", "horizontal");
  upper.setAttribute("aria-orientation", "horizontal");
  rail.append(fill);
  track.append(rail, lower, upper);
  head.append(label, value);
  scale.append(minLabel, maxLabel);
  root.append(head, track, scale);
  host.append(root);
  sheet.setRules(rangeBrushRules(sheet.selector));
  function shown(): [number, number] {
    return rangeBrushPair(props.value ?? current, props);
  }
  function render(): void {
    const [min, max] = rangeBrushLimits(props);
    const pair = shown();
    const start = max === min ? 0 : (pair[0] - min) / (max - min);
    const end = max === min ? 0 : (pair[1] - min) / (max - min);
    const name = props.label.trim() || "Selected window";
    label.textContent = name;
    value.textContent = `${pair[0]} — ${pair[1]}`;
    minLabel.textContent = String(min);
    maxLabel.textContent = String(max);
    rail.style.setProperty("--brush-start", `${start * 100}%`);
    rail.style.setProperty("--brush-width", `${(end - start) * 100}%`);
    for (const index of [0, 1] as const) {
      const handle = handles[index];
      handle.min = String(min);
      handle.max = String(max);
      handle.step = "any";
      handle.value = String(pair[index]);
      handle.disabled = min === max;
      handle.setAttribute("aria-label", `${name}: ${index === 0 ? "lower" : "upper"} bound`);
      handle.setAttribute("aria-valuemin", String(index === 0 ? min : pair[0]));
      handle.setAttribute("aria-valuemax", String(index === 0 ? pair[1] : max));
      handle.setAttribute("aria-valuenow", String(pair[index]));
      handle.style.zIndex = index === active ? "2" : "1";
    }
  }
  function choose(index: 0 | 1, raw: number): void {
    const pair = shown();
    const snapped = rangeBrushSnap(raw, props);
    const next: [number, number] = index === 0
      ? [Math.min(snapped, pair[1]), pair[1]]
      : [pair[0], Math.max(snapped, pair[0])];
    if (props.value === null) current = next;
    render();
    if (next[0] !== pair[0] || next[1] !== pair[1]) emit("valueChange", next);
  }
  function pointerValue(event: PointerEvent): number {
    const [min, max] = rangeBrushLimits(props);
    const rect = rail.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
    return min + ratio * (max - min);
  }
  const onPointerDown = (event: PointerEvent): void => {
    const [min, max] = rangeBrushLimits(props);
    if (event.button !== 0 || pointerId !== null || min === max) return;
    event.preventDefault();
    const raw = pointerValue(event);
    const pair = shown();
    if (event.target === lower) active = 0;
    else if (event.target === upper) active = 1;
    else if (Math.abs(raw - pair[0]) !== Math.abs(raw - pair[1])) active = Math.abs(raw - pair[0]) < Math.abs(raw - pair[1]) ? 0 : 1;
    pointerId = event.pointerId;
    track.dataset.dragging = "true";
    handles[active].focus();
    track.setPointerCapture(event.pointerId);
    choose(active, raw);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (pointerId === event.pointerId) choose(active, pointerValue(event));
  };
  const endPointer = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    pointerId = null;
    track.removeAttribute("data-dragging");
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    const index: 0 | 1 = event.currentTarget === lower ? 0 : 1;
    const pair = shown();
    const [min, max] = rangeBrushLimits(props);
    const step = rangeBrushStep(props);
    let next: number;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = pair[index] + step;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = pair[index] - step;
    else if (event.key === "PageUp") next = pair[index] + step * 10;
    else if (event.key === "PageDown") next = pair[index] - step * 10;
    else if (event.key === "Home") next = index === 0 ? min : pair[0];
    else if (event.key === "End") next = index === 0 ? pair[1] : max;
    else return;
    event.preventDefault();
    active = index;
    choose(index, next);
  };
  const onInput = (event: Event): void => {
    const index: 0 | 1 = event.currentTarget === lower ? 0 : 1;
    choose(index, handles[index].valueAsNumber);
  };
  const onFocus = (event: FocusEvent): void => {
    active = event.currentTarget === lower ? 0 : 1;
    render();
  };
  for (const handle of handles) {
    handle.addEventListener("keydown", onKeyDown);
    handle.addEventListener("input", onInput);
    handle.addEventListener("focus", onFocus);
  }
  track.addEventListener("pointerdown", onPointerDown);
  track.addEventListener("pointermove", onPointerMove);
  track.addEventListener("pointerup", endPointer);
  track.addEventListener("pointercancel", endPointer);
  track.addEventListener("lostpointercapture", endPointer);
  render();
  attributes.set("data-pica-ready", "true");
  return {
    update(next) {
      if (destroyed) return;
      const previous = shown();
      props = { ...props, ...next };
      current = rangeBrushPair(props.value ?? previous, props);
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (pointerId !== null && track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
      for (const handle of handles) {
        handle.removeEventListener("keydown", onKeyDown);
        handle.removeEventListener("input", onInput);
        handle.removeEventListener("focus", onFocus);
      }
      track.removeEventListener("pointerdown", onPointerDown);
      track.removeEventListener("pointermove", onPointerMove);
      track.removeEventListener("pointerup", endPointer);
      track.removeEventListener("pointercancel", endPointer);
      track.removeEventListener("lostpointercapture", endPointer);
      root.remove();
      sheet.destroy();
      attributes.restore();
    },
  };
};
