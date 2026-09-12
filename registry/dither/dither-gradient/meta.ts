import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dither-gradient",
  title: "Dither Gradient",
  category: "dither",
  description: "A two-tone gradient dithered through a Bayer matrix, drifting slowly like light across a surface.",
  tags: ["gradient", "ordered dither", "bayer matrix", "background"],
  facets: ["animated", "background", "canvas", "dither"],
  wave: 2,
  animated: true,
  decorative: true,
  controls: {
    shape: { type: "select", options: ["linear", "radial", "noise"] },
    scale: { type: "number", min: 2, max: 8, step: 1, label: "Pixel scale" },
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    contrast: { type: "number", min: 0.5, max: 2, step: 0.05 },
    fps: { type: "number", min: 6, max: 30, step: 1, label: "FPS" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
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
      title: "Ordered dithering",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Ordered_dithering",
      license: "Algorithm, no code",
    },
  ],
};
