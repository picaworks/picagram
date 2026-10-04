import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "table",
  title: "Table",
  category: "ui",
  description: "A semantic data table with tabular figures, quiet row rules, and optional three-state sorting.",
  tags: ["table", "data", "sort", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "flow",
  palette: ["fg", "muted", "accent"],
  interactions: [
    [
      { step: "click", selector: 'th[data-column="size"] button' },
      { step: "expectEvent", name: "sortChange", detail: { key: "size", direction: "asc" } },
      { step: "expectAttr", selector: 'th[data-column="size"]', name: "aria-sort", value: "ascending" },
    ],
  ],
  controls: {
    columns: { type: "json" },
    rows: { type: "json" },
    label: { type: "string" },
    sortable: { type: "boolean" },
    defaultSort: { type: "json" },
  },
  original: true,
  credits: [],
};
