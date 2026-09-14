import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "moire-rings",
  title: "Moire Rings",
  category: "patterns",
  description: "Two concentric hairline ring fields drift out of step to form a quiet radial moire behind content.",
  tags: ["moire", "rings", "radial", "interference", "css"],
  facets: ["static", "background"],
  wave: 6,
  animated: false,
  decorative: true,
  wraps: "content",
  controls: {
    spacing: { type: "number", min: 4, max: 16, step: 1, label: "Spacing (px)" },
    step: { type: "number", min: 1.02, max: 1.25, step: 0.01 },
    thickness: { type: "number", min: 1, max: 2, step: 0.25, label: "Thickness (px)" },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
  },
  palette: ["fg"],
  demo: {
    children: "<h2>Interference field</h2><p>Two ring systems resolve into a slow radial beat.</p>",
  },
  credits: [
    {
      relation: "technique",
      title: "The Theory of the Moiré Phenomenon, Volume I: Periodic Layers",
      author: "Isaac Amidror",
      url: "https://doi.org/10.1007/978-1-84882-181-1",
      license: "Book",
    },
  ],
};
