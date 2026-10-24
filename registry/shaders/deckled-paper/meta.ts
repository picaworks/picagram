import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "deckled-paper",
  title: "Deckled Paper",
  category: "shaders",
  description: "One finite deckle-edged sheet holds fine irregular fibers and a shallow bowed face under slow grazing light.",
  tags: ["paper", "deckle", "fibers", "bow", "grazing-light", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    fiber: { type: "number", min: 0.2, max: 1.5, step: 0.05, label: "Fiber strength" },
    bow: { type: "number", min: 0.2, max: 1.5, step: 0.05, label: "Sheet bow" },
    edge: { type: "number", min: 1, max: 10, step: 0.5, label: "Deckle roughness in pixels" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Grazing light speed" },
    intensity: { type: "number", min: 0.2, max: 1, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause light" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Paper fiber seed" },
  },
  presets: [
    {
      name: "Handmade sheet",
      description: "A medium bow and locally rough edge reveal fine sparse paper fibers.",
      props: { fiber: 0.75, bow: 0.9, edge: 4, speed: 0.7, intensity: 0.65, seed: 1 },
    },
    {
      name: "Cotton rag",
      description: "Stronger fibers and a rougher boundary sit on a gently bowed sheet.",
      props: { fiber: 1.25, bow: 0.55, edge: 7, speed: 0.5, intensity: 0.7, seed: 4 },
    },
    {
      name: "Pressed leaf",
      description: "A finer edge and quieter fibers expose the broad shallow face under moving light.",
      props: { fiber: 0.4, bow: 1.2, edge: 2, speed: 0.85, intensity: 0.55, seed: 9 },
    },
  ],
  original: true,
  credits: [],
};
