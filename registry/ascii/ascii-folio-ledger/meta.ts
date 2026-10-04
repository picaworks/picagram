import type { Meta } from "../../../lib/meta";
export const meta: Meta = {
  "slug": "ascii-folio-ledger",
  "title": "ASCII Folio Ledger",
  "category": "ascii",
  "description": "A portfolio ledger with a character index, open project register, case disclosures and a practical contact brief.",
  "tags": [
    "ascii",
    "page",
    "layout",
    "folio-ledger"
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
    "introduction": {
      "type": "string"
    },
    "email": {
      "type": "string"
    },
    "projects": {
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
