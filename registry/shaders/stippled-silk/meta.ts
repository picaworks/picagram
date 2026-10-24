import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "stippled-silk",
  title: "Stippled Silk",
  category: "shaders",
  description: "Fine woven threads bend and compress with broad cloth folds under a slow grazing light, rendered in ordered tone with a CSS fallback.",
  tags: ["cloth", "silk", "weave", "folds", "material"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  capture: 2400,
  presets: [
    {
      name: "Satin fold",
      description: "Broad balanced folds carry a fine visible weave and a restrained moving sheen.",
      props: { folds: 3.5, weave: 3.5, drape: 0.8, speed: 0.45, intensity: 1, seed: 1 },
    },
    {
      name: "Loose drape",
      description: "Fewer deeper folds and a wider thread spacing give the sheet a softer, heavier hang.",
      props: { folds: 2.5, weave: 4.4, drape: 1.1, speed: 0.25, intensity: 0.85, seed: 4 },
    },
    {
      name: "Fine pleats",
      description: "More closely gathered shallow folds and smaller threads create a crisp woven surface.",
      props: { folds: 6, weave: 2.8, drape: 0.5, speed: 0.6, intensity: 1.05, seed: 7 },
    },
  ],
  controls: {
    folds: { type: "number", min: 2, max: 7, step: 0.5 },
    weave: { type: "number", min: 2, max: 7, step: 0.1 },
    drape: { type: "number", min: 0.1, max: 1.5, step: 0.05 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    intensity: { type: "number", min: 0.25, max: 1.3, step: 0.05 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 120000, step: 100 },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
