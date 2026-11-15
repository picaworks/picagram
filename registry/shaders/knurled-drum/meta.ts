import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "knurled-drum",
  title: "Knurled Drum",
  category: "shaders",
  description: "A finite cylindrical drum turns raised diamond facets under one grazing light, bounded by plain machined rings and a visible end face.",
  tags: ["metal", "cylinder", "knurl", "diamond", "facets", "dither"],
  facets: ["animated", "shader", "webgl", "dither"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    pitch: { type: "number", min: 16, max: 48, step: 1, label: "Diamond spacing in pixels" },
    relief: { type: "number", min: 0.15, max: 0.6, step: 0.05, label: "Raised facet relief" },
    angle: { type: "number", min: 10, max: 55, step: 5, label: "Crossing groove angle" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Drum rotation speed" },
    intensity: { type: "number", min: 0.3, max: 0.75, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause drum" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Starting drum orientation seed" },
  },
  presets: [
    {
      name: "Workshop grip",
      description: "Medium diamond facets catch a quiet reflection between two plain end rings.",
      props: { pitch: 28, relief: 0.4, angle: 35, speed: 0.7, intensity: 0.55, seed: 1 },
    },
    {
      name: "Fine cross cut",
      description: "Small shallow diamonds form a finer grip with balanced diagonal grooves.",
      props: { pitch: 18, relief: 0.25, angle: 45, speed: 0.5, intensity: 0.45, seed: 4 },
    },
    {
      name: "Coarse facets",
      description: "Large raised diamonds stretch along the drum and expose broader sloping faces.",
      props: { pitch: 42, relief: 0.55, angle: 25, speed: 0.8, intensity: 0.65, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
