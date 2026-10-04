import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "cylinder-roll", title: "Cylinder Roll", category: "effects",
  description: "Printed stripes turn through a cylindrical projection along the page margin.",
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
  demo: { children: "<article data-demo-copy><p>WORKSHOP / ROTARY PRESS</p><h2>The rhythm of a printed roll.</h2><p>Track stripe spacing, cylinder diameter and the proof sequence for a continuous pattern edition.</p><details><summary>View the press record</summary><p>Press record R06 pairs a 120 mm cylinder with a repeating stripe plate. Print a full revolution, mark the seam and compare spacing at the centre and edges.</p></details></article>" },
};
