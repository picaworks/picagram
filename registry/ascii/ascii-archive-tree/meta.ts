import type { Meta } from "../../../lib/meta";
export const meta = {
  "slug": "ascii-archive-tree",
  "title": "Archive tree",
  "category": "ascii",
  "description": "An expandable archival finding aid with character branch prefixes and editable collection metadata.",
  "tags": [
    "asset",
    "archive",
    "tree"
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
    "reference": {
      "type": "string"
    },
    "scopeNote": {
      "type": "string"
    },
    "series": {
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
        "selector": "details:nth-of-type(2) summary"
      },
      {
        "step": "expectAttr",
        "selector": "details:nth-of-type(2)",
        "name": "open",
        "value": ""
      }
    ]
  ]
} satisfies Meta;
