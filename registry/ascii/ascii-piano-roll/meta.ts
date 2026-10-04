import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-piano-roll",
  title: "ASCII Piano Roll",
  category: "ascii",
  description: "Supplied notes align by pitch and beat on a monospace grid, with duration-sized bars and accessible controlled selection.",
  tags: ["music", "notes", "piano-roll", "selection", "glyph-grid"],
  facets: ["static", "interactive", "chart"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  palette: ["fg", "bg", "muted", "accent"],
  controlled: { value: "valueChange" },
  controls: {
    notes: { type: "json" },
    beats: { type: "number", min: 1, max: 32, step: 1 },
    pitches: { type: "json" },
    defaultValue: { type: "string" },
    cellsPerBeat: { type: "number", min: 2, max: 12, step: 1 },
    label: { type: "string" },
    fontSize: { type: "number", min: 10, max: 24, step: 1 },
  },
  interactions: [
    [
      { step: "click", selector: "[data-note-id='lead-2']" },
      { step: "expectEvent", name: "valueChange", detail: "lead-2" },
      { step: "expectEvent", name: "noteSelect", detail: { id: "lead-2", pitch: "A4", start: 1.5, duration: 0.5, index: 1 } },
      { step: "expectAttr", selector: "[data-note-id='lead-2']", name: "aria-pressed", value: "true" },
      { step: "press", key: "ArrowRight" },
      { step: "expectFocus", selector: "[data-note-id='lead-3']" },
      { step: "expectAttr", selector: "[data-note-id='lead-3']", name: "aria-pressed", value: "true" },
    ],
  ],
  credits: [],
  original: true,
};
