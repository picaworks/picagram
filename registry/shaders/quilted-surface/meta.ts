import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "quilted-surface",
  title: "Quilted Surface",
  category: "shaders",
  description: "Shallow padded diamond cells catch slow grazing light, with fine recessed seams, dithered faces and a visible CSS fallback.",
  tags: ["quilt", "diamonds", "padded", "seams", "grazing-light", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  presets: [
    { name: "Soft Diamonds", description: "A balanced field of shallow cushions and fine seams.", props: { cells: 7, depth: 0.18, seam: 1.2, speed: 0.65, intensity: 0.85 } },
    { name: "Broad Cushions", description: "Large, deeper cells show the rounded relief under a slower light.", props: { cells: 4, depth: 0.32, seam: 1.8, speed: 0.4, intensity: 0.9 } },
    { name: "Fine Stitch", description: "Small low cushions form a quiet, closely stitched surface.", props: { cells: 12, depth: 0.09, seam: 0.65, speed: 0.5, intensity: 0.6 } },
  ],
  controls: {
    cells: { type: "number", min: 3, max: 16, step: 1 },
    depth: { type: "number", min: 0.03, max: 0.4, step: 0.01 },
    seam: { type: "number", min: 0.5, max: 3, step: 0.05 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    intensity: { type: "number", min: 0.2, max: 1, step: 0.05 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 120000, step: 100 },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [],
  original: true,
};
