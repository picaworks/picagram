import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "chiseled-slate",
  title: "Chiseled Slate",
  category: "shaders",
  description: "Unequal chisel pockets expose planar walls and flat floors on a finite slate slab, with a broken edge and quiet mineral grain under slow raking light.",
  tags: ["slate", "stone", "chisel", "planar", "relief", "dither"],
  facets: ["animated", "shader", "webgl", "dither"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    cuts: { type: "number", min: 5, max: 12, step: 1, label: "Finite chisel cuts" },
    depth: { type: "number", min: 0.2, max: 0.8, step: 0.05, label: "Carved depth" },
    direction: { type: "number", min: 15, max: 70, step: 5, label: "Chisel direction" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Raking light speed" },
    intensity: { type: "number", min: 0.3, max: 0.75, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause light" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Tool mark arrangement seed" },
  },
  presets: [
    {
      name: "Mason study",
      description: "Eight unequal angled pockets expose flat cut planes among broad quiet slate regions.",
      props: { cuts: 8, depth: 0.5, direction: 45, speed: 0.65, intensity: 0.5, seed: 1 },
    },
    {
      name: "Deep roughing",
      description: "Five deep, shallow-angle tool strikes emphasize their planar walls and the chipped outer edge.",
      props: { cuts: 5, depth: 0.75, direction: 25, speed: 0.45, intensity: 0.6, seed: 4 },
    },
    {
      name: "Fine dressing",
      description: "Twelve lighter, steeper cuts leave a quieter dressed surface with fine mineral grain.",
      props: { cuts: 12, depth: 0.3, direction: 65, speed: 0.8, intensity: 0.4, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
