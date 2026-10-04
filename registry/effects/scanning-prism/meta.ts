import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "scanning-prism", title: "Scanning Prism", category: "effects",
  description: "An offset triangular prism translates diagonal hatch into quiet parallel optical strands.",
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
  demo: { children: "<article data-demo-copy><p>OPTICS LAB / STUDY 09</p><h2>Trace a change in direction.</h2><p>Inspect geometric light paths, prism dimensions and the observation notes from a small optical bench.</p><details><summary>Explore the optical study</summary><p>Optical study O09 keeps the incoming hatch fixed while the prism traverses a short path. Record the direction of the parallel exit strands at three positions.</p></details></article>" },
};
