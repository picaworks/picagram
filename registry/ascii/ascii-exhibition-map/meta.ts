import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
  "slug": "ascii-exhibition-map",
  "title": "ASCII Exhibition Map",
  "category": "ascii",
  "description": "An exhibition guide with an aligned character floor plan, numbered room selection, practical access notes and a linear visiting route.",
  "tags": [
    "ascii",
    "page",
    "layout",
    "exhibition-map"
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
    "rooms": {
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
