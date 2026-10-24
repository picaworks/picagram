import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "cut-paper-relief",
  title: "Cut Paper Relief",
  category: "shaders",
  description: "Nested rounded paper cuts gather along the left and lower edges around a clear opening, with light and shadows derived from the same stepped surface.",
  tags: ["paper", "relief", "layers", "cutout", "shadows"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 16,
  release: "motion-materials-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  capture: 2400,
  presets: [
    {
      name: "Quiet cut",
      description: "Five shallow rounded cuts frame a generous opening with a restrained moving light.",
      props: { layers: 5, depth: 3.5, curve: 2.6, speed: 0.45, intensity: 1, seed: 1 },
    },
    {
      name: "Open arch",
      description: "Three broad elliptical cuts and deeper edges make a sparse sculptural frame.",
      props: { layers: 3, depth: 6, curve: 2, speed: 0.25, intensity: 0.9, seed: 4 },
    },
    {
      name: "Rounded frame",
      description: "Seven thin sheets use squarer rounded corners for a more architectural border.",
      props: { layers: 7, depth: 2, curve: 4, speed: 0.6, intensity: 0.85, seed: 7 },
    },
  ],
  controls: {
    layers: { type: "number", min: 2, max: 7, step: 1 },
    depth: { type: "number", min: 0.5, max: 10, step: 0.5 },
    curve: { type: "number", min: 1.6, max: 4.5, step: 0.1 },
    speed: { type: "number", min: 0, max: 2, step: 0.05 },
    intensity: { type: "number", min: 0.25, max: 1.3, step: 0.05 },
    paused: { type: "boolean" },
    time: { type: "number", min: 0, max: 120000, step: 100 },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
