import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "donut-chart",
  title: "Donut Chart",
  category: "data",
  description: "Parts of a whole drawn as a ring, either as SVG segments or a monospace glyph grid, with a hidden data table.",
  tags: ["chart", "donut", "svg", "glyph grid", "data table"],
  wave: 3,
  animated: false,
  decorative: false,
  palette: ["fg", "accent"],
  controls: {
    data: { type: "json" },
    label: { type: "string" },
    highlight: { type: "number", min: -1, max: 30, step: 1 },
    thickness: { type: "number", min: 0.1, max: 0.6, step: 0.01 },
    gap: { type: "number", min: 0, max: 4, step: 0.5 },
    center: { type: "select", options: ["total", "highlight", "none"] },
    look: { type: "select", options: ["svg", "glyph"] },
  },
  original: true,
  credits: [],
};
