import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-dune-slipface", title: "Dune Slipface", category: "immersive",
  description: "A low broad dune carries short dry sand releases across a quiet slipface into a contained receiving apron.",
  tags: ["pixel", "isometric", "dune", "sand", "desert"],
  facets: ["animated", "canvas"], wave: 19, release: "pixel-worlds-2026-11-15",
  animated: true, decorative: true, original: true, credits: [], palette: ["fg", "bg", "accent"],
  controls: {
    layout: { type: "select", options: ["crescent", "saddle", "ridge"], label: "Dune arrangement" },
    crestHeight: { type: "number", min: 0.45, max: 0.8, step: 0.05, label: "Crest height" },
    releaseSeconds: { type: "number", min: 7, max: 16, step: 1, label: "Release interval seconds" },
    paused: { type: "boolean", label: "Pause sand" },
    time: { type: "number", min: 0, max: 32000, step: 100, label: "Fixed time" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Release phase seed" },
  },
  presets: [
    { name: "Crescent", description: "Two low forward horns shelter a broad central slipface and landing hollow.", props: { layout: "crescent", crestHeight: 0.65, releaseSeconds: 10 } },
    { name: "Saddle", description: "Unequal rounded peaks share a low saddle beside the taller peak's short sand releases.", props: { layout: "saddle", crestHeight: 0.75, releaseSeconds: 12 } },
    { name: "Ridge", description: "A long diagonal crest carries a broad lee face and short offset sand releases.", props: { layout: "ridge", crestHeight: 0.6, releaseSeconds: 8 } },
  ],
};
