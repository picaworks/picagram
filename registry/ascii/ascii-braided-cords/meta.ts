import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-braided-cords",
  title: "ASCII Braided Cords",
  category: "ascii",
  description: "Three finite shaded glyph cords braid vertically, leaving clear depth gaps as their crossings travel downward.",
  tags: ["braid", "cords", "strands", "depth", "glyphs", "animated"],
  facets: ["animated"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    crossings: { type: "number", min: 2, max: 6, step: 1, label: "Crossing frequency" },
    spread: { type: "number", min: 0.6, max: 1.3, step: 0.05, label: "Cord spread" },
    thickness: { type: "number", min: 0.7, max: 1.4, step: 0.05, label: "Cord thickness" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Travel speed" },
    fontSize: { type: "number", min: 12, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause motion" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting phase seed" },
  },
  presets: [
    {
      name: "Open braid",
      description: "Three evenly shaded cords make broad crossings at a calm pace.",
      props: { crossings: 3, spread: 1, thickness: 1, speed: 0.65, fontSize: 14, seed: 1 },
    },
    {
      name: "Loose plait",
      description: "Two long crossing repeats leave room between thicker, widely separated cords.",
      props: { crossings: 2, spread: 1.2, thickness: 1.2, speed: 0.4, fontSize: 14, seed: 4 },
    },
    {
      name: "Close weave",
      description: "Five crossing repeats draw a narrower braid with fine strands and distinct underpasses.",
      props: { crossings: 5, spread: 0.7, thickness: 0.8, speed: 0.8, fontSize: 12, seed: 9 },
    },
  ],
  original: true,
  credits: [],
};
