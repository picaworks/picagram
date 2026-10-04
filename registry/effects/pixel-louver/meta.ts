import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "pixel-louver", title: "Pixel Louver", category: "effects",
  description: "A bounded grid of mechanical louvers changes projected width in a slow traveling phase.",
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
  demo: { children: "<article data-demo-copy><p>BUILDING STUDIES / SHADING</p><h2>Light, measured in sections.</h2><p>Compare screen spacing, projected shade and maintenance notes for the east facade study.</p><details><summary>Read the design record</summary><p>Facade study E02 uses equal blade spacing with alternating projected shade. Check the sight line from the reading area before choosing a maintenance interval.</p></details></article>" },
};
