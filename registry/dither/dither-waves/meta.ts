import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dither-waves",
  title: "Dither Waves",
  category: "dither",
  description: "Wave trains crossing at different angles, their interference screened by an ordered mask into a moire lattice.",
  tags: ["moire", "interference", "ordered dither", "background"],
  facets: ["animated", "background", "canvas", "dither"],
  wave: 4,
  animated: true,
  decorative: true,
  controls: {
    trains: { type: "number", min: 2, max: 4, step: 1 },
    period: { type: "number", min: 8, max: 120, step: 1, label: "Period" },
    spread: { type: "number", min: 0, max: 45, step: 1, label: "Spread (deg)" },
    angle: { type: "number", min: 0, max: 180, step: 1, label: "Angle (deg)" },
    levels: { type: "number", min: 2, max: 4, step: 1 },
    mask: { type: "select", options: ["blue", "cluster"] },
    pixel: { type: "number", min: 1, max: 6, step: 1, label: "Pixel size" },
    speed: { type: "number", min: 0, max: 1, step: 0.01 },
    fps: { type: "number", min: 6, max: 30, step: 1, label: "FPS" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  palette: ["fg"],
  credits: [
    {
      relation: "technique",
      title: "The Theory of the Moire Phenomenon: Volume I, Periodic Layers",
      author: "Isaac Amidror",
      url: "https://doi.org/10.1007/978-1-84882-181-1",
      license: "Book",
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
