import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dither-contours",
  title: "Dither Contours",
  category: "dither",
  description: "A drifting noise landscape cut into hypsometric bands of flat dither tone with hairline boundaries.",
  tags: ["contours", "hypsometric", "relief map", "terrain"],
  facets: ["animated", "background", "canvas", "dither"],
  wave: 4,
  animated: true,
  decorative: true,
  palette: ["fg", "accent"],
  controls: {
    bands: { type: "number", min: 3, max: 12, step: 1 },
    scale: { type: "number", min: 0.5, max: 6, step: 0.1 },
    octaves: { type: "number", min: 1, max: 5, step: 1 },
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    lineWeight: { type: "number", min: 0.5, max: 2, step: 0.1, label: "Line weight" },
    index: { type: "number", min: 0, max: 10, step: 1, label: "Index every" },
    pixel: { type: "number", min: 1, max: 6, step: 1, label: "Pixel scale" },
    fps: { type: "number", min: 6, max: 30, step: 1, label: "FPS" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Cartographic Relief Presentation",
      author: "Eduard Imhof",
      url: "https://doi.org/10.1515/9783110844016",
      license: "Book",
    },
    {
      relation: "technique",
      title: "Hypsometric tints",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Hypsometric_tints",
      license: "Reference, no code",
    },
  ],
};
