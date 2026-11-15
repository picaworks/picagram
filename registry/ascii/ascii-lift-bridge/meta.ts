import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-lift-bridge",
  title: "ASCII Lift Bridge",
  category: "ascii",
  description: "Two rigid bascule leaves meet over a quiet channel, then open about fixed hinge bearings between braced towers and straight tension links.",
  tags: ["bridge", "bascule", "hinge", "mechanism", "braille", "animated"],
  facets: ["animated"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    opening: { type: "number", min: 15, max: 65, step: 5, label: "Maximum opening angle" },
    travel: { type: "number", min: 10, max: 30, step: 1, label: "Cycle percent per moving stroke" },
    towerHeight: { type: "number", min: 0.3, max: 0.6, step: 0.05, label: "Tower height" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Bridge cycle speed" },
    fontSize: { type: "number", min: 14, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause bridge" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting cycle seed" },
  },
  presets: [
    {
      name: "Harbor passage",
      description: "Balanced towers support a broad opening, with distinct moving strokes and short open and closed holds.",
      props: { opening: 50, travel: 24, towerHeight: 0.45, speed: 0.7, fontSize: 16, seed: 1 },
    },
    {
      name: "Low channel",
      description: "Short towers and a shallow opening give the bridge a low profile with longer, gentler moving strokes.",
      props: { opening: 30, travel: 30, towerHeight: 0.3, speed: 0.5, fontSize: 18, seed: 4 },
    },
    {
      name: "High clearance",
      description: "Tall braced towers frame two steeply raised leaves, leaving the central water channel clearly open.",
      props: { opening: 65, travel: 18, towerHeight: 0.6, speed: 0.85, fontSize: 14, seed: 2 },
    },
  ],
  original: true,
  credits: [],
};
