import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-hanging-waterfall", title: "Hanging Waterfall", category: "immersive",
  description: "A broad stepped stream spills over split rock strata into a shallow plunge basin and open outlet.",
  tags: ["pixel", "isometric", "waterfall", "water", "rock"],
  facets: ["animated", "canvas"], wave: 19, release: "pixel-worlds-2026-11-15",
  animated: true, decorative: true, original: true, credits: [], palette: ["fg", "bg", "accent"],
  controls: {
    layout: { type: "select", options: ["overhang", "split", "stairs"], label: "Cascade arrangement" },
    dropHeight: { type: "number", min: 0.45, max: 0.85, step: 0.05, label: "Drop height" },
    flow: { type: "number", min: 0.25, max: 1, step: 0.05, label: "Water flow" },
    paused: { type: "boolean", label: "Pause water" },
    time: { type: "number", min: 0, max: 20000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Water phase seed" },
  },
  presets: [
    { name: "Overhang", description: "A single high curtain hangs over an open rock recess.", props: { layout: "overhang", dropHeight: 0.75, flow: 0.75 } },
    { name: "Split", description: "A central tooth divides the upper stream into two receiving falls.", props: { layout: "split", dropHeight: 0.8, flow: 0.85 } },
    { name: "Stairs", description: "Three broad shelves carry a physically connected zigzag cascade.", props: { layout: "stairs", dropHeight: 0.65, flow: 0.65 } },
  ],
};
