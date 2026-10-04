import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "parallel-coordinate-plot",
  title: "Parallel Coordinate Plot",
  category: "data",
  description: "Supplied records traverse normalized vertical axes with direct labels, selectable paths, missing-value gaps, and an accessible numeric table.",
  tags: ["parallel coordinates", "multivariate", "comparison", "selection", "glyph grid", "svg", "data table", "keyboard"],
  facets: ["static", "chart", "interactive"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  original: true,
  palette: ["fg", "bg", "accent", "muted"],
  controlled: { value: "valueChange" },
  controls: {
    axes: { type: "json" },
    records: { type: "json" },
    defaultValue: { type: "string" },
    look: { type: "select", options: ["glyph", "svg"] },
    label: { type: "string" },
  },
  interactions: [
    [
      { step: "click", selector: "" },
      { step: "expectFocus", selector: "" },
      { step: "press", key: "Home" },
      { step: "expectEvent", name: "valueChange", detail: "aster" },
      { step: "press", key: "ArrowRight" },
      { step: "expectEvent", name: "valueChange", detail: "birch" },
    ],
  ],
  credits: [],
};
