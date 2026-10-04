import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "museum-acquisition",
  title: "Museum Acquisition",
  category: "sections",
  description: "A museum accession record with original object drawings, a provenance timeline, and expandable conservation notes.",
  tags: ["culture", "editorial", "museum-acquisition"],
  facets: ["static", "text", "interactive"],
  wave: 13,
  release: "microsites-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  controls: { title: { type: "string" }, museum: { type: "string" }, accession: { type: "string" }, maker: { type: "string" }, description: { type: "textarea", rows: 3 }, provenance: { type: "json" } },
  interactions: [[{ step: "click", selector: "details:not([open]) summary" }, { step: "expectAttr", selector: "details", name: "open", value: "" }, { step: "press", key: "Enter" }, { step: "expectAttr", selector: "details", name: "open", value: null }, { step: "expectFocus", selector: "summary" }]],
  original: true,
  credits: [],
};
