import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "segmented-control",
  title: "Segmented Control",
  category: "ui",
  description: "A single-choice radio group drawn as one ruled strip, with selection following keyboard focus.",
  tags: ["segmented control", "radio group", "choice", "form", "ui"],
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
      { step: "expectFocus", selector: '[role="radio"]:nth-of-type(1)' },
      { step: "press", key: "ArrowRight" },
      { step: "expectEvent", name: "valueChange", detail: "list" },
      { step: "expectAttr", selector: '[role="radio"]:nth-of-type(2)', name: "aria-checked", value: "true" },
    ],
    [
      { step: "click", selector: '[role="radio"]:nth-of-type(3)' },
      { step: "expectEvent", name: "valueChange", detail: "board" },
    ],
  ],
  controls: {
    options: { type: "json" },
    defaultValue: { type: "string" },
    label: { type: "string" },
    disabled: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Radio group pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/radio/",
      license: "W3C document",
    },
  ],
};
