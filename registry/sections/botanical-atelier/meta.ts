import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "botanical-atelier",
  title: "Botanical atelier",
  category: "sections",
  description: "A botanical portfolio arranged as an herbarium cabinet with original drawings, taxonomy, and field notes.",
  tags: ["portfolio", "one-page", "botanical-atelier"],
  facets: ["static", "text", "interactive"],
  wave: 13,
  release: "microsites-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  controls: {
  "studio": {
    "type": "string"
  },
  "title": {
    "type": "string"
  },
  "intro": {
    "type": "textarea",
    "rows": 3
  },
  "specimens": {
    "type": "json"
  },
  "method": {
    "type": "textarea",
    "rows": 4
  },
  "contact": {
    "type": "textarea",
    "rows": 3
  }
},
  interactions: [
    [{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }],
    [
      { step: "click", selector: "summary" },
      { step: "expectAttr", selector: "details", name: "open", value: "" },
      { step: "press", key: "Enter" },
      { step: "expectAttr", selector: "details", name: "open", value: null },
    ],
  ],
  original: true,
  credits: [],
};
