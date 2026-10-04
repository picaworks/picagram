import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
  "slug": "ascii-library-catalog",
  "title": "ASCII Library Catalog",
  "category": "ascii",
  "description": "A reading collection with a character bookshelf, selectable catalogue rows, useful book notes and a curated reading route.",
  "tags": [
    "ascii",
    "page",
    "layout",
    "library-catalog"
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
    "books": {
      "type": "json"
    }
  },
  "original": true,
  "credits": [],
  "interactions": [
    [
      {
        "step": "click",
        "selector": "button:nth-child(2)"
      },
      {
        "step": "expectEvent",
        "name": "selectionChange",
        "detail": 1
      },
      {
        "step": "expectAttr",
        "selector": "button:nth-child(2)",
        "name": "aria-pressed",
        "value": "true"
      }
    ],
    [
      {
        "step": "press",
        "key": "Tab"
      },
      {
        "step": "expectFocus",
        "selector": "button"
      },
      {
        "step": "press",
        "key": "Space"
      },
      {
        "step": "expectEvent",
        "name": "selectionChange",
        "detail": 0
      }
    ]
  ]
};
