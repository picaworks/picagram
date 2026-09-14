import * as ditherWaves from "../../dither/dither-waves/core";
import * as halftoneCss from "../../effects/halftone-css/core";
import * as marquee from "../../motion/marquee/core";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, layer, scope } from "../../../lib/host";
import { changed, sameJson } from "../../../lib/json";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface MaximalistAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface MaximalistHeroProps extends MotionProps {
  /** The largest type in the frame, drawn as dark text on foreground chips. */
  headline: string;
  /** The middle size, a line or two of copy under the headline. */
  subhead: string;
  /** The smallest size, a mono label row above the headline. Empty hides the row. */
  kicker: string;
  /** The text the top and bottom bands scroll. Empty hides both bands. */
  ticker: string;
  /** The boxed figure on the right, the frame's second large type block. Empty hides it. */
  figure: string;
  /** The mono line under the figure. Empty hides it. */
  caption: string;
  /** Rows of the index list beside the headline, numbered automatically. Empty hides the list. */
  index: readonly string[];
  /** The header the index box carries. */
  indexTitle: string;
  /** Calls to action, drawn as links. At most three show; the first draws solid in the accent, the rest outline. */
  actions: readonly MaximalistAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** How strongly the two background fields show, from 0 to 1. */
  intensity: number;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: MaximalistHeroProps = {
  headline: "More is more.",
  subhead: "Two fields deep, four tones wide, and every edge of the frame working.",
  kicker: "Components drawn in text",
  ticker: "ASCII / Dither / Shader / Grid / Type",
  figure: "70+",
  caption: "Components · one palette · four tones",
  index: ["ASCII", "Dither", "Shaders", "Motion", "Sections"],
  indexTitle: "Index",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  intensity: 0.55,
  minHeight: 84,
  paused: false,
  time: null,
  seed: 1,
};

/** The brief caps the calls to action at three. */
const MAX_ACTIONS = 3;
/** Items the ticker bands hold; the marquee clones them to fill any width. */
const TICKER_ITEMS = 3;
/** Rows the index list shows at most; more would crowd the figure out of its column. */
const MAX_INDEX = 6;
/** Host width in pixels under which the board folds into the flow under the headline stack. */
const FIT_MIN = 760;

/** Keeps a 0 to 1 prop inside its range. */
function unit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 30 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** The wave field's share of the intensity. The field has no strength prop of its own, so its whole layer
 *  is dimmed instead, which fades every band evenly toward the ground. Kept under the type but well above
 *  the old floor: the brief wants this coarse lattice plainly visible against the fine dot grid, so the
 *  two fields beat rather than one vanishing into the other. */
function fieldOpacity(intensity: number): string {
  return (0.08 + unit(intensity) * 0.3).toFixed(3);
}

/** The dot grid's share of the intensity, mapped onto its own strength prop. */
function dotStrength(intensity: number): number {
  return Math.round((0.05 + unit(intensity) * 0.15) * 100) / 100;
}

/** Props for the dithered wave field: a coarse interference lattice, slowed to a drift. */
function wavesProps(p: MaximalistHeroProps): Partial<typeof ditherWaves.defaults> {
  return {
    trains: 3,
    period: 64,
    spread: 24,
    angle: 12,
    levels: 3,
    mask: "cluster",
    pixel: 4,
    speed: 0.1,
    fps: 15,
    paused: p.paused,
    time: p.time,
    seed: p.seed,
  };
}

/** Props for the halftone dot grid: fine, uniform, and packed to the edges with no fade. */
function dotsProps(p: MaximalistHeroProps): Partial<typeof halftoneCss.defaults> {
  return { size: 11, dot: 0.26, fade: "none", strength: dotStrength(p.intensity) };
}

/** Props for one ticker band. The bottom band runs the other way, so the two edges counter scroll. */
function bandProps(p: MaximalistHeroProps, direction: "left" | "right"): Partial<typeof marquee.defaults> {
  return { speed: 34, direction, gap: 2.4, pauseOnHover: true, fps: 30, paused: p.paused, time: p.time, seed: p.seed };
}

/** The transform origin a rotated block hangs from, so the block tips around its reading edge. */
function origin(p: MaximalistHeroProps): string {
  return p.align === "center" ? "center" : "left";
}

/** Every scoped rule for the host and the nodes this core adds. The minimum height goes in a :where() rule,
 *  which carries no specificity, so a page that gives this host a height of its own wins. All color comes
 *  from the four palette tokens; prose keeps the page's font, and only labels and the bands set a mono one.
 *  The board's width is a custom property the host's right padding also reads, so the in-flow column can
 *  never slide beneath it; folded or empty it collapses to zero and the padding closes up with it. */
function rules(selector: string, p: MaximalistHeroProps): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const edge = p.align === "center" ? "center" : "flex-start";
  const textAlign = p.align === "center" ? "center" : "start";
  const hang = origin(p);
  const corner = `linear-gradient(${fg}, ${fg})`;
  const tint = `color-mix(in srgb, ${bg} 74%, transparent)`;
  const hairline = `color-mix(in srgb, ${fg} 38%, transparent)`;
  return [
    `:where(${selector}){min-height:${vh(p.minHeight)}vh}`,
    `${selector}{position:relative;isolation:isolate;overflow:hidden;box-sizing:border-box;display:flex;flex-direction:column;align-items:${edge};--maxh-pad:clamp(1.25rem,4vw,3.25rem);--maxh-board:min(37%,23rem);padding:var(--maxh-pad) calc(var(--maxh-pad) + var(--maxh-board)) var(--maxh-pad) var(--maxh-pad)}`,
    `${selector}[data-pica-fit="min"],${selector}[data-pica-plain]{--maxh-board:0rem}`,
    `${selector} > [data-pica-veil]{background:color-mix(in srgb, ${bg} 55%, transparent)}`,
    `${selector} > [data-pica-corners]{position:absolute;inset:0;pointer-events:none;background-image:${corner},${corner},${corner},${corner},${corner},${corner},${corner},${corner};background-repeat:no-repeat;background-size:18px 1px,1px 18px,18px 1px,1px 18px,18px 1px,1px 18px,18px 1px,1px 18px;background-position:10px 10px,10px 10px,right 10px top 10px,right 10px top 10px,left 10px bottom 10px,left 10px bottom 10px,right 10px bottom 10px,right 10px bottom 10px}`,
    `${selector} > [data-pica-rail]{position:absolute;top:50%;left:0.55em;transform:translateY(-50%);writing-mode:vertical-rl;white-space:nowrap;pointer-events:none;font-family:${GRID_FONT};font-size:0.62rem;letter-spacing:0.22em;text-transform:uppercase;color:${muted}}`,
    `${selector} > [data-pica-band]{flex:none;align-self:stretch;margin-left:calc(-1 * var(--maxh-pad));margin-right:calc(0px - var(--maxh-pad) - var(--maxh-board));border-top:1px solid ${fg};border-bottom:1px solid ${fg};background:${bg};padding:0.55em 0;font-family:${GRID_FONT};font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:${fg}}`,
    `${selector} > [data-pica-band="top"]{margin-top:calc(-1 * var(--maxh-pad));border-top:0}`,
    `${selector} > [data-pica-band="bottom"]{margin-top:auto;margin-bottom:calc(-1 * var(--maxh-pad));border-bottom:0}`,
    `${selector} > [data-pica-band] > span{white-space:nowrap}`,
    `${selector} > [data-pica-band] > span > em{font-style:normal;color:${muted}}`,
    `${selector} > [data-pica-stack]{display:flex;flex-direction:column;align-items:${edge};gap:0.9em;margin-top:auto;padding:2em 0 1.1em}`,
    `${selector} [data-pica-kicker]{display:flex;flex-wrap:wrap;align-items:center;gap:0.35em 0.7em;width:100%;max-width:56ch;font-family:${GRID_FONT};font-size:0.74rem;letter-spacing:0.08em;text-transform:uppercase;color:${muted};transform:rotate(-1deg);transform-origin:${hang} center}`,
    `${selector} [data-pica-kicker] > b{flex:none;width:0.6em;height:0.6em;background:${accent}}`,
    `${selector} [data-pica-kicker] > i{flex:1 1 2em;height:1px;background:${muted}}`,
    `${selector} [data-pica-kicker] > span{white-space:nowrap}`,
    // The knockout chip and its text need different colors: the chip paints the page's foreground and the
    // text its inverse. Both jobs need currentColor, so they sit on two nested spans. The outer keeps the
    // inherited color, so its background reads the true foreground even with --pica-fg unset; the inner
    // carries only text in the inverse ink. One element doing both would paint ink on ink.
    `${selector} [data-pica-headline]{margin:0.12em 0 0.24em;font-size:clamp(2.5rem,9.5vw,5.75rem);font-weight:800;line-height:0.98;letter-spacing:-0.02em;text-align:${textAlign};max-width:15ch;transform:rotate(1.2deg);transform-origin:${hang} center}`,
    `${selector} [data-pica-headline] > span{background:${fg};padding:0.05em 0.2em 0.11em;-webkit-box-decoration-break:clone;box-decoration-break:clone}`,
    `${selector} [data-pica-headline] > span > i{font-style:normal;color:${cssOn("fg")}}`,
    `${selector} [data-pica-subhead]{margin:0;font-size:clamp(1.05rem,2.3vw,1.4rem);line-height:1.45;color:${muted};max-width:46ch;text-align:${textAlign};transform:rotate(-0.6deg);transform-origin:${hang} top}`,
    `${selector} > :not([data-pica]){max-width:52ch;text-align:${textAlign}}`,
    `${selector} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;justify-content:${edge};gap:0.7em;max-width:52ch;margin-top:1.2em;margin-bottom:auto;transform:rotate(-0.7deg);transform-origin:${hang} center}`,
    `${selector} > [data-pica-actions]:empty{display:none}`,
    `${selector} > [data-pica-actions] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.62em 1.3em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
    `${selector} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
    `${selector} > [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
    `${selector} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${selector} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    // The board owns the right edge from the top pad to the bottom one. Absolute, so it can always reach
    // band to band; the host's right padding keeps every in-flow child clear of it.
    `${selector} > [data-pica-board]{position:absolute;top:var(--maxh-pad);right:var(--maxh-pad);bottom:var(--maxh-pad);width:var(--maxh-board);display:flex;flex-direction:column;justify-content:center;gap:clamp(0.9em,2.5vh,1.6em)}`,
    `${selector}[data-pica-fit="min"] > [data-pica-board]{position:static;width:auto;align-self:stretch;margin-top:1.4em;justify-content:flex-start}`,
    `${selector} [data-pica-index]{flex:none;border:1px solid ${fg};background:${tint};transform:rotate(0.9deg);transform-origin:right top;font-family:${GRID_FONT};font-size:0.68rem;letter-spacing:0.07em;text-transform:uppercase}`,
    `${selector} [data-pica-index] > div{display:flex;align-items:center;gap:0.7em;padding:0.6em 0.85em;color:${muted}}`,
    `${selector} [data-pica-index] > div > b{flex:none;width:0.55em;height:0.55em;background:${accent}}`,
    `${selector} [data-pica-index] > div > i{flex:1;height:1px;background:${hairline}}`,
    `${selector} [data-pica-index] ul{list-style:none;margin:0;padding:0}`,
    `${selector} [data-pica-index] li{display:flex;gap:0.8em;padding:0.5em 0.85em;border-top:1px solid ${hairline};color:${fg}}`,
    `${selector} [data-pica-index] li > b{flex:none;font-weight:400;color:${muted}}`,
    `${selector} [data-pica-figure]{position:relative;flex:1;min-height:7.5em;display:flex;flex-direction:column;justify-content:flex-end;gap:0.3em;padding:0.75em 0.85em;border:1px solid ${fg};background:${tint};transform:rotate(-1.1deg);transform-origin:left bottom}`,
    `${selector} [data-pica-figure] > b{position:absolute;top:-0.5em;right:-0.5em;width:1em;height:1em;background:${accent}}`,
    `${selector} [data-pica-figure] > strong{display:block;font-size:clamp(2.6rem,6.5vw,5.25rem);font-weight:800;line-height:0.95;letter-spacing:-0.02em;color:${fg}}`,
    `${selector} [data-pica-figure] > span{font-family:${GRID_FONT};font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;color:${muted}}`,
    `${selector} [data-pica-tones]{display:flex;height:0.55em;margin-top:0.55em}`,
    `${selector} [data-pica-tones] > i{flex:1}`,
    `${selector} [data-pica-tones] > i:nth-child(1){background:${fg}}`,
    `${selector} [data-pica-tones] > i:nth-child(2){background:${muted}}`,
    `${selector} [data-pica-tones] > i:nth-child(3){background:${accent}}`,
    `${selector} [data-pica-tones] > i:nth-child(4){background:${bg};box-shadow:inset 0 0 0 1px ${hairline}}`,
  ].join("\n");
}

