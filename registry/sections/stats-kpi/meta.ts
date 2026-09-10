import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "stats-kpi",
  title: "Stats KPI",
  category: "sections",
  description: "A row of key numbers in mono figures, each with a delta glyph and an inline trend sparkline.",
  tags: ["stats", "kpi", "metrics", "dashboard", "section"],
  wave: 3,
  animated: true,
  decorative: false,
  palette: ["fg", "accent"],
  capture: 1500,
  controls: {
    items: { type: "json" },
    columns: { type: "number", min: 1, max: 6, step: 1 },
    highlight: { type: "number", min: -1, max: 10, step: 1 },
    countUp: { type: "boolean" },
    duration: { type: "number", min: 300, max: 3000, step: 50 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 1, max: 999, step: 1 },
  },
  credits: [],
  original: true,
};
