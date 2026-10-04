import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-weft-image",
  title: "Pixel Weft Image",
  category: "effects",
  description: "Registered image rows and columns enter from alternating edges and interlace at checkerboard over-and-under crossings.",
  tags: ["image", "weave", "interlace", "reveal", "canvas"],
  facets: ["animated", "image", "canvas"],
  wave: 15,
  release: "components-2026-10-04",
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "muted"],
  controls: {
    src: { type: "string", label: "Image URL" },
    cellSize: { type: "number", min: 8, max: 64, step: 1, label: "Crossing size" },
    progress: { type: "number", min: 0, max: 1, step: 0.01, label: "Reveal progress" },
    speed: { type: "number", min: -0.15, max: 0.15, step: 0.005, label: "Reveal speed" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 1, max: 999, step: 1, label: "Weave seed" },
  },
  credits: [],
  original: true,
};
