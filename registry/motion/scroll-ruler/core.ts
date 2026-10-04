import { svg } from "../../../lib/chart";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, styleHost } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ScrollRulerProps {
  /** Axis measured and controlled within this host's own scrollable content. */
  orientation: "vertical" | "horizontal";
  /** Tick and readout units: local CSS pixels or percentage of the available scroll range. */
  unit: "px" | "percent";
  /** Accessible name for the local scroll container and its ruler. */
  label: string;
  /** Major tick interval in the chosen unit; crowded labels use integer multiples of this step. */
  tickStep: number;
}

export interface ScrollRulerEvents {
  /** Actual local position and extent in CSS pixels, plus normalized progress; emitted after scrolling input. */
  positionChange: { position: number; extent: number; progress: number };
}

export const defaults: ScrollRulerProps = {
  orientation: "vertical",
  unit: "px",
  label: "Local scroll position",
  tickStep: 100,
};

type ScrollRulerMeasure = { position: number; extent: number; viewport: number; progress: number };

export const mount: Mount<ScrollRulerProps> = (host, initial = {}) => {
  let props: ScrollRulerProps = { ...defaults, ...initial };
  let alive = true;
  let graphic: SVGSVGElement | null = null;
  let trackStart = 0;
  let trackLength = 1;
  let lastPosition = 0;
  let lastExtent = 0;
  const initialTop = host.scrollTop, initialLeft = host.scrollLeft;
  const attrs = hostAttributes(host);
  const restore = styleHost(host, {
    ...(getComputedStyle(host).position === "static" ? { position: "relative" } : {}),
    overflow: "auto",
  });
  const emit = emitter<ScrollRulerEvents>(host);
  const hostId = host.id || nextId("scroll-ruler-host");
  if (!host.id) attrs.set("id", hostId);
  const ruler = document.createElement("div");
  ruler.setAttribute("data-pica", "");
  ruler.setAttribute("data-scroll-ruler", "");
  ruler.setAttribute("role", "scrollbar");
  ruler.setAttribute("tabindex", "0");
  ruler.setAttribute("aria-controls", hostId);
  ruler.style.cssText = `position:absolute;top:0;left:0;z-index:1;box-sizing:border-box;overflow:hidden;cursor:pointer;font-family:${GRID_FONT};color:${cssVar("fg")};background:${cssVar("bg")};touch-action:auto`;
  host.appendChild(ruler);

  function vertical(): boolean { return props.orientation !== "horizontal"; }

  function measure(): ScrollRulerMeasure {
    const viewport = vertical() ? host.clientHeight : host.clientWidth;
    const extent = Math.max(0, (vertical() ? host.scrollHeight : host.scrollWidth) - viewport);
    const raw = vertical() ? host.scrollTop : host.scrollLeft;
    const position = Math.max(0, Math.min(extent, Number.isFinite(raw) ? raw : 0));
    return { position, extent, viewport, progress: extent ? position / extent : 0 };
  }

  function tickStep(): number {
    const raw = Number.isFinite(props.tickStep) ? props.tickStep : defaults.tickStep;
    return Math.max(props.unit === "percent" ? 0.1 : 1, Math.min(100000, raw));
  }

  function text(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded}${props.unit === "percent" ? "%" : "px"}`;
  }

  function accessible(): void {
    attrs.set("role", "group");
    attrs.set("aria-label", props.label || null);
    attrs.set("tabindex", "0");
    ruler.setAttribute("aria-label", props.label || "Local scroll position");
    ruler.setAttribute("aria-orientation", vertical() ? "vertical" : "horizontal");
  }

  function draw(): ScrollRulerMeasure {
    const state = measure();
    if (!alive) return state;
    const isVertical = vertical();
    const width = Math.max(1, isVertical ? Math.min(100, host.clientWidth) : host.clientWidth);
    const height = Math.max(1, isVertical ? host.clientHeight : Math.min(70, host.clientHeight));
    ruler.style.width = `${width}px`;
    ruler.style.height = `${height}px`;
    // Compensate for this local container's offset. The overlay occupies at most its viewport,
    // so it cannot add an artificial main-axis scroll range while following that viewport.
    ruler.style.transform = `translate(${host.scrollLeft + (isVertical ? Math.max(0, host.clientWidth - width) : 0)}px,${host.scrollTop}px)`;
    ruler.setAttribute("aria-valuemin", "0");
    ruler.setAttribute("aria-valuemax", String(Math.round(state.extent)));
    ruler.setAttribute("aria-valuenow", String(Math.round(state.position)));
    ruler.setAttribute("aria-valuetext", `${Math.round(state.position)} pixels of ${Math.round(state.extent)} pixels, ${Math.round(state.progress * 100)} percent`);
    const root = svg("svg", { "data-pica": "", "aria-hidden": "true", viewBox: `0 0 ${width} ${height}`, "font-family": GRID_FONT, "font-size": 10 });
    root.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
    trackStart = isVertical ? 40 : 16;
    trackLength = Math.max(1, (isVertical ? height - 62 : width - 32));
    function line(x1: number, y1: number, x2: number, y2: number, token: "fg" | "muted" | "accent", strokeWidth = 1): void {
      root.appendChild(svg("line", { "data-pica": "", x1, y1, x2, y2, stroke: cssVar(token), "stroke-width": strokeWidth }));
    }
    function label(x: number, y: number, content: string, anchor = "start", token: "fg" | "muted" = "fg"): void {
      const node = svg("text", { "data-pica": "", x, y, fill: cssVar(token), "text-anchor": anchor });
      node.textContent = content;
      root.appendChild(node);
    }
    const end = trackStart + trackLength;
    if (isVertical) line(14, trackStart, 14, end, "muted");
    else line(trackStart, 36, end, 36, "muted");
    const range = props.unit === "percent" ? state.extent ? 100 : 0 : state.extent;
    const current = props.unit === "percent" ? state.progress * 100 : state.position;
    const step = tickStep();
    const maximumLabels = Math.max(1, Math.floor(trackLength / (isVertical ? 42 : 76)));
    const major = step * Math.max(1, Math.ceil(range / step / maximumLabels));
    const minor = major / 5;
    const ticks = range ? Math.min(200, Math.floor(range / minor)) : 0;
    for (let i = 0; i <= ticks; i++) {
      const value = i * minor;
      const at = trackStart + (range ? value / range * trackLength : 0);
      const isMajor = i % 5 === 0;
      if (isVertical) {
        line(14, at, isMajor ? 27 : 20, at, isMajor ? "fg" : "muted");
        if (isMajor && (value === 0 || range - value > major * 0.32)) label(32, at + 3, text(value), "start", "muted");
      } else {
        line(at, 36, at, isMajor ? 46 : 41, isMajor ? "fg" : "muted");
        if (isMajor && (value === 0 || range - value > major * 0.32)) label(at, 59, text(value), value === 0 ? "start" : "middle", "muted");
      }
    }
    if (range) {
      if (isVertical) { line(14, end, 27, end, "fg"); label(32, end + 3, text(range), "start", "muted"); }
      else { line(end, 36, end, 46, "fg"); label(end, 59, text(range), "end", "muted"); }
    }
    const indicator = trackStart + state.progress * trackLength;
    if (isVertical) {
      line(5, indicator, 27, indicator, "accent", 3);
      label(8, 15, text(current));
      label(8, 28, `/ ${text(range)}`, "start", "muted");
    } else {
      line(indicator, 28, indicator, 46, "accent", 3);
      label(16, 17, `${text(current)} / ${text(range)}`);
      label(width - 16, 17, `${Math.round(state.progress * 100)}%`, "end", "muted");
    }
    graphic?.remove();
    graphic = root;
    ruler.appendChild(root);
    attrs.set("data-pica-ready", "true");
    return state;
  }

  function report(state: ScrollRulerMeasure): void {
    if (Math.abs(state.position - lastPosition) < 0.01 && state.extent === lastExtent) return;
    lastPosition = state.position;
    lastExtent = state.extent;
    emit("positionChange", { position: state.position, extent: state.extent, progress: state.progress });
  }

  function seek(position: number): void {
    const state = measure();
    const next = Math.max(0, Math.min(state.extent, position));
    if (vertical()) host.scrollTop = next;
    else host.scrollLeft = next;
    report(draw());
  }

  const onScroll = (): void => { if (alive) report(draw()); };
  const onKey = (event: KeyboardEvent): void => {
    if (event.target !== ruler && event.target !== host) return;
    const state = measure();
    const step = props.unit === "percent" ? state.extent * tickStep() / 100 : tickStep();
    let position: number;
    switch (event.key) {
      case "Home": position = 0; break;
      case "End": position = state.extent; break;
      case "PageDown": position = state.position + state.viewport * 0.9; break;
      case "PageUp": position = state.position - state.viewport * 0.9; break;
      case "ArrowDown": if (!vertical()) return; position = state.position + step; break;
      case "ArrowUp": if (!vertical()) return; position = state.position - step; break;
      case "ArrowRight": if (vertical()) return; position = state.position + step; break;
      case "ArrowLeft": if (vertical()) return; position = state.position - step; break;
      default: return;
    }
    event.preventDefault();
    seek(position);
  };
  const onClick = (event: MouseEvent): void => {
    ruler.focus({ preventScroll: true });
    const rect = ruler.getBoundingClientRect();
    const coordinate = vertical() ? event.clientY - rect.top : event.clientX - rect.left;
    if (coordinate < trackStart - 8 || coordinate > trackStart + trackLength + 8) return;
    const progress = Math.max(0, Math.min(1, (coordinate - trackStart) / trackLength));
    seek(measure().extent * progress);
  };
  const refresh = (): void => {
    if (!alive) return;
    const state = draw();
    // Layout and prop changes are observations, never input events.
    lastPosition = state.position;
    lastExtent = state.extent;
  };
  host.addEventListener("scroll", onScroll, { passive: true });
  host.addEventListener("keydown", onKey);
  ruler.addEventListener("click", onClick);
  host.addEventListener("load", refresh, true);
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(refresh) : null;
  function observeContent(): void {
    resize?.disconnect();
    resize?.observe(host);
    for (const child of Array.from(host.children)) if (child !== ruler) resize?.observe(child);
  }
  const mutations = typeof MutationObserver === "function" ? new MutationObserver((records) => {
    if (!alive || !records.some((record) => record.target !== ruler && !ruler.contains(record.target))) return;
    observeContent();
    refresh();
  }) : null;
  accessible();
  refresh();
  observeContent();
  mutations?.observe(host, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["style", "class", "hidden", "src", "width", "height"] });
  document.fonts.addEventListener("loadingdone", refresh);

  return {
    update(next) {
      if (!alive) return;
      props = { ...props, ...next };
      accessible();
      refresh();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      mutations?.disconnect();
      resize?.disconnect();
      host.removeEventListener("scroll", onScroll);
      host.removeEventListener("keydown", onKey);
      ruler.removeEventListener("click", onClick);
      host.removeEventListener("load", refresh, true);
      document.fonts.removeEventListener("loadingdone", refresh);
      ruler.remove();
      graphic = null;
      attrs.restore();
      restore();
      host.scrollTop = initialTop;
      host.scrollLeft = initialLeft;
    },
  };
};
