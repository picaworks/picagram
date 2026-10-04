import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "checkbox",
  title: "Checkbox",
  category: "ui",
  description: "A hairline checkbox with checked, unchecked, and mixed states for pointer and keyboard input.",
  tags: ["checkbox", "form", "selection", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  palette: ["fg", "accent"],
  controlled: { checked: "checkedChange" },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "" },
      { step: "press", key: "Space" },
      { step: "expectEvent", name: "checkedChange", detail: "unchecked" },
      { step: "expectAttr", selector: "", name: "aria-checked", value: "false" },
    ],
    [{ step: "hover", selector: "[data-pica-box]" }],
  ],
  controls: {
    defaultChecked: { type: "boolean" },
    label: { type: "string" },
    disabled: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Checkbox pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/",
      license: "W3C document",
    },
  ],
};
