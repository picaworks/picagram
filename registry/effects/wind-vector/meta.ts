import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "wind-vector", title: "Wind Vector", category: "effects",
  description: "A sparse lattice of direction marks turns slowly through a smooth wind field around wrapped content.",
  tags: ["geometry", "field", "canvas", "reading"], facets: ["animated", "overlay", "interactive", "canvas"],
  wave: 14, release: "ascii-motion-2026-10-04", animated: true, decorative: false, wraps: "content",
  palette: ["fg", "accent"],
  controls: {
    pitch: { type: "number", min: 24, max: 64, step: 1 },
    period: { type: "number", min: 12, max: 60, step: 1, label: "Traversal (s)" },
    opacity: { type: "number", min: .1, max: .6, step: .01 },
    fps: { type: "number", min: 12, max: 24, step: 1 },
    paused: { type: "boolean" },
    showPause: { type: "boolean", label: "Pause control" },
  },
  demo: { children: "<article class=\"field-note\"><p class=\"field-index\">Bearing / 06 \u00b7 Field study</p><h2>A field of directions</h2><p>Small arrows turn together across a stable lattice. A direction field gives the surrounding space a legible grain.</p><details><summary>Read the field note</summary><p>Illustrative vectors describe a smooth mathematical field rather than measured weather.</p></details></article>" },
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
