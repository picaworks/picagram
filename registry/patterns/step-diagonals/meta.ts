import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "step-diagonals",
  title: "Step Diagonals",
  category: "patterns",
  description: "Staircases of square steps cross the page as pixel grid diagonals with no oblique stroke.",
  tags: ["stairs", "steps", "diagonal", "pixel", "svg"],
  facets: ["static", "background"],
  wave: 12,
  animated: false,
  decorative: true,
  wraps: "content",
  controls: {
    step: { type: "number", min: 8, max: 40, step: 1, label: "Step (px)" },
    run: { type: "number", min: 1, max: 4, step: 1, label: "Treads per riser" },
    spacing: { type: "number", min: 2, max: 8, step: 1, label: "Spacing (risers)" },
    direction: { type: "select", options: ["rising", "falling"] },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
  },
  palette: ["fg"],
  demo: {
    children: "<h2>Measured steps</h2><p>Each diagonal is built from square corners on a pixel grid.</p>",
  },
  credits: [],
  original: true,
};
