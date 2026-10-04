import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "sliding-apertures", title: "Sliding Apertures", category: "effects",
  description: "Offset rectangular apertures slide across a fixed geometric line plate in the margins.",
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
  demo: { children: "<article data-demo-copy><p>STUDIO / WINDOW STUDIES</p><h2>Frame the useful detail.</h2><p>A notebook of aperture proportions, printed line plates and observations from the workshop bench.</p><details><summary>Explore the studies</summary><p>Study W05 compares four window proportions over the same line plate. Keep the plate fixed and record which aperture preserves the most useful edge detail.</p></details></article>" },
};
