import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "horizon-chart",
  title: "Horizon Chart",
  category: "data",
  description: "Signed series fold into compact density bands with a shared magnitude scale, negative slash hatching, and an accessible sample table.",
  tags: ["horizon", "signed", "deviation", "density", "glyph grid", "svg", "data table"],
  facets: ["static", "chart"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  palette: ["fg", "bg", "muted"],
  controls: {
    series: { type: "json" },
    baseline: { type: "number", min: -1000, max: 1000, step: 0.5 },
    bands: { type: "number", min: 2, max: 6, step: 1 },
    labels: { type: "json" },
    look: { type: "select", options: ["glyph", "svg"] },
    label: { type: "string" },
  },
  credits: [],
  original: true,
};
