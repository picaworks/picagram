import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "folded-light", title: "Folded Light", category: "effects",
  description: "Triangular crease planes carry a slow shifting illumination in the page margins.",
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
  demo: { children: "<article data-demo-copy><p>MATERIAL LIBRARY / PAPER</p><h2>Studies in folded surfaces.</h2><p>Record crease direction, sheet weight and the light each specimen carries before committing a fold to production.</p><details><summary>Open the specimen ledger</summary><p>Specimen P03 uses a mountain fold followed by a valley fold. Record grain direction and hold the sheet under a fixed lamp to compare crease shadows.</p></details></article>" },
};
