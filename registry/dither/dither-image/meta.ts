import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dither-image",
  title: "Dither Image",
  category: "dither",
  description: "An image reduced to two tones by ordered or error diffusion dithering, drawn crisp on a canvas.",
  tags: ["image", "static", "dither", "canvas"],
  wave: 2,
  animated: false,
  decorative: false,
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    algorithm: { type: "select", options: ["bayer2", "bayer4", "bayer8", "floyd-steinberg", "atkinson"] },
    scale: { type: "number", min: 1, max: 8, step: 1 },
    contrast: { type: "number", min: 0.5, max: 2.5, step: 0.05 },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
  },
  credits: [
    {
      relation: "technique",
      title: "Ditherpunk",
      author: "Surma",
      url: "https://surma.dev/things/ditherpunk/",
      license: "Article",
    },
    {
      relation: "technique",
      title: "Atkinson dithering",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Atkinson_dithering",
      license: "Algorithm, no code",
    },
  ],
};
