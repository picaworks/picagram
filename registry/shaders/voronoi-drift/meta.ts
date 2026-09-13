import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "voronoi-drift",
  title: "Voronoi Drift",
  category: "shaders",
  description: "A plane divided into territories around slowly drifting sites, each cell a flat dithered accent tone behind a fg hairline.",
  tags: ["voronoi", "cells", "shader", "webgl", "background", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 4,
  animated: true,
  decorative: true,
  palette: ["fg", "accent", "bg"],
  controls: {
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    cells: { type: "number", min: 4, max: 40, step: 1 },
    border: { type: "number", min: 0, max: 3, step: 0.5, label: "Border (px)" },
    jitter: { type: "number", min: 0, max: 1, step: 0.05 },
    levels: { type: "number", min: 2, max: 16, step: 1 },
    pixel: { type: "number", min: 1, max: 6, step: 1, label: "Pixel (px)" },
    fps: { type: "number", min: 6, max: 60, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    { relation: "technique", title: "A cellular texture basis function", author: "Steven Worley", url: "https://doi.org/10.1145/237170.237267", license: "Paper" },
  ],
  original: false,
};
