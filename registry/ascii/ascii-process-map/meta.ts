import type { Meta } from "../../../lib/meta";
export const meta = {
  "slug": "ascii-process-map",
  "title": "Process map",
  "category": "ascii",
  "description": "A decision flow drawn in box-drawing characters, with native choices that trace the selected route.",
  "tags": [
    "diagram",
    "flowchart",
    "process",
    "decision",
    "box-drawing"
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
    "label": {
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
    "muted",
    "accent"
  ],
  "stage": "flow",
  "controlled": {
    "value": "valueChange"
  },
  "interactions": [
    [
      {
        "step": "click",
        "selector": "[data-index='1']"
      },
      {
        "step": "expectEvent",
        "name": "valueChange",
        "detail": 1
      },
      {
        "step": "expectAttr",
        "selector": "[data-index='1']",
        "name": "aria-pressed",
        "value": "true"
      },
      {
        "step": "expectAttr",
        "selector": "[data-part='diagram']",
        "name": "data-selected",
        "value": "1"
      }
    ],
    [
      {
        "step": "press",
        "key": "Tab"
      },
      {
        "step": "expectFocus",
        "selector": "[data-index='0']"
      },
      {
        "step": "press",
        "key": "Space"
      },
      {
        "step": "expectEvent",
        "name": "valueChange",
        "detail": 0
      },
      {
        "step": "expectAttr",
        "selector": "[data-index='0']",
        "name": "aria-pressed",
        "value": "true"
      }
    ],
    [
      {
        "step": "click",
        "selector": "[data-route-index='2']"
      },
      {
        "step": "expectEvent",
        "name": "valueChange",
        "detail": 2
      },
      {
        "step": "expectAttr",
        "selector": "[data-part='diagram']",
        "name": "data-selected",
        "value": "2"
      }
    ]
  ]
} satisfies Meta;
