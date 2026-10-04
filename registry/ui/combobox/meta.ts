import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "combobox",
  title: "Combobox",
  category: "ui",
  description: "An editable field filters a listbox while preserving typed text during suggestion navigation.",
  tags: ["combobox", "listbox", "search", "form", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  palette: ["fg", "accent", "muted"],
  controlled: { value: "valueChange" },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "press", key: "d" },
      { step: "press", key: "ArrowDown" },
      { step: "press", key: "Enter" },
      { step: "expectEvent", name: "valueChange", detail: "dither-field" },
    ],
  ],
  controls: {
    options: { type: "json" },
    defaultValue: { type: "string" },
    placeholder: { type: "string" },
    emptyText: { type: "string" },
    label: { type: "string" },
    disabled: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Combobox pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/combobox/",
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
