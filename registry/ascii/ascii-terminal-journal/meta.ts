import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
  "slug": "ascii-terminal-journal",
  "title": "ASCII Terminal Journal",
  "category": "ascii",
  "description": "An authored reading page with a text mode masthead, chapter links, margin observations and a field note prompt.",
  "tags": [
    "ascii",
    "page",
    "layout",
    "terminal-journal"
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
    "byline": {
      "type": "string"
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
