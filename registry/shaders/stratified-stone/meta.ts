import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "stratified-stone",
  title: "Stratified Stone",
  category: "shaders",
  description: "Broad stacked sediment faces and bevelled edges reveal a finite stone slab, with displaced bedding across a subordinate fault under grazing light.",
  tags: ["stone", "sediment", "strata", "fault", "relief", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    strata: { type: "number", min: 3, max: 12, step: 1, label: "Broad sediment strata" },
    relief: { type: "number", min: 0.15, max: 1.5, step: 0.05, label: "Stone relief height" },
    fracture: { type: "number", min: 0, max: 1.5, step: 0.05, label: "Angular fault throw" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Directional light speed" },
    intensity: { type: "number", min: 0.25, max: 0.85, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause light" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 9999, step: 1, label: "Bedding and grain seed" },
  },
  presets: [
    {
      name: "Quiet bedding",
      description: "Six broad mineral layers expose their stepped risers across a small displaced seam and bevelled stone edge.",
      props: { strata: 6, relief: 0.85, fracture: 0.8, speed: 0.55, intensity: 0.6, seed: 1 },
    },
    {
      name: "Exposed fault",
      description: "Four deep sediment faces show a larger bedding displacement while the broad stone relief remains dominant.",
      props: { strata: 4, relief: 1.3, fracture: 1.3, speed: 0.4, intensity: 0.65, seed: 4 },
    },
    {
      name: "Shallow sediment",
      description: "Nine shallow mineral layers retain visible bedding, stable fine grain and a smaller fault throw.",
      props: { strata: 9, relief: 0.5, fracture: 0.35, speed: 0.8, intensity: 0.5, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
