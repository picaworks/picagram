import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "textarea",
  title: "Textarea",
  category: "ui",
  description: "A labelled text field that grows with its content and reports every input.",
  tags: ["textarea", "form", "input", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "flow",
  palette: ["fg", "muted"],
  controlled: { value: "valueChange" },
  interactions: [
    [
      { step: "click", selector: "[data-pica-field]" },
      { step: "press", key: "ArrowDown" },
      { step: "press", key: "x" },
      {
        step: "expectEvent",
        name: "valueChange",
        detail: "Shipped the palette work today.\nTwo lines in already.x",
      },
    ],
  ],
  controls: {
    defaultValue: { type: "textarea", rows: 3 },
    label: { type: "string" },
    placeholder: { type: "string" },
    maxRows: { type: "number", min: 2, max: 16, step: 1 },
    max: { type: "number", min: 0, max: 1000, step: 1 },
    disabled: { type: "boolean" },
  },
  original: true,
  credits: [],
};
