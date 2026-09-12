import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-displace-image",
  title: "Pixel Displace Image",
  category: "effects",
  description: "A photograph sheared into horizontal bands that slide sideways on a slow noise field, like a printout pulled crooked.",
  tags: ["image", "displace", "shear", "noise", "canvas"],
  facets: ["animated", "image", "canvas"],
  wave: 4,
  animated: true,
  decorative: false,
  palette: ["fg"],
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    contrast: { type: "number", min: 0.5, max: 2, step: 0.05 },
    strips: { type: "number", min: 20, max: 200, step: 1 },
    amount: { type: "number", min: 0, max: 0.3, step: 0.01 },
    scale: { type: "number", min: 0.2, max: 4, step: 0.1 },
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    settle: { type: "number", min: 0, max: 1, step: 0.05 },
    fps: { type: "number", min: 6, max: 30, step: 1, label: "FPS" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Simplex noise",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Simplex_noise",
      license: "Algorithm, no code",
    },
  ],
};
