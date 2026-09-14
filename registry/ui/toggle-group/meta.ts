import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "toggle-group",
  title: "Toggle Group",
  category: "ui",
  description: "A toolbar of independent buttons that can each be pressed or released.",
  tags: ["toggle", "toolbar", "button", "control", "ui"],
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
      { step: "expectFocus", selector: "button:nth-of-type(1)" },
      { step: "press", key: "ArrowRight" },
      { step: "expectFocus", selector: "button:nth-of-type(2)" },
      { step: "press", key: "Space" },
      { step: "expectEvent", name: "valueChange", detail: ["grid", "snap"] },
      { step: "expectAttr", selector: "button:nth-of-type(2)", name: "aria-pressed", value: "true" },
    ],
    [{ step: "hover", selector: "button:nth-of-type(3)" }],
  ],
  controls: {
    options: { type: "json" },
    defaultValue: { type: "json" },
    label: { type: "string" },
    orientation: { type: "select", options: ["horizontal", "vertical"] },
  },
  credits: [
    {
      relation: "technique",
      title: "Toolbar pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/",
      license: "W3C document",
    },
  ],
};
