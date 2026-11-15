import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-scissor-lift",
  title: "ASCII Scissor Lift",
  category: "ascii",
  description: "Equal-length crossed bars raise a solid load on a level platform, with visible pivots, a sliding foot and a fixed wheeled base.",
  tags: ["scissor", "lift", "pantograph", "mechanism", "braille", "animated"],
  facets: ["animated"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    stages: { type: "number", min: 2, max: 4, step: 1, label: "Connected stages" },
    extension: { type: "number", min: 0.3, max: 0.85, step: 0.01, label: "Mid-cycle extension" },
    travel: { type: "number", min: 0.1, max: 0.35, step: 0.01, label: "Lift travel" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Lift speed" },
    fontSize: { type: "number", min: 14, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause lift" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting orientation seed" },
  },
  presets: [
    {
      name: "Warehouse rise",
      description: "Three connected stages carry one compact load through a broad, steady lift cycle.",
      props: { stages: 3, extension: 0.56, travel: 0.28, speed: 0.75, fontSize: 16, seed: 1 },
    },
    {
      name: "Low loading",
      description: "Two low stages and larger glyphs show the moving foot clearly beside the fixed pivot.",
      props: { stages: 2, extension: 0.4, travel: 0.2, speed: 0.55, fontSize: 18, seed: 4 },
    },
    {
      name: "Tall reach",
      description: "Four upright stages lift the level platform high above a compact wheeled chassis.",
      props: { stages: 4, extension: 0.7, travel: 0.24, speed: 0.6, fontSize: 14, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
