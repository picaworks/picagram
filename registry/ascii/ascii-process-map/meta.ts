import type { Meta } from "../../../lib/meta";
export const meta = {
  "slug": "ascii-process-map",
  "title": "Process map",
  "category": "ascii",
  "description": "A reusable character decision map with editable steps and native choices that update the route summary.",
  "tags": [
    "asset",
    "diagram",
    "process"
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
    "start": {
      "type": "string"
    },
    "decision": {
      "type": "string"
    },
    "routes": {
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
        "selector": "[data-route]",
        "name": "data-route",
        "value": "1"
      },
      {
        "step": "expectAttr",
        "selector": "button:nth-of-type(2)",
        "name": "aria-pressed",
        "value": "true"
      }
    ]
  ]
} satisfies Meta;
