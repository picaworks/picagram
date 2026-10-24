import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "hero",
  title: "Hero",
  category: "sections",
  description: "A page hero that adds calls to action and a composed background behind a headline and copy.",
  tags: ["hero", "landing", "section", "cta", "background"],
  facets: ["animated", "interactive", "webgl"],
  wave: 3,
  animated: true,
  decorative: false,
  wraps: "content",
  stage: "flow",
  palette: ["fg", "accent"],
  demo: {
    children: "<article data-hero-content><p data-hero-kicker>PICAGRAM / COMPONENT LIBRARY</p><h1>Draw with less.</h1><p>Original components in text, pattern and motion. Choose a starting point, then make it your own.</p></article>",
  },
  interactions: [[{ step: "press", key: "Tab" }, { step: "expectFocus", selector: "a" }]],
  presets: [
    {
        "name": "Editorial mesh",
        "description": "A quiet mesh behind a clear left-aligned introduction.",
        "props": {
            "background": "mesh",
            "align": "start",
            "minHeight": 75,
            "intensity": 0.32
        }
    },
    {
        "name": "Centered introduction",
        "description": "A centered opening with restrained background strength.",
        "props": {
            "background": "mesh",
            "align": "center",
            "minHeight": 85,
            "intensity": 0.22
        }
    },
    {
        "name": "Text first",
        "description": "A compact introduction on a clear ground for uninterrupted reading.",
        "props": {
            "background": "none",
            "align": "start",
            "minHeight": 60,
            "intensity": 0.18
        }
    }
],
  controls: {
    background: { type: "select", options: ["mesh", "noise", "none"] },
    actions: { type: "json" },
    align: { type: "select", options: ["start", "center"] },
    minHeight: { type: "number", min: 30, max: 100, step: 5, label: "Min height (vh)" },
    intensity: { type: "number", min: 0, max: 1, step: 0.05 },
    paused: { type: "boolean" },
    seed: { type: "number", min: 0, max: 9999, step: 1 },
  },
  original: true,
  credits: [],
};
