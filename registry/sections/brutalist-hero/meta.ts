import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "brutalist-hero",
  title: "Brutalist Hero",
  category: "sections",
  description: "A hero section that shows its structure: bordered blocks that collide, mono labels, and the accent as flat fill.",
  tags: ["hero", "brutalist", "section", "borders", "cta", "landing"],
  facets: ["static", "text"],
  wave: 9,
  animated: false,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "accent", "bg"],
  demo: {
    children: "<h2>Every block shows its edges.</h2><p>Content the page wraps lands in its own bordered box, colliding with the rest.</p>",
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "textarea", rows: 2 },
    kicker: { type: "string" },
    actions: { type: "json" },
    background: { type: "select", options: ["grid", "rules", "none"] },
    intensity: { type: "number", min: 0, max: 1, step: 0.05 },
    align: { type: "select", options: ["start", "center"] },
    minHeight: { type: "number", min: 30, max: 100, step: 5, label: "Min height (vh)" },
  },
  original: true,
  credits: [],
};
