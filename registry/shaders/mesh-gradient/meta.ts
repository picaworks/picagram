import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "mesh-gradient",
  title: "Mesh Gradient",
  category: "shaders",
  description: "A slow mesh of accent and ink fields, folded together by noise and dithered between a few tone steps on the GPU.",
  tags: ["gradient", "shader", "webgl", "background", "dither"],
  wave: 3,
  animated: true,
  decorative: true,
  palette: ["fg", "bg", "accent"],
  controls: {
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    scale: { type: "number", min: 0.4, max: 4, step: 0.1 },
    warp: { type: "number", min: 0, max: 1, step: 0.05 },
    intensity: { type: "number", min: 0, max: 1, step: 0.05 },
    levels: { type: "number", min: 2, max: 16, step: 1 },
    pixel: { type: "number", min: 1, max: 6, step: 1, label: "Pixel (px)" },
    fps: { type: "number", min: 6, max: 60, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    { relation: "technique", title: "Domain warping", author: "Inigo Quilez", url: "https://iquilezles.org/articles/warp/", license: "Article" },
    { relation: "technique", title: "Improving Noise", author: "Ken Perlin", url: "https://mrl.cs.nyu.edu/~perlin/paper445.pdf", license: "Paper" },
    { relation: "technique", title: "Ordered dithering", author: "Wikipedia", url: "https://en.wikipedia.org/wiki/Ordered_dithering", license: "Algorithm, no code" },
  ],
  original: false,
};
