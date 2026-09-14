import { GRID_FONT } from "../../../lib/font";
import { scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface CardAction {
  /** The visible link label. */
  label: string;
  /** The link destination. */
  href: string;
}

export interface CardProps {
  /** A short label above the title. An empty value removes the label. */
  kicker: string;
  /** The card heading. An empty value removes the heading. */
  title: string;
  /** Footer links. An empty list removes the footer. */
  actions: readonly CardAction[];
}

export const defaults: CardProps = {
  kicker: "WAVE 6",
  title: "Ship the draft",
  actions: [
    { label: "Review", href: "#" },
    { label: "History", href: "#" },
  ],
};

function cardRules(s: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  return [
    `${s}{box-sizing:border-box;display:block;width:100%;max-width:44rem;height:fit-content!important;min-height:0!important;align-self:start;margin-inline:auto;padding:clamp(1.25rem,4vw,2rem);border:1px solid ${fg};border-radius:0;background:transparent;color:${fg}}`,
    `${s}>[data-pica-card-header]{display:grid;gap:0.4rem;margin:0 0 1.4rem;padding:0 0 1.2rem;border-bottom:1px solid ${fg}}`,
    `${s} [data-pica-card-kicker]{color:${muted};font-family:${GRID_FONT};font-size:0.75em;line-height:1.2;letter-spacing:0.08em;text-transform:uppercase}`,
    `${s} [data-pica-card-title]{font:inherit;font-size:clamp(1.35rem,3vw,1.75rem);font-weight:600;line-height:1.15;letter-spacing:-0.015em}`,
    `${s}>[data-pica-card-footer]{display:flex;flex-wrap:wrap;align-items:center;gap:0.65rem;margin:1.4rem 0 0;padding:1.2rem 0 0;border-top:1px solid ${fg}}`,
    `${s} [data-pica-card-action]{box-sizing:border-box;display:inline-flex;align-items:center;min-height:2rem;padding:0.3rem 0.5rem;border:0;border-radius:0;color:${fg};font:inherit;font-size:0.875em;line-height:1.2;text-decoration:none}`,
    `${s} [data-pica-card-action="0"]{padding-inline:0.75rem;background:${accent};color:${cssOn("accent")};font-size:0.75em;font-weight:600;letter-spacing:0.04em;text-transform:uppercase}`,
    `${s} [data-pica-card-action]:not([data-pica-card-action="0"]):hover{background:color-mix(in srgb,${fg} 10%,transparent)}`,
    `${s} [data-pica-card-action="0"]:hover{background:color-mix(in srgb,${accent} 85%,${fg})}`,
    `${s} [data-pica-card-action]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

function cardNode<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  return node;
}

function cardHeader(props: CardProps): HTMLElement | null {
  if (!props.kicker && !props.title) return null;
  const header = cardNode("header");
  header.setAttribute("data-pica-card-header", "");
  if (props.kicker) {
    const kicker = cardNode("div");
    kicker.setAttribute("data-pica-card-kicker", "");
    kicker.textContent = props.kicker;
    header.append(kicker);
  }
  if (props.title) {
    const title = cardNode("div");
    title.setAttribute("data-pica-card-title", "");
    title.textContent = props.title;
    header.append(title);
  }
  return header;
}

function cardFooter(actions: readonly CardAction[]): HTMLElement | null {
  if (actions.length === 0) return null;
  const footer = cardNode("footer");
  footer.setAttribute("data-pica-card-footer", "");
  for (let index = 0; index < actions.length; index++) {
    const action = actions[index];
    if (!action) continue;
    const link = cardNode("a");
    link.setAttribute("data-pica-card-action", String(index));
    link.href = action.href;
    link.textContent = action.label;
    footer.append(link);
  }
  return footer;
}

export const mount: Mount<CardProps> = (host, initial = {}) => {
  let props: CardProps = { ...defaults, ...initial };
  const sheet = scope(host);
  let header: HTMLElement | null = null;
  let footer: HTMLElement | null = null;

  function renderHeader(): void {
    header?.remove();
    header = cardHeader(props);
    if (header) host.prepend(header);
  }

  function renderFooter(): void {
    footer?.remove();
    footer = cardFooter(props.actions);
    if (footer) host.append(footer);
  }

  sheet.setRules(cardRules(sheet.selector));
  renderHeader();
  renderFooter();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const previous = props;
      props = { ...props, ...next };
      if (previous.kicker !== props.kicker || previous.title !== props.title) renderHeader();
      if (!sameJson(previous.actions, props.actions)) renderFooter();
    },
    destroy() {
      header?.remove();
      footer?.remove();
      header = null;
      footer = null;
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
