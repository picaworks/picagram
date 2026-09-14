import * as ditherImage from "../../dither/dither-image/core";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { changed, sameJson } from "../../../lib/json";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface EditorialHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface EditorialHeroProps {
  /** The deck, a small line under the top rule and above the headline. Empty hides it and its rule. */
  deck: string;
  /** The headline, set far larger than anything around it. Empty hides it. */
  headline: string;
  /** The standfirst, held to about sixty characters a line and opened by a drop capital. Empty hides it. */
  subhead: string;
  /** Who wrote the piece, set in mono at the left of the byline rules. Empty hides that half. */
  byline: string;
  /** When the piece ran, set in mono at the right of the byline rules. Empty hides that half. */
  date: string;
  /** Calls to action, drawn as links. At most three show: the first solid in the accent, the rest outline. */
  actions: readonly EditorialHeroAction[];
  /** Horizontal alignment of the text column. */
  align: "start" | "center";
  /** Image URL or data URI for the dithered plate beside the text. Empty shows no plate. */
  src: string;
  /** Text alternative for the plate. Empty marks it decorative. */
  alt: string;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: EditorialHeroProps = {
  deck: "Notes on the craft",
  headline: "The enduring craft of the printed page.",
  subhead:
    "What a magazine knows that a feed forgets: the eye wants a way in, a measure it can hold, and ink that trusts the paper it sits on, all of it decided before the first word is read.",
  byline: "By the Picagram desk",
  date: "September 2026",
  actions: [
    { label: "Read the story", href: "#story" },
    { label: "Subscribe", href: "#subscribe" },
  ],
  align: "start",
  src: "",
  alt: "",
  minHeight: 60,
};

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** One of the core's own nodes: marked, and named for its part in the spread so the scoped rules can find it. */
function part(name: string, tag: keyof HTMLElementTagNameMap = "div"): HTMLElement {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-part", name);
  return node;
}

/** The mounted plate beside the text, so update and destroy can reach the composed core. */
interface Plate {
  node: HTMLElement;
  instance: ReturnType<typeof ditherImage.mount>;
  ready: MutationObserver;
}

/** Layout for the host and the spread's grammar, from STYLE.md: hairline rules, square corners, a headline
 *  far larger than the standfirst, prose in the page's own font, and mono only on the byline and the date.
 *  The minimum height goes in a :where() rule, which carries no specificity at all, so a page that gives
 *  this host a height of its own wins without having to fight an inline style. */
function rules(selector: string, p: EditorialHeroProps): string {
  const s = selector;
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const hairline = `color-mix(in srgb, ${fg} 26%, transparent)`;
  const textAlign = p.align === "center" ? "center" : "start";
  const inset = p.align === "center" ? "auto" : "0";
  return [
    `:where(${s}){min-height:${vh(p.minHeight)}vh}`,
    `${s}{position:relative;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;color:${fg};padding:clamp(1.5rem,5vw,4rem);overflow-wrap:break-word}`,
    `${s} [data-part="spread"]{display:grid;grid-template-columns:minmax(0,1fr);column-gap:clamp(2rem,4vw,3.5rem);row-gap:2.5rem;align-items:end}`,
    `${s} [data-part="spread"][data-figure]{grid-template-columns:minmax(0,3fr) minmax(0,2fr)}`,
    `${s}[data-pica-fit="min"] [data-part="spread"][data-figure]{grid-template-columns:minmax(0,1fr)}`,
    `${s} [data-part="text"]{display:flex;flex-direction:column;min-width:0;text-align:${textAlign}}`,
    `${s} [data-part="deck"]{margin:0 0 clamp(1.5rem,3vw,2.5rem);padding-top:0.9em;border-top:1px solid ${hairline};font-size:0.95em;font-style:italic;color:${muted}}`,
    `${s} [data-part="headline"]{margin:0 0 clamp(1.5rem,3.5vw,2.75rem);font-size:clamp(2.5rem,6.5vw,5.25rem);line-height:1;letter-spacing:-0.02em;font-weight:600;text-wrap:balance}`,
    `${s} [data-part="standfirst"]{margin:0 0 clamp(2rem,3.5vw,3rem);margin-inline:${inset};max-width:60ch;display:flow-root;font-size:1.2em;line-height:1.55}`,
    `${s} [data-part="standfirst"]::first-letter{float:left;font-size:4.35em;line-height:0.82;padding-top:0.05em;padding-right:0.12em;font-weight:600}`,
    `${s} [data-part="byline"]{display:flex;flex-wrap:wrap;gap:0.4em 2em;justify-content:space-between;margin:0 0 clamp(2rem,3.5vw,3rem);padding:0.75em 0;border-top:1px solid ${hairline};border-bottom:1px solid ${hairline};font-family:${GRID_FONT};font-size:0.75em;letter-spacing:0.04em;text-transform:uppercase;color:${muted}}`,
    `${s} [data-part="actions"]{display:flex;flex-wrap:wrap;gap:0.75em;align-self:${p.align === "center" ? "center" : "flex-start"}}`,
    `${s} [data-part="actions"]:empty{display:none}`,
    `${s} [data-part="actions"] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.25em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
    `${s} [data-part="actions"] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
    `${s} [data-part="actions"] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
    `${s} [data-part="actions"] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${s} [data-part="actions"] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} [data-part="actions"] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} [data-part="figure"]{position:relative;width:100%;min-width:0;aspect-ratio:4/5;border:1px solid ${hairline}}`,
    `${s}[data-pica-fit="min"]{padding:1.25rem}`,
    `${s}[data-pica-fit="min"] [data-part="spread"]{row-gap:1.5rem}`,
    `${s}[data-pica-fit="min"] [data-part="figure"]{aspect-ratio:2/1}`,
    `${s}[data-pica-fit="min"] [data-part="deck"]{margin-bottom:1rem}`,
    `${s}[data-pica-fit="min"] [data-part="headline"]{margin-bottom:1rem}`,
    `${s}[data-pica-fit="min"] [data-part="standfirst"]{margin-bottom:1.25rem}`,
    `${s}[data-pica-fit="min"] [data-part="byline"]{margin-bottom:1.25rem}`,
    `${s} > :not([data-pica]){max-width:60ch;text-align:${textAlign};margin-inline:${inset}}`,
  ].join("\n");
}

/** Rebuilds the action links from JSON: at most three, the first solid, the rest outline, in source order. */
function renderActions(container: HTMLElement, actions: readonly EditorialHeroAction[]): void {
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

export const mount: Mount<EditorialHeroProps> = (host, initial = {}) => {
  let props: EditorialHeroProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);

  const spread = part("spread");
  const text = part("text");
  const deck = part("deck", "p");
  const headline = part("headline", "h1");
  const standfirst = part("standfirst", "p");
  const byline = part("byline", "p");
  const by = document.createElement("span");
  by.setAttribute("data-pica", "");
  const when = document.createElement("span");
  when.setAttribute("data-pica", "");
  byline.append(by, when);
  const actions = part("actions");
  text.append(deck, headline, standfirst, byline, actions);
  spread.append(text);
  host.prepend(spread);

  let plate: Plate | null = null;

  /** Writes each text prop into its element and hides the furniture a page leaves empty. */
  function renderText(): void {
    deck.textContent = props.deck;
    deck.style.display = props.deck ? "" : "none";
    headline.textContent = props.headline;
    headline.style.display = props.headline ? "" : "none";
    standfirst.textContent = props.subhead;
    standfirst.style.display = props.subhead ? "" : "none";
    by.textContent = props.byline;
    by.style.display = props.byline ? "" : "none";
    when.textContent = props.date;
    when.style.display = props.date ? "" : "none";
    byline.style.display = props.byline || props.date ? "" : "none";
  }

  function mountPlate(): void {
    const node = part("figure");
    spread.append(node);
    spread.setAttribute("data-figure", "");
    // The plate inks when its image decodes, which is after mount returns. The section's own ready mark
    // waits on the child's, so a capture can never catch the frame before the plate has drawn.
    const ready = new MutationObserver(() => {
      if (node.dataset.picaReady !== "true") return;
      host.dataset.picaReady = "true";
      ready.disconnect();
    });
    ready.observe(node, { attributes: true, attributeFilter: ["data-pica-ready"] });
    plate = { node, ready, instance: ditherImage.mount(node, { src: props.src, alt: props.alt }) };
  }

  function destroyPlate(): void {
    if (!plate) return;
    plate.ready.disconnect();
    plate.instance.destroy();
    plate.node.remove();
    plate = null;
    spread.removeAttribute("data-figure");
  }

  /** Below 720px the spread folds to one column and the plate drops under the text. */
  function measure(): void {
    attrs.set("data-pica-fit", host.clientWidth < 720 ? "min" : null);
  }

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;

  sheet.setRules(rules(sheet.selector, props));
  renderText();
  renderActions(actions, props.actions);
  measure();
  observer?.observe(host);
  if (props.src) mountPlate();
  if (!plate) host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.align !== before.align || props.minHeight !== before.minHeight) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (changed(before, props, ["deck", "headline", "subhead", "byline", "date"])) renderText();
      if (!sameJson(before.actions, props.actions)) renderActions(actions, props.actions);
      if (props.src !== before.src) {
        if (!props.src) destroyPlate();
        else if (!plate) mountPlate();
        else plate.instance.update({ src: props.src, alt: props.alt });
      } else if (plate && props.alt !== before.alt) {
        plate.instance.update({ alt: props.alt });
      }
    },
    destroy() {
      observer?.disconnect();
      destroyPlate();
      spread.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
