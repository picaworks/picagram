import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dragon-fold",
  title: "Dragon Fold",
  category: "patterns",
  description: "A deterministic paper-fold sequence draws one connected angular dragon path in quiet ink behind page-owned content.",
  tags: ["dragon", "paper-fold", "fractal", "angular", "background", "deterministic"],
  facets: ["static", "background"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: true,
  original: true,
  wraps: "content",
  palette: ["fg"],
  controls: {
    iterations: { type: "number", min: 1, max: 14, step: 1 },
    scale: { type: "number", min: 2, max: 32, step: 1, label: "Segment length (px)" },
    orientation: { type: "select", options: ["east", "south", "west", "north"] },
    opacity: { type: "number", min: 0, max: 1, step: 0.01 },
  },
  credits: [],
};
