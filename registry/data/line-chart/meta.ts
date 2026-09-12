import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "line-chart",
  title: "Line Chart",
  category: "data",
  description: "One or more series plotted as lines over a shared set of labels, in an svg or braille glyph look.",
  tags: ["chart", "line", "svg", "braille", "data"],
  facets: ["static", "chart"],
  wave: 3,
  animated: false,
  decorative: false,
  palette: ["fg", "accent", "muted"],
  controls: {
    data: { type: "json", label: "Data" },
    label: { type: "string" },
    area: { type: "boolean" },
    dots: { type: "boolean" },
    look: { type: "select", options: ["svg", "glyph"] },
    ticks: { type: "number", min: 2, max: 10, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Nice Numbers for Graph Labels",
      author: "Paul Heckbert, Graphics Gems",
      url: "https://dl.acm.org/doi/10.5555/90767.90846",
      license: "Algorithm, no code",
    },
  ],
};
