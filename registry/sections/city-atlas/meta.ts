import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  "slug": "city-atlas",
  "title": "City Atlas",
  "category": "sections",
  "description": "An urban publication with an original block map, address index and district narratives.",
  "tags": [
    "editorial",
    "city-atlas",
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
    "district": {
      "type": "textarea",
      "rows": 3
    },
    "introduction": {
      "type": "textarea",
      "rows": 3
    },
    "addresses": {
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
