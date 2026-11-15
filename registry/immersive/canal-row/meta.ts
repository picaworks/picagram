import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "canal-row",
  title: "Canal Row",
  category: "immersive",
  description: "A rigid footbridge lifts between masonry landings above an open canal, unequal townhouse rows and a still waiting boat.",
  tags: ["pixel","isometric","canal","bridge","townhouses"],
  facets: ["animated","canvas"],
  wave: 19,
  release: "pixel-worlds-2026-11-15",
  animated: true,
  decorative: true,
  original: true,
  credits: [],
  palette: ["fg","bg","accent"],
  controls: {
    layout: { type: "select", options: ["parallel","corner","court"], label: "Canal layout" },
    houses: { type: "number", min: 3, max: 5, step: 1, label: "Townhouses" },
    opening: { type: "number", min: 0.35, max: 0.8, step: 0.05, label: "Maximum bridge lift" },
    paused: { type: "boolean", label: "Pause bridge" },
    time: { type: "number", min: 0, max: 20000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Bridge phase seed" },
  },
  presets: [
    { name: "Row Banks", description: "Staggered unequal rows frame a long open channel and foreground bridge.", props: { layout: "parallel", houses: 3, opening: 0.5 } },
    { name: "Corner Basin", description: "An L shaped inlet and angled bank connect two offset townhouse groups.", props: { layout: "corner", houses: 4, opening: 0.7 } },
    { name: "Water Court", description: "Two short wings and a rear row frame a wider court behind the bridge throat.", props: { layout: "court", houses: 5, opening: 0.4 } },
  ],
};
