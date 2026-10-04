import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "repertory-playbill",
  title: "Repertory Playbill",
  category: "sections",
  description: "A folded theatre playbill with cast billing, an original stage plan, and audience information.",
  tags: ["culture", "editorial", "repertory-playbill"],
  facets: ["static", "text", "interactive"],
  wave: 13,
  release: "microsites-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  controls: { title: { type: "string" }, theatre: { type: "string" }, season: { type: "string" }, synopsis: { type: "textarea", rows: 3 }, cast: { type: "json" } },
  interactions: [[{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }]],
  original: true,
  credits: [],
};
