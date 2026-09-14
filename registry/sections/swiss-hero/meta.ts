import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "swiss-hero",
  title: "Swiss Hero",
  category: "sections",
  description: "A hero set on a strict twelve column grid: flush left type, hairline rules, white space, and one accent.",
  tags: ["hero", "swiss", "grid", "typography", "international style", "section"],
  facets: ["static", "text"],
  wave: 9,
  animated: false,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted", "accent"],
  demo: {
    children: "<p>Every component is one source: a framework-free core, a React file, and a single HTML file.</p>",
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "textarea", rows: 2 },
    kicker: { type: "string" },
    actions: { type: "json" },
    align: { type: "select", options: ["start", "end"] },
    guides: { type: "boolean" },
    minHeight: { type: "number", min: 0, max: 100, step: 5, label: "Min height (vh)" },
  },
  original: true,
  credits: [],
};
