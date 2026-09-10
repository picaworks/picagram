import { labelHost, unlabelHost } from "../../../lib/a11y";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface PricingCta {
  /** Text on the link. */
  label: string;
  /** Destination URL. */
  href: string;
}

/** One pricing plan, drawn as a card. */
export interface PricingTier {
  /** The plan's name. */
  name: string;
  /** Price per month, in the given currency, before the currency symbol. */
  monthly: number;
  /** Price per year, in the given currency, before the currency symbol. */
  yearly: number;
  /** One sentence describing who the plan suits. */
  blurb: string;
  /** What the plan includes, one short phrase each. */
  features: readonly string[];
  /** The plan's call to action. */
  cta: PricingCta;
  /** Outlines the card in the accent and marks it recommended. */
  featured: boolean;
}

export interface PricingProps {
  /** Plans to display, each becoming a card that stacks below a width. */
  tiers: readonly PricingTier[];
  /** The active billing period, "monthly" or "yearly". Null, the default, means uncontrolled. */
  billing: "monthly" | "yearly" | null;
  /** The billing period shown at mount when billing is uncontrolled. Read once, at mount. */
  defaultBilling: "monthly" | "yearly";
  /** Symbol placed before each price. */
  currency: string;
  /** Accessible name for the section. */
  label: string;
}

export interface PricingEvents {
  /** The billing switch changed to "monthly" or "yearly". */
  billingChange: "monthly" | "yearly";
}

export const defaults: PricingProps = {
  tiers: [
    {
      name: "Starter",
      monthly: 0,
      yearly: 0,
      blurb: "For trying Pica before committing to a plan.",
      features: ["One project", "Community support", "MIT license"],
      cta: { label: "Start free", href: "#" },
      featured: false,
    },
    {
      name: "Team",
      monthly: 24,
      yearly: 19,
      blurb: "For a team shipping components together.",
      features: ["Unlimited projects", "Shared component library", "Priority support", "Usage analytics"],
      cta: { label: "Start trial", href: "#" },
      featured: true,
    },
    {
      name: "Studio",
      monthly: 64,
      yearly: 52,
      blurb: "For agencies running client work at scale.",
      features: ["Everything in Team", "White-label export", "Custom design tokens", "Dedicated support", "Single sign-on"],
      cta: { label: "Contact sales", href: "#" },
      featured: false,
    },
  ],
  billing: null,
  defaultBilling: "monthly",
  currency: "$",
  label: "Pricing",
};

/** The two periods the switch offers, in the order the buttons appear. */
const OPTIONS = ["monthly", "yearly"] as const;

