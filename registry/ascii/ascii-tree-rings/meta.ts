import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-tree-rings",
  title: "ASCII Tree Rings",
  category: "ascii",
  description: "Annual growth values determine the spacing of nested, irregular ASCII tree rings, with a selected year's band accented.",
  tags: ["tree", "rings", "growth", "cross-section", "annual"],
  facets: ["static", "chart"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  palette: ["fg", "bg", "accent"],
  controls: {
    growth: { type: "numbers", label: "Annual radial growth" },
    years: { type: "numbers", label: "Calendar years" },
    seed: { type: "number", min: 1, max: 999, step: 1 },
    selectedYear: { type: "number", min: 1000, max: 3000, step: 1, label: "Selected year" },
  },
  credits: [],
  original: true,
};
