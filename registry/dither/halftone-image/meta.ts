import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "halftone-image",
  title: "Halftone Image",
  category: "dither",
  description: "An image screened into halftone dots, squares, or lines, their area set by darkness like a page of newsprint.",
  tags: ["image", "static", "halftone", "canvas"],
  wave: 2,
  animated: false,
  decorative: false,
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    cell: { type: "number", min: 6, max: 24, step: 1 },
    angle: { type: "number", min: 0, max: 90, step: 1 },
    shape: { type: "select", options: ["circle", "square", "line"] },
    contrast: { type: "number", min: 0.5, max: 2.5, step: 0.05 },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
  },
  credits: [
    {
      relation: "technique",
      title: "Halftone",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Halftone",
      license: "Reference, no code",
    },
  ],
};
