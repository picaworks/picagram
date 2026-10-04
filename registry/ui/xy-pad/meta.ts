import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "xy-pad",
  title: "XY pad",
  category: "ui",
  description: "A square two-axis pad with a crosshair, paired with numeric fields so both axes move by pointer and keyboard.",
  tags: ["xy-pad", "two-axis", "crosshair", "position", "form", "ui"],
  facets: ["static", "interactive"],
  wave: 15,
  release: "components-2026-10-04",
  animated: false,
  decorative: false,
  original: true,
  host: "div",
  stage: "inline",
  palette: ["fg", "accent", "muted"],
  controlled: { value: "valueChange" },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "[data-part=\"x\"]" },
      { step: "press", key: "ArrowUp" },
      { step: "expectEvent", name: "valueChange", detail: [41, -60] },
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "[data-part=\"y\"]" },
      { step: "press", key: "ArrowDown" },
      { step: "expectEvent", name: "valueChange", detail: [41, -61] },
    ],
    [
      { step: "click", selector: "[data-part=\"pad\"]" },
      { step: "expectEvent", name: "valueChange" },
    ],
    [{ step: "hover", selector: "[data-part=\"thumb\"]" }],
  ],
  controls: {
    defaultValue: { type: "numbers", label: "Start (x, y)" },
    bounds: { type: "numbers", label: "Bounds (xMin, xMax, yMin, yMax)" },
    step: { type: "number", min: 0.001, max: 100, step: 0.001 },
    label: { type: "string" },
    axes: { type: "json", label: "Axis names" },
    size: { type: "number", min: 8, max: 32, step: 1 },
  },
  credits: [],
  demo: {
    props: {
      label: "Offset",
      bounds: [-100, 100, -100, 100],
      defaultValue: [40, -60],
    },
  },
};
