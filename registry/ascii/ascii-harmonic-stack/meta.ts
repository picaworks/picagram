import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-harmonic-stack",
  title: "ASCII Harmonic Stack",
  category: "ascii",
  description: "Offset harmonic profiles drift through a measured glyph field, with overlapping silhouettes and one accented front contour.",
  tags: ["harmonic", "signal", "ridgeline", "braille", "glyph-grid", "animated"],
  facets: ["animated"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "muted", "accent"],
  capture: 4200,
  controls: {
    traces: { type: "number", min: 3, max: 10, step: 1 },
    frequency: { type: "number", min: 0.5, max: 6, step: 0.1 },
    amplitude: { type: "number", min: 0.2, max: 1.3, step: 0.05 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    fontSize: { type: "number", min: 10, max: 20, step: 1 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 60000, step: 100 },
    seed: { type: "number", min: 1, max: 99, step: 1 },
  },
  presets: [
    {
      name: "Soft bank",
      description: "Seven low profiles overlap in a broad, slowly drifting bank.",
      props: { traces: 7, frequency: 2.4, amplitude: 0.85, speed: 0.6, fontSize: 12, seed: 1 },
    },
    {
      name: "Open swells",
      description: "Three tall, widely spaced profiles expose the shape of each broad swell.",
      props: { traces: 3, frequency: 0.8, amplitude: 1.15, speed: 0.35, fontSize: 13, seed: 8 },
    },
    {
      name: "Layered chorus",
      description: "Six shallow profiles separate a finer sequence of harmonic peaks.",
      props: { traces: 6, frequency: 3.2, amplitude: 0.6, speed: 0.65, fontSize: 12, seed: 17 },
    },
  ],
  original: true,
  credits: [],
};
