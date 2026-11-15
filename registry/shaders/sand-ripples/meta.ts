import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "sand-ripples",
  title: "Sand Ripples",
  category: "shaders",
  description: "A finite low dune patch carries asymmetric windward rises, short sheltered faces and fine sand grain under one slow grazing light.",
  tags: ["sand", "dune", "ripples", "wind", "grain", "dither"],
  facets: ["animated", "shader", "webgl", "dither"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    spacing: { type: "number", min: 25, max: 70, step: 1, label: "Crest spacing in pixels" },
    relief: { type: "number", min: 0.2, max: 0.7, step: 0.05, label: "Ripple relief" },
    wind: { type: "number", min: 10, max: 60, step: 1, label: "Wind direction in degrees" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Light and crest drift speed" },
    intensity: { type: "number", min: 0.3, max: 0.75, step: 0.05, label: "Sand ink intensity" },
    paused: { type: "boolean", label: "Pause sand ripples" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Crest and grain arrangement seed" },
  },
  presets: [
    {
      name: "Wind carved patch",
      description: "Medium crests bend gently across a low mound, with long rises and short sheltered faces.",
      props: { spacing: 44, relief: 0.45, wind: 28, speed: 0.65, intensity: 0.5, seed: 1 },
    },
    {
      name: "Broad lee ridges",
      description: "Widely spaced high ridges expose deeper sheltered troughs under a slower crosswind light.",
      props: { spacing: 70, relief: 0.65, wind: 46, speed: 0.45, intensity: 0.6, seed: 4 },
    },
    {
      name: "Fine shore ripples",
      description: "Close shallow crests and restrained grain make a quieter patch at a low wind angle.",
      props: { spacing: 28, relief: 0.25, wind: 12, speed: 0.8, intensity: 0.4, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
