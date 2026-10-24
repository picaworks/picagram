import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "hammered-foil",
  title: "Hammered Foil",
  category: "shaders",
  description: "Irregular rounded hammer depressions catch a broad directional reflection across a shallow metallic sheet.",
  tags: ["foil", "hammered", "metal", "depressions", "reflection", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 17,
  release: "kinetic-studies-2026-10-24",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    dentSize: { type: "number", min: 36, max: 140, step: 1, label: "Depression spacing in pixels" },
    depth: { type: "number", min: 0.1, max: 0.65, step: 0.05, label: "Hammer depth" },
    roughness: { type: "number", min: 0.2, max: 1, step: 0.05, label: "Reflection roughness" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Light sweep speed" },
    intensity: { type: "number", min: 0.2, max: 1, step: 0.05, label: "Ink intensity" },
    paused: { type: "boolean", label: "Pause light" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Dimple arrangement seed" },
  },
  presets: [
    {
      name: "Soft hammered sheet",
      description: "Medium rounded depressions hold a quiet, broad metallic reflection.",
      props: { dentSize: 76, depth: 0.3, roughness: 0.65, speed: 0.65, intensity: 0.6, seed: 1 },
    },
    {
      name: "Deep handwork",
      description: "Larger depressions expose deeper sloping walls under a more focused reflection.",
      props: { dentSize: 112, depth: 0.55, roughness: 0.4, speed: 0.45, intensity: 0.75, seed: 4 },
    },
    {
      name: "Fine foil",
      description: "Small shallow marks spread a subdued reflection across a finely hammered surface.",
      props: { dentSize: 48, depth: 0.15, roughness: 0.9, speed: 0.8, intensity: 0.45, seed: 9 },
    },
  ],
  original: true,
  credits: [],
};
