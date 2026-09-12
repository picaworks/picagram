import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "bar-chart",
  title: "Bar Chart",
  category: "data",
  description: "Vertical bars from labeled values, drawn as SVG or a monospace glyph grid, with a hidden data table.",
  tags: ["chart", "bars", "svg", "glyph grid", "data table"],
  facets: ["static", "chart"],
  wave: 3,
  animated: false,
  decorative: false,
  controls: {
    data: { type: "json" },
    label: { type: "string" },
    highlight: { type: "number", min: -1, max: 30, step: 1 },
    look: { type: "select", options: ["svg", "glyph"] },
    values: { type: "boolean" },
    ticks: { type: "number", min: 2, max: 10, step: 1 },
  },
  palette: ["fg", "accent", "muted"],
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
