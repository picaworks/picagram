import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-balance-mobile",
  title: "ASCII Balance Mobile",
  category: "ascii",
  description: "An asymmetric suspended mobile carries shaded counterweights on connected rods, with vertical hangers and restrained coupled sways.",
  tags: ["mobile", "balance", "suspension", "counterweight", "braille", "animated"],
  facets: ["animated"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    levels: { type: "number", min: 2, max: 4, step: 1, label: "Rod levels" },
    spread: { type: "number", min: 0.7, max: 1.25, step: 0.05, label: "Horizontal spread" },
    sway: { type: "number", min: 0, max: 1, step: 0.05, label: "Sway strength" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Sway speed" },
    fontSize: { type: "number", min: 12, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Paused" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Phase seed" },
  },
  presets: [
    {
      name: "Three balances",
      description: "Three connected rod levels carry an alternating chain of small counterweights.",
      props: { levels: 3, spread: 1, sway: 0.65, speed: 0.6, fontSize: 14, seed: 1 },
    },
    {
      name: "Open duet",
      description: "Two broad rod levels expose their vertical hangers and the fixed top suspension.",
      props: { levels: 2, spread: 1.15, sway: 0.8, speed: 0.45, fontSize: 14, seed: 3 },
    },
    {
      name: "Quiet cascade",
      description: "Four closer rod levels pass a modest sway through a longer asymmetric cascade.",
      props: { levels: 4, spread: 0.85, sway: 0.5, speed: 0.7, fontSize: 16, seed: 4 },
    },
  ],
  original: true,
  credits: [],
};
