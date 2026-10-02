import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "slope-chart",
  title: "Slope Chart",
  category: "data",
  description: "Two periods on two shared-scale axes with one straight line per item, labelled at both ends, in an svg or braille glyph look.",
  tags: ["chart", "slope", "comparison", "before and after", "svg", "braille", "data table"],
  facets: ["static", "chart"],
  wave: 10,
  animated: false,
  decorative: false,
  palette: ["fg", "accent", "muted"],
  controls: {
    data: { type: "json", label: "Data" },
    label: { type: "string" },
    highlight: { type: "number", min: -1, max: 20, step: 1 },
    values: { type: "boolean" },
    ticks: { type: "number", min: 2, max: 10, step: 1 },
    look: { type: "select", options: ["svg", "glyph"] },
  },
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
