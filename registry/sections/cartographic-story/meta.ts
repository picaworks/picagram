import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
    slug: "cartographic-story",
    title: "Cartographic Story",
    category: "sections",
    description: "A narrative map essay with a traced walking route, numbered field captions, a journey essay, and route notes.",
    tags: ["publication", "one-page", "cartographic-story"],
    facets: ["static", "text", "interactive"],
    wave: 13,
  release: "microsites-2026-10-04",
    animated: false,
    decorative: false,
    stage: "flow",
    palette: ["fg", "bg", "accent", "muted"],
    controls: {
        title: { type: "textarea", rows: 3 },
        deck: { type: "textarea", rows: 3 },
        byline: { type: "string" },
        essay: { type: "textarea", rows: 3 },
    },
    interactions: [
        [{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "nav a" }],
        [{ step: "click", selector: "summary" }, { step: "expectAttr", selector: "details", name: "open", value: "" }],
    ],
    original: true,
    credits: [],
};
