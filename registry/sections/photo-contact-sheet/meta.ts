import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "photo-contact-sheet",
  title: "Photo contact sheet",
  category: "sections",
  description: "A photography collection with original tonal plates, a numbered contact sheet, and selectable frame commentary.",
  tags: ["photography", "portfolio", "contact sheet"],
  facets: ["static", "text", "interactive"],
  wave: 13,
  release: "microsites-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  interactions: [[{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }], [{ step: "click", selector: '[data-role="frames"] figure:nth-child(2) button' }, { step: "expectAttr", selector: '[data-role="frames"] figure:nth-child(2) button', name: "aria-pressed", value: "true" }]],
  controls: { photographer: { type: "string" }, title: { type: "string" }, edition: { type: "string" }, introduction: { type: "textarea", rows: 3 }, frames: { type: "json" }, commentary: { type: "textarea", rows: 5 } },
  original: true,
  credits: [],
};
