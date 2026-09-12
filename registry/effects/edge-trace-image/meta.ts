import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "edge-trace-image",
  title: "Edge Trace Image",
  category: "effects",
  description: "A photograph reduced to its outlines: crisp one-pixel Sobel edges kept by Canny's two-threshold rule.",
  tags: ["image", "static", "canvas", "edges"],
  facets: ["static", "image", "canvas"],
  wave: 4,
  animated: false,
  decorative: false,
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    fit: { type: "select", options: ["cover", "contain"] },
    contrast: { type: "number", min: 0.5, max: 2, step: 0.05 },
    low: { type: "number", min: 0, max: 1, step: 0.01 },
    high: { type: "number", min: 0, max: 1, step: 0.01 },
    smooth: { type: "number", min: 0, max: 3, step: 1 },
    weight: { type: "number", min: 0.5, max: 2, step: 0.1 },
    invert: { type: "boolean" },
  },
  palette: ["fg"],
  credits: [
    {
      relation: "technique",
      title: "A Computational Approach to Edge Detection",
      author: "John Canny",
      url: "https://doi.org/10.1109/TPAMI.1986.4767851",
      license: "Paper",
    },
    {
      relation: "technique",
      title: "Sobel operator",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Sobel_operator",
      license: "Algorithm, no code",
    },
  ],
};
