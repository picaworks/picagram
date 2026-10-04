import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "edge-fold-image",
  title: "Edge Fold Image",
  category: "effects",
  description: "A monochrome image's edge rotates around a fixed crease, foreshortening its texture in perspective and exposing a controllable opening.",
  tags: ["image", "fold", "edge", "crease", "perspective"],
  facets: ["static", "image", "canvas"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    src: { type: "string", label: "Image URL" },
    edge: { type: "select", options: ["left", "right", "top", "bottom"] },
    fold: { type: "number", min: 0, max: 1, step: 0.01 },
    crease: { type: "number", min: 0.04, max: 0.46, step: 0.01, label: "Crease depth" },
  },
  credits: [],
  original: true,
};
