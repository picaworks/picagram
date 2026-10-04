import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pressure-print-image",
  title: "Pressure Print Image",
  category: "effects",
  description: "A local circular contact field reveals an image as a monochrome print; increasing pressure expands its footprint and deposits denser ink.",
  tags: ["image", "pressure", "print", "impression", "halftone", "canvas"],
  facets: ["static", "image", "canvas"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: true,
  palette: ["fg", "bg"],
  controls: {
    src: { type: "string", label: "Image URL" },
    pressure: { type: "number", min: 0, max: 1, step: 0.01, label: "Contact pressure" },
    radius: { type: "number", min: 0.05, max: 1.5, step: 0.01, label: "Contact radius" },
    position: { type: "numbers", label: "Contact center [x, y]" },
    fit: { type: "select", options: ["contain", "cover"] },
  },
  credits: [],
  original: true,
};
