import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "type-foundry",
  title: "Type foundry",
  category: "sections",
  description: "A type specimen page with a giant glyph, alphabet and size studies, and specimen licensing notes.",
  tags: ["portfolio", "one-page", "type-foundry"],
  facets: ["static", "text", "interactive"],
  wave: 13,
  release: "microsites-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  controls: {
  "foundry": {
    "type": "string"
  },
  "name": {
    "type": "string"
  },
  "glyph": {
    "type": "string"
  },
  "intro": {
    "type": "textarea",
    "rows": 3
  },
  "alphabet": {
    "type": "textarea",
    "rows": 2
  },
  "numerals": {
    "type": "string"
  },
  "phrase": {
    "type": "string"
  },
  "features": {
    "type": "json"
  },
  "license": {
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
