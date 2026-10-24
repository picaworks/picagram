import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "orbiting-halftone",
  title: "Orbiting Halftone",
  category: "shaders",
  description: "Three broad tone discs drift in small unequal orbits, combining printed coverage on a fixed halftone screen with stationary dot centers.",
  tags: ["halftone", "print", "discs", "orbit", "screen", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "muted", "accent"],
  capture: 4800,
  controls: {
    dots: { type: "number", min: 18, max: 90, step: 1 },
    orbit: { type: "number", min: 0, max: 0.08, step: 0.005 },
    overlap: { type: "number", min: 0, max: 1, step: 0.05 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    intensity: { type: "number", min: 0.1, max: 1, step: 0.05 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 60000, step: 100 },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  presets: [
    {
      name: "Printed trio",
      description: "A medium screen holds three overlapping discs through small unequal orbits.",
      props: { dots: 42, orbit: 0.035, overlap: 0.6, speed: 0.55, intensity: 0.75, seed: 1 },
    },
    {
      name: "Coarse register",
      description: "Large dots make the fixed screen obvious beneath a more open disc arrangement.",
      props: { dots: 22, orbit: 0.025, overlap: 0.3, speed: 0.35, intensity: 0.9, seed: 4 },
    },
    {
      name: "Fine overprint",
      description: "Fine dots and a close stack emphasize the changing density of overlapping plates.",
      props: { dots: 72, orbit: 0.045, overlap: 0.85, speed: 0.7, intensity: 0.65, seed: 9 },
    },
  ],
  original: true,
  credits: [],
};
