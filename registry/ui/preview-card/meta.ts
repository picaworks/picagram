import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "preview-card",
  title: "Preview Card",
  category: "ui",
  description: "A link that reveals a compact reference preview after a short hover or when focused.",
  tags: ["preview", "card", "link", "reference", "overlay"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  palette: ["fg", "muted", "accent"],
  demo: { props: { defaultOpen: true } },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "press", key: "Escape" },
      { step: "expectEvent", name: "openChange", detail: false },
    ],
    [
      { step: "hover", selector: '[data-pica="trigger"]' },
      { step: "expectAttr", selector: '[data-pica="panel"]', name: "data-state", value: "open" },
    ],
  ],
  controlled: { open: "openChange" },
  controls: {
    triggerLabel: { type: "string" },
    href: { type: "string" },
    title: { type: "string" },
    description: { type: "textarea", rows: 3 },
    meta: { type: "string" },
    placement: { type: "select", options: ["top", "bottom", "start", "end"] },
    delay: { type: "number", min: 0, max: 1500, step: 50 },
    defaultOpen: { type: "boolean" },
  },
  original: true,
  credits: [],
};
