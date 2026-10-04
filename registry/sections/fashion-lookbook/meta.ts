import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "fashion-lookbook",
  title: "Fashion lookbook",
  category: "sections",
  description: "An atelier collection presented through asymmetric folio spreads, original garment silhouettes, and technical drawings.",
  tags: ["fashion", "lookbook", "editorial", "garment"],
  facets: ["static", "text", "interactive"],
  wave: 13,
  release: "microsites-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  interactions: [[{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }]],
  controls: { label: { type: "string" }, title: { type: "string" }, season: { type: "string" }, statement: { type: "textarea", rows: 3 }, looks: { type: "json" }, construction: { type: "textarea", rows: 4 } },
  original: true,
  credits: [],
};
