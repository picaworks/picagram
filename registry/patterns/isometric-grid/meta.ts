import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "isometric-grid",
  title: "Isometric Grid",
  category: "patterns",
  description: "A quiet isometric lattice of equilateral triangles that can resolve into staggered drafting points.",
  tags: ["isometric", "grid", "lattice", "dots", "css"],
  facets: ["static", "background"],
  wave: 6,
  animated: false,
  decorative: true,
  wraps: "content",
  controls: {
    spacing: { type: "number", min: 8, max: 64, step: 1, label: "Spacing (px)" },
    dots: { type: "boolean" },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
  },
  palette: ["fg"],
  demo: {
    children: "<h2>ISOMETRIC FIELD</h2><p>Three measured axes form one quiet structure.</p>",
  },
  credits: [],
  original: true,
};
