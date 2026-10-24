import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "etched-radial",
  title: "Etched Radial",
  category: "shaders",
  description: "Concentric machining grooves catch slowly rotating anisotropic highlights around an offset center, with dithered material shading.",
  tags: ["machining", "concentric", "grooves", "anisotropic", "material", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  presets: [
    { name: "Spun Finish", description: "Fine circular cuts carry balanced directional sheen around an offset center.", props: { grooves: 64, eccentricity: 0.7, roughness: 0.42, speed: 0.65, intensity: 0.85 } },
    { name: "Fine Satin", description: "Close grooves and broad soft highlights form a quiet satin surface.", props: { grooves: 90, eccentricity: 0.9, roughness: 0.7, speed: 0.45, intensity: 0.65 } },
    { name: "Turned Plate", description: "Wider cuts show a sharper material highlight near the center of the field.", props: { grooves: 32, eccentricity: 0.4, roughness: 0.22, speed: 0.5, intensity: 0.9 } },
  ],
  controls: {
    grooves: { type: "number", min: 24, max: 100, step: 1 },
    eccentricity: { type: "number", min: 0, max: 1, step: 0.05 },
    roughness: { type: "number", min: 0.15, max: 0.8, step: 0.01 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    intensity: { type: "number", min: 0.2, max: 1, step: 0.05 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 120000, step: 100 },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [],
  original: true,
};
