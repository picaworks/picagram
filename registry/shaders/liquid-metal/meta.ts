import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "liquid-metal",
  title: "Liquid Metal",
  category: "shaders",
  description: "Slow blobs merge and part like drops of mercury, each surface mirroring a two band horizon through summed fields and reflection mapping.",
  tags: ["shader", "webgl", "background", "dither", "metaballs", "reflection"],
  facets: ["animated", "background", "interactive", "shader", "webgl", "dither"],
  wave: 4,
  animated: true,
  decorative: true,
  palette: ["fg", "accent", "bg"],
  controls: {
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    blobs: { type: "number", min: 2, max: 6, step: 1 },
    size: { type: "number", min: 0.05, max: 0.4, step: 0.01 },
    threshold: { type: "number", min: 0.2, max: 0.9, step: 0.05 },
    horizon: { type: "number", min: 0, max: 1, step: 0.05 },
    pointer: { type: "boolean" },
    levels: { type: "number", min: 2, max: 16, step: 1 },
    pixel: { type: "number", min: 1, max: 6, step: 1, label: "Pixel (px)" },
    fps: { type: "number", min: 6, max: 60, step: 1 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  interactions: [[{ step: "pointerMove", x: 0.7, y: 0.4 }]],
  credits: [
    { relation: "technique", title: "A Generalization of Algebraic Surface Drawing", author: "James F. Blinn", url: "https://doi.org/10.1145/357306.357310", license: "Paper" },
    { relation: "technique", title: "Texture and reflection in computer generated images", author: "James F. Blinn and Martin E. Newell", url: "https://doi.org/10.1145/360349.360353", license: "Paper" },
  ],
  original: false,
};
