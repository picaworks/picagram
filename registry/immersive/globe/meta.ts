import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "globe",
  title: "Globe",
  category: "immersive",
  description: "A dotted globe that turns slowly on a tilted axis, with named places marked on its surface.",
  tags: ["3d", "rotation", "map", "canvas"],
  wave: 3,
  animated: true,
  decorative: false,
  controls: {
    markers: { type: "json" },
    label: { type: "string" },
    dots: { type: "number", min: 500, max: 8000, step: 100 },
    speed: { type: "number", min: 0, max: 1, step: 0.05 },
    tilt: { type: "number", min: 0, max: 45, step: 1 },
    dotSize: { type: "number", min: 0.5, max: 3, step: 0.1 },
    fps: { type: "number", min: 12, max: 30, step: 1 },
    paused: { type: "boolean" },
  },
  palette: ["fg", "accent"],
  credits: [
    {
      relation: "technique",
      title: "Evenly distributing points on a sphere",
      author: "Martin Roberts",
      url: "https://extremelearning.com.au/how-to-evenly-distribute-points-on-a-sphere-more-effectively-than-the-canonical-fibonacci-lattice/",
      license: "Article",
    },
  ],
};
