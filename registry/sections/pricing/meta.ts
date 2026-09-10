import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pricing",
  title: "Pricing",
  category: "sections",
  description: "Pricing tiers with a monthly and yearly switch, each plan a card with its own call to action.",
  tags: ["pricing", "tiers", "billing", "radio group", "section"],
  wave: 3,
  animated: false,
  decorative: false,
  palette: ["fg", "accent"],
  controlled: { billing: "billingChange" },
  controls: {
    tiers: { type: "json" },
    defaultBilling: { type: "select", options: ["monthly", "yearly"], label: "Default billing" },
    currency: { type: "string" },
    label: { type: "string" },
  },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: '[role="radio"]' },
      { step: "press", key: "ArrowRight" },
      { step: "expectEvent", name: "billingChange", detail: "yearly" },
    ],
  ],
  credits: [
    {
      relation: "technique",
      title: "Radio group pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/radio/",
      license: "W3C document",
    },
  ],
};
