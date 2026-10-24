import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "tape-head", title: "Tape Head", category: "effects",
  description: "Two turning spools carry a tape path past a slowly traversing recording head.",
  tags: ["material", "geometric", "motion"], facets: ["animated", "background", "interactive", "canvas"],
  wave: 14, release: "ascii-motion-2026-10-04", animated: true, decorative: true,
  wraps: "content", original: true, credits: [], palette: ["fg"],
  presets: [
    {
        "name": "Clear mechanism",
        "description": "A more legible mechanism with automatic compact placement.",
        "props": {
            "speed": 0.8,
            "opacity": 0.42,
            "scale": 1.1
        }
    },
    {
        "name": "Quiet margins",
        "description": "Lighter marks and slower travel around the reading area.",
        "props": {
            "speed": 0.5,
            "opacity": 0.25,
            "scale": 0.9
        }
    },
    {
        "name": "Close study",
        "description": "Larger details make the moving parts easier to inspect.",
        "props": {
            "speed": 0.65,
            "opacity": 0.55,
            "scale": 1.4
        }
    }
],
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
