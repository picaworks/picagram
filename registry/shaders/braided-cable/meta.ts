import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "braided-cable",
  title: "Braided Cable",
  category: "shaders",
  description: "A finite S shaped cable carries cylindrical braid bundles through visible over and under crossings, with recessed seams and one restrained moving light.",
  tags: ["braid", "cable", "rope", "cylinder", "crossings", "dither"],
  facets: ["animated", "shader", "webgl", "dither"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    strands: { type: "number", min: 3, max: 5, step: 1, label: "Cylindrical bundles" },
    crossings: { type: "number", min: 4, max: 9, step: 1, label: "Half twists along cable" },
    width: { type: "number", min: 0.18, max: 0.35, step: 0.01, label: "Cable diameter" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Torsion and light speed" },
    intensity: { type: "number", min: 0.3, max: 0.75, step: 0.05, label: "Material ink intensity" },
    paused: { type: "boolean", label: "Pause cable" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting braid orientation seed" },
  },
  presets: [
    {
      name: "Three bundle cord",
      description: "Three broad bundles exchange depth through six half twists along a gentle S bend.",
      props: { strands: 3, crossings: 6, width: 0.26, speed: 0.65, intensity: 0.55, seed: 1 },
    },
    {
      name: "Fine five strand braid",
      description: "Five narrower bundles and nine half twists produce a finer and more closely interlaced cable.",
      props: { strands: 5, crossings: 9, width: 0.22, speed: 0.5, intensity: 0.5, seed: 4 },
    },
    {
      name: "Broad open braid",
      description: "Four thick bundles make four open half twists with a slightly stronger matte light.",
      props: { strands: 4, crossings: 4, width: 0.35, speed: 0.45, intensity: 0.6, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
