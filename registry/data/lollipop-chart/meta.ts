import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "lollipop-chart",
  title: "Lollipop Chart",
  category: "data",
  description: "Ranked horizontal rows, each a hairline stem to a dot at its value, as SVG or a glyph grid, with a hidden data table.",
  tags: ["chart", "lollipop", "ranking", "dot plot", "svg", "glyph grid", "data table"],
  facets: ["static", "chart"],
  wave: 10,
  animated: false,
  decorative: false,
  controls: {
    data: { type: "json" },
    label: { type: "string" },
    sort: { type: "select", options: ["value", "input"] },
    highlight: { type: "number", min: -1, max: 30, step: 1 },
    values: { type: "boolean" },
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
      author: "Paul Heckbert, Graphics Gems",
      url: "https://dl.acm.org/doi/10.5555/90767.90846",
      license: "Algorithm, no code",
    },
  ],
};
