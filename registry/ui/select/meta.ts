import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "select",
  title: "Select",
  category: "ui",
  description: "A single-choice select with a keyboard-driven listbox, styled after the WAI-ARIA select-only combobox pattern.",
  tags: ["select", "combobox", "dropdown", "listbox", "form"],
  wave: 3,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  palette: ["fg", "accent"],
  controlled: { value: "valueChange" },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "" },
      { step: "press", key: "Enter" },
      { step: "press", key: "ArrowDown" },
      { step: "press", key: "Enter" },
      { step: "expectEvent", name: "valueChange", detail: "dither" },
      { step: "expectAttr", selector: "", name: "aria-expanded", value: "false" },
    ],
  ],
  controls: {
    options: { type: "json" },
    defaultValue: { type: "string" },
    placeholder: { type: "string" },
    label: { type: "string" },
    disabled: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Select-only combobox example",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/",
      license: "W3C document",
    },
    {
      relation: "technique",
      title: "Popover API",
      author: "MDN",
      url: "https://developer.mozilla.org/en-US/docs/Web/API/Popover_API",
      license: "CC-BY-SA documentation",
    },
  ],
};
