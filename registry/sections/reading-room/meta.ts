import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  "slug": "reading-room",
  "title": "Reading Room",
  "category": "sections",
  "description": "A quiet reading portal with a shelf index, long essay surface and annotated bibliography.",
  "tags": [
    "editorial",
    "reading-room",
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
    "introduction": {
      "type": "textarea",
      "rows": 3
    },
    "paragraphs": {
      "type": "json"
    },
    "books": {
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
