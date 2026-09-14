import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "toolbar",
  title: "Toolbar",
  category: "ui",
  description: "A labeled band of action and toggle controls with roving keyboard focus.",
  tags: ["toolbar", "actions", "toggle", "keyboard", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  palette: ["fg", "accent"],
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "[data-pica-control=\"run\"]" },
      { step: "press", key: "ArrowRight" },
      { step: "expectFocus", selector: "[data-pica-control=\"format\"]" },
      { step: "press", key: "Enter" },
      { step: "expectEvent", name: "press", detail: "format" },
      { step: "hover", selector: "[data-pica-control=\"format\"]" },
    ],
    [
      { step: "press", key: "Tab" },
      { step: "press", key: "End" },
      { step: "press", key: "ArrowLeft" },
      { step: "expectFocus", selector: "[data-pica-control=\"docs\"]" },
      { step: "press", key: " " },
      { step: "expectEvent", name: "toggle", detail: { id: "docs", pressed: false } },
      { step: "expectAttr", selector: "[data-pica-control=\"docs\"]", name: "aria-pressed", value: "false" },
    ],
  ],
  controls: {
    items: { type: "json" },
    label: { type: "string" },
    orientation: { type: "select", options: ["horizontal", "vertical"] },
  },
  credits: [
    {
      relation: "technique",
      title: "Toolbar pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/",
      license: "W3C document",
    },
  ],
};
