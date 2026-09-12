import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "braille-image",
  title: "Braille Image",
  category: "text-mode",
  description: "An image drawn with braille characters, each cell's eight dots giving twice the horizontal and four times the vertical resolution of plain ASCII.",
  tags: ["image", "static", "braille", "dither"],
  facets: ["static", "image", "dither"],
  wave: 2,
  animated: false,
  decorative: false,
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    columns: { type: "number", min: 40, max: 200, step: 1 },
    threshold: { type: "number", min: 0.2, max: 0.8, step: 0.05 },
    dither: { type: "boolean", label: "Dither" },
    contrast: { type: "number", min: 0.5, max: 2.5, step: 0.05 },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
  },
  credits: [
    {
      relation: "technique",
      title: "Braille Patterns, Unicode block U+2800",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Braille_Patterns",
      license: "Reference, no code",
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
