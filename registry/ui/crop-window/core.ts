import { emitter } from "../../../lib/events";
import { hostAttributes, scope, styleHost } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface CropWindowRect {
  /** Left edge as a fraction of the host width. */
  left: number;
  /** Top edge as a fraction of the host height. */
  top: number;
  /** Right edge as a fraction of the host width. */
  right: number;
  /** Bottom edge as a fraction of the host height. */
  bottom: number;
}

export interface CropWindowProps {
  /** Controlled normalized edges, or null to let the crop manage its own rectangle. */
  value: CropWindowRect | null;
  /** Initial normalized edges, read once when value is null. */
  defaultValue: CropWindowRect;
  /** Positive crop width/height ratio in rendered pixels; null permits independent edges. */
  aspectRatio: number | null;
  /** Accessible name for the crop and its four keyboard-adjustable edges. */
  label: string;
}

export interface CropWindowEvents {
  /** Requested normalized crop edges, constrained to the host and optional aspect ratio. */
  valueChange: CropWindowRect;
}

export const defaults: CropWindowProps = {
  value: null,
  defaultValue: { left: 0.16, top: 0.18, right: 0.84, bottom: 0.82 },
  aspectRatio: null,
  label: "Crop region",
};

const CROP_EDGES = ["left", "top", "right", "bottom"] as const;
type CropEdge = typeof CROP_EDGES[number];
const CROP_MIN = 0.03;

function cropNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function cropClamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function cropPart<K extends keyof HTMLElementTagNameMap>(tag: K, part: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-part", part);
  return node;
}

