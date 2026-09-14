import { GRID_FONT } from "../../../lib/font";
import { layer, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface BrutalistHeroAction {
  /** Text on the link, drawn in mono capitals. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface BrutalistHeroProps {
  /** The headline, set heavy and uppercase inside its own bordered block. Empty hides it. */
  headline: string;
  /** The line under the headline, in a second bordered block shifted off the headline's edge. Empty hides it. */
  subhead: string;
  /** A short label on the accent block that overlaps the headline's top edge. Empty hides it. */
  kicker: string;
  /** Calls to action, drawn as bordered links. At most three show, and the first fills with the accent. */
  actions: readonly BrutalistHeroAction[];
  /** What the underlay draws behind everything: a faint square grid, ruled lines, or nothing. */
  background: "grid" | "rules" | "none";
  /** How strongly the underlay shows, from 0 to 1. */
  intensity: number;
  /** Horizontal alignment of the content blocks within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: BrutalistHeroProps = {
  headline: "Structure, laid bare.",
  subhead: "Every box shows its edges. Borders run thick, corners stay square, and the accent fills a whole block.",
  kicker: "Spec / 09",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  background: "grid",
  intensity: 0.6,
  align: "start",
  minHeight: 80,
};

/** Keeps a 0 to 1 prop inside its range. */
function unit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Keeps minHeight inside a sane range even if a caller passes something outside it. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** The scoped rules: layout, the boxes everything sits in, the calls to action, the underlay pattern, and
 *  the decorative blocks that sit across the frame's own edges. The minimum height goes in a :where() rule,
 *  which carries no specificity at all, so a page that gives this host a height of its own wins without
 *  having to fight an inline style. Borders are three and four pixels, never hairlines, and every corner
 *  stays square. */
function rules(s: string, p: BrutalistHeroProps): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const accent = cssVar("accent");
  const edge = p.align === "center" ? "center" : "flex-start";
  const textAlign = p.align === "center" ? "center" : "start";
  const line = `color-mix(in srgb, ${fg} ${Math.round(5 + unit(p.intensity) * 11)}%, transparent)`;
  const underlay =
    p.background === "grid"
      ? `background-image:linear-gradient(to right, ${line} 1px, transparent 1px),linear-gradient(to bottom, ${line} 1px, transparent 1px);background-size:44px 44px`
      : p.background === "rules"
        ? `background-image:linear-gradient(to bottom, ${line} 1px, transparent 1px);background-size:44px 32px`
        : "background-image:none";
  return [
    `:where(${s}){min-height:${vh(p.minHeight)}vh}`,
    `${s}{box-sizing:border-box;position:relative;display:flex;flex-direction:column;justify-content:center;align-items:${edge};border:4px solid ${fg};padding:clamp(3rem,7vh,5rem) clamp(1.25rem,5vw,4rem) calc(clamp(1.25rem,5vw,4rem) + 4em);color:${fg};overflow-wrap:break-word}`,
    `${s} > [data-pica-under]{${underlay}}`,
    `${s} > [data-pica-head]{display:flex;flex-direction:column;align-items:${edge};width:100%;max-width:52rem;text-align:${textAlign}}`,
    `${s} > [data-pica-head] > [data-pica-kicker]{position:relative;z-index:1;margin:0 0 -0.9em 1.1em;padding:0.4em 0.85em;font-family:${GRID_FONT};font-size:0.72em;letter-spacing:0.14em;text-transform:uppercase;background:${accent};color:${cssOn("accent")};border:3px solid ${fg}}`,
    `${s} > [data-pica-head] > h1{margin:0;padding:0.4em 0.55em 0.45em;max-width:min(100%,12ch);box-sizing:border-box;border:3px solid ${fg};background:${bg};font-weight:800;line-height:0.98;letter-spacing:-0.02em;text-transform:uppercase;font-size:clamp(1.9rem,4.6vw,3.4rem);text-wrap:balance}`,
    `${s} > [data-pica-head] > p{margin:-3px 0 0 clamp(1rem,6vw,3.5rem);padding:0.6em 0.8em;max-width:min(34rem,100%);box-sizing:border-box;border:3px solid ${fg};background:${bg};font-size:0.95em;line-height:1.4}`,
    `${s} > :not([data-pica]){margin:0;margin-top:-3px;padding:0.75em 1em;width:fit-content;max-width:min(34rem,100%);box-sizing:border-box;border:3px solid ${fg};background:${bg}}`,
    `:where(${s}) img{max-width:100%;height:auto}`,
    `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.7em;margin-top:1.5em;max-width:52rem}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{font-family:${GRID_FONT};font-size:0.78em;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;line-height:1.2;padding:0.7em 1.1em;display:inline-flex;align-items:center;border:3px solid ${fg};border-radius:0;cursor:pointer}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
    `${s} > [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg}}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 82%, ${fg})}`,
    `${s} > [data-pica-actions] a[data-variant="outline"]:hover{color:${accent};border-color:${accent}}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} > [data-pica-strip]{position:absolute;left:-4px;right:-4px;bottom:0;height:2.6em;pointer-events:none;border-top:3px solid ${fg};background:repeating-linear-gradient(to right, ${fg} 0 3px, transparent 3px 7px, ${fg} 7px 9px, transparent 9px 16px, ${fg} 16px 21px, transparent 21px 30px) center / 100% 55% no-repeat}`,
    `${s} > [data-pica-chip]{position:absolute;top:-3px;right:clamp(1.5rem,7vw,5rem);width:3.5em;height:3.5em;pointer-events:none;background:${accent};border:3px solid ${fg}}`,
    `${s} > [data-pica-notch]{position:absolute;left:-3px;bottom:2.2em;width:2.1em;height:2.1em;pointer-events:none;background:${fg}}`,
  ].join("\n");
}

/** Rebuilds the headline column from JSON: the accent kicker overlapping the headline box, then the headline
 *  and the subhead as bordered blocks of their own. Empty props leave their blocks out. */
function renderHead(head: HTMLElement, p: BrutalistHeroProps): void {
  head.replaceChildren();
  if (p.kicker) {
    const kicker = document.createElement("div");
    kicker.setAttribute("data-pica", "");
    kicker.setAttribute("data-pica-kicker", "");
    kicker.textContent = p.kicker;
    head.append(kicker);
  }
  if (p.headline) {
    const h1 = document.createElement("h1");
    h1.setAttribute("data-pica", "");
    h1.textContent = p.headline;
    head.append(h1);
  }
  if (p.subhead) {
    const sub = document.createElement("p");
    sub.setAttribute("data-pica", "");
    sub.textContent = p.subhead;
    head.append(sub);
  }
}

/** Rebuilds the action links from JSON: at most three, the first solid in the accent, the rest outline. */
function renderActions(container: HTMLElement, actions: readonly BrutalistHeroAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.slice(0, 3).entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href || "#";
    a.textContent = action.label;
    container.append(a);
  }
}

export const mount: Mount<BrutalistHeroProps> = (host, initial = {}) => {
  let props: BrutalistHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const under = layer(host, "under");
  under.el.setAttribute("data-pica-under", "");

  // The headline column goes before the page's own children, so the section leads with its headline and the
  // wrapped content lands in bordered blocks of its own after it. Children are never moved or touched.
  const head = document.createElement("div");
  head.setAttribute("data-pica", "");
  head.setAttribute("data-pica-head", "");
  host.prepend(head);

  const actions = document.createElement("div");
  actions.setAttribute("data-pica", "");
  actions.setAttribute("data-pica-actions", "");

  const strip = document.createElement("div");
  strip.setAttribute("data-pica", "");
  strip.setAttribute("data-pica-strip", "");
  strip.setAttribute("aria-hidden", "true");

  const chip = document.createElement("div");
  chip.setAttribute("data-pica", "");
  chip.setAttribute("data-pica-chip", "");
  chip.setAttribute("aria-hidden", "true");

  const notch = document.createElement("div");
  notch.setAttribute("data-pica", "");
  notch.setAttribute("data-pica-notch", "");
  notch.setAttribute("aria-hidden", "true");

  host.append(actions, strip, chip, notch);

  sheet.setRules(rules(sheet.selector, props));
  renderHead(head, props);
  renderActions(actions, props.actions);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.headline !== before.headline || props.subhead !== before.subhead || props.kicker !== before.kicker) {
        renderHead(head, props);
      }
      if (!sameJson(before.actions, props.actions)) renderActions(actions, props.actions);
      if (
        props.align !== before.align ||
        props.minHeight !== before.minHeight ||
        props.background !== before.background ||
        props.intensity !== before.intensity
      ) {
        sheet.setRules(rules(sheet.selector, props));
      }
    },
    destroy() {
      under.remove();
      head.remove();
      actions.remove();
      strip.remove();
      chip.remove();
      notch.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
