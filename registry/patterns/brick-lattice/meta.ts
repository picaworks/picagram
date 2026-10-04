import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "brick-lattice",
  title: "Brick Lattice",
  category: "patterns",
  description: "A quiet masonry lattice with running or stacked courses drawn behind content.",
  tags: ["brick", "masonry", "lattice", "background", "css"],
  facets: ["static", "background"],
  wave: 6,
  animated: false,
  decorative: true,
  wraps: "content",
  palette: ["fg"],
  controls: {
    bond: { type: "select", options: ["running", "stack"] },
    width: { type: "number", min: 24, max: 120, step: 1, label: "Brick width (px)" },
    course: { type: "number", min: 8, max: 40, step: 1, label: "Course height (px)" },
    mortar: { type: "number", min: 0, max: 8, step: 1, label: "Mortar (px)" },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
  },
  demo: {
    children: "<h2>Built in courses</h2><p>A measured pattern gives the page quiet structure.</p>",
  },
  credits: [],
  original: true,
};
