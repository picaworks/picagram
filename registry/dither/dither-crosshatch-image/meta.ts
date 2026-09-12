import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dither-crosshatch-image",
  title: "Dither Crosshatch Image",
  category: "dither",
  description: "An image drawn in crossing pen strokes, each layer switching on as the tone beneath it darkens.",
  tags: ["image", "static", "crosshatch", "canvas"],
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
    layers: { type: "number", min: 1, max: 4, step: 1 },
    spacing: { type: "number", min: 3, max: 16, step: 1 },
    angles: { type: "json" },
    weight: { type: "number", min: 0.5, max: 2, step: 0.1 },
    jitter: { type: "number", min: 0, max: 1, step: 0.05 },
    seed: { type: "number", min: 1, max: 9999, step: 1 },
  },
  palette: ["fg"],
  credits: [
    {
      relation: "technique",
      title: "Real-time hatching",
      author: "Emil Praun, Hugues Hoppe, Matthew Webb, Adam Finkelstein",
      url: "https://doi.org/10.1145/383259.383328",
      license: "Paper",
    },
  ],
};
