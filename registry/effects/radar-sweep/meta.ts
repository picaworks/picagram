import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "radar-sweep", title: "Radar Sweep", category: "effects",
  description: "Slow range rings and a rotating sector reveal fixed target echoes around a protected reading area.",
  tags: ["geometry", "field", "canvas", "reading"], facets: ["animated", "overlay", "interactive", "canvas"],
  wave: 14, release: "ascii-motion-2026-10-04", animated: true, decorative: false, wraps: "content",
  palette: ["fg", "accent"],
  controls: {
    rings: { type: "number", min: 3, max: 8, step: 1 },
    period: { type: "number", min: 12, max: 60, step: 1, label: "Traversal (s)" },
    opacity: { type: "number", min: .1, max: .6, step: .01 },
    fps: { type: "number", min: 12, max: 24, step: 1 },
    paused: { type: "boolean" },
    showPause: { type: "boolean", label: "Pause control" },
  },
  demo: { children: "<article class=\"field-note\"><p class=\"field-index\">Range / 04 \u00b7 Field study</p><h2>A quiet watch</h2><p>Fixed echoes register as the sweep passes. Use this quiet instrument field behind an observation brief.</p><details><summary>Read the field note</summary><p>Targets are illustrative positions, not live observations.</p></details></article>" },
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
