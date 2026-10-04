import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
    slug: "public-lecture",
    title: "Public Lecture",
    category: "sections",
    description: "A public lecture page with an annotated argument diagram, a thesis, a timed programme, and reservation information.",
    tags: ["publication", "one-page", "public-lecture"],
    facets: ["static", "text", "interactive"],
    wave: 13,
  release: "microsites-2026-10-04",
    animated: false,
    decorative: false,
    stage: "flow",
    palette: ["fg", "bg", "accent", "muted"],
    controls: {
        title: { type: "textarea", rows: 3 },
        speaker: { type: "string" },
        date: { type: "string" },
        thesis: { type: "textarea", rows: 3 },
    },
    interactions: [
        [{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "nav a" }],
        [{ step: "click", selector: "summary" }, { step: "expectAttr", selector: "details", name: "open", value: "" }],
    ],
    original: true,
    credits: [],
};
