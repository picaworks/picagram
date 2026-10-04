import type { Meta } from "../../../lib/meta";
export const meta = {
  "slug": "ascii-release-room",
  "title": "Release room",
  "category": "ascii",
  "description": "A software release page with a character branch graph, version selection and compatibility notes.",
  "tags": [
    "layout",
    "software",
    "releases"
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
    "versions": {
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
        "step": "press",
        "key": "Tab"
      },
      {
        "step": "expectFocus",
        "selector": "input[type=\"radio\"]"
      },
      {
        "step": "press",
        "key": "ArrowRight"
      },
      {
        "step": "expectAttr",
        "selector": "[data-release]",
        "name": "data-version",
        "value": "2.3.1"
      }
    ],
    [
      {
        "step": "click",
        "selector": "fieldset label:nth-of-type(3) input"
      },
      {
        "step": "expectAttr",
        "selector": "[data-release]",
        "name": "data-version",
        "value": "1.9.8"
      }
    ]
  ]
} satisfies Meta;
