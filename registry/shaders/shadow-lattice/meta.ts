import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "shadow-lattice",
  title: "Shadow Lattice",
  category: "shaders",
  description: "A slowly moving grazing light casts coherent, dithered shadows through shallow crossed ribs, with a palette-based CSS fallback.",
  tags: ["lattice", "shadows", "grazing-light", "occlusion", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 15,
  release: "components-2026-10-04",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    pitch: { type: "number", min: 24, max: 160, step: 1, label: "Rib pitch (px)" },
    depth: { type: "number", min: 0, max: 32, step: 0.5, label: "Rib height (px)" },
    lightAngle: { type: "number", min: -180, max: 180, step: 1, label: "Light angle" },
    speed: { type: "number", min: -12, max: 12, step: 0.5, label: "Light speed (degrees/s)" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [],
  original: true,
};
