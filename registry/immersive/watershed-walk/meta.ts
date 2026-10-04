import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  "slug": "watershed-walk",
  "title": "Watershed walk",
  "category": "immersive",
  "description": "A watershed section with connected field stations, supplied observations and a linear walking route.",
  "tags": [
    "navigation",
    "station",
    "scene",
    "original"
  ],
  "facets": [
    "animated",
    "interactive",
    "canvas"
  ],
  "wave": 14,
  "release": "ascii-motion-2026-10-04",
  "animated": true,
  "decorative": false,
  "stage": "flow",
  "original": true,
  "credits": [],
  "palette": [
    "fg",
    "bg",
    "accent",
    "muted"
  ],
  "controls": {
    "title": {
      "type": "string"
    },
    "introduction": {
      "type": "textarea",
      "rows": 3
    },
    "stations": {
      "type": "json"
    },
    "fps": {
      "type": "number",
      "min": 1,
      "max": 30,
      "step": 1
    },
    "paused": {
      "type": "boolean"
    }
  },
  "interactions": [
    [
      {
        "step": "click",
        "selector": "[data-action=\"enter\"]"
      },
      {
        "step": "expectAttr",
        "selector": "[data-part=\"page\"]",
        "name": "data-view",
        "value": "overview"
      },
      {
        "step": "expectFocus",
        "selector": "[data-part=\"markers\"] [data-index=\"0\"]"
      },
      {
        "step": "press",
        "key": "Enter"
      },
      {
        "step": "expectAttr",
        "selector": "[data-part=\"page\"]",
        "name": "data-view",
        "value": "detail"
      },
      {
        "step": "expectFocus",
        "selector": "[data-part=\"detail-title\"]"
      },
      {
        "step": "click",
        "selector": "[data-action=\"next\"]"
      },
      {
        "step": "expectAttr",
        "selector": "[data-part=\"markers\"] [data-index=\"1\"]",
        "name": "aria-pressed",
        "value": "true"
      },
      {
        "step": "press",
        "key": "Escape"
      },
      {
        "step": "expectAttr",
        "selector": "[data-part=\"page\"]",
        "name": "data-view",
        "value": "overview"
      },
      {
        "step": "press",
        "key": "Escape"
      },
      {
        "step": "expectFocus",
        "selector": "[data-action=\"enter\"]"
      }
    ],
    [
      {
        "step": "click",
        "selector": "[data-part=\"register\"] [data-index=\"2\"]"
      },
      {
        "step": "expectAttr",
        "selector": "[data-part=\"page\"]",
        "name": "data-view",
        "value": "detail"
      },
      {
        "step": "click",
        "selector": "[data-action=\"back\"]"
      },
      {
        "step": "expectFocus",
        "selector": "[data-part=\"markers\"] [data-index=\"2\"]"
      }
    ],
    [
      {
        "step": "click",
        "selector": "[data-action=\"pause\"]"
      },
      {
        "step": "expectAttr",
        "selector": "[data-action=\"pause\"]",
        "name": "aria-pressed",
        "value": "true"
      },
      {
        "step": "click",
        "selector": "[data-action=\"pause\"]"
      },
      {
        "step": "expectAttr",
        "selector": "[data-action=\"pause\"]",
        "name": "aria-pressed",
        "value": "false"
      }
    ]
  ]
};
