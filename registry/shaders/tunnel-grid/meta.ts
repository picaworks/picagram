import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "tunnel-grid",
  title: "Tunnel Grid",
  category: "shaders",
  description: "A slow flight down a tunnel drawn as a hairline grid, mapped by angle and inverse distance into a receding texture.",
  tags: ["tunnel", "grid", "shader", "webgl", "background", "dither", "perspective"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 4,
  animated: true,
  decorative: true,
  palette: ["fg", "accent", "bg"],
  controls: {
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    rings: { type: "number", min: 4, max: 40, step: 1 },
    spokes: { type: "number", min: 4, max: 64, step: 1 },
    fade: { type: "number", min: 0, max: 0.5, step: 0.01 },
    twist: { type: "number", min: 0, max: 1, step: 0.05 },
    levels: { type: "number", min: 2, max: 16, step: 1 },
    pixel: { type: "number", min: 1, max: 4, step: 1, label: "Pixel (px)" },
    fps: { type: "number", min: 6, max: 60, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Survey of Texture Mapping",
      author: "Paul S. Heckbert",
      url: "https://doi.org/10.1109/MCG.1986.276672",
      license: "Paper",
    },
  ],
  original: false,
};
