import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dither-poster-image",
  title: "Dither Poster Image",
  category: "dither",
  description: "An image posterized into flat tone bands whose step edges dither into narrow stippled transitions.",
  tags: ["image", "static", "poster", "dither", "canvas"],
  facets: ["static", "image", "canvas", "dither"],
  wave: 4,
  animated: false,
  decorative: false,
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    contrast: { type: "number", min: 0.5, max: 2, step: 0.05 },
    levels: { type: "number", min: 2, max: 8, step: 1 },
    band: { type: "number", min: 0, max: 0.5, step: 0.01 },
    mask: { type: "select", options: ["bayer", "blue"] },
    scale: { type: "number", min: 1, max: 8, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Digital Halftoning",
      author: "Robert Ulichney",
      url: "https://doi.org/10.7551/mitpress/2421.001.0001",
      license: "Book",
    },
    {
      relation: "technique",
      title: "Ordered dithering",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Ordered_dithering",
      license: "Algorithm, no code",
    },
  ],
  palette: ["fg"],
};
