import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
    slug: "homeward-voyage",
    title: "Homeward Voyage",
    category: "sections",
    description: "A five chapter coastal return narrative with an illustrated route, an intimate reading column, and voyage notes.",
    tags: ["editorial", "microsite", "cinematic", "homeward"],
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
