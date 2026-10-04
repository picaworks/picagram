import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { nextId, scope } from "../../../lib/host";
import { changed } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface XyPadProps {
  /** The current [x, y] position, or null to let the pad manage its own. */
  value: [number, number] | null;
  /** The initial [x, y] position when value is null. */
  defaultValue: [number, number];
  /** The limits of the two axes as [xMin, xMax, yMin, yMax]. */
  bounds: [number, number, number, number];
  /** The interval between selectable values on both axes. */
  step: number;
  /** The visible and accessible name of the pad. */
  label: string;
  /** The names of the two numeric fields, x first. */
  axes: [string, string];
  /** The side of the pad in rem. */
  size: number;
}

export interface XyPadEvents {
  /** The user chose a position with the pad or a numeric field, as [x, y]. */
  valueChange: [number, number];
}

export const defaults: XyPadProps = {
  value: null,
  defaultValue: [50, 50],
  bounds: [0, 100, 0, 100],
  step: 1,
  label: "Position",
  axes: ["X", "Y"],
  size: 16,
};

/** The props that shape the labels, the fields' limits, and the stylesheet. */
const xyLayout: readonly (keyof XyPadProps)[] = ["bounds", "step", "label", "axes", "size"];

function xyNumber(raw: unknown, fallback: number): number {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
}

/** The limits as [xMin, xMax, yMin, yMax], repaired when a bound is missing, not a number, or reversed. */
function xyLimits(props: XyPadProps): readonly [number, number, number, number] {
  const raw: readonly unknown[] = Array.isArray(props.bounds) ? props.bounds : [];
  const axis = (at: number): readonly [number, number] => {
    const min = xyNumber(raw[at], 0);
    const max = xyNumber(raw[at + 1], 100);
    return max >= min ? [min, max] : [min, min];
  };
  const [x0, x1] = axis(0);
  const [y0, y1] = axis(2);
  return [x0, x1, y0, y1];
}

function xyStep(props: XyPadProps): number {
  return Number.isFinite(props.step) && props.step > 0 ? props.step : 1;
}

function xySnap(raw: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, xyNumber(raw, min)));
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(10));
}

/** Decimal places in a number as written, so a field shows the precision its step allows. */
function xyPlaces(n: number): number {
  const text = String(n);
  const dot = text.indexOf(".");
  return dot < 0 ? 0 : Math.min(8, text.length - dot - 1);
}

function xyPart<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  name: string,
  ...children: readonly Node[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-part", name);
  node.append(...children);
  return node;
}

function xyRules(s: string, props: XyPadProps, chars: number): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const line = `color-mix(in srgb, ${fg} 35%, transparent)`;
  const size = Math.min(32, Math.max(8, xyNumber(props.size, 16)));
  const part = (name: string): string => `${s} [data-part="${name}"]`;
  const pad = part("pad");
  const thumb = part("thumb");
  const input = `${s} input`;
  // The marker is 0.9rem, and its centre stays 0.45rem inside the pad so it never leaves the frame.
  const x = "calc(0.45rem + (100% - 0.9rem) * var(--xy-x, 0.5))";
  const y = "calc(0.45rem + (100% - 0.9rem) * var(--xy-y, 0.5))";
  const tick = `font-family:${GRID_FONT};font-size:0.75em;line-height:1;font-variant-numeric:tabular-nums;color:${muted}`;
  return [
    `${s}{display:inline-block;color:${fg};vertical-align:middle}`,
    `${part("root")}{display:grid;grid-template-columns:auto auto;justify-content:start;gap:0.4em 0.5em;line-height:1.2}`,
    `${part("label")}{grid-column:1/-1;contain:inline-size}`,
    `${part("yticks")}{display:flex;flex-direction:column;justify-content:space-between;text-align:right;${tick}}`,
    `${part("xticks")}{grid-column:2;display:flex;justify-content:space-between;${tick}}`,
    `${pad}{position:relative;box-sizing:border-box;width:min(${size}rem,100vw - 8rem);aspect-ratio:1;border:1px solid ${line};touch-action:none;-webkit-user-select:none;user-select:none;cursor:crosshair}`,
    `${pad}[data-dragging="true"]{border-color:${fg}}`,
    `${part("h")}{position:absolute;left:0;right:0;top:${y};height:1px;background:${accent};pointer-events:none}`,
    `${part("v")}{position:absolute;top:0;bottom:0;left:${x};width:1px;background:${accent};pointer-events:none}`,
    `${thumb}{position:absolute;box-sizing:border-box;width:0.9rem;height:0.9rem;left:${x};top:${y};transform:translate(-50%,-50%);border:1px solid ${fg};border-radius:0;background:transparent;cursor:grab}`,
    `${thumb}:hover,${pad}[data-dragging="true"] ${thumb}{background:${accent};border-color:${accent}}`,
    `${pad}[data-dragging="true"] ${thumb}{cursor:grabbing}`,
    `${part("fields")}{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:0.4em 0.9em;contain:inline-size}`,
    `${part("field")}{display:flex;align-items:center;gap:0.4em}`,
    `${part("axis")}{color:${muted}}`,
    `${input}{box-sizing:content-box;width:${chars}ch;margin:0;padding:0.2em 0.4em;font:inherit;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;text-align:right;color:${fg};background:transparent;border:1px solid ${line};border-radius:0;-moz-appearance:textfield;appearance:textfield}`,
    `${input}::-webkit-inner-spin-button,${input}::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`,
    `${input}:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${input}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${input}:invalid{box-shadow:none}`,
  ].join("\n");
}

