import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
    slug: "conservation-report",
    title: "Conservation Report",
    category: "sections",
    description: "A restoration case study with a condition elevation, paired intervention drawings, an evidence table, and a treatment timeline.",
    tags: ["publication", "one-page", "conservation-report"],
    facets: ["static", "text", "interactive"],
    wave: 13,
  release: "microsites-2026-10-04",
    animated: false,
    decorative: false,
    stage: "flow",
    palette: ["fg", "bg", "accent", "muted"],
    controls: {
        title: { type: "textarea", rows: 3 },
        site: { type: "string" },
        reference: { type: "string" },
        statement: { type: "textarea", rows: 3 },
    },
    interactions: [
        [{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "nav a" }],
        [{ step: "click", selector: "summary" }, { step: "expectAttr", selector: "details", name: "open", value: "" }],
    ],
    original: true,
    credits: [],
};
