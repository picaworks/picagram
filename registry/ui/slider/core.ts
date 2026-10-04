import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface SliderProps {
  /** The current value, or null to let the slider manage its own value. */
  value: number | null;
  /** The initial value when value is null. */
  defaultValue: number;
  /** The lowest selectable value. */
  min: number;
  /** The highest selectable value. */
  max: number;
  /** The interval between selectable values. */
  step: number;
  /** The amount added or subtracted by Page Up and Page Down. */
  largeStep: number;
  /** The direction in which the track runs. */
  orientation: "horizontal" | "vertical";
  /** The visible and accessible name of the slider. */
  label: string;
  /** Shows the current value beside the label. */
  showValue: boolean;
  /** The track height in rem when orientation is vertical. */
  height: number;
}

export interface SliderEvents {
  /** The user chose a value with the keyboard or pointer. */
  valueChange: number;
}

export const defaults: SliderProps = {
  value: null,
  defaultValue: 30,
  min: 0,
  max: 100,
  step: 1,
  largeStep: 10,
  orientation: "horizontal",
  label: "Volume",
  showValue: true,
  height: 10,
};

function sliderLimits(props: SliderProps): readonly [number, number] {
  return props.max >= props.min ? [props.min, props.max] : [props.min, props.min];
}

function sliderStep(props: SliderProps): number {
  return Number.isFinite(props.step) && props.step > 0 ? props.step : 1;
}

function sliderSnap(raw: number, props: SliderProps): number {
  const [min, max] = sliderLimits(props);
  const step = sliderStep(props);
  const clamped = Math.min(max, Math.max(min, raw));
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(10));
}

function sliderRules(s: string, props: SliderProps): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const vertical = props.orientation === "vertical";
  const height = Math.min(30, Math.max(6, props.height));
  const root = `${s} [data-part="root"]`;
  const head = `${s} [data-part="head"]`;
  const value = `${s} [data-part="value"]`;
  const track = `${s} [data-part="track"]`;
  const rail = `${s} [data-part="rail"]`;
  const fill = `${s} [data-part="fill"]`;
  const thumb = `${s} [data-part="thumb"]`;
  return [
    `${s}{display:inline-block;color:${fg};vertical-align:middle}`,
    `${root}{display:grid;gap:0.35em;${vertical ? "justify-items:center" : "width:min(22rem,80vw)"}}`,
    `${head}{display:flex;align-items:baseline;justify-content:space-between;gap:2em;width:100%;font:inherit;line-height:1.2}`,
    `${value}{font-family:${GRID_FONT};font-variant-numeric:tabular-nums;text-align:right;min-width:4ch}`,
    `${track}{position:relative;touch-action:none;user-select:none;cursor:pointer;${vertical ? `width:2rem;height:${height}rem` : "width:100%;height:2rem"}}`,
    `${rail}{position:absolute;background:color-mix(in srgb, ${fg} 35%, transparent);${vertical ? "top:0.5rem;bottom:0.5rem;left:50%;width:1px" : "left:0.5rem;right:0.5rem;top:50%;height:1px"}}`,
    `${fill}{position:absolute;background:${accent};${vertical ? "left:0;right:0;bottom:0;height:var(--slider-fill)" : "left:0;top:0;bottom:0;width:var(--slider-fill)"}}`,
    `${thumb}{position:absolute;box-sizing:border-box;width:0.9rem;height:0.9rem;border:1px solid ${fg};border-radius:0;background:transparent;cursor:grab;${vertical ? "left:50%;bottom:var(--slider-fill);transform:translate(-50%,50%)" : "top:50%;left:var(--slider-fill);transform:translate(-50%,-50%)"}}`,
    `${thumb}:hover,${track}[data-dragging="true"] ${thumb}{background:${accent};border-color:${accent}}`,
    `${thumb}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${track}[data-dragging="true"] ${thumb}{cursor:grabbing}`,
  ].join("\n");
}

