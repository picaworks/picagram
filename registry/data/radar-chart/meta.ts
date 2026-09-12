import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "radar-chart",
  title: "Radar Chart",
  category: "data",
  description: "Three to eight axes radiating from a centre with closed polygon series, drawn as SVG or a monospace glyph grid, with a hidden data table.",
  tags: ["chart", "radar", "star plot", "svg", "glyph grid", "data table"],
  facets: ["static", "chart"],
  wave: 4,
  animated: false,
  decorative: false,
  controls: {
    data: { type: "json" },
    label: { type: "string" },
    max: { type: "number", min: 0, max: 1000, step: 10 },
    rings: { type: "number", min: 1, max: 6, step: 1 },
    fill: { type: "number", min: 0, max: 0.4, step: 0.02 },
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
      title: "Star Plot",
      author: "NIST/SEMATECH e-Handbook of Statistical Methods",
      url: "https://www.itl.nist.gov/div898/handbook/eda/section3/starplot.htm",
      license: "Public domain",
    },
  ],
};
