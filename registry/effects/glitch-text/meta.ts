import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "glitch-text",
  title: "Glitch Text",
  category: "effects",
  description: "Text that glitches in short bursts, its strips shifting sideways before it snaps back clean.",
  tags: ["text", "glitch", "burst", "distortion"],
  facets: ["animated", "text"],
  wave: 2,
  animated: true,
  decorative: false,
  stage: "inline",
  controls: {
    text: { type: "string" },
    interval: { type: "number", min: 1500, max: 8000, step: 100 },
    burst: { type: "number", min: 100, max: 400, step: 10 },
    intensity: { type: "number", min: 0, max: 1, step: 0.05 },
    glyphs: { type: "string" },
  },
  credits: [],
  original: true,
};
