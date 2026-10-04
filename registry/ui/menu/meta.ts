import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "menu",
  title: "Menu",
  category: "ui",
  description: "A native trigger opens a keyboard navigable popover menu and reports the chosen action.",
  tags: ["menu", "popover", "actions", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "button",
  stage: "inline",
  palette: ["fg", "accent", "muted"],
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "press", key: "ArrowDown" },
      { step: "press", key: "ArrowDown" },
      { step: "press", key: "Enter" },
      { step: "expectEvent", name: "select", detail: "rename" },
      { step: "expectAttr", selector: "", name: "aria-expanded", value: "false" },
    ],
    [{ step: "hover", selector: "" }],
  ],
  controls: {
    items: { type: "json" },
    label: { type: "string" },
    disabled: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Menu and menubar pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/menubar/",
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
