import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  "slug": "specimen-review",
  "title": "Specimen Review",
  "category": "sections",
  "description": "A science and culture review with an original specimen drawing, comparison table and numbered annotations.",
  "tags": [
    "editorial",
    "specimen-review",
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
    "subtitle": {
      "type": "string"
    },
    "specimen": {
      "type": "string"
    },
    "observations": {
      "type": "json"
    },
    "comparisons": {
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
