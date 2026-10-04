import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ascii-exhibition-map",
  title: "ASCII Exhibition Map",
  category: "ascii",
  description: "A floor plan drawn in box-drawing glyphs from room rectangles and doors, with a route-ordered room list that selects and fills one room.",
  tags: ["ascii", "floor plan", "map", "box drawing", "selection"],
  facets: ["static", "text", "interactive"],
  wave: 14,
  release: "ascii-motion-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "muted", "accent"],
  controlled: { value: "valueChange" },
  controls: {
    label: { type: "string" },
    plan: { type: "json" },
    rooms: { type: "json" },
  },
  original: true,
  credits: [],
  interactions: [
    [
      { step: "click", selector: "[data-part=rooms] li:nth-child(2) button" },
      { step: "expectEvent", name: "valueChange", detail: 1 },
      { step: "expectAttr", selector: "[data-part=rooms] li:nth-child(2) button", name: "aria-pressed", value: "true" },
      { step: "expectAttr", selector: "[data-part=plan]", name: "data-selected", value: "1" },
    ],
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "[data-part=rooms] button" },
      { step: "press", key: "Space" },
      { step: "expectEvent", name: "valueChange", detail: 0 },
    ],
    [
      { step: "click", selector: '[data-room="2"]' },
      { step: "expectEvent", name: "valueChange", detail: 2 },
      { step: "expectAttr", selector: "[data-part=plan]", name: "data-selected", value: "2" },
      { step: "expectAttr", selector: "[data-part=rooms] li:nth-child(3) button", name: "aria-pressed", value: "true" },
    ],
  ],
};
