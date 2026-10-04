import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "magnetic-filings", title: "Magnetic Filings", category: "effects",
  description: "Short filings align with a moving dipole field in the margins of a protected reading area.",
  tags: ["geometry", "field", "canvas", "reading"], facets: ["animated", "overlay", "interactive", "canvas"],
  wave: 14, release: "ascii-motion-2026-10-04", animated: true, decorative: false, wraps: "content",
  palette: ["fg", "accent"],
  controls: {
    pitch: { type: "number", min: 20, max: 48, step: 1 },
    period: { type: "number", min: 12, max: 60, step: 1, label: "Traversal (s)" },
    opacity: { type: "number", min: .1, max: .6, step: .01 },
    fps: { type: "number", min: 12, max: 24, step: 1 },
    paused: { type: "boolean" },
    showPause: { type: "boolean", label: "Pause control" },
  },
  demo: { children: "<article class=\"field-note\"><p class=\"field-index\">Dipole / 03 \u00b7 Field study</p><h2>Lines of attraction</h2><p>A pair of slowly moving sources aligns short filings. The source geometry gives each mark a reason to turn.</p><details><summary>Read the field note</summary><p>Field direction sums opposite inverse square sources; filings are capped to a fixed lattice.</p></details></article>" },
  interactions: [[
    { step: "click", selector: "[data-pica-pause]" },
    { step: "expectAttr", selector: "[data-pica-pause]", name: "aria-pressed", value: "true" },
    { step: "expectFocus", selector: "[data-pica-pause]" },
    { step: "press", key: "Enter" },
    { step: "expectAttr", selector: "[data-pica-pause]", name: "aria-pressed", value: "false" },
    { step: "press", key: "Space" },
    { step: "expectAttr", selector: "[data-pica-pause]", name: "aria-pressed", value: "true" },
  ]],
  original: true, credits: [],
};
