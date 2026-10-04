import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "moire-interference", title: "Moire Interference", category: "effects",
  description: "Two sparse line screens create broad slowly drifting interference bands at the page edges.",
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
  demo: { children: "<article data-demo-copy><p>OPTICAL NOTEBOOK / SCREENS</p><h2>Two screens, one observation.</h2><p>A collection of measured line spacing, phase offsets and repeat tests for quiet printed interference.</p><details><summary>Read the screen notebook</summary><p>Screen notebook M04 compares two 13 mm line pitches with a small angular offset. Record the broad repeat before changing phase or narrowing the line spacing.</p></details></article>" },
};
