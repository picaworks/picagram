import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "scallop-arches",
  title: "Scallop Arches",
  category: "patterns",
  description: "Offset courses of nested open semicircle arches drawn as hairlines behind page content.",
  tags: ["scallop", "scales", "arches", "roof tile", "ornament", "svg"],
  facets: ["static", "background"],
  wave: 12,
  animated: false,
  decorative: true,
  wraps: "content",
  palette: ["fg"],
  controls: {
    radius: { type: "number", min: 16, max: 48, step: 1, label: "Radius (px)" },
    rings: { type: "number", min: 2, max: 5, step: 1, label: "Rings per scallop" },
    thickness: { type: "number", min: 1, max: 2, step: 0.1, label: "Thickness (px)" },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
  },
  demo: {
    children: "<h2>Courses of scales</h2><p>Nested arches step half a scallop from one row to the next.</p>",
  },
  credits: [],
  original: true,
};
