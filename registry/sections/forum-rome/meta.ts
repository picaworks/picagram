import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
    slug: "forum-rome",
    title: "Forum Rome",
    category: "sections",
    description: "A Roman civic exhibition with an architectural arch, excavation ledger, and visitor notes.",
    tags: ["editorial", "microsite", "cinematic", "forum"],
    facets: ["static", "text", "interactive"],
    wave: 13,
  release: "microsites-2026-10-04",
    animated: false,
    decorative: false,
    stage: "flow",
    palette: ["fg", "bg", "accent", "muted"],
    controls: {
        title: { type: "textarea", rows: 2 },
        description: { type: "textarea", rows: 3 },
        edition: { type: "string" },
    },
    interactions: [[
            { step: "click", selector: "[data-part=note-toggle]" },
            { step: "expectAttr", selector: "[data-part=note-toggle]", name: "aria-expanded", value: "true" },
            { step: "expectEvent", name: "reveal", detail: { expanded: true } },
            { step: "click", selector: "[data-part=note-toggle]" },
            { step: "expectAttr", selector: "[data-part=note-toggle]", name: "aria-expanded", value: "false" },
        ]],
    original: true,
    credits: [],
};
