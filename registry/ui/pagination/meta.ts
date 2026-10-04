import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pagination",
  title: "Pagination",
  category: "ui",
  description: "A compact navigation list that keeps nearby pages visible and folds distant ranges into quiet ellipses.",
  tags: ["pagination", "navigation", "pages", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "inline",
  controlled: { page: "pageChange" },
  palette: ["fg", "muted", "accent"],
  interactions: [
    [
      { step: "click", selector: "[data-pica-link][aria-label=\"Next page\"]" },
      { step: "expectEvent", name: "pageChange", detail: 5 },
      { step: "expectAttr", selector: "[data-pica-page=\"5\"]", name: "aria-current", value: "page" },
    ],
    [
      { step: "hover", selector: "a[data-pica-page=\"3\"]" },
      { step: "click", selector: "a[data-pica-page=\"3\"]" },
      { step: "expectEvent", name: "pageChange", detail: 3 },
    ],
  ],
  controls: {
    defaultPage: { type: "number", min: 1, max: 99, step: 1 },
    pages: { type: "number", min: 2, max: 99, step: 1 },
    siblings: { type: "number", min: 0, max: 3, step: 1 },
    base: { type: "string" },
    label: { type: "string" },
  },
  original: true,
  credits: [],
};
