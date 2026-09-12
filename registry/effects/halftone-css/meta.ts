import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "halftone-css",
  title: "Halftone CSS",
  category: "effects",
  description: "A halftone dot pattern made entirely of layered CSS gradients, for use as a background.",
  tags: ["background", "pattern", "halftone", "css"],
  facets: ["static", "background"],
  wave: 2,
  animated: false,
  decorative: true,
  controls: {
    size: { type: "number", min: 8, max: 32, step: 1 },
    dot: { type: "number", min: 0.1, max: 0.5, step: 0.01 },
    fade: { type: "select", options: ["radial", "linear", "none"] },
    angle: { type: "number", min: 0, max: 360, step: 1 },
    strength: { type: "number", min: 0.1, max: 1, step: 0.05 },
  },
  credits: [
    {
      relation: "technique",
      title: "CSS halftone patterns",
      author: "Michelle Barker, CSS { In Real Life }",
      url: "https://css-irl.info/css-halftone-patterns/",
      license: "Article",
    },
  ],
};
