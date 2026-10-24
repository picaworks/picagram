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
  presets: [
    {
        "name": "Compact exchange",
        "description": "Four larger pendulums make the transfer easy to read.",
        "props": {
            "count": 4,
            "coupling": 0.65,
            "amplitude": 0.8,
            "period": 7
        }
    },
    {
        "name": "Five coupled",
        "description": "A longer chain with stronger transfer between neighbors.",
        "props": {
            "count": 5,
            "coupling": 1.2,
            "amplitude": 0.7,
            "period": 8
        }
    },
    {
        "name": "Independent swings",
        "description": "Zero coupling keeps the pendulums from exchanging energy.",
        "props": {
            "count": 4,
            "coupling": 0,
            "amplitude": 0.75,
            "period": 6
        }
    }
],
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
