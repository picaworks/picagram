import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "cairo-pentagons",
  title: "Cairo Pentagons",
  category: "patterns",
  description: "Exact interlocking Cairo pentagons form quiet one-pixel seams behind content, with adjustable scale, orientation, and opacity.",
  tags: ["cairo", "pentagons", "tiling", "architectural", "css", "background"],
  facets: ["static", "background"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: true,
  wraps: "content",
  palette: ["fg", "bg"],
  controls: {
    scale: { type: "number", min: 20, max: 160, step: 2, label: "Junction spacing (px)" },
    orientation: { type: "number", min: -180, max: 180, step: 5, label: "Orientation (degrees)" },
    opacity: { type: "number", min: 0, max: 1, step: 0.01 },
  },
  credits: [],
  original: true,
};
