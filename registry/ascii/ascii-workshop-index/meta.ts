import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
  "slug": "ascii-workshop-index",
  "title": "ASCII Workshop Index",
  "category": "ascii",
  "description": "An open workshop portfolio with character tool studies, a material register, a making sequence and a commission brief.",
  "tags": [
    "ascii",
    "page",
    "layout",
    "workshop-index"
  ],
  "facets": [
    "static",
    "text",
    "interactive"
  ],
  "wave": 14,
  "release": "ascii-motion-2026-10-04",
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
    "label": {
      "type": "string"
    },
    "title": {
      "type": "string"
    },
    "email": {
      "type": "string"
    },
    "materials": {
      "type": "json"
    }
  },
  "original": true,
  "credits": [],
  "interactions": [
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
    ],
    [
      {
        "step": "press",
        "key": "Tab"
      },
      {
        "step": "expectFocus",
        "selector": "a"
      }
    ]
  ]
};
