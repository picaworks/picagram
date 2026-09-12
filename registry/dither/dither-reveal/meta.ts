import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dither-reveal",
  title: "Dither Reveal",
  category: "dither",
  description: "A photograph that dissolves in and out as a halftone that thickens in blue noise order.",
  tags: ["image", "reveal", "dither", "canvas", "halftone"],
  facets: ["animated", "image", "canvas", "dither"],
  wave: 4,
  animated: true,
  decorative: false,
  palette: ["fg"],
  // Two thirds into the 1800 ms rise, the default frame at 1200 ms already reads as a legible halftone of
  // the whole subject. Past the start of the 3600 ms hold, the review capture at 5000 ms shows it fully inked.
  capture: 5000,
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    contrast: { type: "number", min: 0.5, max: 2, step: 0.05 },
    mask: { type: "select", options: ["blue", "bayer"] },
    scale: { type: "number", min: 1, max: 8, step: 1 },
    reveal: { type: "number", min: 400, max: 6000, step: 100 },
    hold: { type: "number", min: 0, max: 8000, step: 100 },
    fps: { type: "number", min: 6, max: 30, step: 1, label: "FPS" },
    paused: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Void-and-cluster method for dither array generation",
      author: "Robert A. Ulichney",
      url: "https://doi.org/10.1117/12.152707",
      license: "Paper",
    },
    {
      relation: "technique",
      title: "Ordered dithering",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Ordered_dithering",
      license: "Algorithm, no code",
    },
  ],
};
