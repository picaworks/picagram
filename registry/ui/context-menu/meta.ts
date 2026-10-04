import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "context-menu",
  title: "Context Menu",
  category: "ui",
  description: "A framed content region with an accessible action menu at the pointer or keyboard anchor.",
  tags: ["context menu", "menu", "popover", "actions", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  stage: "flow",
  wraps: "content",
  palette: ["fg", "muted"],
  demo: { children: "<p>Review this draft and choose an action when you are ready.</p>" },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "press", key: "Shift+F10" },
      { step: "press", key: "ArrowDown" },
      { step: "press", key: "Enter" },
      { step: "expectEvent", name: "select", detail: "rename" },
    ],
  ],
  controls: {
    items: { type: "json" },
    hint: { type: "string" },
    label: { type: "string" },
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
