import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-text",
  title: "ASCII Text",
  category: "ascii",
  description: "A headline rastered from a display face, then redrawn as a grid of glyphs chosen by measured ink and shape.",
  tags: ["text", "headline", "static", "measured ramp", "shape matching"],
  wave: 1,
  animated: false,
  decorative: false,
  controls: {
    text: { type: "string", label: "Text" },
    font: { type: "string", label: "Display font" },
    columns: { type: "number", min: 20, max: 200, step: 1 },
    glyphs: { type: "string" },
    contrast: { type: "number", min: 0.5, max: 2.5, step: 0.05 },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    align: { type: "select", options: ["center", "left"] },
    shape: { type: "boolean", label: "Shape matching" },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
  },
  credits: [
    {
      relation: "technique",
      title: "Beyond the luminance ramp: a shape-aware ASCII renderer",
      author: "Codrops",
      url: "https://tympanus.net/codrops/2026/09/04/beyond-the-luminance-ramp-a-shape-aware-ascii-renderer-in-three-js/",
      license: "MIT",
    },
  ],
};
