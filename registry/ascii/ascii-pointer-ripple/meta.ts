import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-pointer-ripple",
  title: "ASCII Pointer Ripple",
  category: "ascii",
  description: "A glyph field of low-density noise that sends rippling rings outward from the pointer, as if the grid were water.",
  tags: ["pointer", "ripple", "noise", "interactive"],
  wave: 1,
  animated: true,
  decorative: true,
  controls: {
    growth: { type: "number", min: 6, max: 40, step: 1 },
    width: { type: "number", min: 1, max: 6, step: 0.1 },
    lifetime: { type: "number", min: 0.5, max: 3, step: 0.1 },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
    base: { type: "number", min: 0, max: 0.4, step: 0.01 },
    glyphs: { type: "string" },
    fontSize: { type: "number", min: 8, max: 28, step: 1 },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
    fps: { type: "number", min: 12, max: 30, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "play.core",
      author: "Andreas Gysin",
      url: "https://github.com/ertdfgcvb/play.core",
      license: "Apache-2.0",
    },
  ],
};
