import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-garden-plan",
  title: "Garden Plan",
  category: "ascii",
  description: "A fixed character planting bed with seasonal layouts, crop spacing records, and practical notes.",
  tags: ["character diagram", "planting plan", "editable data"],
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
    seasons: { type: "json" },
    selected: { type: "number", min: 0, max: 3, step: 1 },
  },
  interactions: [
    [{ step: "click", selector: "summary" }, { step: "expectAttr", selector: "details", name: "open", value: "" }],
    [{ step: "click", selector: "[data-choice='1']" }, { step: "expectAttr", selector: "[data-choice='1']", name: "aria-pressed", value: "true" }, { step: "expectEvent", name: "selection", detail: { index: 1 } }],
    [{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "[data-choice='0']" }, { step: "press", key: "Tab" }, { step: "expectFocus", selector: "[data-choice='1']" }, { step: "press", key: "Enter" }, { step: "expectAttr", selector: "[data-choice='1']", name: "aria-pressed", value: "true" }],
  ],
  original: true,
  credits: [],
};
