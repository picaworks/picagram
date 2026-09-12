import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-reveal",
  title: "ASCII Reveal",
  category: "ascii",
  description: "Text that resolves from scrambled glyphs into its final characters, left to right.",
  tags: ["text", "reveal", "scramble", "decode"],
  facets: ["animated", "text"],
  wave: 1,
  animated: true,
  decorative: false,
  stage: "inline",
  controls: {
    text: { type: "string", label: "Text" },
    duration: { type: "number", min: 400, max: 5000, step: 100 },
    stagger: { type: "number", min: 0, max: 0.9, step: 0.05 },
    glyphs: { type: "string", label: "Scramble glyphs" },
    loop: { type: "number", min: 0, max: 4000, step: 100 },
    fps: { type: "number", min: 5, max: 30, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 1, max: 999, step: 1 },
  },
  credits: [],
  original: true,
};
