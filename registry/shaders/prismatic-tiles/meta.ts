import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "prismatic-tiles",
  title: "Prismatic Tiles",
  category: "shaders",
  description: "A regular field of rhombic bevel facets shares one slowly moving light, fine printed grain, and a single accent facet, with a CSS fallback.",
  tags: ["rhombus", "facets", "bevel", "tiles", "printed-grain"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "accent"],
  capture: 2400,
  presets: [
    {
      name: "Cut facets",
      description: "Balanced rhombic tiles with distinct bevel faces and a slow shared light.",
      props: { tiles: 6, bevel: 0.32, angle: -10, speed: 0.45, intensity: 1, seed: 1 },
    },
    {
      name: "Broad crystal",
      description: "Larger, deeper facets make a quiet architectural relief with stronger face contrast.",
      props: { tiles: 3.5, bevel: 0.55, angle: 20, speed: 0.28, intensity: 0.95, seed: 4 },
    },
    {
      name: "Fine tesserae",
      description: "A denser field of shallow tiles creates a restrained printed material background.",
      props: { tiles: 10, bevel: 0.18, angle: 0, speed: 0.55, intensity: 0.8, seed: 7 },
    },
  ],
  controls: {
    tiles: { type: "number", min: 3, max: 12, step: 0.5 },
    bevel: { type: "number", min: 0.05, max: 0.7, step: 0.01 },
    angle: { type: "number", min: -90, max: 90, step: 1 },
    speed: { type: "number", min: 0, max: 2, step: 0.01 },
    intensity: { type: "number", min: 0.25, max: 1.3, step: 0.05 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 120000, step: 100 },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
