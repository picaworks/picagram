import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "cell-mosaic",
  title: "Cell Mosaic",
  category: "patterns",
  description: "A seeded field of even polygonal cells drawn as quiet hairlines behind page content.",
  tags: ["voronoi", "cells", "mosaic", "geometry", "background"],
  facets: ["static", "background"],
  wave: 6,
  animated: false,
  decorative: true,
  wraps: "content",
  palette: ["fg"],
  controls: {
    cells: { type: "number", min: 8, max: 160, step: 1 },
    gap: { type: "number", min: 0, max: 6, step: 0.5, label: "Gap (px)" },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
    seed: { type: "number", min: -2147483648, max: 2147483647, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title:
        "Nouvelles applications des paramètres continus à la théorie des formes quadratiques. Deuxième mémoire. Recherches sur les parallélloèdres primitifs",
      author: "Georges Voronoi",
      url: "https://doi.org/10.1515/crll.1908.134.198",
      license: "Paper",
    },
  ],
  demo: {
    children: "<div><h2>Measured variation</h2><p>Forty eight quiet cells repeat from a single seed.</p></div>",
  },
};
