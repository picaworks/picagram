import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "breadcrumb",
  title: "Breadcrumb",
  category: "ui",
  description: "A hierarchy trail with native links, a distinct current page, and middle items that expand on demand.",
  tags: ["breadcrumb", "navigation", "hierarchy", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "muted"],
  interactions: [
    [
      { step: "click", selector: "[data-pica-ellipsis]" },
      { step: "expectAttr", selector: "[data-pica-ellipsis]", name: "aria-expanded", value: "true" },
    ],
  ],
  controls: {
    items: { type: "json" },
    maxItems: { type: "number", min: 3, max: 8, step: 1 },
    label: { type: "string" },
  },
  credits: [
    {
      relation: "technique",
      title: "Breadcrumb pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/",
      license: "W3C document",
    },
  ],
};
