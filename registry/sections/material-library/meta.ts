import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "material-library",
  title: "Material library",
  category: "sections",
  description: "An architectural sample register with original surface patterns, a specification ledger, and repair-minded selection criteria.",
  tags: ["architecture", "materials", "sample", "index"],
  facets: ["static", "text", "interactive"],
  wave: 13,
  release: "microsites-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  interactions: [[{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }]],
  controls: { practice: { type: "string" }, title: { type: "string" }, edition: { type: "string" }, description: { type: "textarea", rows: 3 }, samples: { type: "json" }, selection: { type: "textarea", rows: 4 } },
  original: true,
  credits: [],
};
