import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "archive-finding-aid",
  title: "Archive Finding Aid",
  category: "sections",
  description: "An institutional finding aid with a collection identifier, arrangement tree, and expandable series descriptions.",
  tags: ["culture", "editorial", "archive-finding-aid"],
  facets: ["static", "text", "interactive"],
  wave: 13,
  release: "microsites-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  controls: { title: { type: "string" }, identifier: { type: "string" }, repository: { type: "string" }, summary: { type: "textarea", rows: 3 }, series: { type: "json" } },
  interactions: [[{ step: "click", selector: "details:not([open]) summary" }, { step: "expectAttr", selector: "details", name: "open", value: "" }, { step: "press", key: "Enter" }, { step: "expectAttr", selector: "details", name: "open", value: null }, { step: "expectFocus", selector: "summary" }]],
  original: true,
  credits: [],
};
