import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  "slug": "oral-history",
  "title": "Oral History",
  "category": "sections",
  "description": "An interview transcript with alternating speaker labels, a spanning pullquote and a chapter index.",
  "tags": [
    "editorial",
    "oral-history",
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
    "title": {
      "type": "textarea",
      "rows": 3
    },
    "subject": {
      "type": "string"
    },
    "introduction": {
      "type": "textarea",
      "rows": 3
    },
    "quote": {
      "type": "textarea",
      "rows": 3
    },
    "chapters": {
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
