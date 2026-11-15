import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "twill-weave",
  title: "Twill Weave",
  category: "shaders",
  description: "A finite fabric swatch interlaces wide flat bundles in a two over two under twill, with a structural diagonal, fine frayed ends and directional sheen.",
  tags: ["twill", "weave", "fabric", "bundles", "anisotropic", "dither"],
  facets: ["animated", "shader", "webgl", "dither"],
  wave: 18,
  release: "mechanisms-surfaces-2026-11-14",
  animated: true,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    bundleSize: { type: "number", min: 14, max: 40, step: 1, label: "Fiber bundle size in pixels" },
    loft: { type: "number", min: 0.2, max: 0.65, step: 0.05, label: "Bundle loft" },
    angle: { type: "number", min: 15, max: 60, step: 1, label: "Fabric angle in degrees" },
    speed: { type: "number", min: 0, max: 2, step: 0.05, label: "Anisotropic light speed" },
    intensity: { type: "number", min: 0.3, max: 0.75, step: 0.05, label: "Textile ink intensity" },
    paused: { type: "boolean", label: "Pause twill light" },
    time: { type: "number", min: 0, max: 60000, step: 100, label: "Fixed time in milliseconds" },
    seed: { type: "number", min: 1, max: 99, step: 1, label: "Fiber and light arrangement seed" },
  },
  presets: [
    {
      name: "Studio twill",
      description: "Medium flat bundles form a clear diagonal repeat with modest loft and soft directional sheen.",
      props: { bundleSize: 24, loft: 0.4, angle: 32, speed: 0.65, intensity: 0.5, seed: 1 },
    },
    {
      name: "Coarse raised twill",
      description: "Wide high bundles expose the two over two under structure and deeper recessed crossings.",
      props: { bundleSize: 38, loft: 0.6, angle: 15, speed: 0.45, intensity: 0.6, seed: 4 },
    },
    {
      name: "Fine bias cloth",
      description: "Small low bundles make a closer diagonal weave on a more steeply turned fabric swatch.",
      props: { bundleSize: 16, loft: 0.25, angle: 58, speed: 0.8, intensity: 0.4, seed: 7 },
    },
  ],
  original: true,
  credits: [],
};
