import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "hero",
  title: "Hero",
  category: "sections",
  description: "A page hero that adds calls to action and a composed background behind a headline and copy.",
  tags: ["hero", "landing", "section", "cta", "background"],
  facets: ["animated", "interactive", "webgl"],
  wave: 3,
  animated: true,
  decorative: false,
  wraps: "content",
  palette: ["fg", "accent"],
  demo: {
    children: "<h1>Components drawn in text.</h1><p>ASCII-first components for React and plain HTML.</p>",
  },
  interactions: [[{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }]],
  controls: {
    background: { type: "select", options: ["mesh", "noise", "none"] },
    actions: { type: "json" },
    align: { type: "select", options: ["start", "center"] },
    minHeight: { type: "number", min: 30, max: 100, step: 5, label: "Min height (vh)" },
    intensity: { type: "number", min: 0, max: 1, step: 0.05 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
