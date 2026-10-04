import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "tape-head", title: "Tape Head", category: "effects",
  description: "Two turning spools carry a tape path past a slowly traversing recording head.",
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
  demo: { children: "<article data-demo-copy><p>SOUND ARCHIVE / COLLECTION 12</p><h2>A record worth keeping.</h2><p>Find recording dates, reel condition and transcription notes from a collection of oral histories.</p><details><summary>Read the collection guide</summary><p>Collection 12 contains twelve quarter-inch reels recorded between 1968 and 1974. Review the condition report and speaker index before requesting a transcription.</p></details></article>" },
};
