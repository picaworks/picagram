import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "penrose-tiles",
  title: "Penrose Tiles",
  category: "patterns",
  description: "Golden-ratio substitution forms a bounded patch of thin and thick Penrose rhombi, drawn quietly behind page-owned content.",
  tags: ["penrose", "quasiperiodic", "rhombi", "substitution", "geometry", "background"],
  facets: ["static", "background"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: true,
  wraps: "content",
  original: true,
  palette: ["fg"],
  controls: {
    depth: { type: "number", min: 1, max: 8, step: 1, label: "Substitution depth" },
    scale: { type: "number", min: 12, max: 120, step: 1, label: "Tile edge (px)" },
    seed: { type: "number", min: 1, max: 999, step: 1, label: "Patch seed" },
    opacity: { type: "number", min: 0, max: 1, step: 0.01, label: "Surface opacity" },
  },
  credits: [],
};
