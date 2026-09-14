import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "dot-lattice",
  title: "Dot Lattice",
  category: "patterns",
  description: "A calm field of small ink points on a regular or staggered lattice behind page content.",
  tags: ["dots", "lattice", "grid", "background", "css"],
  facets: ["static", "background"],
  wave: 6,
  animated: false,
  decorative: true,
  wraps: "content",
  palette: ["fg"],
  demo: {
    children: "<h2>Measured points</h2><p>A quiet lattice keeps the page in order.</p>",
  },
  controls: {
    spacing: { type: "number", min: 8, max: 64, step: 1, label: "Spacing (px)" },
    angle: { type: "number", min: 0, max: 90, step: 1, label: "Angle (deg)" },
    offset: { type: "boolean" },
    dot: { type: "number", min: 0.5, max: 2, step: 0.1, label: "Dot radius (px)" },
    fade: { type: "number", min: 0, max: 1, step: 0.05 },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
  },
  credits: [],
  original: true,
};
