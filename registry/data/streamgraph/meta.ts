import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "streamgraph",
  title: "Streamgraph",
  category: "data",
  description: "A stacked area chart centred on a middle line, where each layer's thickness is its value, in an svg or braille glyph look.",
  tags: ["chart", "streamgraph", "stacked", "svg", "braille", "data"],
  facets: ["static", "chart"],
  wave: 10,
  animated: false,
  decorative: false,
  palette: ["fg", "accent", "bg", "muted"],
  controls: {
    data: { type: "json", label: "Data" },
    label: { type: "string" },
    order: { type: "select", options: ["inside-out", "input"] },
    highlight: { type: "number", min: -1, max: 20, step: 1 },
    look: { type: "select", options: ["svg", "glyph"] },
    ticks: { type: "number", min: 2, max: 10, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Stacked Graphs: Geometry and Aesthetics",
      author: "Lee Byron and Martin Wattenberg",
      url: "https://doi.org/10.1109/TVCG.2008.166",
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
