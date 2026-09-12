import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "waterfall-chart",
  title: "Waterfall Chart",
  category: "data",
  description: "A start value, signed changes floating between running totals, and an end total, with hairline connectors.",
  tags: ["chart", "waterfall", "bridge", "flow", "svg", "glyph grid", "data table"],
  facets: ["static", "chart"],
  wave: 4,
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
      title: "Horizontal waterfall chart",
      author: "IBCS, International Business Communication Standards",
      url: "https://www.ibcs.com/resource/horizontal-waterfall-chart/",
      license: "Standard, no code",
    },
  ],
};
