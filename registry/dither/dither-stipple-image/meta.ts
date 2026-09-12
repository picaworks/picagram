import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dither-stipple-image",
  title: "Dither Stipple Image",
  category: "dither",
  description: "An image redrawn as round stippled dots, spaced by a blue noise mask so tone reads as density, not rows.",
  tags: ["image", "static", "dither", "canvas", "stipple"],
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
    dotSize: { type: "number", min: 0.5, max: 4, step: 0.1, label: "Dot size" },
    density: { type: "number", min: 0.2, max: 1.5, step: 0.05 },
    gamma: { type: "number", min: 0.5, max: 2, step: 0.05 },
    maskSize: { type: "select", options: ["16", "32", "64"], label: "Mask size" },
  },
  palette: ["fg"],
  credits: [
    {
      relation: "technique",
      title: "Weighted Voronoi stippling",
      author: "Adrian Secord",
      url: "https://doi.org/10.1145/508530.508537",
      license: "Paper",
    },
  ],
};
