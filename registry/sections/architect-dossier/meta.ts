import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "architect-dossier",
  title: "Architect dossier",
  category: "sections",
  description: "An architectural project dossier with original plan drawings, marginal specifications, and design notes.",
  tags: ["portfolio", "one-page", "architect-dossier"],
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
  "subtitle": {
    "type": "string"
  },
  "concept": {
    "type": "textarea",
    "rows": 4
  },
  "facts": {
    "type": "json"
  },
  "materials": {
    "type": "textarea",
    "rows": 3
  },
  "environment": {
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
