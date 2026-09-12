import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-sort",
  title: "Pixel Sort",
  category: "effects",
  description: "An image whose pixel rows or columns are sorted by brightness within threshold bands, smearing tone into streaks.",
  tags: ["image", "static", "canvas", "glitch"],
  facets: ["static", "image", "canvas"],
  wave: 2,
  animated: false,
  decorative: false,
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    direction: { type: "select", options: ["horizontal", "vertical"] },
    low: { type: "number", min: 0, max: 1, step: 0.01 },
    high: { type: "number", min: 0, max: 1, step: 0.01 },
    color: { type: "boolean", label: "Keep color" },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
  },
  credits: [
    {
      relation: "technique",
      title: "ASDF pixel sorting",
      author: "Kim Asendorf",
      url: "https://github.com/kimasendorf/ASDFPixelSort",
      license: "Technique, no code read",
    },
  ],
};
