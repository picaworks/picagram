import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "tabs",
  title: "Tabs",
  category: "ui",
  description: "A tabbed view for switching between panels, with the active tab following keyboard focus.",
  tags: ["tabs", "navigation", "panels", "ui"],
  wave: 3,
  animated: false,
  decorative: false,
  wraps: "panels",
  palette: ["fg", "accent"],
  controlled: { value: "valueChange" },
  demo: {
    children:
      "<section><h2>Overview</h2><p>A tabbed view for switching between related panels without leaving the page.</p></section><section><h2>Props</h2><p>Pass tabs, value, and defaultValue as plain data. Every other look follows the palette.</p></section><section><h2>Install</h2><p>Copy the component from the catalog, or run the shadcn command from its page.</p></section>",
  },
  interactions: [
    [
      { step: "press", key: "Tab" },
      { step: "press", key: "ArrowRight" },
      { step: "expectEvent", name: "valueChange", detail: "props" },
      { step: "expectAttr", selector: '[role="tab"]:nth-of-type(2)', name: "aria-selected", value: "true" },
    ],
  ],
  controls: {
    tabs: { type: "json" },
    defaultValue: { type: "string" },
    label: { type: "string" },
  },
  credits: [
    {
      relation: "technique",
      title: "Tabs pattern",
      author: "W3C WAI-ARIA Authoring Practices Guide",
      url: "https://www.w3.org/WAI/ARIA/apg/patterns/tabs/",
      license: "W3C document",
    },
  ],
};
