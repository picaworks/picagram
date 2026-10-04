import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-comparison-grid",
  title: "Comparison Grid",
  category: "ascii",
  description: "An aligned character specimen matrix with selectable columns and readable material measurements.",
  tags: ["character diagram", "sample comparison", "editable data"],
  facets: ["static", "text", "interactive"],
  wave: 14,
  release: "ascii-motion-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  controls: {
    title: { type: "string" },
    label: { type: "string" },
    specimens: { type: "json" },
    selected: { type: "number", min: 0, max: 5, step: 1 },
  },
  interactions: [
    [{ step: "click", selector: "[data-choice='1']" }, { step: "expectAttr", selector: "[data-choice='1']", name: "aria-pressed", value: "true" }, { step: "expectEvent", name: "selection", detail: { index: 1 } }],
    [{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "[data-choice='0']" }, { step: "press", key: "Tab" }, { step: "expectFocus", selector: "[data-choice='1']" }, { step: "press", key: "Enter" }, { step: "expectAttr", selector: "[data-choice='1']", name: "aria-pressed", value: "true" }],
  ],
  original: true,
  credits: [],
};
