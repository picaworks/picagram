import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
  "slug": "ascii-observatory-console",
  "title": "ASCII Observatory Console",
  "category": "ascii",
  "description": "An observatory notebook with a character sky diagram, selectable observation records, a session ledger and instrument notes.",
  "tags": [
    "ascii",
    "page",
    "layout",
    "observatory-console"
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
    "sessions": {
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
        "selector": "summary"
      },
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
