import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-waves",
  title: "ASCII Waves",
  category: "ascii",
  description: "Interference between a few drifting circular wave sources, drawn as glyph density that crosses and beats.",
  tags: ["interference", "waves", "animated", "background"],
  wave: 1,
  animated: true,
  decorative: true,
  controls: {
    sources: { type: "number", min: 1, max: 5, step: 1 },
    frequency: { type: "number", min: 0.05, max: 1, step: 0.01 },
    speed: { type: "number", min: 0, max: 4, step: 0.1 },
    contrast: { type: "number", min: 0.5, max: 3, step: 0.05 },
    drift: { type: "number", min: 0, max: 1, step: 0.05 },
    glyphs: { type: "string" },
    fontSize: { type: "number", min: 8, max: 24, step: 1 },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
    fps: { type: "number", min: 6, max: 30, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 1, max: 999, step: 1 },
  },
  credits: [],
  original: true,
};
