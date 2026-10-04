import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "folded-atlas",
  title: "Folded Atlas",
  category: "immersive",
  description: "Supplied polygon panels form a connected accordion atlas with projected hinges, accessible panel buttons, and independent selected content.",
  tags: ["atlas", "accordion", "fold", "panels", "geometry", "selection", "canvas"],
  facets: ["static", "canvas", "interactive"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  original: true,
  palette: ["fg", "bg", "accent", "muted"],
  controls: {
    panels: { type: "json", label: "Panel shapes and content" },
    fold: { type: "number", min: 0, max: 1, step: 0.01, label: "Accordion fold" },
    defaultValue: { type: "string", label: "Initial panel ID" },
    label: { type: "string", label: "Accessible atlas name" },
  },
  controlled: { value: "valueChange" },
  interactions: [[
    { step: "click", selector: "[data-atlas-panel=coast]" },
    { step: "expectEvent", name: "valueChange", detail: "coast" },
    { step: "expectAttr", selector: "[data-atlas-panel=coast]", name: "aria-pressed", value: "true" },
    { step: "press", key: "ArrowRight" },
    { step: "expectEvent", name: "valueChange", detail: "estuary" },
    { step: "expectFocus", selector: "[data-atlas-panel=estuary]" },
  ]],
  credits: [],
};
