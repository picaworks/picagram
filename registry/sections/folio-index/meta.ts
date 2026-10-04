import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "folio-index",
  title: "Folio index",
  category: "sections",
  description: "A designer portfolio with a numbered project index, project dossiers, and a practice statement.",
  tags: ["portfolio", "one-page", "folio-index"],
  facets: ["static", "text", "interactive"],
  wave: 13,
  release: "microsites-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  controls: {
  "name": {
    "type": "string"
  },
  "intro": {
    "type": "textarea",
    "rows": 3
  },
  "status": {
    "type": "string"
  },
  "projects": {
    "type": "json"
  },
  "practice": {
    "type": "textarea",
    "rows": 4
  },
  "contact": {
    "type": "textarea",
    "rows": 3
  }
},
  interactions: [[{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }]],
  original: true,
  credits: [],
};
