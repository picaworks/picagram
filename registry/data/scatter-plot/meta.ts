import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "scatter-plot",
  title: "Scatter Plot",
  category: "data",
  description: "Points from JSON on two linear axes, with highlighted points labeled directly beside them and an optional fit line.",
  tags: ["chart", "scatter", "svg", "glyph grid", "data table", "regression"],
  facets: ["static", "chart"],
  wave: 4,
  animated: false,
  decorative: false,
  controls: {
    data: { type: "json" },
    label: { type: "string" },
    highlight: { type: "json" },
    fit: { type: "boolean" },
    xLabel: { type: "string" },
    yLabel: { type: "string" },
    dotSize: { type: "number", min: 0.5, max: 4, step: 0.5 },
    ticks: { type: "number", min: 2, max: 10, step: 1 },
    look: { type: "select", options: ["svg", "glyph"] },
  },
  palette: ["fg", "accent", "muted"],
  credits: [
    {
      relation: "technique",
      title: "Graphical Perception: Theory, Experimentation, and Application to the Development of Graphical Methods",
      author: "William S. Cleveland and Robert McGill",
      url: "https://doi.org/10.1080/01621459.1984.10478080",
      license: "Paper",
    },
    {
      relation: "technique",
      title: "Nice Numbers for Graph Labels",
      author: "Paul Heckbert",
      url: "https://dl.acm.org/doi/10.5555/90767.90846",
      license: "Algorithm, no code",
    },
  ],
};
