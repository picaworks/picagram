import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
 slug: "landscape-study", title: "Landscape study", category: "sections",
 description: "A landscape research page with original contour and transect diagrams, seasonal field measurements, and a reversible land trial.",
 tags: ["landscape", "research", "survey", "field"], facets: ["static", "text", "interactive"],
 wave: 13,
  release: "microsites-2026-10-04", animated: false, decorative: false, stage: "flow",
 palette: ["fg", "bg", "accent", "muted"],
 interactions: [[{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }]],
 controls: { practice: { type: "string" }, title: { type: "string" }, site: { type: "string" }, hypothesis: { type: "textarea", rows: 4 }, observations: { type: "json" }, intervention: { type: "textarea", rows: 4 } },
 original: true, credits: [],
};
