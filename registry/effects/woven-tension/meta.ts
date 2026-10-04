import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "woven-tension", title: "Woven Tension", category: "effects",
  description: "Interleaved threads carry small tension waves with alternating over and under crossings.",
  tags: ["geometry", "field", "canvas", "reading"], facets: ["animated", "overlay", "interactive", "canvas"],
  wave: 14, release: "ascii-motion-2026-10-04", animated: true, decorative: false, wraps: "content",
  palette: ["fg", "accent"],
  controls: {
    pitch: { type: "number", min: 26, max: 60, step: 1 },
    period: { type: "number", min: 12, max: 60, step: 1, label: "Traversal (s)" },
    opacity: { type: "number", min: .1, max: .6, step: .01 },
    fps: { type: "number", min: 12, max: 24, step: 1 },
    paused: { type: "boolean" },
    showPause: { type: "boolean", label: "Pause control" },
  },
  demo: { children: "<article class=\"field-note\"><p class=\"field-index\">Weave / 12 \u00b7 Field study</p><h2>Held in tension</h2><p>Warp and weft shift by a few pixels. Alternating crossing gaps preserve the over and under pattern as a small tension wave travels through.</p><details><summary>Read the field note</summary><p>Horizontal threads omit every alternate crossing; vertical threads omit its complement.</p></details></article>" },
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
