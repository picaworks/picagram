import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
    slug: "orbital-log",
    title: "Orbital Log",
    category: "sections",
    description: "A mission documentary with a circular orbital schematic, timestamped observation log, and mission notes.",
    tags: ["editorial", "microsite", "cinematic", "orbital"],
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
