import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "caustic-field",
  title: "Caustic Field",
  category: "shaders",
  description: "The net of bright filaments light draws on a pool floor, refracted through a slow wave surface and dithered on the GPU.",
  tags: ["caustics", "water", "light", "shader", "webgl", "background", "dither"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 4,
  animated: true,
  decorative: true,
  palette: ["fg", "accent", "bg"],
  controls: {
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    scale: { type: "number", min: 0.5, max: 6, step: 0.1 },
    waves: { type: "number", min: 2, max: 5, step: 1 },
    depth: { type: "number", min: 0, max: 1, step: 0.05 },
    sharpness: { type: "number", min: 0, max: 1, step: 0.05 },
    levels: { type: "number", min: 2, max: 16, step: 1 },
    pixel: { type: "number", min: 1, max: 6, step: 1, label: "Pixel (px)" },
    fps: { type: "number", min: 6, max: 60, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Method of displaying optical effects within water using accumulation buffer",
      author: "Tomoyuki Nishita and Eihachiro Nakamae",
      url: "https://doi.org/10.1145/192161.192261",
      license: "Paper",
    },
    {
      relation: "technique",
      title: "Catastrophe Optics: Morphologies of Caustics and Their Diffraction Patterns",
      author: "M. V. Berry and C. Upstill",
      url: "https://doi.org/10.1016/S0079-6638(08)70215-4",
      license: "Paper",
    },
  ],
  original: false,
};
