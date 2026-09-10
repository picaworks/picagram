import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "aurora",
  title: "Aurora",
  category: "shaders",
  description: "Slow curtains of accent light drifting down from the top of the host, dithered between a few tone steps on the GPU.",
  tags: ["aurora", "shader", "webgl", "background", "dither"],
  wave: 3,
  animated: true,
  decorative: true,
  palette: ["fg", "accent", "bg"],
  controls: {
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    curtains: { type: "number", min: 2, max: 8, step: 1 },
    height: { type: "number", min: 0.2, max: 1, step: 0.05 },
    sway: { type: "number", min: 0, max: 1, step: 0.05 },
    intensity: { type: "number", min: 0, max: 1, step: 0.05 },
    levels: { type: "number", min: 2, max: 16, step: 1 },
    pixel: { type: "number", min: 1, max: 6, step: 1, label: "Pixel (px)" },
    fps: { type: "number", min: 6, max: 60, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    { relation: "technique", title: "Improving Noise", author: "Ken Perlin", url: "https://mrl.cs.nyu.edu/~perlin/paper445.pdf", license: "Paper" },
    { relation: "technique", title: "Ordered dithering", author: "Wikipedia", url: "https://en.wikipedia.org/wiki/Ordered_dithering", license: "Algorithm, no code" },
  ],
  original: false,
};
