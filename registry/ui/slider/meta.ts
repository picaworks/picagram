import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "slider",
  title: "Slider",
  category: "ui",
  description: "A labelled slider with stepped keyboard and pointer input in horizontal and vertical orientations.",
  tags: ["slider", "range", "value", "form", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  palette: ["fg", "accent"],
  controlled: { value: "valueChange" },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "[data-part=\"thumb\"]" },
      { step: "press", key: "ArrowRight" },
      { step: "expectEvent", name: "valueChange", detail: 31 },
      { step: "expectAttr", selector: "[data-part=\"thumb\"]", name: "aria-valuenow", value: "31" },
    ],
    [
      { step: "click", selector: "[data-part=\"track\"]" },
      { step: "expectEvent", name: "valueChange" },
    ],
    [{ step: "hover", selector: "[data-part=\"thumb\"]" }],
  ],
  controls: {
    defaultValue: { type: "number", min: 0, max: 100, step: 1 },
    min: { type: "number", min: -1000, max: 1000, step: 1 },
    max: { type: "number", min: -1000, max: 1000, step: 1 },
    step: { type: "number", min: 0.1, max: 100, step: 0.1 },
    largeStep: { type: "number", min: 1, max: 100, step: 1 },
    orientation: { type: "select", options: ["horizontal", "vertical"] },
    label: { type: "string" },
    showValue: { type: "boolean" },
    height: { type: "number", min: 6, max: 30, step: 1 },
  },
  credits: [
    {
      relation: "technique",
      title: "Slider pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/slider/",
      license: "W3C document",
    },
  ],
};
