import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "switch",
  title: "Switch",
  category: "ui",
  description: "An accessible on and off switch with a visible label and optional state value.",
  tags: ["switch", "toggle", "form", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  palette: ["fg", "muted", "accent"],
  controlled: { checked: "checkedChange" },
  demo: { props: { defaultChecked: true } },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "[role=\"switch\"]" },
      { step: "press", key: "Space" },
      { step: "expectEvent", name: "checkedChange", detail: false },
      { step: "press", key: "Space" },
      { step: "expectEvent", name: "checkedChange", detail: true },
      { step: "expectAttr", selector: "[role=\"switch\"]", name: "aria-checked", value: "true" },
    ],
    [
      { step: "click", selector: "[role=\"switch\"]" },
      { step: "expectEvent", name: "checkedChange", detail: false },
      { step: "expectAttr", selector: "[role=\"switch\"]", name: "aria-checked", value: "false" },
    ],
    [{ step: "hover", selector: "[data-pica-thumb]" }],
  ],
  controls: {
    defaultChecked: { type: "boolean" },
    label: { type: "string" },
    showState: { type: "boolean" },
    disabled: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Switch pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/switch/",
      license: "W3C document",
    },
  ],
};
