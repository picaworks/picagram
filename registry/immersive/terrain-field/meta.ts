import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "terrain-field",
  title: "Terrain Field",
  category: "immersive",
  description: "A landscape of profile lines that drift toward the viewer, each ridge hiding the rows behind it.",
  tags: ["terrain", "horizon", "landscape", "hidden-line", "canvas"],
  facets: ["animated", "background", "canvas"],
  wave: 4,
  animated: true,
  decorative: true,
  controls: {
    rows: { type: "number", min: 12, max: 80, step: 1 },
    columns: { type: "number", min: 40, max: 400, step: 10 },
    scale: { type: "number", min: 0.5, max: 6, step: 0.1 },
    height: { type: "number", min: 0, max: 1, step: 0.05 },
    perspective: { type: "number", min: 0, max: 1, step: 0.05 },
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    weight: { type: "number", min: 0.5, max: 2, step: 0.1 },
    fade: { type: "number", min: 0, max: 1, step: 0.05 },
    fps: { type: "number", min: 12, max: 30, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  palette: ["fg", "muted"],
  credits: [
    {
      relation: "technique",
      title: "A Two-Space Solution to the Hidden Line Problem for Plotting Functions of Two Variables",
      author: "T. J. Wright",
      url: "https://doi.org/10.1109/T-C.1973.223597",
      license: "Paper",
    },
  ],
};
