import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "glass-ripple-lens",
  title: "Glass Ripple Lens",
  category: "shaders",
  description: "One offset circular lens refracts a crisp ruled field, with shallow internal ripples, a directional rim highlight, and a quiet outer ground.",
  tags: ["glass", "lens", "refraction", "ripple", "ruled", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "accent"],
  capture: 4200,
  controls: {
    radius: { type: "number", min: 0.15, max: 0.36, step: 0.01 },
    bend: { type: "number", min: 0.15, max: 1.5, step: 0.05 },
    rings: { type: "number", min: 0, max: 5, step: 1 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    intensity: { type: "number", min: 0.1, max: 1, step: 0.05 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 60000, step: 100 },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  presets: [
    {
      name: "Quiet lens",
      description: "A medium lens gives the ruled field a broad bend and two shallow internal ripples.",
      props: { radius: 0.3, bend: 0.95, rings: 2, speed: 0.45, intensity: 0.75, seed: 1 },
    },
    {
      name: "Clear magnifier",
      description: "A larger smooth lens reveals the basic optical displacement without internal ripples.",
      props: { radius: 0.36, bend: 1.3, rings: 0, speed: 0, intensity: 0.85, seed: 4 },
    },
    {
      name: "Ripple study",
      description: "A smaller lens carries four gentle internal ripples through closely changing line bends.",
      props: { radius: 0.23, bend: 1.15, rings: 4, speed: 0.75, intensity: 0.9, seed: 8 },
    },
  ],
  original: true,
  credits: [],
};