export const mount: Mount<CropWindowProps> = (host, initial = {}) => {
  let props: CropWindowProps = { ...defaults, ...initial };
  let alive = true;
  let current = constrain(props.value ?? props.defaultValue);
  let drag: { edge: CropEdge; pointer: number; x: number; y: number; width: number; height: number; start: CropWindowRect; handle: HTMLButtonElement } | null = null;
  const attributes = hostAttributes(host);
  // scope owns the temporary selector; preserve an existing selector attribute too.
  attributes.set("data-pica-id", host.getAttribute("data-pica-id"));
  const sheet = scope(host);
  const restore = styleHost(host, {
    ...(getComputedStyle(host).position === "static" ? { position: "relative" } : {}),
    overflow: "hidden",
    "background-color": cssVar("bg"),
  });
  const emit = emitter<CropWindowEvents>(host);
  const abort = new AbortController();
  const on = { signal: abort.signal };
  const root = cropPart("div", "crop-overlay");
  const frame = cropPart("div", "crop-frame");
  frame.setAttribute("aria-hidden", "true");
  for (const part of ["third-x-1", "third-x-2", "third-y-1", "third-y-2"]) {
    frame.append(cropPart("div", part));
  }
  root.append(frame);
  const handles = CROP_EDGES.map((edge) => {
    const handle = cropPart("button", `edge-${edge}`);
    handle.type = "button";
    handle.setAttribute("role", "slider");
    handle.setAttribute("aria-orientation", edge === "left" || edge === "right" ? "horizontal" : "vertical");
    handle.textContent = edge === "left" || edge === "right" ? "|" : "--";
    root.append(handle);
    return handle;
  });
  host.append(root);
  const s = sheet.selector;
  const p = (name: string): string => `${s} [data-part="${name}"]`;
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const bg = cssVar("bg");
  sheet.setRules([
    `${p("crop-overlay")}{position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden}`,
    `${p("crop-frame")}{position:absolute;box-sizing:border-box;border:1px solid ${fg};box-shadow:0 0 0 100vmax color-mix(in srgb,${fg} 13%,transparent);pointer-events:none}`,
    `${p("crop-frame")} [data-part]{position:absolute;pointer-events:none;background:color-mix(in srgb,${fg} 24%,transparent)}`,
    `${p("third-x-1")},${p("third-x-2")}{top:0;bottom:0;width:1px}`,
    `${p("third-x-1")}{left:33.333333%}${p("third-x-2")}{left:66.666667%}`,
    `${p("third-y-1")},${p("third-y-2")}{left:0;right:0;height:1px}`,
    `${p("third-y-1")}{top:33.333333%}${p("third-y-2")}{top:66.666667%}`,
    `${s} [data-part^="edge-"]{position:absolute;box-sizing:border-box;width:44px;height:44px;margin:0;padding:0;transform:translate(-50%,-50%);display:grid;place-items:center;pointer-events:auto;touch-action:none;user-select:none;border:0;border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1;cursor:ew-resize}`,
    `${s} [data-part^="edge-"]::before{content:"";position:absolute;inset:13px;border:2px solid ${accent};background:${bg};z-index:-1}`,
    `${p("edge-top")},${p("edge-bottom")}{cursor:ns-resize}`,
    `${s} [data-part^="edge-"]:hover::before,${s} [data-part^="edge-"][data-dragging="true"]::before{background:${accent}}`,
    `${s} [data-part^="edge-"]:hover,${s} [data-part^="edge-"][data-dragging="true"]{color:${cssOn("accent")}}`,
    `${s} [data-part^="edge-"]:focus-visible{outline:none}`,
    `${s} [data-part^="edge-"]:focus-visible::before{outline:2px solid ${fg};outline-offset:3px}`,
  ].join("\n"));

  function ratio(): number | null {
    const raw = props.aspectRatio;
    if (raw === null || !Number.isFinite(raw) || raw <= 0) return null;
    return cropClamp(raw * Math.max(1, host.clientHeight) / Math.max(1, host.clientWidth), 0.001, 1000);
  }

  function constrain(raw: CropWindowRect): CropWindowRect {
    const fallback = defaults.defaultValue;
    let left = cropClamp(cropNumber(raw?.left, fallback.left), 0, 1);
    let right = cropClamp(cropNumber(raw?.right, fallback.right), 0, 1);
    let top = cropClamp(cropNumber(raw?.top, fallback.top), 0, 1);
    let bottom = cropClamp(cropNumber(raw?.bottom, fallback.bottom), 0, 1);
    if (right < left) [left, right] = [right, left];
    if (bottom < top) [top, bottom] = [bottom, top];
    const r = ratio();
    let width = Math.max(CROP_MIN, right - left);
    let height = Math.max(CROP_MIN, bottom - top);
    if (r !== null) {
      const minWidth = CROP_MIN * Math.min(1, r);
      width = cropClamp(Math.sqrt(width * height * r), minWidth, Math.min(1, r));
      height = width / r;
    }
    const cx = cropClamp((left + right) / 2, width / 2, 1 - width / 2);
    const cy = cropClamp((top + bottom) / 2, height / 2, 1 - height / 2);
    return { left: cx - width / 2, top: cy - height / 2, right: cx + width / 2, bottom: cy + height / 2 };
  }

  function shown(): CropWindowRect {
    return constrain(props.value ?? current);
  }

  function moveEdge(base: CropWindowRect, edge: CropEdge, position: number): CropWindowRect {
    const next = { ...base };
    const r = ratio();
    if (r === null) {
      if (edge === "left") next.left = cropClamp(position, 0, base.right - CROP_MIN);
      if (edge === "right") next.right = cropClamp(position, base.left + CROP_MIN, 1);
      if (edge === "top") next.top = cropClamp(position, 0, base.bottom - CROP_MIN);
      if (edge === "bottom") next.bottom = cropClamp(position, base.top + CROP_MIN, 1);
      return next;
    }
    if (edge === "left" || edge === "right") {
      const cy = (base.top + base.bottom) / 2;
      const opposite = edge === "left" ? base.right : base.left;
      const room = edge === "left" ? opposite : 1 - opposite;
      const width = cropClamp(Math.abs(opposite - cropClamp(position, edge === "left" ? 0 : opposite, edge === "left" ? opposite : 1)),
        CROP_MIN * Math.min(1, r), Math.min(room, 2 * Math.min(cy, 1 - cy) * r));
      next.left = edge === "left" ? opposite - width : opposite;
      next.right = edge === "left" ? opposite : opposite + width;
      next.top = cy - width / r / 2;
      next.bottom = cy + width / r / 2;
    } else {
      const cx = (base.left + base.right) / 2;
      const opposite = edge === "top" ? base.bottom : base.top;
      const room = edge === "top" ? opposite : 1 - opposite;
      const height = cropClamp(Math.abs(opposite - cropClamp(position, edge === "top" ? 0 : opposite, edge === "top" ? opposite : 1)),
        CROP_MIN * Math.min(1, 1 / r), Math.min(room, 2 * Math.min(cx, 1 - cx) / r));
      next.top = edge === "top" ? opposite - height : opposite;
      next.bottom = edge === "top" ? opposite : opposite + height;
      next.left = cx - height * r / 2;
      next.right = cx + height * r / 2;
    }
    return next;
  }

  function paint(): void {
    if (!alive) return;
    const rect = shown();
    const label = String(props.label ?? "").trim();
    attributes.set("role", "group");
    attributes.set("aria-label", label || null);
    attributes.set("aria-hidden", null);
    const percent = (value: number): string => `${value * 100}%`;
    frame.style.left = percent(rect.left);
    frame.style.top = percent(rect.top);
    frame.style.width = percent(rect.right - rect.left);
    frame.style.height = percent(rect.bottom - rect.top);
    for (const [index, edge] of CROP_EDGES.entries()) {
      const handle = handles[index]!;
      const horizontal = edge === "left" || edge === "right";
      handle.style.left = percent(horizontal ? rect[edge] : (rect.left + rect.right) / 2);
      handle.style.top = percent(horizontal ? (rect.top + rect.bottom) / 2 : rect[edge]);
      handle.setAttribute("aria-label", `${label || "Crop"} ${edge} edge`);
      const min = moveEdge(rect, edge, 0)[edge];
      const max = moveEdge(rect, edge, 1)[edge];
      handle.setAttribute("aria-valuemin", (min * 100).toFixed(3));
      handle.setAttribute("aria-valuemax", (max * 100).toFixed(3));
      handle.setAttribute("aria-valuenow", (rect[edge] * 100).toFixed(3));
      handle.setAttribute("aria-valuetext", `${(rect[edge] * 100).toFixed(1)} percent; crop ${(rect.right - rect.left) * 100 > 0 ? ((rect.right - rect.left) * 100).toFixed(1) : "0"} percent wide, ${((rect.bottom - rect.top) * 100).toFixed(1)} percent high`);
    }
    attributes.set("data-pica-ready", "true");
  }

  function choose(candidate: CropWindowRect): void {
    const next = Object.fromEntries(CROP_EDGES.map((edge) => [edge, Number(cropClamp(candidate[edge], 0, 1).toFixed(6))])) as unknown as CropWindowRect;
    const previous = shown();
    const equal = CROP_EDGES.every((edge) => Math.abs(next[edge] - previous[edge]) < 0.0000005);
    if (equal) return;
    if (props.value === null) current = next;
    paint();
    emit("valueChange", { ...next });
  }

  function endDrag(): void {
    if (!drag) return;
    const ended = drag;
    drag = null;
    ended.handle.removeAttribute("data-dragging");
    if (ended.handle.hasPointerCapture(ended.pointer)) ended.handle.releasePointerCapture(ended.pointer);
  }

  for (const [index, edge] of CROP_EDGES.entries()) {
    const handle = handles[index]!;
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || drag) return;
      event.preventDefault();
      handle.focus({ preventScroll: true });
      const box = host.getBoundingClientRect();
      drag = { edge, pointer: event.pointerId, x: event.clientX, y: event.clientY,
        width: Math.max(1, box.width), height: Math.max(1, box.height), start: shown(), handle };
      handle.setAttribute("data-dragging", "true");
      handle.setPointerCapture(event.pointerId);
    }, on);
    handle.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointer !== event.pointerId) return;
      const horizontal = edge === "left" || edge === "right";
      const delta = horizontal ? (event.clientX - drag.x) / drag.width : (event.clientY - drag.y) / drag.height;
      choose(moveEdge(drag.start, edge, drag.start[edge] + delta));
    }, on);
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
      handle.addEventListener(name, (event) => { if (drag?.pointer === event.pointerId) endDrag(); }, on);
    }
    handle.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && drag) {
        event.preventDefault();
        const start = drag.start;
        endDrag();
        choose(start);
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const horizontal = edge === "left" || edge === "right";
      const positive = horizontal ? "ArrowRight" : "ArrowDown";
      const negative = horizontal ? "ArrowLeft" : "ArrowUp";
      const rect = shown();
      let position: number;
      if (event.key === "Home") position = 0;
      else if (event.key === "End") position = 1;
      else if (event.key === positive || event.key === "PageUp") position = rect[edge] + (event.shiftKey || event.key === "PageUp" ? 0.05 : 0.01);
      else if (event.key === negative || event.key === "PageDown") position = rect[edge] - (event.shiftKey || event.key === "PageDown" ? 0.05 : 0.01);
      else return;
      event.preventDefault();
      choose(moveEdge(rect, edge, position));
    }, on);
  }

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    if (!alive) return;
    endDrag();
    if (props.value === null) current = constrain(current);
    paint();
  }) : null;
  observer?.observe(host);
  paint();

  return {
    update(next) {
      if (!alive) return;
      const previous = shown();
      const before = props;
      props = { ...props, ...next };
      const valueChanged = !sameJson(before.value, props.value);
      const ratioChanged = before.aspectRatio !== props.aspectRatio;
      if (valueChanged || ratioChanged) {
        if (ratioChanged) endDrag();
        current = constrain(props.value ?? previous);
      }
      if (valueChanged || ratioChanged || before.label !== props.label) paint();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      endDrag();
      abort.abort();
      observer?.disconnect();
      root.remove();
      sheet.destroy();
      restore();
      attributes.restore();
    },
  };
};
