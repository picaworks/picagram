import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "channel-shift-image",
  title: "Channel Shift Image",
  category: "effects",
  description: "An image split into a dark layer and a light layer, each posterized flat and slid apart along one axis.",
  tags: ["image", "static", "posterize", "canvas", "registration"],
  facets: ["static", "image", "canvas"],
  wave: 4,
  animated: false,
  decorative: false,
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    contrast: { type: "number", min: 0.5, max: 2, step: 0.05 },
    offset: { type: "number", min: 0, max: 40, step: 1 },
    angle: { type: "number", min: 0, max: 360, step: 1 },
    split: { type: "number", min: 0, max: 1, step: 0.05 },
    accent: { type: "boolean" },
    overlap: { type: "select", options: ["darken", "over"] },
  },
  palette: ["fg", "accent"],
  credits: [
    {
      relation: "technique",
      title: "Printing registration",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Printing_registration",
      license: "Reference, no code",
    },
  ],
};
