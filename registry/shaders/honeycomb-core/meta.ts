import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "honeycomb-core",
  title: "Honeycomb Core",
  category: "shaders",
  description: "A finite stepped slab exposes thick open hexagonal cells, front web rims and shaded interior walls beneath one slow directional light.",
  tags: ["honeycomb", "hexagon", "core", "cells", "material", "dither"],
  facets: ["animated", "shader", "webgl", "dither"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    cellSize: { type: "number", min: 30, max: 80, step: 1, label: "Cell width in pixels" },
    depth: { type: "number", min: 0.2, max: 0.7, step: 0.05, label: "Open cell depth" },
    wall: { type: "number", min: 0.08, max: 0.2, step: 0.01, label: "Front web thickness" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Directional light speed" },
    intensity: { type: "number", min: 0.3, max: 0.75, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause light" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Panel orientation seed" },
  },
  presets: [
    {
      name: "Structural sample",
      description: "Medium cells and a clear open depth reveal the front web and six sided interiors.",
      props: { cellSize: 54, depth: 0.5, wall: 0.12, speed: 0.65, intensity: 0.55, seed: 1 },
    },
    {
      name: "Fine light core",
      description: "Smaller shallow cells leave a fine, lightly inked open structure.",
      props: { cellSize: 34, depth: 0.3, wall: 0.09, speed: 0.5, intensity: 0.45, seed: 4 },
    },
    {
      name: "Deep heavy web",
      description: "Large deep cells expose broad inner walls beneath a thicker front web.",
      props: { cellSize: 76, depth: 0.65, wall: 0.18, speed: 0.75, intensity: 0.65, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
