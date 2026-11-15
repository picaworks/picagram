import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-tidal-shelf", title: "Tidal Shelf", category: "immersive",
  description: "One connected tide enters coastal cuts, fills exposed pool margins and drains beneath a dry rock ridge.",
  tags: ["pixel", "isometric", "tide", "coast", "pools"],
  facets: ["animated", "canvas"], wave: 19, release: "pixel-worlds-2026-11-15",
  animated: true, decorative: true, original: true, credits: [], palette: ["fg", "bg", "accent"],
  controls: {
    layout: { type: "select", options: ["channels", "basins", "arch"], label: "Coastal arrangement" },
    tideRange: { type: "number", min: 0.15, max: 0.55, step: 0.05, label: "Tidal range" },
    cycleSeconds: { type: "number", min: 12, max: 30, step: 1, label: "Tide cycle seconds" },
    paused: { type: "boolean", label: "Pause tide" },
    time: { type: "number", min: 0, max: 30000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Tide phase seed" },
  },
  presets: [
    { name: "Channels", description: "Two inland cuts share a low junction and an open seaward edge.", props: { layout: "channels", tideRange: 0.4, cycleSeconds: 18 } },
    { name: "Basins", description: "Two round pools fill through narrow notches beside a dry saddle.", props: { layout: "basins", tideRange: 0.5, cycleSeconds: 22 } },
    { name: "Arch", description: "A thick raised bridge crosses the inlet to one broad rear pool.", props: { layout: "arch", tideRange: 0.35, cycleSeconds: 16 } },
  ],
};
