import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "neumorphic-hero",
  title: "Neumorphic Hero",
  category: "sections",
  description: "A soft UI hero that trades blur for screens: a slab and a rail of stat tiles rise from the ground on dithered bevels, and the call to action presses in.",
  tags: ["hero", "neumorphic", "soft ui", "bevel", "dither", "section", "landing"],
  facets: ["static", "text"],
  wave: 9,
  animated: false,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted", "bg"],
  demo: {
    children: "<p>Every component is one source: a framework-free core, a React file, and a single HTML file.</p>",
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "textarea", rows: 2 },
    actions: { type: "json" },
    facts: { type: "json" },
    align: { type: "select", options: ["start", "center"] },
    minHeight: { type: "number", min: 0, max: 100, step: 5, label: "Min height (vh)" },
    depth: { type: "number", min: 0, max: 1, step: 0.05 },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
