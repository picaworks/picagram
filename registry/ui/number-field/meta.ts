import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "number-field",
  title: "Number Field",
  category: "ui",
  description: "A labelled numeric input with typed entry, keyboard stepping, and square decrement and increment controls.",
  tags: ["number", "spinbutton", "input", "form", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  palette: ["fg"],
  controlled: { value: "valueChange" },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "input" },
      { step: "press", key: "ArrowUp" },
      { step: "expectEvent", name: "valueChange", detail: 9 },
      { step: "expectAttr", selector: "input", name: "aria-valuenow", value: "9" },
    ],
    [
      { step: "click", selector: "[data-pica-increment]" },
      { step: "expectEvent", name: "valueChange", detail: 9 },
      { step: "expectAttr", selector: "input", name: "aria-valuenow", value: "9" },
    ],
    [{ step: "hover", selector: "[data-pica-increment]" }],
  ],
  controls: {
    defaultValue: { type: "number", min: -1024, max: 1024, step: 1 },
    min: { type: "number", min: -1024, max: 1024, step: 1 },
    max: { type: "number", min: -1024, max: 1024, step: 1 },
    step: { type: "number", min: 0.01, max: 64, step: 0.01 },
    largeStep: { type: "number", min: 0.01, max: 256, step: 0.01 },
    label: { type: "string" },
    disabled: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Spinbutton pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/",
      license: "W3C document",
    },
  ],
};
