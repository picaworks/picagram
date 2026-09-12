import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "popover-tooltip",
  title: "Popover Tooltip",
  category: "ui",
  description: "A trigger button that shows a tooltip on hover and focus, or toggles a popover panel on click, built on the Popover API.",
  tags: ["tooltip", "popover", "disclosure", "overlay"],
  facets: ["static", "overlay", "interactive"],
  wave: 3,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  palette: ["fg"],
  demo: { props: { defaultOpen: true } },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "press", key: "Escape" },
      { step: "expectEvent", name: "openChange", detail: false },
    ],
  ],
  controlled: { open: "openChange" },
  controls: {
    kind: { type: "select", options: ["tooltip", "popover"] },
    content: { type: "textarea", rows: 3 },
    triggerLabel: { type: "string" },
    placement: { type: "select", options: ["top", "bottom", "start", "end"] },
    delay: { type: "number", min: 0, max: 1500, step: 50 },
    defaultOpen: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Tooltip pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/",
      license: "W3C document",
    },
    {
      relation: "technique",
      title: "Disclosure pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/",
      license: "W3C document",
    },
  ],
};
