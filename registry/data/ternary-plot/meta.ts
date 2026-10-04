import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ternary-plot",
  title: "Ternary Plot",
  category: "data",
  description: "Three-part compositions normalized to a triangular chart, with directly labeled samples, keyboard selection, and an accessible table of weights and proportions.",
  tags: ["ternary", "composition", "proportions", "triangle", "glyph grid", "svg", "data table", "keyboard"],
  facets: ["static", "chart", "interactive"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  original: true,
  controls: {
    points: { type: "json" },
    labels: { type: "json" },
    label: { type: "string" },
    defaultValue: { type: "string" },
    look: { type: "select", options: ["glyph", "svg"] },
  },
  palette: ["fg", "bg", "accent", "muted"],
  controlled: { value: "valueChange" },
  interactions: [
    [
      { step: "click", selector: "" },
      { step: "expectFocus", selector: "" },
      { step: "press", key: "Home" },
      { step: "expectEvent", name: "valueChange", detail: "clay" },
      { step: "press", key: "ArrowRight" },
      { step: "expectEvent", name: "valueChange", detail: "silt" },
    ],
  ],
  credits: [],
};
