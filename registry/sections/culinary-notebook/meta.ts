import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
 slug: "culinary-notebook", title: "Culinary notebook", category: "sections",
 description: "A cookbook recipe spread with an original still-life drawing, ingredient weights, timed methods, and practical kitchen notes.",
 tags: ["cooking", "recipe", "notebook", "food"], facets: ["static", "text", "interactive"],
 wave: 13,
  release: "microsites-2026-10-04", animated: false, decorative: false, stage: "flow",
 palette: ["fg", "bg", "accent", "muted"],
 interactions: [[{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }]],
 controls: { author: { type: "string" }, title: { type: "string" }, edition: { type: "string" }, introduction: { type: "textarea", rows: 3 }, yield: { type: "string" }, ingredients: { type: "json" }, method: { type: "json" }, note: { type: "textarea", rows: 4 } },
 original: true, credits: [],
};
