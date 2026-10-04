import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "print-registration", title: "Print Registration", category: "effects",
  description: "Registration crosses and a slowly rotating alignment target describe two offset printed layers.",
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
  demo: { children: "<article data-demo-copy><p>PRODUCTION / PROOF 04</p><h2>Every layer in alignment.</h2><p>Review plate offsets, registration tolerances and final proof notes for the quarterly field journal.</p><details><summary>Read the proof notes</summary><p>Proof 04 keeps the registration tolerance within 0.25 mm. Compare the outer crosses before approving the text and line plates for the final run.</p></details></article>" },
};
