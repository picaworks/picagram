import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ripple-field",
  title: "Ripple Field",
  category: "shaders",
  description: "Rings spread from seeded drops on a still surface, dispersing as they travel and cancelling where they cross, dithered on the GPU.",
  tags: ["ripple", "water", "shader", "webgl", "background", "dither", "interference"],
  facets: ["animated", "background", "interactive", "shader", "webgl", "dither"],
  wave: 4,
  animated: true,
  decorative: true,
  palette: ["fg", "accent", "bg"],
  controls: {
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    drops: { type: "number", min: 1, max: 8, step: 1 },
    wavelength: { type: "number", min: 0.02, max: 0.4, step: 0.01 },
    decay: { type: "number", min: 0, max: 1, step: 0.05 },
    pointer: { type: "boolean" },
    levels: { type: "number", min: 2, max: 16, step: 1 },
    pixel: { type: "number", min: 1, max: 6, step: 1, label: "Pixel (px)" },
    fps: { type: "number", min: 6, max: 60, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  interactions: [[{ step: "pointerMove", x: 0.35, y: 0.4 }, { step: "pointerMove", x: 0.7, y: 0.6 }]],
  credits: [
    { relation: "technique", title: "Simulating Ocean Water", author: "Jerry Tessendorf", url: "https://jtessen.people.clemson.edu/reports/papers_files/coursenotes2004.pdf", license: "Course notes" },
  ],
  original: false,
};
