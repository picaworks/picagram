import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "paper-shutters", title: "Paper Shutters", category: "effects",
  description: "Staggered rectangular shutters reveal an original printed field along the page edges.",
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
  demo: { children: "<article data-demo-copy><p>PRINT ROOM / EDITION 07</p><h2>A small edition, carefully made.</h2><p>Browse the proof sheets, paper specifications and production notes for the autumn print programme.</p><details><summary>View the edition</summary><p>Edition 07 uses a 160 gsm uncoated sheet. Proof the hatch at full size and check the shutter rhythm before cutting the production plate.</p></details></article>" },
};
