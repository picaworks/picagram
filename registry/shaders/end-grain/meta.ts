import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "end-grain",
  title: "End Grain",
  category: "shaders",
  description: "Uneven organic growth rings surround an off-center pith, with narrow medullary rays and matte relief under calm grazing light.",
  tags: ["wood", "end-grain", "growth-rings", "medullary-rays", "organic", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    rings: { type: "number", min: 16, max: 48, step: 1, label: "Growth ring density" },
    irregularity: { type: "number", min: 0.2, max: 1, step: 0.05, label: "Organic irregularity" },
    relief: { type: "number", min: 0.15, max: 1.2, step: 0.05, label: "Cut relief" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Light speed" },
    intensity: { type: "number", min: 0.2, max: 1, step: 0.05, label: "Ink coverage" },
    paused: { type: "boolean", label: "Paused" },
    time: { type: "number", min: 0, max: 120000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 0, max: 9999, step: 1, label: "Growth seed" },
  },
  presets: [
    {
      name: "Cut timber",
      description: "Uneven rings and a few fine radial rays reveal the matte surface of an off-center cut.",
      props: { rings: 30, irregularity: 0.7, relief: 0.75, speed: 0.6, intensity: 0.65, seed: 1 },
    },
    {
      name: "Broad growth",
      description: "Sixteen widely spaced growth periods expose stronger variations in the fixed organic rings.",
      props: { rings: 16, irregularity: 0.8, relief: 0.6, speed: 0.45, intensity: 0.6, seed: 3 },
    },
    {
      name: "Fine hardwood",
      description: "Close irregular growth cuts form a quieter detailed surface with shallow matte relief.",
      props: { rings: 42, irregularity: 0.9, relief: 0.5, speed: 0.7, intensity: 0.55, seed: 5 },
    },
  ],
  original: true,
  credits: [],
};
