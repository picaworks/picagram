import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "shader-flow",
  title: "Shader Flow",
  category: "shaders",
  description: "Hairline contour bands drift through the ground like a slow current, folded by domain-warped noise on the GPU.",
  tags: ["gradient", "shader", "webgl", "background", "dither", "flow"],
  facets: ["animated", "background", "shader", "webgl", "dither"],
  wave: 3,
  animated: true,
  decorative: true,
  palette: ["fg", "accent", "bg"],
  presets: [
    { name: "Quiet background", description: "Open contour bands with a gentle fold.", props: {"speed": 0.12, "scale": 1.2, "bands": 8, "thickness": 0.04, "warp": 0.3, "levels": 5, "pixel": 1} },
    { name: "Wide current", description: "Broad, slow contours with more empty ground.", props: {"speed": 0.08, "scale": 0.8, "bands": 6, "thickness": 0.03, "warp": 0.15, "levels": 6, "pixel": 1} },
    { name: "Fine contours", description: "More lines while keeping the strokes light.", props: {"speed": 0.12, "scale": 1.5, "bands": 14, "thickness": 0.04, "warp": 0.4, "levels": 5, "pixel": 1} },
  ],
  controls: {
    speed: { type: "number", min: 0, max: 1, step: 0.01, label: "Motion speed" },
    scale: { type: "number", min: 0.5, max: 4, step: 0.1 },
    bands: { type: "number", min: 4, max: 40, step: 1 },
    thickness: { type: "number", min: 0.02, max: 0.3, step: 0.01 },
    warp: { type: "number", min: 0, max: 1, step: 0.05 },
    pointer: { type: "boolean" },
    levels: { type: "number", min: 2, max: 16, step: 1 },
    pixel: { type: "number", min: 1, max: 6, step: 1, label: "Pixel (px)" },
    fps: { type: "number", min: 6, max: 60, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    { relation: "technique", title: "Domain warping", author: "Inigo Quilez", url: "https://iquilezles.org/articles/warp/", license: "Article" },
    { relation: "technique", title: "Improving Noise", author: "Ken Perlin", url: "https://mrl.cs.nyu.edu/~perlin/paper445.pdf", license: "Paper" },
  ],
  original: false,
};