export const mount: Mount<XyPadProps> = (host, initial = {}) => {
  let props: XyPadProps = { ...defaults, ...initial };
  let current: [number, number] = snapPair(props.value ?? props.defaultValue);
  let places = 0;
  let rules = "";
  let dragging = false;
  let pointerId = -1;
  // The field the user is typing in, which paint leaves alone so a half-written number is not overwritten.
  let typing: HTMLInputElement | null = null;
  const emit = emitter<XyPadEvents>(host);
  const sheet = scope(host);
  const abort = new AbortController();
  const on = { signal: abort.signal };
  const labelId = nextId("pica-xy-pad-label");
  const label = xyPart("span", "label");
  const yTicks = [xyPart("span", "tick"), xyPart("span", "tick")] as const;
  const xTicks = [xyPart("span", "tick"), xyPart("span", "tick")] as const;
  const names = [xyPart("span", "axis"), xyPart("span", "axis")] as const;
  const inputs = [xyPart("input", "x"), xyPart("input", "y")] as const;
  const thumb = xyPart("div", "thumb");
  const pad = xyPart("div", "pad", xyPart("div", "h"), xyPart("div", "v"), thumb);
  const left = xyPart("div", "yticks", ...yTicks);
  const base = xyPart("div", "xticks", ...xTicks);
  const fields = xyPart(
    "div",
    "fields",
    xyPart("label", "field", names[0], inputs[0]),
    xyPart("label", "field", names[1], inputs[1]),
  );
  const root = xyPart("div", "root", label, left, pad, base, fields);

  label.id = labelId;
  root.setAttribute("role", "group");
  for (const node of [pad, left, base]) node.setAttribute("aria-hidden", "true");
  for (const input of inputs) {
    input.type = "number";
    input.autocomplete = "off";
  }
  host.append(root);

  function snapPair(raw: readonly number[]): [number, number] {
    const [x0, x1, y0, y1] = xyLimits(props);
    const step = xyStep(props);
    return [xySnap(raw[0] ?? x0, x0, x1, step), xySnap(raw[1] ?? y0, y0, y1, step)];
  }

  function shown(): [number, number] {
    return snapPair(props.value ?? current);
  }

  /** Everything that depends on the props rather than the position. */
  function configure(): void {
    const [x0, x1, y0, y1] = xyLimits(props);
    const step = xyStep(props);
    places = Math.max(xyPlaces(step), xyPlaces(x0), xyPlaces(y0));
    const show = (n: number): string => n.toFixed(places);
    const title = String(props.label ?? "");
    label.textContent = title;
    label.hidden = title === "";
    if (title) root.setAttribute("aria-labelledby", labelId);
    else root.removeAttribute("aria-labelledby");
    yTicks[0].textContent = show(y1);
    yTicks[1].textContent = show(y0);
    xTicks[0].textContent = show(x0);
    xTicks[1].textContent = show(x1);
    const axes = [
      [names[0], inputs[0], x0, x1],
      [names[1], inputs[1], y0, y1],
    ] as const;
    for (const [at, [name, input, min, max]] of axes.entries()) {
      const axis = String(props.axes?.[at] ?? "") || (at === 0 ? "X" : "Y");
      name.textContent = axis;
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.setAttribute("aria-label", title ? `${title} ${axis}` : axis);
    }
    const chars = Math.max(3, ...[x0, x1, y0, y1].map((n) => show(n).length)) + 1;
    const next = xyRules(sheet.selector, props, chars);
    if (next !== rules) {
      rules = next;
      sheet.setRules(next);
    }
  }

  /** The position: the crosshair, and the text of each field that is not being typed in. */
  function paint(): void {
    const [x0, x1, y0, y1] = xyLimits(props);
    const [x, y] = shown();
    const share = (n: number, min: number, max: number): number => (max > min ? (n - min) / (max - min) : 0);
    pad.style.setProperty("--xy-x", String(share(x, x0, x1)));
    pad.style.setProperty("--xy-y", String(1 - share(y, y0, y1)));
    const texts = [x.toFixed(places), y.toFixed(places)];
    inputs.forEach((input, at) => {
      const text = texts[at];
      if (text !== undefined && input !== typing && input.value !== text) input.value = text;
    });
  }

  function choose(raw: readonly number[]): void {
    const next = snapPair(raw);
    const [x, y] = shown();
    const moved = next[0] !== x || next[1] !== y;
    if (moved && props.value === null) current = next;
    paint();
    if (moved) emit("valueChange", next);
  }

  function choosePoint(event: PointerEvent): void {
    const [x0, x1, y0, y1] = xyLimits(props);
    const box = pad.getBoundingClientRect();
    // One pixel of border, then half the marker, so the marker's centre can reach every edge.
    const edge = 1 + thumb.offsetWidth / 2;
    const along = (offset: number, length: number): number =>
      Math.min(1, Math.max(0, (offset - edge) / Math.max(1, length - 2 * edge)));
    choose([
      x0 + along(event.clientX - box.left, box.width) * (x1 - x0),
      y1 - along(event.clientY - box.top, box.height) * (y1 - y0),
    ]);
  }

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    pointerId = event.pointerId;
    typing = null;
    pad.dataset.dragging = "true";
    pad.setPointerCapture(event.pointerId);
    choosePoint(event);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (dragging && event.pointerId === pointerId) choosePoint(event);
  };
  const endPointer = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    dragging = false;
    pointerId = -1;
    pad.removeAttribute("data-dragging");
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    const at = inputs.indexOf(event.target as HTMLInputElement);
    const sign = event.key === "ArrowUp" || event.key === "PageUp" ? 1 : event.key === "ArrowDown" || event.key === "PageDown" ? -1 : 0;
    if (at < 0 || sign === 0 || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    typing = null;
    const jump = event.shiftKey || event.key.startsWith("Page") ? 10 : 1;
    const next: [number, number] = shown();
    next[at] = (next[at] ?? 0) + sign * jump * xyStep(props);
    choose(next);
  };
  const onInput = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    const at = inputs.indexOf(input);
    if (at < 0) return;
    typing = input;
    if (!Number.isFinite(input.valueAsNumber)) return;
    const next: [number, number] = shown();
    next[at] = input.valueAsNumber;
    choose(next);
  };
  const settle = (): void => {
    typing = null;
    paint();
  };

  pad.addEventListener("pointerdown", onPointerDown, on);
  pad.addEventListener("pointermove", onPointerMove, on);
  pad.addEventListener("pointerup", endPointer, on);
  pad.addEventListener("pointercancel", endPointer, on);
  pad.addEventListener("lostpointercapture", endPointer, on);
  fields.addEventListener("keydown", onKeyDown, on);
  fields.addEventListener("input", onInput, on);
  fields.addEventListener("change", settle, on);
  fields.addEventListener("focusout", settle, on);
  configure();
  paint();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      current = snapPair(props.value ?? current);
      if (changed(before, props, xyLayout)) configure();
      paint();
    },
    destroy() {
      abort.abort();
      root.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
