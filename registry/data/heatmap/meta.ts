import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "heatmap",
  title: "Heatmap",
  category: "data",
  description: "A matrix of values displayed as tone-stepped cells with row and column labels and a stepped key.",
  tags: ["chart", "matrix", "heatmap", "svg", "glyph grid", "data table"],
  facets: ["static", "chart"],
  wave: 4,
  animated: false,
  decorative: false,
  controls: {
    data: { type: "json" },
    label: { type: "string" },
    steps: { type: "number", min: 2, max: 8, step: 1 },
    highlight: { type: "boolean" },
    legend: { type: "boolean" },
    look: { type: "select", options: ["svg", "glyph"] },
  },
  palette: ["fg", "accent", "muted"],
  credits: [
    {
      relation: "technique",
      title: "The History of the Cluster Heat Map",
      author: "Leland Wilkinson and Michael Friendly",
      url: "https://doi.org/10.1198/tas.2009.0033",
      license: "Paper",
    },
  ],
};
