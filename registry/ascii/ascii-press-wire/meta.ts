import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
  "slug": "ascii-press-wire",
  "title": "ASCII Press Wire",
  "category": "ascii",
  "description": "A local wire edition with a character teletype masthead, lead dispatch, timestamped reports and transparent corrections.",
  "tags": [
    "ascii",
    "page",
    "layout",
    "press-wire"
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
    "edition": {
      "type": "string"
    },
    "reports": {
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
