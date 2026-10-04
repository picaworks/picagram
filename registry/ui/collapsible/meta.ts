import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "collapsible",
  title: "Collapsible",
  category: "ui",
  description: "A native disclosure trigger that instantly shows or hides one block of page content.",
  tags: ["collapsible", "disclosure", "details", "toggle", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  stage: "flow",
  wraps: "panels",
  palette: ["fg", "accent"],
  controlled: { open: "openChange" },
  demo: {
    props: { defaultOpen: true },
    children: "<p>Supporting information stays close at hand without crowding the page.</p>",
  },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "press", key: "Enter" },
      { step: "expectEvent", name: "openChange", detail: false },
      { step: "expectAttr", selector: "button", name: "aria-expanded", value: "false" },
    ],
  ],
  controls: {
    defaultOpen: { type: "boolean" },
    label: { type: "string" },
  },
  credits: [
    {
      relation: "technique",
      title: "Disclosure pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/",
      license: "W3C document",
    },
  ],
};
