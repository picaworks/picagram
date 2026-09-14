import { GRID_FONT } from "../../../lib/font";
import { scope, styleHost } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface SwissHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface SwissHeroProps {
  /** The headline, set large and flush left across eight of the twelve columns. Empty hides it. */
  headline: string;
  /** Supporting copy under the headline, in a narrower measure offset a few columns. Empty hides it. */
  subhead: string;
  /** The small mono metadata block at the top, tracked and uppercase. Newlines start a new line. Empty hides it. */
  kicker: string;
  /** Calls to action, drawn as links in source order. The first is the section's one accent, the rest draw hairline. */
  actions: readonly SwissHeroAction[];
  /** Which side of the grid the composition sits on: "start" hangs it on the left edge, "end" mirrors it to the right. Text stays flush left either way. */
  align: "start" | "end";
  /** Draw the twelve column guides behind the content at a low strength. */
  guides: boolean;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: SwissHeroProps = {
  headline: "Set on a strict grid.",
  subhead: "Twelve columns, one gutter, and nothing placed off it. Type does the ordering; white space does the rest.",
  kicker: "Picagram · component library",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  guides: true,
  minHeight: 60,
};

/** Measurements the host grid and the guides share, so the drawn columns land exactly on the real ones:
 *  the guides are a twelve column grid with the same tracks and gutter, inset by the same padding. */
const TRACKS = "repeat(12, minmax(0, 1fr))";
const GUTTER = "clamp(0.75rem, 2vw, 1.75rem)";
const PAD_BLOCK = "clamp(2.5rem, 8vh, 5.5rem)";
const PAD_INLINE = "clamp(1.25rem, 5vw, 4.5rem)";
const NARROW = "44rem";
const COLUMNS = 12;

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** The column lines each part spans, per side. The headline takes eight of twelve and everything hangs off
 *  one edge; the empty columns are the white space, and "end" mirrors the block without centering it. */
function spans(align: "start" | "end"): { kicker: string; headline: string; subhead: string; actions: string; content: string } {
  return align === "end"
    ? { kicker: "10 / 13", headline: "5 / 13", subhead: "4 / 9", actions: "6 / 13", content: "6 / 13" }
    : { kicker: "1 / 4", headline: "1 / 9", subhead: "5 / 10", actions: "1 / 8", content: "1 / 8" };
}

/** The styles the guides need on the host: a containing block and a stacking context, so the column lines
 *  sit under the content and above the page's ground. The same guard lib/host's layer() uses. */
function hostStyles(host: HTMLElement): Record<string, string> {
  const styles: Record<string, string> = { isolation: "isolate" };
  if (getComputedStyle(host).position === "static") styles.position = "relative";
  return styles;
}

/** Layout for the host and its parts. The host is the grid itself: the page's children and the parts the
 *  core adds are all grid items. Everything explicit takes a row; the children take a column and flow into
 *  the first row below the composition, which is where a hero's own copy belongs. The minimum height sits
 *  in a :where() rule, which carries no specificity, so a page that gives this host a height still wins. */
function rules(selector: string, p: SwissHeroProps): string {
  const s = spans(p.align);
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const guide = `color-mix(in srgb, ${muted} 32%, transparent)`;
  return [
    `:where(${selector}){min-height:${vh(p.minHeight)}vh}`,
    `${selector}{position:relative;isolation:isolate;box-sizing:border-box;display:grid;grid-template-columns:${TRACKS};column-gap:${GUTTER};row-gap:clamp(1.5rem, 4vh, 3rem);align-content:start;padding:${PAD_BLOCK} ${PAD_INLINE};color:${fg}}`,
    `${selector} *{box-sizing:border-box}`,
    `${selector} > *{min-width:0}`,
    `${selector} > :not([data-pica]){grid-column:${s.content};margin:0}`,
    `${selector} [data-pica-rule]{grid-row:1;grid-column:1 / -1;align-self:start;border-top:1px solid ${muted}}`,
    `${selector} [data-pica-kicker]{grid-row:1;grid-column:${s.kicker};margin:0;padding-block-start:1.1em;font-family:${GRID_FONT};font-size:0.72rem;line-height:1.9;letter-spacing:0.1em;text-transform:uppercase;color:${muted};white-space:pre-line}`,
    `${selector} [data-pica-headline]{grid-row:2;grid-column:${s.headline};margin:clamp(2.5rem, 9vh, 6.5rem) 0 0;font-size:clamp(2.4rem, 6vw, 5.25rem);line-height:1.02;font-weight:700;letter-spacing:-0.01em}`,
    `${selector} [data-pica-subhead]{grid-row:3;grid-column:${s.subhead};margin:0;font-size:clamp(1.05rem, 1.5vw, 1.3rem);line-height:1.5;color:${muted}}`,
    `${selector} [data-pica-actions]{grid-row:4;grid-column:${s.actions};display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;margin-block-start:clamp(0.5rem, 2vh, 1.5rem)}`,
    `${selector} [data-pica-actions]:empty{display:none}`,
    `${selector} [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.4em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    `${selector} [data-pica-actions] a[data-variant="solid"]{background:${accent};border-color:${accent};color:${cssOn("accent")}}`,
    `${selector} [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${selector} [data-pica-actions] a[data-variant="outline"]:hover{border-color:${fg};background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} [data-pica-guides]{position:absolute;inset:${PAD_BLOCK} ${PAD_INLINE};z-index:-1;display:grid;grid-template-columns:${TRACKS};column-gap:${GUTTER};pointer-events:none}`,
    `${selector} [data-pica-guides] span{border-left:1px solid ${guide}}`,
    `${selector} [data-pica-guides] span:last-of-type{border-right:1px solid ${guide}}`,
    `@media (max-width: ${NARROW}){${selector} [data-pica-kicker],${selector} [data-pica-headline],${selector} [data-pica-subhead],${selector} [data-pica-actions],${selector} > :not([data-pica]){grid-column:1 / -1}${selector} [data-pica-guides]{display:none}}`,
  ].join("\n");
}

/** Creates one element the core owns, marked for identification and restyling. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** Rebuilds the action links from JSON: the first solid in the accent, the rest hairline, in source order. */
function renderActions(container: HTMLElement, actions: readonly SwissHeroAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.slice(0, 3).entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href;
    a.textContent = action.label;
    container.append(a);
  }
}

export const mount: Mount<SwissHeroProps> = (host, initial = {}) => {
  let props: SwissHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const restoreHost = styleHost(host, hostStyles(host));

  const ruleEl = part("div", "rule");
  ruleEl.setAttribute("aria-hidden", "true");
  const kickerEl = part("p", "kicker");
  const headlineEl = part("h1", "headline");
  const subheadEl = part("p", "subhead");
  const actionsEl = part("div", "actions");
  host.append(ruleEl, kickerEl, headlineEl, subheadEl, actionsEl);

  let guidesEl: HTMLElement | null = null;

  function renderGuides(): void {
    if (props.guides && guidesEl === null) {
      guidesEl = part("div", "guides");
      guidesEl.setAttribute("aria-hidden", "true");
      for (let i = 0; i < COLUMNS; i++) {
        const cell = document.createElement("span");
        cell.setAttribute("data-pica", "");
        guidesEl.append(cell);
      }
      host.append(guidesEl);
    } else if (!props.guides && guidesEl !== null) {
      guidesEl.remove();
      guidesEl = null;
    }
  }

  /** Writes a text part and hides it when it has nothing to say, so an empty prop leaves no empty heading. */
  function renderText(el: HTMLElement, text: string): void {
    el.textContent = text;
    el.hidden = text.trim() === "";
  }

  sheet.setRules(rules(sheet.selector, props));
  renderText(kickerEl, props.kicker);
  renderText(headlineEl, props.headline);
  renderText(subheadEl, props.subhead);
  renderActions(actionsEl, props.actions);
  renderGuides();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (before.align !== props.align || before.minHeight !== props.minHeight) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (before.kicker !== props.kicker) renderText(kickerEl, props.kicker);
      if (before.headline !== props.headline) renderText(headlineEl, props.headline);
      if (before.subhead !== props.subhead) renderText(subheadEl, props.subhead);
      if (!sameJson(before.actions, props.actions)) renderActions(actionsEl, props.actions);
      if (before.guides !== props.guides) renderGuides();
    },
    destroy() {
      guidesEl?.remove();
      guidesEl = null;
      ruleEl.remove();
      kickerEl.remove();
      headlineEl.remove();
      subheadEl.remove();
      actionsEl.remove();
      restoreHost();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
