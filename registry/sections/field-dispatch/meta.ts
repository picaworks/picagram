import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  "slug": "field-dispatch",
  "title": "Field Dispatch",
  "category": "sections",
  "description": "A travel dispatch with an original route diagram, dated telegrams and a field notebook.",
  "tags": [
    "editorial",
    "field-dispatch",
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
    "location": {
      "type": "string"
    },
    "introduction": {
      "type": "textarea",
      "rows": 3
    },
    "stops": {
      "type": "json"
    },
    "packing": {
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