/** Rebuilds the action links from JSON: the first solid, the rest outline, in source order, at most three. */
function renderActions(container: HTMLElement, actions: readonly MaximalistAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.slice(0, MAX_ACTIONS).entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href;
    a.textContent = action.label;
    container.append(a);
  }
}

/** Refills one band's items from the ticker text. The items are the composed marquee's own wrapped content,
 *  so they stay unmarked: it counts anything carrying data-pica as one of its clones and would skip them. */
function fillBand(band: HTMLElement, ticker: string): void {
  for (const item of Array.from(band.querySelectorAll(":scope > span"))) item.remove();
  for (let i = 0; ticker && i < TICKER_ITEMS; i++) {
    const item = document.createElement("span");
    item.textContent = ticker;
    const sep = document.createElement("em");
    sep.setAttribute("aria-hidden", "true");
    sep.textContent = "  ·  ";
    item.append(sep);
    band.append(item);
  }
}

/** One mounted ticker band: the div, the marquee instance scrolling inside it, and its visibility switch. */
interface Band {
  readonly el: HTMLElement;
  readonly instance: ReturnType<typeof marquee.mount>;
}

/** Builds a band div, fills it with ticker items, and mounts a marquee into it. The band is hidden from
 *  assistive technology as a whole: the same line repeated for width is texture, not copy. */
