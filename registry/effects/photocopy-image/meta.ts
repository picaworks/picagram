import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "photocopy-image",
  title: "Photocopy Image",
  category: "effects",
  description: "An image pushed through an adaptive threshold into pure ink and ground, with seeded toner specks and short streaks off its strong edges.",
  tags: ["image", "static", "photocopy", "threshold", "canvas"],
  facets: ["static", "image", "canvas"],
  wave: 4,
  animated: false,
  decorative: false,
  palette: ["fg"],
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    contrast: { type: "number", min: 0.5, max: 2, step: 0.05 },
    window: { type: "number", min: 8, max: 80, step: 1, label: "Window" },
    bias: { type: "number", min: 0, max: 0.2, step: 0.01 },
    speckle: { type: "number", min: 0, max: 1, step: 0.05 },
    streaks: { type: "number", min: 0, max: 1, step: 0.05 },
    invert: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Adaptive Thresholding using the Integral Image",
      author: "Derek Bradley, Gerhard Roth",
      url: "https://doi.org/10.1080/2151237X.2007.10129236",
      license: "Paper",
    },
    {
      relation: "technique",
      title: "Summed-area tables for texture mapping",
      author: "Franklin C. Crow",
      url: "https://doi.org/10.1145/800031.808600",
      license: "Paper",
    },
  ],
};
