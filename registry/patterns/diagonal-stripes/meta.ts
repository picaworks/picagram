import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "diagonal-stripes",
  title: "Diagonal Stripes",
  category: "patterns",
  description: "Fine diagonal rules form a quiet drafting ground behind page content.",
  tags: ["stripes", "diagonal", "rules", "background", "css"],
  facets: ["static", "background"],
  wave: 6,
  animated: false,
  decorative: true,
  wraps: "content",
  palette: ["fg"],
  controls: {
    angle: { type: "number", min: -75, max: 75, step: 1, label: "Angle (deg)" },
    spacing: { type: "number", min: 6, max: 64, step: 1, label: "Spacing (px)" },
    thickness: { type: "number", min: 1, max: 6, step: 1, label: "Thickness (px)" },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
  },
  demo: {
    children: "<h2>Field Notes</h2><p>Measured diagonals establish a quiet ground.</p>",
  },
  credits: [],
  original: true,
};
