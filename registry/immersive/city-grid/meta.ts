import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "city-grid",
  title: "City Grid",
  category: "immersive",
  description: "A seeded city of blocks on a street grid, seen from above at a fixed tilt and panning slowly past.",
  tags: ["city", "axonometric", "skyline", "procedural", "background"],
  facets: ["animated", "background", "canvas", "dither"],
  wave: 4,
  animated: true,
  decorative: true,
  controls: {
    density: { type: "number", min: 0, max: 1, step: 0.05 },
    blockSize: { type: "number", min: 8, max: 48, step: 1 },
    height: { type: "number", min: 0, max: 1, step: 0.05 },
    spread: { type: "number", min: 0.5, max: 4, step: 0.1 },
    angle: { type: "number", min: 15, max: 60, step: 1 },
    speed: { type: "number", min: 0, max: 1, step: 0.02 },
    fps: { type: "number", min: 12, max: 30, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  palette: ["fg", "muted"],
  credits: [
    {
      relation: "technique",
      title: "Procedural modeling of cities",
      author: "Yoav I. H. Parish and Pascal Müller",
      url: "https://doi.org/10.1145/383259.383292",
      license: "Paper",
    },
  ],
};
