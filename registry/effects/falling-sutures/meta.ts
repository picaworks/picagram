import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "falling-sutures", title: "Falling Sutures", category: "effects",
  description: "Sparse stitched leaders drift down constrained side margins beside an uninterrupted reading centre.",
  tags: ["geometry", "field", "canvas", "reading"], facets: ["animated", "overlay", "interactive", "canvas"],
  wave: 14, release: "ascii-motion-2026-10-04", animated: true, decorative: false, wraps: "content",
  palette: ["fg", "accent"],
  controls: {
    columns: { type: "number", min: 3, max: 10, step: 1 },
    period: { type: "number", min: 12, max: 60, step: 1, label: "Traversal (s)" },
    opacity: { type: "number", min: .1, max: .6, step: .01 },
    fps: { type: "number", min: 12, max: 24, step: 1 },
    paused: { type: "boolean" },
    showPause: { type: "boolean", label: "Pause control" },
  },
  demo: { children: "<article class=\"field-note\"><p class=\"field-index\">Leader / 09 \u00b7 Field study</p><h2>Between the frames</h2><p>A stitched leader drifts down each edge. The paired bars and alternating cross stitches recall a documentary workprint without imitating rain.</p><details><summary>Read the field note</summary><p>Segments wrap beyond the frame boundaries; the central area is never drawn into.</p></details></article>" },
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
