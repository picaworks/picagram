import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-helix-ladder",
  title: "ASCII Helix Ladder",
  category: "ascii",
  description: "Two continuous braille strands rotate around evenly spaced rungs, with a fine rear edge and a heavier near edge.",
  tags: ["helix", "ladder", "braille", "rotation", "depth", "animated"],
  facets: ["animated"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    turns: { type: "number", min: 0.75, max: 3, step: 0.25, label: "Complete turns" },
    radius: { type: "number", min: 0.4, max: 1, step: 0.05, label: "Strand radius" },
    rungs: { type: "number", min: 8, max: 28, step: 1, label: "Connecting rungs" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Rotation speed" },
    fontSize: { type: "number", min: 14, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause rotation" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting orientation seed" },
  },
  presets: [
    {
      name: "Open spiral",
      description: "One and a half turns with clear gaps between seventeen connecting rungs.",
      props: { turns: 1.5, radius: 0.8, rungs: 17, speed: 0.7, fontSize: 16, seed: 1 },
    },
    {
      name: "Broad ladder",
      description: "One broad turn and twelve rungs make the connected structure easy to follow.",
      props: { turns: 1, radius: 1, rungs: 12, speed: 0.45, fontSize: 16, seed: 4 },
    },
    {
      name: "Close winding",
      description: "Two and a quarter narrow turns hold twenty two rungs in a taller winding silhouette.",
      props: { turns: 2.25, radius: 0.6, rungs: 22, speed: 0.85, fontSize: 14, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
