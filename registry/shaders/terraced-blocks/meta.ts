import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "terraced-blocks",
  title: "Terraced Blocks",
  category: "shaders",
  description: "Finite staggered rectangular plateaus descend toward one clear opening, with beveled faces and shadows cast by their actual heights.",
  tags: ["terraces", "blocks", "plateaus", "bevels", "cast-shadow", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    tiers: { type: "number", min: 2, max: 4, step: 1, label: "Terrace tiers" },
    depth: { type: "number", min: 0.3, max: 1.5, step: 0.05, label: "Step height" },
    stagger: { type: "number", min: 0, max: 1, step: 0.05, label: "Plateau stagger" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Light orbit speed" },
    intensity: { type: "number", min: 0.2, max: 1, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause light" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Initial light direction seed" },
  },
  presets: [
    {
      name: "Reading court",
      description: "Three medium-height tiers frame a clear central opening with alternating plateau joints.",
      props: { tiers: 3, depth: 0.8, stagger: 0.6, speed: 0.65, intensity: 0.65, seed: 1 },
    },
    {
      name: "Low terraces",
      description: "Two shallow tiers leave broad, quiet plateaus around the opening.",
      props: { tiers: 2, depth: 0.4, stagger: 0.35, speed: 0.5, intensity: 0.55, seed: 4 },
    },
    {
      name: "Stepped enclosure",
      description: "Four taller tiers reveal narrow bevels and longer coherent shadows between the blocks.",
      props: { tiers: 4, depth: 1.15, stagger: 0.85, speed: 0.85, intensity: 0.75, seed: 9 },
    },
  ],
  original: true,
  credits: [],
};
