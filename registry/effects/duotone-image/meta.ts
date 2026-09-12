import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "duotone-image",
  title: "Duotone Image",
  category: "effects",
  description: "An image posterized into flat tone bands, each drawn at a stepped opacity in the host's ink color.",
  tags: ["image", "static", "duotone", "canvas"],
  facets: ["static", "image", "canvas"],
  wave: 2,
  animated: false,
  decorative: false,
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    levels: { type: "number", min: 2, max: 8, step: 1 },
    accent: { type: "boolean" },
    contrast: { type: "number", min: 0.5, max: 2.5, step: 0.05 },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
  },
  credits: [],
  original: true,
};
