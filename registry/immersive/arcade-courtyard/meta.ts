import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "arcade-courtyard",
  title: "Arcade Courtyard",
  category: "immersive",
  description: "Open stepped arcades surround a broad court where two calm streams spill from a raised fountain bowl into a lower basin.",
  tags: ["pixel","isometric","arcade","courtyard","fountain"],
  facets: ["animated","canvas"],
  wave: 19,
  release: "pixel-worlds-2026-11-15",
  animated: true,
  decorative: true,
  original: true,
  credits: [],
  palette: ["fg","bg","accent"],
  controls: {
    layout: { type: "select", options: ["u-court","split-court","tower-court"], label: "Court layout" },
    archBays: { type: "number", min: 2, max: 4, step: 1, label: "Open arch bays" },
    gardenCover: { type: "number", min: 0, max: 1, step: 0.05, label: "Planted edge area" },
    paused: { type: "boolean", label: "Pause streams" },
    time: { type: "number", min: 0, max: 20000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Stream phase seed" },
  },
  presets: [
    { name: "Open Court", description: "Three low wings and four open bays frame the fountain's broad forecourt.", props: { layout: "u-court", archBays: 4, gardenCover: 0.25 } },
    { name: "Two Levels", description: "A wide stair descends from an upper arcade court to the lower fountain.", props: { layout: "split-court", archBays: 3, gardenCover: 0.5 } },
    { name: "Corner Tower", description: "A taller masonry corner anchors two short wings opening diagonally.", props: { layout: "tower-court", archBays: 2, gardenCover: 0.7 } },
  ],
};
