import { scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface LuxuryHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface LuxuryHeroProps {
  /** The heading, set small in the page's own face with wide tracking. An empty string hides it. */
  headline: string;
  /** One or two lines of quiet copy under the headline, in the muted ink. An empty string hides it. */
  subhead: string;
  /** Calls to action, drawn as text links with a hairline under each. At most three are shown. */
  actions: readonly LuxuryHeroAction[];
  /** Text alignment inside the centered column. */
  align: "center" | "start";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: LuxuryHeroProps = {
  headline: "Made To Last",
  subhead: "Considered goods, produced in small runs and guaranteed for life.",
  actions: [{ label: "Explore the collection", href: "#collection" }],
  align: "center",
  minHeight: 85,
};

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** Creates one element the core owns, marked with data-pica and a part attribute the scoped rules select by. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, part: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${part}`, "");
  return node;
}

/** Layout for the whole block. Restraint read as expense: every direct child, the core's own elements and
 *  the page's wrapped content alike, is held to one narrow column centered in the host, so nothing reaches
 *  the edges and the ground stays empty. The one accent is a short hairline rule that sits far above the
 *  first element of the block. The minimum height goes in a :where() rule, which carries no specificity,
 *  so a page that gives this host a height of its own wins. */
function rules(s: string, p: LuxuryHeroProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const centered = p.align !== "start";
  return [
    `:where(${s}){min-height:${vh(p.minHeight)}vh}`,
    `${s}{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:${centered ? "center" : "start"};color:${fg};padding:clamp(4rem,14vh,10rem) clamp(1.5rem,7vw,5rem)}`,
    `${s} > *{box-sizing:border-box;margin:0;width:min(27rem,78%)}`,
    `${s} > :not([data-pica]){margin-top:1.7em;color:${muted};font-size:0.95em;line-height:1.8}`,
    `${s} > [data-pica-rule]{height:1px;background:linear-gradient(${accent},${accent}) ${centered ? "center" : "left"}/3.5rem 1px no-repeat}`,
    `${s} > [data-pica-rule] + *{margin-top:clamp(2.5rem,7vh,4.5rem)}`,
    `${s} > [data-pica-headline]{font-size:1.1em;font-weight:500;letter-spacing:0.28em;line-height:1.6;text-transform:uppercase;overflow-wrap:break-word${centered ? ";padding-left:0.28em" : ""}}`,
    `${s} > [data-pica-subhead]{margin-top:1.5em;max-width:23rem;color:${muted};font-size:0.95em;line-height:1.8;letter-spacing:0.015em}`,
    `${s} > [data-pica-actions]{margin-top:clamp(2.5rem,6vh,4rem);display:flex;flex-wrap:wrap;justify-content:${centered ? "center" : "flex-start"};gap:0.9em 2.75em}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{appearance:none;background:transparent;border:0;border-bottom:1px solid ${muted};border-radius:0;color:${fg};cursor:pointer;font:inherit;font-size:0.75em;letter-spacing:0.24em;line-height:1.5;padding:0 0.24em 0.6em;text-decoration:none;text-transform:uppercase}`,
    `${s} > [data-pica-actions] a:hover{border-bottom-color:${fg}}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:3px}`,
  ].join("\n");
}

export const mount: Mount<LuxuryHeroProps> = (host, initial = {}) => {
  let props: LuxuryHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);

  const rule = el("div", "rule");
  rule.setAttribute("aria-hidden", "true");
  const headlineEl = el("h1", "headline");
  const subheadEl = el("p", "subhead");
  const actions = el("div", "actions");
  host.append(actions);

  /** Keeps the top of the block before the wrapped children, dropping empty text parts entirely. */
  function syncTop(): void {
    headlineEl.textContent = props.headline;
    subheadEl.textContent = props.subhead;
    const top: HTMLElement[] = [rule];
    if (props.headline.trim()) top.push(headlineEl);
    else headlineEl.remove();
    if (props.subhead.trim()) top.push(subheadEl);
    else subheadEl.remove();
    host.prepend(...top);
  }

  /** Rebuilds the action links from JSON: text links only, in source order, never filled buttons. */
  function renderActions(): void {
    actions.replaceChildren();
    for (const action of props.actions.slice(0, 3)) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.href = action.href || "#";
      a.textContent = action.label;
      actions.append(a);
    }
  }

  sheet.setRules(rules(sheet.selector, props));
  syncTop();
  renderActions();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.align !== before.align || props.minHeight !== before.minHeight) sheet.setRules(rules(sheet.selector, props));
      if (props.headline !== before.headline || props.subhead !== before.subhead) syncTop();
      if (!sameJson(before.actions, props.actions)) renderActions();
    },
    destroy() {
      for (const node of [rule, headlineEl, subheadEl, actions]) node.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
