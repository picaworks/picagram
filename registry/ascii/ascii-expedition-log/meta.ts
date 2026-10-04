import type { Meta } from "../../../lib/meta";
export const meta = {
  "slug": "ascii-expedition-log",
  "title": "Expedition log",
  "category": "ascii",
  "description": "An expedition dossier with an elevation transect, field observations and a working supply checklist.",
  "tags": [
    "layout",
    "expedition",
    "field-log"
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
  "controls": {
    "title": {
      "type": "string"
    },
    "intro": {
      "type": "string"
    },
    "logs": {
      "type": "json"
    },
    "supplies": {
      "type": "json"
    }
  },
  "credits": [],
  "original": true,
  "palette": [
    "fg",
    "bg",
    "accent",
    "muted"
  ],
  "stage": "flow",
  "interactions": [
    [
      {
        "step": "click",
        "selector": "details summary"
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
        "step": "click",
        "selector": "input[type=\"checkbox\"]"
      },
      {
        "step": "press",
        "key": "Space"
      }
    ]
  ]
} satisfies Meta;
