import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "chord-diagram",
  title: "Chord Diagram",
  category: "data",
  description: "A directed relationship matrix becomes a ring of proportional ribbons with direct endpoint labels, group selection, and an accessible numeric matrix.",
  tags: ["chord", "matrix", "relationships", "ribbons", "braille", "svg", "data table", "keyboard"],
  facets: ["static", "chart", "interactive"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  original: true,
  controls: {
    matrix: { type: "json", label: "Relationship matrix" },
    labels: { type: "json", label: "Endpoint labels" },
    label: { type: "string", label: "Accessible chart name" },
    defaultValue: { type: "number", min: -1, max: 23, step: 1, label: "Initial selected group" },
    look: { type: "select", options: ["glyph", "svg"] },
  },
  palette: ["fg", "bg", "accent", "muted"],
  controlled: { value: "valueChange" },
  interactions: [[
    { step: "click", selector: "" },
    { step: "expectFocus", selector: "" },
    { step: "press", key: "Home" },
    { step: "expectEvent", name: "valueChange", detail: 0 },
    { step: "press", key: "ArrowRight" },
    { step: "expectEvent", name: "valueChange", detail: 1 },
  ]],
  credits: [],
};
