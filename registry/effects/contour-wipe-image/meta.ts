import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "contour-wipe-image",
  title: "Contour Wipe Image",
  category: "effects",
  description: "A progress-controlled monochrome image reveal traverses ordered luminance bands, with a single accent contour tracing the active threshold.",
  tags: ["image", "contour", "luminance", "wipe", "progress", "canvas"],
  facets: ["static", "image", "canvas"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: true,
  palette: ["fg", "bg", "accent"],
  controls: {
    src: { type: "string", label: "Image URL" },
    progress: { type: "number", min: 0, max: 1, step: 0.01, label: "Reveal progress" },
    bands: { type: "number", min: 2, max: 32, step: 1, label: "Contour bands" },
    invert: { type: "boolean", label: "Dark contours first" },
    fit: { type: "select", options: ["contain", "cover"] },
  },
  credits: [],
  original: true,
};
