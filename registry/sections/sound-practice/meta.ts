import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "sound-practice",
  title: "Sound practice",
  category: "sections",
  description: "A sound designer portfolio with original waveform scores, project timelines, and listening annotations.",
  tags: ["portfolio", "one-page", "sound-practice"],
  facets: ["static", "text", "interactive"],
  wave: 13,
  release: "microsites-2026-10-04",
  animated: false,
  decorative: false,
  stage: "flow",
  palette: ["fg", "bg", "accent", "muted"],
  controls: {
  "artist": {
    "type": "string"
  },
  "intro": {
    "type": "textarea",
    "rows": 3
  },
  "projects": {
    "type": "json"
  },
  "approach": {
    "type": "textarea",
    "rows": 4
  },
  "services": {
    "type": "json"
  },
  "contact": {
    "type": "textarea",
    "rows": 3
  }
},
  interactions: [
    [{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }],
    [
      { step: "click", selector: "summary" },
      { step: "expectAttr", selector: "details", name: "open", value: "" },
      { step: "press", key: "Enter" },
      { step: "expectAttr", selector: "details", name: "open", value: null },
    ],
  ],
  original: true,
  credits: [],
};
