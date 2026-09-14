import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "radio-group",
  title: "Radio Group",
  category: "ui",
  description: "A single-choice group with square marks, roving focus, and selection that follows focus.",
  tags: ["radio", "choice", "form", "control", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "flow",
  controlled: { value: "valueChange" },
  palette: ["fg", "accent"],
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "[role=radio][data-pica-value=paper]" },
      { step: "press", key: "ArrowDown" },
      { step: "expectEvent", name: "valueChange", detail: "ink" },
      { step: "expectAttr", selector: "[role=radio][data-pica-value=ink]", name: "aria-checked", value: "true" },
    ],
    [
      { step: "click", selector: "[role=radio][data-pica-value=system]" },
      { step: "expectEvent", name: "valueChange", detail: "system" },
    ],
    [
      { step: "hover", selector: "[role=radio][data-pica-value=system]" },
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
