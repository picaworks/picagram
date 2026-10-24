import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "lenticular-ridges",
  title: "Lenticular Ridges",
  category: "shaders",
  description: "Shallow parallel ridges refract an analytic line field while a slow grazing light reveals their curved faces, with a visible CSS fallback.",
  tags: ["lenticular", "ridges", "refraction", "grazing-light", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  capture: 4800,
  controls: {
    ridges: { type: "number", min: 5, max: 28, step: 1 },
    bend: { type: "number", min: 0, max: 1.5, step: 0.05 },
    angle: { type: "number", min: -80, max: 80, step: 1 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    intensity: { type: "number", min: 0.1, max: 1, step: 0.05 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 60000, step: 100 },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  presets: [
    {
      name: "Quiet flutes",
      description: "Fourteen shallow ridges give a restrained line field a gentle optical bend.",
      props: { ridges: 14, bend: 0.85, angle: -18, speed: 0.55, intensity: 0.6, seed: 1 },
    },
    {
      name: "Wide lenses",
      description: "Seven broad ridges make each refracted line and curved face easier to inspect.",
      props: { ridges: 7, bend: 1.25, angle: 12, speed: 0.35, intensity: 0.75, seed: 4 },
    },
    {
      name: "Fine oblique",
      description: "Twenty-two fine ridges cross the field diagonally with a lighter optical relief.",
      props: { ridges: 22, bend: 0.55, angle: 48, speed: 0.7, intensity: 0.5, seed: 9 },
    },
  ],
  original: true,
  credits: [],
};
