import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-wind-grove",
  title: "Wind Grove",
  category: "immersive",
  description: "Uneven foliage clusters sway on attached branches above exposed roots, a hollow stump and a finite island.",
  tags: ["pixel", "isometric", "trees", "wind"],
  facets: ["animated", "canvas"],
  wave: 19,
  release: "pixel-worlds-2026-11-15",
  animated: true,
  decorative: true,
  original: true,
  credits: [],
  palette: ["fg", "bg", "accent"],
  controls: {
    layout: { type: "select", options: ["splitCedar", "leaningPine", "rootArch"], label: "Tree arrangement" },
    crownSpan: { type: "number", min: 0.55, max: 0.85, step: 0.05, label: "Crown span" },
    wind: { type: "number", min: 0.15, max: 0.8, step: 0.05, label: "Wind strength" },
    paused: { type: "boolean", label: "Pause wind" },
    time: { type: "number", min: 0, max: 20000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Wind phase seed" },
  },
  presets: [
    { name: "Split Cedar", description: "Unequal high crowns leave a broad opening above the low stump.", props: { layout: "splitCedar", crownSpan: 0.75, wind: 0.45 } },
    { name: "Leaning Pine", description: "Three horizontal boughs climb a leaning trunk opposite a short companion.", props: { layout: "leaningPine", crownSpan: 0.7, wind: 0.5 } },
    { name: "Root Arch", description: "A low crown spans two exposed roots and the hollow beneath them.", props: { layout: "rootArch", crownSpan: 0.8, wind: 0.35 } },
  ],
};
