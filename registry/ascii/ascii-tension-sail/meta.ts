import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-tension-sail",
  title: "ASCII Tension Sail",
  category: "ascii",
  description: "A finite triangular textile saddle stretches between three visible anchors, with bowed edges, a denser near corner and a gentle interior breeze.",
  tags: ["sail", "textile", "saddle", "tension", "braille", "animated"],
  facets: ["animated"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    curve: { type: "number", min: 0.2, max: 0.65, step: 0.05, label: "Saddle curvature" },
    mesh: { type: "number", min: 7, max: 13, step: 1, label: "Textile divisions" },
    breeze: { type: "number", min: 0.05, max: 0.2, step: 0.01, label: "Breeze displacement" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Breeze speed" },
    fontSize: { type: "number", min: 14, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause breeze" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Sail orientation seed" },
  },
  presets: [
    {
      name: "Harbor canopy",
      description: "A balanced triangular saddle carries ten mesh divisions and a calm breeze between three fixed tethers.",
      props: { curve: 0.45, mesh: 10, breeze: 0.12, speed: 0.7, fontSize: 16, seed: 1 },
    },
    {
      name: "Quiet awning",
      description: "A shallow sail with seven broad mesh divisions reveals its three bowed edges and corner rings.",
      props: { curve: 0.25, mesh: 7, breeze: 0.06, speed: 0.45, fontSize: 18, seed: 4 },
    },
    {
      name: "Deep tension",
      description: "Stronger saddle curvature and thirteen textile divisions emphasize the dense front corner in a steady breeze.",
      props: { curve: 0.6, mesh: 13, breeze: 0.16, speed: 0.85, fontSize: 14, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
