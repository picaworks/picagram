import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-elastic-membrane",
  title: "ASCII Elastic Membrane",
  category: "ascii",
  description: "A finite rectangular glyph lattice carries smooth standing modes in an oblique view while its edges stay pinned.",
  tags: ["membrane", "mesh", "standing-wave", "elastic", "braille", "animated"],
  facets: ["animated"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    mode: { type: "select", options: ["single", "cross", "paired"], label: "Standing mode" },
    amplitude: { type: "number", min: 0.1, max: 0.6, step: 0.05, label: "Displacement" },
    tilt: { type: "number", min: 20, max: 60, step: 1, label: "View tilt" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Oscillation speed" },
    fontSize: { type: "number", min: 12, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Paused" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Phase seed" },
  },
  presets: [
    {
      name: "Central swell",
      description: "One broad antinode rises and settles within four stationary edges.",
      props: { mode: "single", amplitude: 0.4, tilt: 38, speed: 0.6, fontSize: 14, seed: 1 },
    },
    {
      name: "Four lobes",
      description: "Crossed standing modes bend the lattice into four alternating shallow lobes.",
      props: { mode: "cross", amplitude: 0.3, tilt: 32, speed: 0.5, fontSize: 14, seed: 2 },
    },
    {
      name: "Coupled pair",
      description: "Two neighboring lobes exchange height with a small secondary mode across the sheet.",
      props: { mode: "paired", amplitude: 0.45, tilt: 45, speed: 0.7, fontSize: 16, seed: 4 },
    },
  ],
  original: true,
  credits: [],
};
