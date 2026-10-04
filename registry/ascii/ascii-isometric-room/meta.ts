import type { Meta } from "../../../lib/meta";
export const meta = {
  "slug": "ascii-isometric-room",
  "title": "Isometric room",
  "category": "ascii",
  "description": "A fixed-cell character room elevation with a compact mobile plan, object selection and inventory facts.",
  "tags": [
    "asset",
    "room",
    "inventory"
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
    "roomNote": {
      "type": "string"
    },
    "objects": {
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
        "selector": "[data-object]",
        "name": "data-code",
        "value": "B"
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
