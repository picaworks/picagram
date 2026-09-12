import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dither-noise",
  title: "Dither Noise",
  category: "dither",
  description: "A field of fractal noise screened into flat tone bands, drifting slowly like weather on a printed map.",
  tags: ["noise", "fractal noise", "halftone", "background", "cloud"],
  facets: ["animated", "background", "canvas", "dither"],
  wave: 4,
  animated: true,
  decorative: true,
  palette: ["fg"],
  controls: {
    scale: { type: "number", min: 0.5, max: 6, step: 0.1 },
    octaves: { type: "number", min: 1, max: 5, step: 1 },
    levels: { type: "number", min: 2, max: 4, step: 1 },
    mask: { type: "select", options: ["blue", "cluster"] },
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    angle: { type: "number", min: 0, max: 360, step: 1 },
    pixel: { type: "number", min: 1, max: 8, step: 1, label: "Pixel scale" },
    contrast: { type: "number", min: 0.5, max: 2, step: 0.05 },
    fps: { type: "number", min: 6, max: 30, step: 1, label: "FPS" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Simplex noise",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Simplex_noise",
      license: "Algorithm, no code",
    },
    {
      relation: "technique",
      title: "Digital Halftoning",
      author: "Robert Ulichney",
      url: "https://doi.org/10.7551/mitpress/2421.001.0001",
      license: "Book",
    },
  ],
};
