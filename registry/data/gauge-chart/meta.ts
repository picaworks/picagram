import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "gauge-chart",
  title: "Gauge Chart",
  category: "data",
  description: "One number against its range, drawn as an arc with threshold ticks and the value in the middle.",
  tags: ["chart", "gauge", "arc", "svg", "glyph grid", "data table"],
  facets: ["static", "chart"],
  wave: 4,
  animated: false,
  decorative: false,
  controls: {
    value: { type: "number", min: 0, max: 200, step: 1 },
    min: { type: "number", min: -100, max: 100, step: 1 },
    max: { type: "number", min: 0, max: 200, step: 1 },
    label: { type: "string" },
    unit: { type: "string" },
    thresholds: { type: "json" },
    thickness: { type: "number", min: 0.05, max: 0.4, step: 0.01 },
    look: { type: "select", options: ["svg", "glyph"] },
  },
  palette: ["fg", "accent", "muted"],
  credits: [
    {
      relation: "technique",
      title: "Dashboard Design for Real-Time Situation Awareness",
      author: "Stephen Few",
      url: "https://www.perceptualedge.com/articles/Whitepapers/Dashboard_Design.pdf",
      license: "Article",
    },
  ],
};
