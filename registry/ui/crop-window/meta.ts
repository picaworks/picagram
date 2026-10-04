import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "crop-window",
  title: "Crop Window",
  category: "ui",
  description: "Four pointer and keyboard edges constrain a normalized crop over child content, with optional pixel aspect ratio and coordinate events.",
  tags: ["crop", "rectangle", "edges", "coordinates", "keyboard"],
  facets: ["static", "interactive"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  wraps: "content",
  palette: ["fg", "bg", "accent"],
  controlled: { value: "valueChange" },
  interactions: [[
    { step: "click", selector: "[data-part=\"edge-left\"]" },
    { step: "expectFocus", selector: "[data-part=\"edge-left\"]" },
    { step: "press", key: "ArrowRight" },
    { step: "expectEvent", name: "valueChange", detail: { left: 0.17, top: 0.18, right: 0.84, bottom: 0.82 } },
    { step: "press", key: "Tab" },
    { step: "expectFocus", selector: "[data-part=\"edge-top\"]" },
    { step: "press", key: "ArrowDown" },
    { step: "expectEvent", name: "valueChange", detail: { left: 0.17, top: 0.19, right: 0.84, bottom: 0.82 } },
  ]],
  controls: {
    defaultValue: { type: "json", label: "Initial normalized edges" },
    aspectRatio: { type: "number", min: 0.1, max: 4, step: 0.01, label: "Width/height ratio" },
    label: { type: "string" },
  },
  credits: [],
  original: true,
};
