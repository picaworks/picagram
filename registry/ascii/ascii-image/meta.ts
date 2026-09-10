import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-image",
  title: "ASCII Image",
  category: "ascii",
  description: "An image drawn as a grid of glyphs, each chosen by the ink it actually puts down in the font in use.",
  tags: ["image", "static", "measured ramp", "shape matching"],
  wave: 1,
  animated: false,
  decorative: false,
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    columns: { type: "number", min: 24, max: 240, step: 1 },
    glyphs: { type: "string" },
    contrast: { type: "number", min: 0.5, max: 2.5, step: 0.05 },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    shape: { type: "boolean", label: "Shape matching" },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
  },
  credits: [
    {
      relation: "port-of",
      title: "AsciiImage, rishab.fyi",
      author: "Rishab Balak",
      url: "https://rishab.fyi",
      license: "Author's own work, relicensed under Pica's license",
    },
    {
      relation: "technique",
      title: "Beyond the luminance ramp: a shape-aware ASCII renderer",
      author: "Codrops",
      url: "https://tympanus.net/codrops/2026/09/04/beyond-the-luminance-ramp-a-shape-aware-ascii-renderer-in-three-js/",
      license: "MIT",
    },
    {
      relation: "technique",
      title: "Ditherpunk",
      author: "Surma",
      url: "https://surma.dev/things/ditherpunk/",
      license: "Article",
    },
  ],
};
