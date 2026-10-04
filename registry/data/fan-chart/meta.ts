import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "fan-chart",
  title: "Fan Chart",
  category: "data",
  description: "A central series and supplied uncertainty bounds form nested forecast envelopes in SVG or measured glyph density, with an accessible numeric table.",
  tags: ["forecast", "uncertainty", "intervals", "time-series", "glyph-grid", "svg", "data-table"],
  facets: ["static", "chart"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  original: true,
  palette: ["fg", "bg", "accent", "muted"],
  controls: {
    series: { type: "json" },
    intervals: { type: "json" },
    labels: { type: "json" },
    label: { type: "string" },
    look: { type: "select", options: ["glyph", "svg"] },
  },
  credits: [],
};
