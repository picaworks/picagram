import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ceramic-studio",
  title: "Ceramic studio",
  category: "sections",
  description: "A ceramic maker collection with original vessel drawings, process notes, and a kiln edition ledger.",
  tags: ["portfolio", "one-page", "ceramic-studio"],
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
  "collection": {
    "type": "string"
  },
  "intro": {
    "type": "textarea",
    "rows": 3
  },
  "pieces": {
    "type": "json"
  },
  "process": {
    "type": "json"
  },
  "care": {
    "type": "textarea",
    "rows": 3
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
