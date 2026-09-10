import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-topo",
  title: "ASCII Topo",
  category: "ascii",
  description: "Contour lines of a slowly drifting noise height field, drawn like a topographic survey in text.",
  tags: ["noise", "contours", "marching squares", "topography"],
  wave: 2,
  animated: true,
  decorative: true,
  controls: {
    scale: { type: "number", min: 0.02, max: 0.2, step: 0.005 },
    levels: { type: "number", min: 4, max: 24, step: 1 },
    speed: { type: "number", min: 0, max: 0.5, step: 0.01 },
    ascii: { type: "boolean", label: "ASCII glyphs" },
    fontSize: { type: "number", min: 8, max: 24, step: 1 },
    lineHeight: { type: "number", min: 0.8, max: 1.6, step: 0.05 },
  },
  credits: [
    {
      relation: "technique",
      title: "Marching squares",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Marching_squares",
      license: "Algorithm, no code",
    },
    {
      relation: "technique",
      title: "Simplex noise demystified",
      author: "Stefan Gustavson",
      url: "https://weber.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf",
      license: "Public domain",
    },
  ],
};
