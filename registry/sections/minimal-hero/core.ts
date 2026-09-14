import { scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface MinimalHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface MinimalHeroProps {
  /** The one idea, drawn as a large heading after anything the page wraps. Empty draws none. */
  headline: string;
  /** At most one line of support, drawn in the muted color under the headline. Empty draws none. */
  subhead: string;
  /** Calls to action, drawn as links. At most three: the first draws solid, the rest outline. */
  actions: readonly MinimalHeroAction[];
  /** Horizontal alignment of the content block within the host. */
  align: "start" | "center";
}

export const defaults: MinimalHeroProps = {
  headline: "Less, but better.",
  subhead: "A headline, one line of support, and a single way forward.",
  actions: [{ label: "Get started", href: "#" }],
  align: "start",
};

/** Layout for the host and the grammar for its calls to action. Prose keeps the page's font: only size,
 *  weight, and tracking set the headline apart, and the muted color carries the one line of support. The
 *  block sits off centre on the vertical through a large top padding rather than a transform, so nothing
 *  can ever be pushed out of the host and clipped. The minimum height goes in a :where() rule, which
 *  carries no specificity at all, so a page that gives this host a height of its own wins. */
function rules(s: string, p: MinimalHeroProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const onFg = cssOn("fg");
  const center = p.align === "center";
  const edge = center ? "center" : "flex-start";
  const textAlign = center ? "center" : "start";
  const tint = `color-mix(in srgb, ${fg} 10%, transparent)`;
  return [
    `:where(${s}){min-height:72vh}`,
    `${s}{box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-start;align-items:${edge};gap:1em;padding:clamp(1.5rem,6vw,5rem);padding-block-start:clamp(4rem,28vh,22rem);color:${fg};text-align:${textAlign}}`,
    `${s} > :not([data-pica]){margin-block:0;text-align:${textAlign}}`,
    `${s} > :not([data-pica]):not(:is(h1,h2,h3)){max-width:44rem}`,
    `${s} > p:not([data-pica]){color:${muted}}`,
    `${s} > :is(h1,h2,h3){margin-block:0;max-width:14em;font-size:clamp(2.5rem,6.5vw,4.75rem);line-height:1.04;font-weight:600;letter-spacing:-0.02em;color:${fg};text-wrap:balance;overflow-wrap:break-word}`,
    `${s} > :is(h1,h2,h3):empty{display:none}`,
    `${s} > [data-part="subhead"]{margin-block:0;max-width:52ch;font-size:clamp(1.05rem,1.4vw,1.2rem);line-height:1.5;color:${muted};overflow-wrap:break-word}`,
    `${s} > [data-part="subhead"]:empty{display:none}`,
    `${s} > [data-part="actions"]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;margin-top:1.5em;justify-content:${edge}}`,
    `${s} > [data-part="actions"]:empty{display:none}`,
    `${s} > [data-part="actions"] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.65em 1.3em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
    // The solid link paints its background from currentColor and carries the fg itself, so the fallback
    // for --pica-fg resolves to the link's own color rather than its inverted text. Its label sits in a
    // span, where the same fallback resolves to the inherited fg and inverts it back for the text.
    `${s} > [data-part="actions"] a[data-variant="solid"]{background:currentColor;color:${fg}}`,
    `${s} > [data-part="actions"] a[data-variant="solid"] > [data-part="label"]{color:${onFg}}`,
    `${s} > [data-part="actions"] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
    `${s} > [data-part="actions"] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${fg} 88%, transparent)}`,
    `${s} > [data-part="actions"] a[data-variant="outline"]:hover{background:${tint}}`,
    `${s} > [data-part="actions"] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

export const mount: Mount<MinimalHeroProps> = (host, initial = {}) => {
  let props: MinimalHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);

  // Everything the core adds lands after the children the page wrapped, so a page can put its own heading
  // first, or let the headline prop do it, or both.
  const headline = document.createElement("h1");
  headline.setAttribute("data-pica", "");
  headline.setAttribute("data-part", "headline");
  const subhead = document.createElement("p");
  subhead.setAttribute("data-pica", "");
  subhead.setAttribute("data-part", "subhead");
  const actions = document.createElement("div");
  actions.setAttribute("data-pica", "");
  actions.setAttribute("data-part", "actions");
  host.append(headline, subhead, actions);

  function renderText(): void {
    headline.textContent = props.headline;
    subhead.textContent = props.subhead;
  }

  /** Rebuilds the action links from JSON: the first solid, the rest outline, in source order. */
  function renderActions(): void {
    actions.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.href = action.href;
      if (i === 0) {
        a.dataset.variant = "solid";
        const label = document.createElement("span");
        label.setAttribute("data-pica", "");
        label.setAttribute("data-part", "label");
        label.textContent = action.label;
        a.append(label);
      } else {
        a.dataset.variant = "outline";
        a.textContent = action.label;
      }
      actions.append(a);
    }
  }

  sheet.setRules(rules(sheet.selector, props));
  renderText();
  renderActions();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.headline !== before.headline || props.subhead !== before.subhead) renderText();
      if (!sameJson(before.actions, props.actions)) renderActions();
      if (props.align !== before.align) sheet.setRules(rules(sheet.selector, props));
    },
    destroy() {
      headline.remove();
      subhead.remove();
      actions.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
