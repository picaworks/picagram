import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-folding-fan",
  title: "ASCII Folding Fan",
  category: "ascii",
  description: "A finite pleated glyph fan opens gently around a fixed hinge, with alternating shaded faces and visible creases.",
  tags: ["fan", "pleats", "folds", "glyph-grid", "hinge"],
  facets: ["animated"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "accent"],
  presets: [
    { name: "Open Pleats", description: "Fourteen clear pleats make a broad, gently breathing fan.", props: { leaves: 14, aperture: 126, depth: 0.75, speed: 0.65, fontSize: 13 } },
    { name: "Compact Fold", description: "Eight deep folds hold a narrower upright silhouette.", props: { leaves: 8, aperture: 78, depth: 1, speed: 0.45, fontSize: 14 } },
    { name: "Fine Paper", description: "Twenty shallow folds spread into a wide, quieter paper arc.", props: { leaves: 20, aperture: 148, depth: 0.45, speed: 0.5, fontSize: 12 } },
  ],
  controls: {
    leaves: { type: "number", min: 6, max: 24, step: 1 },
    aperture: { type: "number", min: 70, max: 150, step: 1 },
    depth: { type: "number", min: 0.2, max: 1, step: 0.05 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    fontSize: { type: "number", min: 11, max: 20, step: 1 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 120000, step: 100 },
    seed: { type: "number", min: 1, max: 100, step: 1 },
  },
  credits: [],
  original: true,
};
