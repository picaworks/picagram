import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "accordion",
  title: "Accordion",
  category: "ui",
  description: "A keyboard navigable set of labeled panels that can open one at a time or independently.",
  tags: ["accordion", "disclosure", "panels", "ui"],
  facets: ["static", "interactive"],
  wave: 6,
  animated: false,
  decorative: false,
  stage: "flow",
  wraps: "panels",
  controlled: { open: "openChange" },
  palette: ["fg", "accent"],
  demo: {
    children:
      "<section><p>Picagram draws text mode effects, patterns, controls, charts, and page sections.</p></section><section><p>A framework free core holds the behavior, while a thin wrapper connects it to React.</p></section><section><p>One source generates matching React and HTML files for the catalog.</p></section>",
  },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "press", key: "ArrowDown" },
      { step: "press", key: "Enter" },
      { step: "expectEvent", name: "openChange", detail: ["runtime"] },
      { step: "expectAttr", selector: "h3:nth-of-type(2) button", name: "aria-expanded", value: "true" },
    ],
  ],
  controls: {
    items: { type: "json" },
    defaultOpen: { type: "json" },
    multiple: { type: "boolean" },
  },
  credits: [
    {
      relation: "technique",
      title: "Accordion pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/accordion/",
      license: "W3C document",
    },
  ],
};
