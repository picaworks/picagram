import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "risograph-image",
  title: "Risograph Image",
  category: "effects",
  description:
    "An image printed as two risograph passes, fg for the shadows and accent for the midtones, each screened and offset so their edges fringe.",
  tags: ["image", "static", "risograph", "halftone", "canvas"],
  facets: ["static", "image", "canvas", "dither"],
  wave: 4,
  animated: false,
  decorative: false,
  palette: ["fg", "accent"],
  controls: {
    src: { type: "string", label: "Image URL" },
    alt: { type: "string", label: "Alt text" },
    fit: { type: "select", options: ["cover", "contain"] },
    tone: { type: "select", options: ["auto", "light-on-dark", "dark-on-light"] },
    contrast: { type: "number", min: 0.5, max: 2, step: 0.05 },
    offset: { type: "number", min: 0, max: 6, step: 1, label: "Offset (px)" },
    angle: { type: "number", min: 0, max: 360, step: 1, label: "Angle" },
    grain: { type: "number", min: 2, max: 12, step: 1, label: "Grain (px)" },
    split: { type: "number", min: 0, max: 1, step: 0.05 },
    coverage: { type: "number", min: 0, max: 1, step: 0.05 },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Digital Duplicator",
      author: "RISO Kagaku Corporation",
      url: "https://www.riso.co.jp/english/product/digital_dup/",
      license: "Reference, no code",
    },
    {
      relation: "technique",
      title: "Risograph",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Risograph",
      license: "Reference, no code",
    },
    {
      relation: "technique",
      title: "Void-and-cluster method for dither array generation",
      author: "Robert A. Ulichney",
      url: "https://doi.org/10.1117/12.152707",
      license: "Paper",
    },
  ],
};
