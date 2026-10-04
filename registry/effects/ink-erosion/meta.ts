import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "ink-erosion", title: "Ink Erosion", category: "effects",
  description: "Geometric printed bands lose and regain small edge cells through a slow structured erosion front.",
  tags: ["material", "geometric", "motion"], facets: ["animated", "background", "interactive", "canvas"],
  wave: 14, release: "ascii-motion-2026-10-04", animated: true, decorative: true,
  wraps: "content", original: true, credits: [], palette: ["fg"],
  controls: {
    speed: { type: "number", min: 0.2, max: 2, step: 0.1 },
    opacity: { type: "number", min: 0.1, max: 0.65, step: 0.05 },
    scale: { type: "number", min: 0.6, max: 1.8, step: 0.1 },
    paused: { type: "boolean" }, seed: { type: "number", min: 1, max: 100, step: 1 },
  },
  interactions: [[
    { step: "click", selector: "[data-pica-pause]" },
    { step: "expectAttr", selector: "[data-pica-pause]", name: "aria-pressed", value: "true" },
    { step: "press", key: "Space" },
    { step: "expectAttr", selector: "[data-pica-pause]", name: "aria-pressed", value: "false" },
  ]],
  demo: { children: "<article data-demo-copy><p>CONSERVATION / PRINT SURVEY</p><h2>Follow the edges of a print.</h2><p>Document surface wear, handling history and repair priorities without losing the character of the original impression.</p><details><summary>Open the condition survey</summary><p>Condition survey C08 records wear at the upper and lower edges of each printed band. Retain a dated proof so gradual losses can be measured against the original.</p></details></article>" },
};
