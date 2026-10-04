import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "exhibition-labels",
  title: "Exhibition Labels",
  category: "sections",
  description: "A gallery catalogue pairing numbered original abstract studies with varied art proportions and curatorial labels.",
  tags: ["culture", "editorial", "exhibition-labels"],
  facets: ["static", "text", "interactive"],
  wave: 13,
  release: "microsites-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  controls: { title: { type: "string" }, gallery: { type: "string" }, dates: { type: "string" }, introduction: { type: "textarea", rows: 3 }, works: { type: "json" } },
  interactions: [[{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }]],
  original: true,
  credits: [],
};
