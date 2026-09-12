import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-morph",
  title: "ASCII Morph",
  category: "ascii",
  description: "Two subjects that morph into each other and back, each cell resolving in the order its ink changes the most.",
  tags: ["text", "animated", "measured ramp", "morph", "transition"],
  facets: ["animated", "text"],
  wave: 2,
  animated: true,
  decorative: true,
  controls: {
    from: { type: "string", label: "First subject" },
    to: { type: "string", label: "Second subject" },
    hold: { type: "number", min: 400, max: 4000, step: 50, label: "Hold (ms)" },
    transition: { type: "number", min: 400, max: 4000, step: 50, label: "Transition (ms)" },
    columns: { type: "number", min: 40, max: 160, step: 1 },
    glyphs: { type: "string" },
    font: { type: "string", label: "Text font" },
    fontFamily: { type: "string", label: "Grid font" },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
    fps: { type: "number", min: 12, max: 30, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 1, max: 999, step: 1 },
  },
  credits: [],
  original: true,
};
