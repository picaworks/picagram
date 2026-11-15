import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "porcelain-relief",
  title: "Porcelain Relief",
  category: "shaders",
  description: "A solid raised medallion of stepped rings and fine radial flutes sits on a square porcelain plaque beneath slow directional light.",
  tags: ["porcelain", "medallion", "terraces", "flutes", "relief", "dither"],
  facets: ["animated", "shader", "webgl", "dither"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    rings: { type: "number", min: 3, max: 7, step: 1, label: "Raised terraces" },
    relief: { type: "number", min: 0.2, max: 0.7, step: 0.05, label: "Molding height" },
    flutes: { type: "number", min: 12, max: 28, step: 2, label: "Radial flutes" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Directional light speed" },
    intensity: { type: "number", min: 0.3, max: 0.75, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause light" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Medallion orientation seed" },
  },
  presets: [
    {
      name: "Classical medallion",
      description: "Five raised terraced shoulders and twenty quiet flutes lead to a solid central porcelain boss.",
      props: { rings: 5, relief: 0.45, flutes: 20, speed: 0.65, intensity: 0.5, seed: 1 },
    },
    {
      name: "Bold molding",
      description: "Three broad, deeper terraces expose their sloping risers and cast shadows across the lower molding.",
      props: { rings: 3, relief: 0.65, flutes: 12, speed: 0.45, intensity: 0.6, seed: 4 },
    },
    {
      name: "Fine fanwork",
      description: "Seven closely spaced raised terraces carry twenty eight quiet flutes around a solid porcelain center.",
      props: { rings: 7, relief: 0.3, flutes: 28, speed: 0.8, intensity: 0.4, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
