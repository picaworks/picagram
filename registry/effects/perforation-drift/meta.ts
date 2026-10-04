import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "perforation-drift", title: "Perforation Drift", category: "effects",
  description: "Paired punched film perforations travel quietly along continuous margin rails.",
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
  demo: { children: "<article data-demo-copy><p>MOVING IMAGE / PRESERVATION</p><h2>Keep the original record.</h2><p>Explore the film inventory, condition reports and repair decisions that guide this season of archival transfers.</p><details><summary>Browse the film inventory</summary><p>Inventory F12 contains three 16 mm reels. Inspect the perforations for edge tears and document each repair before a preservation transfer.</p></details></article>" },
};
