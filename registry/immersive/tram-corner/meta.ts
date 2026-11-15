import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "tram-corner",
  title: "Tram Corner",
  category: "immersive",
  description: "A substantial double cab tram follows curved rails past a masonry shop corner, sheltered stop and overhead supports.",
  tags: ["pixel","isometric","tram","rail","neighborhood"],
  facets: ["animated","canvas"],
  wave: 19,
  release: "pixel-worlds-2026-11-15",
  animated: true,
  decorative: true,
  original: true,
  credits: [],
  palette: ["fg","bg","accent"],
  controls: {
    layout: { type: "select", options: ["corner-bend","square-loop-edge","raised-crossing"], label: "Rail layout" },
    carriages: { type: "number", min: 1, max: 2, step: 1, label: "Connected carriages" },
    blockHeight: { type: "number", min: 1, max: 3, step: 1, label: "Block storeys" },
    paused: { type: "boolean", label: "Pause tram" },
    time: { type: "number", min: 0, max: 24000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Route phase seed" },
  },
  presets: [
    { name: "Shop Corner", description: "An L shaped block holds the inside of a broad street level rail bend.", props: { layout: "corner-bend", carriages: 1, blockHeight: 3 } },
    { name: "Square Edge", description: "Two articulated bodies follow a shallow arc beside a triangular public square.", props: { layout: "square-loop-edge", carriages: 2, blockHeight: 2 } },
    { name: "Raised Crossing", description: "A short viaduct crosses a lower lane beside an exposed station stair.", props: { layout: "raised-crossing", carriages: 1, blockHeight: 1 } },
  ],
};
