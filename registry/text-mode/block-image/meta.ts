import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "block-image",
  title: "Block Image",
  category: "text-mode",
  description: "An image drawn with the sixteen quadrant block characters, each matching the corners a 2 by 2 sample fills.",
  tags: ["image", "static", "quadrant blocks", "ordered dither"],
  facets: ["static", "image", "dither"],
  wave: 2,
  animated: false,
  decorative: false,
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    columns: { type: "number", min: 24, max: 160, step: 1 },
    threshold: { type: "number", min: 0.2, max: 0.8, step: 0.01 },
    dither: { type: "boolean", label: "Ordered dither" },
    contrast: { type: "number", min: 0.5, max: 2.5, step: 0.05 },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
  },
  credits: [
    {
      relation: "technique",
      title: "Block Elements, Unicode block U+2580",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Block_Elements",
      license: "Reference, no code",
    },
  ],
};
