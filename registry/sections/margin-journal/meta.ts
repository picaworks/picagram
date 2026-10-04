import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  "slug": "margin-journal",
  "title": "Margin Journal",
  "category": "sections",
  "description": "An essay publication with a narrow marginalia column, a large initial and linked endnotes.",
  "tags": [
    "editorial",
    "margin-journal",
    "publication",
    "page"
  ],
  "facets": [
    "static",
    "text",
    "interactive"
  ],
  wave: 13,
  release: "microsites-2026-10-04",
  "animated": false,
  "decorative": false,
  "stage": "flow",
  "palette": [
    "fg",
    "bg",
    "accent",
    "muted"
  ],
  "controls": {
    "publication": {
      "type": "string"
    },
    "issue": {
      "type": "string"
    },
    "title": {
      "type": "textarea",
      "rows": 3
    },
    "deck": {
      "type": "textarea",
      "rows": 3
    },
    "author": {
      "type": "string"
    },
    "paragraphs": {
      "type": "json"
    },
    "notes": {
      "type": "json"
    }
  },
  "original": true,
  "credits": [],
  "interactions": [
    [
      {
        "step": "press",
        "key": "Tab"
      },
      {
        "step": "expectFocus",
        "selector": "a"
      }
    ],
    [
      {
        "step": "click",
        "selector": "summary"
      },
      {
        "step": "expectAttr",
        "selector": "details",
        "name": "open",
        "value": ""
      }
    ]
  ]
};