function mountBand(host: HTMLElement, where: "top" | "bottom", p: MaximalistHeroProps): Band {
  const el = document.createElement("div");
  el.setAttribute("data-pica", "");
  el.setAttribute("data-pica-band", where);
  el.setAttribute("aria-hidden", "true");
  fillBand(el, p.ticker);
  el.style.display = p.ticker ? "" : "none";
  const instance = marquee.mount(el, bandProps(p, where === "top" ? "left" : "right"));
  return { el, instance };
}

/** Creates one element the core owns, marked for identification and named for its part. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

export const mount: Mount<MaximalistHeroProps> = (host, initial = {}) => {
  let props: MaximalistHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const attrs = hostAttributes(host);
  let destroyed = false;

  // The under-layers stack in prepend order: the wave field paints first at the bottom, the dot grid beats
  // over it at a much finer scale, and the bg veil grounds them both. Each layer is this core's own sub-host.
  const veilLayer = layer(host, "under");
  veilLayer.el.setAttribute("data-pica-veil", "");
  const dotsLayer = layer(host, "under");
  const wavesLayer = layer(host, "under");
  wavesLayer.el.style.opacity = fieldOpacity(props.intensity);
  const dots = halftoneCss.mount(dotsLayer.el, dotsProps(props));
  const waves = ditherWaves.mount(wavesLayer.el, wavesProps(props));

  // In-flow content: the top band and the stack go in before the page's own children, the actions and the
  // bottom band after them. Children are never touched; they simply flow between what this core adds.
  const stack = document.createElement("div");
  stack.setAttribute("data-pica", "");
  stack.setAttribute("data-pica-stack", "");

  const kicker = document.createElement("div");
  kicker.setAttribute("data-pica", "");
  kicker.setAttribute("data-pica-kicker", "");
  const tick = document.createElement("b");
  tick.setAttribute("aria-hidden", "true");
  const kickerText = document.createElement("span");
  kickerText.textContent = props.kicker;
  const kickerLine = document.createElement("i");
  kickerLine.setAttribute("aria-hidden", "true");
  const kickerTag = document.createElement("span");
  kickerTag.setAttribute("aria-hidden", "true");
  kickerTag.textContent = "Two fields · four tones";
  kicker.append(tick, kickerText, kickerLine, kickerTag);
  kicker.style.display = props.kicker ? "" : "none";

  const headline = document.createElement("h1");
  headline.setAttribute("data-pica", "");
  headline.setAttribute("data-pica-headline", "");
  const headlineChip = document.createElement("span");
  const headlineText = document.createElement("i");
  headlineText.textContent = props.headline;
  headlineChip.append(headlineText);
  headline.append(headlineChip);
  headline.style.display = props.headline ? "" : "none";

  const subhead = document.createElement("p");
  subhead.setAttribute("data-pica", "");
  subhead.setAttribute("data-pica-subhead", "");
  subhead.textContent = props.subhead;
  subhead.style.display = props.subhead ? "" : "none";

  stack.append(kicker, headline, subhead);

  // The board is this core's second column: a numbered index box over a boxed figure, pinned to the right
  // edge of the frame. On a narrow host it folds into the flow just under the stack.
  const board = part("div", "board");

  const indexBox = part("div", "index");
  const indexHead = document.createElement("div");
  indexHead.setAttribute("data-pica", "");
  const indexTick = document.createElement("b");
  indexTick.setAttribute("aria-hidden", "true");
  const indexTitleEl = document.createElement("span");
  const indexRule = document.createElement("i");
  indexRule.setAttribute("aria-hidden", "true");
  const indexCount = document.createElement("span");
  indexHead.append(indexTick, indexTitleEl, indexRule, indexCount);
  const indexList = document.createElement("ul");
  indexBox.append(indexHead, indexList);

  const figureBox = part("div", "figure");
  const figureTab = document.createElement("b");
  figureTab.setAttribute("aria-hidden", "true");
  const figureText = document.createElement("strong");
  const figureCaption = document.createElement("span");
  const tones = part("span", "tones");
  tones.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 4; i++) {
    const cell = document.createElement("i");
    cell.setAttribute("data-pica", "");
    tones.append(cell);
  }
  figureBox.append(figureTab, figureText, figureCaption, tones);

  board.append(indexBox, figureBox);

  const actions = document.createElement("div");
  actions.setAttribute("data-pica", "");
  actions.setAttribute("data-pica-actions", "");

  const corners = document.createElement("div");
  corners.setAttribute("data-pica", "");
  corners.setAttribute("data-pica-corners", "");
  corners.setAttribute("aria-hidden", "true");

  const rail = document.createElement("div");
  rail.setAttribute("data-pica", "");
  rail.setAttribute("data-pica-rail", "");
  rail.setAttribute("aria-hidden", "true");
  rail.textContent = props.kicker;
  rail.style.display = props.kicker ? "" : "none";

  const bandTop = mountBand(host, "top", props);
  const bandBottom = mountBand(host, "bottom", props);

  host.prepend(stack);
  host.prepend(bandTop.el);
  stack.after(board);
  host.append(actions, bandBottom.el, corners, rail);

  /** The board is real content: an index list the page numbers itself, not a landmark. */
  function renderIndex(): void {
    indexTitleEl.textContent = props.indexTitle;
    const rows = props.index.slice(0, MAX_INDEX);
    indexCount.textContent = rows.length ? `01–${String(rows.length).padStart(2, "0")}` : "";
    indexList.replaceChildren();
    for (const [i, label] of rows.entries()) {
      const li = document.createElement("li");
      li.setAttribute("data-pica", "");
      const n = document.createElement("b");
      n.textContent = String(i + 1).padStart(2, "0");
      const text = document.createElement("span");
      text.textContent = label;
      li.append(n, text);
      indexList.append(li);
    }
    indexBox.style.display = rows.length || props.indexTitle ? "" : "none";
  }

  function renderFigure(): void {
    figureText.textContent = props.figure;
    figureCaption.textContent = props.caption;
    figureCaption.style.display = props.caption ? "" : "none";
    figureBox.style.display = props.figure || props.caption ? "" : "none";
  }

  /** A board with nothing in it lets the column close up: the padding that held its place goes with it. */
  function syncBoard(): void {
    const empty = !props.figure && !props.caption && props.index.length === 0 && !props.indexTitle;
    board.style.display = empty ? "none" : "";
    attrs.set("data-pica-plain", empty ? "" : null);
  }

  /** Below the fold width the board drops out of its column and into the flow under the stack. */
  function measure(): void {
    attrs.set("data-pica-fit", host.clientWidth < FIT_MIN ? "min" : null);
  }

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;

  sheet.setRules(rules(sheet.selector, props));
  renderActions(actions, props.actions);
  renderIndex();
  renderFigure();
  syncBoard();
  measure();
  observer?.observe(host);
  host.dataset.picaReady = "true";

  /** Restyles one band and refills it when the ticker text changes. */
  function syncBand(band: Band): void {
    fillBand(band.el, props.ticker);
    band.el.style.display = props.ticker ? "" : "none";
  }

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };

      if (changed(before, props, ["paused", "time", "seed"])) {
        const motion = { paused: props.paused, time: props.time, seed: props.seed };
        waves.update(wavesProps(props));
        bandTop.instance.update(motion);
        bandBottom.instance.update(motion);
      }
      if (props.intensity !== before.intensity) {
        wavesLayer.el.style.opacity = fieldOpacity(props.intensity);
        dots.update({ strength: dotStrength(props.intensity) });
      }
      if (props.align !== before.align || props.minHeight !== before.minHeight) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (props.headline !== before.headline) {
        headlineText.textContent = props.headline;
        headline.style.display = props.headline ? "" : "none";
      }
      if (props.subhead !== before.subhead) {
        subhead.textContent = props.subhead;
        subhead.style.display = props.subhead ? "" : "none";
      }
      if (props.kicker !== before.kicker) {
        kickerText.textContent = props.kicker;
        rail.textContent = props.kicker;
        kicker.style.display = props.kicker ? "" : "none";
        rail.style.display = props.kicker ? "" : "none";
      }
      if (props.ticker !== before.ticker) {
        syncBand(bandTop);
        syncBand(bandBottom);
      }
      if (props.indexTitle !== before.indexTitle || !sameJson(before.index, props.index)) renderIndex();
      if (props.figure !== before.figure || props.caption !== before.caption) renderFigure();
      if (changed(before, props, ["figure", "caption", "indexTitle"]) || !sameJson(before.index, props.index)) syncBoard();
      if (!sameJson(before.actions, props.actions)) renderActions(actions, props.actions);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      waves.destroy();
      dots.destroy();
      bandTop.instance.destroy();
      bandBottom.instance.destroy();
      // Layers come off in reverse mount order: each one's styleHost captured the host the previous layer
      // left behind, so only the last restore puts back what mount found.
      wavesLayer.remove();
      dotsLayer.remove();
      veilLayer.remove();
      bandTop.el.remove();
      bandBottom.el.remove();
      stack.remove();
      board.remove();
      actions.remove();
      corners.remove();
      rail.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
