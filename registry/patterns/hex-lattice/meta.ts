import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "hex-lattice",
  title: "Hex Lattice",
  category: "patterns",
  description: "A regular hexagonal hairline lattice that sits quietly behind page content.",
  tags: ["hexagon", "honeycomb", "lattice", "geometric", "css"],
  facets: ["static", "background"],
  wave: 6,
  animated: false,
  decorative: true,
  wraps: "content",
  controls: {
    size: { type: "number", min: 12, max: 64, step: 1, label: "Radius (px)" },
    orientation: { type: "select", options: ["flat", "pointy"] },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
  },
  palette: ["fg"],
  demo: {
    children: "<h2>Measured structure</h2><p>A quiet lattice gives the page a precise underlying rhythm.</p>",
  },
  credits: [],
  original: true,
};
