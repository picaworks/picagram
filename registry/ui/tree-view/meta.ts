import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "tree-view",
  title: "Tree View",
  category: "ui",
  description: "A keyboard navigable hierarchical tree with internal expansion and controllable selection.",
  tags: ["tree", "hierarchy", "navigation", "control", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  host: "div",
  stage: "flow",
  controlled: { value: "valueChange" },
  palette: ["fg", "muted", "accent"],
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "expectFocus", selector: "[data-node-id=components]" },
      { step: "press", key: "ArrowRight" },
      { step: "press", key: "ArrowDown" },
      { step: "press", key: "Enter" },
      { step: "expectEvent", name: "valueChange", detail: "dither" },
      { step: "expectAttr", selector: "[data-node-id=dither]", name: "aria-selected", value: "true" },
    ],
    [{ step: "hover", selector: "[data-pica-row]" }],
  ],
  controls: {
    nodes: { type: "json" },
    expanded: { type: "json" },
    label: { type: "string" },
    defaultValue: { type: "string" },
  },
  credits: [
    {
      relation: "technique",
      title: "Tree view pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/treeview/",
      license: "W3C document",
    },
  ],
};
