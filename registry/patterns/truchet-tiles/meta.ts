import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "truchet-tiles",
  title: "Truchet Tiles",
  category: "patterns",
  description: "A seeded field of connected quarter circle paths or diagonal zigzags drawn behind content.",
  tags: ["truchet", "tiling", "maze", "svg", "seeded"],
  facets: ["static", "background"],
  wave: 6,
  animated: false,
  decorative: true,
  wraps: "content",
  palette: ["fg"],
  controls: {
    cell: { type: "number", min: 16, max: 64, step: 1, label: "Cell (px)" },
    tile: { type: "select", options: ["arcs", "diagonals"] },
    thickness: { type: "number", min: 1, max: 3, step: 0.1, label: "Thickness (px)" },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
    seed: { type: "number", min: -2147483648, max: 2147483647, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "The Tiling Patterns of Sebastien Truchet and the Topology of Structural Hierarchy",
      author: "Cyril Stanley Smith and Pauline Boucher",
      url: "https://doi.org/10.2307/1578535",
      license: "Paper",
    },
  ],
  demo: {
    children: "<h2>Wandering paths</h2><p>Seeded arcs connect across a field of square tiles.</p>",
  },
};
