import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "bento-hero",
  title: "Bento Hero",
  category: "sections",
  description: "A hero laid out as a bento tray: a lead cell for the headline and calls to action over a content cell, beside a column of smaller fact and field cells.",
  tags: ["hero", "bento", "landing", "section", "grid", "facts"],
  facets: ["animated", "text", "background"],
  wave: 9,
  animated: true,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "muted", "accent"],
  demo: {
    children: '<p>Every component ships as one file: a React wrapper, or a plain HTML page that needs nothing.</p><p class="note">Free for personal projects.</p>',
  },
  controls: {
    headline: { type: "string" },
    subhead: { type: "string" },
    actions: { type: "json" },
    facts: { type: "json" },
    trend: { type: "numbers" },
    align: { type: "select", options: ["start", "center"] },
    field: { type: "select", options: ["noise", "none"] },
    intensity: { type: "number", min: 0, max: 1, step: 0.05 },
    minHeight: { type: "number", min: 30, max: 100, step: 5, label: "Min height (vh)" },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
