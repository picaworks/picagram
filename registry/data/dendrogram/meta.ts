import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dendrogram",
  title: "Dendrogram",
  category: "data",
  description: "Merge distances set branch lengths in a selectable hierarchy with aligned leaves, horizontal or vertical layouts, and SVG or glyph rendering.",
  tags: ["hierarchy", "cluster", "distance", "tree", "glyph", "svg", "keyboard", "data table"],
  facets: ["static", "chart", "interactive"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  palette: ["fg", "bg", "accent", "muted"],
  controls: {
    tree: { type: "json" },
    orientation: { type: "select", options: ["horizontal", "vertical"] },
    defaultValue: { type: "string" },
    look: { type: "select", options: ["glyph", "svg"] },
    label: { type: "string" },
  },
  controlled: { value: "valueChange" },
  interactions: [[
    { step: "click", selector: "" },
    { step: "expectFocus", selector: "" },
    { step: "press", key: "Home" },
    { step: "expectEvent", name: "valueChange", detail: "all" },
    { step: "press", key: "ArrowRight" },
    { step: "expectEvent", name: "valueChange", detail: "warm" },
  ]],
  credits: [],
  original: true,
};
