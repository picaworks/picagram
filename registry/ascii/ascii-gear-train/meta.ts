import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-gear-train",
  title: "ASCII Gear Train",
  category: "ascii",
  description: "Three finite spur gears share one tooth pitch and counterrotate at their tooth count ratios, with open spokes and fixed hub bearings.",
  tags: ["gears", "spur", "braille", "mechanism", "rotation", "animated"],
  facets: ["animated"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    teeth: { type: "number", min: 10, max: 18, step: 1, label: "Outer gear teeth" },
    ratio: { type: "number", min: 1, max: 2, step: 0.1, label: "Center tooth count ratio" },
    spread: { type: "number", min: 0.6, max: 1, step: 0.05, label: "Train opening" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Drive rotation speed" },
    fontSize: { type: "number", min: 14, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause gear train" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting orientation seed" },
  },
  presets: [
    {
      name: "Balanced train",
      description: "Twelve tooth outer gears drive an eighteen tooth center gear in a gently bent arrangement.",
      props: { teeth: 12, ratio: 1.5, spread: 0.8, speed: 0.75, fontSize: 16, seed: 1 },
    },
    {
      name: "Coarse reduction",
      description: "Ten broad teeth drive a center gear twice their size, making each meshing tooth easy to follow.",
      props: { teeth: 10, ratio: 2, spread: 0.65, speed: 0.5, fontSize: 16, seed: 4 },
    },
    {
      name: "Fine equal gears",
      description: "Three equal eighteen tooth gears form an open train with finer, evenly sized teeth.",
      props: { teeth: 18, ratio: 1, spread: 0.95, speed: 0.9, fontSize: 14, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
