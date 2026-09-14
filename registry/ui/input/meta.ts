import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "input",
  title: "Input",
  category: "ui",
  description: "A native text field with controlled and uncontrolled values, accessible labeling, and keyboard event reporting.",
  tags: ["input", "text field", "form", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  controlled: { value: "valueChange" },
  palette: ["fg", "muted"],
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "press", key: "m" },
      { step: "expectEvent", name: "valueChange", detail: "m" },
      { step: "press", key: "Enter" },
      { step: "expectEvent", name: "enter", detail: "m" },
    ],
    [{ step: "hover", selector: "input" }],
  ],
  controls: {
    defaultValue: { type: "string" },
    type: { type: "select", options: ["text", "email", "password", "search", "url"] },
    placeholder: { type: "string" },
    label: { type: "string" },
    disabled: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "The text input element",
      author: "MDN",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/text",
      license: "CC-BY-SA documentation",
    },
  ],
};
