import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pendulum-chain",
  title: "Pendulum Chain",
  category: "motion",
  description: "Linked glyph pendulums exchange motion slowly across fixed cells, with real coupling controlling phase and energy transfer.",
  tags: ["pendulum", "coupling", "glyph", "physics"],
  facets: ["animated"],
  wave: 15,
  release: "components-2026-10-04",
  animated: true,
  decorative: false,
  controls: {
    count: { type: "number", min: 2, max: 16, step: 1, label: "Pendulums" },
    coupling: { type: "number", min: 0, max: 2, step: 0.05, label: "Neighbor coupling" },
    amplitude: { type: "number", min: 0, max: 1, step: 0.05, label: "Swing amplitude" },
    period: { type: "number", min: 2, max: 30, step: 0.5, label: "Period (seconds)" },
    label: { type: "string", label: "Accessible name" },
    paused: { type: "boolean" },
  },
  palette: ["fg", "accent", "muted"],
  credits: [],
  original: true,
};
