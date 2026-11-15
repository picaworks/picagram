import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-terraced-garden", title: "Terraced Garden", category: "immersive",
  description: "Broad crop clumps alternate with bare soil and connected irrigation rills across three deep hillside terraces.",
  tags: ["pixel", "isometric", "garden", "terraces", "irrigation"],
  facets: ["animated", "canvas"], wave: 19, release: "pixel-worlds-2026-11-15",
  animated: true, decorative: true, original: true, credits: [], palette: ["fg", "bg", "accent"],
  controls: {
    layout: { type: "select", options: ["fan", "switchback", "bowl"], label: "Terrace arrangement" },
    planting: { type: "number", min: 0.3, max: 0.7, step: 0.05, label: "Planted soil coverage" },
    flow: { type: "number", min: 0.2, max: 0.8, step: 0.05, label: "Irrigation flow" },
    paused: { type: "boolean", label: "Pause irrigation" },
    time: { type: "number", min: 0, max: 20000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Water phase seed" },
  },
  presets: [
    { name: "Fan", description: "A descending central feeder branches across three spreading crop terraces.", props: { layout: "fan", planting: 0.5, flow: 0.5 } },
    { name: "Switchback", description: "Long planted shelves send water around alternating ends before each drop.", props: { layout: "switchback", planting: 0.6, flow: 0.65 } },
    { name: "Bowl", description: "Nested horseshoe beds wrap a central catch basin and share aligned spill notches.", props: { layout: "bowl", planting: 0.45, flow: 0.4 } },
  ],
};
