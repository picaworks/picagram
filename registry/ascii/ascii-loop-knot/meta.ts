import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-loop-knot",
  title: "ASCII Loop Knot",
  category: "ascii",
  description: "One closed braille loop turns slowly in space, with clear over and under crossings.",
  tags: ["knot", "braille", "loop", "interlaced", "geometry"],
  facets: ["animated"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  presets: [
    { name: "Trefoil", description: "Three open lobes form a spacious, slowly turning knot.", props: { winding: 3, spread: 1.05, speed: 0.65, fontSize: 13 } },
    { name: "Cinquefoil", description: "Five crossings weave a closer loop for a more intricate centerpiece.", props: { winding: 5, spread: 1.15, speed: 0.45, fontSize: 12 } },
    { name: "Sevenfold", description: "Seven broad lobes make a dense woven ring with a very slow turn.", props: { winding: 7, spread: 1.3, speed: 0.3, fontSize: 12 } },
  ],
  controls: {
    winding: { type: "number", min: 3, max: 7, step: 2 },
    spread: { type: "number", min: 0.65, max: 1.3, step: 0.05 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    fontSize: { type: "number", min: 11, max: 20, step: 1 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 120000, step: 100 },
    seed: { type: "number", min: 1, max: 100, step: 1 },
  },
  credits: [],
  original: true,
};
