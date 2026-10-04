import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope, styleHost } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ScrollAreaProps {
  /** Height of the scrollable region in rem. */
  height: number;
  /** Shows a slim position marker at the end edge. */
  thumb: boolean;
  /** Shows hairline rules when content continues beyond an edge. */
  edges: boolean;
  /** Accessible name used while the content overflows. */
  label: string;
}

export const defaults: ScrollAreaProps = {
  height: 14,
  thumb: true,
  edges: true,
  label: "Content",
};

function scrollAreaHeight(value: number): number {
  if (!Number.isFinite(value)) return defaults.height;
  return Math.min(40, Math.max(4, value));
}

function scrollAreaNode(name: string, tag: "div" | "span" = "div"): HTMLElement {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  el.setAttribute(`data-pica-scroll-${name}`, "");
  return el;
}

function scrollAreaRules(selector: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  return [
    `${selector}{box-sizing:border-box;scrollbar-width:none;-ms-overflow-style:none}`,
    `${selector}::-webkit-scrollbar{display:none;width:0;height:0}`,
    `${selector}:focus-visible{outline:2px solid ${fg};outline-offset:2px}`,
    `${selector}>[data-pica-scroll-layer]{position:sticky;top:0;height:0;overflow:visible;pointer-events:none;z-index:1}`,
    `${selector} [data-pica-scroll-top],${selector} [data-pica-scroll-bottom]{position:absolute;inset-inline:0;height:1px;background:${muted}}`,
    `${selector} [data-pica-scroll-thumb]{position:absolute;inset-inline-end:3px;width:2px;background:color-mix(in srgb, ${fg} 42%, transparent)}`,
    `${selector}>[data-scroll-rows]{list-style:none;margin:0;padding:0 12px 0 0}`,
    `${selector}>[data-scroll-rows]>li{box-sizing:border-box;display:grid;grid-template-columns:3ch 1fr;gap:1rem;align-items:center;min-height:2rem;border-bottom:1px solid color-mix(in srgb, ${muted} 38%, transparent)}`,
    `${selector}>[data-scroll-rows]>li>span{color:${muted};font-family:${GRID_FONT};font-size:.75em;font-variant-numeric:tabular-nums}`,
  ].join("\n");
}

export const mount: Mount<ScrollAreaProps> = (host, initial = {}) => {
  let props: ScrollAreaProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const edgeLayer = scrollAreaNode("layer");
  const topEdge = scrollAreaNode("top", "span");
  const bottomEdge = scrollAreaNode("bottom", "span");
  const thumbLayer = scrollAreaNode("layer");
  const thumbMark = scrollAreaNode("thumb", "span");
  edgeLayer.setAttribute("aria-hidden", "true");
  thumbLayer.setAttribute("aria-hidden", "true");
  edgeLayer.append(topEdge, bottomEdge);
  thumbLayer.append(thumbMark);
  host.prepend(edgeLayer, thumbLayer);
  sheet.setRules(scrollAreaRules(sheet.selector));

  let styledHeight = scrollAreaHeight(props.height);
  let restoreHost = styleHost(host, { height: `${styledHeight}rem`, "min-height": "0", "overflow-y": "auto" });

  function refresh(): void {
    const viewport = host.clientHeight;
    const content = host.scrollHeight;
    const maxScroll = Math.max(0, content - viewport);
    const position = Math.min(maxScroll, Math.max(0, host.scrollTop));
    const overflowing = maxScroll > 1;
    const name = props.label.trim();

    attrs.set("tabindex", overflowing ? "0" : null);
    attrs.set("role", overflowing && name ? "region" : null);
    attrs.set("aria-label", overflowing && name ? name : null);

    edgeLayer.hidden = !props.edges || !overflowing;
    topEdge.style.opacity = position > 1 ? "1" : "0";
    bottomEdge.style.top = `${Math.max(0, viewport - 1)}px`;
    bottomEdge.style.opacity = position < maxScroll - 1 ? "1" : "0";

    thumbLayer.hidden = !props.thumb || !overflowing;
    const inset = 4;
    const track = Math.max(0, viewport - inset * 2);
    const thumbHeight = Math.min(track, Math.max(18, Math.round(track * viewport / content)));
    const travel = Math.max(0, track - thumbHeight);
    const thumbTop = inset + (maxScroll ? position / maxScroll * travel : 0);
    thumbMark.style.top = `${thumbTop}px`;
    thumbMark.style.height = `${thumbHeight}px`;
  }

  const observer = new ResizeObserver(refresh);
  const onScroll = (): void => refresh();
  host.addEventListener("scroll", onScroll, { passive: true });
  observer.observe(host);
  refresh();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      const nextHeight = scrollAreaHeight(props.height);
      if (nextHeight !== styledHeight) {
        restoreHost();
        styledHeight = nextHeight;
        restoreHost = styleHost(host, { height: `${styledHeight}rem`, "min-height": "0", "overflow-y": "auto" });
      }
      refresh();
    },
    destroy() {
      observer.disconnect();
      host.removeEventListener("scroll", onScroll);
      edgeLayer.remove();
      thumbLayer.remove();
      sheet.destroy();
      attrs.restore();
      restoreHost();
      delete host.dataset.picaReady;
    },
  };
};
