import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "triangular-mesh",
  title: "Triangular Mesh",
  category: "patterns",
  description: "An irregular triangulated wireframe with a dot at every node and a few accent vertices behind content.",
  tags: ["triangles", "mesh", "low poly", "wireframe", "nodes", "seeded"],
  facets: ["static", "background"],
  wave: 12,
  animated: false,
  decorative: true,
  wraps: "content",
  controls: {
    cell: { type: "number", min: 24, max: 96, step: 1, label: "Cell (px)" },
    jitter: { type: "number", min: 0.1, max: 0.6, step: 0.05 },
    nodes: { type: "boolean" },
    marks: { type: "number", min: 0, max: 12, step: 1, label: "Marks (%)" },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
    seed: { type: "number", min: -2147483648, max: 2147483647, step: 1 },
  },
  palette: ["fg", "accent"],
  demo: {
    children: "<h2>Surface in outline</h2><p>Straight edges join a field of nodes into triangles of every shape.</p>",
  },
  credits: [],
  original: true,
};
