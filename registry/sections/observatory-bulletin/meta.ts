import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
    slug: "observatory-bulletin",
    title: "Observatory Bulletin",
    category: "sections",
    description: "An astronomical field bulletin with an original sky diagram, observing table, equipment notes, and a log disclosure.",
    tags: ["publication", "one-page", "observatory-bulletin"],
    facets: ["static", "text", "interactive"],
    wave: 13,
  release: "microsites-2026-10-04",
    animated: false,
    decorative: false,
    stage: "flow",
    palette: ["fg", "bg", "accent", "muted"],
    controls: {
        title: { type: "textarea", rows: 3 },
        station: { type: "string" },
        issue: { type: "string" },
        note: { type: "textarea", rows: 3 },
    },
    interactions: [
        [{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "nav a" }],
        [{ step: "click", selector: "summary" }, { step: "expectAttr", selector: "details", name: "open", value: "" }],
    ],
    original: true,
    credits: [],
};
