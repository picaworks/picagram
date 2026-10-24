import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-string-modes",
  title: "ASCII String Modes",
  category: "ascii",
  description: "Three separated strings oscillate between fixed anchors, with consecutive standing modes, stationary nodes and sparse preceding traces.",
  tags: ["string", "harmonic", "standing-wave", "nodes", "braille", "animated"],
  facets: ["animated"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    harmonic: { type: "number", min: 1, max: 4, step: 1, label: "First harmonic" },
    amplitude: { type: "number", min: 0.1, max: 0.4, step: 0.05, label: "Displacement" },
    spacing: { type: "number", min: 0.5, max: 0.8, step: 0.05, label: "Vertical separation" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Oscillation speed" },
    fontSize: { type: "number", min: 12, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Paused" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Phase seed" },
  },
  presets: [
    {
      name: "First harmonics",
      description: "The first three modes show one, two and three lobes between the same fixed endpoints.",
      props: { harmonic: 1, amplitude: 0.3, spacing: 0.65, speed: 0.6, fontSize: 14, seed: 1 },
    },
    {
      name: "Quiet overtones",
      description: "Modes three through five carry shallow oscillations with clear stationary nodes.",
      props: { harmonic: 3, amplitude: 0.2, spacing: 0.7, speed: 0.4, fontSize: 14, seed: 3 },
    },
    {
      name: "Wide excursion",
      description: "Three low modes use more vertical space while the anchors and dotted baselines remain fixed.",
      props: { harmonic: 1, amplitude: 0.4, spacing: 0.6, speed: 0.5, fontSize: 16, seed: 5 },
    },
  ],
  original: true,
  credits: [],
};