/** The scoped rules for one pricing section. Prose keeps the page's font; only glyphs and figures go mono. */
function rules(s: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const onAccent = cssOn("accent");
  const tint = `color-mix(in srgb, ${fg} 10%, transparent)`;
  return [
    `${s} *{box-sizing:border-box}`,
    `${s}{color:${fg}}`,
    `${s} [data-part="switch"]{display:inline-flex;border:1px solid ${muted};border-radius:0}`,
    `${s} [data-part="switch"] button{appearance:none;margin:0;border:0;background:transparent;color:${muted};font:inherit;font-size:0.9em;line-height:1.2;padding:0.5em 1.1em;cursor:pointer;border-radius:0}`,
    `${s} [data-part="switch"] button + button{border-inline-start:1px solid ${muted}}`,
    `${s} [data-part="switch"] button[aria-checked="true"]{background:${tint};color:${fg}}`,
    `${s} [data-part="switch"] button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} [data-part="grid"]{display:grid;grid-template-columns:repeat(auto-fit,minmax(15em,1fr));gap:1.5em;margin-block-start:1.5em}`,
    `${s} article{margin:0;border:1px solid ${muted};border-radius:0;padding:1.5em;display:flex;flex-direction:column;gap:0.85em}`,
    `${s} article[data-featured]{border-color:${accent}}`,
    `${s} [data-part="tag"]{align-self:flex-start;background:${accent};color:${onAccent};border-radius:0;font-family:${GRID_FONT};font-size:0.7em;letter-spacing:0.04em;text-transform:uppercase;padding:0.2em 0.6em}`,
    `${s} h3{margin:0;font-size:1.15em;font-weight:600}`,
    `${s} [data-part="price"]{margin:0;font-family:${GRID_FONT};font-variant-numeric:tabular-nums;font-size:2em;line-height:1}`,
    `${s} [data-part="period"]{font-size:0.4em;color:${muted};margin-inline-start:0.3em}`,
    `${s} [data-part="blurb"]{margin:0;color:${muted}}`,
    `${s} ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.5em;flex:1 0 auto}`,
    `${s} li{display:flex;align-items:baseline;gap:0.6em;margin:0}`,
    `${s} [data-part="check"]{font-family:${GRID_FONT};color:${muted}}`,
    `${s} a[data-part="cta"]{appearance:none;margin:0;font:inherit;text-align:center;text-decoration:none;padding:0.6em 1em;border:1px solid ${fg};border-radius:0;color:${fg}}`,
    `${s} a[data-part="cta"]:hover{background:${tint}}`,
    `${s} a[data-part="cta"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} article[data-featured] a[data-part="cta"]{background:${accent};color:${onAccent};border-color:${accent}}`,
    `${s} article[data-featured] a[data-part="cta"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
  ].join("\n");
}

export const mount: Mount<PricingProps> = (host, initial = {}) => {
  let props: PricingProps = { ...defaults, ...initial };
  const emit = emitter<PricingEvents>(host);
  const sheet = scope(host);
  sheet.setRules(rules(sheet.selector));

  /** Creates one element the core owns, marked for identification and restyling. */
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Readonly<Record<string, string>>): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.setAttribute("data-pica", "");
    for (const [key, value] of Object.entries(attrs ?? {})) node.setAttribute(key, value);
    return node;
  }

  // Uncontrolled state, applied only while props.billing is null. Read defaultBilling once, at mount.
  let internalBilling: "monthly" | "yearly" = props.defaultBilling;

  function effective(): "monthly" | "yearly" {
    return props.billing ?? internalBilling;
  }

  function isControlled(): boolean {
    return props.billing !== null;
  }

  const switchGroup = el("div", { "data-part": "switch", role: "radiogroup", "aria-label": "Billing period" });
  const monthlyButton = el("button", { type: "button", role: "radio" });
  monthlyButton.textContent = "Monthly";
  const yearlyButton = el("button", { type: "button", role: "radio" });
  yearlyButton.textContent = "Yearly";
  switchGroup.append(monthlyButton, yearlyButton);
  const optionButtons = [monthlyButton, yearlyButton] as const;

  // Which button is reachable by Tab, per the roving tabindex technique. Tracked apart from the checked
  // value, because a controlled switch moves focus on every arrow press but shows only what update() sends.
  let focusIndex = OPTIONS.indexOf(effective());

  function renderSwitch(): void {
    const value = effective();
    for (let i = 0; i < OPTIONS.length; i++) {
      const option = OPTIONS[i];
      const button = optionButtons[i];
      if (!option || !button) continue;
      button.setAttribute("aria-checked", String(option === value));
      button.tabIndex = i === focusIndex ? 0 : -1;
    }
  }

  interface PriceRef {
    tier: PricingTier;
    amount: HTMLElement;
    period: HTMLElement;
  }
  let priceRefs: PriceRef[] = [];

  function renderPrices(): void {
    const billing = effective();
    for (const ref of priceRefs) {
      const value = billing === "yearly" ? ref.tier.yearly : ref.tier.monthly;
      ref.amount.textContent = `${props.currency}${value}`;
      ref.period.textContent = billing === "yearly" ? "/yr" : "/mo";
    }
  }

  /** Moves focus to option `index`, wrapping, and commits it as input when it differs from the current one. */
  function moveTo(index: number): void {
    const next = ((index % OPTIONS.length) + OPTIONS.length) % OPTIONS.length;
    const value = OPTIONS[next];
    if (value === undefined) return;
    const willChange = next !== focusIndex;
    focusIndex = next;
    optionButtons[next]?.focus();
    if (willChange) {
      if (!isControlled()) internalBilling = value;
      emit("billingChange", value);
    }
    renderSwitch();
    renderPrices();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveTo(focusIndex + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveTo(focusIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveTo(OPTIONS.length - 1);
    }
  }

  function onClick(event: MouseEvent): void {
    const target = event.target;
    const index = target instanceof HTMLButtonElement ? optionButtons.indexOf(target) : -1;
    if (index >= 0) moveTo(index);
  }

  switchGroup.addEventListener("keydown", onKeydown);
  switchGroup.addEventListener("click", onClick);

  const cardsHost = el("div", { "data-part": "grid" });

  function buildCards(): void {
    cardsHost.replaceChildren();
    priceRefs = [];
    for (const tier of props.tiers) {
      const card = el("article", tier.featured ? { "data-featured": "" } : {});
      if (tier.featured) {
        const tag = el("span", { "data-part": "tag" });
        tag.textContent = "Recommended";
        card.append(tag);
      }
      const heading = el("h3");
      heading.textContent = tier.name;
      const price = el("p", { "data-part": "price" });
      const amount = el("span", { "data-part": "amount" });
      const period = el("span", { "data-part": "period" });
      price.append(amount, period);
      const blurb = el("p", { "data-part": "blurb" });
      blurb.textContent = tier.blurb;
      const list = el("ul");
      for (const feature of tier.features) {
        const item = el("li");
        const check = el("span", { "data-part": "check", "aria-hidden": "true" });
        check.textContent = "✓";
        item.append(check, feature);
        list.append(item);
      }
      const link = el("a", { "data-part": "cta", href: tier.cta.href || "#" });
      link.textContent = tier.cta.label;
      card.append(heading, price, blurb, list, link);
      cardsHost.append(card);
      priceRefs.push({ tier, amount, period });
    }
    renderPrices();
  }

  function applyLabel(): void {
    labelHost(host, props.label.trim() ? props.label : "Pricing", "region");
  }

  applyLabel();
  buildCards();
  renderSwitch();
  host.append(switchGroup, cardsHost);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (before.label !== props.label) applyLabel();
      if (!sameJson(before.tiers, props.tiers)) buildCards();
      else if (before.billing !== props.billing || before.currency !== props.currency) renderPrices();
      if (before.billing !== props.billing) {
        focusIndex = OPTIONS.indexOf(effective());
        renderSwitch();
      }
    },
    destroy() {
      switchGroup.removeEventListener("keydown", onKeydown);
      switchGroup.removeEventListener("click", onClick);
      switchGroup.remove();
      cardsHost.remove();
      sheet.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
