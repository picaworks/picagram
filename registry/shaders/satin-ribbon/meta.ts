import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "satin-ribbon",
  title: "Satin Ribbon",
  category: "shaders",
  description: "One finite broad satin ribbon makes a loose S fold and a partial twist, carrying directional fiber sheen between its visible cut edges.",
  tags: ["satin", "ribbon", "cloth", "fold", "anisotropic", "dither"],
  facets: ["animated", "shader", "webgl", "dither"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    width: { type: "number", min: 0.18, max: 0.4, step: 0.02, label: "Flat ribbon width" },
    twist: { type: "number", min: 0.2, max: 0.8, step: 0.05, label: "Partial half turn" },
    roughness: { type: "number", min: 0.25, max: 0.7, step: 0.05, label: "Fiber sheen spread" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Breathing and light speed" },
    intensity: { type: "number", min: 0.3, max: 0.75, step: 0.05, label: "Material ink intensity" },
    paused: { type: "boolean", label: "Pause satin ribbon" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Fold and light orientation seed" },
  },
  presets: [
    {
      name: "Loose satin fold",
      description: "A medium width sheet makes one loose fold and a half sized partial turn with restrained directional sheen.",
      props: { width: 0.3, twist: 0.5, roughness: 0.45, speed: 0.65, intensity: 0.55, seed: 1 },
    },
    {
      name: "Broad soft sash",
      description: "A wide ribbon and a shallow twist spread a softer fiber reflection across broad cloth panels.",
      props: { width: 0.4, twist: 0.25, roughness: 0.7, speed: 0.45, intensity: 0.45, seed: 4 },
    },
    {
      name: "Turned narrow satin",
      description: "A narrower ribbon turns farther at the ends and catches a more focused lengthwise sheen.",
      props: { width: 0.22, twist: 0.8, roughness: 0.25, speed: 0.75, intensity: 0.65, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
