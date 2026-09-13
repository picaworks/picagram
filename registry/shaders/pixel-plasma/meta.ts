import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-plasma",
  title: "Pixel Plasma",
  category: "shaders",
  description: "The demoscene plasma as a printed screen: summed sinusoids drawn as coarse square pixels and dithered between a few tone steps on the GPU.",
  tags: ["plasma", "shader", "webgl", "background", "dither", "demoscene"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 4,
  animated: true,
  decorative: true,
  palette: ["fg", "accent", "bg"],
  controls: {
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    scale: { type: "number", min: 0.5, max: 4, step: 0.1 },
    waves: { type: "number", min: 2, max: 6, step: 1 },
    levels: { type: "number", min: 2, max: 16, step: 1 },
    pixel: { type: "number", min: 2, max: 12, step: 1, label: "Pixel (px)" },
    fps: { type: "number", min: 6, max: 60, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Plasma effect",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Plasma_effect",
      license: "Algorithm, no code",
    },
    {
      relation: "technique",
      title: "Ordered dithering",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Ordered_dithering",
      license: "Algorithm, no code",
    },
  ],
  original: false,
};
