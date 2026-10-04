import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
 slug: "choreographic-score", title: "Choreographic score", category: "sections",
 description: "A contemporary dance program with original movement notation, a timed instruction score, cast credits, and audience information.",
 tags: ["dance", "choreography", "score", "performance"], facets: ["static", "text", "interactive"],
 wave: 13,
  release: "microsites-2026-10-04", animated: false, decorative: false, stage: "flow",
 palette: ["fg", "bg", "accent", "muted"],
 interactions: [[{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }]],
 controls: { company: { type: "string" }, title: { type: "string" }, performance: { type: "string" }, note: { type: "textarea", rows: 4 }, phrases: { type: "json" }, credits: { type: "json" }, audience: { type: "textarea", rows: 4 } },
 original: true, credits: [],
};
