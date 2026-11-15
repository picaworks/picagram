import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-rolling-cube",
  title: "ASCII Rolling Cube",
  category: "ascii",
  description: "One solid cube turns through shaded glyph faces with crisp braille edges above a short baseline and an offset contact marker.",
  tags: ["cube", "solid", "shading", "rotation", "glyph", "animated"],
  facets: ["animated"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    size: { type: "number", min: 0.5, max: 0.85, step: 0.05, label: "Cube size" },
    tumble: { type: "number", min: 0.2, max: 0.8, step: 0.05, label: "Secondary axis tumble" },
    density: { type: "number", min: 0.5, max: 1, step: 0.05, label: "Face ink density" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Rolling speed" },
    fontSize: { type: "number", min: 12, max: 20, step: 1, label: "Glyph size" },
    paused: { type: "boolean", label: "Pause cube" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting orientation seed" },
  },
  presets: [
    {
      name: "Balanced study",
      description: "A large cube shows distinct measured face tones with an even, calm roll.",
      props: { size: 0.8, tumble: 0.5, density: 0.85, speed: 0.7, fontSize: 16, seed: 1 },
    },
    {
      name: "Light drafting",
      description: "A smaller, lightly inked cube turns mostly around its primary axis above a compact baseline.",
      props: { size: 0.65, tumble: 0.25, density: 0.6, speed: 0.45, fontSize: 14, seed: 4 },
    },
    {
      name: "Dense tumble",
      description: "A broad, darker cube reveals more secondary axis motion while retaining every corner.",
      props: { size: 0.85, tumble: 0.75, density: 1, speed: 0.85, fontSize: 14, seed: 8 },
    },
  ],
  original: true,
  credits: [],
};
