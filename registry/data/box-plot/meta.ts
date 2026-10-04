import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "box-plot",
  title: "Box Plot",
  category: "data",
  description: "The spread of several groups on one value axis, with quartile boxes, medians, whiskers, and outliers, as SVG or a glyph grid.",
  tags: ["chart", "distribution", "quartiles", "outliers", "svg", "glyph grid", "data table"],
  facets: ["static", "chart"],
  wave: 10,
  animated: false,
  decorative: false,
  controls: {
    data: { type: "json" },
    label: { type: "string" },
    highlight: { type: "number", min: -1, max: 20, step: 1 },
    whisker: { type: "number", min: 0.5, max: 3, step: 0.1 },
    ticks: { type: "number", min: 2, max: 10, step: 1 },
    look: { type: "select", options: ["svg", "glyph"] },
  },
  palette: ["fg", "accent", "muted"],
  credits: [
    {
      relation: "technique",
      title: "Graphical Methods for Data Analysis",
      author: "John M. Chambers, William S. Cleveland, Beat Kleiner and Paul A. Tukey",
      url: "https://doi.org/10.1201/9781351072304",
      license: "Book",
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
