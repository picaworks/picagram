import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-rain",
  title: "ASCII Rain",
  category: "ascii",
  description: "Columns of glyphs fall at their own speed, each with a bright head and a trail that fades down the measured ramp.",
  tags: ["rain", "animated", "measured ramp", "generative"],
  wave: 1,
  animated: true,
  decorative: true,
  controls: {
    density: { type: "number", min: 0.1, max: 1, step: 0.05 },
    speed: { type: "number", min: 4, max: 40, step: 1 },
    trail: { type: "number", min: 4, max: 40, step: 1 },
    change: { type: "number", min: 0, max: 1, step: 0.01 },
    glyphs: { type: "string" },
    fontSize: { type: "number", min: 8, max: 24, step: 1 },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
    fps: { type: "number", min: 1, max: 30, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Matrix digital rain",
      author: "Simon Whiteley, title design for The Matrix (1999)",
      url: "https://en.wikipedia.org/wiki/Matrix_digital_rain",
      license: "Cultural reference, no code",
    },
  ],
};
