import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "contour-engraving",
  title: "Contour Engraving",
  category: "shaders",
  description: "Fine parallel cuts follow a gently folded plate, revealing engraved walls and broad material folds under shifting directional light.",
  tags: ["engraving", "grooves", "folded-plate", "material", "directional-light", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  presets: [
    { name: "Folded Plate", description: "Fine cuts follow broad soft folds with balanced material contrast.", props: { grooves: 48, depth: 0.2, bend: 0.8, speed: 0.6, intensity: 0.85 } },
    { name: "Deep Intaglio", description: "Wider, deeper cuts expose clear bevel highlights on a stronger fold.", props: { grooves: 26, depth: 0.4, bend: 1.2, speed: 0.4, intensity: 0.9 } },
    { name: "Brushed Sheet", description: "Close shallow grooves cross a nearly flat, quieter sheet.", props: { grooves: 64, depth: 0.09, bend: 0.25, speed: 0.5, intensity: 0.6 } },
  ],
  controls: {
    grooves: { type: "number", min: 16, max: 72, step: 1 },
    depth: { type: "number", min: 0.04, max: 0.5, step: 0.01 },
    bend: { type: "number", min: 0, max: 1.5, step: 0.05 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    intensity: { type: "number", min: 0.2, max: 1, step: 0.05 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 120000, step: 100 },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [],
  original: true,
};
