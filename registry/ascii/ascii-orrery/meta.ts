import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-orrery",
  title: "ASCII Orrery",
  category: "ascii",
  description: "Planet beads travel at separate rates on radial arms around a shared sun, inside finite inclined orbital rails with a fine rear edge.",
  tags: ["orrery", "planets", "orbit", "mechanical", "braille", "animated"],
  facets: ["animated"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    orbits: { type: "number", min: 3, max: 6, step: 1, label: "Orbital rails" },
    tilt: { type: "number", min: 20, max: 65, step: 5, label: "Plane inclination" },
    spread: { type: "number", min: 0.55, max: 1, step: 0.05, label: "Assembly spread" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Planet speed" },
    fontSize: { type: "number", min: 14, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause planets" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting orientation seed" },
  },
  presets: [
    {
      name: "Four planet clockwork",
      description: "Four evenly spaced rails and a clear inclination show each planet attached to the central sun.",
      props: { orbits: 4, tilt: 50, spread: 0.85, speed: 0.75, fontSize: 16, seed: 1 },
    },
    {
      name: "Open armature",
      description: "Three broad rails expose long support arms in a gently inclined plane.",
      props: { orbits: 3, tilt: 30, spread: 0.9, speed: 0.5, fontSize: 16, seed: 7 },
    },
    {
      name: "Six planet instrument",
      description: "Six closer rails form a flattened mechanical assembly with distinct travelling beads.",
      props: { orbits: 6, tilt: 60, spread: 1, speed: 0.9, fontSize: 14, seed: 12 },
    },
  ],
  original: true,
  credits: [],
};