export const mount: Mount<SliderProps> = (host, initial = {}) => {
  let props: SliderProps = { ...defaults, ...initial };
  let current = sliderSnap(props.value ?? props.defaultValue, props);
  let dragging = false;
  let pointerId = -1;
  const emit = emitter<SliderEvents>(host);
  const sheet = scope(host);
  const labelId = nextId("pica-slider-label");
  const root = document.createElement("div");
  const head = document.createElement("div");
  const label = document.createElement("span");
  const value = document.createElement("span");
  const track = document.createElement("div");
  const rail = document.createElement("div");
  const fill = document.createElement("div");
  const thumb = document.createElement("div");

  for (const [node, part] of [
    [root, "root"],
    [head, "head"],
    [label, "label"],
    [value, "value"],
    [track, "track"],
    [rail, "rail"],
    [fill, "fill"],
    [thumb, "thumb"],
  ] as const) {
    node.setAttribute("data-pica", "");
    node.setAttribute("data-part", part);
  }
  label.id = labelId;
  thumb.setAttribute("role", "slider");
  thumb.tabIndex = 0;
  rail.append(fill, thumb);
  track.append(rail);
  head.append(label, value);
  root.append(head, track);
  host.append(root);

  function shownValue(): number {
    return sliderSnap(props.value ?? current, props);
  }

  function render(): void {
    const [min, max] = sliderLimits(props);
    const shown = shownValue();
    const ratio = max === min ? 0 : (shown - min) / (max - min);
    label.textContent = props.label;
    value.textContent = String(shown);
    value.hidden = !props.showValue;
    thumb.setAttribute("aria-labelledby", labelId);
    thumb.setAttribute("aria-valuemin", String(min));
    thumb.setAttribute("aria-valuemax", String(max));
    thumb.setAttribute("aria-valuenow", String(shown));
    if (props.orientation === "vertical") thumb.setAttribute("aria-orientation", "vertical");
    else thumb.removeAttribute("aria-orientation");
    rail.style.setProperty("--slider-fill", `${ratio * 100}%`);
    sheet.setRules(sliderRules(sheet.selector, props));
  }

  function choose(raw: number): void {
    const next = sliderSnap(raw, props);
    if (props.value === null) {
      current = next;
      render();
    }
    emit("valueChange", next);
  }

  function chooseFromPointer(event: PointerEvent): void {
    const rect = rail.getBoundingClientRect();
    const [min, max] = sliderLimits(props);
    const ratio = props.orientation === "vertical"
      ? (rect.bottom - event.clientY) / Math.max(1, rect.height)
      : (event.clientX - rect.left) / Math.max(1, rect.width);
    choose(min + Math.min(1, Math.max(0, ratio)) * (max - min));
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    const shown = shownValue();
    const [min, max] = sliderLimits(props);
    const large = Number.isFinite(props.largeStep) ? Math.abs(props.largeStep) : 10;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = shown + sliderStep(props);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = shown - sliderStep(props);
    else if (event.key === "PageUp") next = shown + large;
    else if (event.key === "PageDown") next = shown - large;
    else if (event.key === "Home") next = min;
    else if (event.key === "End") next = max;
    if (next === null) return;
    event.preventDefault();
    choose(next);
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    pointerId = event.pointerId;
    track.dataset.dragging = "true";
    thumb.focus();
    track.setPointerCapture(event.pointerId);
    chooseFromPointer(event);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (dragging && event.pointerId === pointerId) chooseFromPointer(event);
  };
  const endPointer = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    dragging = false;
    pointerId = -1;
    track.removeAttribute("data-dragging");
  };

  thumb.addEventListener("keydown", onKeyDown);
  track.addEventListener("pointerdown", onPointerDown);
  track.addEventListener("pointermove", onPointerMove);
  track.addEventListener("pointerup", endPointer);
  track.addEventListener("pointercancel", endPointer);
  track.addEventListener("lostpointercapture", endPointer);
  render();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      if (next.value !== undefined && next.value !== null) current = sliderSnap(next.value, props);
      else current = sliderSnap(current, props);
      render();
    },
    destroy() {
      thumb.removeEventListener("keydown", onKeyDown);
      track.removeEventListener("pointerdown", onPointerDown);
      track.removeEventListener("pointermove", onPointerMove);
      track.removeEventListener("pointerup", endPointer);
      track.removeEventListener("pointercancel", endPointer);
      track.removeEventListener("lostpointercapture", endPointer);
      root.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
