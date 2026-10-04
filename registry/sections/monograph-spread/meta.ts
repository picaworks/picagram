import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
    slug: "monograph-spread",
    title: "Monograph Spread",
    category: "sections",
    description: "An artist monograph with facing pages, geometric studies, marginal captions, and an essay with chapter navigation.",
    tags: ["publication", "one-page", "monograph-spread"],
    facets: ["static", "text", "interactive"],
    wave: 13,
  release: "microsites-2026-10-04",
    animated: false,
    decorative: false,
    stage: "flow",
    palette: ["fg", "bg", "accent", "muted"],
    controls: {
        title: { type: "textarea", rows: 3 },
        artist: { type: "string" },
        deck: { type: "textarea", rows: 3 },
        essay: { type: "textarea", rows: 3 },
    },
    interactions: [
        [{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "nav a" }],
        [{ step: "click", selector: "summary" }, { step: "expectAttr", selector: "details", name: "open", value: "" }],
    ],
    original: true,
    credits: [],
};
