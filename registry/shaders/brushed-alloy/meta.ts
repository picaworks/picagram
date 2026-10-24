import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "brushed-alloy",
  title: "Brushed Alloy",
  category: "shaders",
  description: "Fine directional grooves on a shallow alloy plate catch two broad moving light bands, with ordered tone and a palette-based CSS fallback.",
  tags: ["metal", "brushed", "grain", "anisotropic", "reflections"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  capture: 2400,
  presets: [
    {
      name: "Satin plate",
      description: "Fine horizontal grain and balanced, broad reflections move gently across the plate.",
      props: { grain: 0.65, direction: -12, roughness: 0.42, speed: 0.45, intensity: 1, seed: 1 },
    },
    {
      name: "Drawn sheet",
      description: "Strong vertical brushing catches narrower reflections with a slower movement.",
      props: { grain: 0.95, direction: 90, roughness: 0.18, speed: 0.25, intensity: 1.1, seed: 4 },
    },
    {
      name: "Soft diagonal",
      description: "A quieter diagonal grain and broader reflections make a restrained material background.",
      props: { grain: 0.3, direction: 35, roughness: 0.75, speed: 0.32, intensity: 0.72, seed: 7 },
    },
  ],
  controls: {
    grain: { type: "number", min: 0, max: 1, step: 0.05 },
    direction: { type: "number", min: -180, max: 180, step: 1 },
    roughness: { type: "number", min: 0.05, max: 0.95, step: 0.01 },
    speed: { type: "number", min: 0, max: 2, step: 0.01 },
    intensity: { type: "number", min: 0.2, max: 1.3, step: 0.01 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 120000, step: 100 },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
