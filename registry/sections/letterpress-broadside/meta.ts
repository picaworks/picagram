import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
    slug: "letterpress-broadside",
    title: "Letterpress Broadside",
    category: "sections",
    description: "A public announcement composed as a typographic broadside with meeting details, an agenda, and print marks.",
    tags: ["publication", "one-page", "letterpress-broadside"],
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
        date: { type: "string" },
        place: { type: "string" },
    },
    interactions: [
        [{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "nav a" }],
        [{ step: "click", selector: "summary" }, { step: "expectAttr", selector: "details", name: "open", value: "" }],
    ],
    original: true,
    credits: [],
};
