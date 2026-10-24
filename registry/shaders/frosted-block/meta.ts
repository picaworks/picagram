import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "frosted-block",
  title: "Frosted Block",
  category: "shaders",
  description: "A finite bevelled glass slab refracts crisp lines through a lightly grained face under slowly moving directional light.",
  tags: ["glass", "slab", "bevel", "refraction", "grain", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    width: { type: "number", min: 0.45, max: 0.8, step: 0.05, label: "Slab width" },
    bevel: { type: "number", min: 0.015, max: 0.09, step: 0.005, label: "Bevel width" },
    refraction: { type: "number", min: 0, max: 1.5, step: 0.05, label: "Line refraction" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Light and line drift" },
    intensity: { type: "number", min: 0.2, max: 1, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause material" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 9999, step: 1, label: "Grain and orientation seed" },
  },
  presets: [
    {
      name: "Quiet frosted slab",
      description: "A broad slab bends the line field at a modest bevel with restrained grain and highlights.",
      props: { width: 0.75, bevel: 0.04, refraction: 0.8, speed: 0.6, intensity: 0.65, seed: 1 },
    },
    {
      name: "Deep cut edge",
      description: "A wider bevel and stronger refraction reveal the continuous change from edge to face.",
      props: { width: 0.7, bevel: 0.075, refraction: 1.3, speed: 0.45, intensity: 0.75, seed: 4 },
    },
    {
      name: "Thin glass plate",
      description: "A smaller plate uses a fine bevel and slight displacement for a quieter material study.",
      props: { width: 0.55, bevel: 0.02, refraction: 0.4, speed: 0.8, intensity: 0.5, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
