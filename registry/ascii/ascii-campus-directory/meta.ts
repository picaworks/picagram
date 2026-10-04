import type { Meta } from "../../../lib/meta";
export const meta = {
  "slug": "ascii-campus-directory",
  "title": "Campus directory",
  "category": "ascii",
  "description": "A campus guide with a character site map, department selection and accessible visiting directions.",
  "tags": [
    "layout",
    "directory",
    "campus"
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
    "locations": {
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
        "selector": "button:nth-of-type(2)"
      },
      {
        "step": "expectAttr",
        "selector": "button:nth-of-type(2)",
        "name": "aria-pressed",
        "value": "true"
      },
      {
        "step": "expectAttr",
        "selector": "[data-location]",
        "name": "data-code",
        "value": "B"
      }
    ]
  ]
} satisfies Meta;
