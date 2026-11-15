import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "crazed-ceramic",
  title: "Crazed Ceramic",
  category: "shaders",
  description: "Asymmetric fracture flanks, recessed crack cores and raised glaze lips interrupt a quiet continuous ceramic relief under one grazing reflection.",
  tags: ["ceramic", "glaze", "cracks", "relief", "material", "dither"],
  facets: ["animated", "shader", "webgl", "dither"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    cellSize: { type: "number", min: 36, max: 110, step: 1, label: "Fracture spacing in pixels" },
    crackWidth: { type: "number", min: 0.4, max: 2, step: 0.1, label: "Crack groove half-width" },
    glaze: { type: "number", min: 0.25, max: 0.8, step: 0.05, label: "Glaze polish" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Grazing light speed" },
    intensity: { type: "number", min: 0.3, max: 0.75, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause light" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Fracture arrangement seed" },
  },
  presets: [
    {
      name: "Quiet studio glaze",
      description: "Fine medium-spaced grooves interrupt a restrained polished ceramic surface and its rounded bevel.",
      props: { cellSize: 70, crackWidth: 1, glaze: 0.55, speed: 0.65, intensity: 0.5, seed: 1 },
    },
    {
      name: "Antique crazing",
      description: "Broader fractures and a softer glaze reveal the recessed network and occasional wider junctions.",
      props: { cellSize: 94, crackWidth: 1.6, glaze: 0.3, speed: 0.45, intensity: 0.6, seed: 4 },
    },
    {
      name: "Fine porcelain",
      description: "A close hairline network sits beneath a sharper, quieter glaze reflection.",
      props: { cellSize: 44, crackWidth: 0.6, glaze: 0.75, speed: 0.8, intensity: 0.4, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
