import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "grid-paper",
  title: "Grid Paper",
  category: "patterns",
  description: "A quiet square mesh with darker major rules aligned to regular minor intervals.",
  tags: ["grid", "graph paper", "engineering", "background", "css"],
  facets: ["static", "background"],
  wave: 6,
  animated: false,
  decorative: true,
  wraps: "content",
  controls: {
    spacing: { type: "number", min: 4, max: 32, step: 1, label: "Spacing (px)" },
    major: { type: "number", min: 2, max: 10, step: 1, label: "Major interval" },
    strength: { type: "number", min: 0, max: 1, step: 0.05 },
  },
  credits: [],
  original: true,
  palette: ["fg", "muted"],
  demo: {
    children: "<div><h2>Working Grid</h2><p>Measured notes for careful construction.</p></div>",
  },
};
